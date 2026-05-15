import {
  StudyObject,
  StudyPackSourceFormat,
  StudyPathDashboardRole,
} from '../types'
import {
  conceptExplanation,
  conceptRecapGroups,
  conceptSummaryItem,
  extractLearningConcepts,
} from '../concepts'
import {
  augmentStudyPackPracticeObjects,
  createStudyPackPracticeProfile,
  getEffectiveGenerationTargets,
  isVisiblePracticeStudyObject,
} from '../practice'
import {
  assertRoleObjectsAreClean,
  filterStudyObjectsForDashboardRole,
  normalizeAiStudyPackDraft,
  AiStudyPackDraft,
} from './normalizer'

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
  error?: {
    message?: string
    status?: string
  }
}

const GEMINI_REQUEST_TIMEOUT_MS = 5 * 60 * 1000
const GEMINI_TIMEOUT_MESSAGE =
  'Gemini took longer than 5 minutes, so AquaMesh stopped the request. Try again with shorter notes, fewer generated blocks, or Basic fallback.'
const GEMINI_RATE_LIMIT_MESSAGE =
  'Gemini rate limit reached for today. Try again later, use Basic fallback, or check your Gemini API quota.'
const GEMINI_OUTPUT_FORMAT_MESSAGE =
  'Gemini could not follow the requested output format. AquaMesh retried with a simpler JSON prompt, but the response was still unusable.'

const generationTargetLabels: Record<string, string> = {
  quizzes: 'multiple-choice quizzes',
  flashcards: 'flashcards',
  summaries: 'summaries or key-point lists',
  definitions: 'term definitions',
  reviewPrompts: 'review prompts',
  lists: 'lists or ordered steps',
  tables: 'tables',
  comparisons: 'comparisons',
  code: 'code notes',
}

const formatGenerationTargets = (targets: string[]): string =>
  targets.map((target) => generationTargetLabels[target] || target).join(', ')

export interface GenerateStudyPackWithAiOptions {
  apiToken: string
  model: string
  title: string
  rawNotes: string
  packId: string
  generationTargets?: string[]
  generationAmount?: 'few' | 'medium' | 'many'
  promptMode?: boolean
  studyPathMode?: boolean
}

export interface AiStudyPathDashboardDraft extends AiStudyPackDraft {
  summary: string
  dashboardRole: StudyPathDashboardRole
}

export interface AiStudyPathDraft {
  title: string
  folderName: string
  dashboards: AiStudyPathDashboardDraft[]
  warnings: string[]
}

export interface GenerateStudyPathWithAiOptions {
  apiToken: string
  model: string
  title: string
  prompt: string
  folderName: string
  generationAmount?: 'few' | 'medium' | 'many'
}

export const getStudyPathDashboardRoles = (
  generationAmount: 'few' | 'medium' | 'many' = 'medium',
): StudyPathDashboardRole[] =>
  generationAmount === 'few'
    ? ['normal', 'normal', 'exercises']
    : generationAmount === 'many'
      ? [
          'normal',
          'normal',
          'normal',
          'normal',
          'normal',
          'summary',
          'exercises',
        ]
      : ['normal', 'normal', 'normal', 'summary', 'exercises']

const getStudyPathStepNames = (
  generationAmount: 'few' | 'medium' | 'many' = 'medium',
): string[] =>
  getStudyPathDashboardRoles(generationAmount).map((role, index) => {
    if (role === 'summary') {
      return 'Summary'
    }

    if (role === 'exercises') {
      return 'Exercises'
    }

    return `Content ${index + 1}`
  })

const describeStudyPathRoles = (roles: StudyPathDashboardRole[]): string =>
  roles.map((role, index) => `${index + 1}: ${role}`).join(', ')

const hasUsefulLessonNotes = (value: string): boolean =>
  value.trim().split(/\s+/).filter(Boolean).length >= 80

const hasReadableLessonStructure = (value: string): boolean =>
  /(^|\n)#{1,3}\s+\S/.test(value) ||
  /(^|\n)\s*[-*]\s+\S/.test(value) ||
  /(^|\n)\s*\d+[.)]\s+\S/.test(value)

const splitIntoSentences = (value: string): string[] =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

const formatLessonNotesForReading = (
  title: string,
  summary: string,
  rawNotes: string,
): string => {
  const trimmed = rawNotes.trim()
  if (!trimmed || hasReadableLessonStructure(trimmed)) {
    return trimmed
  }

  const sentences = splitIntoSentences(trimmed)
  if (sentences.length < 5) {
    return [`# ${title}`, summary, trimmed]
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n\n')
  }

  const overview = sentences.slice(0, 2)
  const conceptCount = Math.max(3, Math.ceil((sentences.length - 2) * 0.45))
  const keyConcepts = sentences.slice(2, 2 + conceptCount)
  const remaining = sentences.slice(2 + conceptCount)
  const examples = remaining.slice(
    0,
    Math.max(2, Math.floor(remaining.length / 2)),
  )
  const tips = remaining.slice(examples.length)

  return [
    `# ${title}`,
    summary ? `## Goal\n${summary}` : '',
    overview.length > 0 ? `## Overview\n${overview.join(' ')}` : '',
    keyConcepts.length > 0
      ? `## Key points\n${keyConcepts
          .map((sentence) => `- ${sentence}`)
          .join('\n')}`
      : '',
    examples.length > 0
      ? `## Examples and usage\n${examples
          .map((sentence) => `- ${sentence}`)
          .join('\n')}`
      : '',
    tips.length > 0
      ? `## Remember\n${tips.map((sentence) => `- ${sentence}`).join('\n')}`
      : '',
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
}

const studyObjectToLessonNote = (
  object: AiStudyPackDraft['objects'][number],
): string => {
  switch (object.kind) {
    case 'markdown':
      return object.markdown
    case 'note':
      return object.body
    case 'term':
      return `Definition — ${object.term}: ${object.definition}`
    case 'qa':
      return `Flashcard — ${object.question}\nAnswer: ${object.answer}`
    case 'quiz':
      return `Quiz concept — ${object.question}\nAnswer: ${object.answer}. ${object.explanation}`
    case 'list':
      return `${object.title || 'Key list'}:\n${object.items
        .map((item) => `- ${item}`)
        .join('\n')}`
    case 'sequence':
      return `${object.title || 'Steps'}:\n${object.steps
        .map((step, index) => `${index + 1}. ${step}`)
        .join('\n')}`
    case 'comparison':
      return `${object.title || 'Comparison'}: ${object.columns.join(' vs ')}`
    case 'table':
      return `${object.title || 'Table'}: ${object.headers.join(', ')}`
    case 'reviewPrompt':
      return `Review prompt — ${object.prompt}${
        object.reason ? ` (${object.reason})` : ''
      }`
    case 'code':
      return `${object.caption || object.title || 'Code note'}\n${object.code}`
    case 'resource':
      return `${object.label}: ${object.url}`
    case 'reveal':
      return `${object.prompt}: ${object.hiddenText}`
    default:
      return ''
  }
}

const buildStudyPathLessonNotes = (
  title: string,
  summary: string,
  rawNotes: string,
  objects: AiStudyPackDraft['objects'],
): string => {
  if (hasUsefulLessonNotes(rawNotes)) {
    return formatLessonNotesForReading(title, summary, rawNotes)
  }

  const objectNotes = objects
    .map(studyObjectToLessonNote)
    .map((note) => note.trim())
    .filter(Boolean)
    .join('\n\n')

  return [`# ${title}`, objectNotes, summary, rawNotes]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
}

export interface ExtractRawNotesWithAiOptions {
  apiToken: string
  model: string
  image: File
}

const textArraySchema = { type: 'ARRAY', items: { type: 'STRING' } }

const dashboardContractProperties = {
  sourceSummary: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      bullets: textArraySchema,
    },
    required: ['title', 'bullets'],
  },
  conceptRecap: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      sections: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            bullets: textArraySchema,
            example: { type: 'STRING' },
          },
          required: ['title', 'bullets', 'example'],
        },
      },
    },
    required: ['title', 'sections'],
  },
  practice: {
    type: 'OBJECT',
    properties: {
      shortAnswer: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            expectedAnswer: { type: 'STRING' },
            explanation: { type: 'STRING' },
          },
          required: ['question', 'expectedAnswer', 'explanation'],
        },
      },
      multipleChoice: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            options: textArraySchema,
            correctOptionIndex: { type: 'NUMBER' },
            explanation: { type: 'STRING' },
          },
          required: [
            'question',
            'options',
            'correctOptionIndex',
            'explanation',
          ],
        },
      },
    },
    required: ['shortAnswer', 'multipleChoice'],
  },
  flashcards: {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        front: { type: 'STRING' },
        back: { type: 'STRING' },
      },
      required: ['front', 'back'],
    },
  },
}

const objectSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    sourceFormat: {
      type: 'STRING',
      enum: [
        'paste',
        'markdown',
        'text',
        'csv',
        'markdown-table',
        'quick-syntax',
      ],
    },
    ...dashboardContractProperties,
  },
  required: ['sourceSummary', 'conceptRecap', 'practice', 'flashcards'],
}

const studyPathSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    folderName: { type: 'STRING' },
    dashboards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          summary: { type: 'STRING' },
          rawNotes: { type: 'STRING' },
          ...dashboardContractProperties,
        },
        required: [
          'title',
          'summary',
          'rawNotes',
          'sourceSummary',
          'conceptRecap',
          'practice',
          'flashcards',
        ],
      },
    },
  },
  required: ['title', 'folderName', 'dashboards'],
}

const emptyPractice = () => ({
  shortAnswer: [],
  multipleChoice: [],
})

const emptyFlashcards: Array<{ front: string; back: string }> = []

const getSourceSummaryOrDefault = (
  input: Record<string, unknown>,
  dashboardTitle: string,
  dashboardRole: StudyPathDashboardRole,
) =>
  input.sourceSummary && typeof input.sourceSummary === 'object'
    ? input.sourceSummary
    : {
        title:
          dashboardRole === 'exercises'
            ? `${dashboardTitle} instructions`
            : `${dashboardTitle} source summary`,
        bullets: [
          dashboardRole === 'exercises'
            ? 'Use this dashboard for mixed practice.'
            : `Review the key ideas for ${dashboardTitle}.`,
        ],
      }

const getConceptRecapOrDefault = (
  input: Record<string, unknown>,
  dashboardTitle: string,
  dashboardRole: StudyPathDashboardRole,
) => {
  if (input.conceptRecap && typeof input.conceptRecap === 'object') {
    return input.conceptRecap
  }

  if (dashboardRole === 'summary') {
    return {
      title: `${dashboardTitle} synthesis`,
      sections: [
        {
          title: 'Path synthesis',
          bullets: ['Connect the main ideas from the previous dashboards.'],
          example: '',
        },
      ],
    }
  }

  return {
    title: `${dashboardTitle} concept recap`,
    sections: [],
  }
}

const getPracticeOrDefault = (input: Record<string, unknown>) =>
  input.practice && typeof input.practice === 'object'
    ? input.practice
    : emptyPractice()

const getFlashcardsOrDefault = (input: Record<string, unknown>) =>
  Array.isArray(input.flashcards) ? input.flashcards : emptyFlashcards

const sanitizeDashboardInputForRole = (
  input: Record<string, unknown>,
  dashboardRole: StudyPathDashboardRole,
  dashboardTitle: string,
) => {
  const base = {
    ...input,
    title: dashboardTitle,
    sourceFormat: 'text',
  }

  if (dashboardRole === 'summary') {
    return {
      ...base,
      sourceSummary: getSourceSummaryOrDefault(
        input,
        dashboardTitle,
        dashboardRole,
      ),
      conceptRecap: getConceptRecapOrDefault(
        input,
        dashboardTitle,
        dashboardRole,
      ),
      practice: emptyPractice(),
      flashcards: [],
    }
  }

  if (dashboardRole === 'exercises') {
    return {
      ...base,
      sourceSummary: getSourceSummaryOrDefault(
        {},
        dashboardTitle,
        dashboardRole,
      ),
      conceptRecap: {
        title: `${dashboardTitle} practice-only recap`,
        sections: [],
      },
      practice: getPracticeOrDefault(input),
      flashcards: getFlashcardsOrDefault(input),
    }
  }

  return {
    ...base,
    sourceSummary: getSourceSummaryOrDefault(
      input,
      dashboardTitle,
      dashboardRole,
    ),
    conceptRecap: getConceptRecapOrDefault(
      input,
      dashboardTitle,
      dashboardRole,
    ),
    practice: getPracticeOrDefault(input),
    flashcards: getFlashcardsOrDefault(input),
  }
}

const hasUsableStudyPathDashboardInput = (
  input: Record<string, unknown>,
): boolean => {
  if (typeof input.title === 'string' && input.title.trim()) {
    return true
  }

  if (typeof input.rawNotes === 'string' && input.rawNotes.trim()) {
    return true
  }

  return [
    input.sourceSummary,
    input.conceptRecap,
    input.practice,
    input.flashcards,
  ].some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }

    return Boolean(value && typeof value === 'object')
  })
}

const getArrayLength = (value: unknown): number =>
  Array.isArray(value) ? value.length : 0

const getObjectRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const getConceptRecapSectionCount = (
  input: Record<string, unknown>,
): number => {
  const conceptRecap = getObjectRecord(input.conceptRecap)
  return getArrayLength(conceptRecap.sections)
}

const getPracticeQuestionCount = (input: Record<string, unknown>): number => {
  const practice = getObjectRecord(input.practice)
  return (
    getArrayLength(practice.shortAnswer) +
    getArrayLength(practice.multipleChoice)
  )
}

const getFlashcardCount = (input: Record<string, unknown>): number =>
  getArrayLength(input.flashcards)

const sourceSummaryOnlyForNormalDashboard = (
  input: Record<string, unknown>,
): boolean =>
  Boolean(input.sourceSummary) &&
  getConceptRecapSectionCount(input) === 0 &&
  getPracticeQuestionCount(input) === 0 &&
  getFlashcardCount(input) === 0

const normalDashboardNeedsRepair = (
  input: Record<string, unknown>,
  dashboardRole: StudyPathDashboardRole,
): boolean =>
  dashboardRole === 'normal' &&
  getConceptRecapSectionCount(input) === 0 &&
  getPracticeQuestionCount(input) === 0 &&
  getFlashcardCount(input) === 0

const textFromRawNotes = (rawNotes: unknown): string =>
  typeof rawNotes === 'string' ? rawNotes.replace(/\s+/g, ' ').trim() : ''

const sourceSummaryBullets = (
  sourceSummary: AiStudyPackDraft['sourceSummary'],
): string[] =>
  sourceSummary?.bullets
    .map((bullet) => bullet.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 5) || []

const normalizeSummaryText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim()

const stripRepeatedSummaryPrefix = (value: string): string => {
  const normalized = normalizeSummaryText(value)
  const repeated = normalized.match(/^([^:]{3,60}):\s+\1\b\s*/i)

  if (!repeated) {
    return normalized
  }

  const prefix = `${repeated[1]}:`
  return normalizeSummaryText(normalized.slice(prefix.length))
}

const isLowQualitySummaryLine = (value: string): boolean => {
  const normalized = normalizeSummaryText(value)

  return (
    normalized.length < 18 ||
    /^([^:]{2,40}):\s+\1\b/i.test(normalized) ||
    /^(?:there|these|this|it|they|mastering these):/i.test(normalized) ||
    /^[A-Z][a-z]+:\s+(?:These|This|There|It)\b/.test(normalized)
  )
}

const formatSummaryHeading = (value: string): string => {
  const normalized = normalizeSummaryText(value.replace(/:.*$/, ''))
  const words = normalized.split(/\s+/).filter(Boolean).slice(0, 7)
  const heading = words.join(' ')

  return heading || 'Key concept'
}

const createFallbackBase = (packId: string, suffix: string, title: string) => ({
  id: `${packId}-fallback-${suffix}`,
  title,
  sourceLine: 1,
  tags: ['study-path', 'fallback'],
})

const buildFallbackObjectsForDashboardRole = ({
  packId,
  dashboardTitle,
  dashboardRole,
  rawNotes,
  sourceSummary,
  accumulatedContentNotes,
}: {
  packId: string
  dashboardTitle: string
  dashboardRole: StudyPathDashboardRole
  rawNotes: unknown
  sourceSummary: AiStudyPackDraft['sourceSummary']
  accumulatedContentNotes: string[]
}): StudyObject[] => {
  const bullets = sourceSummaryBullets(sourceSummary)
  const noteText = textFromRawNotes(rawNotes)
  const fallbackText =
    bullets.join('\n') ||
    noteText.slice(0, 700) ||
    accumulatedContentNotes
      .join('\n\n')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 700)

  if (dashboardRole === 'exercises') {
    const practiceSource =
      accumulatedContentNotes.join('\n\n').replace(/\s+/g, ' ').trim() ||
      noteText ||
      bullets.join(' ')
    const concepts = extractLearningConcepts(practiceSource, dashboardTitle)
      .map(conceptSummaryItem)
      .slice(0, 2)
    const prompts =
      concepts.length > 0
        ? concepts.map((concept) => `How would you apply ${concept}?`)
        : practiceSource
          ? ['What is one key idea from the previous Study Path material?']
          : []

    return prompts.map((question, index) => ({
      ...createFallbackBase(
        packId,
        `exercise-${index + 1}`,
        `Practice ${index + 1}`,
      ),
      kind: 'quiz' as const,
      quizMode: 'shortAnswer' as const,
      question,
      options: [],
      correctIndex: 0,
      answer: 'Use the Study Path notes to answer in your own words.',
      explanation:
        'Generated as a minimal fallback from the Study Path source.',
    }))
  }

  if (!fallbackText) {
    return []
  }

  return [
    {
      ...createFallbackBase(packId, 'summary', `${dashboardTitle} summary`),
      kind: 'list' as const,
      items: bullets.length > 0 ? bullets : [fallbackText],
      ordered: false,
      checklist: false,
    },
  ]
}

const getStudyPathVisibleObjectsForRole = (
  objects: StudyObject[],
  dashboardRole: StudyPathDashboardRole,
  events: string[],
): StudyObject[] => {
  if (dashboardRole !== 'normal') {
    return objects
  }

  const visibleObjects = objects.filter(
    (object) =>
      object.kind === 'quiz' ||
      object.kind === 'qa' ||
      object.kind === 'reveal',
  )
  const suppressedCount = objects.length - visibleObjects.length

  if (suppressedCount > 0) {
    events.push(
      `Intentionally suppressed ${suppressedCount} conceptRecap/list-style normal-dashboard object${suppressedCount === 1 ? '' : 's'} from visible widgets; theory remains in source notes and source summary.`,
    )
  }

  return visibleObjects
}

const getStudyPathVisiblePracticeTarget = (
  dashboardRole: StudyPathDashboardRole,
  generationAmount: 'few' | 'medium' | 'many',
): number => {
  if (dashboardRole === 'normal') {
    return 7
  }

  if (dashboardRole === 'exercises') {
    return generationAmount === 'few'
      ? 10
      : generationAmount === 'many'
        ? 18
        : 14
  }

  return 0
}

const parseGeminiJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
    if (fenced) {
      return JSON.parse(fenced)
    }

    const firstObject = text.indexOf('{')
    const lastObject = text.lastIndexOf('}')
    if (firstObject >= 0 && lastObject > firstObject) {
      return JSON.parse(text.slice(firstObject, lastObject + 1))
    }

    throw new Error('Gemini returned invalid JSON.')
  }
}

const isGeminiOutputFormatError = (error: unknown): boolean =>
  error instanceof Error &&
  /wrong output format|invalid json|output format|response format|malformed/i.test(
    error.message,
  )

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })

const callGemini = async (
  apiToken: string,
  model: string,
  parts: GeminiPart[],
  responseSchema?: Record<string, unknown>,
): Promise<string> => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    GEMINI_REQUEST_TIMEOUT_MS,
  )
  let response: Response

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiToken,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: responseSchema
              ? 'application/json'
              : 'text/plain',
            ...(responseSchema ? { responseSchema } : {}),
          },
        }),
      },
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(GEMINI_TIMEOUT_MESSAGE)
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  const payload = (await response.json()) as GeminiResponse
  if (!response.ok) {
    const message = payload.error?.message || ''
    const status = payload.error?.status || ''
    if (
      response.status === 429 ||
      status === 'RESOURCE_EXHAUSTED' ||
      /rate limit|quota|peak requests/i.test(message)
    ) {
      throw new Error(`${GEMINI_RATE_LIMIT_MESSAGE} ${message}`.trim())
    }

    throw new Error(message || `Gemini request failed (${response.status}).`)
  }

  const candidate = payload.candidates?.[0]
  const text = candidate?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()

  if (!text) {
    throw new Error(
      candidate?.finishReason
        ? `Gemini returned no text (${candidate.finishReason}).`
        : 'Gemini returned no text.',
    )
  }

  return text
}

export const extractRawNotesWithAi = async ({
  apiToken,
  model,
  image,
}: ExtractRawNotesWithAiOptions): Promise<string> => {
  const data = await fileToBase64(image)
  const text = await callGemini(apiToken, model, [
    {
      text: 'Extract study notes from this image. Correct likely OCR mistakes, preserve headings, formulas, lists, and questions. Return only clean Markdown notes grounded in the image.',
    },
    {
      inline_data: {
        mime_type: image.type || 'image/png',
        data,
      },
    },
  ])

  return text.trim()
}

export const generateStudyPackWithAi = async ({
  apiToken,
  model,
  title,
  rawNotes,
  packId,
  generationTargets = [],
  generationAmount = 'medium',
  promptMode = false,
  studyPathMode = false,
}: GenerateStudyPackWithAiOptions): Promise<AiStudyPackDraft> => {
  const effectiveTargets = getEffectiveGenerationTargets(generationTargets)
  const practiceProfile = createStudyPackPracticeProfile(
    generationAmount,
    generationTargets,
  )
  const targetInstruction = `Create only these selected study material types when possible: ${formatGenerationTargets(
    effectiveTargets,
  )}. Treat selected targets as a hard UI contract.`
  const amountInstruction = `Create ${practiceProfile.targetTotal} reviewable study items when possible, never fewer than ${practiceProfile.minTotal} if the notes contain usable facts. Keep the total within ${practiceProfile.minTotal}-${practiceProfile.maxTotal} items.`
  const mixInstruction =
    practiceProfile.enforceQuizzes || practiceProfile.enforceFlashcards
      ? `Use an active-practice mix: ${practiceProfile.targetQuizzes} quizzes, ${practiceProfile.targetFlashcards} flashcards, and about ${practiceProfile.targetSupport} summaries/definitions/review prompts. Quizzes should be 50-60% of the pack and flashcards 20-30%.`
      : 'Use the selected non-practice targets and still create the requested number of useful reviewable items.'
  const sourceInstruction = promptMode
    ? 'The raw input is a learning prompt, not notes. Teach the requested topic from scratch. Because the input is not source notes, you may use accurate general knowledge for this topic. First create concise source notes/explanations, then generate practice grounded in those generated explanations. Include explanation/theory objects before exercises.'
    : 'The raw input is source notes. Stay grounded in those notes.'
  const pathInstruction = studyPathMode
    ? 'Organize the material as a Study Path progression. Use titles/tags that clearly fit: Introduction, Theory, Examples, Practice, Final Review.'
    : 'Organize the material as a single Study Pack.'

  const promptText = `Create a study pack JSON object ${
    promptMode ? 'from this learning prompt' : 'from these raw notes'
  }.

Return exactly one JSON object with this shape:
{
  "title": "Short study pack title",
  "sourceFormat": "text",
  "sourceSummary": { "title": "Source summary", "bullets": ["..."] },
  "conceptRecap": {
    "title": "Concept recap",
    "sections": [
      { "title": "Specific concept", "bullets": ["..."], "example": "..." }
    ]
  },
  "practice": {
    "shortAnswer": [
      { "question": "...", "expectedAnswer": "...", "explanation": "..." }
    ],
    "multipleChoice": [
      { "question": "...", "options": ["...", "...", "..."], "correctOptionIndex": 0, "explanation": "..." }
    ]
  },
  "flashcards": [
    { "front": "...", "back": "..." }
  ]
}

Do not wrap the JSON in markdown fences. Do not add commentary outside JSON.

Rules:
- Return strict valid JSON only: double-quoted property names and strings, comma-separated array/object entries, matching { } and [ ], no trailing commas, no comments, no Markdown fences, no prose before or after the JSON.
- Do not output "objects", "kind", "quizMode", internal block names, widget names, or any AquaMesh renderer fields. AquaMesh decides widget types.
- Fill only sourceSummary, conceptRecap, practice.shortAnswer, practice.multipleChoice, and flashcards.
- Use concrete rule labels in conceptRecap sections, such as "Subjunctive trigger: il faut que", not headings or sentence fragments.
- Generate summaries, flashcards, and quizzes from learning concepts, not by copying first sentences, headings, examples, or dashboard instructions.
- Never use weak standalone concepts such as Goal, Example, Active, It, Avoir, Etre, Quantity, or De. Do not create title-like, instruction-like, or very short fragments as study objects.
- Flashcards must be atomic and rule-specific, such as "How do you form the present subjunctive for most verbs?"
- Quizzes must test application, usage, contrast, formation, exceptions, or common mistakes with a concrete expected answer. Do not ask "Which statement best explains X?", "Which statement matches the notes?", "What does X help you understand or do?", "What is the core idea behind X?", or questions about what the notes say.
- For language-learning Study Packs, generate grammar/application questions from accepted concepts only: complete a form, choose the trigger expression, choose indicative vs subjunctive, or fix a common mistake.
- ${
    promptMode
      ? 'Use accurate general knowledge to teach the requested topic; do not pretend the prompt is source notes.'
      : 'Use only facts answerable from the notes.'
  }
- ${sourceInstruction}
- ${pathInstruction}
- In AI Tutor mode, teach the topic through sourceSummary and conceptRecap before practice.
- Generate exercises even from short notes. A single wiki paragraph should still produce multiple grounded quizzes and flashcards.
- Prefer useful learning material from the selected target types, but never output widget kinds.
- For multiple-choice questions, include 3-4 meaningful options and correctOptionIndex. Vary the correct answer position across questions; do not always put the correct answer first.
- Prefer multiple-choice quizzes. Use short-answer quizzes only when a grounded multiple-choice question would be misleading.
- ${
    promptMode
      ? 'Do not fabricate facts. If unsure, keep explanations broad and safe.'
      : 'Do not invent outside facts or practice content requiring unstated knowledge.'
  }
- Do not create or reference heavy resources such as PDFs or images unless the user explicitly asks for PDFs, images, screenshots, diagrams, or visual resources.
- Keep objects concise and student-friendly.
- ${targetInstruction}
- ${amountInstruction}
- ${mixInstruction}
- Do not return 0, 1, or 2 reviewable items when the notes contain enough text for more practice.

Pack title: ${title}

Raw notes:
${rawNotes}`

  const callPromptModeFallback = () =>
    callGemini(apiToken, model, [
      {
        text: `${promptText}

The previous response failed JSON formatting. Retry with a simpler response:
- Return plain JSON only.
- Return syntactically valid JSON with all commas and braces in place.
- Use only the strict Study Pack fields: sourceSummary, conceptRecap, practice, flashcards.
- Do not use markdown code fences.
- Do not include comments, trailing commas, undefined, NaN, or extra text.`,
      },
    ])

  let text: string
  let usedPromptModeFallback = false
  try {
    text = await callGemini(
      apiToken,
      model,
      [{ text: promptText }],
      objectSchema,
    )
  } catch (error) {
    if (!promptMode || !isGeminiOutputFormatError(error)) {
      throw error
    }

    usedPromptModeFallback = true
    text = await callPromptModeFallback()
  }

  let parsed: unknown
  try {
    parsed = parseGeminiJson(text)
  } catch (error) {
    if (!promptMode) {
      throw error
    }

    if (!usedPromptModeFallback) {
      try {
        text = await callPromptModeFallback()
        parsed = parseGeminiJson(text)
      } catch {
        throw new Error(GEMINI_OUTPUT_FORMAT_MESSAGE)
      }
    } else {
      throw new Error(GEMINI_OUTPUT_FORMAT_MESSAGE)
    }
  }

  const draft = normalizeAiStudyPackDraft(parsed, packId, {
    rawNotes,
    rawAiResponse: text,
  })

  return {
    ...draft,
    title: draft.title || title,
    sourceFormat: draft.sourceFormat || ('text' as StudyPackSourceFormat),
  }
}

export const generateStudyPathWithAi = async ({
  apiToken,
  model,
  title,
  prompt,
  folderName,
  generationAmount = 'medium',
}: GenerateStudyPathWithAiOptions): Promise<AiStudyPathDraft> => {
  const dashboardRoles = getStudyPathDashboardRoles(generationAmount)
  const stepNames = getStudyPathStepNames(generationAmount)
  const contentDashboardCount = stepNames.filter((stepName) =>
    stepName.startsWith('Content'),
  ).length
  const includesSummaryDashboard = stepNames.includes('Summary')
  const practiceProfile = createStudyPackPracticeProfile(generationAmount, [
    'summaries',
    'definitions',
    'flashcards',
    'quizzes',
    'exercises',
  ])
  const promptText = `Create a Study Path JSON object. A Study Path is NOT one dashboard. It is a folder containing multiple ordered dashboards/study packs.

Return exactly this structure:
{
  "title": "Path title",
  "folderName": "Folder name for all dashboards",
  "dashboards": [
    {
      "title": "01 - Content 1",
      "summary": "One sentence preview",
      "rawNotes": "Complete lesson notes for this dashboard",
      "sourceSummary": { "title": "Source summary", "bullets": ["..."] },
      "conceptRecap": { "title": "Concept recap", "sections": [{ "title": "Specific concept", "bullets": ["..."], "example": "..." }] },
      "practice": { "shortAnswer": [{ "question": "...", "expectedAnswer": "...", "explanation": "..." }], "multipleChoice": [{ "question": "...", "options": ["...", "...", "..."], "correctOptionIndex": 0, "explanation": "..." }] },
      "flashcards": [{ "front": "...", "back": "..." }]
    }
  ]
}

Rules:
- Return strict valid JSON only: double-quoted property names and strings, comma-separated array/object entries, matching { } and [ ], no trailing commas, no comments, no Markdown fences, no prose before or after the JSON.
- Choose a concise, topic-specific folderName for the Study Path, such as "French B1 Subjunctive" or "Calculus Derivatives". Do not use a generic folderName like "Study Path" unless the topic is truly unknown.
- Use these ordered lessons exactly: ${stepNames.join(' -> ')}.
- AquaMesh will assign these dashboard roles by position: ${describeStudyPathRoles(
    dashboardRoles,
  )}.
- Each normal dashboard must be useful by itself and contain roughly 6-9 visible study items after AquaMesh adds the lesson/source widgets.
- Always return exactly ${stepNames.length} dashboards total.
- This depth means ${contentDashboardCount} content dashboard${
    contentDashboardCount === 1 ? '' : 's'
  }${
    includesSummaryDashboard ? ', 1 summary dashboard,' : ''
  } and 1 exercises dashboard.
- rawNotes must be real lesson notes for that dashboard, not a one-line summary. Write 250-600 words with explanations, examples, key points, and common mistakes when relevant.
- Format rawNotes as readable Markdown, not one long paragraph. Use short sections like "## Goal", "## Key points", "## Examples", "## Common mistakes", and bullet lists where helpful.
- For normal dashboards, sourceSummary, conceptRecap, practice, and flashcards are mandatory and must be non-empty.
- Each normal dashboard must include sourceSummary with 3-5 bullets, conceptRecap with 2-4 sections, practice.shortAnswer with 1-2 questions, practice.multipleChoice with 1-2 questions, and flashcards with 3-5 cards.
- Normal dashboard conceptRecap is used internally to structure the lesson. AquaMesh will not render conceptRecap/list-style objects as separate visible widgets on normal dashboards; visible generated study widgets should come from practice.shortAnswer, practice.multipleChoice, and flashcards.
- Summary dashboards should focus on sourceSummary with 3-5 bullets and conceptRecap with 2-4 recap sections. If you include practice or flashcards, AquaMesh will delete them.
- Exercises dashboards should focus on mixed practice and flashcards from all previous normal dashboards. Include 4-6 short-answer questions, 4-6 multiple-choice questions, and 4-6 flashcards for medium paths, targeting roughly 12-16 visible study items. If you include conceptRecap or sourceSummary, AquaMesh will delete visible recap/summary content.
- Do not output "objects", "kind", "quizMode", internal block names, widget names, or any AquaMesh renderer fields. AquaMesh decides widget types.
- Use concrete rule labels in conceptRecap sections, such as "Subjunctive trigger: il faut que", not headings or sentence fragments.
- Generate summaries, flashcards, and quizzes from structured concepts, not from first sentences, headings, copied examples, or instructions.
- Practice questions must be specific to the lesson content. Never create generic questions like "What do the notes say about <dashboard title>?", "Which statement matches the notes about <dashboard title>?", "What does X help you understand or do?", or "What is the core idea behind X?".
- Practice questions must test concepts and uses, not copied headings or answer options made obvious by the dashboard title.
- Never use weak standalone concepts such as Goal, Example, Active, It, Avoir, Etre, Quantity, or De. Do not create title-like, instruction-like, or very short fragments as study objects.
- Flashcards should ask useful rule-specific prompts such as "How do you form the present subjunctive for most verbs?" instead of "What should you remember about <copied line>?".
- Include practice in later dashboards through practice.shortAnswer, practice.multipleChoice, and flashcards.
- If a Summary dashboard is included, make it a global recap of the preceding normal dashboards.
- The final Exercises dashboard must generate real mixed practice from the preceding content dashboards, not from its own instructions.
- Every dashboard needs a short "summary" sentence so the review screen can preview it.
- Do not wrap JSON in markdown. Do not add commentary outside JSON.
- Do not create PDFs/images/resources unless the user explicitly asks for heavy media.
- For multiple-choice questions, include 3-4 meaningful options, correctOptionIndex, and explanation.
- Keep content concise, beginner-friendly, and appropriate for the requested topic.
- Aim for about ${practiceProfile.minTotal}-${
    practiceProfile.maxTotal
  } reviewable items across the whole path.

Path title fallback: ${title}
Folder name fallback if you cannot infer a better one: ${
    folderName || 'Study Path'
  }
User request/topic:
${prompt}`
  const fallbackPrompt = `${promptText}

The previous response failed JSON formatting. Retry with a simpler response:
- Return plain JSON only.
- Return syntactically valid JSON with all commas and braces in place.
- Use only the Study Path fields: title, summary, rawNotes, sourceSummary, conceptRecap, practice, flashcards.
- Do not use markdown code fences.
- Do not include comments, trailing commas, undefined, NaN, or extra text.`
  const createRepairPrompt = (originalJson: string) => `${promptText}

The previous response was valid JSON, but one or more normal dashboards were incomplete.
Repair the JSON instead of simplifying it:
- Preserve the exact dashboard count, order, titles, summaries, and rawNotes.
- For normal dashboards, sourceSummary, conceptRecap, practice, and flashcards are mandatory and must be non-empty.
- Fill missing normal-dashboard conceptRecap/practice/flashcards from that dashboard's rawNotes.
- Each normal dashboard must have sourceSummary with 3-5 bullets, conceptRecap with 2-4 sections, practice.shortAnswer with 1-2 questions, practice.multipleChoice with 1-2 questions, and flashcards with 3-5 cards.
- Summary dashboards should focus on sourceSummary and conceptRecap.
- Exercises dashboards should focus on practice and flashcards.
- Return plain JSON only.

Original JSON:
${originalJson}`

  let text: string
  try {
    text = await callGemini(
      apiToken,
      model,
      [{ text: promptText }],
      studyPathSchema,
    )
  } catch (error) {
    if (!isGeminiOutputFormatError(error)) {
      throw error
    }

    text = await callGemini(apiToken, model, [{ text: fallbackPrompt }])
  }

  let parsed: unknown
  try {
    parsed = parseGeminiJson(text)
  } catch {
    try {
      text = await callGemini(apiToken, model, [{ text: fallbackPrompt }])
      parsed = parseGeminiJson(text)
    } catch {
      throw new Error(GEMINI_OUTPUT_FORMAT_MESSAGE)
    }
  }
  let record =
    parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {}
  let rawDashboards = Array.isArray(record.dashboards) ? record.dashboards : []
  const incompleteNormalDashboardIndexes = new Set(
    rawDashboards
      .map((item, index) => {
        const input =
          item && typeof item === 'object'
            ? (item as Record<string, unknown>)
            : {}
        return normalDashboardNeedsRepair(
          input,
          dashboardRoles[index] || 'normal',
        )
          ? index
          : null
      })
      .filter((index): index is number => index !== null),
  )
  let repairRetryUsed = false
  if (incompleteNormalDashboardIndexes.size > 0) {
    try {
      const repairText = await callGemini(
        apiToken,
        model,
        [{ text: createRepairPrompt(text) }],
        studyPathSchema,
      )
      parsed = parseGeminiJson(repairText)
      record =
        parsed && typeof parsed === 'object'
          ? (parsed as Record<string, unknown>)
          : {}
      rawDashboards = Array.isArray(record.dashboards) ? record.dashboards : []
      text = repairText
      repairRetryUsed = true
    } catch {
      repairRetryUsed = false
    }
  }
  const normalizedRawDashboards =
    rawDashboards.length >= stepNames.length
      ? rawDashboards.slice(0, stepNames.length)
      : stepNames.map((stepName, index) => {
          const existing = rawDashboards[index]
          if (existing) {
            return existing
          }

          const titlePrefix = `${String(index + 1).padStart(
            2,
            '0',
          )} - ${stepName}`
          const dashboardRole = dashboardRoles[index]
          const rawNotes =
            dashboardRole === 'summary'
              ? `# ${titlePrefix}

## Key points
- Review the five previous content dashboards.
- Connect the main concepts from the path.
- Identify weak areas before exercises.`
              : dashboardRole === 'exercises'
                ? `# ${titlePrefix}

## Practice
Use this dashboard to answer mixed exercises from the Study Path.`
                : `# ${titlePrefix}

## Goal
Study this section of ${title}.

## Key points
${prompt}`

          return {
            title: titlePrefix,
            summary: `Generated ${stepName.toLowerCase()} dashboard.`,
            rawNotes,
            sourceSummary: {
              title: `${titlePrefix} summary`,
              bullets: [`Study this section of ${title}.`],
            },
            conceptRecap: {
              title: `${titlePrefix} concept recap`,
              sections:
                dashboardRole === 'exercises'
                  ? []
                  : [
                      {
                        title: stepName,
                        bullets: [prompt],
                        example: '',
                      },
                    ],
            },
            practice: {
              shortAnswer: [],
              multipleChoice: [],
            },
            flashcards: [],
          }
        })
  const warnings: string[] = []
  const accumulatedContentNotes: string[] = []
  const buildGlobalNotes = (
    dashboardTitle: string,
    mode: 'summary' | 'exercises',
  ) => {
    const source = accumulatedContentNotes.join('\n\n')
    const concepts = extractLearningConcepts(source, title)
    const conceptGroups = conceptRecapGroups(concepts).slice(0, 5)

    if (mode === 'summary' && conceptGroups.length > 0) {
      return [
        `# ${dashboardTitle}`,
        'Use this recap to connect the major ideas from the Study Path before moving into mixed practice.',
        ...conceptGroups.map((group) => {
          const items = group.items
            .map(stripRepeatedSummaryPrefix)
            .filter((item) => !isLowQualitySummaryLine(item))
            .slice(0, 4)

          if (items.length === 0) {
            return ''
          }

          return [
            `## ${formatSummaryHeading(group.label)}`,
            ...items.map((item) => `- ${item}`),
          ].join('\n')
        }),
      ]
        .map((part) => part.trim())
        .filter(Boolean)
        .join('\n\n')
    }

    const conceptList = concepts
      .map((concept) =>
        stripRepeatedSummaryPrefix(
          `${formatSummaryHeading(concept.concept)}: ${conceptExplanation(
            concept,
          )}`,
        ),
      )
      .filter((item) => !isLowQualitySummaryLine(item))
      .slice(0, 12)

    return [
      `# ${dashboardTitle}`,
      mode === 'summary' ? '## Global recap' : '## Mixed practice source',
      conceptList.length > 0
        ? conceptList.map((item) => `- ${item}`).join('\n')
        : source,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n\n')
  }
  const dashboards = normalizedRawDashboards
    .map((item, index): AiStudyPathDashboardDraft | null => {
      const input =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {}
      if (!hasUsableStudyPathDashboardInput(input)) {
        warnings.push(
          `Skipped Study Path dashboard ${index + 1}: no usable generated content.`,
        )
        return null
      }

      const dashboardTitle =
        typeof input.title === 'string' && input.title.trim()
          ? input.title.trim()
          : `${index + 1}. ${stepNames[index] || 'Lesson'}`
      const dashboardSummary =
        typeof input.summary === 'string' && input.summary.trim()
          ? input.summary.trim()
          : 'Generated lesson dashboard.'
      const packId = `${title}-${index + 1}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
      const dashboardRole = dashboardRoles[index] || 'normal'
      const rawDashboardInput = {
        ...input,
        title: dashboardTitle,
        summary: dashboardSummary,
      }
      const roleSanitizedInput = sanitizeDashboardInputForRole(
        rawDashboardInput,
        dashboardRole,
        dashboardTitle,
      )
      const draft = normalizeAiStudyPackDraft(roleSanitizedInput, packId, {
        rawNotes: typeof input.rawNotes === 'string' ? input.rawNotes : '',
        rawAiResponse: text,
        dashboardRole,
      })
      const finalEvents = [...(draft.debugTrace?.droppedOrRepairedItems || [])]
      if (
        dashboardRole === 'normal' &&
        incompleteNormalDashboardIndexes.has(index)
      ) {
        finalEvents.push(
          'AI provided sourceSummary only before repair.',
          'AI missing normal-dashboard practice/flashcards before repair.',
        )
        if (repairRetryUsed) {
          finalEvents.push('Repair retry used for incomplete normal dashboard.')
        }
      }
      if (
        dashboardRole === 'normal' &&
        sourceSummaryOnlyForNormalDashboard(rawDashboardInput)
      ) {
        finalEvents.push('AI provided sourceSummary only after repair.')
      }
      if (normalDashboardNeedsRepair(rawDashboardInput, dashboardRole)) {
        finalEvents.push('AI missing normal-dashboard practice/flashcards.')
      }
      const roleFilteredObjects = filterStudyObjectsForDashboardRole(
        draft.objects,
        dashboardRole,
        finalEvents,
      )
      const visibleRoleObjects = getStudyPathVisibleObjectsForRole(
        roleFilteredObjects,
        dashboardRole,
        finalEvents,
      )
      const visiblePracticeTarget = getStudyPathVisiblePracticeTarget(
        dashboardRole,
        generationAmount,
      )
      const filledVisibleObjects =
        visiblePracticeTarget > 0
          ? augmentStudyPackPracticeObjects(visibleRoleObjects, {
              packId,
              title: dashboardTitle,
              rawNotes:
                dashboardRole === 'exercises'
                  ? accumulatedContentNotes.join('\n\n') ||
                    textFromRawNotes(input.rawNotes)
                  : textFromRawNotes(input.rawNotes),
              generationTargets: ['quizzes', 'flashcards'],
              generationAmount,
              visiblePracticeTarget,
              visiblePracticeOnly: true,
            })
          : null
      if (
        filledVisibleObjects &&
        filledVisibleObjects.visiblePracticeAddedCount > 0
      ) {
        finalEvents.push(
          `Visible practice fill added ${filledVisibleObjects.visiblePracticeAddedCount} quiz/flashcard object${filledVisibleObjects.visiblePracticeAddedCount === 1 ? '' : 's'} to reach ${filledVisibleObjects.visiblePracticeCount}/${visiblePracticeTarget} visible practice items.`,
        )
      }
      const finalObjects =
        filledVisibleObjects && filledVisibleObjects.objects.length > 0
          ? filledVisibleObjects.objects
          : visibleRoleObjects.length > 0
            ? visibleRoleObjects
            : dashboardRole === 'summary'
              ? []
              : buildFallbackObjectsForDashboardRole({
                  packId,
                  dashboardTitle,
                  dashboardRole,
                  rawNotes: input.rawNotes,
                  sourceSummary: draft.sourceSummary,
                  accumulatedContentNotes,
                })
      if (visibleRoleObjects.length === 0 && finalObjects.length > 0) {
        finalEvents.push(
          `Fallback used: created ${dashboardRole} object because role filtering left no visible study objects.`,
        )
      }
      if (dashboardRole === 'summary') {
        finalEvents.push(
          'Promoted global recap into the source Markdown widget and suppressed redundant summary/list widgets.',
        )
      }
      assertRoleObjectsAreClean(finalObjects, dashboardRole, dashboardTitle)
      const debugTrace = draft.debugTrace
        ? {
            ...draft.debugTrace,
            rawDashboardInput,
            roleSanitizedInput,
            droppedOrRepairedItems: finalEvents,
            finalObjects,
          }
        : draft.debugTrace
      const isSummaryDashboard = dashboardRole === 'summary'
      const isExercisesDashboard = dashboardRole === 'exercises'
      const generatedLessonNotes = buildStudyPathLessonNotes(
        dashboardTitle,
        dashboardSummary,
        typeof input.rawNotes === 'string' ? input.rawNotes : '',
        finalObjects,
      )
      const lessonNotes =
        isSummaryDashboard || isExercisesDashboard
          ? buildGlobalNotes(
              dashboardTitle,
              isSummaryDashboard ? 'summary' : 'exercises',
            )
          : generatedLessonNotes

      warnings.push(...draft.warnings)

      const dashboard = {
        ...draft,
        title: dashboardTitle,
        summary: dashboardSummary,
        rawNotes: lessonNotes,
        dashboardRole,
        objects: finalObjects,
        warnings: [],
        debugTrace,
        sourceFormat: 'text' as StudyPackSourceFormat,
      }

      if (!isSummaryDashboard && !isExercisesDashboard) {
        accumulatedContentNotes.push(lessonNotes)
      }

      return dashboard
    })
    .filter((dashboard): dashboard is AiStudyPathDashboardDraft =>
      Boolean(dashboard),
    )

  if (dashboards.length === 0) {
    throw new Error('Gemini did not return any usable Study Path dashboards.')
  }

  return {
    title:
      typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : title,
    folderName:
      typeof record.folderName === 'string' && record.folderName.trim()
        ? record.folderName.trim()
        : folderName,
    dashboards,
    warnings,
  }
}

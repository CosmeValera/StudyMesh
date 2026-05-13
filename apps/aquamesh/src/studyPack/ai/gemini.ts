import { StudyPackSourceFormat } from '../types'
import { StudyObject } from '../types'
import {
  augmentStudyPackPracticeObjects,
  createStudyPackPracticeProfile,
  getEffectiveGenerationTargets,
} from '../practice'
import { normalizeAiStudyPackDraft, AiStudyPackDraft } from './normalizer'

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

const asksForHeavyResource = (text: string): boolean =>
  /\b(pdf|image|images|picture|pictures|diagram|diagrams|visual|visuals|photo|photos|screenshot|screenshots)\b/i.test(
    text,
  )

const removeUnrequestedHeavyResources = (
  objects: StudyObject[],
  rawNotes: string,
): { objects: StudyObject[]; warnings: string[] } => {
  if (asksForHeavyResource(rawNotes)) {
    return { objects, warnings: [] }
  }

  const filtered = objects.filter(
    (object) =>
      object.kind !== 'resource' ||
      (object.resourceType !== 'pdf' && object.resourceType !== 'image'),
  )

  return {
    objects: filtered,
    warnings:
      filtered.length === objects.length
        ? []
        : [
            'Skipped AI-generated PDF/image resources because the source did not explicitly ask for heavy media.',
          ],
  }
}

const hasUsefulLessonNotes = (value: string): boolean =>
  value.trim().split(/\s+/).filter(Boolean).length >= 80

const studyObjectToLessonNote = (object: StudyObject): string => {
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
  objects: StudyObject[],
): string => {
  if (hasUsefulLessonNotes(rawNotes)) {
    return rawNotes.trim()
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
    objects: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: {
            type: 'STRING',
            enum: [
              'markdown',
              'note',
              'term',
              'qa',
              'quiz',
              'reveal',
              'comparison',
              'sequence',
              'reviewPrompt',
              'code',
              'list',
              'table',
            ],
          },
          title: { type: 'STRING' },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
          markdown: { type: 'STRING' },
          body: { type: 'STRING' },
          term: { type: 'STRING' },
          definition: { type: 'STRING' },
          question: { type: 'STRING' },
          answer: { type: 'STRING' },
          quizMode: { type: 'STRING', enum: ['multipleChoice', 'shortAnswer'] },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctIndex: { type: 'NUMBER' },
          explanation: { type: 'STRING' },
          prompt: { type: 'STRING' },
          hiddenText: { type: 'STRING' },
          columns: { type: 'ARRAY', items: { type: 'STRING' } },
          rows: {
            type: 'ARRAY',
            items: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          ordered: { type: 'BOOLEAN' },
          interactiveChecklist: { type: 'BOOLEAN' },
          checklist: { type: 'BOOLEAN' },
          reason: { type: 'STRING' },
          code: { type: 'STRING' },
          language: { type: 'STRING' },
          caption: { type: 'STRING' },
          items: { type: 'ARRAY', items: { type: 'STRING' } },
          headers: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    },
  },
  required: ['objects'],
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
          objects: objectSchema.properties.objects,
        },
        required: ['title', 'summary', 'objects'],
      },
    },
  },
  required: ['title', 'folderName', 'dashboards'],
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
          promptMode
            ? 'from this learning prompt'
            : 'from these raw notes'
        }.

Return exactly one JSON object with this shape:
{
  "title": "Short study pack title",
  "sourceFormat": "text",
  "objects": [
    { "kind": "markdown", "title": "Explanation", "markdown": "..." },
    { "kind": "quiz", "question": "...", "quizMode": "multipleChoice", "options": ["...", "...", "..."], "correctIndex": 0, "answer": "...", "explanation": "..." }
  ]
}

Do not wrap the JSON in markdown fences. Do not add commentary outside JSON.

Rules:
- ${
          promptMode
            ? 'Use accurate general knowledge to teach the requested topic; do not pretend the prompt is source notes.'
            : 'Use only facts answerable from the notes.'
        }
- ${sourceInstruction}
- ${pathInstruction}
- In AI Tutor mode, include at least one markdown explanation object as the first object. Use the "markdown" field for markdown objects, not "body".
- Generate exercises even from short notes. A single wiki paragraph should still produce multiple grounded quizzes and flashcards.
- Prefer useful learning widgets from the selected target types: quizzes, flashcards as "qa", term definitions, lists, comparisons, sequences, code notes, tables, and review prompts.
- For multiple-choice quizzes, include 3-4 options and correctIndex. Vary the correct answer position across questions; do not always put the correct answer first.
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
- Use only: markdown, qa, quiz, term, list, reviewPrompt.
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

  const draft = normalizeAiStudyPackDraft(parsed, packId)
  const safeDraft = removeUnrequestedHeavyResources(draft.objects, rawNotes)
  const augmented = augmentStudyPackPracticeObjects(safeDraft.objects, {
    packId,
    title: draft.title || title,
    rawNotes,
    generationTargets,
    generationAmount,
  })

  return {
    ...draft,
    objects: augmented.objects,
    warnings: [...draft.warnings, ...safeDraft.warnings, ...augmented.warnings],
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
  const stepNames = [
    'Introduction',
    'Theory',
    'Examples',
    'Practice',
    'Final Review',
  ]
  const practiceProfile = createStudyPackPracticeProfile(generationAmount, [
    'summaries',
    'definitions',
    'flashcards',
    'quizzes',
    'exercises',
  ])
  const text = await callGemini(
    apiToken,
    model,
    [
      {
        text: `Create a Study Path JSON object. A Study Path is NOT one dashboard. It is a folder containing multiple ordered dashboards/study packs.

Return exactly this structure:
{
  "title": "Path title",
  "folderName": "Folder name for all dashboards",
  "dashboards": [
    { "title": "01 - Introduction", "summary": "One sentence preview", "rawNotes": "Complete lesson notes for this dashboard", "objects": [...] }
  ]
}

Rules:
- Create exactly 5 dashboards unless the topic is tiny. Use these ordered lessons: ${stepNames.join(' → ')}.
- Each dashboard must be useful by itself and contain 6-12 objects.
- rawNotes must be real lesson notes for that dashboard, not a one-line summary. Write 250-600 words with explanations, examples, key points, and common mistakes when relevant.
- Start each dashboard with a markdown object containing the full teaching explanation for that lesson. Use the "markdown" field, not "body".
- Practice questions must be specific to the lesson content. Never create generic questions like "What do the notes say about <dashboard title>?".
- Include practice in later dashboards: quizzes, flashcards as "qa", review prompts, lists, sequences, code, or tables when relevant.
- Every dashboard needs a short "summary" sentence so the review screen can preview it.
- Do not wrap JSON in markdown. Do not add commentary outside JSON.
- Do not create PDFs/images/resources unless the user explicitly asks for heavy media.
- For multiple-choice quizzes, include 3-4 options, correctIndex, answer, and explanation.
- Keep content concise, beginner-friendly, and appropriate for the requested topic.
- Aim for about ${practiceProfile.minTotal}-${practiceProfile.maxTotal} reviewable items across the whole path.

Path title: ${title}
Folder name: ${folderName}
User request/topic:
${prompt}`,
      },
    ],
    studyPathSchema,
  )

  const parsed = parseGeminiJson(text)
  const record =
    parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  const rawDashboards = Array.isArray(record.dashboards)
    ? record.dashboards
    : []
  const warnings: string[] = []
  const dashboards = rawDashboards
    .slice(0, 8)
    .map((item, index): AiStudyPathDashboardDraft | null => {
      const input =
        item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
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
      const draft = normalizeAiStudyPackDraft(
        {
          ...input,
          title: dashboardTitle,
          sourceFormat: 'text',
        },
        packId,
      )
      const safeDraft = removeUnrequestedHeavyResources(draft.objects, prompt)
      const lessonNotes = buildStudyPathLessonNotes(
        dashboardTitle,
        dashboardSummary,
        typeof input.rawNotes === 'string' ? input.rawNotes : '',
        safeDraft.objects,
      )
      const augmented = augmentStudyPackPracticeObjects(safeDraft.objects, {
        packId,
        title: dashboardTitle,
        rawNotes: lessonNotes,
        generationTargets: [
          'summaries',
          'definitions',
          'flashcards',
          'quizzes',
          'exercises',
        ],
        generationAmount,
      })

      warnings.push(...draft.warnings, ...safeDraft.warnings, ...augmented.warnings)

      if (augmented.objects.length === 0) {
        warnings.push(`Skipped ${dashboardTitle}: no usable study objects.`)
        return null
      }

      return {
        ...draft,
        title: dashboardTitle,
        summary: dashboardSummary,
        rawNotes: lessonNotes,
        objects: augmented.objects,
        warnings: [],
        sourceFormat: 'text' as StudyPackSourceFormat,
      }
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

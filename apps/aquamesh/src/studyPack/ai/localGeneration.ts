import { parseStudyPack } from '../parser'
import {
  augmentStudyPackPracticeObjects,
  createStudyPackPracticeProfile,
} from '../practice'
import {
  StudyObject,
  StudyPackSourceFormat,
  StudyPathDashboardRole,
} from '../types'
import {
  AiStudyPackDraft,
  NormalizeAiStudyPackDraftOptions,
} from './normalizer'
import {
  callLocalLanguageModel,
  LocalAiProgressEvent,
} from './localLanguageModel'
import {
  AiStudyPathDashboardDraft,
  AiStudyPathDraft,
  GenerateStudyPackWithAiOptions,
  GenerateStudyPathWithAiOptions,
  getStudyPathDashboardRoles,
  normalizeStudyPathGenerationAmount,
  StudyPathGenerationAmount,
} from './gemini'

type LocalObjectKind =
  | 'markdown'
  | 'term'
  | 'qa'
  | 'quiz'
  | 'list'
  | 'reviewPrompt'

interface LocalGenerationOptions {
  onProgress?: (event: LocalAiProgressEvent) => void
  dashboardConcurrency?: 1 | 2 | 3 | 5
}

export type LocalAiGenerationFailureCode =
  | 'timeout'
  | 'invalidJson'
  | 'mappingError'
  | 'noUsableObjects'
  | 'unsupported'
  | 'unavailable'
  | 'unknown'

export interface LocalAiGenerationFailureDebug {
  dashboardIndex?: number
  dashboardCount?: number
  attempt?: number
  attemptCount?: number
  promptLength?: number
  rawResponse?: string
  parsedJson?: unknown
  parseError?: string
  mappingError?: string
  droppedOrRepairedItems?: string[]
  attempts?: LocalAiGenerationFailureDebug[]
}

export class LocalAiGenerationError extends Error {
  code: LocalAiGenerationFailureCode
  debug?: LocalAiGenerationFailureDebug
  cause?: unknown

  constructor(
    code: LocalAiGenerationFailureCode,
    message: string,
    options: {
      debug?: LocalAiGenerationFailureDebug
      cause?: unknown
    } = {},
  ) {
    super(message)
    this.name = 'LocalAiGenerationError'
    this.code = code
    this.debug = options.debug
    this.cause = options.cause
  }
}

export const isLocalAiGenerationError = (
  error: unknown,
): error is LocalAiGenerationError =>
  error instanceof LocalAiGenerationError ||
  (Boolean(error) &&
    typeof error === 'object' &&
    (error as { name?: unknown }).name === 'LocalAiGenerationError')

const LOCAL_STUDY_PACK_TIMEOUT_MS = 4 * 60 * 1000
const LOCAL_STUDY_PATH_PLANNER_TIMEOUT_MS = 180 * 1000
const LOCAL_STUDY_PATH_NOTES_TIMEOUT_MS = 180 * 1000
const LOCAL_STUDY_PATH_PRACTICE_TIMEOUT_MS = 150 * 1000
const LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS = 3
const LOCAL_AI_RETRY_COOLDOWN_MS = 8500
const LOCAL_DEEP_BLOCKED_MESSAGE =
  'Deep Study Path is not available with Local AI. Use Average, Compact, Super small, or switch to Own Gemini token.'
const LOCAL_STUDY_PATH_TIMEOUT_MESSAGE =
  'Local AI timed out. Try again, choose a smaller path, or use Own Gemini token.'
const LOCAL_STUDY_PATH_INVALID_JSON_MESSAGE =
  'Local AI returned malformed JSON. Try again, choose a smaller path, or use Own Gemini token.'
const LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE =
  'Local AI returned JSON, but AquaMesh could not map it into widgets.'

interface LocalConceptContract {
  concept: string
  definition: string
  keyFact: string
  example: string
  commonConfusion: string
  sourcePhrase: string
}

interface LocalSectionContract {
  title: string
  items: string[]
}

interface LocalQuizContract {
  question: string
  options: string[]
  correctIndex: number
  answer: string
  explanation: string
}

interface LocalFlashcardContract {
  question: string
  answer: string
}

interface LocalStudyPathPlanSection {
  title: string
  goal: string
  focus?: string
}

interface LocalStudyPathPlanItem {
  title: string
  goal: string
  sections: LocalStudyPathPlanSection[]
  topics: string[]
  avoid: string[]
}

interface LocalStudyPathPlan {
  title: string
  folderName: string
  dashboards: LocalStudyPathPlanItem[]
}

interface LocalRepairedContract {
  title?: string
  summary: string
  rawNotes: string
  sourceSummary: string[]
  concepts: LocalConceptContract[]
  sections: LocalSectionContract[]
  quizzes: LocalQuizContract[]
  flashcards: LocalFlashcardContract[]
}

const localAllowedKinds = new Set<LocalObjectKind>([
  'markdown',
  'term',
  'qa',
  'quiz',
  'list',
  'reviewPrompt',
])

const normalizeSpaces = (value: string): string =>
  value.replace(/\s+/g, ' ').trim()

const normalizeBlock = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const normalizeKey = (value: string): string =>
  normalizeSpaces(
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, ' '),
  )

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? normalizeSpaces(value) : ''

const blockValue = (value: unknown): string =>
  typeof value === 'string' ? normalizeBlock(value) : ''

const titleValue = (value: unknown, fallback: string): string =>
  stringValue(value) || fallback

const localBadTextPattern =
  /\btarget rule\b|\bformation rule\b|proposed that matter\s*:|what rule does|how do you form|what do the notes say|according to the notes|which statement matches|core idea behind/i

const genericFolderNames = new Set([
  'aquamesh',
  'lesson plan',
  'local ai study path',
  'study path',
  'study pack',
  'untitled',
])

const localBadConceptKeys = new Set([
  'active',
  'example',
  'goal',
  'grammar',
  'introduction',
  'it',
  'lesson',
  'concepts',
  'overview',
  'practice',
  'target rule',
  'formation rule',
  'target rule formation rule',
  'proposed that matter',
  'source summary',
  'summary',
])

const isBadLocalText = (value: string): boolean =>
  !value.trim() || localBadTextPattern.test(value)

const isBadConcept = (value: string): boolean => {
  const key = normalizeKey(value)
  const wordCount = key.split(/\s+/).filter(Boolean).length

  return (
    !key ||
    key.length < 3 ||
    localBadConceptKeys.has(key) ||
    localBadTextPattern.test(value) ||
    (wordCount <= 1 && key.length < 6)
  )
}

const uniqueByKey = <T>(
  values: T[],
  keyForValue: (value: T) => string,
): T[] => {
  const seen = new Set<string>()

  return values.filter((value) => {
    const key = normalizeKey(keyForValue(value))
    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

const stringArrayValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return uniqueByKey(value.map(stringValue).filter(Boolean), (item) => item)
  }

  if (typeof value === 'string') {
    return uniqueByKey(
      value
        .split(/\r?\n|;|,(?=\s+\S)/)
        .map(stringValue)
        .filter(Boolean),
      (item) => item,
    )
  }

  return []
}

const summaryString = (value: unknown): string => {
  if (typeof value === 'string') {
    return normalizeSpaces(value)
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return (
      blockValue(record.markdown) ||
      blockValue(record.body) ||
      blockValue(record.content) ||
      stringValue(record.title)
    )
  }

  return ''
}

export const parseLocalAiJson = (text: string): unknown => {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = (fenced || trimmed).replace(/\\(?!["\\/bfnrtu])/g, '')

  const parseCandidate = (value: string): unknown => JSON.parse(value)

  const balanceIncompleteJson = (value: string): string | null => {
    const stack: string[] = []
    let inString = false
    let escaping = false

    for (const char of value) {
      if (inString) {
        if (escaping) {
          escaping = false
          continue
        }

        if (char === '\\') {
          escaping = true
          continue
        }

        if (char === '"') {
          inString = false
        }

        continue
      }

      if (char === '"') {
        inString = true
        continue
      }

      if (char === '{') {
        stack.push('}')
        continue
      }

      if (char === '[') {
        stack.push(']')
        continue
      }

      if (char === '}' || char === ']') {
        if (stack.at(-1) !== char) {
          return null
        }

        stack.pop()
      }
    }

    if (inString || stack.length === 0) {
      return null
    }

    return `${value}${stack.reverse().join('')}`
  }

  try {
    return parseCandidate(candidate)
  } catch {
    const balanced = balanceIncompleteJson(candidate)
    if (balanced) {
      try {
        return parseCandidate(balanced)
      } catch {
        // Fall through to the bounded object extraction fallback.
      }
    }

    const firstObject = candidate.indexOf('{')
    const lastObject = candidate.lastIndexOf('}')
    if (firstObject >= 0 && lastObject > firstObject) {
      const objectCandidate = candidate.slice(firstObject, lastObject + 1)
      try {
        return parseCandidate(objectCandidate)
      } catch {
        const balancedObject = balanceIncompleteJson(objectCandidate)
        if (balancedObject) {
          return parseCandidate(balancedObject)
        }
      }
    }

    throw new Error('Google Local AI returned invalid JSON.')
  }
}

const localAiJsonLooksTruncated = (text: string): boolean => {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = (fenced || trimmed).trim()
  if (!candidate || !/[{\[]/.test(candidate) || /[}\]]\s*$/.test(candidate)) {
    return false
  }

  const stack: string[] = []
  let inString = false
  let escaping = false

  for (const char of candidate) {
    if (inString) {
      if (escaping) {
        escaping = false
        continue
      }

      if (char === '\\') {
        escaping = true
        continue
      }

      if (char === '"') {
        inString = false
      }

      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      stack.push('}')
      continue
    }

    if (char === '[') {
      stack.push(']')
      continue
    }

    if (char === '}' || char === ']') {
      if (stack.at(-1) !== char) {
        return false
      }

      stack.pop()
    }
  }

  return stack.length > 0 || inString
}

const createBase = (
  packId: string,
  kind: string,
  index: number,
  title: string,
) => ({
  id: `${packId}-${kind}-${index + 1}`,
  title,
  sourceLine: index + 1,
  tags: ['study-pack', 'ai-generated', 'local-ai'],
})

const repairKind = (value: unknown): LocalObjectKind | '' => {
  const kind = stringValue(value).toLowerCase()
  if (kind === 'flashcard') {
    return 'qa'
  }

  if (kind === 'multiplechoice' || kind === 'multiple-choice') {
    return 'quiz'
  }

  if (kind === 'reviewprompt' || kind === 'review-prompt') {
    return 'reviewPrompt'
  }

  return localAllowedKinds.has(kind as LocalObjectKind)
    ? (kind as LocalObjectKind)
    : ''
}

const repairLocalQuiz = (
  input: Record<string, unknown>,
  index: number,
  events: string[],
  options: { rejectPlaceholderOptions?: boolean } = {},
): LocalQuizContract | null => {
  const question = stringValue(input.question)
  const rawOptions = Array.isArray(input.options)
    ? input.options.map(stringValue).filter(Boolean)
    : typeof input.options === 'string'
      ? input.options
          .split(/\r?\n|;|,(?=\s+\S)/)
          .map(stringValue)
          .filter(Boolean)
      : []
  const rawCorrectIndex =
    typeof input.correctIndex === 'number'
      ? input.correctIndex
      : typeof input.correctOptionIndex === 'number'
        ? input.correctOptionIndex
        : 0
  const originalAnswer =
    stringValue(input.answer) ||
    (rawCorrectIndex >= 0 && rawCorrectIndex < rawOptions.length
      ? rawOptions[rawCorrectIndex]
      : '')
  const quizOptions = uniqueByKey(rawOptions, (option) => option).slice(0, 4)
  const placeholderOptions = quizOptions.every((option) =>
    /^(?:[a-d]|option\s+[a-d]|choice\s+[a-d])$/i.test(option),
  )
  const correctIndex = quizOptions.findIndex(
    (option) => normalizeKey(option) === normalizeKey(originalAnswer),
  )
  const answer =
    originalAnswer ||
    (rawCorrectIndex >= 0 && rawCorrectIndex < quizOptions.length
      ? quizOptions[rawCorrectIndex]
      : quizOptions[0] || '')
  const finalCorrectIndex =
    correctIndex >= 0
      ? correctIndex
      : quizOptions.findIndex(
          (option) => normalizeKey(option) === normalizeKey(answer),
        )

  if (rawOptions.length !== quizOptions.length) {
    events.push(`Repaired quiz ${index + 1}: removed duplicate options.`)
  }

  if (
    options.rejectPlaceholderOptions &&
    quizOptions.length >= 3 &&
    placeholderOptions
  ) {
    events.push(`Dropped quiz ${index + 1}: placeholder options.`)
    return null
  }

  if (isBadLocalText(question)) {
    events.push(`Dropped quiz ${index + 1}: generic or weak question.`)
    return null
  }

  if (quizOptions.length > 0 && quizOptions.length < 3) {
    events.push(`Dropped quiz ${index + 1}: fewer than 3 unique options.`)
    return null
  }

  if (!question || !answer) {
    events.push(`Dropped quiz ${index + 1}: missing question or answer.`)
    return null
  }

  return {
    question,
    options: quizOptions,
    correctIndex: finalCorrectIndex >= 0 ? finalCorrectIndex : 0,
    answer,
    explanation: stringValue(input.explanation),
  }
}

const flashcardFromRecord = (
  value: unknown,
  index: number,
  events: string[],
): LocalFlashcardContract[] => {
  const input =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const rawQuestion =
    blockValue(input.question) ||
    blockValue(input.front) ||
    blockValue(input.prompt)
  const rawAnswer =
    blockValue(input.answer) ||
    blockValue(input.back) ||
    blockValue(input.definition)
  const question =
    stringValue(input.question) ||
    stringValue(input.front) ||
    stringValue(input.prompt)
  const answer =
    stringValue(input.answer) ||
    stringValue(input.back) ||
    stringValue(input.definition)

  if (!question || !answer || isBadLocalText(question)) {
    events.push(`Dropped flashcard ${index + 1}: weak prompt.`)
    return []
  }

  const combined = `${rawQuestion || question}\n${rawAnswer || answer}`
  const pairs = [
    ...combined.matchAll(
      /(?:^|\n)\s*(?:q(?:uestion)?\s*\d*[:.)-]\s*)([^\n]+)\n\s*(?:a(?:nswer)?\s*\d*[:.)-]\s*)([^\n]+)/gi,
    ),
  ]
    .map((match) => ({
      question: stringValue(match[1]),
      answer: stringValue(match[2]),
    }))
    .filter(
      (flashcard) =>
        flashcard.question &&
        flashcard.answer &&
        !isBadLocalText(flashcard.question),
    )

  if (pairs.length > 1) {
    events.push(
      `Repaired flashcard ${index + 1}: split merged question/answer pairs.`,
    )
    return pairs
  }

  return [{ question, answer }]
}

const localObjectToStudyObject = (
  input: Record<string, unknown>,
  packId: string,
  index: number,
  events: string[],
): StudyObject | null => {
  const kind = repairKind(input.kind)
  if (!kind) {
    events.push(`Dropped local object ${index + 1}: unknown kind.`)
    return null
  }

  const title = titleValue(input.title, `Study item ${index + 1}`)
  const base = createBase(packId, kind, index, title)

  if (kind === 'markdown') {
    const markdown =
      blockValue(input.markdown) ||
      blockValue(input.content) ||
      blockValue(input.body)
    if (!markdown) {
      events.push(`Dropped markdown ${index + 1}: missing markdown.`)
      return null
    }

    if (!input.markdown && (input.content || input.body)) {
      events.push(`Repaired markdown ${index + 1}: used content/body.`)
    }

    return { ...base, kind, markdown }
  }

  if (kind === 'term') {
    const term =
      stringValue(input.term) ||
      stringValue(input.title) ||
      stringValue(input.question)
    const definition =
      stringValue(input.definition) ||
      stringValue(input.answer) ||
      stringValue(input.explanation)
    if (!term || !definition || isBadConcept(term)) {
      events.push(`Dropped term ${index + 1}: weak term or missing definition.`)
      return null
    }

    return { ...base, kind, title: term, term, definition }
  }

  if (kind === 'qa') {
    const question = stringValue(input.question) || stringValue(input.front)
    const answer = stringValue(input.answer) || stringValue(input.back)
    if (!question || !answer || isBadLocalText(question)) {
      events.push(`Dropped qa ${index + 1}: weak question or missing answer.`)
      return null
    }

    return { ...base, kind, question, answer }
  }

  if (kind === 'quiz') {
    const quiz = repairLocalQuiz(input, index, events)
    if (!quiz) {
      return null
    }

    return {
      ...base,
      kind,
      quizMode: quiz.options.length >= 3 ? 'multipleChoice' : 'shortAnswer',
      question: quiz.question,
      options: quiz.options.length >= 3 ? quiz.options : [],
      correctIndex: quiz.options.length >= 3 ? quiz.correctIndex : 0,
      answer: quiz.answer,
      explanation: quiz.explanation,
    }
  }

  if (kind === 'list') {
    const items = stringArrayValue(input.items || input.content).filter(
      (item) => !isBadLocalText(item),
    )
    if (items.length === 0) {
      events.push(`Dropped list ${index + 1}: missing usable items.`)
      return null
    }

    if (!input.items && input.content) {
      events.push(`Repaired list ${index + 1}: split content into items.`)
    }

    return {
      ...base,
      kind,
      items: items.slice(0, 8),
      ordered: Boolean(input.ordered),
      checklist: Boolean(input.checklist),
    }
  }

  const prompt =
    stringValue(input.prompt) ||
    stringValue(input.content) ||
    stringValue(input.title)
  if (!prompt || isBadLocalText(prompt)) {
    events.push(`Dropped reviewPrompt ${index + 1}: weak or missing prompt.`)
    return null
  }

  if (!input.prompt && (input.content || input.title)) {
    events.push(`Repaired reviewPrompt ${index + 1}: used content/title.`)
  }

  return {
    ...base,
    kind,
    prompt,
    reason: stringValue(input.reason),
    status: 'needsReview',
  }
}

const conceptFromRecord = (
  value: unknown,
  index: number,
  events: string[],
): LocalConceptContract | null => {
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const concept = stringValue(record.concept || record.title || record.term)
  const definition =
    stringValue(record.definition) ||
    stringValue(record.keyFact) ||
    stringValue(record.explanation) ||
    stringValue(record.answer)
  const keyFact =
    stringValue(record.keyFact) || stringValue(record.fact) || definition
  const example = stringValue(record.example)
  const commonConfusion =
    stringValue(record.commonConfusion) ||
    stringValue(record.commonMistake) ||
    stringValue(record.confusion)
  const sourcePhrase = stringValue(record.sourcePhrase || record.source)

  if (isBadConcept(concept) || !definition) {
    events.push(`Dropped concept ${index + 1}: weak label or definition.`)
    return null
  }

  return {
    concept,
    definition,
    keyFact,
    example,
    commonConfusion,
    sourcePhrase,
  }
}

const conceptFromText = (
  value: string,
  index: number,
): LocalConceptContract | null => {
  const cleaned = normalizeSpaces(value.replace(/^#{1,6}\s*/, ''))
  if (!cleaned || localBadTextPattern.test(cleaned)) {
    return null
  }

  const parts = cleaned.split(/\s*[:\-]\s+/)
  const concept =
    parts.length > 1 ? parts[0] : cleaned.split(/\s+/).slice(0, 5).join(' ')
  if (isBadConcept(concept)) {
    return null
  }

  return {
    concept,
    definition: parts.length > 1 ? parts.slice(1).join(': ') : cleaned,
    keyFact: cleaned,
    example: '',
    commonConfusion: '',
    sourcePhrase: cleaned,
  }
}

const conceptsFromRawNotes = (rawNotes: string): LocalConceptContract[] =>
  uniqueByKey(
    rawNotes
      .split(/\r?\n|(?<=[.!?])\s+/)
      .map((line, index) => conceptFromText(line, index))
      .filter((concept): concept is LocalConceptContract => Boolean(concept))
      .slice(0, 6),
    (concept) => concept.concept,
  )

const sectionsFromRecord = (
  value: unknown,
  events: string[],
): LocalSectionContract[] => {
  const records = Array.isArray(value) ? value : []

  return records
    .map((item, index): LocalSectionContract | null => {
      const record =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {}
      const title = stringValue(record.title) || `Key ideas ${index + 1}`
      const items = stringArrayValue(
        record.items || record.bullets || record.content,
      )
        .filter((line) => !isBadLocalText(line))
        .slice(0, 6)

      if (items.length === 0) {
        events.push(`Dropped section ${index + 1}: no usable items.`)
        return null
      }

      return { title, items }
    })
    .filter((section): section is LocalSectionContract => Boolean(section))
}

const buildSummaryMarkdown = (
  title: string,
  summary: string,
  sourceSummary: string[],
  concepts: LocalConceptContract[],
): string => {
  const bullets =
    sourceSummary.length > 0
      ? sourceSummary
      : concepts.map((concept) => `${concept.concept}: ${concept.definition}`)

  return [
    `# ${title}`,
    summary,
    bullets.length > 0
      ? `## Key ideas\n${bullets
          .slice(0, 5)
          .map((item) => `- ${item}`)
          .join('\n')}`
      : '',
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
}

const buildRawNotesFromContract = (
  title: string,
  summary: string,
  sourceSummary: string[],
  concepts: LocalConceptContract[],
): string =>
  [
    `# ${title}`,
    summary ? `## Summary\n${summary}` : '',
    sourceSummary.length > 0
      ? `## Source summary\n${sourceSummary
          .map((item) => `- ${item}`)
          .join('\n')}`
      : '',
    concepts.length > 0
      ? `## Concepts\n${concepts
          .map((concept) => {
            const lines = [
              `### ${concept.concept}`,
              concept.definition,
              concept.keyFact ? `Key fact: ${concept.keyFact}` : '',
              concept.example ? `Example: ${concept.example}` : '',
              concept.commonConfusion
                ? `Watch for: ${concept.commonConfusion}`
                : '',
            ]
            return lines.filter(Boolean).join('\n')
          })
          .join('\n\n')}`
      : '',
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')

const contractFromRecord = (
  record: Record<string, unknown>,
  titleFallback: string,
  rawNotesFallback: string,
  events: string[],
): LocalRepairedContract => {
  const title = stringValue(record.title) || titleFallback
  const sourceSummary = stringArrayValue(
    record.sourceSummary ||
      record.bullets ||
      (record.summary && typeof record.summary === 'object'
        ? (record.summary as Record<string, unknown>).bullets
        : undefined),
  ).filter((item) => !isBadLocalText(item))
  const concepts = uniqueByKey(
    (Array.isArray(record.concepts) ? record.concepts : [])
      .map((item, index) => conceptFromRecord(item, index, events))
      .filter((concept): concept is LocalConceptContract => Boolean(concept)),
    (concept) => concept.concept,
  )
  const summary =
    summaryString(record.summary) ||
    sourceSummary[0] ||
    concepts[0]?.definition ||
    ''
  const rawMarkdown = Array.isArray(record.objects)
    ? record.objects
        .map((item) =>
          item && typeof item === 'object'
            ? localObjectToStudyObject(
                item as Record<string, unknown>,
                'debug',
                0,
                [],
              )
            : null,
        )
        .find((object): object is Extract<StudyObject, { kind: 'markdown' }> =>
          Boolean(object && object.kind === 'markdown'),
        )?.markdown || ''
    : ''
  const rawNotes =
    blockValue(record.rawNotes) ||
    blockValue(record.notes) ||
    rawMarkdown ||
    rawNotesFallback ||
    buildRawNotesFromContract(title, summary, sourceSummary, concepts)
  const repairedConcepts =
    concepts.length > 0 ? concepts : conceptsFromRawNotes(rawNotes)

  if (typeof record.summary === 'object' && record.summary) {
    events.push('Repaired summary: converted object to text.')
  }

  if (!blockValue(record.rawNotes) && rawNotes) {
    events.push('Repaired rawNotes: derived from Local AI content.')
  }

  return {
    title,
    summary,
    rawNotes,
    sourceSummary,
    concepts: repairedConcepts,
    sections: sectionsFromRecord(record.sections || record.lists, events),
    quizzes: (Array.isArray(record.quizzes) ? record.quizzes : [])
      .map((item, index) =>
        item && typeof item === 'object'
          ? repairLocalQuiz(item as Record<string, unknown>, index, events)
          : null,
      )
      .filter((quiz): quiz is LocalQuizContract => Boolean(quiz)),
    flashcards: (Array.isArray(record.flashcards)
      ? record.flashcards
      : []
    ).flatMap((item, index) => flashcardFromRecord(item, index, events)),
  }
}

const conceptQuestion = (
  concept: LocalConceptContract,
  index: number,
): string => {
  if (
    /\b(dalton|democritus|thomson|rutherford|bohr|scientist|theory)\b/i.test(
      `${concept.concept} ${concept.definition}`,
    )
  ) {
    return `What did ${concept.concept} contribute or explain?`
  }

  if (
    /\b(spanish|french|b1|tense|conjugat|verb|subjunctive|preterite|imperfect)\b/i.test(
      `${concept.concept} ${concept.definition}`,
    )
  ) {
    return `When would you use ${concept.concept} in context?`
  }

  return index % 2 === 0
    ? `What is the key idea behind ${concept.concept}?`
    : `How would you explain ${concept.concept} in your own words?`
}

const conceptQuiz = (
  packId: string,
  concept: LocalConceptContract,
  index: number,
): StudyObject => ({
  ...createBase(packId, 'quiz', index, `${concept.concept} practice`),
  kind: 'quiz',
  quizMode: 'shortAnswer',
  question: conceptQuestion(concept, index),
  options: [],
  correctIndex: 0,
  answer: concept.keyFact || concept.definition,
  explanation: concept.definition,
})

const conceptFlashcard = (
  packId: string,
  concept: LocalConceptContract,
  index: number,
): StudyObject => ({
  ...createBase(packId, 'flashcard', index, `${concept.concept} flashcard`),
  kind: 'qa',
  question: conceptQuestion(concept, index),
  answer: concept.definition,
})

const objectsFromContract = (
  contract: LocalRepairedContract,
  packId: string,
  events: string[],
): StudyObject[] => {
  const sourceSummary = Array.isArray(contract.sourceSummary)
    ? contract.sourceSummary
    : []
  const concepts = Array.isArray(contract.concepts) ? contract.concepts : []
  const sections = Array.isArray(contract.sections) ? contract.sections : []
  const quizzes = Array.isArray(contract.quizzes) ? contract.quizzes : []
  const flashcards = Array.isArray(contract.flashcards)
    ? contract.flashcards
    : []
  const objects: StudyObject[] = [
    {
      ...createBase(packId, 'markdown', 0, 'Source summary'),
      kind: 'markdown',
      markdown: buildSummaryMarkdown(
        contract.title || 'Study Pack',
        contract.summary,
        sourceSummary,
        concepts,
      ),
    },
  ]

  sections.slice(0, 4).forEach((section, index) => {
    objects.push({
      ...createBase(packId, 'list', index, section.title),
      kind: 'list',
      items: section.items,
      ordered: false,
      checklist: false,
    })
  })

  if (sections.length === 0 && concepts.length > 0) {
    objects.push({
      ...createBase(packId, 'list', 0, 'Key concepts'),
      kind: 'list',
      items: concepts
        .slice(0, 6)
        .map((concept) => `${concept.concept}: ${concept.definition}`),
      ordered: false,
      checklist: false,
    })
    events.push('Repaired sections: created Key concepts list.')
  }

  quizzes.slice(0, 6).forEach((quiz, index) => {
    objects.push({
      ...createBase(packId, 'quiz', index, `Quiz ${index + 1}`),
      kind: 'quiz',
      quizMode: quiz.options.length >= 3 ? 'multipleChoice' : 'shortAnswer',
      question: quiz.question,
      options: quiz.options.length >= 3 ? quiz.options : [],
      correctIndex: quiz.options.length >= 3 ? quiz.correctIndex : 0,
      answer: quiz.answer,
      explanation: quiz.explanation,
    })
  })

  flashcards.slice(0, 5).forEach((flashcard, index) => {
    objects.push({
      ...createBase(packId, 'flashcard', index, `Flashcard ${index + 1}`),
      kind: 'qa',
      question: flashcard.question,
      answer: flashcard.answer,
    })
  })

  const usableConcepts = concepts.filter(
    (concept) => !isBadConcept(concept.concept),
  )
  while (
    objects.filter((object) => object.kind === 'quiz').length < 3 &&
    usableConcepts.length > 0
  ) {
    const index = objects.filter((object) => object.kind === 'quiz').length
    objects.push(
      conceptQuiz(packId, usableConcepts[index % usableConcepts.length], index),
    )
    events.push('Augmented Local AI output: added concept quiz.')
  }

  while (
    objects.filter((object) => object.kind === 'qa').length < 3 &&
    usableConcepts.length > 0
  ) {
    const index = objects.filter((object) => object.kind === 'qa').length
    objects.push(
      conceptFlashcard(
        packId,
        usableConcepts[index % usableConcepts.length],
        index,
      ),
    )
    events.push('Augmented Local AI output: added concept flashcard.')
  }

  return objects
}

export const normalizeLocalAiStudyPackDraft = (
  value: unknown,
  packId: string,
  options: NormalizeAiStudyPackDraftOptions = {},
): AiStudyPackDraft => {
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const events: string[] = []
  const rawObjects = Array.isArray(record.objects)
    ? record.objects
    : Array.isArray(record.studyObjects)
      ? record.studyObjects
      : []
  const looseObjects = rawObjects
    .map((item, index) =>
      item && typeof item === 'object'
        ? localObjectToStudyObject(
            item as Record<string, unknown>,
            packId,
            index,
            events,
          )
        : null,
    )
    .filter((object): object is StudyObject => Boolean(object))

  if (rawObjects.length > 0) {
    if (looseObjects.length === 0) {
      events.push('Google Local AI did not return any usable study objects.')
    }

    return {
      title:
        typeof record.title === 'string' && record.title.trim()
          ? normalizeSpaces(record.title)
          : undefined,
      sourceFormat: 'text' as StudyPackSourceFormat,
      rawNotes:
        blockValue(record.rawNotes) ||
        blockValue(record.notes) ||
        blockValue(record.markdown) ||
        options.rawNotes ||
        '',
      dashboardRole: options.dashboardRole,
      objects: looseObjects,
      warnings:
        looseObjects.length === 0 ? ['No usable Local AI objects found.'] : [],
      debugTrace: {
        rawAiResponse: options.rawAiResponse || JSON.stringify(value, null, 2),
        validatedContract: record,
        roleFilteredContract: record,
        droppedOrRepairedItems: events,
        finalObjects: looseObjects,
      },
    }
  }

  const contract = contractFromRecord(
    record,
    'Study Pack',
    options.rawNotes || '',
    events,
  )
  const contractObjects = objectsFromContract(contract, packId, events)
  const objects = uniqueByKey(
    [...contractObjects, ...looseObjects],
    (object) =>
      object.kind === 'markdown'
        ? `${object.kind}:${object.title}`
        : JSON.stringify(object),
  )

  if (objects.length === 0) {
    events.push('Google Local AI did not return any usable study objects.')
  }

  return {
    title: contract.title,
    sourceFormat: 'text' as StudyPackSourceFormat,
    rawNotes: contract.rawNotes,
    dashboardRole: options.dashboardRole,
    objects,
    warnings: objects.length === 0 ? ['No usable Local AI objects found.'] : [],
    debugTrace: {
      rawAiResponse: options.rawAiResponse || JSON.stringify(value, null, 2),
      validatedContract: contract,
      roleFilteredContract: contract,
      droppedOrRepairedItems: events,
      finalObjects: objects,
    },
  }
}

const getLocalStudyPathDashboardCount = (
  generationAmount: StudyPathGenerationAmount = 'compact',
): number => {
  const normalized = normalizeStudyPathGenerationAmount(generationAmount)
  if (normalized === 'superSmall') {
    return 2
  }

  if (normalized === 'average') {
    return 5
  }

  return 3
}

const localStudyPackPrompt = ({
  title,
  rawNotes,
  promptMode = false,
}: GenerateStudyPackWithAiOptions): string => {
  const compactNotes = rawNotes.replace(/\s+/g, ' ').trim().slice(0, 1800)

  return `Return JSON only. No prose. No markdown fences.
Create exactly 6 simple study objects from the source.
Allowed kinds only: markdown, qa, quiz, list.
Use this shape:
{"title":"${title.replace(
    /"/g,
    '',
  )}","objects":[{"kind":"markdown","title":"Explanation","markdown":"2-4 short sentences"},{"kind":"qa","question":"...","answer":"..."},{"kind":"qa","question":"...","answer":"..."},{"kind":"quiz","question":"...","quizMode":"multipleChoice","options":["A","B","C"],"correctIndex":0,"answer":"A","explanation":"why"},{"kind":"quiz","question":"...","quizMode":"multipleChoice","options":["A","B","C"],"correctIndex":0,"answer":"A","explanation":"why"},{"kind":"list","title":"Key points","items":["...","...","..."]}]}
Rules: exactly 6 objects. First object markdown. No vague questions. No target rule, formation rule, What rule does, How do you form, What do the notes say.
Input: ${promptMode ? 'learning goal' : 'source notes'}
${compactNotes}`
}

const localStudyPathPlannerPrompt = (
  { title, prompt }: GenerateStudyPathWithAiOptions,
  count: number,
): string => {
  const compactPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 800)

  return `Return JSON only. Start with { and end with }.

Plan a Study Path with exactly ${count} lesson dashboards for "${title}".

Shape:
{"title":"...","folderName":"...","dashboards":[{"title":"01 - ...","goal":"...","sections":[{"title":"...","goal":"...","focus":"...; ...; ..."},{"title":"...","goal":"...","focus":"...; ...; ..."}],"avoid":"...; ..."}]}

Topic:
${compactPrompt}

Rules:
- Return exactly one JSON object.
- dashboards must contain exactly ${count} dashboards.
- Every dashboard title must start with 01 -, 02 -, etc.
- Each dashboard must have exactly 2 sections.
- Each section has only title, goal, and focus.
- focus is one string with exactly 3 short topics separated by semicolons.
- avoid is one string with exactly 2 short topics separated by semicolons.
- No lesson content.
- No quizzes.
- No flashcards.
- No markdown.
- No code fences.
- No explanations outside JSON.
- Use short strings.`
}

const localStudyPathMarkdownWordTarget = (attempt: number): string => {
  if (attempt === 1) {
    return '80-100 words'
  }

  if (attempt === 2) {
    return '60-80 words'
  }

  return '40-60 words'
}

const localStudyPathMarkdownSectionPrompt = (
  options: GenerateStudyPathWithAiOptions,
  outline: LocalStudyPathPlanItem[],
  item: LocalStudyPathPlanItem,
  section: LocalStudyPathPlanSection,
  sectionIndex: number,
  attempt: number,
): string => {
  const compactPrompt = options.prompt.replace(/\s+/g, ' ').trim().slice(0, 900)
  const outlineTitles = outline.map((entry) => entry.title).join(' | ')
  const wordTarget = localStudyPathMarkdownWordTarget(attempt)
  const role =
    sectionIndex === 0
      ? 'core explanation, rules, and meaning'
      : 'examples, usage, and common mistakes'
  const structure =
    sectionIndex === 0
      ? `Recommended structure:
## ${section.title}

### Core meanings
- ...
- ...
- ...

### When to use each one
- **Concept 1**: ...
- **Concept 2**: ...
- **Concept 3**: ...`
      : `Recommended structure:
## ${section.title}

### Mini examples
- **Example 1** = ...
- **Example 2** = ...
- **Example 3** = ...

### Common mistakes
- ...
- ...`
  const attemptRule =
    attempt === 1
      ? 'Use full structured Markdown with short bullets.'
      : attempt === 2
        ? 'Use simpler structured Markdown with fewer bullets.'
        : 'Survival mode: write the shortest usable structured Markdown.'

  return `Return Markdown only.
No JSON. No code fences.
Start exactly with this heading:
## ${section.title}

Write ${role} for "${item.title}" in "${options.title}".
Target length: around ${wordTarget}.
${attemptRule}

Rules:
- Return Markdown only.
- No JSON.
- No code fences.
- Do not mention dashboard, study path, lesson, concepts, part 1, or part 2.
- Do not write Goal:.
- Do not add a generic intro.
- Do not add a conclusion.
- Prefer bullets, short sections, and small lists.
- Write only in the user's request language.
- Use the target language only for examples, vocabulary, and short phrases.
- Keep grammar explanations simple and safe.
- Do not teach beginner introductions if the requested level is B1/B2 or higher.

${structure}

Study path topic: ${compactPrompt}
Outline titles: ${outlineTitles}
Current page goal: ${item.goal}
Current section title: ${section.title}
Current section goal: ${section.goal}
Section focus: ${section.focus || ''}
Avoid: ${item.avoid.join(', ')}
Use the section focus topics as anchors. If there are 3 topics, cover each one once.`
}

const localStudyPathPracticePrompt = (
  options: GenerateStudyPathWithAiOptions,
  outline: LocalStudyPathPlanItem[],
  item: LocalStudyPathPlanItem,
  notes: string,
  attempt: number,
): string => {
  const compactPrompt = options.prompt.replace(/\s+/g, ' ').trim().slice(0, 900)
  const outlineTitles = outline.map((entry) => entry.title).join(' | ')
  const compactNotes = notes.replace(/\s+/g, ' ').trim().slice(0, 1800)

  return `Return minified JSON only. End with }.
Create practice from these exact lesson notes. Attempt ${attempt} of ${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS} for "${
    item.title
  }" in "${options.title}".
Shape:
{"flashcards":[{"question":"...","answer":"..."},{"question":"...","answer":"..."}],"quizzes":[{"question":"...","options":["...","...","..."],"correctIndex":0}]}
Rules: JSON only. No notes field. No prose outside JSON. Ask for 2 flashcards and 1-2 quizzes, but usable output matters more than exact counts.
Practice must be answerable from the notes. Do not merge multiple flashcards into one object; each flashcard must have exactly one question and one answer.
Quiz options must be real answer choices, not A/B/C placeholders. Avoid duplicate options. correctIndex must point to the right option.
Topic: ${compactPrompt}
Outline titles: ${outlineTitles}
Goal: ${item.goal}
Topics: ${item.topics.join(', ')}
Avoid: ${item.avoid.join(', ')}
Lesson notes:
${compactNotes}`
}

export const generateStudyPackWithLocalAi = async (
  options: GenerateStudyPackWithAiOptions,
  localOptions: LocalGenerationOptions = {},
): Promise<AiStudyPackDraft> => {
  const text = await callLocalLanguageModel(localStudyPackPrompt(options), {
    timeoutMs: LOCAL_STUDY_PACK_TIMEOUT_MS,
    onProgress: localOptions.onProgress,
    progressLabel: 'Estimated Local AI generation time',
  })
  const parsed = parseLocalAiJson(text)
  const draft = normalizeLocalAiStudyPackDraft(parsed, options.packId, {
    rawNotes: options.rawNotes,
    rawAiResponse: text,
  })

  return {
    ...draft,
    title: draft.title || options.title,
    sourceFormat: draft.sourceFormat || 'text',
  }
}

const firstMarkdownObject = (objects: StudyObject[]): StudyObject | undefined =>
  objects.find((object) => object.kind === 'markdown')

const ensureFirstMarkdown = (
  objects: StudyObject[],
  packId: string,
  title: string,
  markdown: string,
  events: string[],
): StudyObject[] => {
  if (objects[0]?.kind === 'markdown') {
    return [
      {
        ...objects[0],
        title: 'Lesson notes',
        markdown: sanitizeLocalLessonNotesMarkdown(objects[0].markdown),
      },
      ...objects.slice(1),
    ]
  }

  const existingMarkdown = firstMarkdownObject(objects)
  const otherObjects = objects.filter((object) => object !== existingMarkdown)
  const markdownObject =
    existingMarkdown ||
    ({
      ...createBase(packId, 'markdown', 0, 'Lesson explanation'),
      kind: 'markdown',
      markdown: sanitizeLocalLessonNotesMarkdown(
        markdown || `# ${title}\n\nReview this lesson before practice.`,
      ),
    } as StudyObject)

  if (!existingMarkdown) {
    events.push('Repaired dashboard: added first markdown explanation.')
  }

  return [markdownObject, ...otherObjects]
}

const sanitizeLocalLessonNotesMarkdown = (markdown: string): string =>
  normalizeBlock(
    markdown
      .replace(/^```(?:json|markdown|md)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .replace(/^goal\s*:.*$/gim, '')
      .replace(
        /^#{1,6}\s*Validation and Cleanup\b[\s\S]*?(?=^#{1,6}\s|$(?![\s\S]))/gim,
        '',
      ),
  )
    .replace(/^(#{1,6}\s*)Summary\b/gim, '$1Lesson notes')
    .replace(/^(#{1,6}\s*)Source summary\b/gim, '$1Source notes')

const stripLocalPracticeSectionsFromNotes = (markdown: string): string => {
  const practiceStart = markdown.search(
    /^#{1,6}\s*(?:(?:practice\s+(?:questions?|exercises?|tasks?))|quiz|quizzes|flashcards?)\b|^\*{0,2}(?:quiz|flashcard)\s*\d*\*{0,2}\s*:/im,
  )

  return sanitizeLocalLessonNotesMarkdown(
    practiceStart >= 0 ? markdown.slice(0, practiceStart) : markdown,
  ).trim()
}

const cleanLocalStudyPathSectionMarkdown = (
  markdown: string,
  requiredHeading: string,
): string => {
  const cleaned = sanitizeLocalLessonNotesMarkdown(markdown)
  if (/^\s*[\[{]/.test(cleaned)) {
    throw new LocalAiGenerationError(
      'noUsableObjects',
      LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
      {
        debug: {
          mappingError: 'Local AI returned JSON instead of Markdown notes.',
        },
      },
    )
  }

  if (!cleaned.startsWith(requiredHeading)) {
    throw new LocalAiGenerationError(
      'noUsableObjects',
      LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
      {
        debug: {
          mappingError: `Local AI Markdown did not start with ${requiredHeading}.`,
        },
      },
    )
  }

  return cleaned
}

const fillDashboardObjects = (
  objects: StudyObject[],
  contract: LocalRepairedContract,
  packId: string,
  targetCount: number,
  events: string[],
): StudyObject[] => {
  const filled = [...objects]
  const concepts = (
    Array.isArray(contract.concepts) ? contract.concepts : []
  ).filter((concept) => !isBadConcept(concept.concept))
  let cursor = 0

  while (filled.length < targetCount && concepts.length > 0) {
    const concept = concepts[cursor % concepts.length]
    const index = filled.length
    filled.push(
      index % 2 === 0
        ? conceptQuiz(packId, concept, index)
        : conceptFlashcard(packId, concept, index),
    )
    cursor += 1
    events.push('Augmented Local AI dashboard: added concept practice object.')
  }

  return filled
}

const wordCount = (value: string): number =>
  value.split(/\s+/).filter(Boolean).length

const previewSummaryFromNotes = (notes: string, fallback: string): string => {
  const cleaned = normalizeSpaces(notes.replace(/^#{1,6}\s*/gm, ''))
  const sentence = cleaned.match(/^[^.!?]+[.!?]/)?.[0]

  return normalizeSpaces(sentence || cleaned).slice(0, 180) || fallback
}

const isLocalRepairedContract = (
  value: unknown,
): value is LocalRepairedContract => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<Record<keyof LocalRepairedContract, unknown>>

  return (
    Array.isArray(record.sourceSummary) &&
    Array.isArray(record.concepts) &&
    Array.isArray(record.sections) &&
    Array.isArray(record.quizzes) &&
    Array.isArray(record.flashcards)
  )
}

const fallbackContractFromDashboard = (
  title: string,
  summary: string,
  rawNotes: string,
): LocalRepairedContract => ({
  title,
  summary,
  rawNotes,
  sourceSummary: [],
  concepts: conceptsFromRawNotes(rawNotes),
  sections: [],
  quizzes: [],
  flashcards: [],
})

const flatDashboardObjects = (
  record: Record<string, unknown>,
  packId: string,
  title: string,
  rawNotes: string,
  events: string[],
): StudyObject[] => {
  const objects: StudyObject[] = []
  const markdown =
    blockValue(record.notes) ||
    rawNotes ||
    blockValue(record.markdown) ||
    blockValue(record.explanation) ||
    blockValue(record.content)

  if (markdown || rawNotes) {
    objects.push({
      ...createBase(packId, 'markdown', 0, 'Lesson notes'),
      kind: 'markdown',
      markdown: sanitizeLocalLessonNotesMarkdown(
        markdown || rawNotes || `# ${title}`,
      ),
    })
  }

  const flashcards = Array.isArray(record.flashcards) ? record.flashcards : []
  flashcards
    .flatMap((item, index) => flashcardFromRecord(item, index, events))
    .slice(0, 4)
    .forEach((flashcard, index) => {
      objects.push({
        ...createBase(packId, 'qa', index, `Flashcard ${index + 1}`),
        kind: 'qa',
        question: flashcard.question,
        answer: flashcard.answer,
      })
    })

  const qaQuestion = stringValue(
    record.qaQ || record.qaQuestion || record.question,
  )
  const qaAnswer = stringValue(record.qaA || record.qaAnswer || record.answer)
  if (qaQuestion && qaAnswer && !isBadLocalText(qaQuestion)) {
    objects.push({
      ...createBase(packId, 'qa', flashcards.length, 'Check understanding'),
      kind: 'qa',
      question: qaQuestion,
      answer: qaAnswer,
    })
  }

  const quizzes = Array.isArray(record.quizzes) ? record.quizzes : []
  quizzes.slice(0, 4).forEach((item, index) => {
    const input =
      item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const quiz = repairLocalQuiz(input, index, events, {
      rejectPlaceholderOptions: true,
    })
    if (!quiz) {
      return
    }

    if (quiz.options.length < 3) {
      events.push(`Dropped quiz ${index + 1}: fewer than 3 unique options.`)
      return
    }

    objects.push({
      ...createBase(packId, 'quiz', index, `Quiz ${index + 1}`),
      kind: 'quiz',
      quizMode: 'multipleChoice',
      question: quiz.question,
      options: quiz.options,
      correctIndex: quiz.correctIndex,
      answer: quiz.answer,
      explanation: quiz.explanation,
    })
  })

  const quizQuestion = stringValue(record.quizQ || record.quizQuestion)
  const quizOptions = stringArrayValue(record.quizOptions || record.options)
  const quizCorrectIndex =
    typeof record.quizCorrectIndex === 'number'
      ? record.quizCorrectIndex
      : typeof record.correctIndex === 'number'
        ? record.correctIndex
        : 0
  const quizAnswer =
    quizCorrectIndex >= 0 && quizCorrectIndex < quizOptions.length
      ? quizOptions[quizCorrectIndex]
      : quizOptions[0] || ''
  const quiz = repairLocalQuiz(
    {
      question: quizQuestion,
      options: quizOptions,
      correctIndex: quizCorrectIndex,
      answer: quizAnswer || stringValue(record.quizAnswer),
      explanation:
        stringValue(record.quizExplanation) ||
        (quizAnswer ? `Correct answer: ${quizAnswer}` : ''),
    },
    0,
    events,
    { rejectPlaceholderOptions: true },
  )
  if (quiz && quiz.options.length >= 3) {
    objects.push({
      ...createBase(packId, 'quiz', quizzes.length, 'Practice question'),
      kind: 'quiz',
      quizMode: quiz.options.length >= 3 ? 'multipleChoice' : 'shortAnswer',
      question: quiz.question,
      options: quiz.options.length >= 3 ? quiz.options : [],
      correctIndex: quiz.options.length >= 3 ? quiz.correctIndex : 0,
      answer: quiz.answer,
      explanation: quiz.explanation,
    })
  }

  if (objects.length > 0) {
    events.push(
      'Mapped Local AI notes and recall dashboard shape into study objects.',
    )
  }

  return objects
}

const hasMeaningfulDashboardInput = (
  record: Record<string, unknown>,
): boolean => {
  if (wordCount(blockValue(record.rawNotes)) >= 5) {
    return true
  }

  if (wordCount(blockValue(record.notes)) >= 5) {
    return true
  }

  if (wordCount(summaryString(record.summary)) >= 5) {
    return true
  }

  if (
    blockValue(record.markdown) ||
    (stringValue(record.qaQ) && stringValue(record.qaA)) ||
    (stringValue(record.qaQuestion) && stringValue(record.qaAnswer)) ||
    stringValue(record.quizQ) ||
    stringValue(record.quizQuestion) ||
    stringArrayValue(record.listItems).length > 0
  ) {
    return true
  }

  if (stringArrayValue(record.sourceSummary).length > 0) {
    return true
  }

  if (
    (Array.isArray(record.concepts) ? record.concepts : []).some((item) =>
      Boolean(conceptFromRecord(item, 0, [])),
    )
  ) {
    return true
  }

  if (
    (Array.isArray(record.quizzes) ? record.quizzes : []).some((item) =>
      item && typeof item === 'object'
        ? Boolean(repairLocalQuiz(item as Record<string, unknown>, 0, []))
        : false,
    )
  ) {
    return true
  }

  if (
    (Array.isArray(record.flashcards) ? record.flashcards : []).some((item) => {
      const input =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {}
      const question =
        stringValue(input.question) ||
        stringValue(input.front) ||
        stringValue(input.prompt)
      const answer =
        stringValue(input.answer) ||
        stringValue(input.back) ||
        stringValue(input.definition)

      return Boolean(question && answer && !isBadLocalText(question))
    })
  ) {
    return true
  }

  return false
}

const mapLocalDashboard = (
  input: unknown,
  index: number,
  options: GenerateStudyPathWithAiOptions,
  rawAiResponse: string,
  role: StudyPathDashboardRole,
  targetCount: number,
  plannerItem?: LocalStudyPathPlanItem,
  mapOptions: { allowPracticeFallback?: boolean } = {},
): AiStudyPathDashboardDraft | null => {
  const record =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const title =
    plannerItem?.title ||
    stringValue(record.title) ||
    `${String(index + 1).padStart(2, '0')} - Lesson ${index + 1}`
  const packId = `${options.title}-${index + 1}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  const draft = normalizeLocalAiStudyPackDraft(record, packId, {
    rawNotes: blockValue(record.rawNotes) || blockValue(record.notes),
    rawAiResponse,
    dashboardRole: role,
  })
  const events = [...(draft.debugTrace?.droppedOrRepairedItems || [])]
  if (draft.objects.length === 0 && !hasMeaningfulDashboardInput(record)) {
    return null
  }

  const rawNotes =
    blockValue(record.rawNotes) ||
    blockValue(record.notes) ||
    draft.rawNotes ||
    summaryString(record.summary) ||
    ''
  const summary =
    summaryString(record.summary) ||
    previewSummaryFromNotes(rawNotes, title || 'Generated local AI lesson.')
  const contract = isLocalRepairedContract(draft.debugTrace?.validatedContract)
    ? draft.debugTrace.validatedContract
    : fallbackContractFromDashboard(title, summary, rawNotes)
  const flatObjects = flatDashboardObjects(
    record,
    packId,
    title,
    rawNotes,
    events,
  )
  const flatHasQa = flatObjects.some((object) => object.kind === 'qa')
  const flatHasQuiz = flatObjects.some((object) => object.kind === 'quiz')
  const draftRecallObjects = draft.objects.filter(
    (object) =>
      mapOptions.allowPracticeFallback !== false &&
      object.kind !== 'markdown' &&
      object.kind !== 'list' &&
      (object.kind === 'qa' || object.kind === 'quiz'),
  )
  let addedFallbackQa = flatHasQa
  let addedFallbackQuiz = flatHasQuiz
  const sourceObjects = [
    ...flatObjects,
    ...draftRecallObjects.filter((object) => {
      if (object.kind === 'qa') {
        if (addedFallbackQa) {
          return false
        }

        addedFallbackQa = true
        return true
      }

      if (object.kind === 'quiz') {
        if (addedFallbackQuiz) {
          return false
        }

        addedFallbackQuiz = true
        return true
      }

      return false
    }),
  ]
  const markdownObjects = ensureFirstMarkdown(
    sourceObjects.length > 0 ? sourceObjects : draft.objects,
    packId,
    title,
    buildRawNotesFromContract(
      title,
      summary,
      Array.isArray(contract.sourceSummary) ? contract.sourceSummary : [],
      Array.isArray(contract.concepts) ? contract.concepts : [],
    ) || rawNotes,
    events,
  )
  let keptMarkdown = false
  const finalObjects = markdownObjects
    .filter((object) => {
      if (object.kind === 'list') {
        return false
      }

      if (object.kind !== 'markdown') {
        return true
      }

      if (keptMarkdown) {
        events.push('Dropped extra Local AI markdown object.')
        return false
      }

      keptMarkdown = true
      return true
    })
    .slice(0, Math.max(targetCount, 6))

  if (finalObjects.length === 0 && !rawNotes) {
    return null
  }

  return {
    ...draft,
    title,
    summary,
    rawNotes,
    dashboardRole: role,
    sourceFormat: 'text',
    objects: finalObjects,
    debugTrace: draft.debugTrace
      ? {
          ...draft.debugTrace,
          rawDashboardInput: record,
          roleSanitizedInput: contract,
          validatedContract: contract,
          droppedOrRepairedItems: events,
          finalObjects,
        }
      : draft.debugTrace,
  }
}

const specificFolderName = (
  value: string,
  fallback: string,
  prompt: string,
): string => {
  const candidate = normalizeSpaces(value)
  if (candidate && !genericFolderNames.has(normalizeKey(candidate))) {
    return candidate
  }

  const languageLevel = prompt.match(
    /\b(english|spanish|french|german|italian|portuguese|japanese|korean|chinese|arabic|dutch|swedish|norwegian|danish|polish|russian)\s+(?:level\s+)?(a1|a2|b1|b2|c1|c2)\b/i,
  )
  if (languageLevel) {
    return `${titleValue(
      languageLevel[1],
      'Language',
    )} ${languageLevel[2].toUpperCase()}`
  }

  const fallbackCandidate = normalizeSpaces(fallback)
  if (
    fallbackCandidate &&
    !genericFolderNames.has(normalizeKey(fallbackCandidate))
  ) {
    return fallbackCandidate
  }

  return 'Local AI Study Path'
}

const fallbackPlannerItem = (
  options: GenerateStudyPathWithAiOptions,
  index: number,
): LocalStudyPathPlanItem => {
  const sections = [
    {
      title: `Key ideas ${index + 1}`,
      goal: `Explain the main ideas for ${options.title || 'this topic'}.`,
      focus: '',
    },
    {
      title: `Examples ${index + 1}`,
      goal: 'Show examples, usage, and common mistakes.',
      focus: '',
    },
  ]

  return {
    title: `${String(index + 1).padStart(2, '0')} - Lesson ${index + 1}`,
    goal: `Teach one useful part of ${options.title || 'this topic'}.`,
    sections,
    topics: sections.map((section) => section.title),
    avoid: ['summary-only dashboard', 'exercises-only dashboard'],
  }
}

const normalizePlannerSections = (
  value: unknown,
  fallback: LocalStudyPathPlanItem,
): LocalStudyPathPlanSection[] => {
  const rawSections = Array.isArray(value) ? value : []
  const sections = rawSections
    .map((item) => {
      const record =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {}
      const title = stringValue(record.title)
      const goal = stringValue(record.goal)
      const focus =
        stringValue(record.focus) ||
        stringArrayValue(record.seeds).slice(0, 3).join('; ')
      return title || goal
        ? { title: title || goal, goal: goal || title, focus }
        : null
    })
    .filter((section): section is LocalStudyPathPlanSection => Boolean(section))
    .slice(0, 2)

  const legacyTopics = fallback.topics.map((topic, index) => ({
    title: topic || fallback.sections[index]?.title || `Section ${index + 1}`,
    goal: topic || fallback.sections[index]?.goal || fallback.goal,
    focus: fallback.sections[index]?.focus || '',
  }))

  while (sections.length < 2) {
    sections.push(
      legacyTopics[sections.length] ||
        fallback.sections[sections.length] || {
          title: `Section ${sections.length + 1}`,
          goal: fallback.goal,
          focus: '',
        },
    )
  }

  return sections
}

const normalizePlannerItem = (
  value: unknown,
  options: GenerateStudyPathWithAiOptions,
  index: number,
): LocalStudyPathPlanItem => {
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const fallback = fallbackPlannerItem(options, index)
  const sections = normalizePlannerSections(record.sections, fallback)

  return {
    title:
      stringValue(record.title) ||
      `${String(index + 1).padStart(2, '0')} - Lesson ${index + 1}`,
    goal: stringValue(record.goal) || fallback.goal,
    sections,
    topics:
      stringArrayValue(record.topics).length > 0
        ? stringArrayValue(record.topics).slice(0, 5)
        : sections.map((section) => section.title),
    avoid:
      stringArrayValue(record.avoid).length > 0
        ? stringArrayValue(record.avoid).slice(0, 5)
        : stringValue(record.avoid)
          ? stringValue(record.avoid)
              .split(';')
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 5)
          : fallback.avoid,
  }
}

const normalizeLocalStudyPathPlan = (
  value: unknown,
  options: GenerateStudyPathWithAiOptions,
  expectedCount: number,
): { plan: LocalStudyPathPlan; warnings: string[] } => {
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const rawDashboards = Array.isArray(record.dashboards)
    ? record.dashboards
    : []
  const warnings: string[] = []
  const dashboards = rawDashboards
    .slice(0, expectedCount)
    .map((item, index) => normalizePlannerItem(item, options, index))

  if (rawDashboards.length > expectedCount) {
    warnings.push('Local AI planner returned extra dashboards; extras skipped.')
  }

  if (dashboards.length === 0) {
    throw new LocalAiGenerationError(
      'noUsableObjects',
      LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
      {
        debug: {
          parsedJson: value,
          mappingError: 'Local AI planner returned no usable dashboards.',
        },
      },
    )
  }

  while (dashboards.length < expectedCount) {
    dashboards.push(fallbackPlannerItem(options, dashboards.length))
  }

  if (rawDashboards.length > 0 && rawDashboards.length < expectedCount) {
    warnings.push(
      'Local AI planner returned too few dashboards; AquaMesh filled the missing lesson outlines.',
    )
  }

  return {
    plan: {
      title: stringValue(record.title) || options.title || 'Study Path',
      folderName: specificFolderName(
        stringValue(record.folderName),
        options.folderName || options.title,
        options.prompt,
      ),
      dashboards,
    },
    warnings,
  }
}

const parsePlannerJsonLeniently = (text: string): unknown => {
  const plannerString = (value: string): string =>
    value.replace(/\\"/g, '"').trim()
  const splitDashboardChunks = (candidate: string): string[] => {
    const matches = [
      ...candidate.matchAll(/\{\s*"title"\s*:\s*"\d{2}\s*-\s*[^"]+"/g),
    ]

    return matches.map((match, index) => {
      const start = match.index || 0
      const end =
        index + 1 < matches.length
          ? matches[index + 1].index || candidate.length
          : candidate.length
      return candidate.slice(start, end)
    })
  }
  const salvageDashboardChunks = (candidate: string): unknown[] => {
    const chunks = splitDashboardChunks(candidate)

    return chunks
      .map((chunk) => {
        const title = plannerString(
          chunk.match(/"title"\s*:\s*"([^"]+)"/)?.[1] || '',
        )
        const goal = plannerString(
          chunk.match(/"goal"\s*:\s*"([^"]+)"/)?.[1] || '',
        )
        const sectionMatches = [
          ...chunk.matchAll(
            /\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"goal"\s*:\s*"([^"]+)"\s*,\s*(?:"focus"\s*:\s*"([^"]*)"|"seeds"\s*:\s*\[([^\]]*)\])\s*\}/g,
          ),
        ]
        const sections = sectionMatches.slice(0, 2).map((sectionMatch) => {
          const focus =
            plannerString(sectionMatch[3] || '') ||
            [...(sectionMatch[4] || '').matchAll(/"([^"]+)"/g)]
              .map((seedMatch) => plannerString(seedMatch[1]))
              .slice(0, 3)
              .join('; ')

          return {
            title: plannerString(sectionMatch[1]),
            goal: plannerString(sectionMatch[2]),
            focus,
          }
        })
        const avoidString = plannerString(
          chunk.match(/"avoid"\s*:\s*"([^"]*)"/)?.[1] || '',
        )
        const avoidSource = chunk.match(/"avoid"\s*:\s*\[([^\]]*)\]/)?.[1] || ''
        const avoidFromString = avoidString
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 2)
        const avoid =
          avoidFromString.length > 0
            ? avoidFromString
            : [...avoidSource.matchAll(/"([^"]+)"/g)]
                .map((avoidMatch) => plannerString(avoidMatch[1]))
                .slice(0, 2)

        if (!title || !goal || sections.length === 0) {
          return null
        }

        return { title, goal, sections, avoid }
      })
      .filter(Boolean)
  }

  try {
    return parseLocalAiJson(text)
  } catch (error) {
    const trimmed = text.trim()
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
    const candidate = fenced || trimmed
    const salvagedDashboards = salvageDashboardChunks(candidate)
    if (salvagedDashboards.length > 0) {
      return {
        title: candidate.match(/"title"\s*:\s*"([^"]+)"/)?.[1],
        folderName: candidate.match(/"folderName"\s*:\s*"([^"]+)"/)?.[1],
        dashboards: salvagedDashboards,
      }
    }

    const dashboardMatches = [
      ...candidate.matchAll(
        /\{[^{}]*"title"\s*:\s*"[^"]+"[^{}]*"goal"\s*:\s*"[^"]+"[^{}]*(?:"topics"\s*:\s*\[[^\]]*\]|"sections"\s*:\s*\[[\s\S]*?\])[^{}]*\}/g,
      ),
    ]
    const dashboards = dashboardMatches
      .map((match) => {
        try {
          return JSON.parse(match[0])
        } catch {
          return null
        }
      })
      .filter(Boolean)

    if (dashboards.length === 0) {
      throw error
    }

    return {
      title: candidate.match(/"title"\s*:\s*"([^"]+)"/)?.[1],
      folderName: candidate.match(/"folderName"\s*:\s*"([^"]+)"/)?.[1],
      dashboards,
    }
  }
}

const createLocalStudyPathPlan = async (
  options: GenerateStudyPathWithAiOptions,
  expectedCount: number,
  localOptions: LocalGenerationOptions,
): Promise<{ plan: LocalStudyPathPlan; warnings: string[] }> => {
  const failedAttempts: LocalAiGenerationFailureDebug[] = []
  let lastError: LocalAiGenerationError | null = null

  for (
    let attempt = 1;
    attempt <= LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const promptText = localStudyPathPlannerPrompt(options, expectedCount)
    const debug: LocalAiGenerationFailureDebug = {
      dashboardCount: expectedCount,
      attempt,
      attemptCount: LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS,
      promptLength: promptText.length,
    }

    try {
      const text = await callLocalLanguageModel(promptText, {
        timeoutMs: LOCAL_STUDY_PATH_PLANNER_TIMEOUT_MS,
        onProgress: localOptions.onProgress,
        progressLabel: `Planning path, attempt ${attempt}/${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS}...`,
        attempt,
        attemptCount: LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS,
        studyPathStep: 'planner',
      })
      debug.rawResponse = text

      const parsed = parsePlannerJsonLeniently(text)
      debug.parsedJson = parsed
      return normalizeLocalStudyPathPlan(parsed, options, expectedCount)
    } catch (error) {
      const localError = createLocalAiErrorFromUnknown(error, debug)
      lastError = localError
      failedAttempts.push(localError.debug || debug)

      if (
        !localAiStudyPathFailureIsRetryable(localError) ||
        attempt === LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS
      ) {
        throw new LocalAiGenerationError(localError.code, localError.message, {
          debug: withAttemptDebug(localError.debug || debug, failedAttempts),
          cause: localError.cause,
        })
      }

      await waitForLocalAiRetryCooldown(localError)
    }
  }

  throw new LocalAiGenerationError(
    lastError?.code || 'noUsableObjects',
    lastError?.message || LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
    {
      debug: withAttemptDebug(lastError?.debug || {}, failedAttempts),
      cause: lastError?.cause,
    },
  )
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const localAiFailureCodeForError = (
  error: unknown,
): LocalAiGenerationFailureCode => {
  const message = errorMessage(error)
  if (/timed out|timeout|cooling down/i.test(message)) {
    return 'timeout'
  }

  if (/not supported/i.test(message)) {
    return 'unsupported'
  }

  if (/unavailable|busy or unstable/i.test(message)) {
    return 'unavailable'
  }

  return 'unknown'
}

const localAiFailureMessageForCode = (
  code: LocalAiGenerationFailureCode,
  fallback: string,
): string => {
  if (code === 'timeout') {
    return LOCAL_STUDY_PATH_TIMEOUT_MESSAGE
  }

  return fallback
}

const localAiStudyPathFailureIsRetryable = (
  error: LocalAiGenerationError,
): boolean =>
  error.code === 'invalidJson' ||
  error.code === 'mappingError' ||
  error.code === 'noUsableObjects' ||
  error.code === 'timeout'

const waitForLocalAiRetryCooldown = async (
  error: LocalAiGenerationError,
): Promise<void> => {
  if (error.code !== 'timeout') {
    return
  }

  await new Promise((resolve) =>
    window.setTimeout(resolve, LOCAL_AI_RETRY_COOLDOWN_MS),
  )
}

const hasUsableMappedWidgets = (
  dashboard: AiStudyPathDashboardDraft | null,
): dashboard is AiStudyPathDashboardDraft => {
  if (!dashboard || dashboard.objects.length === 0) {
    return false
  }

  if (
    !dashboard.objects.some(
      (object) => object.kind === 'qa' || object.kind === 'quiz',
    )
  ) {
    return false
  }

  return dashboard.objects.some((object) => {
    if (object.kind === 'markdown') {
      const content = normalizeSpaces(object.markdown.replace(/^#+\s*/gm, ''))
      return content.split(/\s+/).filter(Boolean).length >= 5
    }

    return true
  })
}

const hasUsableMarkdownNotes = (
  dashboard: AiStudyPathDashboardDraft | null,
): dashboard is AiStudyPathDashboardDraft =>
  Boolean(
    dashboard?.objects.some((object) => {
      if (object.kind !== 'markdown') {
        return false
      }

      const content = normalizeSpaces(object.markdown.replace(/^#+\s*/gm, ''))
      return content.split(/\s+/).filter(Boolean).length >= 10
    }),
  )

const logLocalDashboardError = (
  debug: LocalAiGenerationFailureDebug,
  error: unknown,
): void => {
  console.debug('[AquaMesh Local AI] dashboard:error', {
    dashboardIndex: debug.dashboardIndex,
    dashboardCount: debug.dashboardCount,
    attempt: debug.attempt,
    attemptCount: debug.attemptCount,
    promptLength: debug.promptLength,
    rawResponse: debug.rawResponse,
    parsedJson: debug.parsedJson,
    parseError: debug.parseError,
    mappingError: debug.mappingError,
    droppedOrRepairedItems: debug.droppedOrRepairedItems,
    message: errorMessage(error),
  })
}

const withAttemptDebug = (
  debug: LocalAiGenerationFailureDebug,
  attempts: LocalAiGenerationFailureDebug[],
): LocalAiGenerationFailureDebug => ({
  ...debug,
  attempts: attempts.map((attempt) => ({ ...attempt })),
})

const normalizeLocalStudyPathConcurrency = (
  value: LocalGenerationOptions['dashboardConcurrency'],
): 1 | 2 | 3 | 5 => (value === 1 || value === 3 || value === 5 ? value : 2)

interface LocalDashboardGenerationResult {
  index: number
  dashboard: AiStudyPathDashboardDraft | null
  warning?: string
  error?: LocalAiGenerationError
}

interface LocalStudyPathNotesResult {
  title: string
  notes: string
  rawResponse: string
  failedAttempts: LocalAiGenerationFailureDebug[]
  repairEvents: string[]
}

interface LocalStudyPathPracticeResult {
  record: Record<string, unknown> | null
  rawResponse?: string
  failedAttempts: LocalAiGenerationFailureDebug[]
  error?: LocalAiGenerationError
}

type LocalDashboardProgressState = {
  status: 'pending' | 'running' | 'complete' | 'failed'
  attempt?: number
  attemptCount?: number
  percent?: number
  step?: LocalAiProgressEvent['studyPathStep']
}

const localDashboardProgressStepLabel = (
  step: LocalAiProgressEvent['studyPathStep'],
): string => {
  if (step === 'markdown1') {
    return 'Markdown part 1'
  }

  if (step === 'markdown2') {
    return 'Markdown part 2'
  }

  if (step === 'practice') {
    return 'Practice'
  }

  return 'Notes'
}

const renderLocalDashboardProgressLabel = (
  states: LocalDashboardProgressState[],
): string => {
  const completedCount = states.filter(
    (state) => state.status === 'complete',
  ).length
  if (completedCount === states.length) {
    return `Generated ${completedCount} of ${states.length} dashboards`
  }

  return `Generating ${completedCount} of ${states.length} dashboards`
}

const renderLocalDashboardThreadLabel = (
  state: LocalDashboardProgressState,
  index: number,
  dashboardCount: number,
): string => {
  const position = `${index + 1}/${dashboardCount}`
  if (state.status === 'running') {
    return `${localDashboardProgressStepLabel(
      state.step,
    )} for dashboard ${position}, attempt ${state.attempt || 1}/${
      state.attemptCount || LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS
    }`
  }

  if (state.status === 'complete') {
    return `Dashboard ${position} complete`
  }

  if (state.status === 'failed') {
    return `Dashboard ${position} failed`
  }

  return `Dashboard ${position} waiting`
}

const createLocalDashboardProgressTracker = (
  expectedCount: number,
  onProgress?: (event: LocalAiProgressEvent) => void,
) => {
  const states: LocalDashboardProgressState[] = Array.from(
    { length: expectedCount },
    () => ({ status: 'pending' }),
  )

  const emit = (timeoutMs?: number) => {
    if (!onProgress) {
      return
    }

    const progressUnits = states.reduce((total, state) => {
      if (state.status === 'complete' || state.status === 'failed') {
        return total + 1
      }

      if (state.status === 'running') {
        return total + Math.min(0.99, Math.max(0, (state.percent || 0) / 100))
      }

      return total
    }, 0)

    onProgress({
      phase: 'generation',
      percent: Math.max(
        0,
        Math.min(99, Math.round((progressUnits / expectedCount) * 100)),
      ),
      label: renderLocalDashboardProgressLabel(states),
      dashboardCount: expectedCount,
      timeoutMs,
      dashboardProgress: states.map((state, index) => ({
        dashboardIndex: index + 1,
        dashboardCount: expectedCount,
        status: state.status,
        label: renderLocalDashboardThreadLabel(state, index, expectedCount),
        percent:
          state.status === 'complete' || state.status === 'failed'
            ? 100
            : Math.max(0, Math.min(99, Math.round(state.percent || 0))),
        attempt: state.attempt,
        attemptCount: state.attemptCount,
        studyPathStep: state.step,
      })),
    })
  }

  return {
    handleDashboardProgress: (
      index: number,
      event: LocalAiProgressEvent,
    ): void => {
      if (event.phase !== 'generation') {
        return
      }

      states[index] = {
        status: 'running',
        attempt: event.attempt,
        attemptCount: event.attemptCount,
        percent: event.percent,
        step: event.studyPathStep,
      }
      emit(event.timeoutMs)
    },
    markFinished: (
      index: number,
      status: 'complete' | 'failed',
      timeoutMs?: number,
    ): void => {
      states[index] = { ...states[index], status, percent: 100 }
      emit(timeoutMs)
    },
  }
}

const parseLocalStudyPathObject = (
  text: string,
  debug: LocalAiGenerationFailureDebug,
): Record<string, unknown> => {
  if (localAiJsonLooksTruncated(text)) {
    throw new Error(
      'Google Local AI returned truncated JSON before the final closing brace.',
    )
  }

  const parsed = parseLocalAiJson(text)
  debug.parsedJson = parsed
  return parsed && typeof parsed === 'object'
    ? (parsed as Record<string, unknown>)
    : {}
}

const localStudyPathMarkdownWordBounds = (
  attempt: number,
): { min: number } => {
  if (attempt === 1) {
    return { min: 40 }
  }

  if (attempt === 2) {
    return { min: 30 }
  }

  return { min: 20 }
}

const createLocalAiErrorFromUnknown = (
  error: unknown,
  debug: LocalAiGenerationFailureDebug,
): LocalAiGenerationError => {
  if (isLocalAiGenerationError(error)) {
    return new LocalAiGenerationError(error.code, error.message, {
      debug: { ...debug, ...error.debug },
      cause: error.cause,
    })
  }

  return new LocalAiGenerationError(
    /invalid JSON|Unexpected|truncated JSON/i.test(errorMessage(error))
      ? 'invalidJson'
      : localAiFailureCodeForError(error),
    /invalid JSON|Unexpected|truncated JSON/i.test(errorMessage(error))
      ? LOCAL_STUDY_PATH_INVALID_JSON_MESSAGE
      : localAiFailureMessageForCode(
          localAiFailureCodeForError(error),
          errorMessage(error),
        ),
    {
      debug: {
        ...debug,
        parseError: /invalid JSON|Unexpected|truncated JSON/i.test(
          errorMessage(error),
        )
          ? errorMessage(error)
          : undefined,
      },
      cause: error,
    },
  )
}

const generateLocalStudyPathMarkdownSection = async (
  index: number,
  sectionIndex: number,
  options: GenerateStudyPathWithAiOptions,
  plan: LocalStudyPathPlan,
  expectedCount: number,
  localOptions: LocalGenerationOptions,
): Promise<{
  markdown: string
  rawResponse: string
  failedAttempts: LocalAiGenerationFailureDebug[]
}> => {
  const plannerItem = plan.dashboards[index]
  const section = plannerItem.sections[sectionIndex]
  const requiredHeading = `## ${section.title}`
  const failedAttempts: LocalAiGenerationFailureDebug[] = []
  let lastError: LocalAiGenerationError | null = null

  for (
    let attempt = 1;
    attempt <= LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const promptText = localStudyPathMarkdownSectionPrompt(
      options,
      plan.dashboards,
      plannerItem,
      section,
      sectionIndex,
      attempt,
    )
    const debug: LocalAiGenerationFailureDebug = {
      dashboardIndex: index + 1,
      dashboardCount: expectedCount,
      attempt,
      attemptCount: LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS,
      promptLength: promptText.length,
    }

    try {
      const text = await callLocalLanguageModel(promptText, {
        timeoutMs: LOCAL_STUDY_PATH_NOTES_TIMEOUT_MS,
        onProgress: localOptions.onProgress,
        progressLabel: `Generating Markdown part ${
          sectionIndex + 1
        } for dashboard ${
          index + 1
        }/${expectedCount}, attempt ${attempt}/${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS}...`,
        dashboardIndex: index + 1,
        dashboardCount: expectedCount,
        attempt,
        attemptCount: LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS,
        studyPathStep: sectionIndex === 0 ? 'markdown1' : 'markdown2',
      })
      debug.rawResponse = text
      const markdown = cleanLocalStudyPathSectionMarkdown(text, requiredHeading)
      const count = wordCount(markdown.replace(/^#+\s*/gm, ''))
      const bounds = localStudyPathMarkdownWordBounds(attempt)
      // Only reject on bound min too many words is never a problem.
      if (count < bounds.min) {
        throw new LocalAiGenerationError(
          'noUsableObjects',
          LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
          {
            debug: {
              ...debug,
              mappingError: `Local AI Markdown section word count ${count} was lower than ${bounds.min}.`,
            },
          },
        )
      }

      return { markdown, rawResponse: text, failedAttempts }
    } catch (error) {
      const localError = createLocalAiErrorFromUnknown(error, debug)
      lastError = localError
      failedAttempts.push(localError.debug || debug)

      if (
        !localAiStudyPathFailureIsRetryable(localError) ||
        attempt === LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS
      ) {
        logLocalDashboardError(localError.debug || debug, localError)
        break
      }

      await waitForLocalAiRetryCooldown(localError)
    }
  }

  const debug = withAttemptDebug(
    lastError?.debug || {
      dashboardIndex: index + 1,
      dashboardCount: expectedCount,
    },
    failedAttempts,
  )
  throw new LocalAiGenerationError(
    lastError?.code || 'noUsableObjects',
    lastError?.message || LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
    { debug, cause: lastError?.cause },
  )
}

const generateLocalStudyPathNotes = async (
  index: number,
  options: GenerateStudyPathWithAiOptions,
  plan: LocalStudyPathPlan,
  expectedCount: number,
  localOptions: LocalGenerationOptions,
): Promise<LocalStudyPathNotesResult> => {
  const plannerItem = plan.dashboards[index]
  const sectionOne = await generateLocalStudyPathMarkdownSection(
    index,
    0,
    options,
    plan,
    expectedCount,
    localOptions,
  )
  const sectionTwo = await generateLocalStudyPathMarkdownSection(
    index,
    1,
    options,
    plan,
    expectedCount,
    localOptions,
  )
  const notes = [
    `# ${plannerItem.title}`,
    sectionOne.markdown.trim(),
    sectionTwo.markdown.trim(),
  ].join('\n\n')

  return {
    title: plannerItem.title,
    notes: stripLocalPracticeSectionsFromNotes(notes),
    rawResponse: JSON.stringify(
      {
        sectionOneResponse: sectionOne.rawResponse,
        sectionTwoResponse: sectionTwo.rawResponse,
      },
      null,
      2,
    ),
    failedAttempts: [
      ...sectionOne.failedAttempts,
      ...sectionTwo.failedAttempts,
    ],
    repairEvents: [],
  }
}

const generateLocalStudyPathPractice = async (
  index: number,
  options: GenerateStudyPathWithAiOptions,
  plan: LocalStudyPathPlan,
  notes: string,
  expectedCount: number,
  localOptions: LocalGenerationOptions,
): Promise<LocalStudyPathPracticeResult> => {
  const plannerItem = plan.dashboards[index]
  const failedAttempts: LocalAiGenerationFailureDebug[] = []
  let lastError: LocalAiGenerationError | null = null

  for (
    let attempt = 1;
    attempt <= LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const promptText = localStudyPathPracticePrompt(
      options,
      plan.dashboards,
      plannerItem,
      notes,
      attempt,
    )
    const debug: LocalAiGenerationFailureDebug = {
      dashboardIndex: index + 1,
      dashboardCount: expectedCount,
      attempt,
      attemptCount: LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS,
      promptLength: promptText.length,
    }

    try {
      const text = await callLocalLanguageModel(promptText, {
        timeoutMs: LOCAL_STUDY_PATH_PRACTICE_TIMEOUT_MS,
        onProgress: localOptions.onProgress,
        progressLabel: `Generating practice for dashboard ${
          index + 1
        }/${expectedCount}, attempt ${attempt}/${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS}...`,
        dashboardIndex: index + 1,
        dashboardCount: expectedCount,
        attempt,
        attemptCount: LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS,
        studyPathStep: 'practice',
      })
      debug.rawResponse = text
      const record = parseLocalStudyPathObject(text, debug)
      const flashcards = Array.isArray(record.flashcards)
        ? record.flashcards.flatMap((item, itemIndex) =>
            flashcardFromRecord(item, itemIndex, []),
          )
        : []
      if (flashcards.length === 0) {
        throw new LocalAiGenerationError(
          'noUsableObjects',
          LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
          {
            debug: {
              ...debug,
              mappingError: 'Local AI practice returned no usable flashcards.',
            },
          },
        )
      }

      return {
        record,
        rawResponse: text,
        failedAttempts,
      }
    } catch (error) {
      const localError = isLocalAiGenerationError(error)
        ? error
        : new LocalAiGenerationError(
            /invalid JSON|Unexpected|truncated JSON/i.test(errorMessage(error))
              ? 'invalidJson'
              : localAiFailureCodeForError(error),
            /invalid JSON|Unexpected|truncated JSON/i.test(errorMessage(error))
              ? LOCAL_STUDY_PATH_INVALID_JSON_MESSAGE
              : localAiFailureMessageForCode(
                  localAiFailureCodeForError(error),
                  errorMessage(error),
                ),
            {
              debug: {
                ...debug,
                parseError: /invalid JSON|Unexpected|truncated JSON/i.test(
                  errorMessage(error),
                )
                  ? errorMessage(error)
                  : undefined,
              },
              cause: error,
            },
          )
      lastError = localError
      failedAttempts.push(localError.debug || debug)

      if (
        !localAiStudyPathFailureIsRetryable(localError) ||
        attempt === LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS
      ) {
        logLocalDashboardError(localError.debug || debug, localError)
        break
      }

      await waitForLocalAiRetryCooldown(localError)
    }
  }

  return {
    record: null,
    failedAttempts,
    error: lastError || undefined,
  }
}

const generateLocalStudyPathDashboard = async (
  index: number,
  options: GenerateStudyPathWithAiOptions,
  plan: LocalStudyPathPlan,
  expectedCount: number,
  targetCount: number,
  localOptions: LocalGenerationOptions,
): Promise<LocalDashboardGenerationResult> => {
  const plannerItem = plan.dashboards[index]

  try {
    const notesResult = await generateLocalStudyPathNotes(
      index,
      options,
      plan,
      expectedCount,
      localOptions,
    )
    const practiceResult = await generateLocalStudyPathPractice(
      index,
      options,
      plan,
      notesResult.notes,
      expectedCount,
      localOptions,
    )
    const practiceRecord = practiceResult.record || {}
    const combinedRecord = {
      ...practiceRecord,
      title: notesResult.title || plannerItem.title,
      notes: notesResult.notes,
      rawNotes: notesResult.notes,
    }
    const rawAiResponse = JSON.stringify(
      {
        notesResponse: notesResult.rawResponse,
        practiceResponse: practiceResult.rawResponse || '',
      },
      null,
      2,
    )
    const mappedDashboard = mapLocalDashboard(
      combinedRecord,
      index,
      options,
      rawAiResponse,
      'normal',
      targetCount,
      plannerItem,
      { allowPracticeFallback: Boolean(practiceResult.record) },
    )

    const dashboardIsUsable = practiceResult.record
      ? hasUsableMappedWidgets(mappedDashboard)
      : hasUsableMarkdownNotes(mappedDashboard)

    if (!mappedDashboard || !dashboardIsUsable) {
      throw new LocalAiGenerationError(
        'noUsableObjects',
        LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
        {
          debug: {
            dashboardIndex: index + 1,
            dashboardCount: expectedCount,
            rawResponse: rawAiResponse,
            parsedJson: combinedRecord,
            mappingError: 'No usable Study Path widgets were produced.',
            droppedOrRepairedItems:
              mappedDashboard?.debugTrace?.droppedOrRepairedItems || [],
          },
        },
      )
    }

    if (notesResult.repairEvents.length > 0 && mappedDashboard.debugTrace) {
      mappedDashboard.debugTrace.droppedOrRepairedItems = [
        ...(mappedDashboard.debugTrace.droppedOrRepairedItems || []),
        ...notesResult.repairEvents,
      ]
    }

    const failedAttempts = [
      ...notesResult.failedAttempts,
      ...practiceResult.failedAttempts,
    ]
    if (failedAttempts.length > 0 && mappedDashboard.debugTrace) {
      mappedDashboard.debugTrace.localAiFailedAttempts = failedAttempts
    }

    const warning = practiceResult.record
      ? undefined
      : `Dashboard ${
          index + 1
        } kept lesson notes, but Local AI practice widgets failed after ${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS} attempts.`

    return { index, dashboard: mappedDashboard, warning }
  } catch (error) {
    const localError = isLocalAiGenerationError(error)
      ? error
      : new LocalAiGenerationError(
          localAiFailureCodeForError(error),
          localAiFailureMessageForCode(
            localAiFailureCodeForError(error),
            errorMessage(error),
          ),
          {
            debug: {
              dashboardIndex: index + 1,
              dashboardCount: expectedCount,
            },
            cause: error,
          },
        )
    const debug = withAttemptDebug(localError.debug || {}, [
      ...(localError.debug?.attempts || []),
    ])

    return {
      index,
      dashboard: null,
      error: new LocalAiGenerationError(localError.code, localError.message, {
        debug,
        cause: localError.cause,
      }),
      warning: `Dashboard ${
        index + 1
      } could not be generated after ${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS} Local AI attempts and was skipped.`,
    }
  }
}

const runLocalDashboardJobs = async (
  expectedCount: number,
  concurrency: number,
  runJob: (
    index: number,
    onProgress: (event: LocalAiProgressEvent) => void,
  ) => Promise<LocalDashboardGenerationResult>,
  progressTracker: ReturnType<typeof createLocalDashboardProgressTracker>,
): Promise<LocalDashboardGenerationResult[]> => {
  const results: LocalDashboardGenerationResult[] = []
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < expectedCount) {
      const index = nextIndex
      nextIndex += 1
      const result = await runJob(index, (event) =>
        progressTracker.handleDashboardProgress(index, event),
      )
      results.push(result)
      progressTracker.markFinished(
        index,
        result.dashboard ? 'complete' : 'failed',
        LOCAL_STUDY_PATH_PRACTICE_TIMEOUT_MS,
      )
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, expectedCount) }, () =>
      worker(),
    ),
  )

  return results.sort((a, b) => a.index - b.index)
}

export const generateStudyPathWithLocalAi = async (
  options: GenerateStudyPathWithAiOptions,
  localOptions: LocalGenerationOptions = {},
): Promise<AiStudyPathDraft> => {
  if (normalizeStudyPathGenerationAmount(options.generationAmount) === 'deep') {
    throw new Error(LOCAL_DEEP_BLOCKED_MESSAGE)
  }

  const expectedCount = getLocalStudyPathDashboardCount(
    options.generationAmount,
  )
  const { plan, warnings: plannerWarnings } = await createLocalStudyPathPlan(
    options,
    expectedCount,
    localOptions,
  )
  const targetCount = 4
  const warnings: string[] = [...plannerWarnings]
  const concurrency = normalizeLocalStudyPathConcurrency(
    localOptions.dashboardConcurrency,
  )
  const progressTracker = createLocalDashboardProgressTracker(
    expectedCount,
    localOptions.onProgress,
  )
  const results = await runLocalDashboardJobs(
    expectedCount,
    concurrency,
    (index, onProgress) =>
      generateLocalStudyPathDashboard(
        index,
        options,
        plan,
        expectedCount,
        targetCount,
        {
          ...localOptions,
          onProgress,
        },
      ),
    progressTracker,
  )
  const dashboards = results
    .map((result) => result.dashboard)
    .filter((dashboard): dashboard is AiStudyPathDashboardDraft =>
      Boolean(dashboard),
    )

  results.forEach((result) => {
    if (result.warning) {
      warnings.push(result.warning)
    }
  })

  if (dashboards.length === 0) {
    const error = results.find((result) => result.error)?.error
    if (error) {
      throw error
    }

    throw new Error(
      'Google Local AI did not return usable Study Path dashboards.',
    )
  }

  return {
    title: plan.title || options.title,
    folderName: plan.folderName,
    dashboards,
    warnings: [
      ...warnings,
      expectedCount > 2
        ? `Google Local AI generated this path with up to ${concurrency} dashboards at a time.`
        : `Google Local AI generated this Super small path with up to ${concurrency} dashboards at a time.`,
    ],
  }
}

const fallbackPromptForDashboard = (
  prompt: string,
  index: number,
  count: number,
  role: StudyPathDashboardRole,
): string => {
  if (role === 'exercises') {
    return `# Mixed Practice\n\nUse these notes to review the whole path:\n\n${prompt}`
  }

  if (role === 'summary') {
    return `# Summary\n\nReview these key ideas from the path:\n\n${prompt}`
  }

  return `# Lesson ${index + 1} of ${count}\n\n${prompt}`
}

export const generateStudyPathWithBasicFallback = ({
  title,
  prompt,
  folderName,
  generationAmount = 'compact',
}: GenerateStudyPathWithAiOptions): AiStudyPathDraft => {
  const roles = getStudyPathDashboardRoles(generationAmount)
  const practiceAmount =
    normalizeStudyPathGenerationAmount(generationAmount) === 'deep'
      ? 'many'
      : normalizeStudyPathGenerationAmount(generationAmount) === 'average'
        ? 'medium'
        : 'few'
  const dashboards = roles.map((role, index) => {
    const dashboardTitle = `${String(index + 1).padStart(2, '0')} - ${
      role === 'summary'
        ? 'Summary'
        : role === 'exercises'
          ? 'Exercises'
          : `Lesson ${index + 1}`
    }`
    const rawNotes = fallbackPromptForDashboard(
      prompt,
      index,
      roles.length,
      role,
    )
    const parsed = parseStudyPack(rawNotes, {
      title: dashboardTitle,
      defaultTags: ['study-pack'],
    })
    const profile = createStudyPackPracticeProfile(practiceAmount, [
      'quizzes',
      'flashcards',
      'summaries',
      'definitions',
      'reviewPrompts',
      'lists',
    ])
    const augmented = augmentStudyPackPracticeObjects(parsed.objects, {
      packId: parsed.id,
      title: parsed.title,
      rawNotes,
      generationTargets: [
        'quizzes',
        'flashcards',
        'summaries',
        'definitions',
        'reviewPrompts',
        'lists',
      ],
      generationAmount: practiceAmount,
      visiblePracticeTarget: Math.max(3, profile.minTotal - 1),
      visiblePracticeOnly: role === 'exercises',
    })

    return {
      title: dashboardTitle,
      summary:
        role === 'exercises'
          ? 'Practice generated from the Study Path source.'
          : 'Basic fallback lesson generated from the request.',
      rawNotes,
      dashboardRole: role,
      sourceFormat: parsed.sourceFormat,
      objects: augmented.objects,
      warnings: [...parsed.warnings, ...augmented.warnings],
    }
  })

  return {
    title: title || 'Study Path',
    folderName: folderName || title || 'Study Path',
    dashboards,
    warnings: ['Basic fallback used local parsing and practice generation.'],
  }
}

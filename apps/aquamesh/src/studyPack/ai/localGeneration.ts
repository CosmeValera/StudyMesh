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
  smokeTestLocalLanguageModel,
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
const LOCAL_STUDY_PATH_DASHBOARD_TIMEOUT_MS = 150 * 1000
const LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS = 3
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
  'it',
  'concepts',
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
  const options = uniqueByKey(rawOptions, (option) => option).slice(0, 4)
  const correctIndex = options.findIndex(
    (option) => normalizeKey(option) === normalizeKey(originalAnswer),
  )
  const answer =
    originalAnswer ||
    (rawCorrectIndex >= 0 && rawCorrectIndex < options.length
      ? options[rawCorrectIndex]
      : options[0] || '')
  const finalCorrectIndex =
    correctIndex >= 0
      ? correctIndex
      : options.findIndex(
          (option) => normalizeKey(option) === normalizeKey(answer),
        )

  if (rawOptions.length !== options.length) {
    events.push(`Repaired quiz ${index + 1}: removed duplicate options.`)
  }

  if (isBadLocalText(question)) {
    events.push(`Dropped quiz ${index + 1}: generic or weak question.`)
    return null
  }

  if (options.length > 0 && options.length < 3) {
    events.push(`Dropped quiz ${index + 1}: fewer than 3 unique options.`)
    return null
  }

  if (!question || !answer) {
    events.push(`Dropped quiz ${index + 1}: missing question or answer.`)
    return null
  }

  return {
    question,
    options,
    correctIndex: finalCorrectIndex >= 0 ? finalCorrectIndex : 0,
    answer,
    explanation: stringValue(input.explanation),
  }
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
      ? `## Source summary\n${sourceSummary.map((item) => `- ${item}`).join('\n')}`
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
    flashcards: (Array.isArray(record.flashcards) ? record.flashcards : [])
      .map((item, index): LocalFlashcardContract | null => {
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
        if (!question || !answer || isBadLocalText(question)) {
          events.push(`Dropped flashcard ${index + 1}: weak prompt.`)
          return null
        }

        return { question, answer }
      })
      .filter((flashcard): flashcard is LocalFlashcardContract =>
        Boolean(flashcard),
      ),
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
{"title":"${title.replace(/"/g, '')}","objects":[{"kind":"markdown","title":"Explanation","markdown":"2-4 short sentences"},{"kind":"qa","question":"...","answer":"..."},{"kind":"qa","question":"...","answer":"..."},{"kind":"quiz","question":"...","quizMode":"multipleChoice","options":["A","B","C"],"correctIndex":0,"answer":"A","explanation":"why"},{"kind":"quiz","question":"...","quizMode":"multipleChoice","options":["A","B","C"],"correctIndex":0,"answer":"A","explanation":"why"},{"kind":"list","title":"Key points","items":["...","...","..."]}]}
Rules: exactly 6 objects. First object markdown. No vague questions. No target rule, formation rule, What rule does, How do you form, What do the notes say.
Input: ${promptMode ? 'learning goal' : 'source notes'}
${compactNotes}`
}

const localStudyPathDashboardPrompt = (
  {
    title,
    prompt,
    generationAmount: _generationAmount,
  }: GenerateStudyPathWithAiOptions,
  index: number,
  count: number,
): string => {
  const compactPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 1800)
  const lessonHint =
    count === 2
      ? index === 0
        ? 'first focused lesson'
        : 'second practice-oriented lesson'
      : `lesson ${index + 1}`
  return `Return minified JSON only. End with }.
Create dashboard ${index + 1} of ${count} for "${title}" (${lessonHint}).
Shape:
{"title":"${String(index + 1).padStart(2, '0')} - Lesson","notes":"Markdown notes, 70-110 words","flashcards":[{"question":"...","answer":"..."},{"question":"...","answer":"..."}],"quizzes":[{"question":"...","options":["...","...","..."],"correctIndex":0}]}
Rules: small valid JSON only. No summary field. No listItems. No objects array. No nested objects except flashcards[] and quizzes[]. No markdown fences. No vague questions. No target rule, formation rule, What rule does, How do you form, What do the notes say.
Write notes as compact Markdown: optional short heading plus bullets or short paragraphs. Include the minimum theory needed to answer every flashcard and quiz.
Make flashcards and quizzes directly answerable from notes.
For language learning, generate useful grammar/vocabulary/practice topics appropriate to the requested language and level.
Introductions are appropriate only when no level is given or the request is beginner-level. Otherwise use level-appropriate grammar, vocabulary, realistic situations, and practice.
User topic:
${compactPrompt}`
}

const localStudyPathDashboardRetryPrompt = (
  options: GenerateStudyPathWithAiOptions,
  index: number,
  count: number,
  attempt: number,
): string => {
  const compactPrompt = options.prompt.replace(/\s+/g, ' ').trim().slice(0, 900)

  return `Return one tiny minified JSON object only. End with }.
Retry attempt ${attempt} of ${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS} for dashboard ${index + 1} of ${count} for "${options.title}".
Use exactly these fields:
{"title":"${String(index + 1).padStart(2, '0')} - Lesson","notes":"50-80 words","flashcards":[{"question":"...","answer":"..."}],"quizzes":[{"question":"...","options":["A","B","C"],"correctIndex":0}]}
Prioritize valid JSON over rich content. No summary. No listItems. No objects array. No nested objects except flashcards[] and quizzes[]. No extra fields. No prose outside JSON. No code fence.
Notes can be plain text. Flashcards and quizzes must be answerable from notes.
Topic:
${compactPrompt}`
}

export const generateStudyPackWithLocalAi = async (
  options: GenerateStudyPackWithAiOptions,
  localOptions: LocalGenerationOptions = {},
): Promise<AiStudyPackDraft> => {
  await smokeTestLocalLanguageModel({ onProgress: localOptions.onProgress })
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

const roleForIndex = (
  roles: StudyPathDashboardRole[],
  index: number,
): StudyPathDashboardRole => roles[index] || 'normal'

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
    return objects
  }

  const existingMarkdown = firstMarkdownObject(objects)
  const otherObjects = objects.filter((object) => object !== existingMarkdown)
  const markdownObject =
    existingMarkdown ||
    ({
      ...createBase(packId, 'markdown', 0, 'Lesson explanation'),
      kind: 'markdown',
      markdown: markdown || `# ${title}\n\nReview this lesson before practice.`,
    } as StudyObject)

  if (!existingMarkdown) {
    events.push('Repaired dashboard: added first markdown explanation.')
  }

  return [markdownObject, ...otherObjects]
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
      ...createBase(packId, 'markdown', 0, 'Explanation'),
      kind: 'markdown',
      markdown: markdown || rawNotes || `# ${title}`,
    })
  }

  const flashcards = Array.isArray(record.flashcards) ? record.flashcards : []
  flashcards.slice(0, 4).forEach((item, index) => {
    const input =
      item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const question =
      stringValue(input.question) ||
      stringValue(input.front) ||
      stringValue(input.prompt)
    const answer =
      stringValue(input.answer) ||
      stringValue(input.back) ||
      stringValue(input.definition)

    if (!question || !answer || isBadLocalText(question)) {
      events.push(`Dropped flashcard ${index + 1}: weak or incomplete card.`)
      return
    }

    objects.push({
      ...createBase(packId, 'qa', index, `Flashcard ${index + 1}`),
      kind: 'qa',
      question,
      answer,
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
    const quiz = repairLocalQuiz(input, index, events)
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
): AiStudyPathDashboardDraft | null => {
  const record =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const title =
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
  const flatHasRecall = flatObjects.some(
    (object) => object.kind === 'qa' || object.kind === 'quiz',
  )
  const sourceObjects = flatHasRecall
    ? flatObjects
    : [
        ...flatObjects,
        ...draft.objects.filter(
          (object) =>
            object.kind !== 'markdown' &&
            object.kind !== 'list' &&
            (object.kind === 'qa' || object.kind === 'quiz'),
        ),
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
  const finalObjects = markdownObjects
    .filter((object) => object.kind !== 'list')
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
    return `${titleValue(languageLevel[1], 'Language')} ${languageLevel[2].toUpperCase()}`
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

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const localAiFailureCodeForError = (
  error: unknown,
): LocalAiGenerationFailureCode => {
  const message = errorMessage(error)
  if (/timed out|timeout/i.test(message)) {
    return 'timeout'
  }

  if (/not supported/i.test(message)) {
    return 'unsupported'
  }

  if (/unavailable|cooling down|busy or unstable/i.test(message)) {
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
  error.code === 'noUsableObjects'

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

export const generateStudyPathWithLocalAi = async (
  options: GenerateStudyPathWithAiOptions,
  localOptions: LocalGenerationOptions = {},
): Promise<AiStudyPathDraft> => {
  if (normalizeStudyPathGenerationAmount(options.generationAmount) === 'deep') {
    throw new Error(LOCAL_DEEP_BLOCKED_MESSAGE)
  }

  await smokeTestLocalLanguageModel({ onProgress: localOptions.onProgress })
  const expectedCount = getLocalStudyPathDashboardCount(
    options.generationAmount,
  )
  const roles = getStudyPathDashboardRoles(options.generationAmount).slice(
    0,
    expectedCount,
  )
  const targetCount = 4
  const dashboards: AiStudyPathDashboardDraft[] = []
  const warnings: string[] = []

  for (let index = 0; index < expectedCount; index += 1) {
    const failedAttempts: LocalAiGenerationFailureDebug[] = []
    let lastError: LocalAiGenerationError | null = null

    for (
      let attempt = 1;
      attempt <= LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const promptText =
        attempt === 1
          ? localStudyPathDashboardPrompt(options, index, expectedCount)
          : localStudyPathDashboardRetryPrompt(
              options,
              index,
              expectedCount,
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
          timeoutMs: LOCAL_STUDY_PATH_DASHBOARD_TIMEOUT_MS,
          onProgress: localOptions.onProgress,
          progressLabel: `Generating dashboard ${index + 1} of ${expectedCount}, attempt ${attempt} of ${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS}...`,
          dashboardIndex: index + 1,
          dashboardCount: expectedCount,
          attempt,
          attemptCount: LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS,
        })
        debug.rawResponse = text
        let parsed: unknown
        try {
          if (localAiJsonLooksTruncated(text)) {
            throw new Error(
              'Google Local AI returned truncated JSON before the final closing brace.',
            )
          }

          parsed = parseLocalAiJson(text)
          debug.parsedJson = parsed
        } catch (error) {
          debug.parseError = errorMessage(error)
          logLocalDashboardError(debug, error)
          throw new LocalAiGenerationError(
            'invalidJson',
            LOCAL_STUDY_PATH_INVALID_JSON_MESSAGE,
            { debug, cause: error },
          )
        }
        const record =
          parsed && typeof parsed === 'object'
            ? (parsed as Record<string, unknown>)
            : {}
        const dashboard = Array.isArray(record.dashboards)
          ? record.dashboards[0]
          : record
        let mappedDashboard: AiStudyPathDashboardDraft | null
        try {
          mappedDashboard = mapLocalDashboard(
            dashboard,
            index,
            options,
            text,
            roleForIndex(roles, index),
            targetCount,
          )
          debug.droppedOrRepairedItems =
            mappedDashboard?.debugTrace?.droppedOrRepairedItems || []
        } catch (error) {
          debug.mappingError = errorMessage(error)
          logLocalDashboardError(debug, error)
          throw new LocalAiGenerationError(
            'mappingError',
            LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
            { debug, cause: error },
          )
        }

        if (hasUsableMappedWidgets(mappedDashboard)) {
          if (
            failedAttempts.length > 0 &&
            mappedDashboard.debugTrace?.localAiFailedAttempts
          ) {
            mappedDashboard.debugTrace.localAiFailedAttempts.push(
              ...failedAttempts,
            )
          } else if (failedAttempts.length > 0 && mappedDashboard.debugTrace) {
            mappedDashboard.debugTrace.localAiFailedAttempts = [
              ...failedAttempts,
            ]
          }

          dashboards.push(mappedDashboard)
          lastError = null
          break
        }

        debug.mappingError = 'No usable Study Path widgets were produced.'
        debug.droppedOrRepairedItems =
          debug.droppedOrRepairedItems &&
          debug.droppedOrRepairedItems.length > 0
            ? debug.droppedOrRepairedItems
            : ['No usable Local AI objects found.']
        logLocalDashboardError(debug, new Error(debug.mappingError))
        throw new LocalAiGenerationError(
          'noUsableObjects',
          LOCAL_STUDY_PATH_NO_USABLE_OBJECTS_MESSAGE,
          { debug },
        )
      } catch (error) {
        const localError = isLocalAiGenerationError(error)
          ? error
          : new LocalAiGenerationError(
              localAiFailureCodeForError(error),
              localAiFailureMessageForCode(
                localAiFailureCodeForError(error),
                errorMessage(error),
              ),
              { debug, cause: error },
            )
        lastError = localError
        const attemptDebug = localError.debug || debug
        failedAttempts.push(attemptDebug)

        if (
          !localAiStudyPathFailureIsRetryable(localError) ||
          attempt === LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS
        ) {
          logLocalDashboardError(attemptDebug, localError)
          break
        }
      }
    }

    if (lastError) {
      const debug = withAttemptDebug(
        lastError.debug || {
          dashboardIndex: index + 1,
          dashboardCount: expectedCount,
        },
        failedAttempts,
      )
      if (dashboards.length === 0) {
        throw new LocalAiGenerationError(lastError.code, lastError.message, {
          debug,
          cause: lastError.cause,
        })
      }

      warnings.push(
        `Dashboard ${index + 1} could not be generated after ${LOCAL_STUDY_PATH_DASHBOARD_MAX_ATTEMPTS} Local AI attempts and was skipped.`,
      )
    }
  }

  if (dashboards.length === 0) {
    throw new Error(
      'Google Local AI did not return usable Study Path dashboards.',
    )
  }

  return {
    title: options.title,
    folderName: specificFolderName(
      '',
      options.folderName || options.title,
      options.prompt,
    ),
    dashboards,
    warnings: [
      ...warnings,
      expectedCount > 2
        ? 'Google Local AI generated this Compact path one dashboard at a time and may be slow.'
        : 'Google Local AI generated this Super small path one dashboard at a time.',
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

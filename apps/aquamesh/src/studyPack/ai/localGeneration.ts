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
import { callLocalLanguageModel } from './localLanguageModel'
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
  onProgress?: (percent: number) => void
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

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? normalizeSpaces(value) : ''

const stringArrayValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(stringValue).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|;|,(?=\s+\S)/)
      .map(stringValue)
      .filter(Boolean)
  }

  return []
}

export const parseLocalAiJson = (text: string): unknown => {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = fenced || trimmed

  try {
    return JSON.parse(candidate)
  } catch {
    const firstObject = candidate.indexOf('{')
    const lastObject = candidate.lastIndexOf('}')
    if (firstObject >= 0 && lastObject > firstObject) {
      return JSON.parse(candidate.slice(firstObject, lastObject + 1))
    }

    throw new Error('Google Local AI returned invalid JSON.')
  }
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

  const title = stringValue(input.title) || `Study item ${index + 1}`
  const base = createBase(packId, kind, index, title)

  if (kind === 'markdown') {
    const markdown =
      stringValue(input.markdown) ||
      stringValue(input.content) ||
      stringValue(input.body)
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
    if (!term || !definition) {
      events.push(`Dropped term ${index + 1}: missing term or definition.`)
      return null
    }

    return { ...base, kind, title: term, term, definition }
  }

  if (kind === 'qa') {
    const question = stringValue(input.question) || stringValue(input.front)
    const answer = stringValue(input.answer) || stringValue(input.back)
    if (!question || !answer) {
      events.push(`Dropped qa ${index + 1}: missing question or answer.`)
      return null
    }

    return { ...base, kind, question, answer }
  }

  if (kind === 'quiz') {
    const question = stringValue(input.question)
    const options = stringArrayValue(input.options)
    const rawCorrectIndex =
      typeof input.correctIndex === 'number'
        ? input.correctIndex
        : typeof input.correctOptionIndex === 'number'
          ? input.correctOptionIndex
          : 0
    const correctIndex =
      rawCorrectIndex >= 0 && rawCorrectIndex < options.length
        ? rawCorrectIndex
        : 0
    const answer =
      stringValue(input.answer) || (options.length > 0 ? options[correctIndex] : '')
    const explanation = stringValue(input.explanation)
    const quizMode =
      input.quizMode === 'multipleChoice' || options.length >= 3
        ? 'multipleChoice'
        : 'shortAnswer'

    if (!question || !answer || (quizMode === 'multipleChoice' && options.length < 3)) {
      events.push(`Dropped quiz ${index + 1}: missing usable quiz fields.`)
      return null
    }

    return {
      ...base,
      kind,
      quizMode,
      question,
      options: quizMode === 'multipleChoice' ? options.slice(0, 4) : [],
      correctIndex: quizMode === 'multipleChoice' ? correctIndex : 0,
      answer,
      explanation,
    }
  }

  if (kind === 'list') {
    const items = stringArrayValue(input.items || input.content)
    if (items.length === 0) {
      events.push(`Dropped list ${index + 1}: missing items.`)
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
  if (!prompt) {
    events.push(`Dropped reviewPrompt ${index + 1}: missing prompt.`)
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

export const normalizeLocalAiStudyPackDraft = (
  value: unknown,
  packId: string,
  options: NormalizeAiStudyPackDraftOptions = {},
): AiStudyPackDraft => {
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const rawObjects = Array.isArray(record.objects)
    ? record.objects
    : Array.isArray(record.studyObjects)
      ? record.studyObjects
      : []
  const events: string[] = []
  const objects = rawObjects
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

  if (objects.length === 0) {
    events.push('Google Local AI did not return any usable study objects.')
  }

  return {
    title:
      typeof record.title === 'string' && record.title.trim()
        ? normalizeSpaces(record.title)
        : undefined,
    sourceFormat: 'text' as StudyPackSourceFormat,
    rawNotes:
      typeof record.rawNotes === 'string' ? normalizeSpaces(record.rawNotes) : '',
    dashboardRole: options.dashboardRole,
    objects,
    warnings: objects.length === 0 ? ['No usable Local AI objects found.'] : [],
    debugTrace: {
      rawAiResponse: options.rawAiResponse || JSON.stringify(value, null, 2),
      validatedContract: null,
      roleFilteredContract: null,
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

  if (normalized === 'compact') {
    return 3
  }

  if (normalized === 'deep') {
    return 7
  }

  return 5
}

const localStudyPackPrompt = ({
  title,
  rawNotes,
  generationAmount = 'medium',
  promptMode = false,
}: GenerateStudyPackWithAiOptions): string => {
  const targetCount =
    generationAmount === 'few' ? '4' : generationAmount === 'many' ? '6' : '5'
  const compactNotes = rawNotes.replace(/\s+/g, ' ').trim().slice(0, 4000)

  return `Return JSON only. No prose. No markdown fences.
Make a tiny study pack with exactly ${targetCount} objects.
Use only these object shapes:
{"kind":"markdown","title":"Summary","markdown":"..."}
{"kind":"term","term":"...","definition":"..."}
{"kind":"qa","question":"...","answer":"..."}
{"kind":"quiz","question":"...","quizMode":"multipleChoice","options":["A","B","C"],"correctIndex":0,"answer":"A","explanation":"..."}
{"kind":"list","title":"Key points","items":["...","..."]}
{"kind":"reviewPrompt","prompt":"...","reason":"..."}
Output:
{"title":"${title.replace(/"/g, '')}","objects":[...]}
Title: ${title}
Input: ${promptMode ? 'learning goal' : 'source notes'}
${compactNotes}`
}

const localStudyPathPrompt = ({
  title,
  prompt,
  folderName,
  generationAmount,
}: GenerateStudyPathWithAiOptions): string => {
  const count = Math.min(3, getLocalStudyPathDashboardCount(generationAmount))
  const compactPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 2500)

  return `Return JSON only. No prose. No markdown fences.
Create exactly ${count} short dashboards. Each dashboard has 3 objects.
Each dashboard objects:
1 markdown summary: {"kind":"markdown","title":"Summary","markdown":"..."}
1 qa: {"kind":"qa","question":"...","answer":"..."}
1 quiz: {"kind":"quiz","question":"...","quizMode":"multipleChoice","options":["A","B","C"],"correctIndex":0,"answer":"A","explanation":"..."}
Output:
{"title":"...","folderName":"...","dashboards":[{"title":"01 - Lesson","summary":"...","rawNotes":"...","objects":[...]}]}
Path title fallback: ${title}
Folder name fallback: ${folderName || 'Study Path'}
Topic:
${compactPrompt}`
}

export const generateStudyPackWithLocalAi = async (
  options: GenerateStudyPackWithAiOptions,
  localOptions: LocalGenerationOptions = {},
): Promise<AiStudyPackDraft> => {
  const text = await callLocalLanguageModel(localStudyPackPrompt(options), {
    timeoutMs: 5 * 60 * 1000,
    onProgress: localOptions.onProgress,
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

const mapLocalDashboard = (
  input: unknown,
  index: number,
  options: GenerateStudyPathWithAiOptions,
  rawAiResponse: string,
  role: StudyPathDashboardRole,
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
    rawNotes: stringValue(record.rawNotes),
    rawAiResponse,
    dashboardRole: role,
  })

  if (draft.objects.length === 0 && !stringValue(record.rawNotes)) {
    return null
  }

  return {
    ...draft,
    title,
    summary: stringValue(record.summary) || 'Generated local AI lesson.',
    rawNotes: stringValue(record.rawNotes) || stringValue(record.summary),
    dashboardRole: role,
    sourceFormat: 'text',
  }
}

export const generateStudyPathWithLocalAi = async (
  options: GenerateStudyPathWithAiOptions,
  localOptions: LocalGenerationOptions = {},
): Promise<AiStudyPathDraft> => {
  const text = await callLocalLanguageModel(localStudyPathPrompt(options), {
    timeoutMs: 5 * 60 * 1000,
    onProgress: localOptions.onProgress,
  })
  const parsed = parseLocalAiJson(text)
  const record =
    parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  const rawDashboards = Array.isArray(record.dashboards) ? record.dashboards : []
  const expectedCount = getLocalStudyPathDashboardCount(options.generationAmount)
  const roles = getStudyPathDashboardRoles(options.generationAmount).slice(
    0,
    expectedCount,
  )
  const dashboards = rawDashboards
    .slice(0, expectedCount)
    .map((dashboard, index) =>
      mapLocalDashboard(dashboard, index, options, text, roleForIndex(roles, index)),
    )
    .filter((dashboard): dashboard is AiStudyPathDashboardDraft =>
      Boolean(dashboard),
    )

  if (dashboards.length === 0) {
    throw new Error('Google Local AI did not return usable Study Path dashboards.')
  }

  return {
    title: stringValue(record.title) || options.title,
    folderName: stringValue(record.folderName) || options.folderName || options.title,
    dashboards,
    warnings: [
      'Google Local AI is experimental and works best with Super small or Compact generation.',
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

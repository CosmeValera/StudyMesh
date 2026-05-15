import { z } from 'zod'
import {
  StudyObject,
  StudyPackSourceFormat,
  StudyPathDashboardRole,
} from '../types'

const normalizeSpaces = (value: string): string =>
  value.replace(/\s+/g, ' ').trim()

const asTitle = (value: string, fallback: string): string =>
  normalizeSpaces(value) || fallback

const normalizeKey = (value: string): string =>
  normalizeSpaces(
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, ' '),
  )

const sentenceFragments = (value: string): string[] =>
  normalizeSpaces(value)
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map(normalizeSpaces)
    .filter((fragment) => fragment.split(/\s+/).length >= 5)

const genericQuestionPattern =
  /what does .+ help you understand|core idea behind|which statement best explains|what do the notes say|according to the notes|which statement matches/i

const isCopiedFromSource = (question: string, rawNotes = ''): boolean => {
  const key = normalizeKey(question)
  if (!key || !rawNotes.trim()) {
    return false
  }

  return sentenceFragments(rawNotes).some((fragment) => {
    const fragmentKey = normalizeKey(fragment)
    return (
      key.length >= 32 &&
      (fragmentKey.includes(key) || key.includes(fragmentKey))
    )
  })
}

const isUsefulQuestion = (question: string, rawNotes = ''): boolean =>
  question.split(/\s+/).filter(Boolean).length >= 4 &&
  !genericQuestionPattern.test(question) &&
  !isCopiedFromSource(question, rawNotes)

const stringValue = z
  .string()
  .transform((value) => normalizeSpaces(value))
  .pipe(z.string().min(1))

const sourceSummarySchema = z.object({
  title: stringValue,
  bullets: z.array(stringValue).default([]),
})

const conceptSectionSchema = z.object({
  title: stringValue,
  bullets: z.array(stringValue).default([]),
  example: z.string().transform((value) => normalizeSpaces(value)).default(''),
})

const conceptRecapSchema = z.object({
  title: stringValue,
  sections: z.array(conceptSectionSchema).default([]),
})

const shortAnswerSchema = z.object({
  question: stringValue,
  expectedAnswer: stringValue,
  explanation: stringValue,
})

const multipleChoiceSchema = z.object({
  question: stringValue,
  options: z.array(stringValue),
  correctOptionIndex: z.number().int(),
  explanation: stringValue,
})

const flashcardSchema = z.object({
  front: stringValue,
  back: stringValue,
})

const strictDashboardSchema = z.object({
  sourceSummary: sourceSummarySchema,
  conceptRecap: conceptRecapSchema,
  practice: z.object({
    shortAnswer: z.array(shortAnswerSchema).default([]),
    multipleChoice: z.array(multipleChoiceSchema).default([]),
  }),
  flashcards: z.array(flashcardSchema).default([]),
})

export type StrictAiDashboardContract = z.infer<typeof strictDashboardSchema>

export interface AiSourceSummary {
  title: string
  bullets: string[]
}

export interface AiGenerationDebugTrace {
  rawAiResponse: string
  validatedContract: StrictAiDashboardContract | null
  droppedOrRepairedItems: string[]
  finalObjects: StudyObject[]
}

export interface AiStudyPackDraft {
  title?: string
  sourceFormat?: StudyPackSourceFormat
  rawNotes?: string
  dashboardRole?: StudyPathDashboardRole
  sourceSummary?: AiSourceSummary
  strictContract?: StrictAiDashboardContract
  objects: StudyObject[]
  warnings: string[]
  debugTrace?: AiGenerationDebugTrace
}

export interface NormalizeAiStudyPackDraftOptions {
  rawNotes?: string
  rawAiResponse?: string
  dashboardRole?: StudyPathDashboardRole
}

const createBase = (
  packId: string,
  suffix: string,
  index: number,
  title: string,
) => ({
  id: `${packId}-${suffix}-${index + 1}`,
  title,
  sourceLine: index + 1,
  tags: ['study-pack', 'ai-generated'],
})

const dedupe = (values: string[]): string[] => {
  const seen = new Set<string>()

  return values.filter((value) => {
    const key = normalizeKey(value)
    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

const normalizeMultipleChoice = (
  item: z.infer<typeof multipleChoiceSchema>,
  index: number,
  rawNotes: string,
  events: string[],
): z.infer<typeof multipleChoiceSchema> | null => {
  if (!isUsefulQuestion(item.question, rawNotes)) {
    events.push(`Dropped multipleChoice ${index + 1}: weak or copied question.`)
    return null
  }

  const options = dedupe(item.options)
  if (options.length !== item.options.length) {
    events.push(`Repaired multipleChoice ${index + 1}: removed duplicate options.`)
  }

  if (options.length < 3 || options.length > 4) {
    events.push(
      `Dropped multipleChoice ${index + 1}: expected 3-4 unique options.`,
    )
    return null
  }

  const originalCorrect = item.options[item.correctOptionIndex]
  const correctOptionIndex = options.findIndex(
    (option) => normalizeKey(option) === normalizeKey(originalCorrect || ''),
  )
  if (correctOptionIndex < 0) {
    events.push(
      `Dropped multipleChoice ${index + 1}: correct option was missing after repair.`,
    )
    return null
  }

  return { ...item, options, correctOptionIndex }
}

const normalizeStrictContract = (
  contract: StrictAiDashboardContract,
  rawNotes: string,
  dashboardRole: StudyPathDashboardRole = 'normal',
): { contract: StrictAiDashboardContract; events: string[] } => {
  const events: string[] = []
  const sourceSummary = {
    ...contract.sourceSummary,
    bullets: dedupe(contract.sourceSummary.bullets).slice(0, 8),
  }
  if (sourceSummary.bullets.length !== contract.sourceSummary.bullets.length) {
    events.push('Repaired sourceSummary: removed empty or duplicate bullets.')
  }

  const conceptSections =
    dashboardRole === 'exercises'
      ? []
      : contract.conceptRecap.sections
          .map((section, index) => {
            const bullets = dedupe(section.bullets).slice(0, 8)
            if (bullets.length === 0 && !section.example) {
              events.push(
                `Dropped conceptRecap section ${
                  index + 1
                }: no usable content.`,
              )
              return null
            }

            if (bullets.length !== section.bullets.length) {
              events.push(
                `Repaired conceptRecap section ${
                  index + 1
                }: removed duplicate bullets.`,
              )
            }

            return { ...section, bullets }
          })
          .filter((section): section is z.infer<typeof conceptSectionSchema> =>
            Boolean(section),
          )
  if (
    dashboardRole === 'exercises' &&
    contract.conceptRecap.sections.length > 0
  ) {
    events.push(
      'Dropped conceptRecap: exercises dashboards are practice-only.',
    )
  }

  const shortAnswer =
    dashboardRole === 'summary'
      ? []
      : contract.practice.shortAnswer.filter((item, index) => {
          if (!isUsefulQuestion(item.question, rawNotes)) {
            events.push(
              `Dropped shortAnswer ${index + 1}: weak or copied question.`,
            )
            return false
          }

          return true
        })
  const multipleChoice =
    dashboardRole === 'summary'
      ? []
      : contract.practice.multipleChoice
          .map((item, index) =>
            normalizeMultipleChoice(item, index, rawNotes, events),
          )
          .filter(
            (item): item is z.infer<typeof multipleChoiceSchema> =>
              Boolean(item),
          )
  if (
    dashboardRole === 'summary' &&
    (contract.practice.shortAnswer.length > 0 ||
      contract.practice.multipleChoice.length > 0)
  ) {
    events.push('Dropped practice: summary dashboards are recap-only.')
  }
  const flashcards =
    dashboardRole === 'summary'
      ? []
      : contract.flashcards.filter((item, index) => {
          if (
            genericQuestionPattern.test(item.front) ||
            normalizeKey(item.front) === normalizeKey(item.back)
          ) {
            events.push(`Dropped flashcard ${index + 1}: weak prompt.`)
            return false
          }

          return true
        })
  if (dashboardRole === 'summary' && contract.flashcards.length > 0) {
    events.push('Dropped flashcards: summary dashboards are recap-only.')
  }

  return {
    contract: {
      sourceSummary,
      conceptRecap: {
        ...contract.conceptRecap,
        sections: conceptSections,
      },
      practice: { shortAnswer, multipleChoice },
      flashcards,
    },
    events,
  }
}

export const mapStrictContractToStudyObjects = (
  contract: StrictAiDashboardContract,
  packId: string,
): StudyObject[] => {
  const recapObjects: StudyObject[] = contract.conceptRecap.sections.map(
    (section, index) => ({
      ...createBase(packId, 'concept-recap', index, section.title),
      kind: 'list' as const,
      items: [
        ...section.bullets,
        ...(section.example ? [`Example: ${section.example}`] : []),
      ],
      ordered: false,
      checklist: false,
    }),
  )
  const shortAnswerObjects: StudyObject[] = contract.practice.shortAnswer.map(
    (item, index) => ({
      ...createBase(packId, 'short-answer', index, `Practice ${index + 1}`),
      kind: 'quiz' as const,
      quizMode: 'shortAnswer' as const,
      question: item.question,
      options: [],
      correctIndex: 0,
      answer: item.expectedAnswer,
      explanation: item.explanation,
    }),
  )
  const multipleChoiceObjects: StudyObject[] =
    contract.practice.multipleChoice.map((item, index) => ({
      ...createBase(
        packId,
        'multiple-choice',
        index,
        `Multiple choice ${index + 1}`,
      ),
      kind: 'quiz' as const,
      quizMode: 'multipleChoice' as const,
      question: item.question,
      options: item.options,
      correctIndex: item.correctOptionIndex,
      answer: item.options[item.correctOptionIndex],
      explanation: item.explanation,
    }))
  const flashcardObjects: StudyObject[] = contract.flashcards.map(
    (item, index) => ({
      ...createBase(packId, 'flashcard', index, `Flashcard ${index + 1}`),
      kind: 'qa' as const,
      question: item.front,
      answer: item.back,
    }),
  )

  return [
    ...recapObjects,
    ...shortAnswerObjects,
    ...multipleChoiceObjects,
    ...flashcardObjects,
  ]
}

export const normalizeAiStudyPackDraft = (
  value: unknown,
  packId: string,
  options: NormalizeAiStudyPackDraftOptions = {},
): AiStudyPackDraft => {
  const warnings: string[] = []
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const title =
    typeof record.title === 'string' ? normalizeSpaces(record.title) : undefined
  const sourceFormat =
    typeof record.sourceFormat === 'string'
      ? (record.sourceFormat as StudyPackSourceFormat)
      : undefined
  const rawNotes =
    typeof record.rawNotes === 'string' ? normalizeSpaces(record.rawNotes) : ''
  const rawAiResponse = options.rawAiResponse || JSON.stringify(value, null, 2)
  const parsed = strictDashboardSchema.safeParse(record)

  if (!parsed.success) {
    const events = parsed.error.issues.map(
      (issue) =>
        `Invalid strict contract at ${issue.path.join('.') || 'root'}: ${
          issue.message
        }`,
    )
    warnings.push('AI response did not match the strict Study Pack schema.')

    return {
      title,
      sourceFormat,
      rawNotes,
      dashboardRole: options.dashboardRole,
      objects: [],
      warnings,
      debugTrace: {
        rawAiResponse,
        validatedContract: null,
        droppedOrRepairedItems: events,
        finalObjects: [],
      },
    }
  }

  const { contract, events } = normalizeStrictContract(
    parsed.data,
    options.rawNotes || rawNotes,
    options.dashboardRole,
  )
  const objects = mapStrictContractToStudyObjects(contract, packId)

  return {
    title,
    sourceFormat,
    rawNotes,
    dashboardRole: options.dashboardRole,
    sourceSummary: {
      title: asTitle(contract.sourceSummary.title, 'Source summary'),
      bullets: contract.sourceSummary.bullets,
    },
    strictContract: contract,
    objects,
    warnings,
    debugTrace: {
      rawAiResponse,
      validatedContract: contract,
      droppedOrRepairedItems: events,
      finalObjects: objects,
    },
  }
}

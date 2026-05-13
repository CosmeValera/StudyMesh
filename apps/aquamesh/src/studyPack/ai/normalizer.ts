import { StudyObject, StudyObjectKind, StudyPackSourceFormat } from '../types'

type AiStudyObjectInput = Record<string, unknown>

export interface AiStudyPackDraft {
  title?: string
  sourceFormat?: StudyPackSourceFormat
  rawNotes?: string
  objects: StudyObject[]
  warnings: string[]
}

const validKinds: StudyObjectKind[] = [
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
  'resource',
]

const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : typeof value === 'string'
    ? value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const asRows = (value: unknown): string[][] =>
  Array.isArray(value)
    ? value
        .map((row) =>
          Array.isArray(row)
            ? row.map((cell) => String(cell).trim())
            : [String(row).trim()],
        )
        .filter((row) => row.some(Boolean))
    : []

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const createBase = (
  input: AiStudyObjectInput,
  kind: StudyObjectKind,
  index: number,
  packId: string,
) => ({
  id: asString(input.id) || `${packId}-${kind}-${index + 1}`,
  kind,
  title: asString(input.title) || undefined,
  sourceLine: Number(input.sourceLine) || index + 1,
  tags: asStringArray(input.tags),
})

export const normalizeAiStudyPackDraft = (
  value: unknown,
  packId: string,
): AiStudyPackDraft => {
  const warnings: string[] = []
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const inputObjects = Array.isArray(record.objects) ? record.objects : []
  const objects = inputObjects
    .map((item, index): StudyObject | null => {
      const input =
        item && typeof item === 'object' ? (item as AiStudyObjectInput) : {}
      const kind = asString(input.kind) as StudyObjectKind
      if (!validKinds.includes(kind)) {
        warnings.push(`Skipped item ${index + 1}: unsupported kind.`)
        return null
      }

      const base = createBase(input, kind, index, packId)

      if (kind === 'markdown') {
        const markdown = asString(input.markdown)
        return markdown ? { ...base, kind, markdown } : null
      }

      if (kind === 'note') {
        const body = asString(input.body)
        return body ? { ...base, kind, body } : null
      }

      if (kind === 'term') {
        const term = asString(input.term)
        const definition = asString(input.definition)
        return term && definition ? { ...base, kind, term, definition } : null
      }

      if (kind === 'qa') {
        const question = asString(input.question)
        const answer = asString(input.answer)
        return question && answer ? { ...base, kind, question, answer } : null
      }

      if (kind === 'quiz') {
        const question = asString(input.question)
        const options = asStringArray(input.options)
        const correctIndex = Math.max(
          0,
          Math.min(options.length - 1, Number(input.correctIndex) || 0),
        )
        const answer = asString(input.answer) || options[correctIndex] || ''
        return question && answer
          ? {
              ...base,
              kind,
              quizMode:
                input.quizMode === 'multipleChoice' || options.length >= 2
                  ? 'multipleChoice'
                  : 'shortAnswer',
              question,
              options,
              correctIndex,
              answer,
              explanation: asString(input.explanation),
            }
          : null
      }

      if (kind === 'reveal') {
        const prompt = asString(input.prompt)
        const hiddenText = asString(input.hiddenText)
        return prompt && hiddenText
          ? { ...base, kind, prompt, hiddenText }
          : null
      }

      if (kind === 'comparison') {
        const columns = asStringArray(input.columns)
        const rows = asRows(input.rows)
        return columns.length > 0 && rows.length > 0
          ? { ...base, kind, columns, rows }
          : null
      }

      if (kind === 'sequence') {
        const steps = asStringArray(input.steps)
        return steps.length > 0
          ? {
              ...base,
              kind,
              steps,
              ordered: asBoolean(input.ordered, true),
              interactiveChecklist: asBoolean(
                input.interactiveChecklist,
                false,
              ),
            }
          : null
      }

      if (kind === 'reviewPrompt') {
        const prompt = asString(input.prompt)
        return prompt
          ? {
              ...base,
              kind,
              prompt,
              reason: asString(input.reason),
              status: 'needsReview',
            }
          : null
      }

      if (kind === 'code') {
        const code = asString(input.code)
        return code
          ? {
              ...base,
              kind,
              code,
              language: asString(input.language) || 'text',
              caption: asString(input.caption),
            }
          : null
      }

      if (kind === 'list') {
        const items = asStringArray(input.items)
        return items.length > 0
          ? {
              ...base,
              kind,
              items,
              ordered: asBoolean(input.ordered, false),
              checklist: asBoolean(input.checklist, false),
            }
          : null
      }

      if (kind === 'table') {
        const headers = asStringArray(input.headers)
        const rows = asRows(input.rows)
        return headers.length > 0 && rows.length > 0
          ? { ...base, kind, headers, rows }
          : null
      }

      if (kind === 'resource') {
        const url = asString(input.url)
        const label = asString(input.label)
        return url && label
          ? {
              ...base,
              kind,
              url,
              label,
              resourceType:
                input.resourceType === 'image' || input.resourceType === 'pdf'
                  ? input.resourceType
                  : 'link',
            }
          : null
      }

      return null
    })
    .filter((object): object is StudyObject => Boolean(object))

  return {
    title: asString(record.title) || undefined,
    sourceFormat: asString(record.sourceFormat) as StudyPackSourceFormat,
    rawNotes: asString(record.rawNotes) || undefined,
    objects,
    warnings,
  }
}

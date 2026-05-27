import type { StudyPathDashboardRole } from './types'

export type StudyPathLayoutArchetype =
  | 'focusLesson'
  | 'learnPracticeTabs'
  | 'splitReferenceExercise'
  | 'multiWidgetLab'
  | 'overviewReview'

export type StudyPathDashboardPurpose =
  | 'overview'
  | 'lesson'
  | 'practice'
  | 'review'
  | 'finalReview'
  | 'projectLab'

export type StudyPathPracticeType = 'none' | 'quiz' | 'flashcards' | 'mixed'

export interface StudyPathSourceRef {
  id?: string
  label?: string
  source?: string
  chunkIndex?: number
}

export interface StudyPathLayoutMetadata {
  layoutArchetype: StudyPathLayoutArchetype
  dashboardPurpose: StudyPathDashboardPurpose
  practiceType: StudyPathPracticeType
  layoutReason?: string
  sourceRefs?: StudyPathSourceRef[]
}

export const STUDY_PATH_LAYOUT_ARCHETYPES: Record<
  StudyPathLayoutArchetype,
  {
    label: string
    description: string
    defaultPurpose: StudyPathDashboardPurpose
    defaultPracticeType: StudyPathPracticeType
  }
> = {
  focusLesson: {
    label: 'Focus Lesson',
    description: 'One main learning area for explanations, theory, or recap.',
    defaultPurpose: 'lesson',
    defaultPracticeType: 'none',
  },
  learnPracticeTabs: {
    label: 'Learn + Practice Tabs',
    description: 'Default lesson layout with learn and practice tabs.',
    defaultPurpose: 'lesson',
    defaultPracticeType: 'mixed',
  },
  splitReferenceExercise: {
    label: 'Split Reference + Exercise',
    description: 'Reference material visible beside active practice.',
    defaultPurpose: 'lesson',
    defaultPracticeType: 'quiz',
  },
  multiWidgetLab: {
    label: 'Multi-widget Lab',
    description: 'Project or lab step with instructions, resources, and checks.',
    defaultPurpose: 'projectLab',
    defaultPracticeType: 'mixed',
  },
  overviewReview: {
    label: 'Overview / Review Dashboard',
    description: 'Path overview, review, or final recap dashboard.',
    defaultPurpose: 'overview',
    defaultPracticeType: 'none',
  },
}

const layoutArchetypeValues = new Set<StudyPathLayoutArchetype>(
  Object.keys(STUDY_PATH_LAYOUT_ARCHETYPES) as StudyPathLayoutArchetype[],
)

const purposeValues = new Set<StudyPathDashboardPurpose>([
  'overview',
  'lesson',
  'practice',
  'review',
  'finalReview',
  'projectLab',
])

const practiceTypeValues = new Set<StudyPathPracticeType>([
  'none',
  'quiz',
  'flashcards',
  'mixed',
])

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const normalizeSourceRefs = (value: unknown): StudyPathSourceRef[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const refs = value
    .map((item): StudyPathSourceRef | null => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const record = item as Record<string, unknown>
      const ref: StudyPathSourceRef = {
        id: stringValue(record.id) || undefined,
        label: stringValue(record.label) || undefined,
        source: stringValue(record.source) || undefined,
        chunkIndex:
          typeof record.chunkIndex === 'number' &&
          Number.isFinite(record.chunkIndex)
            ? record.chunkIndex
            : undefined,
      }

      return ref.id || ref.label || ref.source || ref.chunkIndex !== undefined
        ? ref
        : null
    })
    .filter((ref): ref is StudyPathSourceRef => Boolean(ref))

  return refs.length > 0 ? refs : undefined
}

export const getDefaultStudyPathLayoutMetadata = (
  dashboardRole: StudyPathDashboardRole = 'normal',
  index = 0,
  dashboardCount = 1,
): StudyPathLayoutMetadata => {
  if (dashboardRole === 'summary') {
    return {
      layoutArchetype: 'overviewReview',
      dashboardPurpose: 'overview',
      practiceType: 'none',
    }
  }

  if (dashboardRole === 'exercises') {
    return {
      layoutArchetype: 'overviewReview',
      dashboardPurpose: 'practice',
      practiceType: 'mixed',
    }
  }

  return {
    layoutArchetype: 'learnPracticeTabs',
    dashboardPurpose: 'lesson',
    practiceType: 'mixed',
  }
}

export const normalizeStudyPathLayoutMetadata = (
  input: unknown,
  fallback: StudyPathLayoutMetadata,
): StudyPathLayoutMetadata => {
  const record =
    input && typeof input === 'object'
      ? (input as Record<string, unknown>)
      : {}
  const rawArchetype = stringValue(record.layoutArchetype)
  const layoutArchetype = layoutArchetypeValues.has(
    rawArchetype as StudyPathLayoutArchetype,
  )
    ? (rawArchetype as StudyPathLayoutArchetype)
    : fallback.layoutArchetype
  const archetype = STUDY_PATH_LAYOUT_ARCHETYPES[layoutArchetype]
  const rawPurpose = stringValue(record.dashboardPurpose)
  const dashboardPurpose = purposeValues.has(
    rawPurpose as StudyPathDashboardPurpose,
  )
    ? (rawPurpose as StudyPathDashboardPurpose)
    : fallback.dashboardPurpose || archetype.defaultPurpose
  const rawPracticeType = stringValue(record.practiceType)
  const practiceType = practiceTypeValues.has(
    rawPracticeType as StudyPathPracticeType,
  )
    ? (rawPracticeType as StudyPathPracticeType)
    : fallback.practiceType || archetype.defaultPracticeType

  return {
    layoutArchetype,
    dashboardPurpose,
    practiceType,
    layoutReason: stringValue(record.layoutReason) || fallback.layoutReason,
    sourceRefs: normalizeSourceRefs(record.sourceRefs) || fallback.sourceRefs,
  }
}

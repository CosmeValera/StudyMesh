export type StudyPathSectionMasteryStatus =
  | 'notStarted'
  | 'inProgress'
  | 'needsReview'
  | 'mastered'
  | 'locked'

export interface StudyPathSectionProgress {
  sectionId: string
  status: StudyPathSectionMasteryStatus
  quizAttempts: number
  bestScore?: number
  lastScore?: number
  teachBackAttempts: number
  lastTeachBackFeedback?: string
  lastReviewedAt?: string
  masteredAt?: string
}

export interface StudyPathProgress {
  studyPathId: string
  sections: Record<string, StudyPathSectionProgress>
  activeSectionId?: string
  updatedAt: string
}

export interface StudyPathSection {
  id: string
  title: string
  content: string
  order: number
  quizQuestions?: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  question: string
  options?: string[]
  correctAnswer: number | string
  explanation?: string
}

export const MASTERYPASSINGSCORE = 70

export const getNextSectionId = (
  sections: StudyPathSection[],
  currentSectionId: string,
): string | undefined => {
  const currentIndex = sections.findIndex(s => s.id === currentSectionId)
  if (currentIndex === -1 || currentIndex >= sections.length - 1) {
    return undefined
  }
  return sections[currentIndex + 1].id
}

export const getPreviousSectionId = (
  sections: StudyPathSection[],
  currentSectionId: string,
): string | undefined => {
  const currentIndex = sections.findIndex(s => s.id === currentSectionId)
  if (currentIndex <= 0) {
    return undefined
  }
  return sections[currentIndex - 1].id
}

export const isSectionUnlocked = (
  sectionId: string,
  sections: StudyPathSection[],
  progress: StudyPathProgress,
): boolean => {
  const sectionIndex = sections.findIndex(s => s.id === sectionId)
  if (sectionIndex === 0) {
    return true
  }

  const previousSectionId = sections[sectionIndex - 1]?.id
  if (!previousSectionId) {
    return true
  }

  const previousProgress = progress.sections[previousSectionId]
  if (!previousProgress) {
    return sectionIndex === 0
  }

  return previousProgress.status === 'mastered'
}

export const getOverallMasteryPercent = (
  sections: StudyPathSection[],
  progress: StudyPathProgress,
): number => {
  if (sections.length === 0) {
    return 0
  }

  let masteredCount = 0
  for (const section of sections) {
    const sectionProgress = progress.sections[section.id]
    if (sectionProgress?.status === 'mastered') {
      masteredCount++
    }
  }

  return Math.round((masteredCount / sections.length) * 100)
}
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
  guidedMode: boolean
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
export const TEACHBACKMINLENGTH = 50
export const TEACHBACKKEYTERMTHRESHOLD = 0.3

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
  if (!progress.guidedMode) {
    return true
  }

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

export const getReviewQueue = (
  sections: StudyPathSection[],
  progress: StudyPathProgress,
): StudyPathSection[] => {
  return sections.filter(section => {
    const sectionProgress = progress.sections[section.id]
    return sectionProgress?.status === 'needsReview'
  })
}

export const getNextRecommendedStep = (
  sections: StudyPathSection[],
  progress: StudyPathProgress,
): string => {
  const totalSections = sections.length
  let masteredCount = 0
  let inProgressCount = 0
  let nextSection: StudyPathSection | undefined

  for (const section of sections) {
    const sectionProgress = progress.sections[section.id]
    if (sectionProgress?.status === 'mastered') {
      masteredCount++
    } else if (sectionProgress?.status === 'inProgress') {
      inProgressCount++
    } else if (!nextSection && sectionProgress?.status !== 'locked') {
      nextSection = section
    }
  }

  if (masteredCount === totalSections) {
    return 'You have mastered all sections — great work!'
  }

  if (inProgressCount > 0) {
    return 'Continue with your current section'
  }

  if (nextSection) {
    return `Continue with "${nextSection.title}"`
  }

  if (masteredCount > 0) {
    return 'Review a previous section before moving on'
  }

  return 'Start your first section to begin learning'
}

export const scoreToStatus = (score: number): StudyPathSectionMasteryStatus => {
  if (score >= MASTERYPASSINGSCORE) {
    return 'mastered'
  }
  if (score >= 40) {
    return 'needsReview'
  }
  return 'needsReview'
}

export const generateSelfCheckQuestions = (
  section: StudyPathSection,
): QuizQuestion[] => {
  const words = section.title.split(' ')
  const keyTerms = words.filter(w => w.length > 4).slice(0, 5)

  return [
    {
      id: `${section.id}-selfcheck-1`,
      question: `Can you briefly explain what "${section.title}" covers?`,
      options: [
        'Yes, I can explain it well',
        'I have a general idea',
        'I need to review this topic',
        'I am not sure',
      ],
      correctAnswer: 0,
    },
    {
      id: `${section.id}-selfcheck-2`,
      question: `Which best describes your confidence with the key concept: "${keyTerms[0] || section.title}"?`,
      options: [
        'I understand it clearly',
        'I recognize it but need practice',
        'I am still learning this',
        'This is new to me',
      ],
      correctAnswer: 0,
    },
    {
      id: `${section.id}-selfcheck-3`,
      question: 'How would you rate your understanding of this section?',
      options: [
        'Mastered — I could teach it',
        'Good — I understand the main ideas',
        'Partial — some parts are unclear',
        'Limited — I need to study more',
      ],
      correctAnswer: 0,
    },
  ]
}

export const evaluateTeachBackLocally = (
  userText: string,
  section: StudyPathSection,
): string => {
  const trimmed = userText.trim()

  if (trimmed.length < TEACHBACKMINLENGTH) {
    return `Your explanation is quite short (${trimmed.length} chars). Try to explain in at least ${TEACHBACKMINLENGTH} characters. Use your own words — describe what the concept is, how it works, and why it matters.`
  }

  const sectionWords = new Set(
    section.title.toLowerCase().split(/\s+/).filter(w => w.length > 3),
  )
  sectionWords.add(
    ...section.content
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 5)
      .slice(0, 50),
  )

  const userWords = userText.toLowerCase().split(/\s+/)
  let matchCount = 0
  for (const word of userWords) {
    if (sectionWords.has(word)) {
      matchCount++
    }
  }

  const keyTermOverlap = sectionWords.size > 0
    ? matchCount / sectionWords.size
    : 0

  if (keyTermOverlap < TEACHBACKKEYTERMTHRESHOLD) {
    return `Good length, but try to use terms from the section title and content. You're explaining the concept in your own words — that's great! Keep going and make sure you cover the main idea.`
  }

  return `Well explained! Your answer covers the key concepts and shows good understanding. Length: ${trimmed.length} chars, key term overlap: ${Math.round(keyTermOverlap * 100)}%.`
}
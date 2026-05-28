export type StudyPathSectionMasteryStatus =
  | 'notStarted'
  | 'inProgress'
  | 'needsReview'
  | 'mastered'
  | 'locked'

export const MASTERYPASSINGSCORE = 70
export const TEACHBACKMINLENGTH = 50
export const TEACHBACKKEYTERMTHRESHOLD = 0.3

export const scoreToStatus = (
  score: number,
  passingScore: number = MASTERYPASSINGSCORE,
): StudyPathSectionMasteryStatus => {
  if (score >= passingScore) {
    return 'mastered'
  }
  return 'needsReview'
}

export const isSectionUnlocked = (
  sectionIndex: number,
  dashboardCount: number,
  guidedMode: boolean,
  sectionStatus?: StudyPathSectionMasteryStatus,
): boolean => {
  if (!guidedMode) {
    return true
  }

  if (sectionIndex === 0) {
    return true
  }

  return sectionStatus === 'mastered'
}

export const getOverallMasteryPercent = (
  dashboards: Array<{ dashboardKey: string }>,
  masteryStatusMap: Record<string, StudyPathSectionMasteryStatus>,
): number => {
  if (dashboards.length === 0) {
    return 0
  }

  let masteredCount = 0
  for (const dashboard of dashboards) {
    const status = masteryStatusMap[dashboard.dashboardKey]
    if (status === 'mastered') {
      masteredCount++
    }
  }

  return Math.round((masteredCount / dashboards.length) * 100)
}

export const getReviewQueue = (
  dashboards: Array<{ dashboardKey: string; name: string }>,
  masteryStatusMap: Record<string, StudyPathSectionMasteryStatus>,
): Array<{ dashboardKey: string; name: string }> => {
  return dashboards.filter((dashboard) => {
    const status = masteryStatusMap[dashboard.dashboardKey]
    return status === 'needsReview'
  })
}

export const getNextRecommendedStep = (
  dashboards: Array<{ dashboardKey: string; dashboardIndex: number; name: string }>,
  masteryStatusMap: Record<string, StudyPathSectionMasteryStatus>,
): string => {
  const totalDashboards = dashboards.length
  let masteredCount = 0
  let inProgressCount = 0
  let nextDashboard: { dashboardKey: string; name: string } | undefined

  for (const dashboard of dashboards) {
    const status = masteryStatusMap[dashboard.dashboardKey]
    if (status === 'mastered') {
      masteredCount++
    } else if (status === 'inProgress') {
      inProgressCount++
    } else if (!nextDashboard && status !== 'locked') {
      nextDashboard = { dashboardKey: dashboard.dashboardKey, name: dashboard.name }
    }
  }

  if (masteredCount === totalDashboards) {
    return 'You have mastered all sections — great work!'
  }

  if (inProgressCount > 0) {
    return 'Continue with your current section'
  }

  if (nextDashboard) {
    return `Continue with "${nextDashboard.name}"`
  }

  if (masteredCount > 0) {
    return 'Review a previous section before moving on'
  }

  return 'Start your first section to begin learning'
}

export const evaluateTeachBackLocally = (
  userText: string,
  sectionTitle: string,
  sectionContent?: string,
): string => {
  const trimmed = userText.trim()

  if (trimmed.length < TEACHBACKMINLENGTH) {
    return `Your explanation is a bit short (${trimmed.length} chars). Try to write at least ${TEACHBACKMINLENGTH} characters. Use your own words — explain what the concept is, how it works, and why it matters. This helps you really understand it!`
  }

  const sectionWords = new Set(
    sectionTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  )

  if (sectionContent) {
    sectionWords.add(
      ...sectionContent
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 5)
        .slice(0, 50),
    )
  }

  const userWords = userText.toLowerCase().split(/\s+/)
  let matchCount = 0
  for (const word of userWords) {
    if (sectionWords.has(word)) {
      matchCount++
    }
  }

  const keyTermOverlap = sectionWords.size > 0 ? matchCount / sectionWords.size : 0

  if (keyTermOverlap < TEACHBACKKEYTERMTHRESHOLD) {
    return `Good length! But try to use some of the key terms from the section title or content. Don't worry — explaining things in your own words is the hard part, and you're doing great!`
  }

  return `Amazing! You really understand this concept. Your explanation covers the key ideas and uses your own words — that's the best way to learn! Key terms used: ${Math.round(keyTermOverlap * 100)}%.`
}

export const generateSelfCheckQuestions = (
  sectionTitle: string,
  sectionId: string,
): Array<{
  id: string
  question: string
  options: string[]
  correctIndex: number
}> => {
  const words = sectionTitle.split(' ')
  const keyTerm = words.filter((w) => w.length > 4).slice(0, 5)[0] || sectionTitle

  return [
    {
      id: `${sectionId}-selfcheck-1`,
      question: `Can you briefly explain what "${sectionTitle}" covers?`,
      options: [
        'Yes, I can explain it well',
        'I have a general idea',
        'I need to review this topic',
        'I am not sure',
      ],
      correctIndex: 0,
    },
    {
      id: `${sectionId}-selfcheck-2`,
      question: `Which best describes your confidence with the key concept: "${keyTerm}"?`,
      options: [
        'I understand it clearly',
        'I recognize it but need practice',
        'I am still learning this',
        'This is new to me',
      ],
      correctIndex: 0,
    },
    {
      id: `${sectionId}-selfcheck-3`,
      question: 'How would you rate your understanding of this section?',
      options: [
        'Mastered — I could teach it',
        'Good — I understand the main ideas',
        'Partial — some parts are unclear',
        'Limited — I need to study more',
      ],
      correctIndex: 0,
    },
  ]
}
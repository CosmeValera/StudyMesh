import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  useStudyPathMasteryStore,
} from '../../../src/studyPathMastery/progressStore'
import {
  MASTERYPASSINGSCORE,
  scoreToStatus,
  isSectionUnlocked,
  getOverallMasteryPercent,
  getReviewQueue,
  getNextRecommendedStep,
  evaluateTeachBackLocally,
  generateSelfCheckQuestions,
  StudyPathSectionMasteryStatus,
} from '../../../src/studyPathMastery/types'

describe('studyPathMastery types', () => {
  describe('scoreToStatus', () => {
    it('returns mastered for score >= 70', () => {
      expect(scoreToStatus(70)).toBe('mastered')
      expect(scoreToStatus(100)).toBe('mastered')
      expect(scoreToStatus(85)).toBe('mastered')
    })

    it('returns needsReview for score < 70', () => {
      expect(scoreToStatus(69)).toBe('needsReview')
      expect(scoreToStatus(0)).toBe('needsReview')
      expect(scoreToStatus(50)).toBe('needsReview')
    })

    it('respects custom passing score', () => {
      expect(scoreToStatus(50, 40)).toBe('mastered')
      expect(scoreToStatus(30, 40)).toBe('needsReview')
    })
  })

  describe('isSectionUnlocked', () => {
    it('unlocks first section regardless of guided mode', () => {
      expect(isSectionUnlocked(0, 3, true)).toBe(true)
      expect(isSectionUnlocked(0, 3, false)).toBe(true)
    })

    it('unlocks all sections when guided mode is off', () => {
      expect(isSectionUnlocked(1, 3, false)).toBe(true)
      expect(isSectionUnlocked(2, 3, false)).toBe(true)
    })

    it('respects mastery status for unlocking', () => {
      expect(isSectionUnlocked(1, 3, true, 'mastered')).toBe(true)
      expect(isSectionUnlocked(1, 3, true, 'inProgress')).toBe(false)
      expect(isSectionUnlocked(1, 3, true, 'needsReview')).toBe(false)
      expect(isSectionUnlocked(1, 3, true, 'locked')).toBe(false)
    })
  })

  describe('getOverallMasteryPercent', () => {
    it('returns 0 for empty dashboards', () => {
      expect(getOverallMasteryPercent([], {})).toBe(0)
    })

    it('calculates correct percentage', () => {
      const dashboards = [
        { dashboardKey: 'd1' },
        { dashboardKey: 'd2' },
        { dashboardKey: 'd3' },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'mastered',
        d2: 'mastered',
        d3: 'notStarted',
      }
      expect(getOverallMasteryPercent(dashboards, statusMap)).toBe(67)
    })

    it('returns 100 when all mastered', () => {
      const dashboards = [
        { dashboardKey: 'd1' },
        { dashboardKey: 'd2' },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'mastered',
        d2: 'mastered',
      }
      expect(getOverallMasteryPercent(dashboards, statusMap)).toBe(100)
    })
  })

  describe('getReviewQueue', () => {
    it('returns empty when no sections need review', () => {
      const dashboards = [
        { dashboardKey: 'd1', name: 'S1' },
        { dashboardKey: 'd2', name: 'S2' },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'mastered',
        d2: 'inProgress',
      }
      expect(getReviewQueue(dashboards, statusMap)).toHaveLength(0)
    })

    it('returns sections needing review', () => {
      const dashboards = [
        { dashboardKey: 'd1', name: 'S1' },
        { dashboardKey: 'd2', name: 'S2' },
        { dashboardKey: 'd3', name: 'S3' },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'mastered',
        d2: 'needsReview',
        d3: 'needsReview',
      }
      const queue = getReviewQueue(dashboards, statusMap)
      expect(queue).toHaveLength(2)
      expect(queue[0].dashboardKey).toBe('d2')
      expect(queue[1].dashboardKey).toBe('d3')
    })
  })

  describe('getNextRecommendedStep', () => {
    it('returns completion message when all mastered', () => {
      const dashboards = [
        { dashboardKey: 'd1', name: 'S1', dashboardIndex: 1 },
        { dashboardKey: 'd2', name: 'S2', dashboardIndex: 2 },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'mastered',
        d2: 'mastered',
      }
      expect(getNextRecommendedStep(dashboards, statusMap)).toContain('mastered all sections')
    })

    it('suggests continuing when section is in progress', () => {
      const dashboards = [
        { dashboardKey: 'd1', name: 'S1', dashboardIndex: 1 },
        { dashboardKey: 'd2', name: 'S2', dashboardIndex: 2 },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'mastered',
        d2: 'inProgress',
      }
      expect(getNextRecommendedStep(dashboards, statusMap)).toContain('Continue')
    })

    it('suggests next section when none in progress', () => {
      const dashboards = [
        { dashboardKey: 'd1', name: 'First Section', dashboardIndex: 1 },
        { dashboardKey: 'd2', name: 'Second Section', dashboardIndex: 2 },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'notStarted',
        d2: 'locked',
      }
      const step = getNextRecommendedStep(dashboards, statusMap)
      expect(step).toContain('First Section')
    })

    it('suggests next section when a needsReview section exists', () => {
      const dashboards = [
        { dashboardKey: 'd1', name: 'S1', dashboardIndex: 1 },
        { dashboardKey: 'd2', name: 'S2', dashboardIndex: 2 },
      ]
      const statusMap: Record<string, StudyPathSectionMasteryStatus> = {
        d1: 'mastered',
        d2: 'needsReview',
      }
      expect(getNextRecommendedStep(dashboards, statusMap)).toContain('S2')
    })
  })

  describe('evaluateTeachBackLocally', () => {
    it('warns when explanation is too short', () => {
      const feedback = evaluateTeachBackLocally('Short.', 'Neural Networks')
      expect(feedback).toContain('short')
      expect(feedback).toContain(String(50))
    })

    it('provides positive feedback when explanation is good', () => {
      const explanation =
        'Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes called neurons that process information and learn from data through training.'
      const feedback = evaluateTeachBackLocally(explanation, 'Neural Networks')
      expect(feedback).toContain('Amazing')
    })

    it('suggests using key terms when overlap is low', () => {
      const explanation =
        'This is a very long explanation that does not use any specific terms from the section title or content. It just talks about things in a general way without any technical vocabulary.'
      const feedback = evaluateTeachBackLocally(explanation, 'Neural Networks')
      expect(feedback).toContain('key terms')
    })
  })

  describe('generateSelfCheckQuestions', () => {
    it('generates 3 questions', () => {
      const questions = generateSelfCheckQuestions('Machine Learning Basics', 'ml-1')
      expect(questions).toHaveLength(3)
    })

    it('includes correct options as first choice', () => {
      const questions = generateSelfCheckQuestions('Deep Learning', 'dl-1')
      questions.forEach((q) => {
        expect(q.correctIndex).toBe(0)
        expect(q.options).toHaveLength(4)
      })
    })

    it('uses section title in first question', () => {
      const questions = generateSelfCheckQuestions('Convolutional Networks', 'cnn-1')
      expect(questions[0].question).toContain('Convolutional Networks')
    })
  })
})

describe('studyPathMastery progressStore', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.clearAllMocks()
    vi.mocked(localStorage.getItem).mockImplementation(
      (key: string) => storage.get(key) || null,
    )
    vi.mocked(localStorage.setItem).mockImplementation(
      (key: string, value: string) => {
        storage.set(key, value)
      },
    )
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      storage.delete(key)
    })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const store = useStudyPathMasteryStore.getState()
    store.resetAllProgress()
  })

  it('initializes progress for a new study path', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-1', ['d1', 'd2', 'd3'])

    const progress = store.getProgress('path-1')
    expect(progress).toBeDefined()
    expect(progress?.pathId).toBe('path-1')
    expect(progress?.guidedMode).toBe(true)
    expect(progress?.activeSectionId).toBe('d1')
    expect(progress?.sections['d1'].status).toBe('notStarted')
    expect(progress?.sections['d2'].status).toBe('locked')
    expect(progress?.sections['d3'].status).toBe('locked')
  })

  it('does not re-initialize existing progress', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-2', ['d1', 'd2'])
    store.updateSectionStatus('path-2', 'd1', 'inProgress')

    store.initProgress('path-2', ['d1', 'd2', 'd3'])

    const progress = store.getProgress('path-2')
    expect(progress?.sections['d1'].status).toBe('inProgress')
  })

  it('updates section status', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-3', ['d1'])
    store.updateSectionStatus('path-3', 'd1', 'inProgress')

    const progress = store.getProgress('path-3')
    expect(progress?.sections['d1'].status).toBe('inProgress')
  })

  it('sets masteredAt when marking as mastered', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-4', ['d1'])
    store.updateSectionStatus('path-4', 'd1', 'mastered')

    const progress = store.getProgress('path-4')
    expect(progress?.sections['d1'].status).toBe('mastered')
    expect(progress?.sections['d1'].masteredAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('records quiz scores correctly', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-5', ['d1'])
    store.recordQuizScore('path-5', 'd1', 85)

    const progress = store.getProgress('path-5')
    expect(progress?.sections['d1'].quizAttempts).toBe(1)
    expect(progress?.sections['d1'].lastScore).toBe(85)
    expect(progress?.sections['d1'].bestScore).toBe(85)
  })

  it('updates best score only when new score is higher', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-6', ['d1'])
    store.recordQuizScore('path-6', 'd1', 60)
    store.recordQuizScore('path-6', 'd1', 85)
    store.recordQuizScore('path-6', 'd1', 70)

    const progress = store.getProgress('path-6')
    expect(progress?.sections['d1'].bestScore).toBe(85)
    expect(progress?.sections['d1'].lastScore).toBe(70)
    expect(progress?.sections['d1'].quizAttempts).toBe(3)
  })

  it('records teach back feedback', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-7', ['d1'])
    store.recordTeachBack('path-7', 'd1', 'Great explanation!')

    const progress = store.getProgress('path-7')
    expect(progress?.sections['d1'].teachBackAttempts).toBe(1)
    expect(progress?.sections['d1'].lastTeachBackFeedback).toBe('Great explanation!')
  })

  it('toggles guided mode', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-8', ['d1', 'd2'])
    expect(store.getProgress('path-8')?.guidedMode).toBe(true)

    store.setGuidedMode('path-8', false)
    expect(store.getProgress('path-8')?.guidedMode).toBe(false)
  })

  it('resets progress for a specific path', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-9', ['d1'])
    store.initProgress('path-10', ['d1'])

    store.resetProgress('path-9')

    expect(store.getProgress('path-9')).toBeUndefined()
    expect(store.getProgress('path-10')).toBeDefined()
  })

  it('resets all progress', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-11', ['d1'])
    store.initProgress('path-12', ['d1'])

    store.resetAllProgress()

    expect(store.getProgress('path-11')).toBeUndefined()
    expect(store.getProgress('path-12')).toBeUndefined()
  })

  it('sets active section', () => {
    const store = useStudyPathMasteryStore.getState()

    store.initProgress('path-13', ['d1', 'd2'])
    store.setActiveSection('path-13', 'd2')

    const progress = store.getProgress('path-13')
    expect(progress?.activeSectionId).toBe('d2')
  })
})
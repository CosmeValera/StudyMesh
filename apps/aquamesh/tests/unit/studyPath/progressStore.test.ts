import { act } from '@testing-library/react'
import { useStudyPathProgressStore } from '../../../../src/studyPath/progressStore'
import type { StudyPathSection } from '../../../../src/studyPath/types'

const mockSections: StudyPathSection[] = [
  {
    id: 'section-1',
    title: 'Introduction',
    content: 'Welcome to the course.',
    order: 1,
  },
  {
    id: 'section-2',
    title: 'Basics',
    content: 'Learn the fundamentals.',
    order: 2,
  },
  {
    id: 'section-3',
    title: 'Advanced Topics',
    content: 'Deep dive into complex subjects.',
    order: 3,
  },
]

describe('StudyPathProgressStore', () => {
  beforeEach(() => {
    const store = useStudyPathProgressStore.getState()
    act(() => {
      store.resetAllProgress()
    })
  })

  describe('initProgress', () => {
    it('should create progress for a new study path', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-1', mockSections)
      })

      const progress = store.getProgress('sp-1')
      expect(progress).toBeDefined()
      expect(progress?.studyPathId).toBe('sp-1')
      expect(progress?.sections).toHaveLength(3)
      expect(progress?.guidedMode).toBe(true)
      expect(progress?.activeSectionId).toBe('section-1')
    })

    it('should set first section as notStarted and rest as locked', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-2', mockSections)
      })

      const progress = store.getProgress('sp-2')
      expect(progress?.sections['section-1'].status).toBe('notStarted')
      expect(progress?.sections['section-2'].status).toBe('locked')
      expect(progress?.sections['section-3'].status).toBe('locked')
    })

    it('should not re-initialize existing progress', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-3', mockSections)
      })

      act(() => {
        store.updateSectionStatus('sp-3', 'section-1', 'inProgress')
      })

      act(() => {
        store.initProgress('sp-3', mockSections)
      })

      const progress = store.getProgress('sp-3')
      expect(progress?.sections['section-1'].status).toBe('inProgress')
    })
  })

  describe('updateSectionStatus', () => {
    it('should update section status', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-4', mockSections)
      })

      act(() => {
        store.updateSectionStatus('sp-4', 'section-1', 'inProgress')
      })

      const progress = store.getProgress('sp-4')
      expect(progress?.sections['section-1'].status).toBe('inProgress')
    })

    it('should set masteredAt when marking as mastered', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-5', mockSections)
      })

      act(() => {
        store.updateSectionStatus('sp-5', 'section-1', 'mastered')
      })

      const progress = store.getProgress('sp-5')
      expect(progress?.sections['section-1'].status).toBe('mastered')
      expect(progress?.sections['section-1'].masteredAt).toBeDefined()
    })

    it('should set lastReviewedAt when marking as inProgress', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-6', mockSections)
      })

      act(() => {
        store.updateSectionStatus('sp-6', 'section-1', 'inProgress')
      })

      const progress = store.getProgress('sp-6')
      expect(progress?.sections['section-1'].lastReviewedAt).toBeDefined()
    })
  })

  describe('recordQuizScore', () => {
    it('should record quiz score and update attempt count', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-7', mockSections)
      })

      act(() => {
        store.recordQuizScore('sp-7', 'section-1', 85)
      })

      const progress = store.getProgress('sp-7')
      expect(progress?.sections['section-1'].quizAttempts).toBe(1)
      expect(progress?.sections['section-1'].lastScore).toBe(85)
      expect(progress?.sections['section-1'].bestScore).toBe(85)
    })

    it('should update best score only when new score is higher', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-8', mockSections)
      })

      act(() => {
        store.recordQuizScore('sp-8', 'section-1', 60)
      })

      act(() => {
        store.recordQuizScore('sp-8', 'section-1', 85)
      })

      act(() => {
        store.recordQuizScore('sp-8', 'section-1', 70)
      })

      const progress = store.getProgress('sp-8')
      expect(progress?.sections['section-1'].bestScore).toBe(85)
      expect(progress?.sections['section-1'].lastScore).toBe(70)
      expect(progress?.sections['section-1'].quizAttempts).toBe(3)
    })
  })

  describe('recordTeachBack', () => {
    it('should record teach back feedback', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-9', mockSections)
      })

      act(() => {
        store.recordTeachBack('sp-9', 'section-1', 'Great explanation!')
      })

      const progress = store.getProgress('sp-9')
      expect(progress?.sections['section-1'].teachBackAttempts).toBe(1)
      expect(progress?.sections['section-1'].lastTeachBackFeedback).toBe('Great explanation!')
    })
  })

  describe('setActiveSection', () => {
    it('should update active section', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-10', mockSections)
      })

      act(() => {
        store.setActiveSection('sp-10', 'section-2')
      })

      const progress = store.getProgress('sp-10')
      expect(progress?.activeSectionId).toBe('section-2')
    })
  })

  describe('setGuidedMode', () => {
    it('should toggle guided mode', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-11', mockSections)
      })

      expect(store.getProgress('sp-11')?.guidedMode).toBe(true)

      act(() => {
        store.setGuidedMode('sp-11', false)
      })

      expect(store.getProgress('sp-11')?.guidedMode).toBe(false)
    })
  })

  describe('resetProgress', () => {
    it('should remove progress for a study path', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-12', mockSections)
      })

      expect(store.getProgress('sp-12')).toBeDefined()

      act(() => {
        store.resetProgress('sp-12')
      })

      expect(store.getProgress('sp-12')).toBeUndefined()
    })
  })

  describe('resetAllProgress', () => {
    it('should clear all progress', () => {
      const store = useStudyPathProgressStore.getState()

      act(() => {
        store.initProgress('sp-13', mockSections)
      })

      act(() => {
        store.initProgress('sp-14', mockSections)
      })

      act(() => {
        store.resetAllProgress()
      })

      expect(store.getProgress('sp-13')).toBeUndefined()
      expect(store.getProgress('sp-14')).toBeUndefined()
    })
  })
})
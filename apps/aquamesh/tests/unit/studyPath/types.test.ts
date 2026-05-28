import {
  StudyPathSectionMasteryStatus,
  StudyPathSectionProgress,
  StudyPathProgress,
  StudyPathSection,
  getOverallMasteryPercent,
  getReviewQueue,
  getNextRecommendedStep,
  isSectionUnlocked,
  scoreToStatus,
  evaluateTeachBackLocally,
  generateSelfCheckQuestions,
  MASTERYPASSINGSCORE,
  TEACHBACKMINLENGTH,
} from '../../../../src/studyPath/types'

describe('StudyPath types and helpers', () => {
  const mockSections: StudyPathSection[] = [
    {
      id: 'section-1',
      title: 'Introduction to Neural Networks',
      content: 'Neural networks are computing systems inspired by biological neural networks.',
      order: 1,
      quizQuestions: [
        {
          id: 'q1',
          question: 'What are neural networks?',
          options: ['A type of hardware', 'Computing systems inspired by biology', 'A programming language', 'A database'],
          correctAnswer: 1,
        },
      ],
    },
    {
      id: 'section-2',
      title: 'Architecture of Neural Networks',
      content: 'Neural networks consist of layers: input, hidden, and output layers.',
      order: 2,
    },
    {
      id: 'section-3',
      title: 'Training Neural Networks',
      content: 'Training involves adjusting weights to minimize the loss function.',
      order: 3,
    },
  ]

  describe('getOverallMasteryPercent', () => {
    it('should return 0 for empty sections array', () => {
      const progress = { studyPathId: 'sp1', sections: {}, guidedMode: true, updatedAt: '' }
      expect(getOverallMasteryPercent([], progress)).toBe(0)
    })

    it('should return 0 when no sections are mastered', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'notStarted', quizAttempts: 0, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(getOverallMasteryPercent(mockSections, progress)).toBe(0)
    })

    it('should return 33 when one of three sections is mastered', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 2, teachBackAttempts: 1, masteredAt: '2024-01-01' },
          'section-2': { sectionId: 'section-2', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(getOverallMasteryPercent(mockSections, progress)).toBe(33)
    })

    it('should return 67 when two of three sections are mastered', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'inProgress', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(getOverallMasteryPercent(mockSections, progress)).toBe(67)
    })

    it('should return 100 when all sections are mastered', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
        },
      }
      expect(getOverallMasteryPercent(mockSections, progress)).toBe(100)
    })
  })

  describe('getReviewQueue', () => {
    it('should return empty array when no sections need review', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'inProgress', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(getReviewQueue(mockSections, progress)).toHaveLength(0)
    })

    it('should return sections with needsReview status', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'needsReview', quizAttempts: 2, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'needsReview', quizAttempts: 1, teachBackAttempts: 0 },
        },
      }
      const queue = getReviewQueue(mockSections, progress)
      expect(queue).toHaveLength(2)
      expect(queue[0].id).toBe('section-2')
      expect(queue[1].id).toBe('section-3')
    })
  })

  describe('getNextRecommendedStep', () => {
    it('should return completion message when all mastered', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
        },
      }
      expect(getNextRecommendedStep(mockSections, progress)).toContain('mastered all sections')
    })

    it('should suggest continuing when a section is in progress', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'inProgress', quizAttempts: 0, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(getNextRecommendedStep(mockSections, progress)).toContain('Continue')
    })

    it('should suggest next unlocked section when none in progress', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'notStarted', quizAttempts: 0, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'notStarted', quizAttempts: 0, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      const suggestion = getNextRecommendedStep(mockSections, progress)
      expect(suggestion).toContain('section-1')
    })

    it('should suggest reviewing when some sections are mastered but none are in progress', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'needsReview', quizAttempts: 2, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      const suggestion = getNextRecommendedStep(mockSections, progress)
      expect(suggestion).toContain('Review')
    })
  })

  describe('isSectionUnlocked', () => {
    it('should return true for first section', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'notStarted', quizAttempts: 0, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(isSectionUnlocked('section-1', mockSections, progress)).toBe(true)
    })

    it('should return false when previous section is not mastered and guidedMode is on', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'inProgress', quizAttempts: 0, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(isSectionUnlocked('section-2', mockSections, progress)).toBe(false)
    })

    it('should return true when previous section is mastered', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: true,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'mastered', quizAttempts: 1, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(isSectionUnlocked('section-2', mockSections, progress)).toBe(true)
    })

    it('should return true for all sections when guidedMode is off', () => {
      const progress: StudyPathProgress = {
        studyPathId: 'sp1',
        guidedMode: false,
        updatedAt: '',
        sections: {
          'section-1': { sectionId: 'section-1', status: 'notStarted', quizAttempts: 0, teachBackAttempts: 0 },
          'section-2': { sectionId: 'section-2', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
          'section-3': { sectionId: 'section-3', status: 'locked', quizAttempts: 0, teachBackAttempts: 0 },
        },
      }
      expect(isSectionUnlocked('section-1', mockSections, progress)).toBe(true)
      expect(isSectionUnlocked('section-2', mockSections, progress)).toBe(true)
      expect(isSectionUnlocked('section-3', mockSections, progress)).toBe(true)
    })
  })

  describe('scoreToStatus', () => {
    it('should return mastered for score >= 70', () => {
      expect(scoreToStatus(70)).toBe('mastered')
      expect(scoreToStatus(85)).toBe('mastered')
      expect(scoreToStatus(100)).toBe('mastered')
    })

    it('should return needsReview for score < 70', () => {
      expect(scoreToStatus(69)).toBe('needsReview')
      expect(scoreToStatus(40)).toBe('needsReview')
      expect(scoreToStatus(0)).toBe('needsReview')
    })
  })

  describe('generateSelfCheckQuestions', () => {
    it('should generate 3 self-check questions when no quiz questions exist', () => {
      const section: StudyPathSection = {
        id: 'test-section',
        title: 'Machine Learning Basics',
        content: 'Machine learning is a subset of artificial intelligence.',
        order: 1,
      }
      const questions = generateSelfCheckQuestions(section)
      expect(questions).toHaveLength(3)
      expect(questions[0].id).toBe('test-section-selfcheck-1')
      expect(questions[1].id).toBe('test-section-selfcheck-2')
      expect(questions[2].id).toBe('test-section-selfcheck-3')
    })

    it('should include options for each question', () => {
      const section: StudyPathSection = {
        id: 'test-section',
        title: 'Deep Learning',
        content: 'Deep learning uses neural networks with many layers.',
        order: 1,
      }
      const questions = generateSelfCheckQuestions(section)
      questions.forEach(q => {
        expect(q.options).toBeDefined()
        expect(q.options!.length).toBeGreaterThan(0)
      })
    })
  })

  describe('evaluateTeachBackLocally', () => {
    const section: StudyPathSection = {
      id: 'test-section',
      title: 'Neural Networks',
      content: 'Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes.',
      order: 1,
    }

    it('should warn when explanation is too short', () => {
      const feedback = evaluateTeachBackLocally('Neural networks are cool.', section)
      expect(feedback).toContain('short')
      expect(feedback).toContain(String(TEACHBACKMINLENGTH))
    })

    it('should provide positive feedback when explanation is long enough and uses key terms', () => {
      const longExplanation = 'Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes that process information. These networks can learn patterns from data through training.'
      const feedback = evaluateTeachBackLocally(longExplanation, section)
      expect(feedback).toContain('Amazing')
      expect(feedback).toContain('key ideas')
    })

    it('should suggest using key terms when overlap is low despite length', () => {
      const explanation = 'This is a very long explanation that talks about many things but does not use the specific terminology from the section at all and just goes on and on about general concepts without any technical words.'
      const feedback = evaluateTeachBackLocally(explanation, section)
      expect(feedback).toContain('key terms')
      expect(feedback).toContain('section title')
    })
  })
})
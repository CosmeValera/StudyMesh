import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  StudyPathProgress,
  StudyPathSectionProgress,
  StudyPathSectionMasteryStatus,
  StudyPathSection,
} from './types'

interface StudyPathStoreState {
  progressMap: Record<string, StudyPathProgress>

  getProgress: (studyPathId: string) => StudyPathProgress | undefined

  initProgress: (studyPathId: string, sections: StudyPathSection[]) => void

  updateSectionStatus: (
    studyPathId: string,
    sectionId: string,
    status: StudyPathSectionMasteryStatus,
  ) => void

  recordQuizScore: (
    studyPathId: string,
    sectionId: string,
    score: number,
  ) => void

  recordTeachBack: (
    studyPathId: string,
    sectionId: string,
    feedback: string,
  ) => void

  setActiveSection: (studyPathId: string, sectionId: string) => void

  setGuidedMode: (studyPathId: string, enabled: boolean) => void

  resetProgress: (studyPathId: string) => void

  resetAllProgress: () => void
}

export const useStudyPathProgressStore = create<StudyPathStoreState>()(
  persist(
    (set, get) => ({
      progressMap: {},

      getProgress: (studyPathId: string) => {
        return get().progressMap[studyPathId]
      },

      initProgress: (studyPathId: string, sections: StudyPathSection[]) => {
        const existing = get().progressMap[studyPathId]
        if (existing) {
          return
        }

        const sectionsProgress: Record<string, StudyPathSectionProgress> = {}

        sections.forEach((section, index) => {
          sectionsProgress[section.id] = {
            sectionId: section.id,
            status: index === 0 ? 'notStarted' : 'locked',
            quizAttempts: 0,
            teachBackAttempts: 0,
          }
        })

        set(state => ({
          progressMap: {
            ...state.progressMap,
            [studyPathId]: {
              studyPathId,
              sections: sectionsProgress,
              activeSectionId: sections[0]?.id,
              guidedMode: true,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      updateSectionStatus: (
        studyPathId: string,
        sectionId: string,
        status: StudyPathSectionMasteryStatus,
      ) => {
        set(state => {
          const progress = state.progressMap[studyPathId]
          if (!progress) {
            return state
          }

          const sectionProgress = progress.sections[sectionId]
          if (!sectionProgress) {
            return state
          }

          const updatedSectionProgress: StudyPathSectionProgress = {
            ...sectionProgress,
            status,
            ...(status === 'mastered' && { masteredAt: new Date().toISOString() }),
          }

          if (status === 'inProgress') {
            updatedSectionProgress.lastReviewedAt = new Date().toISOString()
          }

          const updatedSections = {
            ...progress.sections,
            [sectionId]: updatedSectionProgress,
          }

          return {
            progressMap: {
              ...state.progressMap,
              [studyPathId]: {
                ...progress,
                sections: updatedSections,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      recordQuizScore: (
        studyPathId: string,
        sectionId: string,
        score: number,
      ) => {
        set(state => {
          const progress = state.progressMap[studyPathId]
          if (!progress) {
            return state
          }

          const sectionProgress = progress.sections[sectionId]
          if (!sectionProgress) {
            return state
          }

          return {
            progressMap: {
              ...state.progressMap,
              [studyPathId]: {
                ...progress,
                sections: {
                  ...progress.sections,
                  [sectionId]: {
                    ...sectionProgress,
                    quizAttempts: sectionProgress.quizAttempts + 1,
                    lastScore: score,
                    bestScore: Math.max(score, sectionProgress.bestScore ?? 0),
                    lastReviewedAt: new Date().toISOString(),
                  },
                },
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      recordTeachBack: (
        studyPathId: string,
        sectionId: string,
        feedback: string,
      ) => {
        set(state => {
          const progress = state.progressMap[studyPathId]
          if (!progress) {
            return state
          }

          const sectionProgress = progress.sections[sectionId]
          if (!sectionProgress) {
            return state
          }

          return {
            progressMap: {
              ...state.progressMap,
              [studyPathId]: {
                ...progress,
                sections: {
                  ...progress.sections,
                  [sectionId]: {
                    ...sectionProgress,
                    teachBackAttempts: sectionProgress.teachBackAttempts + 1,
                    lastTeachBackFeedback: feedback,
                    lastReviewedAt: new Date().toISOString(),
                  },
                },
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      setActiveSection: (studyPathId: string, sectionId: string) => {
        set(state => {
          const progress = state.progressMap[studyPathId]
          if (!progress) {
            return state
          }

          return {
            progressMap: {
              ...state.progressMap,
              [studyPathId]: {
                ...progress,
                activeSectionId: sectionId,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      setGuidedMode: (studyPathId: string, enabled: boolean) => {
        set(state => {
          const progress = state.progressMap[studyPathId]
          if (!progress) {
            return state
          }

          return {
            progressMap: {
              ...state.progressMap,
              [studyPathId]: {
                ...progress,
                guidedMode: enabled,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      resetProgress: (studyPathId: string) => {
        set(state => {
          const { [studyPathId]: _, ...rest } = state.progressMap
          return { progressMap: rest }
        })
      },

      resetAllProgress: () => {
        set({ progressMap: {} })
      },
    }),
    {
      name: 'studymesh-study-path-progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
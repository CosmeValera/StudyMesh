import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StudyPathSectionMasteryStatus } from './types'

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

export interface StudyPathMasteryProgress {
  pathId: string
  sections: Record<string, StudyPathSectionProgress>
  activeSectionId?: string
  guidedMode: boolean
  updatedAt: string
}

const STORAGE_KEY = 'studymesh-study-path-mastery-v1'

interface StudyPathMasteryStore {
  progressMap: Record<string, StudyPathMasteryProgress>

  getProgress: (pathId: string) => StudyPathMasteryProgress | undefined

  initProgress: (pathId: string, dashboardKeys: string[]) => void

  updateSectionStatus: (
    pathId: string,
    sectionId: string,
    status: StudyPathSectionMasteryStatus,
  ) => void

  recordQuizScore: (
    pathId: string,
    sectionId: string,
    score: number,
  ) => void

  recordTeachBack: (
    pathId: string,
    sectionId: string,
    feedback: string,
  ) => void

  setActiveSection: (pathId: string, sectionId: string) => void

  setGuidedMode: (pathId: string, enabled: boolean) => void

  resetProgress: (pathId: string) => void

  resetAllProgress: () => void
}

export const useStudyPathMasteryStore = create<StudyPathMasteryStore>()(
  persist(
    (set, get) => ({
      progressMap: {},

      getProgress: (pathId: string) => {
        return get().progressMap[pathId]
      },

      initProgress: (pathId: string, dashboardKeys: string[]) => {
        const existing = get().progressMap[pathId]
        if (existing) {
          return
        }

        const sections: Record<string, StudyPathSectionProgress> = {}
        dashboardKeys.forEach((key, index) => {
          sections[key] = {
            sectionId: key,
            status: index === 0 ? 'notStarted' : 'locked',
            quizAttempts: 0,
            teachBackAttempts: 0,
          }
        })

        set((state) => ({
          progressMap: {
            ...state.progressMap,
            [pathId]: {
              pathId,
              sections,
              activeSectionId: dashboardKeys[0],
              guidedMode: true,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      updateSectionStatus: (
        pathId: string,
        sectionId: string,
        status: StudyPathSectionMasteryStatus,
      ) => {
        set((state) => {
          const progress = state.progressMap[pathId]
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
              [pathId]: {
                ...progress,
                sections: updatedSections,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      recordQuizScore: (
        pathId: string,
        sectionId: string,
        score: number,
      ) => {
        set((state) => {
          const progress = state.progressMap[pathId]
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
              [pathId]: {
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
        pathId: string,
        sectionId: string,
        feedback: string,
      ) => {
        set((state) => {
          const progress = state.progressMap[pathId]
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
              [pathId]: {
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

      setActiveSection: (pathId: string, sectionId: string) => {
        set((state) => {
          const progress = state.progressMap[pathId]
          if (!progress) {
            return state
          }

          return {
            progressMap: {
              ...state.progressMap,
              [pathId]: {
                ...progress,
                activeSectionId: sectionId,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      setGuidedMode: (pathId: string, enabled: boolean) => {
        set((state) => {
          const progress = state.progressMap[pathId]
          if (!progress) {
            return state
          }

          return {
            progressMap: {
              ...state.progressMap,
              [pathId]: {
                ...progress,
                guidedMode: enabled,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        })
      },

      resetProgress: (pathId: string) => {
        set((state) => {
          const { [pathId]: _, ...rest } = state.progressMap
          return { progressMap: rest }
        })
      },

      resetAllProgress: () => {
        set({ progressMap: {} })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
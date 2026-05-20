import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  STUDYMESH_GUIDE_FOLDER_NAME,
  createStudyMeshGuideDashboards,
  ensureStarterDashboards,
  seedStudyMeshGuideStudyPath,
} from '../../../src/studyPack/studyMeshGuideSeed'

describe('StudyMesh guide seed', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
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
    vi.mocked(localStorage.clear).mockImplementation(() => storage.clear())
  })

  it('seeds the StudyMesh Guide only once so users can delete it', () => {
    expect(seedStudyMeshGuideStudyPath()).toBe(true)

    const dashboards = JSON.parse(
      window.localStorage.getItem('customDashboards') || '[]',
    )
    expect(dashboards).toHaveLength(3)
    expect(dashboards[0]).toMatchObject({
      folder: STUDYMESH_GUIDE_FOLDER_NAME,
      name: '01 - StudyMesh Basics: What It Is & Core Concepts',
    })

    window.localStorage.setItem('customDashboards', JSON.stringify([]))

    expect(seedStudyMeshGuideStudyPath()).toBe(false)
    expect(
      JSON.parse(window.localStorage.getItem('customDashboards') || '[]'),
    ).toEqual([])
  })

  it('lets Settings reinstall the guide explicitly', () => {
    window.localStorage.setItem(
      'customDashboards',
      JSON.stringify([
        { id: 'custom', name: 'My Notes', createdAt: '', updatedAt: '' },
      ]),
    )

    expect(seedStudyMeshGuideStudyPath()).toBe(false)
    expect(seedStudyMeshGuideStudyPath({ force: true })).toBe(true)

    const dashboards = JSON.parse(
      window.localStorage.getItem('customDashboards') || '[]',
    )
    expect(dashboards).toHaveLength(4)
    expect(
      dashboards.filter(
        (dashboard: { folder?: string }) =>
          dashboard.folder === STUDYMESH_GUIDE_FOLDER_NAME,
      ),
    ).toHaveLength(createStudyMeshGuideDashboards().length)
  })

  it('removes legacy starter dashboards without recreating them', () => {
    window.localStorage.setItem(
      'customDashboards',
      JSON.stringify([
        {
          id: 'math',
          name: 'Mathematics 1 - Derivatives',
          folder: 'Mathematics',
        },
        {
          id: 'grouping',
          name: 'Grouping Layout Tutorial',
          folder: 'Tutorial',
        },
        {
          id: 'own',
          name: 'Own Dashboard',
          folder: 'Mine',
        },
      ]),
    )

    ensureStarterDashboards()

    const dashboards = JSON.parse(
      window.localStorage.getItem('customDashboards') || '[]',
    )
    expect(dashboards).toEqual([
      {
        id: 'own',
        name: 'Own Dashboard',
        folder: 'Mine',
      },
    ])
  })
})

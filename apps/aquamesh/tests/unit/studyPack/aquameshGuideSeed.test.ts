import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AQUAMESH_GUIDE_FOLDER_NAME,
  createAquaMeshGuideDashboards,
  ensureStarterDashboards,
  seedAquaMeshGuideStudyPath,
} from '../../../src/studyPack/aquameshGuideSeed'

describe('AquaMesh guide seed', () => {
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

  it('seeds the AquaMesh Guide only once so users can delete it', () => {
    expect(seedAquaMeshGuideStudyPath()).toBe(true)

    const dashboards = JSON.parse(
      window.localStorage.getItem('customDashboards') || '[]',
    )
    expect(dashboards).toHaveLength(3)
    expect(dashboards[0]).toMatchObject({
      folder: AQUAMESH_GUIDE_FOLDER_NAME,
      name: '01 - AquaMesh Basics: What It Is & Core Concepts',
    })

    window.localStorage.setItem('customDashboards', JSON.stringify([]))

    expect(seedAquaMeshGuideStudyPath()).toBe(false)
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

    expect(seedAquaMeshGuideStudyPath()).toBe(false)
    expect(seedAquaMeshGuideStudyPath({ force: true })).toBe(true)

    const dashboards = JSON.parse(
      window.localStorage.getItem('customDashboards') || '[]',
    )
    expect(dashboards).toHaveLength(4)
    expect(
      dashboards.filter(
        (dashboard: { folder?: string }) =>
          dashboard.folder === AQUAMESH_GUIDE_FOLDER_NAME,
      ),
    ).toHaveLength(createAquaMeshGuideDashboards().length)
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

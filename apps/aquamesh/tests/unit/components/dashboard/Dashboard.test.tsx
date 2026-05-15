import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import Dashboards from '../../../../src/components/Dasboard/Dashboard'
import * as DashboardProviderModule from '../../../../src/components/Dasboard/DashboardProvider'
import * as WorkspaceActionsModule from '../../../../src/customHooks/useWorkspaceActions'
import * as LayoutProviderModule from '../../../../src/components/Layout/LayoutProvider'
import * as useTopNavBarWidgetsModule from '../../../../src/customHooks/useTopNavBarWidgets'

vi.mock('../../../../src/components/Dasboard/DashboardProvider', () => ({
  __esModule: true,
  useDashboards: vi.fn(),
}))

vi.mock('../../../../src/customHooks/useWorkspaceActions', () => ({
  __esModule: true,
  OPEN_DASHBOARD_EDITOR_EVENT: 'aquamesh-open-dashboard-editor',
  OPEN_WIDGET_EDITOR_EVENT: 'aquamesh-open-widget-editor',
  OPEN_STUDY_PACK_EVENT: 'aquamesh-open-study-pack',
  STARTER_STUDY_PATH_FOLDER_NAME: 'AquaMesh Starter Study Path',
  ensureStarterDashboards: vi.fn(),
  useWorkspaceActions: vi.fn(),
}))

vi.mock('../../../../src/components/Layout/LayoutProvider', () => ({
  __esModule: true,
  useLayout: vi.fn(),
}))

vi.mock('../../../../src/customHooks/useTopNavBarWidgets', () => ({
  __esModule: true,
  default: vi.fn(),
}))

vi.mock('../../../../src/components/Layout/Layout', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard-layout-view" />,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../../src/icons/add.svg', () => ({
  ReactComponent: () => <svg data-testid="add-icon" />,
}))

vi.mock('../../../../src/icons/close.svg', () => ({
  ReactComponent: () => <svg data-testid="close-icon" />,
}))

const navigateMock = vi.fn()
const openCreateWidgetMock = vi.fn()
const openCreateDashboardMock = vi.fn()
const openOperationsExampleMock = vi.fn()
const openWidgetMenuMock = vi.fn()

const createStarterStudyPathDashboard = (index: number) => ({
  id: `starter-lesson-${index}`,
  name: `AquaMesh Starter ${index}`,
  folder: 'AquaMesh Starter Study Path',
  layout: {
    type: 'row',
    children: [
      {
        type: 'tabset',
        children: [
          {
            type: 'tab',
            name: `AquaMesh Starter ${index}`,
            component: 'CustomWidget',
            config: {
              customProps: {
                components: [
                  {
                    id: `starter-progress-${index}`,
                    type: 'StudyPathProgressBlock',
                    props: {
                      studyPathId: 'aquamesh-starter-study-path',
                      studyPathTitle: 'AquaMesh Starter Study Path',
                      studyPathDashboardKey: `starter-${index}`,
                      studyPathDashboardName: `AquaMesh Starter ${index}`,
                      studyPathDashboardIndex: index,
                      studyPathDashboardCount: 2,
                      studyPathFolderName: 'AquaMesh Starter Study Path',
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  },
  createdAt: `2026-05-15T10:0${index}:00.000Z`,
  updatedAt: `2026-05-15T10:0${index}:00.000Z`,
})

const mockPhoneViewport = () => {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    matches: query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

const mockDashboardProvider = (
  overrides: Partial<ReturnType<typeof DashboardProviderModule.useDashboards>>,
) => {
  vi.mocked(DashboardProviderModule.useDashboards).mockReturnValue({
    openDashboards: [
      {
        id: 'dash1',
        name: 'Dashboard',
        layout: {
          type: 'row',
          children: [],
        },
      },
    ],
    selectedDashboard: 0,
    setSelectedDashboard: vi.fn(),
    removeDashboard: vi.fn(),
    addDashboard: vi.fn(),
    addDashboards: vi.fn(),
    addStudyPathContainer: vi.fn(),
    updateStudyPathContainer: vi.fn(),
    closeAllDashboards: vi.fn(),
    closeDashboardsToRight: vi.fn(),
    reorderDashboard: vi.fn(),
    replaceDashboard: vi.fn(),
    updateLayout: vi.fn(),
    updateDashboardLayout: vi.fn(),
    renameDashboard: vi.fn(),
    setDashboardEditing: vi.fn(),
    ...overrides,
  })
}

describe('Dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(window.matchMedia).mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    localStorage.getItem.mockImplementation((key: string) => {
      if (key === 'userData') {
        return JSON.stringify({
          id: 'admin',
          name: 'Admin User',
          role: 'ADMIN_ROLE',
        })
      }

      if (key === 'customDashboards') {
        return JSON.stringify([])
      }

      return null
    })
    vi.mocked(WorkspaceActionsModule.useWorkspaceActions).mockReturnValue({
      ensureDashboardAndAddComponent: vi.fn(),
      openCreateWidget: openCreateWidgetMock,
      openCreateDashboard: openCreateDashboardMock,
      openCreateStudyPack: vi.fn(),
      createStudyPackDashboard: vi.fn(),
      openOperationsExample: openOperationsExampleMock,
      openWidgetMenu: openWidgetMenuMock,
    })
    vi.mocked(LayoutProviderModule.useLayout).mockReturnValue({
      ref: { current: null },
      addComponent: vi.fn(),
    })
    vi.mocked(useTopNavBarWidgetsModule.default).mockReturnValue({
      topNavBarWidgets: [],
    })
  })

  it('shows dashboard workflow actions when the selected dashboard is empty', () => {
    mockDashboardProvider({})

    render(<Dashboards />)

    expect(
      screen.getByRole('heading', {
        name: /empty dashboard/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create dashboard/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /view daily operations example/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add saved widget/i }),
    ).not.toBeInTheDocument()
  })

  it('opens Create Dashboard when the empty workspace action is used', () => {
    mockDashboardProvider({
      openDashboards: [],
      selectedDashboard: -1,
    })

    render(<Dashboards />)

    fireEvent.click(screen.getByRole('button', { name: /create dashboard/i }))

    expect(
      screen.getAllByText('Create Dashboard').length,
    ).toBeGreaterThanOrEqual(1)
    expect(openCreateWidgetMock).not.toHaveBeenCalled()
    expect(openOperationsExampleMock).not.toHaveBeenCalled()
    expect(openWidgetMenuMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('opens the default starter Study Path on first empty workspace load', async () => {
    const addStudyPathContainer = vi.fn()
    const starterDashboards = [
      createStarterStudyPathDashboard(1),
      createStarterStudyPathDashboard(2),
    ]

    localStorage.getItem.mockImplementation((key: string) => {
      if (key === 'userData') {
        return JSON.stringify({
          id: 'admin',
          name: 'Admin User',
          role: 'ADMIN_ROLE',
        })
      }

      if (key === 'customDashboards') {
        return JSON.stringify(starterDashboards)
      }

      return null
    })

    mockDashboardProvider({ addStudyPathContainer })

    render(<Dashboards />)

    await waitFor(() => expect(addStudyPathContainer).toHaveBeenCalled())
    expect(addStudyPathContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: 'aquamesh-starter-study-path',
        title: 'AquaMesh Starter Study Path',
        dashboards: expect.arrayContaining([
          expect.objectContaining({ name: 'AquaMesh Starter 1' }),
          expect.objectContaining({ name: 'AquaMesh Starter 2' }),
        ]),
      }),
    )
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'aquamesh-default-study-path-opened-v1',
      'true',
    )
  })

  it('keeps Create Dashboard builder actions reachable on phones', () => {
    mockPhoneViewport()
    mockDashboardProvider({
      openDashboards: [],
      selectedDashboard: -1,
    })

    render(<Dashboards />)

    fireEvent.click(screen.getByRole('button', { name: /create dashboard/i }))

    expect(screen.getByText('New Dashboard')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^saved$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /widgets/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /edit dashboard details/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /close dashboard editor/i }),
    ).toBeInTheDocument()
  })

  it('adds generated Study Path review dashboards to the open Course navigator', () => {
    const addDashboard = vi.fn()
    const setSelectedDashboard = vi.fn()
    const updateStudyPathContainer = vi.fn()
    const reviewLayout = {
      type: 'row',
      children: [
        {
          type: 'tabset',
          children: [
            {
              type: 'tab',
              name: 'Review missed exercises',
              component: 'CustomWidget',
              config: {
                customProps: {
                  studyPathId: 'french-b1',
                  studyPathTitle: 'French B1',
                  studyPathDashboardKey: 'study-path-review-french-b1',
                  studyPathDashboardName: 'Review missed exercises',
                  studyPathDashboardIndex: 6,
                  studyPathDashboardCount: 6,
                  studyPathFolderName: 'French B1',
                },
              },
            },
          ],
        },
      ],
    }

    mockDashboardProvider({
      addDashboard,
      setSelectedDashboard,
      updateStudyPathContainer,
      openDashboards: [
        {
          id: 'study-path-tab',
          name: 'French B1',
          kind: 'studyPathContainer',
          studyPath: {
            pathId: 'french-b1',
            title: 'French B1',
            folderName: 'French B1',
            selectedIndex: 4,
            dashboards: [1, 2, 3, 4, 5].map((index) => ({
              id: `lesson-${index}`,
              name: `Lesson ${index}`,
              layout: { type: 'row', children: [] },
              dashboardKey: `french-b1-${index}`,
              dashboardIndex: index,
              dashboardCount: 5,
              folderName: 'French B1',
            })),
          },
        },
      ],
      selectedDashboard: 0,
    })

    render(<Dashboards />)

    act(() => {
      window.dispatchEvent(
        new CustomEvent('aquamesh-open-study-path-review-dashboard', {
          detail: {
            dashboard: {
              id: 'study-path-review-french-b1',
              name: 'French B1 - Review missed exercises',
              layout: reviewLayout,
              createdAt: '2026-05-15T00:00:00.000Z',
              updatedAt: '2026-05-15T00:00:00.000Z',
            },
          },
        }),
      )
    })

    expect(addDashboard).not.toHaveBeenCalled()
    expect(setSelectedDashboard).toHaveBeenCalledWith(0)
    expect(updateStudyPathContainer).toHaveBeenCalledWith(
      'study-path-tab',
      expect.any(Function),
    )

    const updater = updateStudyPathContainer.mock.calls[0][1]
    const updatedStudyPath = updater({
      pathId: 'french-b1',
      title: 'French B1',
      folderName: 'French B1',
      selectedIndex: 4,
      dashboards: [1, 2, 3, 4, 5].map((index) => ({
        id: `lesson-${index}`,
        name: `Lesson ${index}`,
        layout: { type: 'row', children: [] },
        dashboardKey: `french-b1-${index}`,
        dashboardIndex: index,
        dashboardCount: 5,
        folderName: 'French B1',
      })),
    })

    expect(updatedStudyPath.selectedIndex).toBe(5)
    expect(updatedStudyPath.dashboards).toHaveLength(6)
    expect(updatedStudyPath.dashboards[5]).toMatchObject({
      dashboardKey: 'study-path-review-french-b1',
      name: 'French B1 - Review missed exercises',
      dashboardIndex: 6,
    })
  })

  it('disables Update in Create Dashboard when the saved dashboard has no changes', () => {
    const savedLayout = {
      type: 'row',
      children: [
        {
          type: 'tabset',
          children: [
            {
              type: 'tab',
              name: 'Pump Widget',
              component: 'CustomWidget',
            },
          ],
        },
      ],
    }

    localStorage.getItem.mockImplementation((key: string) => {
      if (key === 'userData') {
        return JSON.stringify({
          id: 'admin',
          name: 'Admin User',
          role: 'ADMIN_ROLE',
        })
      }

      if (key === 'customDashboards') {
        return JSON.stringify([
          {
            id: 'saved-dashboard-1',
            name: 'Operations',
            layout: savedLayout,
            createdAt: '2026-05-06T00:00:00.000Z',
            updatedAt: '2026-05-06T00:00:00.000Z',
          },
        ])
      }

      return null
    })
    mockDashboardProvider({
      openDashboards: [
        {
          id: 'dash1',
          name: 'Operations',
          layout: savedLayout,
        },
      ],
      selectedDashboard: 0,
    })

    render(<Dashboards />)

    fireEvent.click(
      screen.getByRole('button', { name: /edit dashboard operations/i }),
    )

    expect(screen.getByRole('button', { name: /^update$/i })).toBeDisabled()
  })
})

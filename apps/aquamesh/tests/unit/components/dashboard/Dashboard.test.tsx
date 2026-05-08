import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

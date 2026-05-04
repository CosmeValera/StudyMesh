import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dashboards from '../../../../src/components/Dasboard/Dashboard'
import * as DashboardProviderModule from '../../../../src/components/Dasboard/DashboardProvider'
import * as WorkspaceActionsModule from '../../../../src/customHooks/useWorkspaceActions'

vi.mock('../../../../src/components/Dasboard/DashboardProvider', () => ({
  __esModule: true,
  useDashboards: vi.fn(),
}))

vi.mock('../../../../src/customHooks/useWorkspaceActions', () => ({
  __esModule: true,
  useWorkspaceActions: vi.fn(),
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
const openOperationsExampleMock = vi.fn()
const openWidgetMenuMock = vi.fn()

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
    updateLayout: vi.fn(),
    updateDashboardLayout: vi.fn(),
    renameDashboard: vi.fn(),
    ...overrides,
  })
}

describe('Dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      openOperationsExample: openOperationsExampleMock,
      openWidgetMenu: openWidgetMenuMock,
    })
  })

  it('shows Daily Operations actions when the selected dashboard is empty', () => {
    mockDashboardProvider({})

    render(<Dashboards />)

    expect(
      screen.getByRole('heading', {
        name: /build your daily operations dashboard/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create daily operations widget/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /view daily operations example/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add saved widget/i }),
    ).toBeInTheDocument()
  })

  it('shows the same Daily Operations actions when no dashboard is open', () => {
    mockDashboardProvider({
      openDashboards: [],
      selectedDashboard: -1,
    })

    render(<Dashboards />)

    fireEvent.click(
      screen.getByRole('button', { name: /create daily operations widget/i }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: /view daily operations example/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /add saved widget/i }))
    fireEvent.click(screen.getByRole('button', { name: /open quick guide/i }))

    expect(openCreateWidgetMock).toHaveBeenCalledTimes(1)
    expect(openOperationsExampleMock).toHaveBeenCalledTimes(1)
    expect(openWidgetMenuMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})

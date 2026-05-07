import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TopNavBar from '../../../../src/components/topnavbar/TopNavBar'
import * as useTopNavBarWidgetsModule from '../../../../src/customHooks/useTopNavBarWidgets'
import * as LayoutProviderModule from '../../../../src/components/Layout/LayoutProvider'
import * as DashboardProviderModule from '../../../../src/components/Dasboard/DashboardProvider'
import { OPEN_DASHBOARD_EDITOR_EVENT } from '../../../../src/customHooks/useWorkspaceActions'
import { AQUAMESH_ONBOARDING_RESET_EVENT } from '../../../../src/components/onboarding/onboardingEvents'

// Mock custom hooks and providers
vi.mock('../../../../src/customHooks/useTopNavBarWidgets', () => ({
  __esModule: true,
  default: vi.fn(),
}))

vi.mock('../../../../src/components/Layout/LayoutProvider', () => ({
  __esModule: true,
  useLayout: vi.fn(),
}))

vi.mock('../../../../src/components/Dasboard/DashboardProvider', () => ({
  __esModule: true,
  useDashboards: vi.fn(),
}))

// Mock child components
vi.mock('../../../../src/components/Dasboard/DashboardOptionsMenu', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="dashboard-options-menu">Dashboard Options Menu</div>
  ),
}))

vi.mock('../../../../src/components/WidgetEditor/WidgetEditor', () => ({
  __esModule: true,
  default: () => <div data-testid="widget-editor">Widget Editor</div>,
}))

vi.mock('../../../../src/components/shared/ThemeModeToggle', () => ({
  __esModule: true,
  default: () => <div data-testid="theme-mode-toggle" />,
}))

vi.mock('../../../../src/theme/AccentColorPicker', () => ({
  __esModule: true,
  default: () => <div data-testid="accent-color-picker" />,
}))

// Mock SVG import
vi.mock('../../../../public/logo.svg', () => ({
  ReactComponent: () => <svg data-testid="logo">Logo</svg>,
}))

// Mock useWidgetManager hook
vi.mock(
  '../../../../src/components/WidgetEditor/hooks/useWidgetManager',
  () => ({
    __esModule: true,
    default: () => ({
      widgets: [],
      isWidgetManagementOpen: false,
      openWidgetManagement: vi.fn(),
      closeWidgetManagement: vi.fn(),
      previewWidget: vi.fn(),
      editWidget: vi.fn(),
      deleteWidget: vi.fn(),
    }),
  }),
)

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const navigateMock = vi.fn()

describe('TopNavBar Component', () => {
  const addDashboardMock = vi.fn()
  const updateDashboardLayoutMock = vi.fn()
  const addComponentMock = vi.fn()

  // Setup common mocks before each test
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup localStorage mock
    localStorage.getItem.mockReturnValue(
      JSON.stringify({ id: 'admin', name: 'Admin User', role: 'ADMIN_ROLE' }),
    )

    // Setup useTopNavBarWidgets mock
    vi.mocked(useTopNavBarWidgetsModule.default).mockReturnValue({
      topNavBarWidgets: [
        {
          name: 'Standard Widgets',
          items: [
            { name: 'Chart Widget', component: 'ChartWidget' },
            { name: 'Data Table', component: 'DataTable' },
          ],
        },
        {
          name: 'Custom Widgets',
          items: [
            {
              name: 'My Custom Widget',
              component: 'CustomWidget',
              customProps: { widgetId: '123' },
            },
          ],
        },
      ],
    })

    // Setup useLayout mock
    vi.mocked(LayoutProviderModule.useLayout).mockReturnValue({
      ref: {
        current: {
          props: {
            model: { getActiveTabset: vi.fn(), getFirstTabSet: vi.fn() },
          },
          doAction: vi.fn(),
        },
      },
      addComponent: addComponentMock,
    })

    // Setup useDashboards mock
    vi.mocked(DashboardProviderModule.useDashboards).mockReturnValue({
      openDashboards: [
        {
          id: 'dash1',
          name: 'Dashboard',
          layout: {
            type: 'row',
            children: [
              {
                type: 'tabset',
                children: [
                  {
                    type: 'tab',
                    name: 'Existing Widget',
                    component: 'ExistingWidget',
                  },
                ],
              },
            ],
          },
        },
      ],
      selectedDashboard: 0,
      setSelectedDashboard: vi.fn(),
      removeDashboard: vi.fn(),
      addDashboard: addDashboardMock,
      updateLayout: vi.fn(),
      updateDashboardLayout: updateDashboardLayoutMock,
      renameDashboard: vi.fn(),
    })
  })

  it('renders correctly with all navigation items', () => {
    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    // Verify main elements are rendered
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-options-menu')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create widget/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create dashboard/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTitle('Open tutorial')).not.toBeInTheDocument()
    expect(
      screen.queryByTitle('Frequently Asked Questions'),
    ).not.toBeInTheDocument()
  })

  it('renders the AquaMesh logo', () => {
    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('opens Create Widget when Create Widget button is clicked', async () => {
    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /create widget/i }))

    expect(await screen.findByTestId('widget-editor')).toBeInTheDocument()
  })

  it('dispatches the dashboard builder event when Create Dashboard is clicked', () => {
    const dashboardEditorListener = vi.fn()
    window.addEventListener(
      OPEN_DASHBOARD_EDITOR_EVENT,
      dashboardEditorListener,
    )

    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /create dashboard/i }))

    expect(dashboardEditorListener).toHaveBeenCalledTimes(1)
    window.removeEventListener(
      OPEN_DASHBOARD_EDITOR_EVENT,
      dashboardEditorListener,
    )
  })

  it('replays the workspace tutorial from application settings', async () => {
    const resetListener = vi.fn()
    window.addEventListener(AQUAMESH_ONBOARDING_RESET_EVENT, resetListener)

    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Admin User Builder mode/i }),
    )
    fireEvent.click(await screen.findByText('Settings'))
    fireEvent.click(await screen.findByRole('button', { name: /^replay$/i }))

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'aquamesh-workspace-onboarding-v1',
      JSON.stringify({
        status: 'active',
        stepId: 'create-dashboard',
      }),
    )
    expect(resetListener).toHaveBeenCalledTimes(1)

    window.removeEventListener(AQUAMESH_ONBOARDING_RESET_EVENT, resetListener)
  })

  it('navigates to the landing page when logout is clicked', async () => {
    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    // Click on the user menu button (avatar)
    const userButton = screen.getByRole('button', {
      name: /Admin User Builder mode/i,
    })
    fireEvent.click(userButton)

    // Click on logout option in the menu
    await waitFor(() => {
      fireEvent.click(screen.getByText('Logout'))
    })

    // Verify navigation to login page
    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})

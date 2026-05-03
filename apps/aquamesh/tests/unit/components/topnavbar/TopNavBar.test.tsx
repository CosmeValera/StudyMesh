import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TopNavBar from '../../../../src/components/topnavbar/TopNavBar'
import * as useTopNavBarWidgetsModule from '../../../../src/customHooks/useTopNavBarWidgets'
import * as LayoutProviderModule from '../../../../src/components/Layout/LayoutProvider'
import * as DashboardProviderModule from '../../../../src/components/Dasboard/DashboardProvider'

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

vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/WidgetManagementModal',
  () => ({
    __esModule: true,
    default: ({ open, onClose }) => (
      <div
        data-testid="widget-management-modal"
        data-open={open}
        onClick={onClose}
      >
        Widget Management Modal
      </div>
    ),
  }),
)

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
      screen.getByRole('button', { name: /add widget/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create widget/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTitle('Open tutorial')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Frequently Asked Questions')).not.toBeInTheDocument()
  })

  it('navigates home when the logo is clicked', () => {
    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByTestId('logo'))

    expect(navigateMock).toHaveBeenCalledWith('/')
  })

  it('opens add widget menu when Add Widget button is clicked', async () => {
    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    // Click on the Add Widget button
    fireEvent.click(screen.getByRole('button', { name: /add widget/i }))

    // Check if the menu items appear
    await waitFor(() => {
      expect(screen.getByText('Saved Widgets')).toBeInTheDocument()
      expect(screen.getByText('Example Operations Widgets')).toBeInTheDocument()
    })
  })

  it('opens create widget when Create Widget button is clicked', () => {
    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    // Get the mocked addComponent function
    // Click on the Create Widget button
    fireEvent.click(screen.getByRole('button', { name: /create widget/i }))

    // Verify the addComponent function was called with the correct arguments
    expect(addComponentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Create Widget',
        component: 'WidgetEditor',
      }),
    )
  })

  it('navigates to login page when logout is clicked', async () => {
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
    expect(navigateMock).toHaveBeenCalledWith('/login')
  })

  it('adds a dashboard if none exists when adding a widget', () => {
    // Mock openDashboards as empty to test this behavior
    vi.mocked(DashboardProviderModule.useDashboards).mockReturnValue({
      openDashboards: [],
      selectedDashboard: 0,
      setSelectedDashboard: vi.fn(),
      removeDashboard: vi.fn(),
      addDashboard: addDashboardMock,
      updateLayout: vi.fn(),
      updateDashboardLayout: updateDashboardLayoutMock,
      renameDashboard: vi.fn(),
    })

    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    // Click on the Add Widget button
    fireEvent.click(screen.getByRole('button', { name: /add widget/i }))

    // Click on a widget in the menu
    fireEvent.click(screen.getByText('Chart Widget'))

    // Verify addDashboard was called
    expect(addDashboardMock).toHaveBeenCalledWith({
      name: 'Dashboard',
      layout: expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                name: 'Chart Widget',
                component: 'ChartWidget',
              }),
            ]),
          }),
        ]),
      }),
    })

    expect(addComponentMock).not.toHaveBeenCalled()
  })

  it('initializes a blank dashboard when adding a widget', () => {
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
      addDashboard: addDashboardMock,
      updateLayout: vi.fn(),
      updateDashboardLayout: updateDashboardLayoutMock,
      renameDashboard: vi.fn(),
    })

    render(
      <BrowserRouter>
        <TopNavBar />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /add widget/i }))
    fireEvent.click(screen.getByText('Chart Widget'))

    expect(updateDashboardLayoutMock).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                name: 'Chart Widget',
                component: 'ChartWidget',
              }),
            ]),
          }),
        ]),
      }),
    )
    expect(addComponentMock).not.toHaveBeenCalled()
  })
})

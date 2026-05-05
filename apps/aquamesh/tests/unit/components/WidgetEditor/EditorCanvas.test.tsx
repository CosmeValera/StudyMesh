/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'
import EditorCanvas from '../../../../src/components/WidgetEditor/components/core/EditorCanvas'
import { ComponentData } from '../../../../src/components/WidgetEditor/types/types'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.mock(
  '../../../../src/components/WidgetEditor/components/preview/ComponentPreview',
  () => ({
    __esModule: true,
    default: ({ component }: { component: ComponentData }) => (
      <div data-testid="component-preview">{component.type}</div>
    ),
  }),
)

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

const renderEditorCanvas = (
  overrides: Partial<React.ComponentProps<typeof EditorCanvas>> = {},
) => {
  const props: React.ComponentProps<typeof EditorCanvas> = {
    editMode: true,
    widgetData: {
      name: 'New Widget',
      components: [],
    },
    setWidgetData: vi.fn(),
    dropAreaRef: React.createRef<HTMLDivElement>(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
    isDragging: false,
    dropTarget: { id: null, isHovering: false },
    handleEditComponent: vi.fn(),
    handleDeleteComponent: vi.fn(),
    handleMoveComponent: vi.fn(),
    handleAddInsideFieldset: vi.fn(),
    handleToggleVisibility: vi.fn(),
    handleContainerDragEnter: vi.fn(),
    handleContainerDragOver: vi.fn(),
    handleContainerDragLeave: vi.fn(),
    handleContainerDrop: vi.fn(),
    handleToggleFieldsetCollapse: vi.fn(),
    showSidebar: true,
    handleWidgetNameChange: vi.fn(),
    onAddStarterComponent: vi.fn(),
    onStartOperationsWidget: vi.fn(),
    onUseTemplate: vi.fn(),
    ...overrides,
  }

  render(
    <ThemeProvider theme={theme}>
      <EditorCanvas {...props} />
    </ThemeProvider>,
  )

  return props
}

describe('EditorCanvas first-widget guide', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps widget naming in a compact editable canvas header', () => {
    const props = renderEditorCanvas({
      widgetData: {
        name: 'Daily Operations',
        components: [],
      },
    })

    expect(screen.getByText('Widget name')).toBeInTheDocument()
    expect(screen.getByLabelText('Widget name')).toHaveValue('Daily Operations')
    expect(
      screen.getByText('Shown in dashboards and your saved widget library.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Widget name'), {
      target: { value: 'Ops Overview' },
    })

    expect(props.handleWidgetNameChange).toHaveBeenCalledWith('Ops Overview')
  })

  it('keeps first-time naming clear when the title is empty', () => {
    renderEditorCanvas({
      widgetData: {
        name: '',
        components: [],
      },
    })

    expect(screen.getByPlaceholderText('Name this widget')).toBeInTheDocument()
    expect(screen.getByText('Required before saving.')).toBeInTheDocument()
  })

  it('shows the saved widget title without edit chrome in view mode', () => {
    renderEditorCanvas({
      editMode: false,
      widgetData: {
        name: 'Service Desk Summary',
        components: [],
      },
    })

    expect(screen.getByText('Service Desk Summary')).toBeInTheDocument()
    expect(screen.queryByTestId('widget-name-input')).not.toBeInTheDocument()
  })

  it('shows starter actions for an empty editable widget', () => {
    renderEditorCanvas()

    expect(
      screen.getByText('Build a Daily Operations widget'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /daily operations template/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /tickets chart/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /status text/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /team note/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /browse templates/i }),
    ).toBeInTheDocument()
  })

  it('uses existing starter handlers', () => {
    const props = renderEditorCanvas()

    fireEvent.click(
      screen.getByRole('button', { name: /daily operations template/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /tickets chart/i }))
    fireEvent.click(screen.getByRole('button', { name: /status text/i }))
    fireEvent.click(screen.getByRole('button', { name: /team note/i }))
    fireEvent.click(screen.getByRole('button', { name: /browse templates/i }))

    expect(props.onStartOperationsWidget).toHaveBeenCalledTimes(1)
    expect(props.onAddStarterComponent).toHaveBeenNthCalledWith(1, 'Chart')
    expect(props.onAddStarterComponent).toHaveBeenNthCalledWith(2, 'Label')
    expect(props.onAddStarterComponent).toHaveBeenNthCalledWith(3, 'TextField')
    expect(props.onUseTemplate).toHaveBeenCalledTimes(1)
  })

  it('hides the guide once the widget has components', () => {
    renderEditorCanvas({
      widgetData: {
        name: 'New Widget',
        components: [
          {
            id: 'label-1',
            type: 'Label',
            props: { text: 'Status' },
          },
        ],
      },
    })

    expect(
      screen.queryByText('Build a Daily Operations widget'),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('component-preview')).toHaveTextContent('Label')
  })

  it('keeps the drop prompt visible while dragging over an empty widget', () => {
    renderEditorCanvas({ isDragging: true })

    expect(
      screen.queryByText('Build a Daily Operations widget'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Drop it into your widget')).toBeInTheDocument()
  })

  it('keeps the canvas ready without duplicating the choose-step guidance', () => {
    renderEditorCanvas({
      onboardingActive: true,
      onboardingStep: 'choose',
    })

    expect(
      screen.queryByTestId('widget-editor-drop-coach'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('This is the widget canvas'),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('widget-editor-drop-area')).toBeInTheDocument()
  })

  it('uses the standard canvas prompt while the guided drag is active', () => {
    renderEditorCanvas({
      isDragging: true,
      onboardingActive: true,
      onboardingStep: 'choose',
    })

    expect(screen.getByText('Drop it into your widget')).toBeInTheDocument()
    expect(screen.queryByText(/^Step 2$/)).not.toBeInTheDocument()
  })

  it('shows the edit and save guidance after the first component exists', () => {
    renderEditorCanvas({
      onboardingActive: true,
      onboardingStep: 'save',
      widgetData: {
        name: 'New Widget',
        components: [
          {
            id: 'label-1',
            type: 'Label',
            props: { text: 'Status' },
          },
        ],
      },
    })

    expect(screen.getByTestId('widget-editor-save-coach')).toHaveTextContent(
      'Step 2: tune it, then save it',
    )
    expect(
      screen.queryByRole('button', { name: /show again/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /got it/i }),
    ).not.toBeInTheDocument()
  })
})

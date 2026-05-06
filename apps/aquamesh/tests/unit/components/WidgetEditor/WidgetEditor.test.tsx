/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import WidgetEditor from '../../../../src/components/WidgetEditor/WidgetEditor'

const hookStateRef = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))

vi.mock(
  '../../../../src/components/WidgetEditor/hooks/useWidgetEditor',
  () => ({
    useWidgetEditor: () => hookStateRef.current,
  }),
)

vi.mock(
  '../../../../src/components/WidgetEditor/components/core/EditorToolbar',
  () => ({
    __esModule: true,
    default: ({
      editMode,
      viewMode,
      isUpdating,
      setShowSettingsModal,
    }: {
      editMode: boolean
      viewMode: string
      isUpdating: boolean
      setShowSettingsModal: (show: boolean) => void
    }) => (
      <div
        data-testid="editor-toolbar"
        data-edit-mode={editMode ? 'true' : 'false'}
        data-view-mode={viewMode}
        data-is-updating={isUpdating ? 'true' : 'false'}
      >
        <button
          type="button"
          data-testid="mock-editor-settings"
          onClick={() => setShowSettingsModal(true)}
        >
          Settings
        </button>
      </div>
    ),
  }),
)

vi.mock(
  '../../../../src/components/WidgetEditor/components/core/ComponentPalette',
  () => ({
    __esModule: true,
    default: ({
      handleDragStart,
      onboardingStep,
    }: {
      handleDragStart: (
        event: React.DragEvent<HTMLDivElement>,
        type: string,
      ) => void
      onboardingStep: string | null
    }) => (
      <div
        data-testid="component-palette"
        data-onboarding-step={onboardingStep}
      >
        <div
          data-testid="palette-drag-source"
          draggable
          onDragStart={(event) => handleDragStart(event, 'Label')}
        />
      </div>
    ),
  }),
)

vi.mock(
  '../../../../src/components/WidgetEditor/components/core/EditorCanvas',
  () => ({
    __esModule: true,
    default: () => <div data-testid="editor-canvas" />,
  }),
)

vi.mock('../../../../src/components/WidgetEditor/CustomWidget', () => ({
  __esModule: true,
  default: ({ components }: { components: Array<{ type: string }> }) => (
    <div data-testid="custom-widget-preview">
      {components.map((component) => component.type).join(',')}
    </div>
  ),
}))

vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/EditComponentDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/SavedWidgetsDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/TemplateSelectionDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/ExportImportDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/WidgetVersioningDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/ComponentSearchDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/SettingsDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/DeleteConfirmationDialog',
  () => ({ __esModule: true, default: () => null }),
)
vi.mock(
  '../../../../src/components/WidgetEditor/components/dialogs/SaveWidgetDialog',
  () => ({ __esModule: true, default: () => null }),
)
const createHookState = (viewMode: 'both' | 'edit' | 'preview' = 'both') => ({
  widgetData: {
    name: 'Operations',
    components: [{ id: 'label-1', type: 'Label', props: { text: 'Status' } }],
  },
  setWidgetData: vi.fn(),
  editMode: viewMode !== 'preview',
  viewMode,
  setViewMode: vi.fn(),
  savedWidgets: [],
  showWidgetList: false,
  setShowWidgetList: vi.fn(),
  editDialogOpen: false,
  currentEditComponent: null,
  dropTarget: { id: null, isHovering: false },
  dropAreaRef: React.createRef<HTMLDivElement>(),
  isDragging: false,
  showSettingsModal: false,
  setShowSettingsModal: vi.fn(),
  showTooltips: true,
  setShowTooltips: vi.fn(),
  showDeleteConfirmation: true,
  setShowDeleteConfirmation: vi.fn(),
  showComponentPaletteHelp: true,
  setShowComponentPaletteHelp: vi.fn(),
  deleteConfirmOpen: false,
  showDeleteWidgetConfirmation: true,
  setShowDeleteWidgetConfirmation: vi.fn(),
  showDeleteDashboardConfirmation: true,
  setShowDeleteDashboardConfirmation: vi.fn(),
  showAdvancedInToolbar: false,
  setShowAdvancedInToolbar: vi.fn(),
  showDeleteTemplateConfirmation: true,
  setShowDeleteTemplateConfirmation: vi.fn(),
  requireNameEntryOnSave: false,
  setRequireNameEntryOnSave: vi.fn(),
  handleDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
  handleContainerDragEnter: vi.fn(),
  handleContainerDragLeave: vi.fn(),
  handleContainerDragOver: vi.fn(),
  handleContainerDrop: vi.fn(),
  handleAddInsideFieldset: vi.fn(),
  handleDrop: vi.fn(),
  handleDragOver: vi.fn(),
  handleDeleteComponent: vi.fn(),
  handleEditComponent: vi.fn(),
  handleSaveComponent: vi.fn(),
  handleMoveComponent: vi.fn(),
  handleSaveWidget: vi.fn(),
  handleLoadWidget: vi.fn(),
  handleDeleteSavedWidget: vi.fn(),
  handleToggleVisibility: vi.fn(),
  handleToggleFieldsetCollapse: vi.fn(),
  confirmDeleteComponent: vi.fn(),
  cancelDeleteComponent: vi.fn(),
  confirmDeleteSavedWidget: vi.fn(),
  componentToDelete: null,
  widgetToDelete: null,
  handleUndo: vi.fn(),
  handleRedo: vi.fn(),
  canUndo: false,
  canRedo: false,
  setEditDialogOpen: vi.fn(),
  handleWidgetNameChange: vi.fn(),
  loadSavedWidgets: vi.fn(),
  editorId: 'editor-1',
  handleDirectAdd: vi.fn(),
  activeContainerId: null,
  setActiveContainerId: vi.fn(),
})

describe('WidgetEditor view modes', () => {
  beforeEach(() => {
    hookStateRef.current = createHookState()
    vi.clearAllMocks()
  })

  it('defaults to both panes with edit chrome and live preview', () => {
    render(<WidgetEditor />)

    expect(screen.getByTestId('editor-toolbar')).toHaveAttribute(
      'data-view-mode',
      'both',
    )
    expect(screen.getByTestId('component-palette')).toBeInTheDocument()
    expect(screen.getByTestId('editor-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('custom-widget-preview')).toHaveTextContent(
      'Label',
    )
  })

  it('hides edit chrome in preview-only mode', () => {
    hookStateRef.current = createHookState('preview')

    render(<WidgetEditor />)

    expect(screen.getByTestId('editor-toolbar')).toHaveAttribute(
      'data-edit-mode',
      'false',
    )
    expect(screen.queryByTestId('component-palette')).not.toBeInTheDocument()
    expect(screen.queryByTestId('editor-canvas')).not.toBeInTheDocument()
    expect(screen.getByTestId('custom-widget-preview')).toBeInTheDocument()
  })

  it('keeps step 1 mounted when starting a guided drag', () => {
    hookStateRef.current = {
      ...createHookState(),
      widgetData: {
        name: 'Operations',
        components: [],
      },
    }

    render(<WidgetEditor />)

    fireEvent.dragStart(screen.getByTestId('palette-drag-source'))

    expect(hookStateRef.current.handleDragStart).toHaveBeenCalledWith(
      expect.anything(),
      'Label',
    )
    expect(screen.getByTestId('component-palette')).toHaveAttribute(
      'data-onboarding-step',
      'choose',
    )
  })

  it('treats a new default-name widget as a save even when New Widget already exists', () => {
    hookStateRef.current = {
      ...createHookState(),
      widgetData: {
        name: 'New Widget',
        components: [
          { id: 'label-1', type: 'Label', props: { text: 'Status' } },
        ],
      },
      savedWidgets: [
        {
          id: 'saved-widget-1',
          name: 'New Widget',
          components: [
            { id: 'label-2', type: 'Label', props: { text: 'Saved' } },
          ],
          createdAt: '2026-05-06T00:00:00.000Z',
          updatedAt: '2026-05-06T00:00:00.000Z',
          category: 'Other',
          tags: [],
          description: '',
          version: '1.0',
          author: '',
        },
      ],
    }

    render(<WidgetEditor />)

    expect(screen.getByTestId('editor-toolbar')).toHaveAttribute(
      'data-is-updating',
      'false',
    )
  })

  it('wires the toolbar settings action to the editor settings state', () => {
    render(<WidgetEditor />)

    fireEvent.click(screen.getByTestId('mock-editor-settings'))

    expect(hookStateRef.current.setShowSettingsModal).toHaveBeenCalledWith(true)
  })
})

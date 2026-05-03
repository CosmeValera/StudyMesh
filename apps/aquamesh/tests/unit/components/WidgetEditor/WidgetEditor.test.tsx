/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import WidgetEditor from '../../../../src/components/WidgetEditor/WidgetEditor'

const hookStateRef = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))

vi.mock('../../../../src/components/WidgetEditor/hooks/useWidgetEditor', () => ({
  useWidgetEditor: () => hookStateRef.current,
}))

vi.mock(
  '../../../../src/components/WidgetEditor/components/core/EditorToolbar',
  () => ({
    __esModule: true,
    default: ({
      editMode,
      viewMode,
    }: {
      editMode: boolean
      viewMode: string
    }) => (
      <div
        data-testid="editor-toolbar"
        data-edit-mode={editMode ? 'true' : 'false'}
        data-view-mode={viewMode}
      />
    ),
  }),
)

vi.mock(
  '../../../../src/components/WidgetEditor/components/core/ComponentPalette',
  () => ({
    __esModule: true,
    default: () => <div data-testid="component-palette" />,
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
vi.mock(
  '../../../../src/components/WidgetEditor/components/ui/NotificationSystem',
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
  notification: { open: false, message: '', severity: 'success' },
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
  handleCloseNotification: vi.fn(),
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
})

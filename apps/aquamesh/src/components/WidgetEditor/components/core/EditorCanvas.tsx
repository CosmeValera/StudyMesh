import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import InputIcon from '@mui/icons-material/Input'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import { ComponentData, DropTarget } from '../../types/types'
import ComponentPreview from '../preview/ComponentPreview'

interface EditorCanvasProps {
  editMode: boolean
  widgetData: {
    name: string
    components: ComponentData[]
    id?: string
    createdAt?: number
    updatedAt?: number
    version?: string
  }
  dropAreaRef: React.RefObject<HTMLDivElement>
  handleDrop: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragEnd: () => void
  isDragging: boolean
  dropTarget: DropTarget
  handleEditComponent: (id: string) => void
  handleDeleteComponent: (id: string) => void
  handleMoveComponent: (id: string, direction: 'up' | 'down') => void
  handleAddInsideFieldset: (parentId: string) => void
  handleToggleVisibility: (id: string) => void
  handleContainerDragEnter: (e: React.DragEvent, containerId: string) => void
  handleContainerDragOver: (e: React.DragEvent) => void
  handleContainerDragLeave: (e: React.DragEvent) => void
  handleContainerDrop: (e: React.DragEvent, containerId: string) => void
  /** Toggle collapse for FieldSet components */
  handleToggleFieldsetCollapse: (id: string) => void
  showSidebar: boolean
  activeContainerId?: string | null
  onSelectContainer?: (containerId: string) => void
  onAddStarterComponent?: (componentType: string) => void
  onStartOperationsWidget?: () => void
  onUseTemplate?: () => void
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  editMode,
  widgetData,
  dropAreaRef,
  handleDrop,
  handleDragOver,
  handleDragEnd,
  isDragging,
  dropTarget,
  handleEditComponent,
  handleDeleteComponent,
  handleMoveComponent,
  handleAddInsideFieldset,
  handleToggleVisibility,
  handleContainerDragEnter,
  handleContainerDragOver,
  handleContainerDragLeave,
  handleContainerDrop,
  handleToggleFieldsetCollapse,
  showSidebar,
  activeContainerId,
  onSelectContainer,
  onAddStarterComponent,
  onStartOperationsWidget,
  onUseTemplate,
}) => {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))

  // Render the component hierarchy
  const renderComponents = (components: ComponentData[]) => {
    return components.map((component, index) => (
      <ComponentPreview
        key={component.id}
        component={component}
        onEdit={handleEditComponent}
        onDelete={handleDeleteComponent}
        onMoveUp={(id) => handleMoveComponent(id, 'up')}
        onMoveDown={(id) => handleMoveComponent(id, 'down')}
        onAddInside={handleAddInsideFieldset}
        onToggleCollapse={handleToggleFieldsetCollapse}
        onToggleVisibility={handleToggleVisibility}
        isFirst={index === 0}
        isLast={index === components.length - 1}
        editMode={editMode}
        isDragging={isDragging}
        dropTarget={dropTarget}
        handleContainerDragEnter={handleContainerDragEnter}
        handleContainerDragOver={handleContainerDragOver}
        handleContainerDragLeave={handleContainerDragLeave}
        handleContainerDrop={handleContainerDrop}
        showWidgetName={editMode}
        activeContainerId={activeContainerId}
        onSelectContainer={onSelectContainer}
      />
    ))
  }

  return (
    <Box
      sx={{
        flex: 1,
        p: isPhone ? 1 : 2,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        bgcolor: 'background.default',
        transition: 'width 0.3s ease',
        width: '100%',
      }}
    >
      {/* Drop area */}
      <Paper
        ref={dropAreaRef}
        data-testid="widget-editor-drop-area"
        sx={{
          flex: 1,
          p: isPhone ? 1 : 2,
          backgroundColor: editMode
            ? dropTarget.id === null && isDragging
              ? 'action.selected'
              : 'background.accentSurface'
            : 'background.paper',
          border: editMode ? '2px dashed' : '1px solid',
          outline: 'none',
          borderColor: editMode ? 'primary.light' : 'divider',
          outlineOffset: 3,
          borderRadius: 1,
          minHeight: isPhone ? 150 : 200,
          overflowY: 'auto',
          color: 'text.primary',
          boxShadow: 'none',
          transition: 'background-color 0.2s',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {widgetData.components.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'text.primary',
              pt: isPhone ? 2 : 4,
              pb: isPhone ? 2 : 4,
              px: isPhone ? 0.5 : 2,
            }}
          >
            {editMode && !isDragging ? (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 680,
                  p: isPhone ? 1.5 : 2,
                  border: '1px solid',
                  borderColor: 'primary.light',
                  borderRadius: 1,
                  bgcolor: 'background.accentSoft',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.12)',
                }}
              >
                <Stack spacing={isPhone ? 1.25 : 1.5}>
                  <Box>
                    <Typography
                      variant={isPhone ? 'subtitle1' : 'h6'}
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        mb: 0.5,
                      }}
                    >
                      Build your first reusable widget
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: isPhone ? '0.78rem' : undefined,
                      }}
                    >
                      {isPhone
                        ? 'Start from a working operations summary, then save it for dashboards.'
                        : 'Start from a working operations summary, or drag any block from the palette.'}
                    </Typography>
                  </Box>

                  <Stack
                    direction={isPhone ? 'column' : 'row'}
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DashboardCustomizeIcon />}
                      onClick={onStartOperationsWidget}
                      disabled={!onStartOperationsWidget}
                      sx={{ borderRadius: 1, textTransform: 'none' }}
                    >
                      Daily Operations widget
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AutoGraphIcon />}
                      onClick={() => onAddStarterComponent?.('Chart')}
                      disabled={!onAddStarterComponent}
                      sx={{
                        display: { xs: 'none', sm: 'inline-flex' },
                        borderRadius: 1,
                        textTransform: 'none',
                        color: 'primary.dark',
                        borderColor: 'primary.dark',
                      }}
                    >
                      Chart block
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TextFieldsIcon />}
                      onClick={() => onAddStarterComponent?.('Label')}
                      disabled={!onAddStarterComponent}
                      sx={{
                        borderRadius: 1,
                        textTransform: 'none',
                        color: 'primary.dark',
                        borderColor: 'primary.dark',
                      }}
                    >
                      Status text
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<InputIcon />}
                      onClick={() => onAddStarterComponent?.('TextField')}
                      disabled={!onAddStarterComponent}
                      sx={{
                        display: { xs: 'none', sm: 'inline-flex' },
                        borderRadius: 1,
                        textTransform: 'none',
                        color: 'primary.dark',
                        borderColor: 'primary.dark',
                      }}
                    >
                      Notes field
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<ViewModuleIcon />}
                      onClick={onUseTemplate}
                      disabled={!onUseTemplate}
                      sx={{
                        display: { xs: 'none', sm: 'inline-flex' },
                        borderRadius: 1,
                        textTransform: 'none',
                        color: 'primary.dark',
                      }}
                    >
                      Browse templates
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Typography
                variant={isPhone ? 'body2' : 'body1'}
                sx={{
                  mb: 1,
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: isPhone ? '0.85rem' : undefined,
                }}
              >
                {editMode
                  ? isDragging
                    ? 'Drop it into your widget'
                    : showSidebar
                      ? 'Add text, inputs, buttons, charts, and layout containers. Save it to reuse in any dashboard.'
                      : 'Open the building blocks panel to add text, inputs, buttons, charts, and layout containers.'
                  : 'This widget has no saved content yet'}
              </Typography>
            )}
          </Box>
        ) : (
          renderComponents(widgetData.components)
        )}
      </Paper>
    </Box>
  )
}

export default EditorCanvas

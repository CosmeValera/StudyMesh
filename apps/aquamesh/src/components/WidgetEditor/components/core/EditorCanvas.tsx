import React from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
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
  setWidgetData: React.Dispatch<
    React.SetStateAction<{
      name: string
      components: ComponentData[]
      id?: string
      createdAt?: number
      updatedAt?: number
      version?: string
    }>
  >
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
  handleWidgetNameChange?: (name: string) => void
  activeContainerId?: string | null
  onSelectContainer?: (containerId: string) => void
  onAddStarterComponent?: (componentType: string) => void
  onStartOperationsWidget?: () => void
  onUseTemplate?: () => void
  onboardingActive?: boolean
  onboardingStep?: 'choose' | 'drop' | 'save' | null
  onRestartOnboarding?: () => void
  onSkipOnboarding?: () => void
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  editMode,
  widgetData,
  setWidgetData,
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
  handleWidgetNameChange,
  activeContainerId,
  onSelectContainer,
  onAddStarterComponent,
  onStartOperationsWidget,
  onUseTemplate,
  onboardingActive = false,
  onboardingStep = null,
  onRestartOnboarding,
  onSkipOnboarding,
}) => {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))

  const showOnboardingDropPrompt =
    editMode &&
    onboardingActive &&
    widgetData.components.length === 0 &&
    (onboardingStep === 'choose' || onboardingStep === 'drop')

  const showOnboardingSavePrompt =
    editMode &&
    onboardingActive &&
    widgetData.components.length > 0 &&
    onboardingStep === 'save'

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
      {/* Widget name field */}
      {editMode ? (
        <TextField
          label="Widget Name"
          value={widgetData.name}
          onChange={(e) =>
            handleWidgetNameChange
              ? handleWidgetNameChange(e.target.value)
              : setWidgetData((prev) => ({ ...prev, name: e.target.value }))
          }
          margin="normal"
          variant="outlined"
          size="small"
          data-testid="widget-name-input"
          onFocus={(e) => {
            e.target.select()
          }}
          sx={{
            mb: isPhone ? 1 : 2,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
              '&:hover fieldset': {
                borderColor: 'primary.light',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'foreground.contrastSecondary',
              fontSize: isPhone ? '0.8rem' : undefined,
            },
            '& .MuiOutlinedInput-input': {
              color: 'foreground.contrastPrimary',
              padding: isPhone ? '8px 10px' : undefined,
              fontSize: isPhone ? '0.875rem' : undefined,
            },
          }}
        />
      ) : (
        <Typography
          variant="body1"
          sx={{
            mb: isPhone ? 1 : 2,
            fontSize: isPhone ? '0.875rem' : undefined,
            color: 'foreground.contrastPrimary',
            userSelect: 'none', // Prevent text selection in view mode
          }}
        >
          <strong>Widget Name:</strong> {widgetData.name}
        </Typography>
      )}

      {showOnboardingSavePrompt && (
        <Paper
          data-testid="widget-editor-save-coach"
          sx={{
            mb: isPhone ? 1 : 1.5,
            p: isPhone ? 1.25 : 1.5,
            border: '1px solid rgba(0, 188, 162, 0.36)',
            borderRadius: 1,
            bgcolor: 'rgba(0, 188, 162, 0.08)',
            boxShadow: 'none',
          }}
        >
          <Stack
            direction={isPhone ? 'column' : 'row'}
            spacing={1}
            alignItems={isPhone ? 'flex-start' : 'center'}
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'foreground.contrastPrimary',
                  fontWeight: 700,
                  mb: 0.25,
                }}
              >
                Step 3: tune it, then save it
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'foreground.contrastSecondary',
                  fontSize: isPhone ? '0.78rem' : undefined,
                }}
              >
                Select the block to change its label, data, colors, or layout.
                Save the Daily Operations widget when it is ready to reuse in
                dashboards.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {onRestartOnboarding && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onRestartOnboarding}
                  sx={{ borderRadius: 1, textTransform: 'none' }}
                >
                  Show again
                </Button>
              )}
              {onSkipOnboarding && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={onSkipOnboarding}
                  sx={{ borderRadius: 1, textTransform: 'none' }}
                >
                  Got it
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Drop area */}
      <Paper
        ref={dropAreaRef}
        data-testid="widget-editor-drop-area"
        sx={{
          flex: 1,
          p: isPhone ? 1 : 2,
          backgroundColor: editMode
            ? dropTarget.id === null && isDragging
              ? 'rgba(0, 188, 162, 0.1)'
              : 'rgba(0, 188, 162, 0.05)'
            : 'rgba(0, 188, 162, 0.02)',
          border: editMode
            ? '2px dashed rgba(0, 188, 162, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          outline: showOnboardingDropPrompt
            ? '3px solid rgba(0, 188, 162, 0.36)'
            : 'none',
          outlineOffset: 3,
          borderRadius: 1,
          minHeight: isPhone ? 150 : 200,
          overflowY: 'auto',
          color: 'foreground.contrastPrimary',
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
              color: 'foreground.contrastPrimary',
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
                  border: '1px solid rgba(0, 188, 162, 0.28)',
                  borderRadius: 1,
                  bgcolor: 'rgba(0, 188, 162, 0.08)',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.12)',
                }}
              >
                <Stack spacing={isPhone ? 1.25 : 1.5}>
                  {showOnboardingDropPrompt && (
                    <Box
                      data-testid="widget-editor-drop-coach"
                      sx={{
                        p: isPhone ? 1 : 1.25,
                        border: '1px solid rgba(0, 188, 162, 0.42)',
                        borderRadius: 1,
                        bgcolor: 'rgba(0, 188, 162, 0.12)',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: 'primary.light',
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        {onboardingStep === 'drop' ? 'Step 2' : 'Your target'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'foreground.contrastPrimary',
                          fontSize: isPhone ? '0.78rem' : undefined,
                        }}
                      >
                        {onboardingStep === 'drop'
                          ? 'Release the block inside this panel to place it in your Daily Operations widget.'
                          : 'This is the widget canvas. Drag one block from the left to start the Daily Operations summary.'}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography
                      variant={isPhone ? 'subtitle1' : 'h6'}
                      sx={{
                        fontWeight: 700,
                        color: 'foreground.contrastPrimary',
                        mb: 0.5,
                      }}
                    >
                      Build a Daily Operations widget
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'foreground.contrastSecondary',
                        fontSize: isPhone ? '0.78rem' : undefined,
                      }}
                    >
                      Track orders today, delayed tasks, support tickets, and
                      system status without writing code.
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
                      Start from Daily Operations
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AutoGraphIcon />}
                      onClick={() => onAddStarterComponent?.('Chart')}
                      disabled={!onAddStarterComponent}
                      sx={{ borderRadius: 1, textTransform: 'none' }}
                    >
                      Add tickets chart
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TextFieldsIcon />}
                      onClick={() => onAddStarterComponent?.('Label')}
                      disabled={!onAddStarterComponent}
                      sx={{ borderRadius: 1, textTransform: 'none' }}
                    >
                      Add status text
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<InputIcon />}
                      onClick={() => onAddStarterComponent?.('TextField')}
                      disabled={!onAddStarterComponent}
                      sx={{ borderRadius: 1, textTransform: 'none' }}
                    >
                      Add team note
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<ViewModuleIcon />}
                      onClick={onUseTemplate}
                      disabled={!onUseTemplate}
                      sx={{ borderRadius: 1, textTransform: 'none' }}
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
                    ? onboardingActive && onboardingStep === 'drop'
                      ? 'Release it here to add your first Daily Operations block'
                      : 'Drop it into your widget'
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

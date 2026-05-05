import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Box,
  useTheme,
  useMediaQuery,
  alpha,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import EditIcon from '@mui/icons-material/Edit'
import PreviewIcon from '@mui/icons-material/Preview'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import SettingsIcon from '@mui/icons-material/Settings'
import SaveIcon from '@mui/icons-material/Save'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import TemplateIcon from '@mui/icons-material/Dashboard'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import HistoryIcon from '@mui/icons-material/History'
import SearchIcon from '@mui/icons-material/Search'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VersionWarningDialog from '../dialogs/VersionWarningDialog'
import TooltipStyled from '../../../../components/TooltipStyled'
import { WidgetEditorViewMode } from '../../types/types'

interface EditorToolbarProps {
  editMode: boolean
  viewMode: WidgetEditorViewMode
  showSidebar: boolean
  toggleSidebar: () => void
  setViewMode: (mode: WidgetEditorViewMode) => void
  handleSaveWidget: (isMajorUpdate?: boolean) => void
  setShowWidgetList: (show: boolean) => void
  setShowSettingsModal: (show: boolean) => void
  isUpdating: boolean
  handleUndo?: () => void
  handleRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  hasChanges?: boolean
  isEmpty?: boolean
  showTemplateDialog: boolean
  setShowTemplateDialog: (show: boolean) => void
  showExportImportDialog: boolean
  setShowExportImportDialog: (show: boolean) => void
  handleOpenVersioningDialog: () => void
  handleOpenSearchDialog?: () => void
  widgetHasComponents?: boolean
  isLatestVersion?: boolean
  currentWidgetVersion?: string
  showAdvancedInToolbar?: boolean
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editMode,
  viewMode,
  showSidebar,
  toggleSidebar,
  setViewMode,
  handleSaveWidget,
  setShowWidgetList,
  setShowSettingsModal,
  isUpdating,
  handleUndo,
  handleRedo,
  canUndo = false,
  canRedo = false,
  hasChanges = true,
  isEmpty = false,
  setShowTemplateDialog,
  setShowExportImportDialog,
  handleOpenVersioningDialog,
  handleOpenSearchDialog,
  widgetHasComponents = false,
  isLatestVersion = true,
  currentWidgetVersion = '1.0',
  showAdvancedInToolbar = false,
}) => {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const [advancedMenuAnchor, setAdvancedMenuAnchor] =
    useState<null | HTMLElement>(null)
  const [showVersionWarning, setShowVersionWarning] = useState(false)

  const handleAdvancedMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAdvancedMenuAnchor(event.currentTarget)
  }

  const handleAdvancedMenuClose = () => {
    setAdvancedMenuAnchor(null)
  }

  const handleSaveButtonClick = () => {
    if (!isLatestVersion && isUpdating) {
      // If not on the latest version and trying to update, show warning
      setShowVersionWarning(true)
    } else {
      // Otherwise proceed normally
      handleSaveWidget(false)
    }
  }

  const handleVersionWarningConfirm = () => {
    setShowVersionWarning(false)
    handleSaveWidget(false) // Regular save after warning
  }

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextMode: WidgetEditorViewMode | null,
  ) => {
    if (nextMode) {
      setViewMode(nextMode)
    }
  }

  return (
    <>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        className="widget-editor-toolbar"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor:
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.9)
              : '#FCFDFD',
          minHeight: isPhone ? 48 : 64,
        }}
      >
        <Toolbar
          variant={isPhone ? 'dense' : 'regular'}
          sx={{
            minHeight: isPhone ? 48 : 64,
            padding: isPhone ? '0px 2px' : '0px 16px',
            gap: isPhone ? 0.25 : 0,
            overflow: 'hidden',
          }}
        >
          {editMode && (
            <IconButton
              edge={isPhone ? false : 'start'}
              color="inherit"
              aria-label="menu"
              onClick={toggleSidebar}
              sx={{
                mr: isPhone ? 0.25 : 2,
                ml: isPhone ? 0.5 : -1.5,
                p: isPhone ? 0.5 : 1,
                color: showSidebar
                  ? 'primary.main'
                  : 'foreground.contrastSecondary',
                justifyContent: 'flex-start',
              }}
            >
              <MenuIcon
                sx={{
                  fontSize: isPhone ? '1.25rem' : '1.5rem',
                  ml: 0,
                }}
              />
            </IconButton>
          )}

          {!isDesktop && (
            <Box
              sx={{
                flexGrow: 1,
                color: 'foreground.contrastPrimary',
              }}
            ></Box>
          )}
          {isDesktop && (
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                color: 'foreground.contrastPrimary',
              }}
            >
              Create Widget
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            {/* Undo/Redo buttons */}
            {!!handleUndo && !!handleRedo && (
              <>
                <TooltipStyled title="Undo (Ctrl+Z)">
                  <span>
                    <IconButton
                      color="inherit"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      sx={{
                        mr: 1,
                        fontSize: isPhone ? '1.25rem' : '1.5rem',
                        maxWidth: isPhone ? '20px' : '48px',
                        maxHeight: isPhone ? '20px' : '40px',
                        color: canUndo
                          ? 'foreground.contrastSecondary'
                          : 'action.disabled',
                      }}
                    >
                      <UndoIcon
                        sx={{ fontSize: isPhone ? '1.25rem' : '1.5rem' }}
                      />
                    </IconButton>
                  </span>
                </TooltipStyled>

                <TooltipStyled title="Redo (Ctrl+Y)">
                  <span>
                    <IconButton
                      color="inherit"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      sx={{
                        mr: 1,
                        fontSize: isPhone ? '1.25rem' : '1.5rem',
                        maxWidth: isPhone ? '20px' : '48px',
                        maxHeight: isPhone ? '20px' : '40px',
                        color: canRedo
                          ? 'foreground.contrastSecondary'
                          : 'action.disabled',
                      }}
                    >
                      <RedoIcon
                        sx={{ fontSize: isPhone ? '1.25rem' : '1.5rem' }}
                      />
                    </IconButton>
                  </span>
                </TooltipStyled>

                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{
                    mx: isPhone ? 0.5 : 1,
                    height: '24px',
                    alignSelf: 'center',
                  }}
                />
              </>
            )}

            <ToggleButtonGroup
              exclusive
              value={viewMode}
              onChange={handleViewModeChange}
              aria-label="Widget editor view mode"
              size="small"
              sx={{
                mr: isPhone ? 0.5 : 1,
                height: isPhone ? 30 : 34,
                '& .MuiToggleButton-root': {
                  minWidth: isPhone ? 34 : 86,
                  px: isPhone ? 0.5 : 1,
                  py: 0,
                  gap: 0.5,
                  color: 'foreground.contrastSecondary',
                  borderColor: alpha(theme.palette.divider, 0.6),
                  textTransform: 'none',
                  fontSize: isPhone ? '0.7rem' : '0.8rem',
                  lineHeight: 1,
                  '&.Mui-selected': {
                    color: 'primary.dark',
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.18),
                  },
                },
              }}
            >
              {!isPhone && (
                <ToggleButton value="both" aria-label="Both view">
                  <ViewColumnIcon sx={{ fontSize: '1.15rem' }} />
                  Both
                </ToggleButton>
              )}
              <ToggleButton value="edit" aria-label="Edit view">
                <EditIcon sx={{ fontSize: isPhone ? '1rem' : '1.15rem' }} />
                {!isPhone && 'Edit'}
              </ToggleButton>
              <ToggleButton value="preview" aria-label="Preview view">
                <PreviewIcon sx={{ fontSize: isPhone ? '1rem' : '1.15rem' }} />
                {!isPhone && 'Preview'}
              </ToggleButton>
            </ToggleButtonGroup>
            {!isPhone && !!handleOpenSearchDialog && (
              <TooltipStyled title="Search building blocks">
                <span>
                  <IconButton
                    color="inherit"
                    onClick={handleOpenSearchDialog}
                    sx={{
                      mr: isPhone ? 0.25 : 1,
                      color: 'foreground.contrastSecondary',
                    }}
                    disabled={!editMode || !widgetHasComponents}
                  >
                    <SearchIcon
                      sx={{ fontSize: isPhone ? '1.25rem' : '1.5rem' }}
                    />
                  </IconButton>
                </span>
              </TooltipStyled>
            )}

            {!isPhone && !!handleOpenSearchDialog && (
              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  mx: isPhone ? 0.5 : 1,
                  height: '24px',
                  alignSelf: 'center',
                }}
              />
            )}

            <TooltipStyled title="Open Saved Widgets">
              <IconButton
                color="inherit"
                onClick={() => setShowWidgetList(true)}
                sx={{
                  mr: isPhone ? 0.5 : 1,
                  color: 'foreground.contrastSecondary',
                  padding: isPhone ? '4px' : '8px',
                }}
              >
                <FolderOpenIcon
                  sx={{ fontSize: isPhone ? '1.25rem' : '1.5rem' }}
                />
              </IconButton>
            </TooltipStyled>

            <TooltipStyled title="Editor settings">
              <IconButton
                color="inherit"
                onClick={() => setShowSettingsModal(true)}
                sx={{
                  mr: isPhone ? 0.5 : 1,
                  color: 'foreground.contrastSecondary',
                  padding: isPhone ? '4px' : '8px',
                }}
              >
                <SettingsIcon
                  sx={{ fontSize: isPhone ? '1.25rem' : '1.5rem' }}
                />
              </IconButton>
            </TooltipStyled>

            {/* Advanced Features in Toolbar (when enabled, only on desktop) */}
            {isDesktop && showAdvancedInToolbar && (
              <>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mx: 1, height: '24px', alignSelf: 'center' }}
                />
                <TooltipStyled title="Templates">
                  <IconButton
                    color="inherit"
                    onClick={() => setShowTemplateDialog(true)}
                    sx={{
                      mr: 1,
                      color: 'foreground.contrastSecondary',
                    }}
                  >
                    <TemplateIcon />
                  </IconButton>
                </TooltipStyled>

                <TooltipStyled title="Import/Export Widgets">
                  <IconButton
                    color="inherit"
                    onClick={() => setShowExportImportDialog(true)}
                    sx={{
                      mr: 1,
                      color: 'foreground.contrastSecondary',
                    }}
                  >
                    <ImportExportIcon />
                  </IconButton>
                </TooltipStyled>

                <TooltipStyled title="Version History">
                  <IconButton
                    color="inherit"
                    onClick={handleOpenVersioningDialog}
                    sx={{
                      mr: 1,
                      color: 'foreground.contrastSecondary',
                    }}
                  >
                    <HistoryIcon />
                  </IconButton>
                </TooltipStyled>
              </>
            )}

            {/* Advanced Features Menu Button (shown when not on desktop or advanced features not inline) */}
            {(!isDesktop || !showAdvancedInToolbar) && (
              <TooltipStyled title="More widget tools">
                <IconButton
                  color="inherit"
                  onClick={handleAdvancedMenuOpen}
                  sx={{
                    mr: isPhone ? 0.5 : 1,
                    color: 'foreground.contrastSecondary',
                    padding: isPhone ? '4px' : '8px',
                  }}
                >
                  <MoreVertIcon
                    sx={{ fontSize: isPhone ? '1.25rem' : '1.5rem' }}
                  />
                </IconButton>
              </TooltipStyled>
            )}

            {!isPhone && (
              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  mr: 2,
                  height: '24px',
                  alignSelf: 'center',
                }}
              />
            )}

            {/* Advanced Features Menu */}
            <Menu
              anchorEl={advancedMenuAnchor}
              open={Boolean(advancedMenuAnchor)}
              onClose={handleAdvancedMenuClose}
              PaperProps={{
                elevation: 6,
                sx: {
                  width: isPhone ? 260 : 300,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  overflow: 'visible',
                  mt: 1,
                  borderRadius: 2,
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                  border: 1,
                  borderColor: 'divider',
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                  '& .MuiListItemText-primary, & .MuiListItemText-secondary': {
                    color: theme.palette.text.primary,
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.text.secondary,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {/* Removed undo/redo items for phone */}
              {isPhone && !!handleOpenSearchDialog && (
                <MenuItem
                  onClick={() => {
                    handleOpenSearchDialog()
                    handleAdvancedMenuClose()
                  }}
                  disabled={!editMode || !widgetHasComponents}
                  sx={{
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'text.secondary' }}>
                    <SearchIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Search Building Blocks"
                    secondary="Find items in this widget"
                    primaryTypographyProps={{
                      fontSize: isPhone ? '0.6rem' : '0.8rem',
                      fontWeight: 'bold',
                      color: theme.palette.text.primary,
                    }}
                    secondaryTypographyProps={{
                      fontSize: isPhone ? '0.5rem' : '0.65rem',
                      fontWeight: 'light',
                      color: theme.palette.text.primary,
                    }}
                  />
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  setShowTemplateDialog(true)
                  handleAdvancedMenuClose()
                }}
                sx={{
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'text.secondary' }}>
                  <TemplateIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Templates"
                  secondary="Start faster from reusable patterns"
                  primaryTypographyProps={{
                    fontSize: isPhone ? '0.6rem' : '0.8rem',
                    fontWeight: 'bold',
                    color: theme.palette.text.primary,
                  }}
                  secondaryTypographyProps={{
                    fontSize: isPhone ? '0.5rem' : '0.65rem',
                    fontWeight: 'light',
                    color: theme.palette.text.primary,
                  }}
                />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setShowExportImportDialog(true)
                  handleAdvancedMenuClose()
                }}
                sx={{
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'text.secondary' }}>
                  <ImportExportIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Import/Export Widgets"
                  secondary="Share widget packs or back up your work"
                  primaryTypographyProps={{
                    fontSize: isPhone ? '0.6rem' : '0.8rem',
                    fontWeight: 'bold',
                    color: theme.palette.text.primary,
                  }}
                  secondaryTypographyProps={{
                    fontSize: isPhone ? '0.5rem' : '0.65rem',
                    fontWeight: 'light',
                    color: theme.palette.text.primary,
                  }}
                />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  handleOpenVersioningDialog()
                  handleAdvancedMenuClose()
                }}
                sx={{
                  py: 1.5,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'text.secondary' }}>
                  <HistoryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Version History"
                  secondary="Recover an earlier widget version"
                  primaryTypographyProps={{
                    fontSize: isPhone ? '0.6rem' : '0.8rem',
                    fontWeight: 'bold',
                    color: theme.palette.text.primary,
                  }}
                  secondaryTypographyProps={{
                    fontSize: isPhone ? '0.5rem' : '0.65rem',
                    fontWeight: 'light',
                    color: theme.palette.text.primary,
                  }}
                />
              </MenuItem>
            </Menu>

            {/* Save Button or Icon */}
            {isPhone ? (
              <TooltipStyled
                title={
                  isEmpty
                    ? 'Empty Widget'
                    : isUpdating && !hasChanges
                      ? 'No changes'
                      : isUpdating
                        ? 'Update Widget'
                        : 'Save Widget'
                }
              >
                <span>
                  <IconButton
                    color="inherit"
                    onClick={handleSaveButtonClick}
                    disabled={
                      !editMode || (!hasChanges && isUpdating) || isEmpty
                    }
                    sx={{
                      color:
                        !editMode || (!hasChanges && isUpdating) || isEmpty
                          ? 'action.disabled'
                          : 'primary.main',
                      width: 30,
                      height: 30,
                      p: 0,
                      border: '1px solid',
                      mr: 0.75,
                      borderColor:
                        !editMode || (!hasChanges && isUpdating) || isEmpty
                          ? alpha(theme.palette.action.disabled, 0.25)
                          : theme.palette.primary.main,
                      borderRadius: 1,
                      bgcolor:
                        !editMode || (!hasChanges && isUpdating) || isEmpty
                          ? alpha(theme.palette.background.paper, 0.35)
                          : alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                      },
                    }}
                  >
                    <SaveIcon
                      sx={{ fontSize: isPhone ? '1.25rem' : '1.5rem' }}
                    />
                  </IconButton>
                </span>
              </TooltipStyled>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveButtonClick}
                size="small"
                disabled={!editMode || (!hasChanges && isUpdating) || isEmpty}
                startIcon={<SaveIcon />}
                sx={{
                  borderRadius: 1,
                  width: '155px',
                  textTransform: 'none',
                  '&.Mui-disabled': {
                    backgroundColor: 'rgba(0, 0, 0, 0.12)',
                    color: 'rgba(0, 0, 0, 0.26)',
                  },
                }}
              >
                {isEmpty
                  ? 'Empty Widget'
                  : isUpdating && !hasChanges
                    ? 'No changes'
                    : isUpdating
                      ? 'Update Widget'
                      : 'Save Widget'}
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Version Warning Dialog */}
      <VersionWarningDialog
        open={showVersionWarning}
        onConfirm={handleVersionWarningConfirm}
        onCancel={() => setShowVersionWarning(false)}
        version={currentWidgetVersion || '1.0'}
      />
    </>
  )
}

export default EditorToolbar

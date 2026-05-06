import React, { useState, useEffect, useRef } from 'react'
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Dialog,
  IconButton,
  ListItemIcon,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LogoutIcon from '@mui/icons-material/Logout'
import ExtensionIcon from '@mui/icons-material/Extension'
import ConstructionIcon from '@mui/icons-material/Construction'
import FolderIcon from '@mui/icons-material/Folder'
import ColorLensIcon from '@mui/icons-material/ColorLens'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Brightness6Icon from '@mui/icons-material/Brightness6'
import CloseIcon from '@mui/icons-material/Close'

import AccentColorPicker from '../../theme/AccentColorPicker'
import useTopNavBarWidgets from '../../customHooks/useTopNavBarWidgets'
import { ReactComponent as Logo } from '../../../public/logo.svg'
import DashboardOptionsMenu from '../Dasboard/DashboardOptionsMenu'
import WidgetManagementModal from '../WidgetEditor/components/dialogs/WidgetLibrary'
import useWidgetManager from '../WidgetEditor/hooks/useWidgetManager'
import {
  OPEN_WIDGET_EDITOR_EVENT,
  OPEN_WIDGET_MENU_EVENT,
  useWorkspaceActions,
} from '../../customHooks/useWorkspaceActions'
import ThemeModeToggle from '../shared/ThemeModeToggle'
import DashboardWidgetExplanationModal from '../tutorial/DashboardWidgetExplanationModal'
import WidgetEditor from '../WidgetEditor/WidgetEditor'
import { CustomWidget } from '../WidgetEditor/WidgetStorage'
import { useDashboards } from '../Dasboard/DashboardProvider'

// Define user data type
interface UserData {
  id: string
  name: string
  role: string
}

// Define component props interface
interface TopNavBarProps {
  open?: boolean
  setOpen?: (open: boolean) => void
}

// Custom button with icon and label for phone view
interface ButtonWithLabelProps {
  icon: React.ReactNode
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  buttonRef?: React.Ref<HTMLButtonElement>
  sx?: React.CSSProperties | Record<string, unknown>
  'data-tutorial-id'?: string
  title?: string
}

const ButtonWithLabel: React.FC<ButtonWithLabelProps> = ({
  icon,
  label,
  onClick,
  buttonRef,
  sx,
  ...props
}) => {
  return (
    <Button
      ref={buttonRef}
      onClick={onClick}
      sx={{
        color: 'foreground.contrastPrimary',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '44px',
        mx: 0.25,
        px: 0.5,
        ...sx,
      }}
      {...props}
    >
      {icon}
      <Typography
        variant="caption"
        sx={{ fontSize: '0.6rem', mt: 0.3, lineHeight: 1 }}
      >
        {label}
      </Typography>
    </Button>
  )
}

const TopNavBar: React.FC<TopNavBarProps> = () => {
  // State for different dropdown menus
  const [widgetsAnchorEl, setWidgetsAnchorEl] = useState<null | HTMLElement>(
    null,
  )
  const widgetsButtonRef = useRef<HTMLButtonElement | null>(null)
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [widgetEditorOpen, setWidgetEditorOpen] = useState(false)
  const [widgetEditorPayload, setWidgetEditorPayload] = useState<{
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null>(null)
  const [userData, setUserData] = useState<UserData>({
    id: 'admin',
    name: 'Admin User',
    role: 'ADMIN_ROLE',
  })
  const userModeLabel =
    userData.role === 'ADMIN_ROLE' ? 'Builder mode' : 'Viewer mode'

  const { topNavBarWidgets } = useTopNavBarWidgets()
  const { ensureDashboardAndAddComponent, openCreateWidget } =
    useWorkspaceActions()
  const { openDashboards, selectedDashboard, isDashboardEditing } =
    useDashboards()
  const navigate = useNavigate()

  // Use theme and media query for responsive design
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const selectedOpenDashboard = openDashboards[selectedDashboard]
  const selectedDashboardIsEmpty =
    Boolean(selectedOpenDashboard) &&
    (!selectedOpenDashboard.layout?.children ||
      selectedOpenDashboard.layout.children.length === 0)
  const canPlaceWidgets =
    Boolean(selectedOpenDashboard) &&
    (selectedDashboardIsEmpty || isDashboardEditing(selectedOpenDashboard?.id))

  // Use the widget manager hook
  const {
    widgets,
    isWidgetManagementOpen,
    openWidgetManagement,
    closeWidgetManagement,
    previewWidget,
    editWidget,
    deleteWidget,
  } = useWidgetManager()

  // Load user data from localStorage on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData')
    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData)
        setUserData(parsedUserData)
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error)
      }
    }
  }, [])

  useEffect(() => {
    const handleOpenWidgetEditor = (event: Event) => {
      const customEvent = event as CustomEvent<{
        loadWidget?: CustomWidget
        initialEditMode?: boolean
      }>
      setWidgetEditorPayload(customEvent.detail || null)
      setWidgetEditorOpen(true)
    }

    window.addEventListener(OPEN_WIDGET_EDITOR_EVENT, handleOpenWidgetEditor)

    return () => {
      window.removeEventListener(
        OPEN_WIDGET_EDITOR_EVENT,
        handleOpenWidgetEditor,
      )
    }
  }, [])

  useEffect(() => {
    const handleOpenWidgetMenu = () => {
      setWidgetsAnchorEl(widgetsButtonRef.current)
    }

    window.addEventListener(OPEN_WIDGET_MENU_EVENT, handleOpenWidgetMenu)

    return () => {
      window.removeEventListener(OPEN_WIDGET_MENU_EVENT, handleOpenWidgetMenu)
    }
  }, [])

  // Handle opening and closing dropdowns
  const handleWidgetsMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setWidgetsAnchorEl(event.currentTarget)
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setUserAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setWidgetsAnchorEl(null)
    setUserAnchorEl(null)
  }

  const handleLogout = () => {
    handleClose()
    // Clear user data from localStorage
    localStorage.removeItem('userData')
    navigate('/')
  }

  // Handle opening widgets library
  const handleOpenWidgetsLibrary = () => {
    openWidgetManagement()
    handleClose()
  }

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: 'background.header',
          boxShadow: 2,
          height: isPhone ? '72px' : '64px',
        }}
      >
        <Toolbar
          sx={{
            height: isPhone ? '72px' : '64px',
            px: isPhone ? 0.5 : 2,
            gap: isPhone ? 0.25 : 0,
          }}
        >
          {/* Logo and Brand */}
          <Box
            aria-label="AquaMesh logo"
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontWeight: isDesktop ? 'bold' : 'normal',
              mr: isPhone ? 0.25 : isDesktop ? 4 : 1,
              color: 'foreground.contrastPrimary',
              px: isPhone ? 0.5 : 0,
            }}
          >
            <Logo
              height={isPhone ? '28px' : '32px'}
              width={isPhone ? '28px' : '32px'}
              style={{ marginRight: isDesktop ? '12px' : '0' }}
            />
            {isDesktop && 'AquaMesh'}
          </Box>

          {/* Main Navigation Items */}
          <Box sx={{ flexGrow: 1, display: 'flex', minWidth: 0 }}>
            {/* Dashboard Options Menu */}
            {isPhone || isTablet ? (
              <DashboardOptionsMenu />
            ) : (
              <DashboardOptionsMenu />
            )}

            {/* Widgets Menu */}
            {isPhone || isTablet ? (
              <ButtonWithLabel
                icon={<ExtensionIcon />}
                label={'Widgets'}
                onClick={handleWidgetsMenuOpen}
                buttonRef={widgetsButtonRef}
                data-tutorial-id="widgets-button"
              />
            ) : (
              <Button
                ref={widgetsButtonRef}
                onClick={handleWidgetsMenuOpen}
                sx={{
                  color: 'foreground.contrastPrimary',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                  mx: 1,
                  px: 2,
                }}
                startIcon={<ExtensionIcon />}
                endIcon={<KeyboardArrowDownIcon />}
                data-tutorial-id="widgets-button"
              >
                Widgets
              </Button>
            )}
            <Menu
              anchorEl={widgetsAnchorEl}
              open={Boolean(widgetsAnchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  width: '250px',
                  boxShadow: 3,
                  border: 1,
                  borderColor: 'divider',
                },
              }}
            >
              {/* Widget Management Section */}
              {userData.id === 'admin' && userData.role === 'ADMIN_ROLE' && (
                <>
                  <MenuItem
                    onClick={() => {
                      openCreateWidget()
                      handleClose()
                    }}
                    sx={{ p: 1.5 }}
                    data-tutorial-id="create-widget-button"
                  >
                    <ListItemIcon>
                      <ConstructionIcon
                        fontSize="small"
                        sx={{ color: 'text.secondary' }}
                      />
                    </ListItemIcon>
                    Create Widget
                  </MenuItem>
                  {canPlaceWidgets && (
                    <Divider sx={{ my: 1, borderColor: 'divider' }} />
                  )}
                  <MenuItem onClick={handleOpenWidgetsLibrary} sx={{ p: 1.5 }}>
                    <ListItemIcon>
                      <FolderIcon
                        fontSize="small"
                        sx={{ color: 'text.secondary' }}
                      />
                    </ListItemIcon>
                    Open Saved Widgets
                  </MenuItem>
                  
                </>
              )}

              {/* Predefined Widgets Section */}
              {canPlaceWidgets && isPhone ? <Divider sx={{ my: 1, borderColor: 'divider' }} /> && (
                topNavBarWidgets.filter((widget) =>
                  widget.name.includes('Custom'),
                ).length > 0 ? (
                  topNavBarWidgets
                    .filter((widget) => widget.name.includes('Custom'))
                    .map((panel) => (
                      <Box key={panel.name}>
                        {panel.items.map((item) => (
                          <MenuItem
                            key={item.name}
                            disabled={!canPlaceWidgets}
                            onClick={() => {
                              if (!canPlaceWidgets) {
                                return
                              }
                              ensureDashboardAndAddComponent({
                                id: `panel-${Date.now()}`,
                                ...item,
                              })
                              handleClose()
                            }}
                            sx={{ p: 1.5 }}
                          >
                            {item.name}
                          </MenuItem>
                        ))}
                      </Box>
                    ))
                ) : (
                  <MenuItem
                    disabled
                    sx={{
                      p: 1.5,
                      opacity: 1,
                      justifyContent: 'center',
                      whiteSpace: 'normal',
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.7rem',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        display: 'block',
                      }}
                    >
                      {userData.role === 'ADMIN_ROLE'
                        ? 'No saved widgets yet. Create a widget for your work, then add it to this dashboard.'
                        : 'Switch to Builder mode to create your own reusable widgets.'}
                    </Typography>
                  </MenuItem>
                )
              ) : canPlaceWidgets ? (
                <>
                  {topNavBarWidgets.filter(
                    (widget) =>
                      !widget.name.includes('Custom') &&
                      widget.items.length > 0,
                  ).length > 0 && (
                    <>
                      <Typography
                        sx={{
                          px: 2,
                          py: 1,
                          fontWeight: 'bold',
                          mt: 1,
                          color: 'text.primary',
                        }}
                      >
                        Starter Widgets
                      </Typography>
                      <Divider sx={{ borderColor: 'divider' }} />
                      {topNavBarWidgets
                        .filter(
                          (widget) =>
                            !widget.name.includes('Custom') &&
                            widget.items.length > 0,
                        )
                        .map((topNavBarWidget) => (
                          <Box key={topNavBarWidget.name}>
                            {topNavBarWidget.items.map((item) => (
                              <MenuItem
                                key={item.name}
                                disabled={!canPlaceWidgets}
                                onClick={() => {
                                  if (!canPlaceWidgets) {
                                    return
                                  }
                                  ensureDashboardAndAddComponent({
                                    id: `panel-${Date.now()}`,
                                    ...item,
                                  })
                                  handleClose()
                                }}
                                sx={{ p: 1.5 }}
                              >
                                {item.name}
                              </MenuItem>
                            ))}
                          </Box>
                        ))}
                    </>
                  )}

                  {/* Custom Widgets Section */}
                  {topNavBarWidgets.filter((widget) =>
                    widget.name.includes('Custom'),
                  ).length > 0 && (
                    <>
                      <Typography
                        sx={{
                          px: 2,
                          py: 1,
                          fontWeight: 'bold',
                          mt: 1,
                          color: 'text.primary',
                        }}
                      >
                        My Widgets
                      </Typography>
                      <Divider sx={{ borderColor: 'divider' }} />
                      {topNavBarWidgets
                        .filter((widget) => widget.name.includes('Custom'))
                        .map((topNavBarWidget) => (
                          <Box key={topNavBarWidget.name}>
                            {topNavBarWidget.items.map((item) => (
                              <MenuItem
                                key={item.name}
                                disabled={!canPlaceWidgets}
                                onClick={() => {
                                  if (!canPlaceWidgets) {
                                    return
                                  }
                                  ensureDashboardAndAddComponent({
                                    id: `panel-${Date.now()}`,
                                    ...item,
                                  })
                                  handleClose()
                                }}
                                sx={{
                                  p: 1.5,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                {item.name}
                              </MenuItem>
                            ))}
                          </Box>
                        ))}
                    </>
                  )}
                </>
              ) : null}
            </Menu>
          </Box>

          {/* Right Side Elements */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* User Menu */}
            {isPhone || isTablet ? (
              <ButtonWithLabel
                icon={
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'primary.main',
                      fontSize: '0.9rem',
                    }}
                  >
                    {userData.id.substring(0, 2).toUpperCase()}
                  </Avatar>
                }
                label="User"
                onClick={handleUserMenuOpen}
                sx={{ minWidth: '45px' }}
              />
            ) : (
              <Button
                onClick={handleUserMenuOpen}
                sx={{
                  color: 'foreground.contrastPrimary',
                  textTransform: 'none',
                  minWidth: 'auto',
                  px: 2,
                  display: 'flex',
                }}
                endIcon={<KeyboardArrowDownIcon />}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main',
                    mr: 1,
                    fontSize: '0.9rem',
                  }}
                >
                  {userData.id.substring(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                    {userData.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.7, lineHeight: 1 }}
                  >
                    {userModeLabel}
                  </Typography>
                </Box>
              </Button>
            )}
            <Menu
              anchorEl={userAnchorEl}
              open={Boolean(userAnchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: 1,
                  borderColor: 'divider',
                  minWidth: 260,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Brightness6Icon
                    fontSize="small"
                    sx={{ color: 'primary.main', mr: 1 }}
                  />
                  <Typography variant="body2" fontWeight="medium">
                    Light / dark mode
                  </Typography>
                </Box>
                <ThemeModeToggle compact />
              </Box>
              <Divider sx={{ borderColor: 'divider' }} />
              <Box sx={{ px: 2, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ColorLensIcon
                    fontSize="small"
                    sx={{ color: 'primary.main', mr: 1 }}
                  />
                  <Typography variant="body2" fontWeight="medium">
                    Accent color
                  </Typography>
                </Box>
                <AccentColorPicker dense />
              </Box>
              <Divider sx={{ borderColor: 'divider' }} />
              <MenuItem
                onClick={() => {
                  setIsHelpOpen(true)
                  handleClose()
                }}
                sx={{ color: 'text.primary' }}
              >
                <ListItemIcon>
                  <HelpOutlineIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                </ListItemIcon>
                Help / tutorial
              </MenuItem>
              <Divider sx={{ borderColor: 'divider' }} />
              <MenuItem onClick={handleLogout} sx={{ color: 'text.primary' }}>
                <ListItemIcon>
                  <LogoutIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Widget Management Modal */}
      <WidgetManagementModal
        open={isWidgetManagementOpen}
        onClose={closeWidgetManagement}
        widgets={widgets}
        onPreview={previewWidget}
        onEdit={editWidget}
        onDelete={deleteWidget}
      />
      <DashboardWidgetExplanationModal
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      <Dialog
        fullScreen
        open={widgetEditorOpen}
        onClose={() => setWidgetEditorOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.default',
          },
        }}
      >
        <Box
          sx={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: 48,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Create Widget
            </Typography>
            <IconButton
              aria-label="Close Create Widget"
              onClick={() => setWidgetEditorOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <WidgetEditor
              key={`${widgetEditorOpen}-${widgetEditorPayload?.loadWidget?.id || 'new'}`}
              customProps={widgetEditorPayload || undefined}
            />
          </Box>
        </Box>
      </Dialog>
    </>
  )
}

export default TopNavBar

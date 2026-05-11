import React, { useState, useEffect } from 'react'
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
import ConstructionIcon from '@mui/icons-material/Construction'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import ColorLensIcon from '@mui/icons-material/ColorLens'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Brightness6Icon from '@mui/icons-material/Brightness6'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/Settings'
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount'

import AccentColorPicker from '../../theme/AccentColorPicker'
import { ReactComponent as Logo } from '../../../public/logo.svg'
import DashboardOptionsMenu from '../Dasboard/DashboardOptionsMenu'
import {
  OPEN_STUDY_PACK_EVENT,
  OPEN_WIDGET_EDITOR_EVENT,
  useWorkspaceActions,
} from '../../customHooks/useWorkspaceActions'
import ThemeModeToggle from '../shared/ThemeModeToggle'
import DashboardWidgetExplanationModal from '../tutorial/DashboardWidgetExplanationModal'
import WidgetEditor from '../WidgetEditor/WidgetEditor'
import { CustomWidget } from '../WidgetEditor/WidgetStorage'
import SettingsDialog from '../WidgetEditor/components/dialogs/SettingsDialog'
import { dispatchWorkspaceOnboardingEvent } from '../onboarding/onboardingEvents'
import CreateStudyPackModal from '../studyPack/CreateStudyPackModal'

// Define user data type
interface UserData {
  id: string
  name: string
  role: string
}

const USER_ROLE_CHANGED_EVENT = 'aquamesh-user-role-changed'

const adminUser: UserData = {
  id: 'admin',
  name: 'Admin',
  role: 'ADMIN_ROLE',
}

const viewerUser: UserData = {
  id: 'viewer',
  name: 'Viewer',
  role: 'VIEWER_ROLE',
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
  sx?: React.CSSProperties | Record<string, unknown>
  'data-tutorial-id'?: string
  title?: string
  disabled?: boolean
}

const ButtonWithLabel: React.FC<ButtonWithLabelProps> = ({
  icon,
  label,
  onClick,
  sx,
  ...props
}) => {
  return (
    <Button
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
        sx={{
          fontSize: '0.6rem',
          mt: 0.3,
          lineHeight: 1,
          maxWidth: '58px',
          textAlign: 'center',
          whiteSpace: 'normal',
        }}
      >
        {label}
      </Typography>
    </Button>
  )
}

const useStoredBoolean = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const savedValue = localStorage.getItem(key)
      return savedValue ? JSON.parse(savedValue) : defaultValue
    } catch (error) {
      console.error(`Failed to parse ${key} from localStorage`, error)
      return defaultValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

const TopNavBar: React.FC<TopNavBarProps> = () => {
  // State for different dropdown menus
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [studyPackOpen, setStudyPackOpen] = useState(false)
  const [widgetEditorOpen, setWidgetEditorOpen] = useState(false)
  const [widgetEditorPayload, setWidgetEditorPayload] = useState<{
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null>(null)
  const [showTooltips, setShowTooltips] = useStoredBoolean(
    'widget-editor-show-tooltips',
    false,
  )
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useStoredBoolean(
    'widget-editor-delete-component-confirmation',
    true,
  )
  const [showDeleteWidgetConfirmation, setShowDeleteWidgetConfirmation] =
    useStoredBoolean('widget-editor-delete-widget-confirmation', true)
  const [showComponentPaletteHelp, setShowComponentPaletteHelp] =
    useStoredBoolean('widget-editor-show-palette-help', false)
  const [showDeleteDashboardConfirmation, setShowDeleteDashboardConfirmation] =
    useStoredBoolean('widget-editor-delete-dashboard-confirmation', true)
  const [showAdvancedInToolbar, setShowAdvancedInToolbar] = useStoredBoolean(
    'widget-editor-show-advanced-in-toolbar',
    false,
  )
  const [showDeleteTemplateConfirmation, setShowDeleteTemplateConfirmation] =
    useStoredBoolean('widget-editor-delete-template-confirmation', true)
  const [userData, setUserData] = useState<UserData>(adminUser)
  const isAdmin = userData.id === 'admin' && userData.role === 'ADMIN_ROLE'
  const userModeLabel = isAdmin ? 'Builder mode' : 'Viewer mode'

  const {
    openCreateWidget,
    openCreateDashboard,
    openCreateStudyPack,
    createStudyPackDashboard,
  } = useWorkspaceActions()
  const navigate = useNavigate()

  // Use theme and media query for responsive design
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))

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
      let parsedUserData = userData

      try {
        const storedUserData = localStorage.getItem('userData')
        parsedUserData = storedUserData
          ? (JSON.parse(storedUserData) as UserData)
          : userData
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error)
      }

      const canEdit =
        parsedUserData.id === 'admin' && parsedUserData.role === 'ADMIN_ROLE'

      if (!canEdit) {
        return
      }

      const customEvent = event as CustomEvent<{
        loadWidget?: CustomWidget
        initialEditMode?: boolean
      }>
      setWidgetEditorPayload(customEvent.detail || null)
      setWidgetEditorOpen(true)
      dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-opened' })
    }

    window.addEventListener(OPEN_WIDGET_EDITOR_EVENT, handleOpenWidgetEditor)

    return () => {
      window.removeEventListener(
        OPEN_WIDGET_EDITOR_EVENT,
        handleOpenWidgetEditor,
      )
    }
  }, [userData])

  useEffect(() => {
    const handleOpenStudyPack = () => {
      let parsedUserData = userData

      try {
        const storedUserData = localStorage.getItem('userData')
        parsedUserData = storedUserData
          ? (JSON.parse(storedUserData) as UserData)
          : userData
      } catch (error) {
        console.error('Failed to parse user data from localStorage', error)
      }

      if (
        parsedUserData.id !== 'admin' ||
        parsedUserData.role !== 'ADMIN_ROLE'
      ) {
        return
      }

      setStudyPackOpen(true)
    }

    window.addEventListener(OPEN_STUDY_PACK_EVENT, handleOpenStudyPack)

    return () => {
      window.removeEventListener(OPEN_STUDY_PACK_EVENT, handleOpenStudyPack)
    }
  }, [userData])

  // Handle opening and closing dropdowns
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setUserAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setUserAnchorEl(null)
  }

  const handleLogout = () => {
    handleClose()
    // Clear user data from localStorage
    localStorage.removeItem('userData')
    navigate('/')
  }

  const switchUser = (nextUser: UserData) => {
    localStorage.setItem('userData', JSON.stringify(nextUser))
    setUserData(nextUser)
    window.dispatchEvent(
      new CustomEvent(USER_ROLE_CHANGED_EVENT, { detail: nextUser }),
    )
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

            {/* Create Dashboard */}
            {isPhone || isTablet ? (
              <ButtonWithLabel
                icon={<AutoStoriesIcon />}
                label="Study Pack"
                onClick={() => openCreateStudyPack()}
                data-tutorial-id="create-study-pack-button"
                disabled={!isAdmin}
                title={
                  isAdmin
                    ? 'Create study pack'
                    : 'Viewer mode cannot create study packs'
                }
                sx={!isAdmin ? { opacity: 0.45, pointerEvents: 'none' } : {}}
              />
            ) : (
              <Button
                onClick={() => openCreateStudyPack()}
                disabled={!isAdmin}
                sx={{
                  color: 'foreground.contrastPrimary',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                  mx: 1,
                  px: 2,
                  opacity: isAdmin ? 1 : 0.45,
                }}
                startIcon={<AutoStoriesIcon />}
                data-tutorial-id="create-study-pack-button"
              >
                Create study pack
              </Button>
            )}

            {/* Create Dashboard */}
            {isPhone || isTablet ? (
              <ButtonWithLabel
                icon={<DashboardCustomizeIcon />}
                label="Create Dashboard"
                onClick={() => openCreateDashboard()}
                data-tutorial-id="create-dashboard-button"
                data-onboarding-id="create-dashboard"
                disabled={!isAdmin}
                title={
                  isAdmin
                    ? 'Create Dashboard'
                    : 'Viewer mode cannot create dashboards'
                }
                sx={!isAdmin ? { opacity: 0.45, pointerEvents: 'none' } : {}}
              />
            ) : (
              <Button
                onClick={() => openCreateDashboard()}
                disabled={!isAdmin}
                sx={{
                  color: 'foreground.contrastPrimary',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                  mx: 1,
                  px: 2,
                  opacity: isAdmin ? 1 : 0.45,
                }}
                startIcon={<DashboardCustomizeIcon />}
                data-tutorial-id="create-dashboard-button"
                data-onboarding-id="create-dashboard"
              >
                Create Dashboard
              </Button>
            )}

            {/* Create Widget */}
            {isPhone || isTablet ? (
              <ButtonWithLabel
                icon={<ConstructionIcon />}
                label="Create Widget"
                onClick={() => openCreateWidget()}
                data-tutorial-id="create-widget-button"
                data-onboarding-id="dashboard-widget-create"
                disabled={!isAdmin}
                title={
                  isAdmin
                    ? 'Create Widget'
                    : 'Viewer mode cannot create widgets'
                }
                sx={!isAdmin ? { opacity: 0.45, pointerEvents: 'none' } : {}}
              />
            ) : (
              <Button
                onClick={() => openCreateWidget()}
                disabled={!isAdmin}
                sx={{
                  color: 'foreground.contrastPrimary',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                  mx: 1,
                  px: 2,
                  opacity: isAdmin ? 1 : 0.45,
                }}
                startIcon={<ConstructionIcon />}
                data-tutorial-id="create-widget-button"
                data-onboarding-id="dashboard-widget-create"
              >
                Create Widget
              </Button>
            )}
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
                  mt: 1,
                  overflow: 'hidden',
                },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  pt: 1.5,
                  pb: 1,
                  bgcolor: 'background.default',
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" fontWeight={800}>
                  {userData.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {userModeLabel}
                </Typography>
              </Box>
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
                  setIsSettingsOpen(true)
                  handleClose()
                }}
                sx={{
                  marginTop: 1,
                  paddingTop: 0.5,
                  paddingBottom: 0.5,
                  color: 'text.primary',
                }}
              >
                <ListItemIcon>
                  <SettingsIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                </ListItemIcon>
                Settings
              </MenuItem>
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
              <MenuItem
                onClick={() => switchUser(isAdmin ? viewerUser : adminUser)}
                sx={{ color: 'text.primary' }}
              >
                <ListItemIcon>
                  <SwitchAccountIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                </ListItemIcon>
                {isAdmin ? 'Log in as Viewer' : 'Log in as Admin'}
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

      <DashboardWidgetExplanationModal
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Application Settings"
        scope="global"
        showTooltips={showTooltips}
        onShowTooltipsChange={setShowTooltips}
        showDeleteConfirmation={showDeleteConfirmation}
        onShowDeleteConfirmationChange={setShowDeleteConfirmation}
        showComponentPaletteHelp={showComponentPaletteHelp}
        onShowComponentPaletteHelpChange={setShowComponentPaletteHelp}
        showDeleteWidgetConfirmation={showDeleteWidgetConfirmation}
        onShowDeleteWidgetConfirmationChange={setShowDeleteWidgetConfirmation}
        showDeleteDashboardConfirmation={showDeleteDashboardConfirmation}
        onShowDeleteDashboardConfirmationChange={
          setShowDeleteDashboardConfirmation
        }
        showAdvancedInToolbar={showAdvancedInToolbar}
        onShowAdvancedInToolbarChange={setShowAdvancedInToolbar}
        showDeleteTemplateConfirmation={showDeleteTemplateConfirmation}
        onShowDeleteTemplateConfirmationChange={
          setShowDeleteTemplateConfirmation
        }
      />
      <CreateStudyPackModal
        open={studyPackOpen}
        onClose={() => setStudyPackOpen(false)}
        onCreatePack={createStudyPackDashboard}
      />
      <Dialog
        fullScreen
        open={widgetEditorOpen}
        onClose={() => {
          setWidgetEditorOpen(false)
          dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-closed' })
        }}
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
              data-onboarding-id="close-create-widget"
              onClick={() => {
                setWidgetEditorOpen(false)
                dispatchWorkspaceOnboardingEvent({
                  type: 'widget-editor-closed',
                })
              }}
              sx={{
                color: 'text.primary',
                bgcolor: 'background.default',
                border: 1,
                borderColor: 'divider',
                width: 36,
                height: 36,
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'text.secondary',
                },
              }}
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

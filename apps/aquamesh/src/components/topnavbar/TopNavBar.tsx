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
import ColorLensIcon from '@mui/icons-material/ColorLens'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Brightness6Icon from '@mui/icons-material/Brightness6'
import CloseIcon from '@mui/icons-material/Close'

import AccentColorPicker from '../../theme/AccentColorPicker'
import { ReactComponent as Logo } from '../../../public/logo.svg'
import DashboardOptionsMenu from '../Dasboard/DashboardOptionsMenu'
import {
  OPEN_WIDGET_EDITOR_EVENT,
  useWorkspaceActions,
} from '../../customHooks/useWorkspaceActions'
import ThemeModeToggle from '../shared/ThemeModeToggle'
import DashboardWidgetExplanationModal from '../tutorial/DashboardWidgetExplanationModal'
import WidgetEditor from '../WidgetEditor/WidgetEditor'
import { CustomWidget } from '../WidgetEditor/WidgetStorage'

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
  sx?: React.CSSProperties | Record<string, unknown>
  'data-tutorial-id'?: string
  title?: string
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

const TopNavBar: React.FC<TopNavBarProps> = () => {
  // State for different dropdown menus
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

  const { openCreateWidget, openCreateDashboard } = useWorkspaceActions()
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
                icon={<DashboardCustomizeIcon />}
                label="Create Dashboard"
                onClick={() => openCreateDashboard()}
              />
            ) : (
              <Button
                onClick={() => openCreateDashboard()}
                sx={{
                  color: 'foreground.contrastPrimary',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                  mx: 1,
                  px: 2,
                }}
                startIcon={<DashboardCustomizeIcon />}
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
              />
            ) : (
              <Button
                onClick={() => openCreateWidget()}
                sx={{
                  color: 'foreground.contrastPrimary',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                  mx: 1,
                  px: 2,
                }}
                startIcon={<ConstructionIcon />}
                data-tutorial-id="create-widget-button"
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

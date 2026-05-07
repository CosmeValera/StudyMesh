import React, { useState, useEffect } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  Divider,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import HomeIcon from '@mui/icons-material/Home'
import FolderIcon from '@mui/icons-material/Folder'
import EditIcon from '@mui/icons-material/Edit'
import { DashboardLayout } from '../../state/store'
import { useDashboards } from './DashboardProvider'
import {
  ensureStarterDashboards,
  OPEN_SAVED_DASHBOARDS_EVENT,
} from '../../customHooks/useWorkspaceActions'
import {
  DEFAULT_FOLDER_COLOR,
  normalizeFolderColor,
  normalizeFolderName,
} from './folderColors'
import { dispatchWorkspaceOnboardingEvent } from '../onboarding/onboardingEvents'

const USER_ROLE_CHANGED_EVENT = 'aquamesh-user-role-changed'

// Define saved dashboard type
interface SavedDashboard {
  id: string
  name: string
  folder?: string
  folderColor?: string
  layout: DashboardLayout
  description?: string
  tags?: string[]
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

// Button with label component
interface ButtonWithLabelProps {
  icon: React.ReactNode
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  sx?: React.CSSProperties | Record<string, unknown>
  'data-tutorial-id'?: string
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
        minWidth: '48px',
        mx: 0.5,
        px: 1,
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

const hasDashboardContent = (layout?: DashboardLayout): boolean => {
  if (!layout) {
    return false
  }

  if (layout.type === 'tab' && Boolean(layout.component)) {
    return true
  }

  return Boolean(layout.children?.some((child) => hasDashboardContent(child)))
}

const DashboardOptionsMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [customDashboards, setCustomDashboards] = useState<SavedDashboard[]>([])
  // Track admin status to filter dashboards
  const [isAdmin, setIsAdmin] = useState(false)

  const { addDashboard, openDashboards, replaceDashboard, selectedDashboard } =
    useDashboards()

  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))

  // Load saved dashboards from localStorage on component mount
  useEffect(() => {
    loadSavedDashboards()
  }, [])

  // Determine if current user is admin
  useEffect(() => {
    const readUserRole = () => {
      try {
        const userData = localStorage.getItem('userData')
        if (userData) {
          const parsedData = JSON.parse(userData)
          setIsAdmin(
            parsedData.id === 'admin' && parsedData.role === 'ADMIN_ROLE',
          )
          return
        }
        setIsAdmin(false)
      } catch (error) {
        console.error('Failed to parse user data', error)
        setIsAdmin(false)
      }
    }

    readUserRole()
    window.addEventListener(USER_ROLE_CHANGED_EVENT, readUserRole)

    return () => {
      window.removeEventListener(USER_ROLE_CHANGED_EVENT, readUserRole)
    }
  }, [])

  const loadSavedDashboards = () => {
    try {
      ensureStarterDashboards()
      const dashboards = localStorage.getItem('customDashboards')
      if (dashboards) {
        setCustomDashboards(JSON.parse(dashboards))
      }
    } catch (error) {
      console.error('Failed to load saved dashboards', error)
    }
  }

  // Filter dashboards based on admin status
  const visibleCustomDashboards = isAdmin
    ? customDashboards
    : customDashboards.filter((d) => d.isPublic)

  const dashboardsByFolder = visibleCustomDashboards.reduce<
    Record<string, SavedDashboard[]>
  >((folders, dashboard) => {
    const folderName = normalizeFolderName(dashboard.folder)
    folders[folderName] = folders[folderName] || []
    folders[folderName].push(dashboard)
    return folders
  }, {})

  const getFolderColor = (folderName: string, dashboards: SavedDashboard[]) =>
    normalizeFolderColor(
      dashboards.find((dashboard) => dashboard.folderColor)?.folderColor ||
        (folderName === 'Mathematics'
          ? '#1976D2'
          : folderName === 'Tutorial'
            ? DEFAULT_FOLDER_COLOR
            : undefined),
    )

  // Handle opening and closing dropdown
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    loadSavedDashboards() // Refresh the list when opening menu
    setAnchorEl(event.currentTarget)
    dispatchWorkspaceOnboardingEvent({ type: 'dashboard-menu-opened' })
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  // Create a dashboard with predefined layout
  const createDashboardWithLayout = (
    dashboardName: string,
    layout: DashboardLayout,
  ) => {
    const focusedDashboard = openDashboards[selectedDashboard]

    if (focusedDashboard && !hasDashboardContent(focusedDashboard.layout)) {
      replaceDashboard(selectedDashboard, {
        name: dashboardName,
        layout,
      })
      handleClose()
      return
    }

    addDashboard({
      name: dashboardName,
      layout,
    })
    handleClose()
  }

  // Load a saved dashboard
  const loadCustomDashboard = (dashboard: SavedDashboard) => {
    createDashboardWithLayout(dashboard.name, dashboard.layout)
    dispatchWorkspaceOnboardingEvent({
      type: 'saved-dashboard-opened',
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
    })
  }

  const openSavedDashboardsForFolder = (
    event: React.MouseEvent<HTMLButtonElement>,
    folderName: string,
  ) => {
    event.stopPropagation()
    handleClose()
    window.dispatchEvent(
      new CustomEvent(OPEN_SAVED_DASHBOARDS_EVENT, {
        detail: { folderFilter: folderName },
      }),
    )
  }

  return (
    <>
      {isPhone || isTablet ? (
        <ButtonWithLabel
          icon={<HomeIcon />}
          label={'Dashboards'}
          onClick={handleMenuOpen}
          data-tutorial-id="dashboards-button"
          data-onboarding-id="topnav-dashboards"
        />
      ) : (
        <Button
          onClick={handleMenuOpen}
          sx={{
            color: 'foreground.contrastPrimary',
            display: 'flex',
            alignItems: 'center',
            minWidth: 'auto',
            mx: 1,
            px: 2,
          }}
          startIcon={<HomeIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          data-tutorial-id="dashboards-button"
          data-onboarding-id="topnav-dashboards"
        >
          Dashboards
        </Button>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
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
        {/* Dashboard folders */}
        {visibleCustomDashboards.length > 0 && (
          <>
            {Object.entries(dashboardsByFolder).map(
              ([folderName, dashboards]) => {
                const folderColor = getFolderColor(folderName, dashboards)

                return (
                  <React.Fragment key={folderName}>
                    <Typography
                      component="div"
                      sx={{
                        px: 2,
                        py: 0.6,
                        fontWeight: 'bold',
                        mt: 0.75,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: `${folderColor}24`,
                        borderLeft: '4px solid',
                        borderLeftColor: folderColor,
                      }}
                    >
                      <FolderIcon
                        fontSize="small"
                        sx={{
                          color: folderColor,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.24))',
                        }}
                      />
                      <Box
                        component="span"
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {folderName}
                      </Box>
                      <Tooltip title={`Show ${folderName} in Saved Dashboards`}>
                        <IconButton
                          size="small"
                          aria-label={`Show ${folderName} in Saved Dashboards`}
                          onClick={(event) =>
                            openSavedDashboardsForFolder(event, folderName)
                          }
                          sx={{
                            color: folderColor,
                            p: 0.5,
                            '&:hover': {
                              bgcolor: `${folderColor}22`,
                            },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Typography>
                    <Divider sx={{ borderColor: 'divider' }} />
                    {[...dashboards].reverse().map((dashboard) => (
                      <MenuItem
                        key={dashboard.id}
                        data-onboarding-id="topnav-saved-dashboard"
                        data-dashboard-id={dashboard.id}
                        onClick={() => loadCustomDashboard(dashboard)}
                        sx={{ p: 1.5 }}
                      >
                        {dashboard.name}
                      </MenuItem>
                    ))}
                  </React.Fragment>
                )
              },
            )}
          </>
        )}
        {isPhone && visibleCustomDashboards.length === 0 && (
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
            No saved dashboards yet
          </MenuItem>
        )}
        {!isPhone && visibleCustomDashboards.length === 0 && (
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
            No saved dashboards yet
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default DashboardOptionsMenu

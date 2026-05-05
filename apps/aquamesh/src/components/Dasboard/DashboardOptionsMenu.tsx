import React, { useState, useEffect } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderIcon from '@mui/icons-material/Folder'
import { useDashboards } from './DashboardProvider'
import SavedDashboardsDialog from './DashboardLibrary'
import { Layout } from '../../types/types'
import { useWorkspaceActions } from '../../customHooks/useWorkspaceActions'

// Define saved dashboard type
interface SavedDashboard {
  id: string
  name: string
  folder?: string
  layout: Layout
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

const DashboardOptionsMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [customDashboards, setCustomDashboards] = useState<SavedDashboard[]>([])
  const [dashboardLibraryOpen, setDashboardLibraryOpen] = useState(false)
  // Track admin status to filter dashboards
  const [isAdmin, setIsAdmin] = useState(false)

  const { addDashboard } = useDashboards()
  const { openMathExample, openTutorialExample } = useWorkspaceActions()

  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))

  // Load saved dashboards from localStorage on component mount
  useEffect(() => {
    loadSavedDashboards()
  }, [])

  // Determine if current user is admin
  useEffect(() => {
    try {
      const userData = localStorage.getItem('userData')
      if (userData) {
        const parsedData = JSON.parse(userData)
        setIsAdmin(
          parsedData.id === 'admin' && parsedData.role === 'ADMIN_ROLE',
        )
      }
    } catch (error) {
      console.error('Failed to parse user data', error)
      setIsAdmin(false)
    }
  }, [])

  const loadSavedDashboards = () => {
    try {
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
    const folderName = dashboard.folder?.trim() || 'Default'
    folders[folderName] = folders[folderName] || []
    folders[folderName].push(dashboard)
    return folders
  }, {})

  // Handle opening and closing dropdown
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    loadSavedDashboards() // Refresh the list when opening menu
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  // Create a dashboard with predefined layout
  const createDashboardWithLayout = (dashboardName: string, layout: Layout) => {
    addDashboard({
      name: dashboardName,
      layout,
    })
    handleClose()
  }

  // Load a saved dashboard
  const loadCustomDashboard = (dashboard: SavedDashboard) => {
    createDashboardWithLayout(dashboard.name, dashboard.layout)
  }

  // Open dashboard library dialog
  const handleOpenDashboardLibrary = () => {
    handleClose()
    setDashboardLibraryOpen(true)
  }

  // Handle dashboard library dialog close
  const handleDashboardLibraryClose = () => {
    setDashboardLibraryOpen(false)
    loadSavedDashboards() // Refresh dashboards list
  }

  return (
    <>
      {isPhone || isTablet ? (
        <ButtonWithLabel
          icon={<DashboardIcon />}
          label={isPhone ? 'Dash' : 'Dashboards'}
          onClick={handleMenuOpen}
          data-tutorial-id="dashboards-button"
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
          startIcon={<DashboardIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          data-tutorial-id="dashboards-button"
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
        {/* Dashboard Management Section */}
        <MenuItem onClick={handleOpenDashboardLibrary} sx={{ p: 1.5 }}>
          <ListItemIcon>
            <FolderIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          </ListItemIcon>
          Open Saved Dashboards
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: 'divider' }} />

        {/* Starter folders */}
        <Typography
          sx={{
            px: 2,
            py: 1,
            fontWeight: 'bold',
            mt: 1,
            color: 'text.primary',
          }}
        >
          Mathematics
        </Typography>
        <Divider sx={{ borderColor: 'divider' }} />
        <MenuItem
          onClick={() => {
            openMathExample()
            handleClose()
          }}
          sx={{ p: 1.5 }}
        >
          Mathematics Study Example
        </MenuItem>

        <Typography
          sx={{
            px: 2,
            py: 1,
            fontWeight: 'bold',
            mt: 1,
            color: 'text.primary',
          }}
        >
          Tutorial
        </Typography>
        <Divider sx={{ borderColor: 'divider' }} />
        <MenuItem
          onClick={() => {
            openTutorialExample()
            handleClose()
          }}
          sx={{ p: 1.5 }}
        >
          AquaMesh Tutorial
        </MenuItem>

        {/* Custom Dashboards Section */}
        {visibleCustomDashboards.length > 0 && (
          <>
            {Object.entries(dashboardsByFolder).map(
              ([folderName, dashboards]) => (
                <React.Fragment key={folderName}>
                  <Typography
                    sx={{
                      px: 2,
                      py: 1,
                      fontWeight: 'bold',
                      mt: 1,
                      color: 'text.primary',
                    }}
                  >
                    {folderName}
                  </Typography>
                  <Divider sx={{ borderColor: 'divider' }} />
                  {[...dashboards].reverse().map((dashboard) => (
                    <MenuItem
                      key={dashboard.id}
                      onClick={() => loadCustomDashboard(dashboard)}
                      sx={{ p: 1.5 }}
                    >
                      {dashboard.name}
                    </MenuItem>
                  ))}
                </React.Fragment>
              ),
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
      </Menu>

      {/* Dashboard Library Dialog */}
      <SavedDashboardsDialog
        open={dashboardLibraryOpen}
        onClose={handleDashboardLibraryClose}
      />
    </>
  )
}

export default DashboardOptionsMenu

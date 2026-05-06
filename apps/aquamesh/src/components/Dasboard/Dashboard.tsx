import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  IconButton,
  FormControlLabel,
  ListItemIcon,
  Menu,
  MenuItem,
  Switch,
  Chip,
  Paper,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import TooltipStyled from '../TooltipStyled'

import { ReactComponent as AddIcon } from '../../icons/add.svg'
import { ReactComponent as CloseIcon } from '../../icons/close.svg'
import SaveIcon from '@mui/icons-material/Save'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import EditIcon from '@mui/icons-material/Edit'
import ExtensionIcon from '@mui/icons-material/Extension'
import DashboardLayoutView from '../Layout/Layout'
import { useLayout } from '../Layout/LayoutProvider'
import { DashboardLayout } from '../../state/store'
import { useDashboards } from './DashboardProvider'
import useTopNavBarWidgets from '../../customHooks/useTopNavBarWidgets'
import {
  ensureStarterDashboards,
  OPEN_DASHBOARD_EDITOR_EVENT,
  useWorkspaceActions,
} from '../../customHooks/useWorkspaceActions'
import './tabs.scss'

interface DashboardEditorWidgetConfig {
  name: string
  component: string
  customProps?: Record<string, unknown>
}

const createLayoutWithComponent = (
  componentConfig: DashboardEditorWidgetConfig,
): DashboardLayout => ({
  type: 'row',
  weight: 100,
  children: [
    {
      type: 'tabset',
      weight: 100,
      active: true,
      children: [
        {
          type: 'tab',
          name: componentConfig.name,
          component: componentConfig.component,
          config: componentConfig.customProps
            ? { customProps: componentConfig.customProps }
            : undefined,
        },
      ],
    },
  ],
})

// Define custom dashboard type for localStorage
interface SavedDashboard {
  id: string
  name: string
  folder?: string
  layout: DashboardLayout
  description?: string
  tags?: string[]
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

type DashboardOnboardingStep = 'layout' | 'save' | 'complete' | 'done'

const DASHBOARD_ONBOARDING_KEY = 'aquamesh-dashboard-onboarding-step-v2'
const WIDGET_EDITOR_ONBOARDING_KEY = 'aquamesh-widget-editor-onboarding-done'

const hasPlacedSavedWidget = (layout?: DashboardLayout): boolean => {
  if (!layout) {
    return false
  }

  if (layout.component === 'CustomWidget') {
    return true
  }

  return Boolean(layout.children?.some((child) => hasPlacedSavedWidget(child)))
}

// Dashboard Storage utilities
const DashboardStorage = {
  getAll: (): SavedDashboard[] => {
    try {
      const dashboards = localStorage.getItem('customDashboards')
      return dashboards ? JSON.parse(dashboards) : []
    } catch (error) {
      console.error('Failed to parse saved dashboards', error)
      return []
    }
  },

  getByName: (name: string): SavedDashboard | null => {
    try {
      const dashboards = DashboardStorage.getAll()
      return dashboards.find((dashboard) => dashboard.name === name) || null
    } catch (error) {
      console.error('Failed to find dashboard by name', error)
      return null
    }
  },

  save: (dashboard: SavedDashboard): SavedDashboard => {
    try {
      const dashboards = DashboardStorage.getAll()
      // Check if a dashboard with this id already exists and update it
      const existingIndex = dashboards.findIndex((d) => d.id === dashboard.id)

      if (existingIndex >= 0) {
        dashboards[existingIndex] = dashboard
      } else {
        dashboards.push(dashboard)
      }

      localStorage.setItem('customDashboards', JSON.stringify(dashboards))
      return dashboard
    } catch (error) {
      console.error('Failed to save dashboard', error)
      throw error
    }
  },

  delete: (id: string): void => {
    try {
      const dashboards = DashboardStorage.getAll()
      const filteredDashboards = dashboards.filter(
        (dashboard) => dashboard.id !== id,
      )
      localStorage.setItem(
        'customDashboards',
        JSON.stringify(filteredDashboards),
      )
    } catch (error) {
      console.error('Failed to delete dashboard', error)
    }
  },

  // Check if the current layout is different from the saved one
  hasChanges: (name: string, currentLayout?: DashboardLayout): boolean => {
    const savedDashboard = DashboardStorage.getByName(name)
    if (!savedDashboard) {
      return true
    } // If no saved dashboard exists, then there are changes
    if (!currentLayout) {
      return false
    } // If no current layout, no changes

    // Deep comparison between the current layout and saved layout
    return (
      JSON.stringify(currentLayout) !== JSON.stringify(savedDashboard.layout)
    )
  },
}

interface DashboardEmptyStateProps {
  isAdmin: boolean
  hasDashboard: boolean
  onCreateDashboard: () => void
  dashboardOptions: SavedDashboard[]
  onOpenDashboard: (dashboard: SavedDashboard) => void
}

const DashboardEmptyState = ({
  isAdmin,
  hasDashboard,
  onCreateDashboard,
  dashboardOptions,
  onOpenDashboard,
}: DashboardEmptyStateProps) => {
  const dashboardsByFolder = dashboardOptions.reduce<
    Record<string, SavedDashboard[]>
  >((folders, dashboard) => {
    const folderName = dashboard.folder?.trim() || 'Default'
    folders[folderName] = folders[folderName] || []
    folders[folderName].push(dashboard)
    return folders
  }, {})

  return (
    <Box
      sx={{
        minHeight: 'calc(100dvh - 130px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, md: 4 },
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 'min(980px, 100%)',
          p: { xs: 2.5, sm: 4 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'primary.light',
          bgcolor: 'background.accentSurface',
          color: 'foreground.contrastPrimary',
          textAlign: 'center',
        }}
      >
        <DashboardCustomizeIcon
          sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
        />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {hasDashboard ? 'Empty dashboard' : 'Open a dashboard'}
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'foreground.contrastSecondary', mb: 3 }}
        >
          {hasDashboard
            ? 'Create a new dashboard from this empty space, or open an existing dashboard from a folder below.'
            : 'Create a new dashboard, or open an existing dashboard from a folder below.'}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="center"
        >
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<DashboardCustomizeIcon />}
              onClick={onCreateDashboard}
              sx={{
                bgcolor: 'primary.dark',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.main' },
              }}
            >
              Create Dashboard
            </Button>
          )}
        </Stack>
        {Object.keys(dashboardsByFolder).length > 0 && (
          <Box sx={{ mt: 3, textAlign: 'left' }}>
            <Typography
              variant="subtitle2"
              sx={{ color: 'foreground.contrastSecondary', mb: 1.5 }}
            >
              Open existing dashboard
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              {Object.entries(dashboardsByFolder)
                .slice(0, 3)
                .map(([folderName, dashboards]) => (
                  <Box
                    key={folderName}
                    sx={{
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'foreground.contrastSecondary',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        display: 'block',
                        mb: 0.75,
                      }}
                    >
                      {folderName}
                    </Typography>
                    <Stack spacing={0.75}>
                      {dashboards.slice(0, 2).map((dashboard) => (
                        <Button
                          key={dashboard.id}
                          variant="outlined"
                          onClick={() => onOpenDashboard(dashboard)}
                          sx={{
                            minHeight: 52,
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            textTransform: 'none',
                            bgcolor: 'background.default',
                            color: 'text.primary',
                            borderColor: 'divider',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {dashboard.name}
                            </Typography>
                            {dashboard.description && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                }}
                              >
                                {dashboard.description}
                              </Typography>
                            )}
                          </Box>
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

interface DashboardOnboardingCoachProps {
  step: Exclude<DashboardOnboardingStep, 'done'>
  hasUnsavedChanges: boolean
  dashboardName: string
  onGotIt: () => void
}

const DashboardOnboardingCoach = ({
  step,
  hasUnsavedChanges,
  dashboardName,
  onGotIt,
}: DashboardOnboardingCoachProps) => {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isLayoutStep = step === 'layout'
  const isCompleteStep = step === 'complete'
  const dashboardMenuName = isPhone ? 'Dash' : 'Dashboards'

  return (
    <Paper
      data-testid={`dashboard-onboarding-coach-${step}`}
      elevation={6}
      sx={{
        position: 'absolute',
        top: { xs: 'auto', sm: 12 },
        bottom: { xs: 8, sm: 'auto' },
        right: { xs: 8, sm: 12 },
        left: { xs: 8, sm: 'auto' },
        zIndex: 1300,
        width: { xs: 'auto', sm: 420 },
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'primary.light',
        bgcolor: 'background.accentSoft',
        color: 'text.primary',
      }}
    >
      <Stack spacing={1}>
        {!isCompleteStep && (
          <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.8 }}>
            Step {isLayoutStep ? '4' : '5'}
          </Typography>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {isLayoutStep
            ? 'Shape your dashboard'
            : isCompleteStep
              ? 'Congratulations 🎉'
              : 'Save this dashboard'}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', lineHeight: 1.45 }}
        >
          {isCompleteStep
            ? `You finished the AquaMesh onboarding. You can keep exploring the app and creating your own widgets and dashboards. You’ll be able to find your saved dashboard “${dashboardName}” inside the ${dashboardMenuName} menu.`
            : isLayoutStep
              ? 'Drag the widget tab to a new spot in the dashboard.'
              : hasUnsavedChanges
                ? 'Save the dashboard using the disk icon on the Dashboard tab.'
                : 'Nice — this dashboard is saved. You can reopen it later from your saved dashboards.'}
        </Typography>
        {isCompleteStep && (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              variant="contained"
              onClick={onGotIt}
              sx={{ textTransform: 'none' }}
            >
              Got it
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}

const Dashboards = () => {
  const {
    openDashboards,
    selectedDashboard,
    setSelectedDashboard,
    removeDashboard,
    addDashboard,
    replaceDashboard,
    updateLayout,
    updateDashboardLayout,
    renameDashboard,
    setDashboardEditing,
  } = useDashboards()

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [dashboardName, setDashboardName] = useState('')
  const [dashboardFolder, setDashboardFolder] = useState('Default')
  const [dashboardDescription, setDashboardDescription] = useState('')
  const [dashboardTags, setDashboardTags] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [currentTabIndex, setCurrentTabIndex] = useState<number | null>(null)
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [dashboardOptions, setDashboardOptions] = useState<SavedDashboard[]>([])
  const [dashboardEditorId, setDashboardEditorId] = useState<string | null>(
    null,
  )
  const [draftDashboard, setDraftDashboard] = useState<{
    id: string
    name: string
    layout: DashboardLayout
  } | null>(null)
  const [dashboardWidgetsAnchorEl, setDashboardWidgetsAnchorEl] =
    useState<null | HTMLElement>(null)
  const dashboardOnboardingLayoutBaseline = useRef<{
    dashboardId: string
    layoutJson: string
  } | null>(null)
  const [dashboardOnboardingStep, setDashboardOnboardingStep] =
    useState<DashboardOnboardingStep>(() => {
      if (typeof window === 'undefined') {
        return 'layout'
      }

      const savedStep = window.localStorage.getItem(DASHBOARD_ONBOARDING_KEY)
      return savedStep === 'save' || savedStep === 'done' ? savedStep : 'layout'
    })
  const { addComponent } = useLayout()
  const { topNavBarWidgets } = useTopNavBarWidgets()
  const selectedDashboardIsEmpty =
    !openDashboards[selectedDashboard]?.layout?.children ||
    openDashboards[selectedDashboard]?.layout?.children?.length === 0
  const dashboardEditorIndex = dashboardEditorId
    ? openDashboards.findIndex(
        (dashboard) => dashboard.id === dashboardEditorId,
      )
    : -1
  const dashboardEditorDashboard =
    draftDashboard ||
    (dashboardEditorIndex >= 0 ? openDashboards[dashboardEditorIndex] : null)
  const dashboardEditorIsDraft = Boolean(draftDashboard)
  const dashboardEditorIsEmpty =
    !dashboardEditorDashboard?.layout?.children ||
    dashboardEditorDashboard.layout.children.length === 0
  const customWidgetPanels = topNavBarWidgets.filter((widget) =>
    widget.name.includes('Custom'),
  )

  const loadDashboardOptions = () => {
    ensureStarterDashboards()
    setDashboardOptions([...DashboardStorage.getAll()].reverse())
  }

  const completeDashboardOnboarding = () => {
    setDashboardOnboardingStep('done')
  }

  const persistDashboardOnboardingDone = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_ONBOARDING_KEY, 'done')
      window.localStorage.setItem(WIDGET_EDITOR_ONBOARDING_KEY, 'true')
    }
  }

  const advanceDashboardOnboarding = () => {
    setDashboardOnboardingStep('save')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_ONBOARDING_KEY, 'save')
    }
  }

  const openDashboardEditor = (dashboardId: string) => {
    setDraftDashboard(null)
    const dashboardIndex = openDashboards.findIndex(
      (dashboard) => dashboard.id === dashboardId,
    )

    if (dashboardIndex >= 0) {
      setSelectedDashboard(dashboardIndex)
    }

    setDashboardEditing(dashboardId, true)
    setDashboardEditorId(dashboardId)
  }

  const createDashboardInEditor = () => {
    setDashboardEditorId(null)
    setDraftDashboard({
      id: `draft-dashboard-${Date.now()}`,
      name: 'Create Dashboard',
      layout: {
        type: 'row',
        weight: 100,
        children: [],
      },
    })
  }

  const createEmptyDashboardTab = () => {
    addDashboard()
  }

  const openSavedDashboardFromEmptyState = (dashboard: SavedDashboard) => {
    if (openDashboards[selectedDashboard] && selectedDashboardIsEmpty) {
      replaceDashboard(selectedDashboard, {
        name: dashboard.name,
        layout: dashboard.layout,
      })
      return
    }

    addDashboard({
      name: dashboard.name,
      layout: dashboard.layout,
    })
  }

  const closeDashboardEditor = () => {
    if (dashboardEditorIsDraft) {
      setDraftDashboard(null)
    } else if (dashboardEditorId) {
      setDashboardEditing(dashboardEditorId, false)
    }

    setDashboardWidgetsAnchorEl(null)
    setDashboardEditorId(null)
  }

  const addWidgetToDashboardEditor = (
    item: DashboardEditorWidgetConfig & { id?: string },
  ) => {
    if (!dashboardEditorDashboard) {
      return
    }

    if (dashboardEditorIsEmpty) {
      const nextLayout = createLayoutWithComponent(item)

      if (dashboardEditorIsDraft) {
        setDraftDashboard((currentDraft) =>
          currentDraft ? { ...currentDraft, layout: nextLayout } : currentDraft,
        )
      } else if (dashboardEditorIndex >= 0) {
        updateDashboardLayout(dashboardEditorIndex, nextLayout)
      }

      return
    }

    addComponent(item)
  }

  const handleDashboardWidgetsMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setDashboardWidgetsAnchorEl(event.currentTarget)
  }

  const handleDashboardWidgetsMenuClose = () => {
    setDashboardWidgetsAnchorEl(null)
  }

  // Check if user is admin on component mount
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

  useEffect(() => {
    loadDashboardOptions()
  }, [])

  useEffect(() => {
    const handleOpenDashboardEditor = () => {
      createDashboardInEditor()
    }

    window.addEventListener(
      OPEN_DASHBOARD_EDITOR_EVENT,
      handleOpenDashboardEditor,
    )

    return () => {
      window.removeEventListener(
        OPEN_DASHBOARD_EDITOR_EVENT,
        handleOpenDashboardEditor,
      )
    }
  })

  // Check if current dashboards have changes compared to saved dashboards
  useEffect(() => {
    const changes: Record<string, boolean> = {}

    openDashboards.forEach((dashboard, index) => {
      changes[index] = DashboardStorage.hasChanges(
        dashboard.name,
        dashboard.layout,
      )
    })

    setHasChanges(changes)
  }, [openDashboards])

  useEffect(() => {
    const currentDashboard = openDashboards[selectedDashboard]
    const currentLayout = currentDashboard?.layout
    const hasWidget = hasPlacedSavedWidget(currentLayout)

    const currentChangeStateKnown = Object.prototype.hasOwnProperty.call(
      hasChanges,
      selectedDashboard,
    )

    if (
      dashboardOnboardingStep === 'save' &&
      hasWidget &&
      currentChangeStateKnown &&
      !hasChanges[selectedDashboard]
    ) {
      setDashboardOnboardingStep('complete')
      persistDashboardOnboardingDone()
      return
    }

    if (dashboardOnboardingStep !== 'layout' || !hasWidget) {
      dashboardOnboardingLayoutBaseline.current = null
      return
    }

    const dashboardId = currentDashboard?.id || String(selectedDashboard)
    const layoutJson = JSON.stringify(currentLayout || {})
    const baseline = dashboardOnboardingLayoutBaseline.current

    if (!baseline || baseline.dashboardId !== dashboardId) {
      dashboardOnboardingLayoutBaseline.current = { dashboardId, layoutJson }
      return
    }

    if (baseline.layoutJson !== layoutJson) {
      dashboardOnboardingLayoutBaseline.current = null
      advanceDashboardOnboarding()
    }
  }, [dashboardOnboardingStep, hasChanges, openDashboards, selectedDashboard])

  const handleSaveDialogOpen = (index: number) => {
    if (dashboardEditorIsDraft && draftDashboard) {
      setCurrentTabIndex(null)
      setDashboardName('')
      setDashboardFolder('Default')
      setDashboardDescription('')
      setDashboardTags(['dashboard'])
      setIsPublic(false)
      setTagInput('')
      setSaveDialogOpen(true)
      return
    }

    const currentDashboard = openDashboards[index]

    // Check if it's an update of an existing dashboard
    const existingDashboard = DashboardStorage.getByName(currentDashboard.name)

    if (existingDashboard) {
      // Direct update without showing the dialog for existing dashboards
      try {
        if (currentDashboard.layout) {
          const updatedDashboard: SavedDashboard = {
            ...existingDashboard,
            layout: currentDashboard.layout,
            updatedAt: new Date().toISOString(),
          }

          DashboardStorage.save(updatedDashboard)
          loadDashboardOptions()

          // Mark this dashboard as no longer having changes
          setHasChanges((prev) => ({
            ...prev,
            [index]: false,
          }))
          setDashboardEditing(currentDashboard.id, false)
          if (dashboardEditorId === currentDashboard.id) {
            setDashboardEditorId(null)
          }
        }
      } catch (error) {
        console.error('Error updating dashboard:', error)
      }
    } else {
      // Show enhanced save dialog for new dashboards
      setCurrentTabIndex(index)
      setDashboardName(currentDashboard.name || '')
      setDashboardFolder('Default')
      setDashboardDescription('')
      setDashboardTags(['dashboard'])
      setIsPublic(false)
      setTagInput('')
      setSaveDialogOpen(true)
    }
  }

  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false)
    setDashboardName('')
    setDashboardFolder('Default')
    setDashboardDescription('')
    setDashboardTags([])
    setIsPublic(false)
    setTagInput('')
    setCurrentTabIndex(null)
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !dashboardTags.includes(tagInput.trim())) {
      setDashboardTags([...dashboardTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setDashboardTags(dashboardTags.filter((tag) => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSaveDashboard = () => {
    if (draftDashboard && dashboardName.trim() !== '') {
      try {
        const newDashboard: SavedDashboard = {
          id: `dashboard-${Date.now()}`,
          name: dashboardName.trim(),
          folder: dashboardFolder.trim() || 'Default',
          layout: draftDashboard.layout,
          description: dashboardDescription.trim() || undefined,
          tags: dashboardTags.length > 0 ? dashboardTags : ['dashboard'],
          isPublic: isAdmin ? isPublic : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        DashboardStorage.save(newDashboard)
        loadDashboardOptions()
        addDashboard({
          name: newDashboard.name,
          layout: newDashboard.layout,
        })
        setDraftDashboard(null)
        setDashboardEditorId(null)
        handleSaveDialogClose()
      } catch (error) {
        console.error('Error saving dashboard:', error)
      }
      return
    }

    if (currentTabIndex !== null && dashboardName.trim() !== '') {
      const currentDashboard = openDashboards[currentTabIndex]
      try {
        if (currentDashboard.layout) {
          const newDashboard: SavedDashboard = {
            id: `dashboard-${Date.now()}`,
            name: dashboardName.trim(),
            folder: dashboardFolder.trim() || 'Default',
            layout: currentDashboard.layout,
            description: dashboardDescription.trim() || undefined,
            tags: dashboardTags.length > 0 ? dashboardTags : ['dashboard'],
            isPublic: isAdmin ? isPublic : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          DashboardStorage.save(newDashboard)
          loadDashboardOptions()

          // Update the dashboard name in the TabList
          renameDashboard(currentDashboard.id, dashboardName)

          // Mark this dashboard as no longer having changes
          setHasChanges((prev) => ({
            ...prev,
            [currentTabIndex]: false,
          }))
          setDashboardEditing(currentDashboard.id, false)
          if (dashboardEditorId === currentDashboard.id) {
            setDashboardEditorId(null)
          }
        }

        handleSaveDialogClose()
      } catch (error) {
        console.error('Error saving dashboard:', error)
      }
    }
  }

  const handleDashboardEditorSave = () => {
    if (dashboardEditorIsDraft) {
      handleSaveDialogOpen(-1)
      return
    }

    handleSaveDialogOpen(dashboardEditorIndex)
  }

  return (
    <Box>
      <Tabs
        className={`react-tabs ${selectedDashboardIsEmpty ? 'react-tabs--empty-selected' : ''}`.trim()}
        selectedIndex={selectedDashboard}
        onSelect={(index) => setSelectedDashboard(index)}
        style={{ position: 'relative' }}
      >
        <TabList>
          {openDashboards.map((dashboard, index) => (
            <Tab key={dashboard.id}>
              <Typography
                variant="subtitle2"
                sx={{
                  flex: '1 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginLeft: '0.5rem',
                }}
              >
                {dashboard.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {hasChanges[index] && (
                  <TooltipStyled title="Save Dashboard">
                    <IconButton
                      aria-label={`Save dashboard ${dashboard.name}`}
                      data-testid={`save-dashboard-${index}`}
                      size="small"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        handleSaveDialogOpen(index)
                      }}
                      sx={{
                        p: 0.5,
                        mr: 0.5,
                        color: 'primary.light',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      <SaveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TooltipStyled>
                )}
                {dashboard.layout?.children &&
                  dashboard.layout.children.length > 0 && (
                    <TooltipStyled title="Edit Dashboard">
                      <IconButton
                        aria-label={`Edit dashboard ${dashboard.name}`}
                        size="small"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          openDashboardEditor(dashboard.id)
                        }}
                        sx={{
                          p: 0.5,
                          mr: 0.5,
                          color: 'text.secondary',
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TooltipStyled>
                  )}
                <Box
                  className="close"
                  sx={{
                    display: 'flex',
                    p: 0.5,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '999px',
                    transition: 'all .25s ease',
                    '&:hover': {
                      backgroundColor: 'action.contrastHover',
                    },
                  }}
                >
                  <CloseIcon
                    width={16}
                    height={16}
                    onClick={(ev) => {
                      // NOTE prevent the tab being closed from being selected too!
                      ev.stopPropagation()
                      removeDashboard(dashboard.id)
                    }}
                  />
                </Box>
              </Box>
            </Tab>
          ))}
          <Button
            size="small"
            variant="text"
            disableRipple
            data-testid="add-dashboard-button"
            sx={{
              position: 'relative',
              top: '3px',
              marginBottom: '8px',
              minWidth: 'fit-content',
              display: 'flex',
              alignItems: 'middle',
              gap: '8px',
              fontSize: '13px',
              p: '4px 12px',
              color: 'primary.light',
              transition: 'all .25s ease',
              '.MuiButton-startIcon': {
                transition: 'all .25s ease',
                m: 0,
                color: 'primary.light',
              },
              ':hover': {
                backgroundColor: 'transparent',
                color: 'primary.main',
                '.MuiButton-startIcon': {
                  color: 'primary.main',
                },
              },
            }}
            startIcon={<AddIcon width={16} height={16} />}
            onClick={createEmptyDashboardTab}
          />
        </TabList>
        {openDashboards.map((dashboard, index) => {
          const isEmptyDashboard =
            !dashboard.layout?.children ||
            dashboard.layout.children.length === 0
          const showDashboardOnboarding =
            index === selectedDashboard &&
            dashboardOnboardingStep !== 'done' &&
            hasPlacedSavedWidget(dashboard.layout)

          return (
            <TabPanel key={dashboard.id}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  backgroundColor: 'background.default',
                }}
              >
                <Box sx={{ position: 'relative', flex: '1' }}>
                  {showDashboardOnboarding && (
                    <DashboardOnboardingCoach
                      step={dashboardOnboardingStep}
                      hasUnsavedChanges={Boolean(hasChanges[index])}
                      dashboardName={dashboard.name}
                      onGotIt={completeDashboardOnboarding}
                    />
                  )}
                  {isEmptyDashboard ? (
                    <DashboardEmptyState
                      isAdmin={isAdmin}
                      hasDashboard
                      onCreateDashboard={() =>
                        openDashboardEditor(dashboard.id)
                      }
                      dashboardOptions={dashboardOptions}
                      onOpenDashboard={openSavedDashboardFromEmptyState}
                    />
                  ) : (
                    <DashboardLayoutView
                      layout={dashboard.layout}
                      readOnly
                      updateLayout={(model) => {
                        updateLayout(model)
                        // Mark this dashboard as having changes after layout update
                        setHasChanges((prev) => ({
                          ...prev,
                          [selectedDashboard]: true,
                        }))
                      }}
                    />
                  )}
                </Box>
              </Box>
            </TabPanel>
          )
        })}
      </Tabs>

      {openDashboards.length === 0 && (
        <DashboardEmptyState
          isAdmin={isAdmin}
          hasDashboard={false}
          onCreateDashboard={createDashboardInEditor}
          dashboardOptions={dashboardOptions}
          onOpenDashboard={openSavedDashboardFromEmptyState}
        />
      )}

      <Dialog
        fullScreen
        open={Boolean(dashboardEditorDashboard)}
        onClose={closeDashboardEditor}
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
              height: 56,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {dashboardEditorDashboard?.name || 'Dashboard'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<ExtensionIcon />}
                onClick={handleDashboardWidgetsMenuOpen}
                sx={{ textTransform: 'none' }}
              >
                Widgets
              </Button>
              <Menu
                anchorEl={dashboardWidgetsAnchorEl}
                open={Boolean(dashboardWidgetsAnchorEl)}
                onClose={handleDashboardWidgetsMenuClose}
                PaperProps={{
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    width: 260,
                    boxShadow: 3,
                    border: 1,
                    borderColor: 'divider',
                  },
                }}
              >
                <Typography
                  sx={{
                    px: 2,
                    py: 1,
                    fontWeight: 'bold',
                    color: 'text.primary',
                  }}
                >
                  My Widgets
                </Typography>
                <Divider sx={{ borderColor: 'divider' }} />
                {customWidgetPanels.length > 0 ? (
                  customWidgetPanels.map((topNavBarWidget) => (
                    <Box key={topNavBarWidget.name}>
                      {topNavBarWidget.items.map((item) => (
                        <MenuItem
                          key={item.name}
                          onClick={() => {
                            addWidgetToDashboardEditor({
                              id: `panel-${Date.now()}`,
                              ...item,
                            })
                            handleDashboardWidgetsMenuClose()
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
                      whiteSpace: 'normal',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                    >
                      No saved widgets yet. Create a widget first, then return
                      here to place it on a dashboard.
                    </Typography>
                  </MenuItem>
                )}
              </Menu>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={
                  dashboardEditorIsEmpty ||
                  (!dashboardEditorIsDraft && dashboardEditorIndex < 0)
                }
                onClick={handleDashboardEditorSave}
                sx={{ textTransform: 'none' }}
              >
                Save
              </Button>
              <IconButton
                aria-label="Close dashboard editor"
                onClick={closeDashboardEditor}
              >
                <CloseIcon width={20} height={20} />
              </IconButton>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {dashboardEditorDashboard &&
              (dashboardEditorIsEmpty ? (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: { xs: 2, md: 4 },
                    bgcolor: 'background.default',
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      width: 'min(640px, 100%)',
                      p: { xs: 2.5, sm: 4 },
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      textAlign: 'center',
                    }}
                  >
                    <DashboardCustomizeIcon
                      sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
                    />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Empty dashboard
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: 'text.secondary' }}
                    >
                      Use Widgets, then choose a saved item from My Widgets.
                    </Typography>
                  </Paper>
                </Box>
              ) : (
                <DashboardLayoutView
                  key={dashboardEditorDashboard.id}
                  layout={dashboardEditorDashboard.layout}
                  updateLayout={(model) => {
                    if (dashboardEditorIsDraft) {
                      setDraftDashboard((currentDraft) =>
                        currentDraft
                          ? { ...currentDraft, layout: model.toJson().layout }
                          : currentDraft,
                      )
                      return
                    }

                    updateLayout(model)
                    setHasChanges((prev) => ({
                      ...prev,
                      [selectedDashboard]: true,
                    }))
                  }}
                />
              ))}
          </Box>
        </Box>
      </Dialog>

      {/* Save Dashboard Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={handleSaveDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
            pb: 2,
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" fontWeight="medium">
                Save Dashboard
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Configure your dashboard settings
              </Typography>
            </Box>
            <IconButton
              onClick={handleSaveDialogClose}
              aria-label="close"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon width={20} height={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ bgcolor: 'background.default', pt: 3, pb: 2 }}>
          <TextField
            autoFocus
            margin="normal"
            id="name"
            label="Dashboard Name"
            type="text"
            fullWidth
            variant="outlined"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            onFocus={(e) => {
              e.target.select()
            }}
            error={dashboardName.trim() === ''}
            helperText={
              dashboardName.trim() === '' ? 'Dashboard name is required' : ''
            }
            required
            InputLabelProps={{
              shrink: true,
              sx: { color: 'text.secondary' },
            }}
            InputProps={{
              sx: {
                bgcolor: 'background.paper',
                color: 'text.primary',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
              endAdornment: dashboardName.trim() !== '' && (
                <IconButton
                  size="small"
                  onClick={() => setDashboardName('')}
                  edge="end"
                  sx={{ color: 'text.secondary' }}
                >
                  <CloseIcon width={16} height={16} />
                </IconButton>
              ),
            }}
          />

          <TextField
            margin="normal"
            id="folder"
            label="Folder"
            type="text"
            fullWidth
            variant="outlined"
            value={dashboardFolder}
            onChange={(e) => setDashboardFolder(e.target.value)}
            helperText="Dashboards with the same folder name are grouped together."
            InputLabelProps={{
              shrink: true,
              sx: { color: 'text.secondary' },
            }}
            InputProps={{
              sx: {
                bgcolor: 'background.paper',
                color: 'text.primary',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />

          <TextField
            margin="normal"
            id="description"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={dashboardDescription}
            onChange={(e) => setDashboardDescription(e.target.value)}
            onFocus={(e) => {
              e.target.select()
            }}
            InputLabelProps={{
              shrink: true,
              sx: { color: 'text.secondary' },
            }}
            InputProps={{
              sx: {
                bgcolor: 'background.paper',
                color: 'text.primary',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.primary" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                size="small"
                onKeyDown={handleTagInputKeyDown}
                InputProps={{
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'divider',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
                sx={{ flexGrow: 1, mr: 1 }}
              />
              <Button
                onClick={handleAddTag}
                variant="contained"
                disabled={!tagInput.trim()}
                sx={{
                  bgcolor: 'primary.light',
                  color: '#191919',
                  '&:hover': {
                    bgcolor: 'primary.main',
                  },
                }}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {dashboardTags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  sx={{
                    bgcolor: 'rgba(0, 124, 102, 0.1)',
                    color: 'primary.dark',
                    '& .MuiChip-deleteIcon': {
                      color: 'primary.dark',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    },
                  }}
                />
              ))}
              {dashboardTags.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No tags added yet
                </Typography>
              )}
            </Box>
          </Box>

          {isAdmin && (
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'primary.light',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                />
              }
              label="Make dashboard public"
              sx={{
                color: 'text.primary',
                mt: 2,
              }}
            />
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={handleSaveDialogClose}
            variant="outlined"
            sx={{
              color: 'primary.dark',
              borderColor: 'primary.dark',
              mr: 1,
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(0, 124, 102, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveDashboard}
            variant="contained"
            color="primary"
            disabled={
              dashboardName.trim() === '' ||
              dashboardName.trim() === 'Dashboard'
            }
            startIcon={<SaveIcon />}
            sx={{
              bgcolor: 'primary.dark',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.main',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Dashboards

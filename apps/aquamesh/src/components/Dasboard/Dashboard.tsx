import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControlLabel,
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
import WidgetsIcon from '@mui/icons-material/Widgets'
import CreateIcon from '@mui/icons-material/Create'
import ImportContactsIcon from '@mui/icons-material/ImportContacts'
import { useNavigate } from 'react-router-dom'

import DashboardLayoutView from '../Layout/Layout'
import { DashboardLayout } from '../../state/store'
import { useDashboards } from './DashboardProvider'
import { useWorkspaceActions } from '../../customHooks/useWorkspaceActions'
import './tabs.scss'

// Define custom dashboard type for localStorage
interface SavedDashboard {
  id: string
  name: string
  layout: DashboardLayout
  description?: string
  tags?: string[]
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

type DashboardOnboardingStep = 'layout' | 'save' | 'done'

const DASHBOARD_ONBOARDING_KEY = 'aquamesh-dashboard-onboarding-step-v2'

const hasPlacedSavedWidget = (layout?: DashboardLayout): boolean => {
  if (!layout) {
    return false
  }

  if (layout.component === 'CustomWidget') {
    return true
  }

  return Boolean(layout.children?.some((child) => hasPlacedSavedWidget(child)))
}

const countPlacedWidgets = (layout?: DashboardLayout): number => {
  if (!layout) {
    return 0
  }

  const current = layout.component ? 1 : 0
  const children = layout.children?.reduce(
    (total, child) => total + countPlacedWidgets(child),
    0,
  )

  return current + (children || 0)
}

const countWidgetPanels = (layout?: DashboardLayout): number => {
  if (!layout) {
    return 0
  }

  if (layout.type === 'tabset') {
    return hasPlacedSavedWidget(layout) ? 1 : 0
  }

  return (
    layout.children?.reduce(
      (total, child) => total + countWidgetPanels(child),
      0,
    ) || 0
  )
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
  onCreateWidget: () => void
  onOpenOperationsExample: () => void
  onOpenWidgetMenu: () => void
  onOpenQuickGuide: () => void
}

const DashboardEmptyState = ({
  isAdmin,
  onCreateWidget,
  onOpenOperationsExample,
  onOpenWidgetMenu,
  onOpenQuickGuide,
}: DashboardEmptyStateProps) => (
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
        width: 'min(720px, 100%)',
        p: { xs: 2.5, sm: 4 },
        borderRadius: 2,
        border: '1px solid rgba(0, 188, 162, 0.24)',
        bgcolor: 'rgba(0, 188, 162, 0.06)',
        color: 'foreground.contrastPrimary',
        textAlign: 'center',
      }}
    >
      <DashboardCustomizeIcon
        sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
      />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Build your Daily Operations dashboard
      </Typography>
      <Typography
        variant="body1"
        sx={{ color: 'foreground.contrastSecondary', mb: 3 }}
      >
        Imagine a small operations team tracking orders, delayed tasks, support
        tickets, and system status. Start by creating one reusable Daily
        Operations widget, then place it on this dashboard.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="center"
        sx={{ mb: 2 }}
      >
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<CreateIcon />}
            onClick={onCreateWidget}
          >
            Create your own widget
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<DashboardCustomizeIcon />}
          onClick={onOpenOperationsExample}
        >
          View Daily Operations example
        </Button>
        <Button
          variant="outlined"
          startIcon={<WidgetsIcon />}
          onClick={onOpenWidgetMenu}
        >
          Add saved widget
        </Button>
      </Stack>
      <Button
        variant="text"
        startIcon={<ImportContactsIcon />}
        onClick={onOpenQuickGuide}
        sx={{ color: 'foreground.contrastPrimary' }}
      >
        Open quick guide
      </Button>
    </Paper>
  </Box>
)

interface DashboardOnboardingCoachProps {
  step: Exclude<DashboardOnboardingStep, 'done'>
  hasUnsavedChanges: boolean
  hasMultipleWidgets: boolean
  hasSplitDashboard: boolean
  isPhone: boolean
  onNext: () => void
  onDone: () => void
}

const DashboardOnboardingCoach = ({
  step,
  hasUnsavedChanges,
  hasMultipleWidgets,
  hasSplitDashboard,
  isPhone,
  onNext,
  onDone,
}: DashboardOnboardingCoachProps) => {
  const isLayoutStep = step === 'layout'

  return (
    <Paper
      data-testid={`dashboard-onboarding-coach-${step}`}
      elevation={6}
      sx={{
        position: 'absolute',
        top: { xs: 8, sm: 12 },
        right: { xs: 8, sm: 12 },
        left: { xs: 8, sm: 'auto' },
        zIndex: 10,
        width: { xs: 'auto', sm: 420 },
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        border: '1px solid rgba(0, 188, 162, 0.36)',
        bgcolor: 'rgba(0, 66, 50, 0.96)',
        color: 'primary.contrastText',
      }}
    >
      <Stack spacing={1}>
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.8 }}>
          Step {isLayoutStep ? '4' : '5'}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {isLayoutStep ? 'Shape your dashboard' : 'Save this dashboard'}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'rgba(255, 255, 255, 0.84)', lineHeight: 1.45 }}
        >
          {isLayoutStep
            ? `To build a multi-widget dashboard, ${hasMultipleWidgets ? 'drag a widget tab to another side of the dashboard' : `open ${isPhone ? 'Add' : 'Add Widget'} and add another saved widget, then drag a widget tab to another side of the dashboard`}. Use the thin separator line between widgets to make one bigger or smaller.`
            : hasUnsavedChanges
              ? 'Click the dashboard tab at the top, then click the small save button on that tab to save the whole multi-widget dashboard.'
              : 'Nice — this dashboard is saved. You can reopen it later from your saved dashboards.'}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {isLayoutStep ? (
            <Button
              size="small"
              variant="contained"
              onClick={onNext}
              disabled={!hasSplitDashboard}
              sx={{ textTransform: 'none' }}
            >
              {hasSplitDashboard
                ? 'Next: save dashboard'
                : hasMultipleWidgets
                  ? 'Drag a tab to split first'
                  : 'Add another widget first'}
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={onDone}
              sx={{ textTransform: 'none' }}
            >
              Got it
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}

const Dashboards = () => {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const {
    openDashboards,
    selectedDashboard,
    setSelectedDashboard,
    removeDashboard,
    addDashboard,
    updateLayout,
    renameDashboard,
  } = useDashboards()

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [dashboardName, setDashboardName] = useState('')
  const [dashboardDescription, setDashboardDescription] = useState('')
  const [dashboardTags, setDashboardTags] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [currentTabIndex, setCurrentTabIndex] = useState<number | null>(null)
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [dashboardOnboardingStep, setDashboardOnboardingStep] =
    useState<DashboardOnboardingStep>(() => {
      if (typeof window === 'undefined') {
        return 'layout'
      }

      const savedStep = window.localStorage.getItem(DASHBOARD_ONBOARDING_KEY)
      return savedStep === 'save' || savedStep === 'done' ? savedStep : 'layout'
    })
  const navigate = useNavigate()
  const { openCreateWidget, openOperationsExample, openWidgetMenu } =
    useWorkspaceActions()
  const openQuickGuide = () => navigate('/')

  const completeDashboardOnboarding = () => {
    setDashboardOnboardingStep('done')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_ONBOARDING_KEY, 'done')
    }
  }

  const advanceDashboardOnboarding = () => {
    setDashboardOnboardingStep('save')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_ONBOARDING_KEY, 'save')
    }
  }

  const returnDashboardOnboardingToLayout = () => {
    setDashboardOnboardingStep('layout')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_ONBOARDING_KEY, 'layout')
    }
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
    const currentLayout = openDashboards[selectedDashboard]?.layout
    const hasSplitLayout = countWidgetPanels(currentLayout) > 1

    if (dashboardOnboardingStep === 'layout' && hasSplitLayout) {
      advanceDashboardOnboarding()
      return
    }

    if (dashboardOnboardingStep === 'save' && !hasSplitLayout) {
      returnDashboardOnboardingToLayout()
      return
    }
  }, [dashboardOnboardingStep, hasChanges, openDashboards, selectedDashboard])

  const handleSaveDialogOpen = (index: number) => {
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

          // Mark this dashboard as no longer having changes
          setHasChanges((prev) => ({
            ...prev,
            [index]: false,
          }))
        }
      } catch (error) {
        console.error('Error updating dashboard:', error)
      }
    } else {
      // Show enhanced save dialog for new dashboards
      setCurrentTabIndex(index)
      setDashboardName(currentDashboard.name || '')
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
    if (currentTabIndex !== null && dashboardName.trim() !== '') {
      const currentDashboard = openDashboards[currentTabIndex]
      try {
        if (currentDashboard.layout) {
          const newDashboard: SavedDashboard = {
            id: `dashboard-${Date.now()}`,
            name: dashboardName.trim(),
            layout: currentDashboard.layout,
            description: dashboardDescription.trim() || undefined,
            tags: dashboardTags.length > 0 ? dashboardTags : ['dashboard'],
            isPublic: isAdmin ? isPublic : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          DashboardStorage.save(newDashboard)

          // Update the dashboard name in the TabList
          renameDashboard(currentDashboard.id, dashboardName)

          // Mark this dashboard as no longer having changes
          setHasChanges((prev) => ({
            ...prev,
            [currentTabIndex]: false,
          }))
        }

        handleSaveDialogClose()
      } catch (error) {
        console.error('Error saving dashboard:', error)
      }
    }
  }

  return (
    <Box>
      <Tabs
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
            onClick={() => addDashboard()}
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
          const hasMultipleWidgets = countPlacedWidgets(dashboard.layout) > 1
          const hasSplitDashboard = countWidgetPanels(dashboard.layout) > 1

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
                      hasMultipleWidgets={hasMultipleWidgets}
                      hasSplitDashboard={hasSplitDashboard}
                      isPhone={isPhone}
                      onNext={advanceDashboardOnboarding}
                      onDone={completeDashboardOnboarding}
                    />
                  )}
                  {isEmptyDashboard ? (
                    <DashboardEmptyState
                      isAdmin={isAdmin}
                      onCreateWidget={openCreateWidget}
                      onOpenOperationsExample={openOperationsExample}
                      onOpenWidgetMenu={openWidgetMenu}
                      onOpenQuickGuide={openQuickGuide}
                    />
                  ) : (
                    <DashboardLayoutView
                      layout={dashboard.layout}
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
          onCreateWidget={openCreateWidget}
          onOpenOperationsExample={openOperationsExample}
          onOpenWidgetMenu={openWidgetMenu}
          onOpenQuickGuide={openQuickGuide}
        />
      )}

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
                  bgcolor: '#00D1AB',
                  color: '#191919',
                  '&:hover': {
                    bgcolor: '#00E4BC',
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
                      color: '#00D1AB',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#00886F',
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

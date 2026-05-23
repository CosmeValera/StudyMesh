import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Drawer,
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
  Autocomplete,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import TooltipStyled from '../TooltipStyled'

import { ReactComponent as AddIcon } from '../../icons/add.svg'
import { ReactComponent as CloseIcon } from '../../icons/close.svg'
import SaveIcon from '@mui/icons-material/Save'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import ConstructionIcon from '@mui/icons-material/Construction'
import EditIcon from '@mui/icons-material/Edit'
import ExtensionIcon from '@mui/icons-material/Extension'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import RouteIcon from '@mui/icons-material/Route'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import DashboardLayoutView from '../Layout/Layout'
import { useLayout } from '../Layout/LayoutProvider'
import { DashboardLayout, StateDashboard } from '../../state/store'
import { useDashboards } from './DashboardProvider'
import SavedDashboardsDialog from './DashboardLibrary'
import StudyPathWorkspaceView from './StudyPathWorkspaceView'
import DashboardChatPanel, {
  DashboardChatMessage,
} from '../dashboardChat/DashboardChatPanel'
import {
  createStudyPathContainerState,
  getStudyPathMetaFromLayout,
} from './studyPathContainer'
import useTopNavBarWidgets from '../../customHooks/useTopNavBarWidgets'
import {
  ensureStarterDashboards,
  OPEN_CREATE_HUB_EVENT,
  OPEN_DASHBOARD_EDITOR_EVENT,
  OPEN_WIDGET_EDITOR_EVENT,
  STARTER_STUDY_PATH_FOLDER_NAME,
} from '../../customHooks/useWorkspaceActions'
import {
  DEFAULT_FOLDER_COLOR,
  FOLDER_COLOR_PRESETS,
  normalizeFolderColor,
  normalizeFolderName,
} from './folderColors'
import { OPEN_STUDY_PATH_REVIEW_DASHBOARD_EVENT } from '../../studyPack/progress'
import { dispatchWorkspaceOnboardingEvent } from '../onboarding/onboardingEvents'
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
  folderColor?: string
  layout: DashboardLayout
  description?: string
  tags?: string[]
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

const DEFAULT_DASHBOARD_NAME = 'New Dashboard'
const DEFAULT_STUDY_PATH_OPENED_KEY = 'studymesh-default-study-path-opened-v1'
const USER_ROLE_CHANGED_EVENT = 'studymesh-user-role-changed'
const OPEN_SAVED_DASHBOARDS_EVENT = 'studymesh-open-saved-dashboards'

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getUniqueDashboardName = (
  requestedName: string,
  dashboards: SavedDashboard[],
  ignoreDashboardId?: string,
) => {
  const baseName = requestedName.trim() || DEFAULT_DASHBOARD_NAME
  const usedNames = new Set(
    dashboards
      .filter((dashboard) => dashboard.id !== ignoreDashboardId)
      .map((dashboard) => dashboard.name),
  )

  if (!usedNames.has(baseName)) {
    return baseName
  }

  const suffixPattern = new RegExp(`^${escapeRegExp(baseName)} \\((\\d+)\\)$`)
  let nextSuffix = 2

  usedNames.forEach((name) => {
    const match = name.match(suffixPattern)
    if (match) {
      nextSuffix = Math.max(nextSuffix, Number(match[1]) + 1)
    }
  })

  let candidate = `${baseName} (${nextSuffix})`
  while (usedNames.has(candidate)) {
    nextSuffix += 1
    candidate = `${baseName} (${nextSuffix})`
  }

  return candidate
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

const countDashboardNodes = (
  layout?: DashboardLayout,
): { tabCount: number; tabsetCount: number } => {
  if (!layout) {
    return { tabCount: 0, tabsetCount: 0 }
  }

  const childCounts = (layout.children || []).reduce(
    (counts, child) => {
      const next = countDashboardNodes(child)
      return {
        tabCount: counts.tabCount + next.tabCount,
        tabsetCount: counts.tabsetCount + next.tabsetCount,
      }
    },
    { tabCount: 0, tabsetCount: 0 },
  )

  return {
    tabCount: childCounts.tabCount + (layout.type === 'tab' ? 1 : 0),
    tabsetCount: childCounts.tabsetCount + (layout.type === 'tabset' ? 1 : 0),
  }
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

  getFolderColor: (folder: string): string => {
    const folderName = normalizeFolderName(folder)
    const dashboard = DashboardStorage.getAll().find(
      (savedDashboard) =>
        normalizeFolderName(savedDashboard.folder) === folderName &&
        savedDashboard.folderColor,
    )

    return normalizeFolderColor(dashboard?.folderColor)
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
  onCreateStudyPath: () => void
  onCreateFromNotes: () => void
  onOpenSavedLibrary: () => void
  dashboardOptions: SavedDashboard[]
  onOpenDashboard: (dashboard: SavedDashboard) => void
  onOpenStudyGuide: (dashboards: SavedDashboard[]) => void
}

const DashboardEmptyState = ({
  isAdmin,
  onCreateStudyPath,
  onCreateFromNotes,
  onOpenSavedLibrary,
  dashboardOptions,
  onOpenDashboard,
  onOpenStudyGuide,
}: DashboardEmptyStateProps) => {
  const dashboardsByFolder = dashboardOptions.reduce<
    Record<string, SavedDashboard[]>
  >((folders, dashboard) => {
    const folderName = dashboard.folder?.trim() || 'Default'
    folders[folderName] = folders[folderName] || []
    folders[folderName].push(dashboard)
    return folders
  }, {})
  const folderEntries = Object.entries(dashboardsByFolder)
  const hasStudyGuides = folderEntries.some(([, dashboards]) =>
    Boolean(createStudyPathContainerState(dashboards)),
  )
  const hasStandaloneDashboards = folderEntries.some(
    ([, dashboards]) => !createStudyPathContainerState(dashboards),
  )
  const openExistingLabel = hasStudyGuides
    ? hasStandaloneDashboards
      ? 'Open existing dashboard or study guide'
      : 'Open existing study guide'
    : 'Open existing dashboard'
  const featuredFolders = folderEntries.slice(0, 4)

  return (
    <Box
      sx={{
        minHeight: 'calc(100dvh - 130px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1.5, md: 2.5 },
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          width: 'min(1280px, 100%)',
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(240px, 3fr) minmax(320px, 4fr) minmax(240px, 3fr)',
          },
          gap: { xs: 1.5, lg: 2 },
          alignItems: 'stretch',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 260, lg: 520 },
            p: { xs: 2, md: 2.5 },
            borderRadius: 2,
            border: 1,
            borderColor: 'primary.light',
            bgcolor: 'background.accentSurface',
            color: 'foreground.contrastPrimary',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 2.5,
          }}
        >
          <Box>
            <RouteIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.15 }}>
              Create a Study Path
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 1, color: 'foreground.contrastSecondary' }}
            >
              Start from a topic or prompt and generate ordered tutorial
              dashboards.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<RouteIcon />}
            onClick={onCreateStudyPath}
            disabled={!isAdmin}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.dark',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            Create Study Path
          </Button>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 320, lg: 520 },
            p: { xs: 2, md: 2.5 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <FolderOpenIcon color="primary" />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                fontWeight={900}
                sx={{ lineHeight: 1.15 }}
              >
                Open study material
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Continue existing Study Paths, Study Packs, or custom
                dashboards.
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ mb: 1, color: 'text.secondary' }}
            >
              Recent folders
            </Typography>
            {featuredFolders.length > 0 ? (
              <Stack spacing={1}>
                {featuredFolders.map(([folderName, dashboards]) => {
                  const studyGuide = createStudyPathContainerState(dashboards)
                  const folderColor = normalizeFolderColor(
                    dashboards.find((dashboard) => dashboard.folderColor)
                      ?.folderColor ||
                      DashboardStorage.getFolderColor(folderName),
                  )
                  const firstDashboard = dashboards[0]

                  return (
                    <Button
                      key={folderName}
                      variant="text"
                      onClick={() =>
                        studyGuide
                          ? onOpenStudyGuide(dashboards)
                          : firstDashboard && onOpenDashboard(firstDashboard)
                      }
                      sx={{
                        minHeight: 54,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        textTransform: 'none',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1.25,
                        px: 1.25,
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          borderColor: folderColor,
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: folderColor,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                          }}
                        >
                          {folderName}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {studyGuide?.title || firstDashboard?.name}
                        </Typography>
                      </Box>
                    </Button>
                  )
                })}
              </Stack>
            ) : (
              <Box
                sx={{
                  minHeight: 190,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  px: 2,
                  color: 'text.secondary',
                }}
              >
                <Box>
                  <FolderOpenIcon sx={{ fontSize: 38, mb: 1, opacity: 0.65 }} />
                  <Typography variant="body2" fontWeight={700}>
                    Saved Study Paths and dashboards appear here.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={onOpenSavedLibrary}
            sx={{ textTransform: 'none', bgcolor: 'background.default' }}
          >
            {openExistingLabel}
          </Button>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 280, lg: 520 },
            p: { xs: 2, md: 2.5 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box>
            <AutoStoriesIcon
              sx={{ fontSize: 44, color: 'primary.main', mb: 1 }}
            />
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.15 }}>
              Create From Notes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Upload notes, screenshots, PDFs, or slides and turn them into a
              widget-based study dashboard.
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Paper
              component="button"
              type="button"
              elevation={0}
              onClick={onCreateFromNotes}
              disabled={!isAdmin}
              sx={{
                width: '100%',
                minHeight: 170,
                p: 2,
                borderRadius: 2,
                border: '1.5px dashed',
                borderColor: 'primary.main',
                bgcolor: 'background.default',
                color: 'text.primary',
                cursor: isAdmin ? 'pointer' : 'default',
                textAlign: 'center',
                display: 'grid',
                placeItems: 'center',
                '&:hover': {
                  bgcolor: isAdmin ? 'action.hover' : 'background.default',
                  borderColor: isAdmin ? 'primary.dark' : 'primary.main',
                },
              }}
            >
              <Stack spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <CloudUploadIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={900}>
                    Add sources
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Text, images, PDFs, and slides.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

const Dashboards = () => {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isMobileDashboardView = useMediaQuery('(max-width:768px)')
  const {
    openDashboards,
    selectedDashboard,
    setSelectedDashboard,
    removeDashboard,
    closeAllDashboards,
    closeDashboardsToRight,
    reorderDashboard,
    addDashboard,
    addDashboards,
    addStudyPathContainer,
    updateStudyPathContainer,
    replaceDashboard,
    updateLayout,
    updateDashboardLayout,
    renameDashboard,
    setDashboardEditing,
  } = useDashboards()

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [dashboardName, setDashboardName] = useState('')
  const [dashboardFolder, setDashboardFolder] = useState('Default')
  const [dashboardFolderColor, setDashboardFolderColor] =
    useState(DEFAULT_FOLDER_COLOR)
  const [dashboardDescription, setDashboardDescription] = useState('')
  const [dashboardTags, setDashboardTags] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [currentTabIndex, setCurrentTabIndex] = useState<number | null>(null)
  const [dashboardTabMenu, setDashboardTabMenu] = useState<{
    mouseX: number
    mouseY: number
    tabIndex: number
  } | null>(null)
  const [draggedDashboardIndex, setDraggedDashboardIndex] = useState<
    number | null
  >(null)
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
    savedDashboardId?: string
  } | null>(null)
  const [isEditingDashboardEditorTitle, setIsEditingDashboardEditorTitle] =
    useState(false)
  const [dashboardEditorTitleInput, setDashboardEditorTitleInput] = useState('')
  const [dashboardWidgetsAnchorEl, setDashboardWidgetsAnchorEl] =
    useState<null | HTMLElement>(null)
  const [dashboardLibraryOpen, setDashboardLibraryOpen] = useState(false)
  const [dashboardLibraryInitialSearch, setDashboardLibraryInitialSearch] =
    useState('')
  const [dashboardLibraryInitialFolder, setDashboardLibraryInitialFolder] =
    useState('')
  const [dashboardLibraryMode, setDashboardLibraryMode] = useState<
    'workspace' | 'builder'
  >('workspace')
  const [dashboardChatOpen, setDashboardChatOpen] = useState(false)
  const [dashboardChatMessages, setDashboardChatMessages] = useState<
    Record<string, DashboardChatMessage[]>
  >({})
  const [
    dashboardLibraryInitialSearchKey,
    setDashboardLibraryInitialSearchKey,
  ] = useState(0)
  const dashboardEditorTitleCancelRef = useRef(false)
  const { addComponent } = useLayout()
  const { topNavBarWidgets } = useTopNavBarWidgets()
  const currentDashboard = openDashboards[selectedDashboard]
  const selectedDashboardIsEmpty = !hasDashboardContent(
    currentDashboard?.layout,
  )
  const dashboardEditorIndex = dashboardEditorId
    ? openDashboards.findIndex(
        (dashboard) => dashboard.id === dashboardEditorId,
      )
    : -1
  const dashboardEditorDashboard =
    draftDashboard ||
    (dashboardEditorIndex >= 0 ? openDashboards[dashboardEditorIndex] : null)
  const dashboardEditorIsDraft = Boolean(draftDashboard)
  const dashboardEditorIsEmpty = !hasDashboardContent(
    dashboardEditorDashboard?.layout,
  )
  const customWidgetPanels = topNavBarWidgets.filter((widget) =>
    widget.name.includes('Custom'),
  )
  const savedDashboardsLabel = isPhone ? 'Saved' : 'Saved Dashboards'
  const visibleDashboardOptions = isAdmin
    ? dashboardOptions
    : dashboardOptions.filter((dashboard) => dashboard.isPublic)
  const dashboardFolderOptions = useMemo(
    () =>
      Array.from(
        new Set(
          dashboardOptions.map((dashboard) =>
            normalizeFolderName(dashboard.folder),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [dashboardOptions],
  )
  const getFolderColorForDetailsInput = (folder: string) => {
    const normalizedFolder = normalizeFolderName(folder)

    if (!folder.trim()) {
      return DashboardStorage.getFolderColor('Default')
    }

    if (dashboardFolderOptions.includes(normalizedFolder)) {
      return DashboardStorage.getFolderColor(normalizedFolder)
    }

    const currentColor = normalizeFolderColor(dashboardFolderColor)
    const availableColors = FOLDER_COLOR_PRESETS.filter(
      (color) => color !== currentColor,
    )
    const nextColors =
      availableColors.length > 0 ? availableColors : FOLDER_COLOR_PRESETS

    return nextColors[Math.floor(Math.random() * nextColors.length)]
  }

  const loadDashboardOptions = () => {
    ensureStarterDashboards()
    setDashboardOptions([...DashboardStorage.getAll()].reverse())
  }

  const openDashboardEditor = (dashboardId: string) => {
    if (!isAdmin) {
      return
    }

    setDraftDashboard(null)
    const dashboardIndex = openDashboards.findIndex(
      (dashboard) => dashboard.id === dashboardId,
    )

    if (dashboardIndex >= 0) {
      setSelectedDashboard(dashboardIndex)
    }

    setDashboardEditing(dashboardId, true)
    setDashboardEditorId(dashboardId)
    dispatchWorkspaceOnboardingEvent({ type: 'dashboard-editor-opened' })
  }

  const createDashboardInEditor = () => {
    if (!isAdmin) {
      return
    }

    setDashboardEditorId(null)
    setDraftDashboard({
      id: `draft-dashboard-${Date.now()}`,
      name: DEFAULT_DASHBOARD_NAME,
      layout: {
        type: 'row',
        weight: 100,
        children: [],
      },
    })
    dispatchWorkspaceOnboardingEvent({ type: 'dashboard-editor-opened' })
  }

  const openCreateStudyPath = () => {
    window.dispatchEvent(
      new CustomEvent(OPEN_CREATE_HUB_EVENT, {
        detail: { intent: 'study-path' },
      }),
    )
  }

  const openCreateFromNotes = () => {
    window.dispatchEvent(
      new CustomEvent(OPEN_CREATE_HUB_EVENT, {
        detail: { intent: 'improvedNotes' },
      }),
    )
  }

  const updateDashboardChatMessages = (
    dashboard: StateDashboard | undefined,
    messages: DashboardChatMessage[],
  ) => {
    if (!dashboard) {
      return
    }

    setDashboardChatMessages((current) => ({
      ...current,
      [dashboard.id]: messages,
    }))
  }

  const loadSavedDashboardInBuilder = (dashboard: SavedDashboard) => {
    setDashboardEditorId(null)
    setDraftDashboard({
      id: `draft-dashboard-${Date.now()}`,
      name: dashboard.name,
      layout: dashboard.layout,
      savedDashboardId: dashboard.id,
    })
    loadDashboardOptions()
  }

  const createEmptyDashboardTab = () => {
    addDashboard()
  }

  const openSavedDashboardInWorkspace = (dashboard: SavedDashboard) => {
    if (openDashboards[selectedDashboard] && selectedDashboardIsEmpty) {
      replaceDashboard(selectedDashboard, {
        name: dashboard.name,
        layout: dashboard.layout,
      })
      dispatchWorkspaceOnboardingEvent({
        type: 'saved-dashboard-opened',
        dashboardId: dashboard.id,
        dashboardName: dashboard.name,
      })
      return
    }

    addDashboard({
      name: dashboard.name,
      layout: dashboard.layout,
    })
    dispatchWorkspaceOnboardingEvent({
      type: 'saved-dashboard-opened',
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
    })
  }

  const openSavedDashboardFromLibrary = (dashboard: SavedDashboard) => {
    openSavedDashboardInWorkspace(dashboard)
    closeDashboardEditor()
  }

  const openSavedDashboardFromEmptyState = (dashboard: SavedDashboard) => {
    addDashboard({
      name: dashboard.name,
      layout: dashboard.layout,
    })
    dispatchWorkspaceOnboardingEvent({
      type: 'saved-dashboard-opened',
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
    })
  }

  const openStudyGuideFromEmptyState = (dashboards: SavedDashboard[]) => {
    const studyPath = createStudyPathContainerState(dashboards)

    if (studyPath) {
      addStudyPathContainer(studyPath)
      dispatchWorkspaceOnboardingEvent({ type: 'saved-dashboard-opened' })
    }
  }

  const openSavedLibraryFromEmptyState = () => {
    setDashboardLibraryInitialSearch('')
    setDashboardLibraryInitialFolder('')
    setDashboardLibraryMode('workspace')
    setDashboardLibraryInitialSearchKey((currentKey) => currentKey + 1)
    setDashboardLibraryOpen(true)
  }

  const closeDashboardEditor = () => {
    if (dashboardEditorIsDraft) {
      setDraftDashboard(null)
    } else if (dashboardEditorId) {
      setDashboardEditing(dashboardEditorId, false)
    }

    setDashboardWidgetsAnchorEl(null)
    setIsEditingDashboardEditorTitle(false)
    setDashboardEditorId(null)
    dispatchWorkspaceOnboardingEvent({ type: 'dashboard-editor-closed' })
  }

  const updateDashboardEditorTitle = (nextName: string) => {
    const trimmedName = nextName.trim()

    if (!trimmedName || !dashboardEditorDashboard) {
      setDashboardEditorTitleInput(dashboardEditorDashboard?.name || '')
      setIsEditingDashboardEditorTitle(false)
      return
    }

    if (dashboardEditorIsDraft) {
      setDraftDashboard((currentDraft) =>
        currentDraft ? { ...currentDraft, name: trimmedName } : currentDraft,
      )
    } else if (dashboardEditorDashboard.id) {
      renameDashboard(dashboardEditorDashboard.id, trimmedName)
      if (dashboardEditorIndex >= 0) {
        setHasChanges((prev) => ({
          ...prev,
          [dashboardEditorIndex]: true,
        }))
      }
    }

    setDashboardName((currentName) =>
      currentName === dashboardEditorDashboard.name ? trimmedName : currentName,
    )
    setDashboardEditorTitleInput(trimmedName)
    setIsEditingDashboardEditorTitle(false)
  }

  const handleDashboardEditorTitleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      updateDashboardEditorTitle(dashboardEditorTitleInput)
    }

    if (event.key === 'Escape') {
      dashboardEditorTitleCancelRef.current = true
      setDashboardEditorTitleInput(dashboardEditorDashboard?.name || '')
      setIsEditingDashboardEditorTitle(false)
    }
  }

  const handleDashboardEditorTitleBlur = () => {
    if (dashboardEditorTitleCancelRef.current) {
      dashboardEditorTitleCancelRef.current = false
      return
    }

    updateDashboardEditorTitle(dashboardEditorTitleInput)
  }

  const addWidgetToDashboardEditor = (
    item: DashboardEditorWidgetConfig & { id?: string },
  ) => {
    if (!isAdmin) {
      return
    }

    if (!dashboardEditorDashboard) {
      return
    }

    if (dashboardEditorIsEmpty) {
      const nextLayout = createLayoutWithComponent(item)
      const counts = countDashboardNodes(nextLayout)

      if (dashboardEditorIsDraft) {
        setDraftDashboard((currentDraft) =>
          currentDraft ? { ...currentDraft, layout: nextLayout } : currentDraft,
        )
      } else if (dashboardEditorIndex >= 0) {
        updateDashboardLayout(dashboardEditorIndex, nextLayout)
      }

      dispatchWorkspaceOnboardingEvent({
        type: 'saved-widget-added',
        widgetId:
          typeof item.customProps?.widgetId === 'string'
            ? item.customProps.widgetId
            : item.id,
        widgetName: item.name,
        ...counts,
      })
      dispatchWorkspaceOnboardingEvent({
        type: 'dashboard-layout-changed',
        ...counts,
      })

      return
    }

    addComponent(item)
    setTimeout(() => {
      const counts = countDashboardNodes(dashboardEditorDashboard.layout)
      const nextCounts = {
        tabCount: Math.max(2, counts.tabCount + 1),
        tabsetCount: Math.max(1, counts.tabsetCount),
      }
      dispatchWorkspaceOnboardingEvent({
        type: 'saved-widget-added',
        widgetId:
          typeof item.customProps?.widgetId === 'string'
            ? item.customProps.widgetId
            : item.id,
        widgetName: item.name,
        ...nextCounts,
      })
      dispatchWorkspaceOnboardingEvent({
        type: 'dashboard-layout-changed',
        ...nextCounts,
      })
    }, 0)
  }

  const handleDashboardWidgetsMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!isAdmin) {
      return
    }

    setDashboardWidgetsAnchorEl(event.currentTarget)
    dispatchWorkspaceOnboardingEvent({ type: 'widgets-menu-opened' })
  }

  const handleDashboardWidgetsMenuClose = () => {
    setDashboardWidgetsAnchorEl(null)
  }

  const handleCreateWidgetFromDashboardEditor = () => {
    if (!isAdmin) {
      return
    }

    handleDashboardWidgetsMenuClose()
    window.dispatchEvent(new CustomEvent(OPEN_WIDGET_EDITOR_EVENT))
  }

  // Check if user is admin on component mount
  useEffect(() => {
    const readUserRole = () => {
      try {
        const userData = localStorage.getItem('userData')
        if (userData) {
          const parsedData = JSON.parse(userData)
          setIsAdmin(
            parsedData.id === 'admin' && parsedData.role === 'ADMIN_ROLE',
          )
          if (parsedData.id !== 'admin' || parsedData.role !== 'ADMIN_ROLE') {
            closeDashboardEditor()
          }
          return
        }
        setIsAdmin(false)
        closeDashboardEditor()
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
  }, [dashboardEditorId, dashboardEditorIsDraft])

  useEffect(() => {
    loadDashboardOptions()
  }, [])

  useEffect(() => {
    if (window.localStorage.getItem(DEFAULT_STUDY_PATH_OPENED_KEY) === 'true') {
      return
    }

    ensureStarterDashboards()

    const starterDashboards = DashboardStorage.getAll().filter(
      (dashboard) => dashboard.folder === STARTER_STUDY_PATH_FOLDER_NAME,
    )
    const studyPath = createStudyPathContainerState(starterDashboards)

    if (!studyPath) {
      return
    }

    addStudyPathContainer(studyPath)
    window.localStorage.setItem(DEFAULT_STUDY_PATH_OPENED_KEY, 'true')
  }, [addStudyPathContainer])

  useEffect(() => {
    if (!isEditingDashboardEditorTitle) {
      setDashboardEditorTitleInput(dashboardEditorDashboard?.name || '')
    }
  }, [dashboardEditorDashboard?.name, isEditingDashboardEditorTitle])

  useEffect(() => {
    const handleOpenDashboardEditor = (event: Event) => {
      if (!isAdmin) {
        return
      }

      const customEvent = event as CustomEvent<{ host?: string }>
      if (customEvent.detail?.host === 'studio') {
        return
      }

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
  }, [isAdmin])

  useEffect(() => {
    const handleOpenSavedDashboards = (event: Event) => {
      const customEvent = event as CustomEvent<{
        folderFilter?: string
        searchTerm?: string
      }>

      setDashboardLibraryInitialSearch(customEvent.detail?.searchTerm || '')
      setDashboardLibraryInitialFolder(customEvent.detail?.folderFilter || '')
      setDashboardLibraryMode('workspace')
      setDashboardLibraryInitialSearchKey((currentKey) => currentKey + 1)
      setDashboardLibraryOpen(true)
    }

    window.addEventListener(
      OPEN_SAVED_DASHBOARDS_EVENT,
      handleOpenSavedDashboards,
    )

    return () => {
      window.removeEventListener(
        OPEN_SAVED_DASHBOARDS_EVENT,
        handleOpenSavedDashboards,
      )
    }
  }, [])

  useEffect(() => {
    const handleOpenStudyPathReviewDashboard = (event: Event) => {
      const customEvent = event as CustomEvent<{ dashboard?: SavedDashboard }>
      const dashboard = customEvent.detail?.dashboard

      if (!dashboard) {
        return
      }

      loadDashboardOptions()

      const reviewMeta = getStudyPathMetaFromLayout(dashboard.layout)
      const openStudyPathIndex = reviewMeta
        ? openDashboards.findIndex(
            (openDashboard) =>
              openDashboard.kind === 'studyPathContainer' &&
              openDashboard.studyPath?.pathId === reviewMeta.studyPathId,
          )
        : -1

      if (reviewMeta && openStudyPathIndex >= 0) {
        const openStudyPathDashboard = openDashboards[openStudyPathIndex]

        updateStudyPathContainer(openStudyPathDashboard.id, (studyPath) => {
          const reviewItem = {
            id: dashboard.id,
            name: dashboard.name,
            layout: dashboard.layout,
            dashboardKey: reviewMeta.dashboardKey,
            dashboardIndex: reviewMeta.dashboardIndex,
            dashboardCount: reviewMeta.dashboardCount,
            folderName: reviewMeta.folderName,
          }
          const existingReviewIndex = studyPath.dashboards.findIndex(
            (lesson) => lesson.dashboardKey === reviewItem.dashboardKey,
          )
          const nextDashboards =
            existingReviewIndex >= 0
              ? studyPath.dashboards.map((lesson, index) =>
                  index === existingReviewIndex ? reviewItem : lesson,
                )
              : [...studyPath.dashboards, reviewItem]
          const orderedDashboards = [...nextDashboards].sort(
            (first, second) => first.dashboardIndex - second.dashboardIndex,
          )
          const selectedIndex = Math.max(
            0,
            orderedDashboards.findIndex(
              (lesson) => lesson.dashboardKey === reviewItem.dashboardKey,
            ),
          )

          return {
            ...studyPath,
            dashboards: orderedDashboards,
            selectedIndex,
          }
        })
        setSelectedDashboard(openStudyPathIndex)
        return
      }

      addDashboard({
        name: dashboard.name,
        layout: dashboard.layout,
      })
    }

    window.addEventListener(
      OPEN_STUDY_PATH_REVIEW_DASHBOARD_EVENT,
      handleOpenStudyPathReviewDashboard,
    )

    return () => {
      window.removeEventListener(
        OPEN_STUDY_PATH_REVIEW_DASHBOARD_EVENT,
        handleOpenStudyPathReviewDashboard,
      )
    }
  }, [
    addDashboard,
    openDashboards,
    setSelectedDashboard,
    updateStudyPathContainer,
  ])

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

  const getSavedDashboardForEditor = () => {
    if (!dashboardEditorDashboard) {
      return null
    }

    if (dashboardEditorIsDraft) {
      if (!draftDashboard?.savedDashboardId) {
        return null
      }

      return (
        DashboardStorage.getAll().find(
          (dashboard) => dashboard.id === draftDashboard.savedDashboardId,
        ) || null
      )
    }

    return DashboardStorage.getByName(dashboardEditorDashboard.name)
  }

  const dashboardEditorSavedDashboard = getSavedDashboardForEditor()
  const dashboardEditorIsUpdating = Boolean(dashboardEditorSavedDashboard)
  const dashboardEditorHasUnsavedChanges = dashboardEditorSavedDashboard
    ? dashboardEditorDashboard?.name !== dashboardEditorSavedDashboard.name ||
      JSON.stringify(dashboardEditorDashboard?.layout) !==
        JSON.stringify(dashboardEditorSavedDashboard.layout)
    : true

  const populateDashboardDetailsForm = (
    dashboardNameValue: string,
    savedDashboard?: SavedDashboard | null,
  ) => {
    const nextFolder = savedDashboard?.folder || 'Default'

    setDashboardName(dashboardNameValue)
    setDashboardFolder(nextFolder)
    setDashboardFolderColor(
      normalizeFolderColor(
        savedDashboard?.folderColor ||
          DashboardStorage.getFolderColor(nextFolder),
      ),
    )
    setDashboardDescription(savedDashboard?.description || '')
    setDashboardTags(savedDashboard?.tags || ['dashboard'])
    setIsPublic(isAdmin ? Boolean(savedDashboard?.isPublic) : false)
    setTagInput('')
  }

  const handleDashboardDetailsOpen = (index: number) => {
    if (dashboardEditorIsDraft && draftDashboard) {
      if (!hasDashboardContent(draftDashboard.layout)) {
        return
      }

      setCurrentTabIndex(null)
      populateDashboardDetailsForm(
        draftDashboard.name || DEFAULT_DASHBOARD_NAME,
        dashboardEditorSavedDashboard,
      )
      setSaveDialogOpen(true)
      return
    }

    const currentDashboard = openDashboards[index]

    if (!currentDashboard || !hasDashboardContent(currentDashboard.layout)) {
      return
    }

    const existingDashboard = DashboardStorage.getByName(currentDashboard.name)

    if (existingDashboard) {
      setCurrentTabIndex(index)
      populateDashboardDetailsForm(currentDashboard.name, existingDashboard)
      setSaveDialogOpen(true)
      return
    }

    setCurrentTabIndex(index)
    populateDashboardDetailsForm(
      currentDashboard.name || DEFAULT_DASHBOARD_NAME,
      null,
    )
    setSaveDialogOpen(true)
  }

  const saveDashboardDirectly = (index: number) => {
    const currentDashboard = openDashboards[index]

    if (!currentDashboard || !hasDashboardContent(currentDashboard.layout)) {
      return
    }

    try {
      const existingDashboard = DashboardStorage.getByName(
        currentDashboard.name,
      )
      const dashboards = DashboardStorage.getAll()
      const now = new Date().toISOString()
      const nameToSave = existingDashboard
        ? currentDashboard.name
        : getUniqueDashboardName(
            currentDashboard.name === 'Dashboard'
              ? DEFAULT_DASHBOARD_NAME
              : currentDashboard.name,
            dashboards,
          )

      const dashboardToSave: SavedDashboard = existingDashboard
        ? {
            ...existingDashboard,
            name: nameToSave,
            layout: currentDashboard.layout as DashboardLayout,
            updatedAt: now,
          }
        : {
            id: `dashboard-${Date.now()}`,
            name: nameToSave,
            folder: 'Default',
            folderColor: DashboardStorage.getFolderColor('Default'),
            layout: currentDashboard.layout as DashboardLayout,
            tags: ['dashboard'],
            isPublic: isAdmin ? false : true,
            createdAt: now,
            updatedAt: now,
          }

      DashboardStorage.save(dashboardToSave)
      loadDashboardOptions()
      dispatchWorkspaceOnboardingEvent({
        type: 'dashboard-saved',
        dashboardId: dashboardToSave.id,
        dashboardName: dashboardToSave.name,
      })

      if (currentDashboard.name !== nameToSave) {
        renameDashboard(currentDashboard.id, nameToSave)
      }

      setHasChanges((prev) => ({
        ...prev,
        [index]: false,
      }))
    } catch (error) {
      console.error('Error saving dashboard:', error)
    }
  }

  const saveDraftDashboardDirectly = () => {
    if (!draftDashboard || !hasDashboardContent(draftDashboard.layout)) {
      return
    }

    try {
      const dashboards = DashboardStorage.getAll()
      const existingDashboard = draftDashboard.savedDashboardId
        ? dashboards.find(
            (dashboard) => dashboard.id === draftDashboard.savedDashboardId,
          )
        : undefined
      const now = new Date().toISOString()
      const nameToSave = existingDashboard
        ? draftDashboard.name.trim() || existingDashboard.name
        : getUniqueDashboardName(draftDashboard.name, dashboards)

      const dashboardToSave: SavedDashboard = existingDashboard
        ? {
            ...existingDashboard,
            name: nameToSave,
            layout: draftDashboard.layout,
            updatedAt: now,
          }
        : {
            id: `dashboard-${Date.now()}`,
            name: nameToSave,
            folder: 'Default',
            folderColor: DashboardStorage.getFolderColor('Default'),
            layout: draftDashboard.layout,
            tags: ['dashboard'],
            isPublic: isAdmin ? false : true,
            createdAt: now,
            updatedAt: now,
          }

      DashboardStorage.save(dashboardToSave)
      loadDashboardOptions()
      dispatchWorkspaceOnboardingEvent({
        type: 'dashboard-saved',
        dashboardId: dashboardToSave.id,
        dashboardName: dashboardToSave.name,
      })
      setDraftDashboard((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              name: dashboardToSave.name,
              layout: dashboardToSave.layout,
              savedDashboardId: dashboardToSave.id,
            }
          : currentDraft,
      )
    } catch (error) {
      console.error('Error saving dashboard:', error)
    }
  }

  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false)
    setDashboardName('')
    setDashboardFolder('Default')
    setDashboardFolderColor(DEFAULT_FOLDER_COLOR)
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
    if (draftDashboard) {
      if (!hasDashboardContent(draftDashboard.layout)) {
        return
      }

      try {
        const dashboards = DashboardStorage.getAll()
        const existingDashboard = draftDashboard.savedDashboardId
          ? dashboards.find(
              (dashboard) => dashboard.id === draftDashboard.savedDashboardId,
            )
          : undefined
        const now = new Date().toISOString()
        const nameToSave = existingDashboard
          ? dashboardName.trim() || existingDashboard.name
          : getUniqueDashboardName(dashboardName, dashboards)
        const dashboardToSave: SavedDashboard = {
          ...(existingDashboard || {
            id: `dashboard-${Date.now()}`,
            createdAt: now,
          }),
          name: nameToSave,
          folder: normalizeFolderName(dashboardFolder),
          folderColor: normalizeFolderColor(dashboardFolderColor),
          layout: draftDashboard.layout,
          description: dashboardDescription.trim() || undefined,
          tags: dashboardTags.length > 0 ? dashboardTags : ['dashboard'],
          isPublic: isAdmin ? isPublic : true,
          updatedAt: now,
        }

        DashboardStorage.save(dashboardToSave)
        loadDashboardOptions()
        dispatchWorkspaceOnboardingEvent({
          type: 'dashboard-saved',
          dashboardId: dashboardToSave.id,
          dashboardName: dashboardToSave.name,
        })
        setDraftDashboard((currentDraft) =>
          currentDraft
            ? {
                ...currentDraft,
                name: dashboardToSave.name,
                layout: dashboardToSave.layout,
                savedDashboardId: dashboardToSave.id,
              }
            : currentDraft,
        )
        handleSaveDialogClose()
      } catch (error) {
        console.error('Error saving dashboard:', error)
      }
      return
    }

    if (currentTabIndex !== null) {
      const currentDashboard = openDashboards[currentTabIndex]

      if (!currentDashboard || !hasDashboardContent(currentDashboard.layout)) {
        return
      }

      try {
        if (hasDashboardContent(currentDashboard.layout)) {
          const dashboards = DashboardStorage.getAll()
          const existingDashboard = DashboardStorage.getByName(
            currentDashboard.name,
          )
          const now = new Date().toISOString()
          const nameToSave = existingDashboard
            ? dashboardName.trim() || existingDashboard.name
            : getUniqueDashboardName(dashboardName, dashboards)
          const newDashboard: SavedDashboard = {
            ...(existingDashboard || {
              id: `dashboard-${Date.now()}`,
              createdAt: now,
            }),
            name: nameToSave,
            folder: normalizeFolderName(dashboardFolder),
            folderColor: normalizeFolderColor(dashboardFolderColor),
            layout: currentDashboard.layout as DashboardLayout,
            description: dashboardDescription.trim() || undefined,
            tags: dashboardTags.length > 0 ? dashboardTags : ['dashboard'],
            isPublic: isAdmin ? isPublic : true,
            updatedAt: now,
          }

          DashboardStorage.save(newDashboard)
          loadDashboardOptions()
          dispatchWorkspaceOnboardingEvent({
            type: 'dashboard-saved',
            dashboardId: newDashboard.id,
            dashboardName: newDashboard.name,
          })

          // Update the dashboard name in the TabList
          renameDashboard(currentDashboard.id, nameToSave)

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

  const handleDashboardEditorSave = () => {
    if (!isAdmin) {
      return
    }

    if (dashboardEditorIsDraft) {
      saveDraftDashboardDirectly()
      return
    }

    saveDashboardDirectly(dashboardEditorIndex)
  }

  const handleOpenDashboardEditorInWorkspace = () => {
    if (
      dashboardEditorIsEmpty ||
      dashboardEditorHasUnsavedChanges ||
      !dashboardEditorSavedDashboard
    ) {
      return
    }

    addDashboard({
      name: dashboardEditorSavedDashboard.name,
      layout: dashboardEditorSavedDashboard.layout,
    })
    dispatchWorkspaceOnboardingEvent({
      type: 'saved-dashboard-opened',
      dashboardId: dashboardEditorSavedDashboard.id,
      dashboardName: dashboardEditorSavedDashboard.name,
    })
    closeDashboardEditor()
  }

  const closeDashboardTabMenu = () => {
    setDashboardTabMenu(null)
  }

  const openDashboardTabMenu = (event: React.MouseEvent, tabIndex: number) => {
    event.preventDefault()
    setSelectedDashboard(tabIndex)
    setDashboardTabMenu(
      dashboardTabMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            tabIndex,
          }
        : null,
    )
  }

  const closeAllDashboardTabs = () => {
    closeAllDashboards()
    closeDashboardTabMenu()
  }

  const closeDashboardTabsToRight = () => {
    if (dashboardTabMenu) {
      closeDashboardsToRight(dashboardTabMenu.tabIndex)
    }
    closeDashboardTabMenu()
  }

  const startDashboardTabDrag = (event: React.DragEvent, tabIndex: number) => {
    setDraggedDashboardIndex(tabIndex)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(tabIndex))
  }

  const dropDashboardTab = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault()
    event.stopPropagation()
    const rawDraggedIndex = event.dataTransfer.getData('text/plain')
    const sourceIndex =
      draggedDashboardIndex ?? Number.parseInt(rawDraggedIndex, 10)

    if (!Number.isInteger(sourceIndex)) {
      setDraggedDashboardIndex(null)
      return
    }

    const targetRect = event.currentTarget.getBoundingClientRect()
    const shouldDropAfter =
      event.clientX > targetRect.left + targetRect.width / 2
    let nextIndex = shouldDropAfter ? targetIndex + 1 : targetIndex

    if (sourceIndex < nextIndex) {
      nextIndex -= 1
    }

    nextIndex = Math.max(0, Math.min(openDashboards.length - 1, nextIndex))
    reorderDashboard(sourceIndex, nextIndex)
    setDraggedDashboardIndex(null)
  }

  const allowDashboardTabListDrop = (event: React.DragEvent) => {
    if (draggedDashboardIndex === null) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const dropDashboardTabAtEnd = (event: React.DragEvent) => {
    if (draggedDashboardIndex === null) {
      return
    }

    event.preventDefault()
    reorderDashboard(draggedDashboardIndex, openDashboards.length - 1)
    setDraggedDashboardIndex(null)
  }

  const dashboardChatPanel = (
    <DashboardChatPanel
      dashboard={currentDashboard}
      messages={
        currentDashboard ? dashboardChatMessages[currentDashboard.id] || [] : []
      }
      onMessagesChange={(messages) =>
        updateDashboardChatMessages(currentDashboard, messages)
      }
      onClose={() => setDashboardChatOpen(false)}
    />
  )

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        overflowX: 'hidden',
        overflowY: isMobileDashboardView ? 'auto' : 'hidden',
        WebkitOverflowScrolling: isMobileDashboardView ? 'touch' : undefined,
        display: isMobileDashboardView ? 'block' : 'flex',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: isMobileDashboardView ? 'visible' : 'hidden',
        }}
      >
        <Tabs
          className={`react-tabs ${
            selectedDashboardIsEmpty ? 'react-tabs--empty-selected' : ''
          } ${
            isMobileDashboardView ? 'react-tabs--mobile-dashboard' : ''
          }`.trim()}
          selectedIndex={selectedDashboard}
          onSelect={(index) => setSelectedDashboard(index)}
          style={{ position: 'relative' }}
        >
          <TabList
            onDragOver={
              isMobileDashboardView ? undefined : allowDashboardTabListDrop
            }
            onDrop={isMobileDashboardView ? undefined : dropDashboardTabAtEnd}
          >
            {openDashboards.map((dashboard, index) => {
              const isOnlyEmptyDashboard =
                openDashboards.length === 1 &&
                dashboard.kind !== 'studyPathContainer' &&
                !hasDashboardContent(dashboard.layout)

              return (
                <Tab
                  key={dashboard.id}
                  draggable={!isMobileDashboardView}
                  onDragStart={(event) =>
                    !isMobileDashboardView &&
                    startDashboardTabDrag(event, index)
                  }
                  onDragOver={(event) => {
                    if (isMobileDashboardView) {
                      return
                    }
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(event) =>
                    !isMobileDashboardView && dropDashboardTab(event, index)
                  }
                  onDragEnd={() => setDraggedDashboardIndex(null)}
                  onContextMenu={(event) => openDashboardTabMenu(event, index)}
                >
                  <TooltipStyled
                    title={dashboard.name}
                    placement="bottom"
                    enterTouchDelay={1000}
                  >
                    <Typography
                      component="span"
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
                  </TooltipStyled>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {!isMobileDashboardView &&
                      isAdmin &&
                      dashboard.layout?.children &&
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
                    {!isOnlyEmptyDashboard && (
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
                    )}
                  </Box>
                </Tab>
              )
            })}
            {isAdmin && (
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
            )}
          </TabList>
          {openDashboards.map((dashboard, index) => {
            const isStudyPathContainer =
              dashboard.kind === 'studyPathContainer' && dashboard.studyPath
            const isEmptyDashboard =
              !isStudyPathContainer && !hasDashboardContent(dashboard.layout)
            return (
              <TabPanel key={dashboard.id}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: isMobileDashboardView ? 'auto' : '100%',
                    minHeight: isMobileDashboardView ? '100dvh' : undefined,
                    backgroundColor: 'background.default',
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      flex: 1,
                      minHeight: 0,
                      overflow: 'visible',
                    }}
                  >
                    {isStudyPathContainer && dashboard.studyPath ? (
                      <StudyPathWorkspaceView
                        studyPath={dashboard.studyPath}
                        onStudyPathChange={(studyPath) =>
                          updateStudyPathContainer(
                            dashboard.id,
                            () => studyPath,
                          )
                        }
                        mobileView={isMobileDashboardView}
                      />
                    ) : isEmptyDashboard ? (
                      <DashboardEmptyState
                        isAdmin={isAdmin}
                        hasDashboard
                        onCreateStudyPath={openCreateStudyPath}
                        onCreateFromNotes={openCreateFromNotes}
                        onOpenSavedLibrary={openSavedLibraryFromEmptyState}
                        dashboardOptions={visibleDashboardOptions}
                        onOpenDashboard={openSavedDashboardInWorkspace}
                        onOpenStudyGuide={openStudyGuideFromEmptyState}
                      />
                    ) : (
                      <DashboardLayoutView
                        layout={dashboard.layout}
                        mobileView={isMobileDashboardView}
                        readOnly={isMobileDashboardView}
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

        {!dashboardChatOpen && (
          <TooltipStyled title="Ask this dashboard">
            <Box
              component="button"
              type="button"
              aria-label="Ask this dashboard"
              onClick={() => setDashboardChatOpen(true)}
              sx={{
                position: isMobileDashboardView ? 'fixed' : 'absolute',
                right: isMobileDashboardView ? 12 : 0,
                top: isMobileDashboardView ? 'auto' : 96,
                bottom: isMobileDashboardView ? 18 : 'auto',
                zIndex: isMobileDashboardView ? 1301 : 12,
                width: isMobileDashboardView ? 46 : 34,
                height: isMobileDashboardView ? 42 : 82,
                border: 0,
                borderRadius: isMobileDashboardView ? 999 : '20px 0 0 20px',
                bgcolor: 'background.paper',
                color: 'primary.main',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 12px 32px rgba(0,0,0,0.42)'
                    : '0 12px 30px rgba(16,24,40,0.18)',
                outline: 1,
                outlineColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ChatBubbleOutlineIcon fontSize="small" />
            </Box>
          </TooltipStyled>
        )}
      </Box>

      {isMobileDashboardView ? (
        <Drawer
          anchor="right"
          open={dashboardChatOpen}
          onClose={() => setDashboardChatOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: '100%',
              height: '100dvh',
              bgcolor: 'background.paper',
            },
          }}
        >
          {dashboardChatPanel}
        </Drawer>
      ) : (
        <Box
          aria-hidden={!dashboardChatOpen}
          sx={{
            width: dashboardChatOpen ? 'min(460px, 40vw)' : 0,
            maxWidth: dashboardChatOpen ? 'min(460px, 40vw)' : 0,
            minWidth: dashboardChatOpen ? 380 : 0,
            flex: '0 0 auto',
            minHeight: 0,
            overflow: 'hidden',
            p: dashboardChatOpen ? '8px 8px 8px 0' : 0,
            boxSizing: 'border-box',
            bgcolor: 'background.default',
            transition: theme.transitions.create(
              ['width', 'max-width', 'min-width', 'padding'],
              {
                duration: theme.transitions.duration.shorter,
                easing: theme.transitions.easing.easeInOut,
              },
            ),
          }}
        >
          <Box
            sx={{
              height: '100%',
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 18px 40px rgba(0,0,0,0.42)'
                  : '0 18px 42px rgba(16,24,40,0.10)',
            }}
          >
            {dashboardChatOpen ? dashboardChatPanel : null}
          </Box>
        </Box>
      )}

      <Menu
        open={dashboardTabMenu !== null}
        onClose={closeDashboardTabMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          dashboardTabMenu !== null
            ? {
                top: dashboardTabMenu.mouseY,
                left: dashboardTabMenu.mouseX,
              }
            : undefined
        }
      >
        <MenuItem onClick={closeAllDashboardTabs}>
          Close all dashboards
        </MenuItem>
        <MenuItem
          onClick={closeDashboardTabsToRight}
          disabled={
            !dashboardTabMenu ||
            dashboardTabMenu.tabIndex >= openDashboards.length - 1
          }
        >
          Close dashboards to the right
        </MenuItem>
      </Menu>

      {openDashboards.length === 0 && (
        <DashboardEmptyState
          isAdmin={isAdmin}
          hasDashboard={false}
          onCreateStudyPath={openCreateStudyPath}
          onCreateFromNotes={openCreateFromNotes}
          onOpenSavedLibrary={openSavedLibraryFromEmptyState}
          dashboardOptions={visibleDashboardOptions}
          onOpenDashboard={openSavedDashboardFromEmptyState}
          onOpenStudyGuide={openStudyGuideFromEmptyState}
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
              minHeight: { xs: 104, sm: 56 },
              height: 'auto',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: 1,
              px: { xs: 1, sm: 2 },
              py: { xs: 1, sm: 0 },
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ minWidth: 0, flex: { xs: '1 1 100%', sm: 1 } }}>
              {isEditingDashboardEditorTitle ? (
                <TextField
                  autoFocus
                  size="small"
                  variant="standard"
                  value={dashboardEditorTitleInput}
                  onChange={(event) =>
                    setDashboardEditorTitleInput(event.target.value)
                  }
                  onBlur={handleDashboardEditorTitleBlur}
                  onKeyDown={handleDashboardEditorTitleKeyDown}
                  inputProps={{
                    'aria-label': 'Dashboard title',
                  }}
                  sx={{
                    maxWidth: { xs: '100%', sm: 420 },
                    width: '100%',
                    '& .MuiInputBase-input': {
                      fontSize: '1rem',
                      fontWeight: 700,
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  onDoubleClick={() => {
                    setDashboardEditorTitleInput(
                      dashboardEditorDashboard?.name || '',
                    )
                    setIsEditingDashboardEditorTitle(true)
                  }}
                  title="Double-click to rename"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'text',
                    maxWidth: { xs: '100%', sm: 420 },
                  }}
                >
                  {dashboardEditorDashboard?.name || 'Dashboard'}
                </Typography>
              )}
            </Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              useFlexGap
              sx={{
                width: { xs: '100%', sm: 'auto' },
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                justifyContent: { xs: 'space-between', sm: 'flex-end' },
              }}
            >
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={() => {
                  setDashboardLibraryInitialSearch('')
                  setDashboardLibraryInitialFolder('')
                  setDashboardLibraryMode('builder')
                  setDashboardLibraryInitialSearchKey(
                    (currentKey) => currentKey + 1,
                  )
                  setDashboardLibraryOpen(true)
                }}
                sx={{
                  textTransform: 'none',
                  minWidth: 0,
                  flex: { xs: '1 1 calc(50% - 8px)', sm: '0 0 auto' },
                  px: { xs: 1, sm: 2 },
                  whiteSpace: 'nowrap',
                  '& .MuiButton-startIcon': {
                    mr: { xs: 0.5, sm: 1 },
                  },
                }}
              >
                {savedDashboardsLabel}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExtensionIcon />}
                onClick={handleDashboardWidgetsMenuOpen}
                data-onboarding-id="dashboard-editor-widgets"
                sx={{
                  textTransform: 'none',
                  minWidth: 0,
                  flex: { xs: '1 1 calc(50% - 8px)', sm: '0 0 auto' },
                  px: { xs: 1, sm: 2 },
                  whiteSpace: 'nowrap',
                  '& .MuiButton-startIcon': {
                    color: 'primary.main',
                    mr: { xs: 0.5, sm: 1 },
                  },
                }}
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
                    width: { xs: 'calc(100vw - 32px)', sm: 260 },
                    maxWidth: 260,
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
                {isAdmin && (
                  <MenuItem
                    onClick={handleCreateWidgetFromDashboardEditor}
                    sx={{ p: 1.5 }}
                  >
                    <ListItemIcon sx={{ color: 'primary.main', minWidth: 36 }}>
                      <ConstructionIcon fontSize="small" />
                    </ListItemIcon>
                    Create Widget
                  </MenuItem>
                )}
                {isAdmin && <Divider sx={{ borderColor: 'divider' }} />}
                {customWidgetPanels.length > 0 ? (
                  customWidgetPanels.map((topNavBarWidget) => (
                    <Box key={topNavBarWidget.name}>
                      {topNavBarWidget.items.map((item) => (
                        <MenuItem
                          key={item.name}
                          data-onboarding-id="dashboard-widget-saved"
                          data-widget-id={
                            typeof item.customProps?.widgetId === 'string'
                              ? item.customProps.widgetId
                              : undefined
                          }
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
                  (!dashboardEditorIsDraft && dashboardEditorIndex < 0) ||
                  (dashboardEditorIsUpdating &&
                    !dashboardEditorHasUnsavedChanges)
                }
                onClick={handleDashboardEditorSave}
                data-onboarding-id="dashboard-editor-save"
                sx={{
                  textTransform: 'none',
                  minWidth: 0,
                  flex: { xs: '1 1 calc(50% - 8px)', sm: '0 0 auto' },
                  px: { xs: 1, sm: 2 },
                  whiteSpace: 'nowrap',
                  '& .MuiButton-startIcon': {
                    mr: { xs: 0.5, sm: 1 },
                  },
                }}
              >
                {dashboardEditorIsUpdating ? 'Update' : 'Save'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<OpenInBrowserIcon />}
                disabled={
                  dashboardEditorIsEmpty ||
                  dashboardEditorHasUnsavedChanges ||
                  !dashboardEditorSavedDashboard
                }
                onClick={handleOpenDashboardEditorInWorkspace}
                sx={{
                  textTransform: 'none',
                  minWidth: 0,
                  flex: { xs: '1 1 calc(50% - 8px)', sm: '0 0 auto' },
                  px: { xs: 1, sm: 2 },
                  whiteSpace: 'nowrap',
                  '& .MuiButton-startIcon': {
                    mr: { xs: 0.5, sm: 1 },
                  },
                }}
              >
                Open in Workspace
              </Button>
              <TooltipStyled title="Edit dashboard details">
                <span>
                  <IconButton
                    aria-label="Edit dashboard details"
                    disabled={dashboardEditorIsEmpty}
                    onClick={() =>
                      handleDashboardDetailsOpen(dashboardEditorIndex)
                    }
                    sx={{
                      color: 'text.secondary',
                      border: 1,
                      borderColor: 'divider',
                      flex: '0 0 36px',
                      width: 36,
                      height: 36,
                      '&:hover': {
                        color: 'primary.main',
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </TooltipStyled>
              <IconButton
                aria-label="Close dashboard editor"
                onClick={closeDashboardEditor}
                data-onboarding-id="dashboard-editor-close"
                sx={{
                  color: 'text.primary',
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                  flex: '0 0 36px',
                  width: 36,
                  height: 36,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'text.secondary',
                  },
                }}
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
                      Empty study dashboard
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: 'text.secondary' }}
                    >
                      Add a saved study widget from Widgets, or create a
                      reusable note, exercise, formula, or review block first.
                    </Typography>
                  </Paper>
                </Box>
              ) : (
                <DashboardLayoutView
                  key={dashboardEditorDashboard.id}
                  layout={dashboardEditorDashboard.layout}
                  updateLayout={(model) => {
                    if (!isAdmin) {
                      return
                    }

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

      <SavedDashboardsDialog
        open={dashboardLibraryOpen}
        onClose={() => {
          setDashboardLibraryOpen(false)
          loadDashboardOptions()
        }}
        initialSearchTerm={dashboardLibraryInitialSearch}
        initialFolderFilter={dashboardLibraryInitialFolder}
        initialSearchKey={dashboardLibraryInitialSearchKey}
        mode={dashboardLibraryMode}
        onOpenInBuilder={loadSavedDashboardInBuilder}
        onOpenInWorkspace={openSavedDashboardFromLibrary}
      />

      {/* Dashboard Details Dialog */}
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
                Name it and choose where it appears in Dashboards.
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

          <Autocomplete
            freeSolo
            options={dashboardFolderOptions}
            value={dashboardFolder}
            inputValue={dashboardFolder}
            onChange={(_, nextValue) => {
              const nextFolder = nextValue || ''
              setDashboardFolder(nextFolder)
              setDashboardFolderColor(getFolderColorForDetailsInput(nextFolder))
            }}
            onInputChange={(_, nextInputValue) => {
              setDashboardFolder(nextInputValue)
              setDashboardFolderColor(
                getFolderColorForDetailsInput(nextInputValue),
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="normal"
                id="folder"
                label="Folder"
                fullWidth
                variant="outlined"
                helperText="Dashboards with the same folder name are grouped together."
                InputLabelProps={{
                  ...params.InputLabelProps,
                  shrink: true,
                  sx: { color: 'text.secondary' },
                }}
                InputProps={{
                  ...params.InputProps,
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
            )}
          />

          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" color="text.primary" gutterBottom>
              Folder color
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              {FOLDER_COLOR_PRESETS.map((color) => (
                <IconButton
                  key={color}
                  size="small"
                  aria-label={`Use folder color ${color}`}
                  onClick={() => setDashboardFolderColor(color)}
                  sx={{
                    width: 32,
                    height: 32,
                    border: '2px solid',
                    borderColor:
                      normalizeFolderColor(dashboardFolderColor) === color
                        ? 'text.primary'
                        : 'divider',
                    bgcolor: color,
                    '&:hover': { bgcolor: color, opacity: 0.85 },
                  }}
                />
              ))}
              <TextField
                type="color"
                label="Custom"
                value={normalizeFolderColor(dashboardFolderColor)}
                onChange={(e) => setDashboardFolderColor(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ width: 96 }}
              />
            </Box>
          </Box>

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
            disabled={dashboardName.trim() === ''}
            startIcon={<SaveIcon />}
            sx={{
              bgcolor: 'primary.dark',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.main',
              },
            }}
          >
            Save Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Dashboards

import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Dialog,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloseIcon from '@mui/icons-material/Close'
import ConstructionIcon from '@mui/icons-material/Construction'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import RouteIcon from '@mui/icons-material/Route'

import {
  OPEN_DASHBOARD_EDITOR_EVENT,
  OPEN_STUDY_PACK_EVENT,
  OPEN_STUDY_PATH_EVENT,
  OPEN_WIDGET_EDITOR_EVENT,
  useWorkspaceActions,
} from '../../customHooks/useWorkspaceActions'
import { dispatchWorkspaceOnboardingEvent } from '../onboarding/onboardingEvents'
import CreateStudyPackModal from '../studyPack/CreateStudyPackModal'
import CreateStudyPathModal from '../studyPack/CreateStudyPathModal'
import { readStudyPackAiSettings } from '../../studyPack/ai'
import WidgetEditor from '../WidgetEditor/WidgetEditor'
import { CustomWidget } from '../WidgetEditor/WidgetStorage'

type StudioFlow = 'quick' | 'study-path' | 'from-notes'

const PINNED_STORAGE_KEY = 'studymesh-workspace-studio-pinned-v1'
const studioPanelWidth = 400

const readPinnedPreference = () => {
  try {
    return localStorage.getItem(PINNED_STORAGE_KEY) === 'true'
  } catch (error) {
    console.error('Failed to read workspace Studio pinned preference', error)
    return false
  }
}

const readIsAdmin = () => {
  try {
    const storedUserData = localStorage.getItem('userData')
    if (!storedUserData) {
      return true
    }

    const userData = JSON.parse(storedUserData)
    return userData.id === 'admin' && userData.role === 'ADMIN_ROLE'
  } catch (error) {
    console.error('Failed to read user data', error)
    return false
  }
}

const QuickAction = ({
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  disabled?: boolean
}) => (
  <Paper
    component="button"
    type="button"
    elevation={0}
    disabled={disabled}
    onClick={onClick}
    sx={{
      width: '100%',
      p: 1.5,
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      bgcolor: 'background.paper',
      color: 'text.primary',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      textAlign: 'left',
      '&:hover': {
        borderColor: disabled ? 'divider' : 'primary.main',
        bgcolor: disabled ? 'background.paper' : 'action.hover',
      },
    }}
  >
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: 'action.hover',
          flex: '0 0 auto',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={800}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
  </Paper>
)

const WorkspaceStudioShell = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [isPinned, setIsPinned] = useState(readPinnedPreference)
  const [isStudioOpen, setIsStudioOpen] = useState(() => readPinnedPreference())
  const [activeFlow, setActiveFlow] = useState<StudioFlow>('quick')
  const [fullScreenWidgetPayload, setFullScreenWidgetPayload] = useState<{
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null>(null)
  const {
    openCreateWidget,
    openCreateDashboard,
    openCreateStudyPack,
    openCreateStudyPath,
    createStudyPackDashboard,
    createStudyPackDashboards,
  } = useWorkspaceActions()

  const permissions = useMemo(() => {
    const isAdmin = readIsAdmin()
    const provider = readStudyPackAiSettings().provider || 'basic'

    return {
      canCreateDashboard: isAdmin,
      canCreateFromNotes: isAdmin && provider !== 'hosted',
      canCreateStudyPath:
        isAdmin && provider !== 'basic' && provider !== 'hosted',
      canCreateWidget: isAdmin,
    }
  }, [activeFlow])

  useEffect(() => {
    const activateCreation = (flow: StudioFlow) => {
      setActiveFlow(flow)
      setIsStudioOpen(true)
    }

    const handleOpenWidgetEditor = (event: Event) => {
      const customEvent = event as CustomEvent<{
        host?: string
        loadWidget?: CustomWidget
        initialEditMode?: boolean
      }>

      if (!readIsAdmin()) {
        return
      }

      setFullScreenWidgetPayload({
        loadWidget: customEvent.detail?.loadWidget,
        initialEditMode: customEvent.detail?.initialEditMode,
      })
      setActiveFlow('quick')
      if (isPinned) {
        setIsStudioOpen(true)
      } else {
        setIsStudioOpen(false)
      }
      dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-opened' })
    }
    const handleOpenStudyPack = () => {
      if (permissions.canCreateFromNotes) {
        activateCreation('from-notes')
      }
    }
    const handleOpenStudyPath = () => {
      if (permissions.canCreateStudyPath) {
        activateCreation('study-path')
      }
    }
    const handleOpenDashboard = () => {
      if (readIsAdmin()) {
        setActiveFlow('quick')
        if (isPinned) {
          setIsStudioOpen(true)
        } else {
          setIsStudioOpen(false)
        }
      }
    }

    window.addEventListener(OPEN_WIDGET_EDITOR_EVENT, handleOpenWidgetEditor)
    window.addEventListener(OPEN_STUDY_PACK_EVENT, handleOpenStudyPack)
    window.addEventListener(OPEN_STUDY_PATH_EVENT, handleOpenStudyPath)
    window.addEventListener(OPEN_DASHBOARD_EDITOR_EVENT, handleOpenDashboard)

    return () => {
      window.removeEventListener(
        OPEN_WIDGET_EDITOR_EVENT,
        handleOpenWidgetEditor,
      )
      window.removeEventListener(OPEN_STUDY_PACK_EVENT, handleOpenStudyPack)
      window.removeEventListener(OPEN_STUDY_PATH_EVENT, handleOpenStudyPath)
      window.removeEventListener(OPEN_DASHBOARD_EDITOR_EVENT, handleOpenDashboard)
    }
  }, [isPinned, permissions.canCreateFromNotes, permissions.canCreateStudyPath])

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, String(isPinned))
    } catch (error) {
      console.error('Failed to save workspace Studio pinned preference', error)
    }

    if (isPinned) {
      setIsStudioOpen(true)
    }
  }, [isPinned])

  const resetOrCloseStudio = () => {
    setActiveFlow('quick')

    if (!isPinned) {
      setIsStudioOpen(false)
    }
  }

  const closeStudio = () => {
    setActiveFlow('quick')
    setIsStudioOpen(false)
    dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-closed' })
  }

  const closeFullScreenWidgetEditor = () => {
    setFullScreenWidgetPayload(null)
    resetOrCloseStudio()
    dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-closed' })
  }

  const createPackAndHandleComplete: typeof createStudyPackDashboard = (
    payload,
  ) => {
    const dashboard = createStudyPackDashboard(payload)
    resetOrCloseStudio()
    return dashboard
  }

  const createPathAndHandleComplete: typeof createStudyPackDashboards = (
    payload,
  ) => {
    const dashboards = createStudyPackDashboards(payload)
    resetOrCloseStudio()
    return dashboards
  }

  const studioContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          minHeight: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} noWrap>
            Create Study Material
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={isPinned ? 'Unpin Studio' : 'Pin Studio'}>
            <IconButton
              aria-label={isPinned ? 'Unpin Studio' : 'Pin Studio'}
              onClick={() => setIsPinned((current) => !current)}
              size="small"
            >
              {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close Studio">
            <IconButton
              aria-label="Close Studio"
              onClick={closeStudio}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {activeFlow === 'quick' && (
        <Box sx={{ p: 2, overflow: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start from a prompt, notes, or advanced manual builders.
          </Typography>
          <Stack spacing={1.25}>
            <QuickAction
              icon={<RouteIcon />}
              title="Create Study Path"
              description="Generate ordered tutorial dashboards."
              onClick={openCreateStudyPath}
              disabled={!permissions.canCreateStudyPath}
            />
            <QuickAction
              icon={<AutoStoriesIcon />}
              title="Create From Notes"
              description="Turn notes, images, PDFs, or slides into study material."
              onClick={openCreateStudyPack}
              disabled={!permissions.canCreateFromNotes}
            />
            <QuickAction
              icon={<DashboardCustomizeIcon />}
              title="Create Dashboard"
              description="Compose a reusable workspace."
              onClick={openCreateDashboard}
              disabled={!permissions.canCreateDashboard}
            />
            <QuickAction
              icon={<ConstructionIcon />}
              title="Create Widget"
              description="Build a reusable study widget from blocks."
              onClick={openCreateWidget}
              disabled={!permissions.canCreateWidget}
            />
          </Stack>
        </Box>
      )}

      {activeFlow === 'study-path' && (
        <CreateStudyPathModal
          open
          presentation="embedded"
          onClose={resetOrCloseStudio}
          onCreatePath={createPathAndHandleComplete}
        />
      )}

      {activeFlow === 'from-notes' && (
        <CreateStudyPackModal
          open
          presentation="embedded"
          onClose={resetOrCloseStudio}
          onCreatePack={createPackAndHandleComplete}
        />
      )}

    </Box>
  )

  const widgetBuilderDialog = (
    <Dialog
      fullScreen
      open={Boolean(fullScreenWidgetPayload)}
      onClose={closeFullScreenWidgetEditor}
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
            onClick={closeFullScreenWidgetEditor}
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
            key={`full-screen-widget-${
              fullScreenWidgetPayload?.loadWidget?.id || 'new'
            }`}
            customProps={fullScreenWidgetPayload || undefined}
            onSaveComplete={closeFullScreenWidgetEditor}
          />
        </Box>
      </Box>
    </Dialog>
  )

  if (isMobile) {
    return (
      <Box sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {children}
        </Box>
        <Drawer
          anchor="left"
          open={isStudioOpen}
          onClose={resetOrCloseStudio}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: '100%',
              height: '100dvh',
              bgcolor: 'background.default',
              overflow: 'hidden',
            },
          }}
        >
          {studioContent}
        </Drawer>
        {widgetBuilderDialog}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {isStudioOpen && (
        <Box
          sx={{
            width: studioPanelWidth,
            maxWidth: '32vw',
            minWidth: 360,
            flex: '0 0 auto',
            minHeight: 0,
            overflow: 'hidden',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          {studioContent}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </Box>
      {widgetBuilderDialog}
    </Box>
  )
}

export default WorkspaceStudioShell

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Dialog,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

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
import {
  readStudyPackAiSettings,
  STUDY_PACK_AI_SETTINGS_CHANGED_EVENT,
} from '../../studyPack/ai'
import WidgetEditor from '../WidgetEditor/WidgetEditor'
import { CustomWidget } from '../WidgetEditor/WidgetStorage'
import {
  dispatchWorkspaceCreationStatus,
  WorkspaceCreationTask,
  WorkspaceCreationTaskState,
} from '../../workspaceCreationStatus'

type StudioFlow = 'study-path' | 'from-notes'

const statusMarkerLabels: Record<WorkspaceCreationTaskState, string> = {
  idle: '',
  running: 'Generating study material…',
  complete: 'Study material ready to review',
  error: 'Generation failed. Click to review.',
}

const statusMarkerColors: Record<
  Exclude<WorkspaceCreationTaskState, 'idle'>,
  string
> = {
  running: 'warning.main',
  complete: 'success.main',
  error: 'error.main',
}

const statusMarkerGlow: Record<
  Exclude<WorkspaceCreationTaskState, 'idle'>,
  string
> = {
  running: '0 0 0 6px rgba(245, 158, 11, 0.14)',
  complete: '0 0 0 7px rgba(34, 197, 94, 0.18)',
  error: '0 0 0 6px rgba(239, 68, 68, 0.16)',
}

const studioPanelWidth = 424
const studioPanelClamp = `clamp(380px, 31vw, ${studioPanelWidth}px)`
const workspaceCanvasSx = {
  minHeight: 0,
  overflow: 'hidden',
  p: '8px',
  boxSizing: 'border-box',
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

const WorkspaceStudioShell = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [isStudioOpen, setIsStudioOpen] = useState(false)
  const [activeFlow, setActiveFlow] = useState<StudioFlow>('study-path')
  const [creationMarkers, setCreationMarkers] = useState<
    Partial<
      Record<
        WorkspaceCreationTask,
        { state: Exclude<WorkspaceCreationTaskState, 'idle'>; message?: string }
      >
    >
  >({})
  const [aiProvider, setAiProvider] = useState(
    () => readStudyPackAiSettings().provider || 'basic',
  )
  const [fullScreenWidgetPayload, setFullScreenWidgetPayload] = useState<{
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null>(null)
  const { createStudyPackDashboard, createStudyPackDashboards } =
    useWorkspaceActions()

  const permissions = useMemo(() => {
    const isAdmin = readIsAdmin()

    return {
      canCreateDashboard: isAdmin,
      canCreateFromNotes: isAdmin && aiProvider !== 'hosted',
      canCreateStudyPath: isAdmin && aiProvider !== 'hosted',
      canCreateWidget: isAdmin,
    }
  }, [aiProvider])

  useEffect(() => {
    const refreshAiProvider = () => {
      setAiProvider(readStudyPackAiSettings().provider || 'basic')
    }

    window.addEventListener(
      STUDY_PACK_AI_SETTINGS_CHANGED_EVENT,
      refreshAiProvider,
    )

    return () => {
      window.removeEventListener(
        STUDY_PACK_AI_SETTINGS_CHANGED_EVENT,
        refreshAiProvider,
      )
    }
  }, [])

  useEffect(() => {
    const activateCreation = (flow: StudioFlow, toggle = false) => {
      if (toggle && isStudioOpen && activeFlow === flow) {
        setIsStudioOpen(false)
        return
      }

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
      setIsStudioOpen(false)
      dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-opened' })
    }
    const handleOpenStudyPack = (event: Event) => {
      if (permissions.canCreateFromNotes) {
        const customEvent = event as CustomEvent<{ toggle?: boolean }>
        activateCreation('from-notes', Boolean(customEvent.detail?.toggle))
      }
    }
    const handleOpenStudyPath = (event: Event) => {
      if (permissions.canCreateStudyPath) {
        const customEvent = event as CustomEvent<{ toggle?: boolean }>
        activateCreation('study-path', Boolean(customEvent.detail?.toggle))
      }
    }
    const handleOpenDashboard = () => {
      if (readIsAdmin()) {
        setIsStudioOpen(false)
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
      window.removeEventListener(
        OPEN_DASHBOARD_EDITOR_EVENT,
        handleOpenDashboard,
      )
    }
  }, [
    activeFlow,
    isStudioOpen,
    permissions.canCreateFromNotes,
    permissions.canCreateStudyPath,
  ])

  const resetOrCloseStudio = () => {
    setIsStudioOpen(false)
  }

  const closeStudio = () => {
    setIsStudioOpen(false)
    dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-closed' })
  }

  const reportCreationStatus = useCallback(
    (
      task: WorkspaceCreationTask,
      state: WorkspaceCreationTaskState,
      message?: string,
    ) => {
      dispatchWorkspaceCreationStatus({ task, state, message })

      if (state === 'idle') {
        setCreationMarkers((current) => {
          const nextMarkers = { ...current }
          delete nextMarkers[task]
          return nextMarkers
        })
        return
      }

      setCreationMarkers((current) => ({
        ...current,
        [task]: { state, message },
      }))

      if (state === 'running') {
        setIsStudioOpen(false)
      }
    },
    [],
  )

  const reportStudyPathStatus = useCallback(
    (state: WorkspaceCreationTaskState, message?: string) => {
      reportCreationStatus('study-path', state, message)
    },
    [reportCreationStatus],
  )

  const reportFromNotesStatus = useCallback(
    (state: WorkspaceCreationTaskState, message?: string) => {
      reportCreationStatus('from-notes', state, message)
    },
    [reportCreationStatus],
  )

  const closeFullScreenWidgetEditor = () => {
    setFullScreenWidgetPayload(null)
    resetOrCloseStudio()
    dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-closed' })
  }

  const createPackAndHandleComplete: typeof createStudyPackDashboard = (
    payload,
  ) => {
    const dashboard = createStudyPackDashboard(payload)
    reportCreationStatus('from-notes', 'idle', 'Study material created.')
    resetOrCloseStudio()
    return dashboard
  }

  const createPathAndHandleComplete: typeof createStudyPackDashboards = (
    payload,
  ) => {
    const dashboards = createStudyPackDashboards(payload)
    reportCreationStatus('study-path', 'idle', 'Study material created.')
    resetOrCloseStudio()
    return dashboards
  }

  const studioContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          minHeight: 54,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.75,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} noWrap>
            Create Study Material
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Build study dashboards without leaving the workspace
          </Typography>
        </Box>
        <Tooltip title="Close Studio">
          <IconButton
            aria-label="Close Studio"
            onClick={closeStudio}
            size="small"
            sx={{
              color: 'text.primary',
              bgcolor: 'background.default',
              border: 1,
              borderColor: 'divider',
              boxShadow: '0 1px 3px rgba(0,0,0,0.14)',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'text.secondary',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: activeFlow === 'study-path' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <CreateStudyPathModal
          open
          presentation="embedded"
          onClose={resetOrCloseStudio}
          onCreatePath={createPathAndHandleComplete}
          onStatusChange={reportStudyPathStatus}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: activeFlow === 'from-notes' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <CreateStudyPackModal
          open
          presentation="embedded"
          onClose={resetOrCloseStudio}
          onCreatePack={createPackAndHandleComplete}
          onStatusChange={reportFromNotesStatus}
        />
      </Box>
    </Box>
  )

  const openCreationMarker = (task: WorkspaceCreationTask) => {
    const nextFlow = task === 'study-path' ? 'study-path' : 'from-notes'

    if (isStudioOpen && activeFlow === nextFlow) {
      setIsStudioOpen(false)
      return
    }

    setActiveFlow(nextFlow)
    setIsStudioOpen(true)
  }

  const visibleCreationMarkers = (
    Object.entries(creationMarkers) as Array<
      [
        WorkspaceCreationTask,
        {
          state: Exclude<WorkspaceCreationTaskState, 'idle'>
          message?: string
        },
      ]
    >
  ).filter(([, marker]) => marker.state)

  const creationStatusMarkers = visibleCreationMarkers.length ? (
    <Box
      sx={{
        position: 'absolute',
        left: isMobile ? 12 : isStudioOpen ? studioPanelClamp : 0,
        top: isMobile ? 72 : 96,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        alignItems: 'flex-start',
        transition: theme.transitions.create('left', {
          duration: theme.transitions.duration.shorter,
          easing: theme.transitions.easing.easeInOut,
        }),
      }}
    >
      {visibleCreationMarkers.map(([task, marker]) => (
        <Tooltip
          key={task}
          title={marker.message || statusMarkerLabels[marker.state]}
          placement="right"
        >
          <Box
            component="button"
            type="button"
            aria-label={marker.message || statusMarkerLabels[marker.state]}
            onClick={() => openCreationMarker(task)}
            sx={{
              width: isMobile ? 46 : 30,
              height: isMobile ? 42 : 76,
              border: 0,
              borderRadius: isMobile ? 999 : '0 18px 18px 0',
              bgcolor: 'background.paper',
              color: 'text.primary',
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
              animation:
                marker.state === 'complete'
                  ? 'studymesh-marker-ready 1.4s ease-out 1'
                  : 'none',
              '@keyframes studymesh-marker-ready': {
                '0%': { boxShadow: statusMarkerGlow.complete },
                '100%': {
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 12px 32px rgba(0,0,0,0.42)'
                      : '0 12px 30px rgba(16,24,40,0.18)',
                },
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: statusMarkerColors[marker.state],
                boxShadow: statusMarkerGlow[marker.state],
                '&::after':
                  marker.state === 'running'
                    ? {
                        content: '""',
                        position: 'absolute',
                        inset: -5,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: 'warning.main',
                        borderTopColor: 'transparent',
                        animation:
                          'studymesh-marker-spin 900ms linear infinite',
                      }
                    : undefined,
                '@keyframes studymesh-marker-spin': {
                  to: { transform: 'rotate(360deg)' },
                },
              }}
            />
          </Box>
        </Tooltip>
      ))}
    </Box>
  ) : null

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
      <Box
        sx={{
          position: 'relative',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ height: '100%', ...workspaceCanvasSx }}>{children}</Box>
        <Drawer
          anchor="left"
          open={isStudioOpen}
          onClose={closeStudio}
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
        {creationStatusMarkers}
        {widgetBuilderDialog}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        aria-hidden={!isStudioOpen}
        sx={{
          width: isStudioOpen ? studioPanelClamp : 0,
          maxWidth: isStudioOpen ? studioPanelClamp : 0,
          minWidth: isStudioOpen ? 380 : 0,
          flex: '0 0 auto',
          minHeight: 0,
          overflow: 'hidden',
          p: isStudioOpen ? '8px 0 8px 8px' : 0,
          boxSizing: 'border-box',
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
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 18px 40px rgba(0,0,0,0.42)'
                : '0 18px 42px rgba(16,24,40,0.10)',
          }}
        >
          {studioContent}
        </Box>
      </Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          ...workspaceCanvasSx,
          transition: theme.transitions.create('padding', {
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Box
          sx={{
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {children}
        </Box>
      </Box>
      {creationStatusMarkers}
      {widgetBuilderDialog}
    </Box>
  )
}

export default WorkspaceStudioShell

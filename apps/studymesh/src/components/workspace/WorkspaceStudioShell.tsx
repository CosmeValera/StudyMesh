import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
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
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import QuizIcon from '@mui/icons-material/Quiz'
import RouteIcon from '@mui/icons-material/Route'
import StyleIcon from '@mui/icons-material/Style'

import {
  OPEN_CREATE_HUB_EVENT,
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
import { useDashboards } from '../Dasboard/DashboardProvider'
import {
  buildDashboardChatContext,
  formatDashboardChatContext,
} from '../../dashboardChat/contextBuilder'
import { StudyMaterialResourceType } from '../../studyPack/ai'
import {
  dispatchWorkspaceCreationStatus,
  WorkspaceCreationTask,
  WorkspaceCreationTaskState,
} from '../../workspaceCreationStatus'

type StudioFlow = 'hub' | 'study-path' | 'from-notes'
type CreateIntent = 'study-path' | StudyMaterialResourceType
type GenerationDraftStatus = 'generating' | 'ready' | 'failed' | 'cancelled'
type GenerationMarkerState = Exclude<WorkspaceCreationTaskState, 'idle'>

interface GenerationDraft {
  id: string
  flow: StudioFlow
  status: GenerationDraftStatus | 'editing'
  title: string
  createdAt: string
  inputSummary: string
  selectedResourceType?: string | null
  detailLevel?: string
  error?: string
}

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

const createGenerationDraft = (flow: Exclude<StudioFlow, 'hub'>): GenerationDraft => ({
  id: `${flow}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  flow,
  status: 'editing',
  title: flow === 'study-path' ? 'Study Path draft' : 'Notes draft',
  createdAt: new Date().toISOString(),
  inputSummary: flow === 'study-path' ? 'Learning prompt' : 'Sources',
})

const resourceTypeTitle = (resourceType?: string | null) => {
  if (resourceType === 'flashcards') {
    return 'Flashcards'
  }

  if (resourceType === 'quiz') {
    return 'Quiz'
  }

  if (resourceType === 'improvedNotes') {
    return 'Improved notes'
  }

  return 'Dashboard'
}

const formatDraftTitle = (draft: GenerationDraft) => {
  const base = draft.title.trim()
  const shortTitle =
    base.length > 46 ? `${base.slice(0, 45).trim()}...` : base

  if (draft.flow === 'study-path') {
    return `Study Path: ${shortTitle || 'Untitled'}`
  }

  return `${resourceTypeTitle(draft.selectedResourceType)} from ${
    draft.inputSummary || shortTitle || 'notes'
  }`
}

const getDraftMarkerState = (
  status: GenerationDraft['status'],
): GenerationMarkerState | null => {
  if (status === 'generating') {
    return 'running'
  }

  if (status === 'ready') {
    return 'complete'
  }

  if (status === 'failed') {
    return 'error'
  }

  return null
}

const WorkspaceStudioShell = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const initialDrafts = useMemo(
    () => [createGenerationDraft('study-path'), createGenerationDraft('from-notes')],
    [],
  )
  const [isStudioOpen, setIsStudioOpen] = useState(false)
  const [activeFlow, setActiveFlow] = useState<StudioFlow>('hub')
  const [selectedIntent, setSelectedIntent] = useState<CreateIntent | null>(null)
  const [useCurrentDashboardSource, setUseCurrentDashboardSource] = useState(false)
  const [generationDrafts, setGenerationDrafts] = useState<GenerationDraft[]>(
    initialDrafts,
  )
  const [activeDraftByFlow, setActiveDraftByFlow] = useState<
    Record<StudioFlow, string>
  >(() => ({
    'study-path': initialDrafts[0].id,
    'from-notes': initialDrafts[1].id,
  }))
  const autoCollapsedDraftIds = useRef<Set<string>>(new Set())
  const [aiProvider, setAiProvider] = useState(
    () => readStudyPackAiSettings().provider || 'basic',
  )
  const [fullScreenWidgetPayload, setFullScreenWidgetPayload] = useState<{
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null>(null)
  const { createStudyPackDashboard, createStudyPackDashboards } =
    useWorkspaceActions()
  const { openDashboards, selectedDashboard } = useDashboards()

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
    const activateCreation = (flow: Exclude<StudioFlow, 'hub'>) => createNewDraft(flow)
    const handleOpenCreateHub = (event: Event) => {
      const customEvent = event as CustomEvent<{ intent?: CreateIntent }>
      setSelectedIntent(customEvent.detail?.intent || null)
      setUseCurrentDashboardSource(false)
      setActiveFlow('hub')
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
        setIsStudioOpen(false)
      }
    }

    window.addEventListener(OPEN_CREATE_HUB_EVENT, handleOpenCreateHub)
    window.addEventListener(OPEN_WIDGET_EDITOR_EVENT, handleOpenWidgetEditor)
    window.addEventListener(OPEN_STUDY_PACK_EVENT, handleOpenStudyPack)
    window.addEventListener(OPEN_STUDY_PATH_EVENT, handleOpenStudyPath)
    window.addEventListener(OPEN_DASHBOARD_EDITOR_EVENT, handleOpenDashboard)

    return () => {
      window.removeEventListener(OPEN_CREATE_HUB_EVENT, handleOpenCreateHub)
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

  const updateDraft = useCallback(
    (draftId: string, updates: Partial<GenerationDraft>) => {
      setGenerationDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId ? { ...draft, ...updates } : draft,
        ),
      )
    },
    [],
  )

  const createNewDraft = (flow: Exclude<StudioFlow, 'hub'>) => {
    const draft = createGenerationDraft(flow)
    setGenerationDrafts((current) => [
      ...current.filter(
        (existingDraft) =>
          existingDraft.flow !== flow || existingDraft.status !== 'editing',
      ),
      draft,
    ])
    setActiveDraftByFlow((current) => ({ ...current, [flow]: draft.id }))
    setActiveFlow(flow)
    setIsStudioOpen(true)
  }

  const removeDraft = (draftId: string, flow: Exclude<StudioFlow, 'hub'>) => {
    let nextActiveDraftId: string | null = null
    autoCollapsedDraftIds.current.delete(draftId)
    setGenerationDrafts((current) => {
      const remaining = current.filter((draft) => draft.id !== draftId)
      const flowDrafts = remaining.filter((draft) => draft.flow === flow)
      if (flowDrafts.length === 0) {
        const replacement = createGenerationDraft(flow)
        nextActiveDraftId = replacement.id
        return [...remaining, replacement]
      }

      nextActiveDraftId = flowDrafts[0].id
      return remaining
    })
    setActiveDraftByFlow((active) =>
      active[flow] === draftId && nextActiveDraftId
        ? { ...active, [flow]: nextActiveDraftId }
        : active,
    )
  }

  const makeDraftStatusHandler =
    (draftId: string, flow: Exclude<StudioFlow, 'hub'>) =>
    (state: WorkspaceCreationTaskState, message?: string) => {
      setGenerationDrafts((current) =>
        current.map((draft) => {
          if (draft.id !== draftId) {
            return draft
          }

          const nextStatus =
            state === 'running'
              ? 'generating'
              : state === 'complete'
                ? 'ready'
                : state === 'error'
                  ? 'failed'
                  : 'editing'

          return {
            ...draft,
            status: nextStatus,
            error: state === 'error' ? message : undefined,
          }
        }),
      )

      if (state === 'running' && !autoCollapsedDraftIds.current.has(draftId)) {
        autoCollapsedDraftIds.current.add(draftId)
        setIsStudioOpen(false)
      }

      if (flow === 'study-path') {
        reportStudyPathStatus(state, message)
      } else {
        reportFromNotesStatus(state, message)
      }
    }

  const closeFullScreenWidgetEditor = () => {
    setFullScreenWidgetPayload(null)
    resetOrCloseStudio()
    dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-closed' })
  }

  const currentDashboard = openDashboards[selectedDashboard]
  const currentDashboardContext = useMemo(() => {
    if (!currentDashboard) {
      return ''
    }

    const context = buildDashboardChatContext(currentDashboard, {
      studyPathScope: 'selected',
    })
    return formatDashboardChatContext(context, context.chunks).trim()
  }, [currentDashboard])
  const hasCurrentDashboardContext = currentDashboardContext.length > 0
  const currentDashboardTitle = currentDashboard?.studyPath?.title || currentDashboard?.name || 'Current dashboard'

  const openIntentSourceStep = (intent: CreateIntent) => {
    setSelectedIntent(intent)
    setUseCurrentDashboardSource(false)
  }

  const startSelectedIntent = (useCurrentDashboard: boolean) => {
    if (!selectedIntent) {
      return
    }

    setUseCurrentDashboardSource(useCurrentDashboard)
    createNewDraft(selectedIntent === 'study-path' ? 'study-path' : 'from-notes')
  }

  const createOptions: Array<{
    intent: CreateIntent
    title: string
    description: string
    icon: React.ReactNode
  }> = [
    {
      intent: 'study-path',
      title: 'Study Path',
      description: 'Generate an ordered learning path from a topic or source.',
      icon: <RouteIcon />,
    },
    {
      intent: 'improvedNotes',
      title: 'Improved Notes',
      description: 'Turn material into a clean explained dashboard.',
      icon: <AutoStoriesIcon />,
    },
    {
      intent: 'flashcards',
      title: 'Flashcards',
      description: 'Practice key concepts from your material.',
      icon: <StyleIcon />,
    },
    {
      intent: 'quiz',
      title: 'Quiz',
      description: 'Test your understanding with generated questions.',
      icon: <QuizIcon />,
    },
  ]

  const selectedCreateOption = createOptions.find(
    (option) => option.intent === selectedIntent,
  )

  const creationHubContent = (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2.25 }}>
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            {selectedCreateOption ? 'Choose source' : 'What do you want to create?'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedCreateOption
              ? `Create ${selectedCreateOption.title.toLowerCase()} from a topic, the current dashboard, or pasted/uploaded material.`
              : 'Start with the outcome first. StudyMesh will ask for the right source next.'}
          </Typography>
        </Box>

        {!selectedCreateOption ? (
          <Stack spacing={1.25}>
            {createOptions.map((option) => (
              <Paper
                key={option.intent}
                component="button"
                type="button"
                onClick={() => openIntentSourceStep(option.intent)}
                variant="outlined"
                sx={{
                  width: '100%',
                  p: 1.5,
                  textAlign: 'left',
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 1.25,
                  alignItems: 'center',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    flex: '0 0 auto',
                  }}
                >
                  {option.icon}
                </Box>
                <Box>
                  <Typography fontWeight={900}>{option.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            <Button
              variant="outlined"
              onClick={() => setSelectedIntent(null)}
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              Back
            </Button>
            {selectedIntent === 'study-path' && (
              <Button
                variant="contained"
                onClick={() => startSelectedIntent(false)}
                sx={{ justifyContent: 'flex-start', p: 1.5, borderRadius: 2 }}
              >
                Start from a topic / prompt
              </Button>
            )}
            <Button
              variant="outlined"
              disabled={!hasCurrentDashboardContext}
              onClick={() => startSelectedIntent(true)}
              sx={{ justifyContent: 'flex-start', p: 1.5, borderRadius: 2 }}
            >
              Use current dashboard as context
              {hasCurrentDashboardContext ? ` — ${currentDashboardTitle}` : ' — no active content'}
            </Button>
            <Button
              variant={selectedIntent === 'study-path' ? 'outlined' : 'contained'}
              onClick={() => startSelectedIntent(false)}
              sx={{ justifyContent: 'flex-start', p: 1.5, borderRadius: 2 }}
            >
              {selectedIntent === 'study-path'
                ? 'Paste or upload sources instead'
                : 'Paste text or upload files'}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  )

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
          flex: 1,
          minHeight: 0,
          display: activeFlow === 'hub' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        {creationHubContent}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: activeFlow === 'study-path' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        {generationDrafts
          .filter((draft) => draft.flow === 'study-path')
          .map((draft) => (
            <Box
              key={draft.id}
              sx={{
                flex: 1,
                minHeight: 0,
                display: draft.id === activeDraftByFlow['study-path'] ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              <CreateStudyPathModal
                open
                presentation="embedded"
                onCollapse={closeStudio}
                onClose={() => removeDraft(draft.id, 'study-path')}
                onCreatePath={(payload) => {
                  const dashboards = createStudyPackDashboards(payload)
                  removeDraft(draft.id, 'study-path')
                  setIsStudioOpen(false)
                  reportCreationStatus(
                    'study-path',
                    'idle',
                    'Study material created.',
                  )
                  return dashboards
                }}
                initialPrompt={
                  useCurrentDashboardSource ? currentDashboardContext : undefined
                }
                onStatusChange={makeDraftStatusHandler(draft.id, 'study-path')}
                onDraftMetaChange={(metadata) =>
                  updateDraft(draft.id, {
                    title: metadata.title,
                    inputSummary: metadata.inputSummary,
                    detailLevel: metadata.detailLevel,
                  })
                }
              />
            </Box>
          ))}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: activeFlow === 'from-notes' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        {generationDrafts
          .filter((draft) => draft.flow === 'from-notes')
          .map((draft) => (
            <Box
              key={draft.id}
              sx={{
                flex: 1,
                minHeight: 0,
                display: draft.id === activeDraftByFlow['from-notes'] ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              <CreateStudyPackModal
                open
                presentation="embedded"
                onCollapse={closeStudio}
                onClose={() => removeDraft(draft.id, 'from-notes')}
                onCreatePack={(payload) => {
                  const dashboard = createStudyPackDashboard(payload)
                  removeDraft(draft.id, 'from-notes')
                  setIsStudioOpen(false)
                  reportCreationStatus(
                    'from-notes',
                    'idle',
                    'Study material created.',
                  )
                  return dashboard
                }}
                initialResourceType={
                  selectedIntent && selectedIntent !== 'study-path'
                    ? selectedIntent
                    : undefined
                }
                initialSourceText={
                  useCurrentDashboardSource ? currentDashboardContext : undefined
                }
                initialTitle={
                  useCurrentDashboardSource
                    ? `${currentDashboardTitle} ${selectedCreateOption?.title || 'Study Material'}`
                    : undefined
                }
                onStatusChange={makeDraftStatusHandler(draft.id, 'from-notes')}
                onDraftMetaChange={(metadata) =>
                  updateDraft(draft.id, {
                    title: metadata.title,
                    inputSummary: metadata.inputSummary,
                    selectedResourceType: metadata.resourceType,
                    detailLevel: metadata.detailLevel,
                  })
                }
              />
            </Box>
          ))}
      </Box>
    </Box>
  )

  const openCreationMarker = (draft: GenerationDraft) => {
    const isActiveMarker = activeDraftByFlow[draft.flow] === draft.id

    if (isStudioOpen && activeFlow === draft.flow && isActiveMarker) {
      closeStudio()
      return
    }

    setActiveFlow(draft.flow)
    setActiveDraftByFlow((current) => ({
      ...current,
      [draft.flow]: draft.id,
    }))
    setIsStudioOpen(true)
  }

  const visibleCreationMarkers = generationDrafts
    .map((draft) => {
      const state = getDraftMarkerState(draft.status)
      return state ? { draft, state } : null
    })
    .filter(
      (
        marker,
      ): marker is {
        draft: GenerationDraft
        state: GenerationMarkerState
      } => Boolean(marker),
    )

  const openCreateHub = () => {
    if (isStudioOpen && activeFlow === 'hub') {
      closeStudio()
      return
    }

    setSelectedIntent(null)
    setUseCurrentDashboardSource(false)
    setActiveFlow('hub')
    setIsStudioOpen(true)
  }

  const creationStatusMarkers = (
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
      <Tooltip title="Create" placement="right">
        <Box
          component="button"
          type="button"
          aria-label="Create"
          onClick={openCreateHub}
          sx={{
            width: isMobile ? 46 : 34,
            height: isMobile ? 42 : 82,
            border: 0,
            borderRadius: isMobile ? 999 : '0 20px 20px 0',
            bgcolor: activeFlow === 'hub' && isStudioOpen ? 'primary.main' : 'background.paper',
            color: activeFlow === 'hub' && isStudioOpen ? 'primary.contrastText' : 'primary.main',
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
          }}
        >
          <AddIcon fontSize="small" />
        </Box>
      </Tooltip>
      {visibleCreationMarkers.map(({ draft, state }) => (
        <Tooltip
          key={draft.id}
          title={`${formatDraftTitle(draft)} - ${statusMarkerLabels[state]}`}
          placement="right"
        >
          <Box
            component="button"
            type="button"
            aria-label={`${formatDraftTitle(draft)} - ${statusMarkerLabels[state]}`}
            onClick={() => openCreationMarker(draft)}
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
                state === 'complete'
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
                bgcolor: statusMarkerColors[state],
                boxShadow: statusMarkerGlow[state],
                '&::after':
                  state === 'running'
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

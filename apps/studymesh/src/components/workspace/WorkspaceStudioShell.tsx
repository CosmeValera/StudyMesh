import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  IconButton,
  MenuItem,
  Paper,
  Slide,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import QuizIcon from '@mui/icons-material/Quiz'
import RouteIcon from '@mui/icons-material/Route'
import StyleIcon from '@mui/icons-material/Style'
import UploadFileIcon from '@mui/icons-material/UploadFile'

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
  resolveStudyPackAiCredentials,
  generateStudyPackWithAi,
  STUDY_PACK_AI_SETTINGS_CHANGED_EVENT,
  StudyMaterialDetailLevel,
  StudyMaterialResourceType,
} from '../../studyPack/ai'
import { createStudyPackOrchestratorWidgets } from '../../studyPack'
import { extractTextFromPdf, extractTextFromPptx } from '../../studyPack/documentExtraction'
import { extractRawNotesFromImage } from '../../studyPack/imageOcr'
import WidgetEditor from '../WidgetEditor/WidgetEditor'
import { CustomWidget } from '../WidgetEditor/WidgetStorage'
import { useDashboards } from '../Dasboard/DashboardProvider'
import {
  buildDashboardChatContext,
  formatDashboardChatContext,
} from '../../dashboardChat/contextBuilder'
import {
  dispatchWorkspaceCreationStatus,
  WorkspaceCreationTask,
  WorkspaceCreationTaskState,
} from '../../workspaceCreationStatus'
import {
  CLOSE_CREATE_STUDIO_EVENT,
  CLOSE_DASHBOARD_CHAT_EVENT,
  OPEN_DASHBOARD_CHAT_EVENT,
} from './workspaceEvents'

type StudioFlow = 'hub' | 'study-path' | 'from-notes'
type CreationFlow = Exclude<StudioFlow, 'hub'>
type CreateIntent = 'study-path' | StudyMaterialResourceType
type GenerationDraftStatus = 'generating' | 'ready' | 'failed' | 'cancelled'
type GenerationMarkerState =
  | 'editing'
  | Exclude<WorkspaceCreationTaskState, 'idle'>

interface GenerationDraft {
  id: string
  flow: CreationFlow
  status: GenerationDraftStatus | 'editing'
  title: string
  createdAt: string
  inputSummary: string
  selectedResourceType?: string | null
  detailLevel?: string
  error?: string
  isPlaceholder?: boolean
  quickCreate?: boolean
}

const quickCreateLabels: Record<StudyMaterialResourceType, string> = {
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  improvedNotes: 'Summary / Clearer Notes',
}

const quickCreateIcons: Record<StudyMaterialResourceType, React.ReactNode> = {
  quiz: <QuizIcon fontSize="small" />,
  flashcards: <StyleIcon fontSize="small" />,
  improvedNotes: <AutoStoriesIcon fontSize="small" />,
}

const quickCreateTargets: Record<StudyMaterialResourceType, string[]> = {
  quiz: ['quizzes'],
  flashcards: ['flashcards'],
  improvedNotes: ['summaries', 'definitions', 'lists'],
}

const quickCreateDetailToAmount: Record<
  StudyMaterialDetailLevel,
  'few' | 'medium' | 'many'
> = {
  short: 'few',
  medium: 'medium',
  long: 'many',
}

const quickSourceAcceptValue = [
  '.md',
  '.txt',
  '.csv',
  '.pdf',
  '.pptx',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/markdown',
  'text/plain',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',')

const statusMarkerLabels: Record<
  WorkspaceCreationTaskState | 'editing',
  string
> = {
  editing: 'Creation draft open',
  idle: '',
  running: 'Generating study material…',
  complete: 'Study material ready to review',
  error: 'Generation failed. Click to review.',
}

const statusMarkerColors: Record<GenerationMarkerState, string> = {
  editing: 'primary.main',
  running: 'warning.main',
  complete: 'success.main',
  error: 'error.main',
}

const statusMarkerGlow: Record<GenerationMarkerState, string> = {
  editing: '0 0 0 6px rgba(59, 130, 246, 0.14)',
  running: '0 0 0 6px rgba(245, 158, 11, 0.14)',
  complete: '0 0 0 7px rgba(34, 197, 94, 0.18)',
  error: '0 0 0 6px rgba(239, 68, 68, 0.16)',
}

const studioPanelWidth = 424
const studioPanelRailWidth = 44
const studioPanelMinWidth = 360
const studioPanelMaxWidth = 620
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

const createGenerationDraft = (
  flow: Exclude<StudioFlow, 'hub'>,
  options: { isPlaceholder?: boolean } = {},
): GenerationDraft => ({
  id: `${flow}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  flow,
  status: 'editing',
  title: flow === 'study-path' ? 'Study Path draft' : 'Notes draft',
  createdAt: new Date().toISOString(),
  inputSummary: flow === 'study-path' ? 'Learning prompt' : 'Sources',
  isPlaceholder: options.isPlaceholder,
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
  const shortTitle = base.length > 46 ? `${base.slice(0, 45).trim()}...` : base

  if (draft.flow === 'study-path') {
    return `Study Path: ${shortTitle || 'Untitled'}`
  }

  return `${resourceTypeTitle(draft.selectedResourceType)} from ${
    draft.inputSummary || shortTitle || 'notes'
  }`
}

const getDraftMarkerState = (
  draft: GenerationDraft,
): GenerationMarkerState | null => {
  if (draft.status === 'editing' && !draft.isPlaceholder) {
    return 'editing'
  }

  const { status } = draft

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
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const initialDrafts = useMemo(
    () => [
      createGenerationDraft('study-path', { isPlaceholder: true }),
      createGenerationDraft('from-notes', { isPlaceholder: true }),
    ],
    [],
  )
  const [isStudioOpen, setIsStudioOpen] = useState(false)
  const [studioWidth, setStudioWidth] = useState(studioPanelWidth)
  const [mobileSection, setMobileSection] = useState<
    'creation' | 'dashboard' | 'ai-chat'
  >('dashboard')
  const [activeFlow, setActiveFlow] = useState<StudioFlow>('hub')
  const [selectedIntent, setSelectedIntent] = useState<CreateIntent | null>(
    null,
  )
  const [generationDrafts, setGenerationDrafts] =
    useState<GenerationDraft[]>(initialDrafts)
  const [activeDraftByFlow, setActiveDraftByFlow] = useState<
    Record<CreationFlow, string>
  >(() => ({
    'study-path': initialDrafts[0].id,
    'from-notes': initialDrafts[1].id,
  }))
  const openingMobileAiChatRef = useRef(false)
  const [aiProvider, setAiProvider] = useState(
    () => readStudyPackAiSettings().provider || 'basic',
  )
  const [quickOptionsOpen, setQuickOptionsOpen] = useState(false)
  const [quickDetailLevel, setQuickDetailLevel] =
    useState<StudyMaterialDetailLevel>('medium')
  const [quickDifficulty, setQuickDifficulty] = useState('standard')
  const [quickSourceText, setQuickSourceText] = useState('')
  const [quickSourceFiles, setQuickSourceFiles] = useState<File[]>([])
  const [quickSourceStatus, setQuickSourceStatus] = useState('')
  const [fullScreenWidgetPayload, setFullScreenWidgetPayload] = useState<{
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null>(null)
  const { createStudyPackDashboard, createStudyPackDashboards } =
    useWorkspaceActions()
  const { openDashboards, selectedDashboard } = useDashboards()

  const startStudioResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = studioWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(
        studioPanelMinWidth,
        Math.min(studioPanelMaxWidth, startWidth + moveEvent.clientX - startX),
      )
      setStudioWidth(nextWidth)
    }

    const stopResize = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopResize)
  }

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
    const showDashboardAfterChatClose = () => {
      if (isMobile) {
        setMobileSection('dashboard')
      }
    }

    window.addEventListener(
      CLOSE_DASHBOARD_CHAT_EVENT,
      showDashboardAfterChatClose,
    )

    return () => {
      window.removeEventListener(
        CLOSE_DASHBOARD_CHAT_EVENT,
        showDashboardAfterChatClose,
      )
    }
  }, [isMobile])

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
    const activateCreation = (flow: Exclude<StudioFlow, 'hub'>) => {
      createNewDraft(flow)
      if (isMobile) {
        setMobileSection('creation')
      }
    }
    const handleOpenCreateHub = (event: Event) => {
      const customEvent = event as CustomEvent<{ intent?: CreateIntent }>
      setSelectedIntent(customEvent.detail?.intent || null)
      setActiveFlow('hub')
      setIsStudioOpen(true)
      if (isMobile) {
        setMobileSection('creation')
      }
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
    const handleCloseCreateStudio = () => {
      setIsStudioOpen(false)
      if (isMobile && mobileSection === 'creation') {
        setMobileSection(
          openingMobileAiChatRef.current ? 'ai-chat' : 'dashboard',
        )
      }
      openingMobileAiChatRef.current = false
      dispatchWorkspaceOnboardingEvent({ type: 'widget-editor-closed' })
    }

    window.addEventListener(OPEN_CREATE_HUB_EVENT, handleOpenCreateHub)
    window.addEventListener(OPEN_WIDGET_EDITOR_EVENT, handleOpenWidgetEditor)
    window.addEventListener(OPEN_STUDY_PACK_EVENT, handleOpenStudyPack)
    window.addEventListener(OPEN_STUDY_PATH_EVENT, handleOpenStudyPath)
    window.addEventListener(OPEN_DASHBOARD_EDITOR_EVENT, handleOpenDashboard)
    window.addEventListener(CLOSE_CREATE_STUDIO_EVENT, handleCloseCreateStudio)

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
      window.removeEventListener(
        CLOSE_CREATE_STUDIO_EVENT,
        handleCloseCreateStudio,
      )
    }
  }, [
    isMobile,
    mobileSection,
    permissions.canCreateFromNotes,
    permissions.canCreateStudyPath,
  ])

  const resetOrCloseStudio = () => {
    setIsStudioOpen(false)
    if (isMobile) {
      setMobileSection('dashboard')
    }
  }

  const closeStudio = () => {
    setIsStudioOpen(false)
    if (isMobile) {
      setMobileSection('dashboard')
    }
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
    window.dispatchEvent(new Event(CLOSE_DASHBOARD_CHAT_EVENT))
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
    if (isMobile) {
      setMobileSection('creation')
    }
  }

  const removeDraft = (draftId: string, flow: Exclude<StudioFlow, 'hub'>) => {
    let nextActiveDraftId: string | null = null
    setGenerationDrafts((current) => {
      const remaining = current.filter((draft) => draft.id !== draftId)
      const flowDrafts = remaining.filter((draft) => draft.flow === flow)
      if (flowDrafts.length === 0) {
        const replacement = createGenerationDraft(flow, {
          isPlaceholder: true,
        })
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
  const currentDashboardTitle =
    currentDashboard?.studyPath?.title ||
    currentDashboard?.name ||
    'Current dashboard'
  const quickHasCustomSources =
    quickSourceText.trim().length > 0 || quickSourceFiles.length > 0
  const quickCustomSourceCount =
    (quickSourceText.trim() ? 1 : 0) + quickSourceFiles.length
  const quickSourceLabel = quickHasCustomSources
    ? `${quickCustomSourceCount} custom source${
        quickCustomSourceCount === 1 ? '' : 's'
      }`
    : hasCurrentDashboardContext
      ? currentDashboardTitle
      : 'Sources required'

  const startCreateIntent = (intent: CreateIntent) => {
    setSelectedIntent(intent)
    createNewDraft(intent === 'study-path' ? 'study-path' : 'from-notes')
  }

  const addQuickSourceFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files)
    setQuickSourceFiles((current) => [...current, ...nextFiles])
    setQuickSourceStatus('')
  }

  const removeQuickSourceFile = (index: number) => {
    setQuickSourceFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    )
  }

  const clearQuickSources = () => {
    setQuickSourceText('')
    setQuickSourceFiles([])
    setQuickSourceStatus('')
  }

  const handleQuickSourceDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files.length > 0) {
      addQuickSourceFiles(event.dataTransfer.files)
    }
  }

  const extractQuickSourceFile = async (file: File) => {
    const fileName = file.name.toLowerCase()

    if (
      file.type.startsWith('text/') ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.csv')
    ) {
      return `# ${file.name}\n\n${await file.text()}`
    }

    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      const extracted = await extractTextFromPdf(file)
      return extracted.text
    }

    if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileName.endsWith('.pptx')
    ) {
      const extracted = await extractTextFromPptx(file)
      return extracted.text
    }

    if (file.type.startsWith('image/')) {
      const text = await extractRawNotesFromImage(file)
      return text ? `# ${file.name}\n\n${text}` : ''
    }

    throw new Error(`${file.name} is not a supported source file.`)
  }

  const buildQuickSourceText = async () => {
    const sourceParts: string[] = []

    if (quickSourceText.trim()) {
      sourceParts.push(`# Pasted text\n\n${quickSourceText.trim()}`)
    }

    if (quickSourceFiles.length > 0) {
      setQuickSourceStatus(`Reading ${quickSourceFiles.length} source file${
        quickSourceFiles.length === 1 ? '' : 's'
      }`)
      for (const file of quickSourceFiles) {
        const extracted = await extractQuickSourceFile(file)
        if (extracted.trim()) {
          sourceParts.push(extracted.trim())
        }
      }
    }

    if (sourceParts.length > 0) {
      setQuickSourceStatus('')
      return sourceParts.join('\n\n')
    }

    setQuickSourceStatus('')
    return hasCurrentDashboardContext ? currentDashboardContext : ''
  }

  const runQuickCreate = async (resourceType: StudyMaterialResourceType) => {
    const titleBase = quickCreateLabels[resourceType]
    const usingAttachedSources =
      quickSourceText.trim().length > 0 || quickSourceFiles.length > 0
    const draft: GenerationDraft = {
      id: `quick-${resourceType}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      flow: 'from-notes',
      status: 'generating',
      title: titleBase,
      createdAt: new Date().toISOString(),
      inputSummary: usingAttachedSources
        ? 'Attached sources'
        : `Current dashboard: ${currentDashboardTitle}`,
      selectedResourceType: resourceType,
      detailLevel: quickDetailLevel,
      quickCreate: true,
    }

    setGenerationDrafts((current) => [...current, draft])
    reportFromNotesStatus('running', `${titleBase} is generating`)

    try {
      const sourceText = await buildQuickSourceText()

      if (!sourceText.trim()) {
        updateDraft(draft.id, {
          status: 'failed',
          error:
            'Add pasted text or attachments in Options, or open a dashboard with study content.',
        })
        reportFromNotesStatus('error', 'Quick Create needs source material.')
        return
      }

      const credentials = resolveStudyPackAiCredentials()
      const generationAmount = quickCreateDetailToAmount[quickDetailLevel]
      const rawNotes = [
        sourceText,
        quickDifficulty === 'standard'
          ? ''
          : `Difficulty: ${quickDifficulty}`,
      ]
        .filter(Boolean)
        .join('\n\n')
      const draftPack = await generateStudyPackWithAi({
        provider: aiProvider,
        apiToken: credentials.apiToken,
        model: credentials.model,
        title: `${currentDashboardTitle} ${titleBase}`,
        rawNotes,
        packId: `${resourceType}-${Date.now()}`,
        generationTargets: quickCreateTargets[resourceType],
        generationAmount,
        resourceType,
        detailLevel: quickDetailLevel,
        quizQuestionStyle: 'mixed',
        promptMode: false,
        studyPathMode: false,
      })
      const widgets = createStudyPackOrchestratorWidgets(
        {
          id: `${resourceType}-${Date.now()}`,
          title: draftPack.title || `${currentDashboardTitle} ${titleBase}`,
          sourceFormat: draftPack.sourceFormat || 'text',
          objects: draftPack.objects,
          warnings: draftPack.warnings || [],
          sourceSummary: draftPack.sourceSummary,
        },
        {
          forceQuizBlockComponent: resourceType === 'quiz',
          focusedResourceType:
            resourceType === 'quiz' || resourceType === 'flashcards'
              ? resourceType
              : undefined,
          includeSourceWidget: false,
          includeSummaryChart: false,
          rawSource: sourceText,
          widgetGroups: [
            {
              name: `${draftPack.title || currentDashboardTitle} ${titleBase}`,
              objects: draftPack.objects,
            },
          ],
        },
      )
      const dashboard = createStudyPackDashboard({
        name: draftPack.title || `${currentDashboardTitle} ${titleBase}`,
        widgets,
        layoutMode: resourceType === 'improvedNotes' ? 'smart' : 'tabs',
      })
      updateDraft(draft.id, {
        status: 'ready',
        title: dashboard.name,
        inputSummary: 'Ready in workspace',
      })
      reportFromNotesStatus('complete', `${titleBase} ready.`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Could not create ${titleBase}.`
      setQuickSourceStatus('')
      updateDraft(draft.id, {
        status: 'failed',
        error: message,
      })
      reportFromNotesStatus('error', message)
    }
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
      description: 'Generate a guided learning path with connected dashboards.',
      icon: <RouteIcon />,
    },
  ]

  const studyPathOption = createOptions[0]

  const returnToCreateHub = () => {
    setActiveFlow('hub')
    setSelectedIntent(null)
    if (isMobile) {
      setMobileSection('creation')
    }
  }

  const cancelDraftAndReturnToHub = (
    draftId: string,
    flow: Exclude<StudioFlow, 'hub'>,
  ) => {
    removeDraft(draftId, flow)
    setActiveFlow('hub')
    setSelectedIntent(null)
    if (isMobile) {
      setMobileSection('creation')
    }
  }

  const creationHubContent = (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2.25 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" fontWeight={900}>
              Creation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Turn dashboard context or source files into study material.
            </Typography>
          </Box>
          <IconButton
            aria-label="Close Create panel"
            onClick={closeStudio}
            size="small"
            sx={{
              mt: 0.25,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
              flex: '0 0 auto',
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Box>

        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={900}>
            Study Path
          </Typography>
          <Paper
            component="button"
            type="button"
            onClick={() => startCreateIntent(studyPathOption.intent)}
            variant="outlined"
            sx={{
              width: '100%',
              p: 2,
              textAlign: 'left',
              borderRadius: 2.5,
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.09),
              color: 'text.primary',
              cursor: 'pointer',
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              boxShadow: `inset 0 0 0 1px ${alpha(
                theme.palette.primary.main,
                0.18,
              )}`,
              '&:hover': {
                borderColor: 'primary.dark',
                bgcolor: alpha(theme.palette.primary.main, 0.13),
              },
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flex: '0 0 auto',
              }}
            >
              {studyPathOption.icon}
            </Box>
            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" gap={1} alignItems="center">
                <Typography variant="h6" fontWeight={900}>
                  {studyPathOption.title}
                </Typography>
                <Chip
                  size="small"
                  label="Main flow"
                  color="primary"
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Generate an ordered tutorial with lesson dashboards, exercises,
                flashcards, and review structure.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Best when you want StudyMesh to teach a topic step by step.
              </Typography>
            </Stack>
          </Paper>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 1.4,
            border: 1,
            borderColor:
              quickHasCustomSources || hasCurrentDashboardContext
                ? 'divider'
                : 'warning.main',
            borderRadius: 2,
            bgcolor:
              quickHasCustomSources || hasCurrentDashboardContext
                ? alpha(theme.palette.primary.main, 0.035)
                : alpha(theme.palette.warning.main, 0.08),
          }}
        >
          <Stack spacing={1.25}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              gap={1}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={900}>
                  Source
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {quickHasCustomSources
                    ? `${quickSourceLabel} selected`
                    : hasCurrentDashboardContext
                      ? `Default: ${currentDashboardTitle}`
                      : 'Add sources before quick creation'}
                </Typography>
              </Box>
              <Chip
                size="small"
                color={
                  quickHasCustomSources || hasCurrentDashboardContext
                    ? 'success'
                    : 'warning'
                }
                label={
                  quickHasCustomSources
                    ? 'Custom'
                    : hasCurrentDashboardContext
                      ? 'Dashboard'
                      : 'Required'
                }
                sx={{ fontWeight: 800, flex: '0 0 auto' }}
              />
            </Stack>
            <Button
              size="small"
              variant={quickOptionsOpen ? 'contained' : 'outlined'}
              onClick={() => setQuickOptionsOpen((current) => !current)}
              sx={{
                alignSelf: 'flex-start',
                textTransform: 'none',
                borderRadius: 999,
              }}
            >
              {quickOptionsOpen ? 'Hide Options' : 'Options'}
            </Button>
          </Stack>
        </Paper>

        <Collapse in={quickOptionsOpen} unmountOnExit>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              border: 1,
              borderColor: quickHasCustomSources
                ? 'primary.main'
                : hasCurrentDashboardContext
                  ? 'divider'
                  : 'warning.main',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={1.35}>
              {!hasCurrentDashboardContext && !quickHasCustomSources ? (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Current dashboard is empty. Add pasted text or attachments
                  before running Quick Create.
                </Alert>
              ) : null}
              <Box>
                <Typography variant="subtitle2" fontWeight={900}>
                  Source override
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Attach files or paste text only when you want to override the
                  current dashboard.
                </Typography>
              </Box>
              <Box
                component="label"
                onDrop={handleQuickSourceDrop}
                onDragOver={(event) => event.preventDefault()}
                sx={{
                  minHeight: 128,
                  p: 1.75,
                  border: '1.5px dashed',
                  borderColor: quickSourceFiles.length
                    ? 'primary.main'
                    : 'divider',
                  borderRadius: 2,
                  bgcolor: quickSourceFiles.length
                    ? alpha(theme.palette.primary.main, 0.04)
                    : 'background.default',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.045),
                  },
                }}
              >
                <Stack spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'background.paper',
                      color: 'primary.main',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <UploadFileIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={900}>
                      Drop files here or upload
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF, PowerPoint, images, Markdown, text, or CSV
                    </Typography>
                  </Box>
                </Stack>
                <input
                  hidden
                  type="file"
                  multiple
                  accept={quickSourceAcceptValue}
                  onChange={(event) => {
                    if (event.target.files) {
                      addQuickSourceFiles(event.target.files)
                    }
                    event.target.value = ''
                  }}
                />
              </Box>
              <TextField
                label="Copied text"
                value={quickSourceText}
                onChange={(event) => setQuickSourceText(event.target.value)}
                placeholder="Paste notes, assignment text, transcript excerpts, or anything you want Quick Create to use."
                multiline
                minRows={4}
                fullWidth
              />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1,
                }}
              >
                <TextField
                  select
                  label="Quantity / length"
                  value={quickDetailLevel}
                  onChange={(event) =>
                    setQuickDetailLevel(
                      event.target.value as StudyMaterialDetailLevel,
                    )
                  }
                  fullWidth
                >
                  <MenuItem value="short">Short</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="long">Long</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Difficulty"
                  value={quickDifficulty}
                  onChange={(event) => setQuickDifficulty(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="exam-like">Exam-like</MenuItem>
                </TextField>
              </Box>
              {(quickHasCustomSources || quickSourceStatus) && (
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={1}
                  >
                    <Typography variant="caption" fontWeight={800}>
                      Selected sources
                    </Typography>
                    <Button size="small" onClick={clearQuickSources}>
                      Clear
                    </Button>
                  </Stack>
                  <Stack direction="row" gap={0.75} flexWrap="wrap">
                    {quickSourceText.trim() ? (
                      <Chip
                        size="small"
                        icon={<ContentPasteIcon />}
                        label="Copied text"
                        onDelete={() => setQuickSourceText('')}
                      />
                    ) : null}
                    {quickSourceFiles.map((file, index) => (
                      <Chip
                        key={`${file.name}-${index}`}
                        size="small"
                        label={file.name}
                        onDelete={() => removeQuickSourceFile(index)}
                      />
                    ))}
                    {quickSourceStatus ? (
                      <Chip size="small" color="primary" label={quickSourceStatus} />
                    ) : null}
                  </Stack>
                </Stack>
              )}
              <Alert severity="info" sx={{ py: 0.5 }}>
                Quick Create uses attached or pasted sources first. Without
                those, it uses current dashboard.
              </Alert>
            </Stack>
          </Paper>
        </Collapse>

        <Stack spacing={1.25}>
          <Typography variant="subtitle1" fontWeight={900}>
            Quick Create
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 1,
            }}
          >
            {(['quiz', 'flashcards', 'improvedNotes'] as const).map(
              (resourceType) => (
                <Button
                  key={resourceType}
                  variant="outlined"
                  onClick={() => runQuickCreate(resourceType)}
                  sx={{
                    minHeight: 74,
                    p: 1.25,
                    borderRadius: 2,
                    borderColor:
                      !quickHasCustomSources && !hasCurrentDashboardContext
                        ? 'warning.main'
                        : 'divider',
                    bgcolor: 'background.paper',
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    alignItems: 'flex-start',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.045),
                    },
                  }}
                >
                  <Stack spacing={0.5}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      }}
                    >
                      {quickCreateIcons[resourceType]}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={900}>
                      {quickCreateLabels[resourceType]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {quickHasCustomSources
                        ? 'From attached sources'
                        : hasCurrentDashboardContext
                          ? 'From current dashboard'
                          : 'Needs source'}
                    </Typography>
                  </Stack>
                </Button>
              ),
            )}
          </Box>
          <Button
            size="small"
            onClick={() => setQuickOptionsOpen((current) => !current)}
            sx={{
              alignSelf: 'flex-start',
              textTransform: 'none',
              borderRadius: 999,
            }}
          >
            {quickOptionsOpen ? 'Hide Options' : 'Options: sources, quantity, difficulty'}
          </Button>
        </Stack>

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
                display:
                  draft.id === activeDraftByFlow['study-path']
                    ? 'flex'
                    : 'none',
                flexDirection: 'column',
              }}
            >
              <CreateStudyPathModal
                open
                presentation="embedded"
                onCollapse={returnToCreateHub}
                onContinueCreating={returnToCreateHub}
                onContinueInBackground={() => setIsStudioOpen(false)}
                onClose={() =>
                  cancelDraftAndReturnToHub(draft.id, 'study-path')
                }
                onCreatePath={(payload) => {
                  const dashboards = createStudyPackDashboards(payload)
                  removeDraft(draft.id, 'study-path')
                  reportCreationStatus(
                    'study-path',
                    'idle',
                    'Study material created.',
                  )
                  return dashboards
                }}
                currentDashboardContext={currentDashboardContext}
                currentDashboardTitle={currentDashboardTitle}
                hasCurrentDashboardContext={hasCurrentDashboardContext}
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
                display:
                  draft.id === activeDraftByFlow['from-notes']
                    ? 'flex'
                    : 'none',
                flexDirection: 'column',
              }}
            >
              <CreateStudyPackModal
                open
                presentation="embedded"
                onCollapse={returnToCreateHub}
                onClose={() =>
                  cancelDraftAndReturnToHub(draft.id, 'from-notes')
                }
                onCreatePack={(payload) => {
                  const dashboard = createStudyPackDashboard(payload)
                  removeDraft(draft.id, 'from-notes')
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
                initialSourceText={undefined}
                initialTitle={undefined}
                currentDashboardContext={currentDashboardContext}
                currentDashboardTitle={currentDashboardTitle}
                hasCurrentDashboardContext={hasCurrentDashboardContext}
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
      if (isMobile) {
        setMobileSection('creation')
        return
      }

      closeStudio()
      return
    }

    setActiveFlow(draft.flow)
    window.dispatchEvent(new Event(CLOSE_DASHBOARD_CHAT_EVENT))
    setActiveDraftByFlow((current) => ({
      ...current,
      [draft.flow]: draft.id,
    }))
    setIsStudioOpen(true)
    if (isMobile) {
      setMobileSection('creation')
    }
  }

  const visibleCreationMarkers = generationDrafts
    .map((draft) => {
      const state = getDraftMarkerState(draft)
      if (!isStudioOpen && state === 'editing') {
        return null
      }

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
    if (isMobile && isStudioOpen && activeFlow === 'hub') {
      setMobileSection('creation')
      return
    }

    if (!isMobile && isStudioOpen && activeFlow === 'hub') {
      closeStudio()
      return
    }

    setSelectedIntent(null)
    setActiveFlow('hub')
    setIsStudioOpen(true)
    window.dispatchEvent(new Event(CLOSE_DASHBOARD_CHAT_EVENT))
    if (isMobile) {
      window.dispatchEvent(new Event(CLOSE_DASHBOARD_CHAT_EVENT))
      setMobileSection('creation')
    }
  }

  const openMobileDashboard = () => {
    setIsStudioOpen(false)
    setMobileSection('dashboard')
    window.dispatchEvent(new Event(CLOSE_DASHBOARD_CHAT_EVENT))
  }

  const openMobileAiChat = () => {
    openingMobileAiChatRef.current = true
    setIsStudioOpen(false)
    setMobileSection('ai-chat')
    window.dispatchEvent(new Event(OPEN_DASHBOARD_CHAT_EVENT))
  }

  const mobileCreationStatusTray = visibleCreationMarkers.length ? (
    <Box
      aria-label="Creation generation status"
      sx={{
        display: 'flex',
        gap: 0.75,
        px: 0.75,
        py: 0.75,
        minHeight: 'var(--studymesh-mobile-generation-tray-height)',
        overflowX: 'auto',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        flexShrink: 0,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {visibleCreationMarkers.map(({ draft, state }) => {
        const isActiveMarker = activeDraftByFlow[draft.flow] === draft.id
        const isSelected =
          isStudioOpen && mobileSection === 'creation' && activeFlow === draft.flow && isActiveMarker

        return (
          <Button
            key={draft.id}
            size="small"
            variant={isSelected ? 'contained' : 'outlined'}
            onClick={() => openCreationMarker(draft)}
            aria-label={`${formatDraftTitle(draft)} - ${statusMarkerLabels[state]}`}
            sx={{
              flex: '0 0 auto',
              maxWidth: 220,
              minWidth: 0,
              px: 1,
              borderRadius: 999,
              textTransform: 'none',
              justifyContent: 'flex-start',
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: statusMarkerColors[state],
                boxShadow: statusMarkerGlow[state],
                flex: '0 0 auto',
                '&::after':
                  state === 'running'
                    ? {
                        content: '""',
                        position: 'absolute',
                        inset: -4,
                        borderRadius: '50%',
                        border: 1.5,
                        borderColor: 'warning.main',
                        borderTopColor: 'transparent',
                        animation:
                          'studymesh-mobile-marker-spin 900ms linear infinite',
                      }
                    : undefined,
                '@keyframes studymesh-mobile-marker-spin': {
                  to: { transform: 'rotate(360deg)' },
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 800,
              }}
            >
              {formatDraftTitle(draft)}
            </Typography>
          </Button>
        )
      })}
    </Box>
  ) : null

  const mobileSectionTabs = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0.75,
        p: 0.75,
        pb: 'calc(0.75rem + env(safe-area-inset-bottom))',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        flexShrink: 0,
        position: 'sticky',
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 -10px 28px rgba(0,0,0,0.35)'
            : '0 -10px 28px rgba(16,24,40,0.12)',
      }}
    >
      {[
        {
          key: 'creation',
          label: 'Creation',
          icon: <AddIcon fontSize="small" />,
          onClick: openCreateHub,
        },
        {
          key: 'dashboard',
          label: 'Dashboards',
          icon: <DashboardIcon fontSize="small" />,
          onClick: openMobileDashboard,
        },
        {
          key: 'ai-chat',
          label: 'AI Chat',
          icon: <ChatBubbleOutlineIcon fontSize="small" />,
          onClick: openMobileAiChat,
        },
      ].map((item) => (
        <Button
          key={item.key}
          size="small"
          variant={mobileSection === item.key ? 'contained' : 'outlined'}
          onClick={item.onClick}
          startIcon={item.icon}
          sx={{
            minWidth: 0,
            px: 0.75,
            borderRadius: 999,
            textTransform: 'none',
            fontSize: '0.72rem',
            '& .MuiButton-startIcon': { mr: 0.5 },
          }}
        >
          {item.label}
        </Button>
      ))}
    </Box>
  )

  const creationStatusMarkers = (
    <Box
      sx={{
        position: isMobile ? 'fixed' : 'absolute',
        left: isMobile ? 0 : isStudioOpen ? studioWidth : studioPanelRailWidth,
        top: 96,
        zIndex: isMobile ? 1100 : 20,
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
      {isStudioOpen && (
        <Tooltip title="Create" placement="right">
          <Box
            component="button"
            type="button"
            aria-label="Create"
            onClick={openCreateHub}
            sx={{
              width: isMobile ? 34 : 34,
              height: isMobile ? 82 : 82,
              border: 0,
              borderRadius: '0 20px 20px 0',
              bgcolor:
                activeFlow === 'hub' && isStudioOpen
                  ? 'primary.main'
                  : 'background.paper',
              color:
                activeFlow === 'hub' && isStudioOpen
                  ? 'primary.contrastText'
                  : 'primary.main',
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
      )}
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
              width: draft.flow === 'study-path' ? 38 : isMobile ? 30 : 30,
              height: draft.flow === 'study-path' ? 92 : isMobile ? 76 : 76,
              border: 0,
              borderRadius: '0 18px 18px 0',
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
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          '--studymesh-mobile-generation-tray-height': visibleCreationMarkers.length
            ? '48px'
            : '0px',
          ...(isStudioOpen && mobileSection === 'creation'
            ? {
                '& [data-testid="study-path-navigator-overlay"]': {
                  display: 'none',
                },
              }
            : {}),
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              ...workspaceCanvasSx,
            }}
          >
            {children}
          </Box>
          <Slide
            direction="right"
            in={mobileSection === 'creation'}
            mountOnEnter
            timeout={{ enter: 260, exit: 220 }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                p: '8px',
                boxSizing: 'border-box',
                zIndex: 2,
                bgcolor: 'background.default',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0 18px 40px rgba(0,0,0,0.42)'
                      : '0 18px 42px rgba(16,24,40,0.10)',
                }}
              >
                {studioContent}
              </Box>
            </Box>
          </Slide>
        </Box>
        {mobileCreationStatusTray}
        {mobileSectionTabs}
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
        sx={{
          width: isStudioOpen ? studioWidth : studioPanelRailWidth,
          flex: '0 0 auto',
          minHeight: 0,
          overflow: 'hidden',
          p: '8px 0 8px 8px',
          boxSizing: 'border-box',
          position: 'relative',
          transition: theme.transitions.create(['width'], {
            duration: theme.transitions.duration.shorter,
            easing: theme.transitions.easing.easeInOut,
          }),
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
            display: isStudioOpen ? 'block' : 'none',
          }}
        >
          {studioContent}
        </Box>
        {!isStudioOpen && (
          <Tooltip title="Open Create" placement="right">
            <Box
              component="button"
              type="button"
              aria-label="Open Create panel"
              onClick={openCreateHub}
              sx={{
                width: '100%',
                height: '100%',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                color: 'primary.main',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 12px 32px rgba(0,0,0,0.32)'
                    : '0 12px 30px rgba(16,24,40,0.12)',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <AddIcon fontSize="small" />
              <Typography
                variant="caption"
                sx={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  fontWeight: 800,
                  letterSpacing: 0.4,
                }}
              >
                Create
              </Typography>
            </Box>
          </Tooltip>
        )}
        {isStudioOpen && (
          <Box
            role="separator"
            aria-label="Resize Create panel"
            onMouseDown={startStudioResize}
            sx={{
              position: 'absolute',
              top: 14,
              right: -3,
              width: 8,
              height: 'calc(100% - 28px)',
              cursor: 'col-resize',
              zIndex: 2,
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 3,
                width: 2,
                borderRadius: 999,
                bgcolor: 'divider',
              },
              '&:hover::after': { bgcolor: 'primary.main' },
            }}
          />
        )}
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

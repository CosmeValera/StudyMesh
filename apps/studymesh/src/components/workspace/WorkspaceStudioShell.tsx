import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import DescriptionIcon from '@mui/icons-material/Description'
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
  STUDY_PACK_AI_SETTINGS_CHANGED_EVENT,
  StudyMaterialDetailLevel,
  StudyMaterialResourceType,
} from '../../studyPack/ai'
import {
  extractTextFromPdf,
  extractTextFromPptx,
} from '../../studyPack/documentExtraction'
import { extractRawNotesFromImage } from '../../studyPack/imageOcr'
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
import {
  appendQuickSourceText,
  createGenerationDraft,
  CreateIntent,
  CreationFlow,
  GenerationDraft,
  GenerationMarkerState,
  OpenCreateHubDetail,
  QuickSourceFocus,
  readIsAdmin,
  quickCreateAccents,
  quickCreateLabels,
  quickSourceAcceptValue,
  statusMarkerColors,
  statusMarkerGlow,
  studioPanelMaxWidth,
  studioPanelMinWidth,
  studioPanelRailWidth,
  studioPanelWidth,
  StudioFlow,
} from './workspaceStudioModel'
import {
  WorkspaceDesktopLayout,
  WorkspaceMobileLayout,
} from './WorkspaceStudioLayouts'
import WidgetEditorDialog from './WidgetEditorDialog'
import { useResponsiveWorkspaceMode } from './useResponsiveWorkspaceMode'

const quickCreateIcons: Record<StudyMaterialResourceType, React.ReactNode> = {
  quiz: <QuizIcon fontSize="small" />,
  flashcards: <StyleIcon fontSize="small" />,
  improvedNotes: <AutoStoriesIcon fontSize="small" />,
}

type QuickSourceMode = 'dashboard' | 'sources'

const statusMarkerLabels: Record<
  WorkspaceCreationTaskState | 'editing',
  string
> = {
  editing: 'Creation draft open',
  idle: '',
  running: 'Generating study material…',
  complete: 'Study material saved to dashboards',
  error: 'Generation failed. Click to review.',
}

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
  const { theme, isPhoneOrTablet: isMobile } = useResponsiveWorkspaceMode()
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
  const [initialStudyPackSourceText, setInitialStudyPackSourceText] = useState<
    string | undefined
  >(undefined)
  const [initialStudyPackTitle, setInitialStudyPackTitle] = useState<
    string | undefined
  >(undefined)
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
  const [quickCopiedTextDraft, setQuickCopiedTextDraft] = useState('')
  const [quickCopiedTextOpen, setQuickCopiedTextOpen] = useState(false)
  const [quickSourceFiles, setQuickSourceFiles] = useState<File[]>([])
  const [quickSourceMode, setQuickSourceMode] =
    useState<QuickSourceMode>('dashboard')
  const [quickSourceStatus, setQuickSourceStatus] = useState('')
  const [pendingQuickSourceFocus, setPendingQuickSourceFocus] =
    useState<QuickSourceFocus | null>(null)
  const [fullScreenWidgetPayload, setFullScreenWidgetPayload] = useState<{
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null>(null)
  const quickOptionsPanelRef = useRef<HTMLDivElement | null>(null)
  const quickUploadButtonRef = useRef<HTMLLabelElement | null>(null)
  const quickPasteButtonRef = useRef<HTMLButtonElement | null>(null)
  const quickCopiedTextInputRef = useRef<HTMLTextAreaElement | null>(null)
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
      const customEvent = event as CustomEvent<OpenCreateHubDetail>
      const detail = customEvent.detail || {}
      setSelectedIntent(detail.intent || null)
      if (detail.openQuickOptions) {
        setQuickOptionsOpen(true)
        setQuickSourceMode('sources')
      }
      if (detail.quickSourceFocus) {
        setQuickSourceMode('sources')
        setPendingQuickSourceFocus(detail.quickSourceFocus)
        if (detail.quickSourceFocus === 'paste') {
          setQuickCopiedTextOpen(true)
        }
      }
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
    if (isMobile) {
      window.dispatchEvent(new Event(CLOSE_DASHBOARD_CHAT_EVENT))
    }
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
  const quickUsesSources = quickSourceMode === 'sources'
  const quickCanCreateFromActiveSource = quickUsesSources
    ? quickHasCustomSources
    : hasCurrentDashboardContext
  const quickCustomSourceCount =
    (quickSourceText.trim() ? 1 : 0) + quickSourceFiles.length
  const quickSourceLabel = quickHasCustomSources
    ? `${quickCustomSourceCount} custom source${
        quickCustomSourceCount === 1 ? '' : 's'
      }`
    : hasCurrentDashboardContext
      ? currentDashboardTitle
      : 'Sources required'
  const selectedQuickCreateIntent =
    selectedIntent && selectedIntent !== 'study-path' ? selectedIntent : null
  useEffect(() => {
    if (
      !pendingQuickSourceFocus ||
      !quickOptionsOpen ||
      quickSourceMode !== 'sources' ||
      activeFlow !== 'hub'
    ) {
      return
    }

    const focusTimer = window.setTimeout(() => {
      quickOptionsPanelRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })

      if (pendingQuickSourceFocus === 'paste') {
        const target =
          quickCopiedTextInputRef.current || quickPasteButtonRef.current
        target?.focus()
      } else {
        quickUploadButtonRef.current?.focus()
      }

      setPendingQuickSourceFocus(null)
    }, 180)

    return () => window.clearTimeout(focusTimer)
  }, [
    activeFlow,
    pendingQuickSourceFocus,
    quickOptionsOpen,
    quickSourceMode,
    quickCopiedTextOpen,
  ])

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
    setQuickCopiedTextDraft('')
    setQuickCopiedTextOpen(false)
    setQuickSourceFiles([])
    setQuickSourceStatus('')
  }

  const addQuickCopiedText = () => {
    const text = quickCopiedTextDraft.trim()
    if (!text) {
      setQuickSourceStatus('Paste copied text before adding it.')
      return
    }

    setQuickSourceText((current) => appendQuickSourceText(current, text))
    setQuickCopiedTextDraft('')
    setQuickCopiedTextOpen(false)
    setQuickSourceStatus('')
  }

  const handleQuickSourceDrop = (event: React.DragEvent<HTMLDivElement>) => {
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

  const buildQuickSourceText = async (sourceMode: QuickSourceMode) => {
    if (sourceMode === 'dashboard') {
      setQuickSourceStatus('')
      return hasCurrentDashboardContext ? currentDashboardContext : ''
    }

    const sourceParts: string[] = []

    if (quickSourceText.trim()) {
      sourceParts.push(`# Pasted text\n\n${quickSourceText.trim()}`)
    }

    if (quickSourceFiles.length > 0) {
      setQuickSourceStatus(
        `Reading ${quickSourceFiles.length} source file${
          quickSourceFiles.length === 1 ? '' : 's'
        }`,
      )
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
    return ''
  }

  const openStudyPackCreator = (
    resourceType: StudyMaterialResourceType,
    sourceText?: string,
    title?: string,
  ) => {
    setSelectedIntent(resourceType)
    setInitialStudyPackSourceText(sourceText)
    setInitialStudyPackTitle(title)
    createNewDraft('from-notes')
  }

  const runQuickCreate = async (
    resourceType: StudyMaterialResourceType,
    sourceMode: QuickSourceMode = quickSourceMode,
  ) => {
    const titleBase = quickCreateLabels[resourceType]
    const usesSources = sourceMode === 'sources'
    const hasUsableSource = usesSources
      ? quickHasCustomSources
      : hasCurrentDashboardContext

    if (!hasUsableSource) {
      openCreateFromMaterial(resourceType, 'upload')
      setQuickSourceStatus(`Add material to create ${titleBase}.`)
      return
    }

    try {
      const sourceText = await buildQuickSourceText(sourceMode)

      if (!sourceText.trim()) {
        openCreateFromMaterial(resourceType, 'upload')
        setQuickSourceStatus(`Add material to create ${titleBase}.`)
        return
      }

      openStudyPackCreator(
        resourceType,
        sourceText,
        `${currentDashboardTitle} ${titleBase}`.trim(),
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Could not read source material for ${titleBase}.`
      setQuickSourceStatus(message)
      openCreateFromMaterial(resourceType, 'upload')
    }
  }

  const openCreateFromMaterial = (
    resourceType?: StudyMaterialResourceType,
    focus?: QuickSourceFocus,
  ) => {
    const shouldUseSources = Boolean(focus) || !hasCurrentDashboardContext

    setSelectedIntent(resourceType || selectedQuickCreateIntent || 'quiz')
    setQuickOptionsOpen(true)
    setQuickSourceMode(shouldUseSources ? 'sources' : 'dashboard')
    setQuickSourceStatus(
      shouldUseSources && resourceType
        ? `Add material to create ${quickCreateLabels[resourceType]}.`
        : '',
    )
    if (focus) {
      setPendingQuickSourceFocus(focus)
      if (focus === 'paste') {
        setQuickCopiedTextOpen(true)
      }
    }
  }

  const handleQuickCreateCardClick = (
    resourceType: StudyMaterialResourceType,
  ) => {
    if (!hasCurrentDashboardContext) {
      openCreateFromMaterial(resourceType, 'upload')
      return
    }

    runQuickCreate(resourceType, 'dashboard')
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
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        p: { xs: 2, sm: 2.5 },
        pb: { xs: 10, sm: 2.5 },
      }}
    >
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" fontWeight={900}>
              Creation
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.35, maxWidth: 340 }}
            >
              Create a guided study path or quick material from your dashboard.
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

        {!quickOptionsOpen ? (
          <>
            <Paper
              component="button"
              type="button"
              onClick={() => startCreateIntent(studyPathOption.intent)}
              elevation={0}
              sx={{
                width: '100%',
                p: { xs: 2, sm: 2.25 },
                textAlign: 'left',
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.42),
                bgcolor: alpha(theme.palette.primary.main, 0.075),
                color: 'text.primary',
                cursor: 'pointer',
                display: 'block',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 14px 36px ${alpha(theme.palette.primary.main, 0.1)}`,
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.105),
                  transform: 'translateY(-1px)',
                },
                '&:focus-visible': {
                  outline: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  outlineOffset: 2,
                },
                transition:
                  'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
              }}
            >
              <Stack spacing={1.75}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
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
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="primary"
                      fontWeight={900}
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
                    >
                      Recommended
                    </Typography>
                    <Typography variant="h5" fontWeight={950} lineHeight={1.15}>
                      Study Path
                    </Typography>
                  </Box>
                </Stack>
                <Box>
                  <Typography variant="subtitle1" fontWeight={900}>
                    Learn any topic step by step.
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.4 }}
                  >
                    Creates lessons, dashboards, exercises and flashcards.
                  </Typography>
                </Box>
                <Button
                  component="span"
                  variant="contained"
                  endIcon={<ChevronRightIcon />}
                  sx={{
                    alignSelf: 'flex-start',
                    borderRadius: 999,
                    px: 1.75,
                    textTransform: 'none',
                    fontWeight: 900,
                  }}
                >
                  Create Study Path
                </Button>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.35, sm: 1.5 },
                borderRadius: 2.5,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={900}>
                    Quick Create
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.3 }}
                  >
                    {hasCurrentDashboardContext
                      ? 'Generate focused material from your current dashboard.'
                      : 'Add material first, then generate focused study material.'}
                  </Typography>
                </Box>
                {!hasCurrentDashboardContext ? (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    The current dashboard is empty. Pick a card and StudyMesh
                    will open Create from Material with that output selected.
                  </Alert>
                ) : null}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(3, minmax(0, 1fr))',
                    },
                    gap: 1,
                  }}
                >
                  {(['quiz', 'flashcards', 'improvedNotes'] as const).map(
                    (resourceType) => {
                      const accent = quickCreateAccents[resourceType]
                      const selected = false

                      return (
                        <Paper
                          key={resourceType}
                          component="button"
                          type="button"
                          elevation={0}
                          onClick={() =>
                            handleQuickCreateCardClick(resourceType)
                          }
                          sx={{
                            minHeight: { xs: 82, sm: 110 },
                            p: { xs: 1.15, sm: 1.35 },
                            borderRadius: 2,
                            border: selected ? 2 : 1,
                            borderColor: selected
                              ? accent
                              : !hasCurrentDashboardContext
                                ? alpha(theme.palette.warning.main, 0.55)
                                : alpha(
                                    accent,
                                    theme.palette.mode === 'dark' ? 0.3 : 0.22,
                                  ),
                            bgcolor: alpha(
                              accent,
                              selected
                                ? theme.palette.mode === 'dark'
                                  ? 0.2
                                  : 0.12
                                : theme.palette.mode === 'dark'
                                  ? 0.12
                                  : 0.07,
                            ),
                            color: 'text.primary',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1.25,
                            boxShadow: `0 10px 26px ${alpha(
                              accent,
                              theme.palette.mode === 'dark' ? 0.08 : 0.05,
                            )}`,
                            '&:hover': {
                              borderColor: alpha(accent, 0.72),
                              bgcolor: alpha(
                                accent,
                                theme.palette.mode === 'dark' ? 0.18 : 0.1,
                              ),
                              transform: 'translateY(-1px)',
                            },
                            '&:focus-visible': {
                              outline: `3px solid ${alpha(accent, 0.26)}`,
                              outlineOffset: 2,
                            },
                            transition:
                              'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
                          }}
                        >
                          <Stack spacing={1} sx={{ minWidth: 0 }}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: 1.5,
                                display: 'grid',
                                placeItems: 'center',
                                bgcolor: alpha(
                                  accent,
                                  theme.palette.mode === 'dark' ? 0.2 : 0.14,
                                ),
                                color: accent,
                                flex: '0 0 auto',
                              }}
                            >
                              {quickCreateIcons[resourceType]}
                            </Box>
                            {selected ? (
                              <Typography
                                variant="caption"
                                fontWeight={900}
                                sx={{ color: accent, lineHeight: 1 }}
                              >
                                Selected
                              </Typography>
                            ) : null}
                            <Typography
                              variant="subtitle2"
                              fontWeight={900}
                              sx={{ lineHeight: 1.15 }}
                            >
                              {quickCreateLabels[resourceType]}
                            </Typography>
                          </Stack>
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              display: 'grid',
                              placeItems: 'center',
                              alignSelf: 'center',
                              color: alpha(
                                accent,
                                theme.palette.mode === 'dark' ? 0.95 : 0.9,
                              ),
                              border: 1,
                              borderColor: alpha(accent, 0.24),
                              bgcolor: alpha(
                                accent,
                                theme.palette.mode === 'dark' ? 0.12 : 0.08,
                              ),
                              flex: '0 0 auto',
                            }}
                          >
                            <ChevronRightIcon fontSize="small" />
                          </Box>
                        </Paper>
                      )
                    },
                  )}
                </Box>
                <Button
                  size="small"
                  onClick={() => openCreateFromMaterial()}
                  aria-expanded={quickOptionsOpen}
                  sx={{
                    alignSelf: 'flex-start',
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 0.5,
                    fontWeight: 800,
                  }}
                >
                  Create from material
                </Button>
              </Stack>
            </Paper>
          </>
        ) : (
          <Stack spacing={1.5}>
            <Button
              size="small"
              onClick={() => {
                setQuickOptionsOpen(false)
                setQuickSourceMode('dashboard')
                setQuickSourceStatus('')
              }}
              sx={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                fontWeight: 900,
              }}
            >
              ← Back to Creation
            </Button>
            <Box>
              <Typography variant="h5" fontWeight={900}>
                Create from Material
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.35 }}
              >
                Pick the output, source, and options in one focused flow.
              </Typography>
            </Box>
          </Stack>
        )}

        <Collapse in={quickOptionsOpen} unmountOnExit>
          <Paper
            ref={quickOptionsPanelRef}
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 1.75 },
              border: 1,
              borderColor: quickHasCustomSources
                ? alpha(theme.palette.primary.main, 0.45)
                : hasCurrentDashboardContext
                  ? 'divider'
                  : alpha(theme.palette.warning.main, 0.65),
              borderRadius: 2.5,
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="subtitle2" fontWeight={900}>
                  Step 1: Choose output
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.3 }}
                >
                  These cards configure this material-based flow. Quick Create
                  remains one-click on the Creation screen.
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 1,
                }}
              >
                {(['quiz', 'flashcards', 'improvedNotes'] as const).map(
                  (resourceType) => {
                    const accent = quickCreateAccents[resourceType]
                    const selected = selectedIntent === resourceType

                    return (
                      <Paper
                        key={resourceType}
                        component="button"
                        type="button"
                        elevation={0}
                        onClick={() => {
                          setSelectedIntent(resourceType)
                          setQuickSourceStatus('')
                        }}
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          border: selected ? 2 : 1,
                          borderColor: selected ? accent : alpha(accent, 0.28),
                          bgcolor: alpha(accent, selected ? 0.16 : 0.08),
                          color: 'text.primary',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <Stack spacing={0.75}>
                          <Box sx={{ color: accent }}>
                            {quickCreateIcons[resourceType]}
                          </Box>
                          <Typography variant="subtitle2" fontWeight={900}>
                            {quickCreateLabels[resourceType]}
                          </Typography>
                          {selected ? (
                            <Typography
                              variant="caption"
                              fontWeight={900}
                              sx={{ color: accent }}
                            >
                              Selected
                            </Typography>
                          ) : null}
                        </Stack>
                      </Paper>
                    )
                  },
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={900}>
                  Step 2: Choose source
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.3 }}
                >
                  Create from the current dashboard by default, or switch to
                  sources for files, pasted notes, images, PDFs, and slides.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant={
                    quickSourceMode === 'dashboard' ? 'contained' : 'outlined'
                  }
                  disabled={!hasCurrentDashboardContext}
                  onClick={() => {
                    setQuickSourceMode('dashboard')
                    setQuickSourceStatus('')
                  }}
                  sx={{
                    textTransform: 'none',
                    flex: 1,
                    borderRadius: 1.5,
                    fontWeight: 900,
                  }}
                >
                  Current dashboard
                </Button>
                <Button
                  variant={
                    quickSourceMode === 'sources' ? 'contained' : 'outlined'
                  }
                  onClick={() => {
                    setQuickSourceMode('sources')
                    setQuickSourceStatus('')
                  }}
                  sx={{
                    textTransform: 'none',
                    flex: 1,
                    borderRadius: 1.5,
                    fontWeight: 900,
                  }}
                >
                  Sources
                </Button>
              </Stack>
              {!hasCurrentDashboardContext &&
              quickSourceMode === 'dashboard' ? (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Current dashboard is empty. Choose Sources to add material.
                </Alert>
              ) : null}
              {quickUsesSources ? (
                <Box
                  onDrop={handleQuickSourceDrop}
                  onDragOver={(event) => event.preventDefault()}
                  sx={{
                    minHeight: 210,
                    p: 2,
                    border: '1.5px dashed',
                    borderColor: quickSourceFiles.length
                      ? 'primary.main'
                      : 'divider',
                    borderRadius: 2.25,
                    bgcolor: quickSourceFiles.length
                      ? alpha(theme.palette.primary.main, 0.025)
                      : 'background.paper',
                    cursor: 'default',
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.025),
                    },
                  }}
                >
                  <Stack
                    spacing={1.2}
                    alignItems="center"
                    sx={{ width: '100%' }}
                  >
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.25,
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
                      <Typography variant="subtitle1" fontWeight={900}>
                        Add sources
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ maxWidth: 300 }}
                      >
                        Drop notes here, or upload text, images, PDFs, and
                        slides.
                      </Typography>
                    </Box>
                    <Button
                      ref={quickUploadButtonRef}
                      component="label"
                      variant="contained"
                      startIcon={<UploadFileIcon />}
                      fullWidth
                      sx={{
                        mt: 0.5,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 900,
                      }}
                    >
                      Upload files
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
                    </Button>
                    <Button
                      ref={quickPasteButtonRef}
                      variant="outlined"
                      startIcon={<ContentPasteIcon />}
                      fullWidth
                      onClick={() => {
                        setQuickCopiedTextOpen(true)
                        setQuickSourceStatus('')
                      }}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 900,
                        bgcolor: 'background.paper',
                      }}
                    >
                      Copied text
                    </Button>
                    <Stack
                      direction="row"
                      gap={0.75}
                      flexWrap="wrap"
                      justifyContent="center"
                    >
                      {['Text', 'Images', 'PDF', 'PPTX'].map((label) => (
                        <Chip
                          key={label}
                          label={label}
                          size="small"
                          sx={{
                            bgcolor: alpha(
                              theme.palette.warning.main,
                              theme.palette.mode === 'dark' ? 0.14 : 0.12,
                            ),
                            fontWeight: 700,
                          }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              ) : null}
              <Collapse
                in={quickUsesSources && quickCopiedTextOpen}
                unmountOnExit
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={1.25}>
                    <TextField
                      label="Copied text"
                      inputRef={quickCopiedTextInputRef}
                      value={quickCopiedTextDraft}
                      onChange={(event) =>
                        setQuickCopiedTextDraft(event.target.value)
                      }
                      placeholder="Paste notes, assignment text, transcript excerpts, or anything Create from Material should use."
                      multiline
                      minRows={5}
                      fullWidth
                    />
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                    >
                      <Button
                        onClick={() => {
                          setQuickCopiedTextDraft('')
                          setQuickCopiedTextOpen(false)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="contained" onClick={addQuickCopiedText}>
                        Add copied text
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Collapse>
              <Box>
                <Typography variant="subtitle2" fontWeight={900}>
                  Step 3: Options
                </Typography>
              </Box>
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
              {selectedQuickCreateIntent ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.25,
                    border: 1,
                    borderColor: quickCanCreateFromActiveSource
                      ? alpha(theme.palette.primary.main, 0.35)
                      : alpha(theme.palette.warning.main, 0.55),
                    borderRadius: 2,
                    bgcolor: quickCanCreateFromActiveSource
                      ? alpha(theme.palette.primary.main, 0.045)
                      : alpha(theme.palette.warning.main, 0.08),
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={900}>
                        {quickCreateLabels[selectedQuickCreateIntent]} selected
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {quickCanCreateFromActiveSource
                          ? quickUsesSources
                            ? 'Ready to create from your selected material.'
                            : 'Ready to create from your current dashboard.'
                          : `Add material to create ${quickCreateLabels[selectedQuickCreateIntent]}.`}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      disabled={!quickCanCreateFromActiveSource}
                      onClick={() =>
                        runQuickCreate(
                          selectedQuickCreateIntent,
                          quickSourceMode,
                        )
                      }
                      sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 900,
                        flex: '0 0 auto',
                      }}
                    >
                      Create {quickCreateLabels[selectedQuickCreateIntent]}
                    </Button>
                  </Stack>
                </Paper>
              ) : null}
              {((quickUsesSources && quickHasCustomSources) ||
                quickSourceStatus) && (
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
                        icon={<DescriptionIcon />}
                        label={file.name}
                        onDelete={() => removeQuickSourceFile(index)}
                      />
                    ))}
                    {quickSourceStatus ? (
                      <Chip
                        size="small"
                        color="primary"
                        label={quickSourceStatus}
                      />
                    ) : null}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Collapse>
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
                onClose={() => {
                  setInitialStudyPackSourceText(undefined)
                  setInitialStudyPackTitle(undefined)
                  cancelDraftAndReturnToHub(draft.id, 'from-notes')
                }}
                onCreatePack={(payload) => {
                  const dashboard = createStudyPackDashboard(payload)
                  setInitialStudyPackSourceText(undefined)
                  setInitialStudyPackTitle(undefined)
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
                initialSourceText={initialStudyPackSourceText}
                initialTitle={initialStudyPackTitle}
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
    if (isMobile) {
      window.dispatchEvent(new Event(CLOSE_DASHBOARD_CHAT_EVENT))
    }
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
    .filter((draft) => !draft.quickCreate)
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
          isStudioOpen &&
          mobileSection === 'creation' &&
          activeFlow === draft.flow &&
          isActiveMarker

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
    <WidgetEditorDialog
      open={Boolean(fullScreenWidgetPayload)}
      payload={fullScreenWidgetPayload}
      onClose={closeFullScreenWidgetEditor}
      onSaveComplete={closeFullScreenWidgetEditor}
    />
  )

  if (isMobile) {
    return (
      <WorkspaceMobileLayout
        studioContent={studioContent}
        mobileCreationStatusTray={mobileCreationStatusTray}
        mobileSectionTabs={mobileSectionTabs}
        widgetBuilderDialog={widgetBuilderDialog}
        isStudioOpen={isStudioOpen}
        mobileSection={mobileSection}
        visibleCreationMarkerCount={visibleCreationMarkers.length}
        theme={theme}
      >
        {children}
      </WorkspaceMobileLayout>
    )
  }

  return (
    <WorkspaceDesktopLayout
      studioContent={studioContent}
      creationStatusMarkers={creationStatusMarkers}
      widgetBuilderDialog={widgetBuilderDialog}
      isStudioOpen={isStudioOpen}
      studioWidth={studioWidth}
      openCreateHub={openCreateHub}
      startStudioResize={startStudioResize}
      theme={theme}
    >
      {children}
    </WorkspaceDesktopLayout>
  )
}

export default WorkspaceStudioShell

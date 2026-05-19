import React, { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import RouteIcon from '@mui/icons-material/Route'
import {
  createStudyPackOrchestratorWidgets,
  StudyObject,
  StudyPackDashboardLayoutMode,
} from '../../studyPack'
import {
  AiGenerationDebugTrace,
  AiStudyPathDashboardDraft,
  AiStudyPathDraft,
  assertRoleObjectsAreClean,
  filterStudyObjectsForDashboardRole,
  generateStudyPathWithAi,
  isLocalAiGenerationError,
  LocalAiGenerationFailureDebug,
  LocalAiProgressEvent,
  readStudyPackAiSettings,
  resolveStudyPackAiCredentials,
  StudyPackAiProvider,
  StudyPathGenerationAmount,
} from '../../studyPack/ai'

type GenerationAmount = StudyPathGenerationAmount
type LocalAiDashboardConcurrency = 1 | 2 | 3 | 5

interface CreateStudyPathModalProps {
  open: boolean
  onClose: () => void
  onCreatePath: (payload: {
    folderName: string
    openInWorkspace?: boolean
    dashboards: Array<{
      name: string
      widgets: ReturnType<typeof createStudyPackOrchestratorWidgets>
      layoutMode?: StudyPackDashboardLayoutMode
      folderName: string
    }>
  }) => void
}

const generationAmountOptions: Array<{
  label: string
  value: GenerationAmount
  helper: string
}> = [
  {
    label: 'Super small',
    value: 'superSmall',
    helper: '1 lesson dashboard + exercises',
  },
  {
    label: 'Compact',
    value: 'compact',
    helper: '2 content dashboards + exercises',
  },
  {
    label: 'Average',
    value: 'average',
    helper: '3 content dashboards + summary + exercises',
  },
  {
    label: 'Deep',
    value: 'deep',
    helper: '5 content dashboards + summary + exercises',
  },
]

const providerLabels: Record<StudyPackAiProvider, string> = {
  basic: 'Basic fallback',
  local: 'Google Local AI',
  gemini: 'Own Gemini API token',
  hosted: 'Hosted AI tokens',
}

const LOCAL_AI_ESTIMATE_COPY =
  'Local AI runs on your device and can be slow. Super small usually takes 2-3 min, Compact 3-5 min, Average 5-8 min. For faster/deeper paths, use Own Gemini token.'
const LOCAL_DEEP_BLOCKED_MESSAGE =
  'Deep Study Path is not available with Local AI. Use Average, Compact, Super small, or switch to Own Gemini token.'
const DEFAULT_STUDY_PATH_PROMPT = 'I want to learn Italian level A2'

const getProviderPathProgressLabel = (provider: StudyPackAiProvider): string =>
  provider === 'local'
    ? 'Generating dashboards with Google Local AI...'
    : provider === 'gemini'
    ? 'Generating ordered dashboards with Gemini...'
    : provider === 'basic'
    ? 'Generating ordered dashboards with Basic fallback...'
    : 'Checking hosted AI configuration...'

const getProviderPathDescription = (provider: StudyPackAiProvider): string =>
  provider === 'local'
    ? 'Local AI is running on your device. AquaMesh plans the path first, then generates each lesson dashboard with its own estimated timer.'
    : provider === 'gemini'
    ? 'AquaMesh is sending the request to Gemini with your API token and converting the response into dashboards.'
    : provider === 'basic'
    ? 'AquaMesh is using local parsing and practice generation without AI API calls.'
    : 'Hosted AI is not configured yet.'

const formatPipelineRemaining = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes <= 0) {
    return `~${seconds}s remaining`
  }

  return `~${minutes}m ${String(seconds).padStart(2, '0')}s remaining`
}

const getGenerationAmountHelper = (
  option: (typeof generationAmountOptions)[number],
  provider: StudyPackAiProvider,
): string => {
  if (provider !== 'local') {
    return option.helper
  }

  if (option.value === 'superSmall') {
    return '2 lesson dashboards'
  }

  if (option.value === 'compact') {
    return '3 lesson dashboards'
  }

  if (option.value === 'average') {
    return '5 lesson dashboards'
  }

  return 'unavailable with Local AI'
}

const getObjectPreview = (object?: StudyObject) => {
  if (!object) {
    return 'Generated study widgets for this lesson.'
  }

  switch (object.kind) {
    case 'markdown':
      return object.markdown
    case 'note':
      return object.body
    case 'term':
      return `${object.term}: ${object.definition}`
    case 'qa':
      return object.question
    case 'quiz':
      return object.question
    case 'list':
      return object.items.slice(0, 2).join(' · ')
    case 'sequence':
      return object.steps.slice(0, 2).join(' → ')
    case 'reviewPrompt':
      return object.prompt
    case 'code':
      return object.caption || object.code
    case 'table':
      return object.headers.join(' · ')
    case 'comparison':
      return object.columns.join(' vs ')
    case 'resource':
      return object.label
    case 'reveal':
      return object.prompt
    default:
      return 'Generated study widgets for this lesson.'
  }
}

const getDashboardPreviewSummary = (
  dashboard: AiStudyPathDashboardDraft,
  provider: StudyPackAiProvider,
): string =>
  provider === 'local' && !dashboard.summary
    ? truncate(getObjectPreview(dashboard.objects[0]))
    : dashboard.summary || truncate(getObjectPreview(dashboard.objects[0]))

const truncate = (value: string, max = 150) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > max
    ? `${normalized.slice(0, Math.max(0, max - 1))}…`
    : normalized
}

const makePackId = (title: string, index: number) =>
  `${title}-${index + 1}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
  `study-path-${index + 1}`

const formatDebugValue = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2)

const localAiFailureDebugSections = (
  debug: LocalAiGenerationFailureDebug,
): Array<[string, unknown]> => [
  [
    'Dashboard',
    debug.dashboardIndex && debug.dashboardCount
      ? `${debug.dashboardIndex} of ${debug.dashboardCount}`
      : '',
  ],
  ['Prompt length', debug.promptLength],
  [
    'Attempt',
    debug.attempt && debug.attemptCount
      ? `${debug.attempt} of ${debug.attemptCount}`
      : '',
  ],
  ['Raw dashboard response', debug.rawResponse],
  ['Parsed JSON', debug.parsedJson],
  ['Parse error', debug.parseError],
  ['Mapping error', debug.mappingError],
  ['Dropped or repaired items', debug.droppedOrRepairedItems],
  ['Failed attempts', debug.attempts],
]

const combinedDebugTrace = (
  draft: AiStudyPathDraft | null,
): AiGenerationDebugTrace | null => {
  if (!draft) {
    return null
  }

  const traces = draft.dashboards
    .map((dashboard) => dashboard.debugTrace)
    .filter((trace): trace is AiGenerationDebugTrace => Boolean(trace))
  if (traces.length === 0) {
    return null
  }

  const validatedContracts = draft.dashboards.map((dashboard, index) => ({
    dashboard: index + 1,
    title: dashboard.title,
    dashboardRole: dashboard.dashboardRole,
    validatedContract: dashboard.debugTrace?.validatedContract || null,
  }))
  const roleFilteredContracts = draft.dashboards.map((dashboard, index) => ({
    dashboard: index + 1,
    title: dashboard.title,
    dashboardRole: dashboard.dashboardRole,
    roleFilteredContract: dashboard.debugTrace?.roleFilteredContract || null,
  }))

  return {
    rawAiResponse: traces
      .map((trace) => trace.rawAiResponse)
      .join('\n\n---\n\n'),
    rawDashboardInput: draft.dashboards.map((dashboard, index) => ({
      dashboard: index + 1,
      title: dashboard.title,
      dashboardRole: dashboard.dashboardRole,
      rawDashboardInput: dashboard.debugTrace?.rawDashboardInput || null,
    })),
    roleSanitizedInput: draft.dashboards.map((dashboard, index) => ({
      dashboard: index + 1,
      title: dashboard.title,
      dashboardRole: dashboard.dashboardRole,
      roleSanitizedInput: dashboard.debugTrace?.roleSanitizedInput || null,
    })),
    validatedContract: validatedContracts,
    roleFilteredContract: roleFilteredContracts,
    droppedOrRepairedItems: traces.flatMap(
      (trace) => trace.droppedOrRepairedItems,
    ),
    finalObjects: draft.dashboards.flatMap((dashboard) => dashboard.objects),
    localAiFailedAttempts: traces.flatMap(
      (trace) => trace.localAiFailedAttempts || [],
    ),
  }
}

const makeStudyPathId = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'study-path'

const CreateStudyPathModal: React.FC<CreateStudyPathModalProps> = ({
  open,
  onClose,
  onCreatePath,
}) => {
  const [step, setStep] = useState<'prompt' | 'review'>('prompt')
  const [prompt, setPrompt] = useState(DEFAULT_STUDY_PATH_PROMPT)
  const [aiProvider, setAiProvider] = useState<StudyPackAiProvider>('basic')
  const [generationAmount, setGenerationAmount] =
    useState<GenerationAmount>('average')
  const [localAiDashboardConcurrency, setLocalAiDashboardConcurrency] =
    useState<LocalAiDashboardConcurrency>(2)
  const [draft, setDraft] = useState<AiStudyPathDraft | null>(null)
  const [reviewFolderName, setReviewFolderName] = useState('')
  const [openInWorkspace, setOpenInWorkspace] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [localAiProgress, setLocalAiProgress] =
    useState<LocalAiProgressEvent | null>(null)
  const [localAiFailureDebug, setLocalAiFailureDebug] =
    useState<LocalAiGenerationFailureDebug | null>(null)
  const [error, setError] = useState('')
  const debugTrace = combinedDebugTrace(draft)

  React.useEffect(() => {
    if (!open) {
      return
    }

    const provider = readStudyPackAiSettings().provider || 'basic'
    setAiProvider(provider)
    setGenerationAmount(provider === 'local' ? 'superSmall' : 'average')
    setLocalAiDashboardConcurrency(2)
  }, [open])

  const reset = () => {
    setStep('prompt')
    setPrompt(DEFAULT_STUDY_PATH_PROMPT)
    setGenerationAmount(aiProvider === 'local' ? 'superSmall' : 'average')
    setLocalAiDashboardConcurrency(2)
    setDraft(null)
    setReviewFolderName('')
    setOpenInWorkspace(true)
    setIsGenerating(false)
    setLocalAiProgress(null)
    setLocalAiFailureDebug(null)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const generatePath = async () => {
    if (!prompt.trim()) {
      setError('Describe what you want AquaMesh to teach.')
      return
    }

    const credentials = resolveStudyPackAiCredentials()
    if (aiProvider === 'hosted') {
      setError('Hosted AI is not configured yet.')
      return
    }

    if (aiProvider === 'gemini' && !credentials.apiToken) {
      setError('Own Gemini API token mode needs a configured API key.')
      return
    }

    if (aiProvider === 'local' && generationAmount === 'deep') {
      setError(LOCAL_DEEP_BLOCKED_MESSAGE)
      return
    }

    setIsGenerating(true)
    setLocalAiProgress(null)
    setLocalAiFailureDebug(null)
    setError('')

    try {
      const nextDraft = await generateStudyPathWithAi({
        provider: aiProvider,
        apiToken: credentials.apiToken,
        model: credentials.model,
        title: 'Study Path',
        folderName: '',
        prompt,
        generationAmount,
        localAiDashboardConcurrency:
          aiProvider === 'local' ? localAiDashboardConcurrency : undefined,
        onProgress: (event) => {
          setLocalAiProgress(event)
        },
      })
      const sanitizedDashboards = nextDraft.dashboards.map((dashboard) => {
        if (aiProvider === 'local') {
          return dashboard
        }

        const events = [...(dashboard.debugTrace?.droppedOrRepairedItems || [])]
        const objects = filterStudyObjectsForDashboardRole(
          dashboard.objects,
          dashboard.dashboardRole,
          events,
        )
        assertRoleObjectsAreClean(
          objects,
          dashboard.dashboardRole,
          dashboard.title,
        )

        return {
          ...dashboard,
          objects,
          debugTrace: dashboard.debugTrace
            ? {
                ...dashboard.debugTrace,
                droppedOrRepairedItems: events,
                finalObjects: objects,
              }
            : dashboard.debugTrace,
        }
      })
      const sanitizedDraft = { ...nextDraft, dashboards: sanitizedDashboards }
      setDraft(sanitizedDraft)
      setReviewFolderName(nextDraft.folderName || nextDraft.title || '')
      setStep('review')
    } catch (err) {
      setLocalAiFailureDebug(
        aiProvider === 'local' && isLocalAiGenerationError(err) && err.debug
          ? err.debug
          : null,
      )
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate this Study Path.',
      )
    } finally {
      setIsGenerating(false)
      setLocalAiProgress(null)
    }
  }

  const createPath = () => {
    if (!draft) {
      return
    }

    const effectiveFolder =
      reviewFolderName.trim() || draft.folderName || draft.title || 'Study Path'
    const studyPathId = makeStudyPathId(draft.title || effectiveFolder)
    const dashboardCount = draft.dashboards.length
    const firstMarkdown = (dashboard: AiStudyPathDraft['dashboards'][number]) =>
      dashboard.objects.find((object) => object.kind === 'markdown')
    const sourceTextForDashboard = (
      dashboard: AiStudyPathDraft['dashboards'][number],
    ) => {
      const markdown = firstMarkdown(dashboard)

      return dashboard.rawNotes || markdown?.markdown || prompt
    }

    onCreatePath({
      folderName: effectiveFolder,
      openInWorkspace,
      dashboards: draft.dashboards.map((dashboard, index) => ({
        name: dashboard.title || `${draft.title} ${index + 1}`,
        folderName: effectiveFolder,
        layoutMode: 'orchestrator',
        widgets: createStudyPackOrchestratorWidgets(
          {
            id: makePackId(dashboard.title || draft.title, index),
            title: dashboard.title || `${draft.title} ${index + 1}`,
            sourceFormat: dashboard.sourceFormat || 'text',
            objects: dashboard.objects,
            warnings: dashboard.warnings || [],
            sourceSummary: dashboard.sourceSummary,
            dashboardRole: dashboard.dashboardRole,
          },
          {
            rawSource: sourceTextForDashboard(dashboard),
            includeSourceWidget: true,
            includeSourceSummaryWidget: aiProvider !== 'local',
            includeSummaryChart: false,
            widgetIdPrefix: makePackId(dashboard.title || draft.title, index),
            studyPath: {
              pathId: studyPathId,
              title: draft.title || effectiveFolder,
              dashboardKey: `${studyPathId}-${index + 1}`,
              dashboardName: dashboard.title || `${draft.title} ${index + 1}`,
              dashboardIndex: index + 1,
              dashboardCount,
              folderName: effectiveFolder,
              dashboardRole: dashboard.dashboardRole,
            },
          },
        ),
      })),
    })
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <RouteIcon color="primary" />
          <Box>
            <Typography variant="h6">Create Study Path</Typography>
            <Typography variant="body2" color="text.secondary">
              Generate several ordered Study Pack dashboards in one folder.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {step === 'prompt' ? (
            <>
              <TextField
                label="What should AquaMesh teach?"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: Teach me French passé composé from scratch, with examples and practice."
                multiline
                minRows={5}
                fullWidth
              />
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'flex-start' }}
              >
                <TextField
                  select
                  label="Path depth"
                  value={generationAmount}
                  onChange={(event) =>
                    setGenerationAmount(event.target.value as GenerationAmount)
                  }
                  sx={{ maxWidth: { xs: '100%', sm: 320 }, flex: 1 }}
                >
                  {generationAmountOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      disabled={
                        aiProvider === 'local' && option.value === 'deep'
                      }
                    >
                      {option.label} -{' '}
                      {getGenerationAmountHelper(option, aiProvider)}
                    </MenuItem>
                  ))}
                </TextField>
                {aiProvider === 'local' && (
                  <TextField
                    select
                    label="Local AI concurrency"
                    value={localAiDashboardConcurrency}
                    onChange={(event) =>
                      setLocalAiDashboardConcurrency(
                        Number(
                          event.target.value,
                        ) as LocalAiDashboardConcurrency,
                      )
                    }
                    helperText="How many lesson dashboards Local AI tries to generate at once."
                    sx={{ maxWidth: { xs: '100%', sm: 320 }, flex: 1 }}
                  >
                    {[1, 2, 3, 5].map((value) => (
                      <MenuItem key={value} value={value}>
                        {value} dashboard{value === 1 ? '' : 's'} at once
                        {value === 2 ? ' (default)' : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
              <Alert severity="info">
                Study Path uses the AI provider selected in Settings. The next
                screen previews each dashboard before saving anything.
              </Alert>
              {aiProvider === 'local' && (
                <Alert
                  severity={generationAmount === 'deep' ? 'error' : 'info'}
                >
                  {generationAmount === 'deep'
                    ? LOCAL_DEEP_BLOCKED_MESSAGE
                    : LOCAL_AI_ESTIMATE_COPY}
                </Alert>
              )}
              {aiProvider === 'hosted' && (
                <Alert severity="warning">
                  Hosted AI is not configured yet.
                </Alert>
              )}
              {isGenerating && (
                <Paper
                  elevation={0}
                  sx={{ p: 2, border: 1, borderColor: 'primary.main' }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesomeIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={800}>
                        {localAiProgress?.label ||
                          getProviderPathProgressLabel(aiProvider)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {providerLabels[aiProvider]}:{' '}
                      {getProviderPathDescription(aiProvider)}
                    </Typography>
                    {aiProvider === 'local' && localAiProgress ? (
                      <>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Estimated Local AI generation time
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {localAiProgress.percent}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={localAiProgress.percent}
                        />
                        {localAiProgress.studyPathPipeline ? (
                          <Box sx={{ mt: 1 }}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                {localAiProgress.studyPathPipeline.label}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatPipelineRemaining(
                                  localAiProgress.studyPathPipeline
                                    .estimatedRemainingMs,
                                )}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={localAiProgress.studyPathPipeline.percent}
                            />
                            <Stack
                              direction="row"
                              spacing={0.75}
                              useFlexGap
                              flexWrap="wrap"
                              sx={{ mt: 1 }}
                            >
                              {localAiProgress.studyPathPipeline.steps.map(
                                (pipelineStep) => (
                                  <Chip
                                    key={pipelineStep.id}
                                    size="small"
                                    label={`${pipelineStep.label} ${pipelineStep.percent}%`}
                                    color={
                                      pipelineStep.status === 'failed'
                                        ? 'error'
                                        : pipelineStep.status === 'complete'
                                        ? 'success'
                                        : pipelineStep.status === 'running'
                                        ? 'primary'
                                        : 'default'
                                    }
                                    variant={
                                      pipelineStep.status === 'pending'
                                        ? 'outlined'
                                        : 'filled'
                                    }
                                  />
                                ),
                              )}
                            </Stack>
                          </Box>
                        ) : null}
                        {localAiProgress.dashboardProgress &&
                          localAiProgress.dashboardProgress.length > 0 && (
                            <Stack spacing={1} sx={{ mt: 0.5 }}>
                              {localAiProgress.dashboardProgress.map(
                                (thread) => (
                                  <Box key={thread.dashboardIndex}>
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      spacing={1}
                                    >
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {thread.label}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {thread.percent}%
                                      </Typography>
                                    </Stack>
                                    <LinearProgress
                                      variant="determinate"
                                      value={thread.percent}
                                      color={
                                        thread.status === 'failed'
                                          ? 'error'
                                          : thread.status === 'complete'
                                          ? 'success'
                                          : 'primary'
                                      }
                                    />
                                  </Box>
                                ),
                              )}
                            </Stack>
                          )}
                      </>
                    ) : (
                      <LinearProgress />
                    )}
                  </Stack>
                </Paper>
              )}
              {localAiFailureDebug ? (
                <Paper
                  component="details"
                  elevation={0}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography component="summary" variant="subtitle2">
                    Local AI failure debug
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    {localAiFailureDebugSections(localAiFailureDebug)
                      .filter(([, value]) => {
                        if (Array.isArray(value)) {
                          return value.length > 0
                        }

                        return value !== undefined && value !== ''
                      })
                      .map(([label, value]) => (
                        <Box key={label}>
                          <Typography variant="caption" fontWeight={700}>
                            {label}
                          </Typography>
                          <Box
                            component="pre"
                            data-testid={`local-ai-failure-debug-${label
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')}`}
                            sx={{
                              m: 0,
                              mt: 0.5,
                              p: 1,
                              maxHeight: 180,
                              overflow: 'auto',
                              bgcolor: 'background.paper',
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              fontSize: 12,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {formatDebugValue(value)}
                          </Box>
                        </Box>
                      ))}
                  </Stack>
                </Paper>
              ) : null}
            </>
          ) : (
            <>
              <TextField
                label="Folder name"
                value={reviewFolderName}
                onChange={(event) => setReviewFolderName(event.target.value)}
                helperText="The selected provider chose this folder for the generated dashboards. You can change it before creating the path."
                fullWidth
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={openInWorkspace}
                    onChange={(event) =>
                      setOpenInWorkspace(event.target.checked)
                    }
                  />
                }
                label="Open all dashboards in workspace after creating them"
              />
              <Stack spacing={1.5}>
                {draft?.dashboards.map((dashboard, index) => (
                  <Paper
                    key={`${dashboard.title}-${index}`}
                    elevation={0}
                    data-testid={`study-path-dashboard-${index + 1}`}
                    sx={{ p: 2, border: 1, borderColor: 'divider' }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        gap={1}
                        flexWrap="wrap"
                        alignItems="center"
                      >
                        <Chip
                          label={`Dashboard ${index + 1}`}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          label={`${dashboard.objects.length} study items`}
                          size="small"
                        />
                        <Chip label={dashboard.dashboardRole} size="small" />
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {dashboard.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getDashboardPreviewSummary(dashboard, aiProvider)}
                      </Typography>
                      <Typography variant="body2">
                        {truncate(getObjectPreview(dashboard.objects[0]))}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              {draft?.warnings.length ? (
                <Alert severity="warning">{draft.warnings.join(' ')}</Alert>
              ) : null}
              {debugTrace ? (
                <Paper
                  component="details"
                  elevation={0}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography component="summary" variant="subtitle2">
                    AI generation debug
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    {[
                      ['Raw AI response', debugTrace.rawAiResponse],
                      ['Raw dashboard input', debugTrace.rawDashboardInput],
                      [
                        'Role-sanitized input before normalization',
                        debugTrace.roleSanitizedInput,
                      ],
                      [
                        'Validated contract before role filtering',
                        debugTrace.validatedContract,
                      ],
                      [
                        'Role-filtered contract',
                        debugTrace.roleFilteredContract,
                      ],
                      [
                        'Dropped or repaired items',
                        debugTrace.droppedOrRepairedItems,
                      ],
                      [
                        'Local AI failed attempts',
                        debugTrace.localAiFailedAttempts,
                      ],
                      ['Final StudyObject mapping', debugTrace.finalObjects],
                    ]
                      .filter(([, value]) => {
                        if (Array.isArray(value)) {
                          return value.length > 0
                        }

                        return value !== undefined
                      })
                      .map(([label, value]) => (
                        <Box key={String(label)}>
                          <Typography variant="caption" fontWeight={700}>
                            {String(label)}
                          </Typography>
                          <Box
                            component="pre"
                            data-testid={`study-path-debug-${String(label)
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')}`}
                            sx={{
                              m: 0,
                              mt: 0.5,
                              p: 1,
                              maxHeight: 180,
                              overflow: 'auto',
                              bgcolor: 'background.paper',
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              fontSize: 12,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {formatDebugValue(value)}
                          </Box>
                        </Box>
                      ))}
                  </Stack>
                </Paper>
              ) : null}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {step === 'review' && (
          <Button onClick={() => setStep('prompt')}>Back</Button>
        )}
        {step === 'prompt' ? (
          <Button
            variant="contained"
            onClick={generatePath}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Study Path'}
          </Button>
        ) : (
          <Button variant="contained" onClick={createPath}>
            Create {draft?.dashboards.length || 0} dashboards
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default CreateStudyPathModal

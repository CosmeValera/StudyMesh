import React, { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  AiStudyPathDraft,
  generateStudyPathWithAi,
  resolveStudyPackAiCredentials,
} from '../../studyPack/ai'

type GenerationAmount = 'few' | 'medium' | 'many'

interface CreateStudyPathModalProps {
  open: boolean
  onClose: () => void
  onCreatePath: (payload: {
    folderName: string
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
  { label: 'Compact', value: 'few', helper: 'Short path, fewer exercises' },
  { label: 'Balanced', value: 'medium', helper: 'Best default' },
  { label: 'Deep', value: 'many', helper: 'More practice per lesson' },
]

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

const truncate = (value: string, max = 150) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > max
    ? `${normalized.slice(0, Math.max(0, max - 1))}…`
    : normalized
}

const makePackId = (title: string, index: number) =>
  `${title}-${index + 1}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
  `study-path-${index + 1}`

const CreateStudyPathModal: React.FC<CreateStudyPathModalProps> = ({
  open,
  onClose,
  onCreatePath,
}) => {
  const [step, setStep] = useState<'prompt' | 'review'>('prompt')
  const [pathTitle, setPathTitle] = useState('Study Path')
  const [folderName, setFolderName] = useState('Study Path')
  const [prompt, setPrompt] = useState('')
  const [generationAmount, setGenerationAmount] =
    useState<GenerationAmount>('medium')
  const [draft, setDraft] = useState<AiStudyPathDraft | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setStep('prompt')
    setPathTitle('Study Path')
    setFolderName('Study Path')
    setPrompt('')
    setGenerationAmount('medium')
    setDraft(null)
    setIsGenerating(false)
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
    if (!credentials.apiToken) {
      setError(
        'Study Path needs AI. Add your Gemini API key in Settings first.',
      )
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const nextDraft = await generateStudyPathWithAi({
        apiToken: credentials.apiToken,
        model: credentials.model,
        title: pathTitle.trim() || 'Study Path',
        folderName: folderName.trim() || pathTitle.trim() || 'Study Path',
        prompt,
        generationAmount,
      })
      setDraft(nextDraft)
      setPathTitle(nextDraft.title)
      setFolderName(nextDraft.folderName)
      setStep('review')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate this Study Path.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const createPath = () => {
    if (!draft) {
      return
    }

    const effectiveFolder = folderName.trim() || draft.folderName || draft.title
    onCreatePath({
      folderName: effectiveFolder,
      dashboards: draft.dashboards.map((dashboard, index) => ({
        name: dashboard.title || `${draft.title} ${index + 1}`,
        folderName: effectiveFolder,
        layoutMode: 'orchestrator',
        widgets: createStudyPackOrchestratorWidgets(
          {
            id: makePackId(dashboard.title || draft.title, index),
            title: dashboard.title || `${draft.title} ${index + 1}`,
            sourceFormat: dashboard.sourceFormat || 'text',
            rawSource: dashboard.rawNotes || prompt,
            objects: dashboard.objects,
            warnings: dashboard.warnings || [],
          },
          {
            rawSource: dashboard.rawNotes || prompt,
            includeSourceWidget: true,
            includeSummaryChart: true,
            widgetIdPrefix: makePackId(dashboard.title || draft.title, index),
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
                label="Path title"
                value={pathTitle}
                onChange={(event) => {
                  setPathTitle(event.target.value)
                  if (!folderName.trim() || folderName === pathTitle) {
                    setFolderName(event.target.value)
                  }
                }}
                fullWidth
              />
              <TextField
                label="Folder name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                helperText="All generated Study Packs will be saved into this dashboard folder. You can edit it before creating them."
                fullWidth
              />
              <TextField
                label="What should AquaMesh teach?"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: Teach me French passé composé from scratch, with examples and practice."
                multiline
                minRows={5}
                fullWidth
              />
              <TextField
                select
                label="Path depth"
                value={generationAmount}
                onChange={(event) =>
                  setGenerationAmount(event.target.value as GenerationAmount)
                }
                sx={{ maxWidth: 320 }}
              >
                {generationAmountOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label} - {option.helper}
                  </MenuItem>
                ))}
              </TextField>
              <Alert severity="info">
                Study Path asks Gemini for an array of dashboards, not one large
                Study Pack. The next screen previews each dashboard before
                saving anything.
              </Alert>
              {isGenerating && (
                <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'primary.main' }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesomeIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={800}>
                        Generating ordered dashboards…
                      </Typography>
                    </Stack>
                    <LinearProgress />
                  </Stack>
                </Paper>
              )}
            </>
          ) : (
            <>
              <TextField
                label="Folder name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                helperText="Edit where the generated Study Packs will be saved."
                fullWidth
              />
              <Stack spacing={1.5}>
                {draft?.dashboards.map((dashboard, index) => (
                  <Paper
                    key={`${dashboard.title}-${index}`}
                    elevation={0}
                    sx={{ p: 2, border: 1, borderColor: 'divider' }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                        <Chip label={`Dashboard ${index + 1}`} color="primary" size="small" />
                        <Chip label={`${dashboard.objects.length} study items`} size="small" />
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {dashboard.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {dashboard.summary}
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
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {step === 'review' && <Button onClick={() => setStep('prompt')}>Back</Button>}
        {step === 'prompt' ? (
          <Button variant="contained" onClick={generatePath} disabled={isGenerating}>
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

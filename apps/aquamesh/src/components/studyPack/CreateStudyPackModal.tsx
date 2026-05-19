import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import ImageIcon from '@mui/icons-material/Image'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import {
  createStudyPackOrchestratorWidgets,
  createStudyPackSmartWidgetGroups,
  createStudyPackWidgets,
  augmentStudyPackPracticeObjects,
  createStudyPackPracticeProfile,
  isReviewableStudyObject,
  parseStudyPack,
  StudyObject,
  StudyPackSourceFormat,
  StudyPackDashboardLayoutMode,
} from '../../studyPack'
import { extractRawNotesFromImage } from '../../studyPack/imageOcr'
import {
  AiSourceSummary,
  extractNotesFromImageWithLocalLanguageModel,
  extractRawNotesWithAi,
  generateStudyPackWithAi,
  LocalAiProgressEvent,
  readStudyPackAiSettings,
  resolveStudyPackAiCredentials,
  StudyPackAiProvider,
} from '../../studyPack/ai'

type ReviewType =
  | 'flashcard'
  | 'quiz'
  | 'term'
  | 'code'
  | 'comparison'
  | 'list'
  | 'table'
  | 'reviewPrompt'
  | 'note'
  | 'reveal'
  | 'sequence'
  | 'ignore'
type SourceInputType = 'text' | 'image'
type GenerationAmount = 'few' | 'medium' | 'many'

interface ReviewItem {
  object: StudyObject
  title: string
  type: ReviewType
}

interface PreviewWidgetGroup {
  id: string
  name: string
  objectIds: string[]
}

interface CreateStudyPackModalProps {
  open: boolean
  onClose: () => void
  onCreatePack: (payload: {
    name: string
    widgets: ReturnType<typeof createStudyPackWidgets>
    layoutMode?: StudyPackDashboardLayoutMode
  }) => void
}

const sourceOptions: Array<{
  label: string
  value: SourceInputType
}> = [
  { label: 'Text notes / files', value: 'text' },
  { label: 'Image', value: 'image' },
]

const supportedImageExtensions = [
  'bmp',
  'jpg',
  'jpeg',
  'png',
  'pbm',
  'webp',
  'gif',
]
const supportedImageMimeTypes = [
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-ms-bmp',
  'image/x-portable-bitmap',
]
const imageAcceptValue = [
  '.bmp',
  '.gif',
  '.jpg',
  '.jpeg',
  '.pbm',
  '.png',
  '.webp',
  ...supportedImageMimeTypes,
].join(',')

const getObjectTitle = (object: StudyObject) => {
  if (object.title) {
    return object.title
  }

  switch (object.kind) {
    case 'markdown':
      return object.title || 'Markdown notes'
    case 'term':
      return object.term
    case 'qa':
      return object.question
    case 'quiz':
      return object.question
    case 'reveal':
      return object.prompt
    case 'comparison':
      return object.title || 'Comparison'
    case 'sequence':
      return object.title || 'Sequence'
    case 'reviewPrompt':
      return object.title || 'Review later'
    case 'code':
      return object.title || 'Code note'
    case 'list':
      return object.checklist ? 'Checklist' : 'Study list'
    case 'table':
      return object.title || 'Study table'
    case 'resource':
      return object.label
    case 'note':
    default:
      return 'Study note'
  }
}

const getObjectPreview = (object: StudyObject) => {
  switch (object.kind) {
    case 'markdown':
      return object.markdown
    case 'term':
      return object.definition
    case 'qa':
      return object.answer
    case 'quiz':
      return object.explanation || object.answer || object.options.join(' / ')
    case 'reveal':
      return object.hiddenText
    case 'comparison':
      return `${object.columns.length} columns, ${object.rows.length} rows`
    case 'sequence':
      return object.steps.slice(0, 3).join(' / ')
    case 'reviewPrompt':
      return object.reason || object.prompt
    case 'code':
      return object.code
    case 'list':
      return object.items.slice(0, 3).join(' / ')
    case 'table':
      return `${object.headers.length} columns, ${object.rows.length} rows`
    case 'resource':
      return object.url
    case 'note':
    default:
      return object.body
  }
}

const getReviewType = (object: StudyObject): ReviewType => {
  if (object.kind === 'qa' || object.kind === 'reveal') {
    return 'flashcard'
  }

  if (object.kind === 'sequence') {
    return 'list'
  }

  if (
    object.kind === 'quiz' ||
    object.kind === 'term' ||
    object.kind === 'code' ||
    object.kind === 'comparison' ||
    object.kind === 'list' ||
    object.kind === 'table' ||
    object.kind === 'reviewPrompt'
  ) {
    return object.kind
  }

  return 'ignore'
}

const getFileTitle = (file: File) =>
  file.name.replace(/\.[^.]+$/, '') || 'Notes Dashboard'

const getPackId = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'study-pack'

const isSupportedImageFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase()

  return (
    supportedImageExtensions.includes(extension || '') ||
    supportedImageMimeTypes.includes(file.type)
  )
}

const toReviewItems = (objects: StudyObject[]): ReviewItem[] =>
  objects
    .filter(isReviewableStudyObject)
    .map((object) => ({
      object,
      title: getObjectTitle(object),
      type: getReviewType(object),
    }))
    .filter((item) => item.type !== 'ignore')

const createPreviewWidgetGroups = (
  objects: StudyObject[],
  title: string,
): PreviewWidgetGroup[] =>
  createStudyPackSmartWidgetGroups(
    {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'study-pack',
      title,
      sourceFormat: 'text',
      objects,
      warnings: [],
    },
    3,
  ).map((group, index) => ({
    id: `preview-widget-${index + 1}`,
    name: group.name,
    objectIds: group.objects.map((object) => object.id),
  }))

const applyReviewItem = (item: ReviewItem): StudyObject | null => {
  if (item.type === 'ignore') {
    return null
  }

  if (item.type === 'flashcard' && item.object.kind === 'qa') {
    return { ...item.object, title: item.title }
  }

  if (item.type === 'list' && item.object.kind === 'sequence') {
    return {
      ...item.object,
      kind: 'list',
      title: item.title,
      items: item.object.steps,
      ordered: item.object.ordered,
      checklist: item.object.interactiveChecklist,
    }
  }

  if (item.type === item.object.kind) {
    return { ...item.object, title: item.title }
  }

  const preview = getObjectPreview(item.object)
  const base = {
    ...item.object,
    kind: item.type,
    title: item.title,
  }

  if (item.type === 'note') {
    return {
      ...base,
      kind: 'note',
      body: preview,
    }
  }

  if (item.type === 'flashcard') {
    return {
      ...base,
      kind: 'qa',
      question: item.title,
      answer: preview,
    }
  }

  if (item.type === 'list') {
    return {
      ...base,
      kind: 'list',
      items: preview
        .split(/\n|\/|,/)
        .map((value) => value.trim())
        .filter(Boolean),
      ordered: false,
      checklist: false,
    }
  }

  if (item.type === 'term') {
    return {
      ...base,
      kind: 'term',
      term: item.title,
      definition: preview,
    }
  }

  if (item.type === 'quiz') {
    return {
      ...base,
      kind: 'quiz',
      quizMode: 'shortAnswer',
      question: item.title,
      options: [],
      correctIndex: 0,
      answer: preview,
      explanation: '',
    }
  }

  if (item.type === 'reveal') {
    return {
      ...base,
      kind: 'reveal',
      prompt: item.title,
      hiddenText: preview,
    }
  }

  if (item.type === 'sequence') {
    return {
      ...base,
      kind: 'sequence',
      steps: preview
        .split(/\n|\/|,/)
        .map((value) => value.trim())
        .filter(Boolean),
      ordered: true,
      interactiveChecklist: false,
    }
  }

  if (item.type === 'reviewPrompt') {
    return {
      ...base,
      kind: 'reviewPrompt',
      prompt: item.title,
      reason: preview,
      status: 'needsReview',
    }
  }

  if (item.type === 'code') {
    return {
      ...base,
      kind: 'code',
      code: preview,
      language: 'text',
      caption: item.title,
    }
  }

  if (item.type === 'comparison') {
    return {
      ...base,
      kind: 'comparison',
      columns: ['Item A', 'Item B'],
      rows: preview
        .split('\n')
        .map((value) => value.split('|').map((cell) => cell.trim()))
        .filter((row) => row.some(Boolean)),
    }
  }

  return { ...item.object, title: item.title }
}

const CreateStudyPackModal: React.FC<CreateStudyPackModalProps> = ({
  open,
  onClose,
  onCreatePack,
}) => {
  const [step, setStep] = useState<'source' | 'review'>('source')
  const [aiProvider, setAiProvider] = useState<StudyPackAiProvider>('basic')
  const [sourceInputType, setSourceInputType] =
    useState<SourceInputType>('text')
  const [sourceText, setSourceText] = useState('')
  const [sourceFormat, setSourceFormat] =
    useState<StudyPackSourceFormat>('text')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [imageTextExtracted, setImageTextExtracted] = useState(false)
  const [isExtractingImage, setIsExtractingImage] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiProgressLabel, setAiProgressLabel] = useState('')
  const [aiGenerationProgress, setAiGenerationProgress] = useState(0)
  const [aiGenerationProgressPhase, setAiGenerationProgressPhase] = useState<
    LocalAiProgressEvent['phase'] | ''
  >('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [packTitle, setPackTitle] = useState('Notes Dashboard')
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [widgetGroups, setWidgetGroups] = useState<PreviewWidgetGroup[]>([])
  const [aiSourceSummary, setAiSourceSummary] =
    useState<AiSourceSummary | null>(null)
  const [includeSourceWidget, setIncludeSourceWidget] = useState(true)
  const [layoutMode, setLayoutMode] =
    useState<StudyPackDashboardLayoutMode>('orchestrator')
  const [generationTargets, setGenerationTargets] = useState<string[]>([
    'quizzes',
    'flashcards',
    'summaries',
    'definitions',
    'reviewPrompts',
    'lists',
    'tables',
    'comparisons',
    'code',
  ])
  const [generationAmount, setGenerationAmount] =
    useState<GenerationAmount>('medium')
  const [error, setError] = useState('')

  const practiceProfile = useMemo(
    () => createStudyPackPracticeProfile(generationAmount, generationTargets),
    [generationAmount, generationTargets],
  )
  const reviewableCount = useMemo(
    () => reviewItems.filter((item) => item.type !== 'ignore').length,
    [reviewItems],
  )

  useEffect(() => {
    if (open) {
      setAiProvider(readStudyPackAiSettings().provider || 'basic')
    }
  }, [open])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  const reset = () => {
    setStep('source')
    setSourceInputType('text')
    setSourceText('')
    setSourceFormat('text')
    setImageFile(null)
    setImagePreviewUrl('')
    setImageTextExtracted(false)
    setIsExtractingImage(false)
    setIsGeneratingAi(false)
    setAiProgressLabel('')
    setAiGenerationProgress(0)
    setAiGenerationProgressPhase('')
    setOcrProgress(0)
    setOcrStatus('')
    setPackTitle('Notes Dashboard')
    setReviewItems([])
    setWidgetGroups([])
    setAiSourceSummary(null)
    setIncludeSourceWidget(true)
    setLayoutMode('orchestrator')
    setGenerationTargets([
      'quizzes',
      'flashcards',
      'summaries',
      'definitions',
      'reviewPrompts',
      'lists',
      'tables',
      'comparisons',
      'code',
    ])
    setGenerationAmount('medium')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSourceInputTypeChange = (value: SourceInputType) => {
    setSourceInputType(value)
    setSourceText('')
    setSourceFormat('text')
    setImageFile(null)
    setImageTextExtracted(false)
    setOcrProgress(0)
    setOcrStatus('')
    setError('')
  }

  const selectImageFile = (file: File) => {
    if (!isSupportedImageFile(file)) {
      setError('Use a PNG, JPG, WebP, GIF, BMP, or PBM image.')
      setImageFile(null)
      setImageTextExtracted(false)
      return
    }

    setImageFile(file)
    setPackTitle(getFileTitle(file))
    setSourceText('')
    setImageTextExtracted(false)
    setOcrProgress(0)
    setOcrStatus('')
    setError('')
  }

  const parseSource = () => {
    const parsed = parseStudyPack(sourceText, {
      title: packTitle,
      defaultTags: ['study-pack'],
    })
    const augmented = augmentStudyPackPracticeObjects(parsed.objects, {
      packId: parsed.id,
      title: parsed.title,
      rawNotes: sourceText,
      generationTargets,
      generationAmount,
      visiblePracticeTarget: Math.max(0, practiceProfile.targetTotal - 2),
    })
    const reviewableItems = toReviewItems(augmented.objects)
    const nextTitle = packTitle.trim() || parsed.title
    setPackTitle(nextTitle)
    setSourceFormat(parsed.sourceFormat)
    setReviewItems(reviewableItems)
    setAiSourceSummary(null)
    setWidgetGroups(
      createPreviewWidgetGroups(
        reviewableItems.map((item) => item.object),
        nextTitle,
      ),
    )
    setError(parsed.warnings[0] || augmented.warnings[0] || '')
    setStep('review')
  }

  const parseSourceWithAi = async () => {
    const credentials = resolveStudyPackAiCredentials()
    if (aiProvider === 'hosted') {
      setError('Hosted AI is not configured yet.')
      return
    }

    if (aiProvider === 'gemini' && !credentials.apiToken) {
      setError('Own Gemini API token mode needs a configured API key.')
      return
    }

    setIsGeneratingAi(true)
    setOcrStatus('Generating study materials')
    setAiGenerationProgress(0)
    setAiGenerationProgressPhase('')
    setAiProgressLabel(
      aiProvider === 'local'
        ? 'Starting Google Local AI'
        : aiProvider === 'gemini'
          ? 'Connecting to Gemini'
          : 'Preparing generation',
    )
    setError('')

    try {
      window.setTimeout(() => {
        setAiProgressLabel((current) =>
          current
            ? aiProvider === 'local'
              ? 'Asking Chrome Local AI for a compact outline'
              : aiProvider === 'gemini'
                ? 'Reading notes and planning study sections'
                : 'Parsing notes locally'
            : current,
        )
      }, 700)
      window.setTimeout(() => {
        setAiProgressLabel((current) =>
          current
            ? aiProvider === 'local'
              ? 'Creating compact local study objects'
              : aiProvider === 'gemini'
                ? 'Creating quizzes, flashcards, and study blocks with Gemini'
                : 'Creating quizzes, flashcards, and study blocks'
            : current,
        )
      }, 1800)
      const draft = await generateStudyPackWithAi({
        provider: aiProvider,
        apiToken: credentials.apiToken,
        model: credentials.model,
        title: packTitle.trim() || 'Notes Dashboard',
        rawNotes: sourceText,
        packId: getPackId(packTitle),
        generationTargets,
        generationAmount,
        promptMode: false,
        studyPathMode: false,
        onProgress: (event) => {
          setAiGenerationProgress(event.percent)
          setAiGenerationProgressPhase(event.phase)
          setAiProgressLabel(
            event.phase === 'download'
              ? `${event.label} ${event.percent}%`
              : event.label,
          )
        },
      })
      const nextTitle = draft.title || packTitle
      setAiProgressLabel('Preparing review screen')
      const augmented = augmentStudyPackPracticeObjects(draft.objects, {
        packId: getPackId(nextTitle),
        title: nextTitle,
        rawNotes: sourceText,
        generationTargets,
        generationAmount,
        visiblePracticeTarget: Math.max(0, practiceProfile.targetTotal - 2),
      })
      const reviewableItems = toReviewItems(augmented.objects)
      setPackTitle(nextTitle)
      setSourceFormat(draft.sourceFormat || 'text')
      setReviewItems(reviewableItems)
      setAiSourceSummary(draft.sourceSummary || null)
      setWidgetGroups(
        createPreviewWidgetGroups(
          reviewableItems.map((item) => item.object),
          nextTitle,
        ),
      )
      setError(
        draft.warnings[0] ||
          augmented.warnings[0] ||
          (reviewableItems.length === 0
            ? 'AI did not create any reviewable study materials from these notes.'
            : ''),
      )
      setStep('review')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not generate study materials with AI.',
      )
    } finally {
      setIsGeneratingAi(false)
      setAiProgressLabel('')
      setAiGenerationProgress(0)
      setAiGenerationProgressPhase('')
      setOcrStatus('')
    }
  }

  const extractImageNotes = async () => {
    if (!imageFile) {
      setError('Add an image before extracting notes.')
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

    setIsExtractingImage(true)
    setOcrProgress(0)
    setOcrStatus(
      aiProvider === 'gemini'
        ? 'Preparing AI extraction'
        : aiProvider === 'local'
          ? 'Checking Local AI image support'
          : 'Preparing OCR',
    )
    setAiProgressLabel(
      aiProvider === 'gemini' ? 'Connecting to Gemini vision' : '',
    )
    setError('')

    try {
      if (aiProvider === 'gemini') {
        window.setTimeout(() => {
          setAiProgressLabel((current) =>
            current ? 'Reading image and correcting text' : current,
          )
        }, 700)
      }
      let text = ''
      if (aiProvider === 'gemini') {
        text = await extractRawNotesWithAi({
          apiToken: credentials.apiToken,
          model: credentials.model,
          image: imageFile,
        })
      } else if (aiProvider === 'local') {
        try {
          setOcrStatus('Extracting notes with Google Local AI')
          text = await extractNotesFromImageWithLocalLanguageModel(imageFile, {
            timeoutMs: 90 * 1000,
            onProgress: (progress) => {
              setOcrProgress(progress)
              setOcrStatus(`Downloading local model ${progress}%`)
            },
          })
        } catch {
          setOcrStatus('Local AI image input unavailable; using OCR')
          text = await extractRawNotesFromImage(imageFile, (progress) => {
            setOcrProgress(Math.round(progress.progress * 100))
            setOcrStatus(progress.status)
          })
        }
      } else {
        text = await extractRawNotesFromImage(imageFile, (progress) => {
          setOcrProgress(Math.round(progress.progress * 100))
          setOcrStatus(progress.status)
        })
      }

      if (!text.trim()) {
        setSourceText('')
        setImageTextExtracted(false)
        setError('No text was detected in this image.')
        return
      }

      setSourceText(text)
      setImageTextExtracted(true)
      setOcrProgress(100)
      setOcrStatus(
        aiProvider === 'gemini'
          ? 'AI extraction complete'
          : aiProvider === 'local'
            ? 'Image extraction complete'
            : 'OCR complete',
      )
    } catch {
      setError(
        aiProvider === 'gemini'
          ? 'Could not extract notes with AI. Check your Gemini API key or use Basic mode.'
          : 'Could not extract notes from this image.',
      )
      setImageTextExtracted(false)
    } finally {
      setIsExtractingImage(false)
      setAiProgressLabel('')
    }
  }

  const parseCurrentSource = async () => {
    if (sourceInputType === 'image' && !imageTextExtracted) {
      await extractImageNotes()
      return
    }

    if (!sourceText.trim()) {
      setError('Add notes before continuing.')
      return
    }

    if (aiProvider !== 'basic') {
      await parseSourceWithAi()
      return
    }

    parseSource()
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) {
      return
    }

    const unsupportedFile = files.find((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      return !['md', 'txt', 'csv'].includes(extension || '')
    })
    if (unsupportedFile) {
      setError(
        unsupportedFile.name.toLowerCase().endsWith('.pdf')
          ? 'PDF upload needs a parser before it can be read here. Export the PDF text, paste it, or add the PDF link in your notes for now.'
          : 'Use .md, .txt, or .csv files.',
      )
      event.target.value = ''
      return
    }

    const fileTexts = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        text: await file.text(),
      })),
    )
    const text = fileTexts
      .map(({ name, text }) => `# ${getFileTitle({ name } as File)}\n\n${text}`)
      .join('\n\n---\n\n')
    setSourceText(text)
    setPackTitle(
      files.length === 1
        ? getFileTitle(files[0])
        : `${getFileTitle(files[0])} Dashboard`,
    )
    setSourceFormat('text')
    setError('')
    event.target.value = ''
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    selectImageFile(file)
    event.target.value = ''
  }

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) {
      return
    }

    selectImageFile(file)
  }

  const createPack = () => {
    const objects = reviewItems
      .map(applyReviewItem)
      .filter((object): object is StudyObject => Boolean(object))
    const objectsById = new Map(objects.map((object) => [object.id, object]))
    const groups = widgetGroups
      .map((group, index) => ({
        name: group.name.trim() || `${packTitle} ${index + 1}`,
        objects: group.objectIds
          .map((objectId) => objectsById.get(objectId))
          .filter((object): object is StudyObject => Boolean(object)),
      }))
      .filter((group) => group.objects.length > 0)

    if (!includeSourceWidget && groups.length === 0) {
      setError(
        'Keep the source notes or add at least one generated study section.',
      )
      return
    }

    const pack = {
      id: packTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: packTitle.trim() || 'Notes Dashboard',
      sourceFormat,
      objects,
      warnings: [],
      sourceSummary: aiSourceSummary || undefined,
    }
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      includeSourceWidget,
      includeSummaryChart: false,
      rawSource: sourceText,
      widgetGroups: groups,
    })

    onCreatePack({
      name: packTitle.trim() || 'Notes Dashboard',
      widgets,
      layoutMode:
        includeSourceWidget || layoutMode !== 'orchestrator'
          ? layoutMode
          : 'tabs',
    })
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 3,
          minHeight: { xs: '100dvh', md: 620 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flex: '0 0 auto',
              }}
            >
              <AutoStoriesIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Create from notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paste notes or start from an image. AquaMesh will build a
                ready-to-use dashboard.
              </Typography>
            </Box>
          </Stack>
          <IconButton
            aria-label="Close Create from notes"
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent
        sx={{ bgcolor: 'background.default', p: { xs: 2, md: 3 } }}
      >
        {error && (
          <Alert severity={step === 'review' ? 'info' : 'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 'source' ? (
          <Stack spacing={2.5}>
            <TextField
              label="Dashboard name"
              value={packTitle}
              onChange={(event) => setPackTitle(event.target.value)}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {sourceOptions.map((option) => {
                const selected = sourceInputType === option.value
                const Icon =
                  option.value === 'image' ? ImageIcon : AutoStoriesIcon
                return (
                  <Paper
                    key={option.value}
                    component="button"
                    type="button"
                    onClick={() => handleSourceInputTypeChange(option.value)}
                    elevation={0}
                    sx={{
                      flex: 1,
                      p: 2,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: 1,
                      borderColor: selected ? 'primary.main' : 'divider',
                      bgcolor: selected ? 'primary.50' : 'background.paper',
                      borderRadius: 2,
                      color: 'text.primary',
                      boxShadow: selected ? 1 : 0,
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Icon color={selected ? 'primary' : 'action'} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={900}>
                          {option.value === 'text'
                            ? 'Text notes'
                            : 'Image notes'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.value === 'text'
                            ? 'Paste notes or upload text files.'
                            : 'Upload a screenshot, slide, or photo.'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                )
              })}
            </Stack>

            {sourceInputType === 'text' ? (
              <Stack spacing={1.25}>
                <TextField
                  label="Paste notes"
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  fullWidth
                  multiline
                  minRows={14}
                  placeholder={`# Derivatives\n\nDefinition:: A derivative measures instantaneous rate of change.\n\nQ: What is the power rule?\nA: d/dx x^n = nx^(n-1)`}
                />
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    sx={{ alignSelf: { sm: 'flex-start' } }}
                  >
                    Upload text file
                    <input
                      hidden
                      type="file"
                      multiple
                      accept=".md,.txt,.csv,.pdf,text/markdown,text/plain,text/csv,application/pdf"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Supports .md, .txt, and .csv. For PDFs, paste exported text
                    for now.
                  </Typography>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Paper
                  elevation={0}
                  onDrop={handleImageDrop}
                  onDragOver={(event) => event.preventDefault()}
                  sx={{
                    p: 3,
                    border: 1,
                    borderColor: imageFile ? 'primary.main' : 'divider',
                    bgcolor: 'background.paper',
                    minHeight: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                  }}
                >
                  <Stack spacing={1.5} alignItems="center" textAlign="center">
                    {imagePreviewUrl ? (
                      <Box
                        component="img"
                        src={imagePreviewUrl}
                        alt={imageFile?.name || 'Selected study notes image'}
                        sx={{
                          maxWidth: '100%',
                          maxHeight: 180,
                          borderRadius: 1,
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <ImageIcon color="primary" sx={{ fontSize: 48 }} />
                    )}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={900}>
                        {imageFile?.name || 'Drop an image here'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        PNG, JPG, WebP, GIF, BMP, or PBM.
                      </Typography>
                    </Box>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                    >
                      Select image
                      <input
                        hidden
                        type="file"
                        accept={imageAcceptValue}
                        onChange={handleImageUpload}
                      />
                    </Button>
                  </Stack>
                </Paper>
                {isExtractingImage && (
                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mb: 0.75 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {aiProgressLabel || ocrStatus || 'Extracting notes'}
                      </Typography>
                      {aiProvider !== 'gemini' && (
                        <Typography variant="body2" color="text.secondary">
                          {ocrProgress}%
                        </Typography>
                      )}
                    </Stack>
                    <LinearProgress
                      variant={
                        aiProvider !== 'gemini' && ocrProgress > 0
                          ? 'determinate'
                          : 'indeterminate'
                      }
                      value={ocrProgress}
                    />
                  </Box>
                )}
                <TextField
                  label="Extracted notes"
                  value={sourceText}
                  onChange={(event) => {
                    setSourceText(event.target.value)
                    setImageTextExtracted(Boolean(event.target.value.trim()))
                  }}
                  fullWidth
                  multiline
                  minRows={8}
                  disabled={isExtractingImage}
                  placeholder="Extracted notes will appear here. You can edit them before creating the dashboard."
                />
              </Stack>
            )}

            {isGeneratingAi && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'primary.main',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AutoAwesomeIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={800}>
                      {aiProgressLabel || ocrStatus || 'Creating dashboard'}
                    </Typography>
                  </Stack>
                  {aiProvider === 'local' && aiGenerationProgressPhase ? (
                    <>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Estimated Local AI generation time
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {aiGenerationProgress}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={aiGenerationProgress}
                      />
                    </>
                  ) : (
                    <LinearProgress />
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              <Stack spacing={2}>
                <TextField
                  label="Dashboard name"
                  value={packTitle}
                  onChange={(event) => setPackTitle(event.target.value)}
                  fullWidth
                />
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Chip
                    color="primary"
                    label={`${reviewableCount} study blocks`}
                  />
                  <Chip label={`${widgetGroups.length} sections`} />
                  <Chip
                    label={
                      sourceFormat === 'csv'
                        ? 'Source table included'
                        : 'Source notes included'
                    }
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Review the dashboard structure below, then create it in your
                  workspace.
                </Typography>
              </Stack>
            </Paper>

            {widgetGroups.length > 0 ? (
              <Stack spacing={1.25}>
                {widgetGroups.map((group, index) => (
                  <Paper
                    key={group.id}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'action.hover',
                          fontWeight: 900,
                          flex: '0 0 auto',
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={900} noWrap>
                          {group.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {group.objectIds.length} generated blocks
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  AquaMesh was not able to extract study materials from these
                  notes.
                </Typography>
              </Paper>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {step === 'review' && (
          <Button onClick={() => setStep('source')}>Back</Button>
        )}
        <Button onClick={handleClose}>Cancel</Button>
        {step === 'source' ? (
          <Button
            variant="contained"
            onClick={parseCurrentSource}
            disabled={isExtractingImage || isGeneratingAi}
          >
            {isGeneratingAi
              ? 'Creating...'
              : sourceInputType === 'image' && !imageTextExtracted
                ? 'Extract notes'
                : 'Continue'}
          </Button>
        ) : (
          <Button variant="contained" onClick={createPack}>
            Create dashboard
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default CreateStudyPackModal

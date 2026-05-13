import React, { useEffect, useMemo, useState } from 'react'
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
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
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
  extractRawNotesWithAi,
  generateStudyPackWithAi,
  resolveStudyPackAiCredentials,
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
  | 'ignore'
type SourceInputType = 'text' | 'image'
type StudyPackCreationMode = 'basic' | 'ai'
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

const creationModeOptions: Array<{
  label: string
  value: StudyPackCreationMode
}> = [
  { label: 'AI', value: 'ai' },
  { label: 'Basic fallback', value: 'basic' },
]

const generationTargetOptions = [
  { key: 'summaries', label: 'Summaries' },
  { key: 'definitions', label: 'Definitions' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'quizzes', label: 'Quizzes' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'pages', label: 'Study pages' },
]

const generationAmountOptions: Array<{
  label: string
  value: GenerationAmount
  helper: string
}> = [
  { label: 'Few', value: 'few', helper: '6 target, 4 minimum' },
  { label: 'Medium', value: 'medium', helper: '11 target, 8 minimum' },
  { label: 'Many', value: 'many', helper: '18 target, 14 minimum' },
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

const reviewTypeOptions: Array<{
  label: string
  value: ReviewType
}> = [
  { label: 'Flashcard', value: 'flashcard' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Definition', value: 'term' },
  { label: 'Code note', value: 'code' },
  { label: 'Comparison', value: 'comparison' },
  { label: 'Review prompt', value: 'reviewPrompt' },
  { label: 'Checklist / list', value: 'list' },
  { label: 'Table', value: 'table' },
  { label: 'Ignore', value: 'ignore' },
]

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

const getCounts = (items: ReviewItem[]) =>
  items.reduce<Record<string, number>>((counts, item) => {
    if (item.type !== 'ignore') {
      counts[item.type] = (counts[item.type] || 0) + 1
    }

    return counts
  }, {})

const getFileTitle = (file: File) =>
  file.name.replace(/\.[^.]+$/, '') || 'Study Pack'

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
  const [creationMode, setCreationMode] = useState<StudyPackCreationMode>('ai')
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
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [packTitle, setPackTitle] = useState('Study Pack')
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [widgetGroups, setWidgetGroups] = useState<PreviewWidgetGroup[]>([])
  const [includeSourceWidget, setIncludeSourceWidget] = useState(true)
  const [includeSourceChart, setIncludeSourceChart] = useState(true)
  const [layoutMode, setLayoutMode] =
    useState<StudyPackDashboardLayoutMode>('orchestrator')
  const [generationTargets, setGenerationTargets] = useState<string[]>([
    'summaries',
    'definitions',
    'flashcards',
    'quizzes',
    'exercises',
  ])
  const [generationAmount, setGenerationAmount] =
    useState<GenerationAmount>('medium')
  const [error, setError] = useState('')

  const counts = useMemo(() => getCounts(reviewItems), [reviewItems])
  const practiceProfile = useMemo(
    () => createStudyPackPracticeProfile(generationAmount, generationTargets),
    [generationAmount, generationTargets],
  )
  const reviewableCount = useMemo(
    () => reviewItems.filter((item) => item.type !== 'ignore').length,
    [reviewItems],
  )

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
    setCreationMode('ai')
    setSourceInputType('text')
    setSourceText('')
    setSourceFormat('text')
    setImageFile(null)
    setImagePreviewUrl('')
    setImageTextExtracted(false)
    setIsExtractingImage(false)
    setIsGeneratingAi(false)
    setAiProgressLabel('')
    setOcrProgress(0)
    setOcrStatus('')
    setPackTitle('Study Pack')
    setReviewItems([])
    setWidgetGroups([])
    setIncludeSourceWidget(true)
    setIncludeSourceChart(true)
    setLayoutMode('orchestrator')
    setGenerationTargets([
      'summaries',
      'definitions',
      'flashcards',
      'quizzes',
      'exercises',
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
    })
    const reviewableItems = toReviewItems(augmented.objects)
    setPackTitle(parsed.title)
    setSourceFormat(parsed.sourceFormat)
    setReviewItems(reviewableItems)
    setWidgetGroups(
      createPreviewWidgetGroups(
        reviewableItems.map((item) => item.object),
        parsed.title,
      ),
    )
    setError(parsed.warnings[0] || augmented.warnings[0] || '')
    setStep('review')
  }

  const parseSourceWithAi = async () => {
    const credentials = resolveStudyPackAiCredentials()
    if (!credentials.apiToken) {
      setError(
        'AI mode needs a configured provider key. Add one in Settings, or switch to Basic fallback.',
      )
      return
    }

    setIsGeneratingAi(true)
    setOcrStatus('Generating study materials with AI')
    setAiProgressLabel('Connecting to Gemini')
    setError('')

    try {
      window.setTimeout(() => {
        setAiProgressLabel((current) =>
          current ? 'Reading notes and planning study sections' : current,
        )
      }, 700)
      window.setTimeout(() => {
        setAiProgressLabel((current) =>
          current ? 'Creating quizzes, flashcards, and study blocks' : current,
        )
      }, 1800)
      const draft = await generateStudyPackWithAi({
        apiToken: credentials.apiToken,
        model: credentials.model,
        title: packTitle.trim() || 'Study Pack',
        rawNotes: sourceText,
        packId: getPackId(packTitle),
        generationTargets,
        generationAmount,
      })
      const nextTitle = draft.title || packTitle
      setAiProgressLabel('Preparing review screen')
      const reviewableItems = toReviewItems(draft.objects)
      setPackTitle(nextTitle)
      setSourceFormat(draft.sourceFormat || 'text')
      setReviewItems(reviewableItems)
      setWidgetGroups(
        createPreviewWidgetGroups(
          reviewableItems.map((item) => item.object),
          nextTitle,
        ),
      )
      setError(
        draft.warnings[0] ||
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
      setOcrStatus('')
    }
  }

  const extractImageNotes = async () => {
    if (!imageFile) {
      setError('Add an image before extracting notes.')
      return
    }

    const credentials = resolveStudyPackAiCredentials()
    if (creationMode === 'ai' && !credentials.apiToken) {
      setError(
        'AI mode needs a configured provider key. Add one in Settings, or switch to Basic fallback.',
      )
      return
    }

    setIsExtractingImage(true)
    setOcrProgress(0)
    setOcrStatus(
      creationMode === 'ai' ? 'Preparing AI extraction' : 'Preparing OCR',
    )
    setAiProgressLabel(
      creationMode === 'ai' ? 'Connecting to Gemini vision' : '',
    )
    setError('')

    try {
      if (creationMode === 'ai') {
        window.setTimeout(() => {
          setAiProgressLabel((current) =>
            current ? 'Reading image and correcting text' : current,
          )
        }, 700)
      }
      const text =
        creationMode === 'ai'
          ? await extractRawNotesWithAi({
              apiToken: credentials.apiToken,
              model: credentials.model,
              image: imageFile,
            })
          : await extractRawNotesFromImage(imageFile, (progress) => {
              setOcrProgress(Math.round(progress.progress * 100))
              setOcrStatus(progress.status)
            })

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
        creationMode === 'ai' ? 'AI extraction complete' : 'OCR complete',
      )
    } catch {
      setError(
        creationMode === 'ai'
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

    if (creationMode === 'ai') {
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
        : `${getFileTitle(files[0])} Study Pack`,
    )
    setSourceFormat('text')
    setError('')
    event.target.value = ''
  }

  const toggleGenerationTarget = (target: string) => {
    setGenerationTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    )
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

  const updateReviewItem = (index: number, updates: Partial<ReviewItem>) => {
    setReviewItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    )
  }

  const removeReviewItem = (index: number) => {
    const objectId = reviewItems[index]?.object.id
    setReviewItems((items) =>
      items.filter((_, itemIndex) => itemIndex !== index),
    )
    if (objectId) {
      setWidgetGroups((groups) =>
        groups.map((group) => ({
          ...group,
          objectIds: group.objectIds.filter(
            (currentId) => currentId !== objectId,
          ),
        })),
      )
    }
  }

  const moveReviewItem = (index: number, direction: -1 | 1) => {
    setReviewItems((items) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= items.length) {
        return items
      }

      const nextItems = [...items]
      const [item] = nextItems.splice(index, 1)
      nextItems.splice(nextIndex, 0, item)
      return nextItems
    })
  }

  const addWidgetGroup = () => {
    setWidgetGroups((groups) => [
      ...groups,
      {
        id: `preview-widget-${Date.now()}-${groups.length + 1}`,
        name: `${packTitle} ${groups.length + 1}`,
        objectIds: [],
      },
    ])
  }

  const updateWidgetGroupName = (groupId: string, name: string) => {
    setWidgetGroups((groups) =>
      groups.map((group) =>
        group.id === groupId ? { ...group, name } : group,
      ),
    )
  }

  const moveItemToWidgetGroup = (objectId: string, groupId: string) => {
    setWidgetGroups((groups) =>
      groups.map((group) => ({
        ...group,
        objectIds:
          group.id === groupId
            ? Array.from(new Set([...group.objectIds, objectId]))
            : group.objectIds.filter((currentId) => currentId !== objectId),
      })),
    )
  }

  const getItemWidgetGroupId = (objectId: string): string =>
    widgetGroups.find((group) => group.objectIds.includes(objectId))?.id ||
    widgetGroups[0]?.id ||
    ''

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
      title: packTitle.trim() || 'Study Pack',
      sourceFormat,
      objects,
      warnings: [],
    }
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      includeSourceWidget,
      includeSummaryChart: includeSourceChart,
      rawSource: sourceText,
      widgetGroups: groups,
    })

    onCreatePack({
      name: packTitle.trim() || 'Study Pack',
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
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
          minHeight: { xs: '100dvh', md: 680 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AutoStoriesIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Create Study Pack
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload messy notes and turn them into an interactive study
                workspace.
              </Typography>
            </Box>
          </Stack>
          <IconButton
            aria-label="Close Create study pack"
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ bgcolor: 'background.default' }}>
        {error && (
          <Alert severity={step === 'review' ? 'info' : 'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 'source' ? (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Pack title"
                value={packTitle}
                onChange={(event) => setPackTitle(event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Mode"
                value={creationMode}
                onChange={(event) =>
                  setCreationMode(event.target.value as StudyPackCreationMode)
                }
                sx={{ minWidth: { md: 170 } }}
              >
                {creationModeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Source type"
                value={sourceInputType}
                onChange={(event) =>
                  handleSourceInputTypeChange(
                    event.target.value as SourceInputType,
                  )
                }
                sx={{ minWidth: { md: 220 } }}
              >
                {sourceOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {creationMode === 'ai' ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'primary.main',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AutoAwesomeIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800}>
                        AI mode
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Default path for Study Packs. AquaMesh can read notes
                        and generate summaries, flashcards, quizzes, and
                        practice prompts from grounded source material.
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {generationTargetOptions.map((option) => (
                      <FormControlLabel
                        key={option.key}
                        control={
                          <Checkbox
                            size="small"
                            checked={generationTargets.includes(option.key)}
                            onChange={() => toggleGenerationTarget(option.key)}
                          />
                        }
                        label={option.label}
                        sx={{
                          mr: 0.5,
                          '& .MuiFormControlLabel-label': {
                            fontSize: '0.875rem',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                  <TextField
                    select
                    label="Target amount"
                    value={generationAmount}
                    onChange={(event) =>
                      setGenerationAmount(
                        event.target.value as GenerationAmount,
                      )
                    }
                    size="small"
                    sx={{ maxWidth: 320 }}
                  >
                    {generationAmountOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label} - {option.helper}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Paper>
            ) : (
              <Alert severity="info">
                Basic mode is a fallback for offline or simple extraction. It
                creates fewer, high-confidence study blocks from explicit note
                patterns.
              </Alert>
            )}
            {sourceInputType === 'text' ? (
              <>
                <TextField
                  label="Paste notes"
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  fullWidth
                  multiline
                  minRows={16}
                  placeholder={`# Derivatives\n\nDefinition:: A derivative measures instantaneous rate of change.\n\nQ: What is the power rule?\nA: d/dx x^n = nx^(n-1)\n\n- [ ] I can explain what a derivative means`}
                />
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Upload notes
                  <input
                    hidden
                    type="file"
                    multiple
                    accept=".md,.txt,.csv,.pdf,text/markdown,text/plain,text/csv,application/pdf"
                    onChange={handleFileUpload}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Supports multiple .md, .txt, or .csv files. PDF parsing is a
                  planned upgrade; paste exported PDF text for now.
                </Typography>
              </>
            ) : (
              <>
                <Alert severity="info">
                  <b>
                    {creationMode === 'ai'
                      ? 'AI image reading can handle harder text, handwriting, and messy photos better than Basic OCR, but extracted notes still need review.'
                      : 'Text extraction works best with screenshots, slides, or exported PDFs. OCR may fail or return inaccurate text for handwritten or messy images.'}
                  </b>
                </Alert>
                <Paper
                  elevation={0}
                  onDrop={handleImageDrop}
                  onDragOver={(event) => event.preventDefault()}
                  sx={{
                    p: 3,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    minHeight: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                      <ImageIcon color="primary" sx={{ fontSize: 44 }} />
                    )}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {imageFile?.name || 'Drop an image of your notes'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        PNG, JPG, WebP, non-animated GIF, BMP, or PBM.
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
                      {creationMode !== 'ai' && (
                        <Typography variant="body2" color="text.secondary">
                          {ocrProgress}%
                        </Typography>
                      )}
                    </Stack>
                    <LinearProgress
                      variant={
                        creationMode !== 'ai' && ocrProgress > 0
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
                  minRows={10}
                  disabled={isExtractingImage}
                  placeholder="Extracted notes will appear here for review before AquaMesh creates study materials."
                  helperText={
                    imageTextExtracted
                      ? 'Review and edit the extracted notes before continuing.'
                      : 'Select an image, then extract notes.'
                  }
                />
              </>
            )}
            {isGeneratingAi && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'primary.main',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AutoAwesomeIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={800}>
                      {aiProgressLabel || ocrStatus || 'Working with AI'}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    AquaMesh is sending your notes to Gemini, waiting for a
                    structured response, then converting it into editable study
                    materials.
                  </Typography>
                  <LinearProgress />
                </Stack>
              </Paper>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  flex: 1,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <TextField
                  label="Pack title"
                  value={packTitle}
                  onChange={(event) => setPackTitle(event.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    mb: 2,
                    border: 1,
                    borderColor: 'primary.main',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      gap={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Typography variant="subtitle2" fontWeight={800}>
                        Source notes
                      </Typography>
                      <Chip label="Special" color="primary" size="small" />
                      <Chip label="Locked" size="small" />
                    </Stack>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <Chip
                        label={
                          sourceFormat === 'csv'
                            ? '1 TableBlock'
                            : '1 MarkdownBlock'
                        }
                        size="small"
                      />
                      {includeSourceChart && (
                        <Chip label={`${packTitle} Mix chart`} size="small" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Source notes stay pinned to the left when source split
                      layout is selected.
                    </Typography>
                    <Stack spacing={0.5}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={includeSourceWidget}
                            onChange={(event) => {
                              setIncludeSourceWidget(event.target.checked)
                              if (
                                !event.target.checked &&
                                layoutMode === 'orchestrator'
                              ) {
                                setLayoutMode('tabs')
                              }
                            }}
                          />
                        }
                        label={
                          sourceFormat === 'csv'
                            ? 'Create source table'
                            : 'Create source notes page'
                        }
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={includeSourceChart}
                            disabled={!includeSourceWidget}
                            onChange={(event) =>
                              setIncludeSourceChart(event.target.checked)
                            }
                          />
                        }
                        label={`Include ${packTitle || 'Study Pack'} Mix chart`}
                      />
                    </Stack>
                  </Stack>
                </Paper>
                {widgetGroups.length > 0 && (
                  <TextField
                    select
                    label="Workspace layout"
                    value={layoutMode}
                    onChange={(event) =>
                      setLayoutMode(
                        event.target.value as StudyPackDashboardLayoutMode,
                      )
                    }
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    <MenuItem
                      value="orchestrator"
                      disabled={!includeSourceWidget}
                    >
                      Source left, study materials right
                    </MenuItem>
                    <MenuItem value="tabs">Single tabset</MenuItem>
                  </TextField>
                )}
                {Object.keys(counts).length > 0 ? (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      AquaMesh found
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {`${reviewableCount}/${
                        practiceProfile.targetTotal
                      } target study blocks: ${counts.quiz || 0} quizzes, ${
                        counts.flashcard || 0
                      } flashcards, ${
                        reviewableCount -
                        (counts.quiz || 0) -
                        (counts.flashcard || 0)
                      } support.`}
                    </Typography>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      {Object.entries(counts).map(([kind, count]) => (
                        <Chip key={kind} label={`${count} ${kind}`} />
                      ))}
                    </Stack>
                  </>
                ) : (
                  <Typography variant="subtitle2" color="text.secondary">
                    AquaMesh was not able to extract any study materials from
                    these notes.
                  </Typography>
                )}
                {widgetGroups.length > 0 && (
                  <Stack spacing={1.25} sx={{ mt: 2 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Typography variant="subtitle2">
                        Generated study sections
                      </Typography>
                      <Button size="small" onClick={addWidgetGroup}>
                        Add section
                      </Button>
                    </Stack>
                    {widgetGroups.map((group) => (
                      <TextField
                        key={group.id}
                        label={`${group.objectIds.length} blocks`}
                        value={group.name}
                        onChange={(event) =>
                          updateWidgetGroupName(group.id, event.target.value)
                        }
                        size="small"
                        fullWidth
                      />
                    ))}
                  </Stack>
                )}
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  flex: 1.6,
                  border: 1,
                  borderColor: 'divider',
                  maxHeight: 500,
                  overflow: 'auto',
                }}
              >
                <Stack spacing={1.5}>
                  {reviewItems.map((item, index) => (
                    <Paper
                      key={item.object.id}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1}
                          alignItems={{ md: 'center' }}
                        >
                          <TextField
                            label="Title"
                            value={item.title}
                            onChange={(event) =>
                              updateReviewItem(index, {
                                title: event.target.value,
                              })
                            }
                            fullWidth
                          />
                          <TextField
                            select
                            label="Detected as"
                            value={item.type}
                            onChange={(event) =>
                              updateReviewItem(index, {
                                type: event.target.value as ReviewType,
                              })
                            }
                            sx={{ minWidth: 190 }}
                          >
                            {reviewTypeOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                          {widgetGroups.length > 0 && (
                            <TextField
                              select
                              label="Study section"
                              value={getItemWidgetGroupId(item.object.id)}
                              onChange={(event) =>
                                moveItemToWidgetGroup(
                                  item.object.id,
                                  event.target.value,
                                )
                              }
                              sx={{ minWidth: 210 }}
                            >
                              {widgetGroups.map((group) => (
                                <MenuItem key={group.id} value={group.id}>
                                  {group.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          )}
                        </Stack>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {getObjectPreview(item.object)}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            onClick={() => moveReviewItem(index, -1)}
                            disabled={index === 0}
                          >
                            Move up
                          </Button>
                          <Button
                            size="small"
                            onClick={() => moveReviewItem(index, 1)}
                            disabled={index === reviewItems.length - 1}
                          >
                            Move down
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => removeReviewItem(index)}
                          >
                            Remove
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </Stack>
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
              ? 'Generating...'
              : sourceInputType === 'image' && !imageTextExtracted
              ? 'Extract notes'
              : 'Continue'}
          </Button>
        ) : (
          <Button variant="contained" onClick={createPack}>
            Create pack
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default CreateStudyPackModal

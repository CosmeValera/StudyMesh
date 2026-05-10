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
import {
  createStudyPackOrchestratorWidgets,
  createStudyPackSmartWidgetGroups,
  createStudyPackWidgets,
  parseStudyPack,
  StudyObject,
  StudyObjectKind,
  StudyPackSourceFormat,
  StudyPackDashboardLayoutMode,
} from '../../studyPack'
import { extractRawNotesFromImage } from '../../studyPack/imageOcr'

type ReviewType = StudyObjectKind | 'flashcard' | 'ignore'
type SourceInputType = 'text' | 'image'

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
  { label: 'Text', value: 'text' },
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

const reviewTypeOptions: Array<{
  label: string
  value: ReviewType
}> = [
  { label: 'Flashcard', value: 'flashcard' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Reveal answer', value: 'reveal' },
  { label: 'Definition', value: 'term' },
  { label: 'Code note', value: 'code' },
  { label: 'Comparison', value: 'comparison' },
  { label: 'Sequence', value: 'sequence' },
  { label: 'Review prompt', value: 'reviewPrompt' },
  { label: 'Checklist / list', value: 'list' },
  { label: 'Table', value: 'table' },
  { label: 'Resource', value: 'resource' },
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

const getCounts = (items: ReviewItem[]) =>
  items.reduce<Record<string, number>>((counts, item) => {
    if (item.type !== 'ignore') {
      counts[item.type] = (counts[item.type] || 0) + 1
    }

    return counts
  }, {})

const getFileTitle = (file: File) =>
  file.name.replace(/\.[^.]+$/, '') || 'Study Pack'

const isSupportedImageFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase()

  return (
    supportedImageExtensions.includes(extension || '') ||
    supportedImageMimeTypes.includes(file.type)
  )
}

const toReviewItems = (objects: StudyObject[]): ReviewItem[] =>
  objects
    .filter((object) => object.kind !== 'note' && object.kind !== 'markdown')
    .map((object) => ({
      object,
      title: getObjectTitle(object),
      type: object.kind === 'qa' ? 'flashcard' : object.kind,
    }))

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
  const [sourceInputType, setSourceInputType] =
    useState<SourceInputType>('text')
  const [sourceText, setSourceText] = useState('')
  const [sourceFormat, setSourceFormat] =
    useState<StudyPackSourceFormat>('text')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [imageTextExtracted, setImageTextExtracted] = useState(false)
  const [isExtractingImage, setIsExtractingImage] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [packTitle, setPackTitle] = useState('Study Pack')
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [widgetGroups, setWidgetGroups] = useState<PreviewWidgetGroup[]>([])
  const [includeSourceWidget, setIncludeSourceWidget] = useState(true)
  const [includeSourceChart, setIncludeSourceChart] = useState(true)
  const [layoutMode, setLayoutMode] =
    useState<StudyPackDashboardLayoutMode>('orchestrator')
  const [error, setError] = useState('')

  const counts = useMemo(() => getCounts(reviewItems), [reviewItems])

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
    setOcrProgress(0)
    setOcrStatus('')
    setPackTitle('Study Pack')
    setReviewItems([])
    setWidgetGroups([])
    setIncludeSourceWidget(true)
    setIncludeSourceChart(true)
    setLayoutMode('orchestrator')
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
    const reviewableItems = toReviewItems(parsed.objects)
    setPackTitle(parsed.title)
    setSourceFormat(parsed.sourceFormat)
    setReviewItems(reviewableItems)
    setWidgetGroups(
      createPreviewWidgetGroups(
        reviewableItems.map((item) => item.object),
        parsed.title,
      ),
    )
    setError(parsed.warnings[0] || '')
    setStep('review')
  }

  const extractImageNotes = async () => {
    if (!imageFile) {
      setError('Add an image before extracting notes.')
      return
    }

    setIsExtractingImage(true)
    setOcrProgress(0)
    setOcrStatus('Preparing OCR')
    setError('')

    try {
      const text = await extractRawNotesFromImage(imageFile, (progress) => {
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
      setOcrStatus('OCR complete')
    } catch {
      setError('Could not extract notes from this image.')
      setImageTextExtracted(false)
    } finally {
      setIsExtractingImage(false)
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

    parseSource()
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['md', 'txt', 'csv'].includes(extension || '')) {
      setError('Use .md, .txt, or .csv files.')
      return
    }

    const text = await file.text()
    setSourceText(text)
    setPackTitle(file.name.replace(/\.[^.]+$/, '') || 'Study Pack')
    setSourceFormat('text')
    setError('')
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
        'Keep the source widget or add at least one generated knowledge widget.',
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
                Create study pack
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Paste notes, review AquaMesh guesses, then create a dashboard.
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
                  Upload .md, .txt, or .csv
                  <input
                    hidden
                    type="file"
                    accept=".md,.txt,.csv,text/markdown,text/plain,text/csv"
                    onChange={handleFileUpload}
                  />
                </Button>
              </>
            ) : (
              <>
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
                        PNG, JPG, WebP, non-animated GIF, BMP, or PBM. Printed
                        text and screenshots work best.
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
                        {ocrStatus || 'Extracting notes'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ocrProgress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant={
                        ocrProgress > 0 ? 'determinate' : 'indeterminate'
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
                  placeholder="Extracted notes will appear here for review before AquaMesh creates widgets."
                  helperText={
                    imageTextExtracted
                      ? 'Review and edit the extracted notes before continuing.'
                      : 'Select an image, then extract notes.'
                  }
                />
              </>
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
                        Source notes widget
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
                      First widget stays pinned to the left when source split
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
                            ? 'Create source table widget'
                            : 'Create source Markdown widget'
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
                    label="Dashboard layout"
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
                      Source left, widgets right
                    </MenuItem>
                    <MenuItem value="tabs">Single tabset</MenuItem>
                  </TextField>
                )}
                {Object.keys(counts).length > 0 ? (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      AquaMesh found
                    </Typography>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      {Object.entries(counts).map(([kind, count]) => (
                        <Chip key={kind} label={`${count} ${kind}`} />
                      ))}
                    </Stack>
                  </>
                ) : (
                  <Typography variant="subtitle2" color="text.secondary">
                    AquaMesh was not able to extract any knowledge widgets from
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
                        Generated widgets
                      </Typography>
                      <Button size="small" onClick={addWidgetGroup}>
                        Add widget
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
                              label="Widget"
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
            disabled={isExtractingImage}
          >
            {sourceInputType === 'image' && !imageTextExtracted
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

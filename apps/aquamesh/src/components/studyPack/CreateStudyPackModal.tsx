import React, { useMemo, useState } from 'react'
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
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import {
  createStudyPackWidgetsFromGroups,
  createStudyPackWidgets,
  detectMarkdownSource,
  parseStudyPack,
  StudyPackDashboardLayoutMode,
  StudyObject,
  StudyObjectKind,
  StudyPackSourceFormat,
} from '../../studyPack'

type ReviewType = StudyObjectKind | 'flashcard' | 'ignore'

interface ReviewItem {
  object: StudyObject
  title: string
  type: ReviewType
  widgetIndex: number
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

const DEFAULT_OBJECTS_PER_WIDGET = 6

const sourceOptions: Array<{
  label: string
  value: StudyPackSourceFormat
}> = [
  { label: 'Pasted notes', value: 'paste' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Plain text', value: 'text' },
  { label: 'CSV', value: 'csv' },
]

const reviewTypeOptions: Array<{
  label: string
  value: ReviewType
}> = [
  { label: 'Flashcard', value: 'flashcard' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Reveal answer', value: 'reveal' },
  { label: 'Definition', value: 'term' },
  { label: 'Study note', value: 'note' },
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

const toReviewItems = (objects: StudyObject[]): ReviewItem[] =>
  objects.map((object, index) => ({
    object,
    title: getObjectTitle(object),
    type: object.kind === 'qa' ? 'flashcard' : object.kind,
    widgetIndex: Math.floor(index / DEFAULT_OBJECTS_PER_WIDGET),
  }))

const createInitialWidgetGroups = (
  objects: StudyObject[],
  title: string,
): string[] => {
  const groupCount = Math.max(
    1,
    Math.ceil(objects.length / DEFAULT_OBJECTS_PER_WIDGET),
  )

  return Array.from({ length: groupCount }, (_value, index) =>
    index === 0 ? title : `${title} ${index + 1}`,
  )
}

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
  const [sourceText, setSourceText] = useState('')
  const [sourceFormat, setSourceFormat] =
    useState<StudyPackSourceFormat>('paste')
  const [packTitle, setPackTitle] = useState('Study Pack')
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [widgetGroups, setWidgetGroups] = useState<string[]>(['Study Pack'])
  const [layoutMode, setLayoutMode] =
    useState<StudyPackDashboardLayoutMode>('smart')
  const [error, setError] = useState('')
  const [markdownPromptOpen, setMarkdownPromptOpen] = useState(false)

  const counts = useMemo(() => getCounts(reviewItems), [reviewItems])

  const reset = () => {
    setStep('source')
    setSourceText('')
    setSourceFormat('paste')
    setPackTitle('Study Pack')
    setReviewItems([])
    setWidgetGroups(['Study Pack'])
    setLayoutMode('smart')
    setError('')
    setMarkdownPromptOpen(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const parseSourceAs = (format: StudyPackSourceFormat) => {
    const parsed = parseStudyPack(sourceText, {
      title: packTitle,
      sourceFormat: format,
      defaultTags: ['study-pack'],
    })
    setPackTitle(parsed.title)
    setSourceFormat(format)
    setReviewItems(toReviewItems(parsed.objects))
    setWidgetGroups(createInitialWidgetGroups(parsed.objects, parsed.title))
    setError(parsed.warnings[0] || '')
    setStep('review')
  }

  const parseCurrentSource = () => {
    if (!sourceText.trim()) {
      setError('Add notes before continuing.')
      return
    }

    if (
      (sourceFormat === 'paste' || sourceFormat === 'text') &&
      detectMarkdownSource(sourceText)
    ) {
      setError('')
      setMarkdownPromptOpen(true)
      return
    }

    parseSourceAs(sourceFormat)
  }

  const parseAsMarkdown = () => {
    setMarkdownPromptOpen(false)
    parseSourceAs('markdown')
  }

  const parseWithoutMarkdown = () => {
    setMarkdownPromptOpen(false)
    parseSourceAs(sourceFormat)
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
    setSourceFormat(
      extension === 'csv' ? 'csv' : extension === 'md' ? 'markdown' : 'text',
    )
    setError('')
  }

  const updateReviewItem = (index: number, updates: Partial<ReviewItem>) => {
    setReviewItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    )
  }

  const removeReviewItem = (index: number) => {
    setReviewItems((items) =>
      items.filter((_, itemIndex) => itemIndex !== index),
    )
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
      `${packTitle} ${groups.length + 1}`,
    ])
  }

  const updateWidgetGroupName = (index: number, name: string) => {
    setWidgetGroups((groups) =>
      groups.map((groupName, groupIndex) =>
        groupIndex === index ? name : groupName,
      ),
    )
  }

  const createPack = () => {
    const objects = reviewItems
      .map(applyReviewItem)
      .filter((object): object is StudyObject => Boolean(object))

    if (objects.length === 0) {
      setError('Keep at least one study item.')
      return
    }

    const pack = {
      id: packTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: packTitle.trim() || 'Study Pack',
      sourceFormat,
      objects,
      warnings: [],
    }
    const groups = widgetGroups.map((name, widgetIndex) => ({
      name: name.trim() || `${pack.title} ${widgetIndex + 1}`,
      objects: reviewItems
        .filter((item) => item.widgetIndex === widgetIndex)
        .map(applyReviewItem)
        .filter((object): object is StudyObject => Boolean(object)),
    }))
    const widgets = createStudyPackWidgetsFromGroups(pack, groups)

    onCreatePack({
      name: packTitle.trim() || 'Study Pack',
      widgets,
      layoutMode,
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
                value={sourceFormat}
                onChange={(event) =>
                  setSourceFormat(event.target.value as StudyPackSourceFormat)
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
                <Typography variant="subtitle2" gutterBottom>
                  AquaMesh found
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {Object.entries(counts).map(([kind, count]) => (
                    <Chip key={kind} label={`${count} ${kind}`} />
                  ))}
                </Stack>
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
                  sx={{ mt: 2 }}
                >
                  <MenuItem value="smart">Smart split</MenuItem>
                  <MenuItem value="tabs">Single tabset</MenuItem>
                </TextField>
                <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                  Widgets
                </Typography>
                <Stack spacing={1}>
                  {widgetGroups.map((groupName, groupIndex) => (
                    <TextField
                      key={`widget-group-${groupIndex}`}
                      label={`Widget ${groupIndex + 1}`}
                      value={groupName}
                      onChange={(event) =>
                        updateWidgetGroupName(groupIndex, event.target.value)
                      }
                      size="small"
                      fullWidth
                    />
                  ))}
                  <Button variant="outlined" onClick={addWidgetGroup}>
                    Add widget
                  </Button>
                </Stack>
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
                          <TextField
                            select
                            label="Widget"
                            value={item.widgetIndex}
                            onChange={(event) =>
                              updateReviewItem(index, {
                                widgetIndex: Number(event.target.value),
                              })
                            }
                            sx={{ minWidth: 170 }}
                          >
                            {widgetGroups.map((groupName, groupIndex) => (
                              <MenuItem
                                key={`item-widget-${groupIndex}`}
                                value={groupIndex}
                              >
                                {groupName || `Widget ${groupIndex + 1}`}
                              </MenuItem>
                            ))}
                          </TextField>
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
          <Button variant="contained" onClick={parseCurrentSource}>
            Continue
          </Button>
        ) : (
          <Button variant="contained" onClick={createPack}>
            Create pack
          </Button>
        )}
      </DialogActions>
      <Dialog
        open={markdownPromptOpen}
        onClose={() => setMarkdownPromptOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Use Markdown format?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This looks like Markdown. Do you want AquaMesh to switch the source
            type to Markdown and parse the structure?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={parseWithoutMarkdown}>Keep current format</Button>
          <Button variant="contained" onClick={parseAsMarkdown}>
            Use Markdown
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default CreateStudyPackModal

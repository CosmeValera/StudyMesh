import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

interface StudyBlockViewProps {
  type: string
  props: Record<string, unknown>
}

const STUDY_BLOCK_TYPES = [
  'FlashcardBlock',
  'QuizBlock',
  'RevealBlock',
  'StudyNoteBlock',
  'CodeBlock',
  'DefinitionBlock',
  'ComparisonBlock',
  'SequenceBlock',
  'ReviewPromptBlock',
]

export const isStudyBlockType = (type: string) =>
  STUDY_BLOCK_TYPES.includes(type)

const normalizeAnswer = (value: string) => value.trim().toLowerCase()

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

const toRows = (value: unknown): string[][] =>
  Array.isArray(value)
    ? value.map((row) => (Array.isArray(row) ? row.map(String) : [String(row)]))
    : []

const StudyBlockView: React.FC<StudyBlockViewProps> = ({ type, props }) => {
  const [flipped, setFlipped] = useState(false)
  const [selfGrade, setSelfGrade] = useState<'known' | 'missed' | ''>('')
  const [revealed, setRevealed] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [shortAnswer, setShortAnswer] = useState('')
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({})
  const [definitionStudy, setDefinitionStudy] = useState(false)
  const [reviewStatus, setReviewStatus] = useState(String(props.status || 'needsReview'))
  const options = useMemo(() => toStringArray(props.options), [props.options])
  const steps = useMemo(() => toStringArray(props.steps), [props.steps])
  const columns = useMemo(() => toStringArray(props.columns), [props.columns])
  const rows = useMemo(() => toRows(props.rows), [props.rows])

  if (type === 'FlashcardBlock') {
    const front = String(props.front || 'Question')
    const back = String(props.back || 'Answer')
    const hint = String(props.hint || '')
    const tag = String(props.tag || '')

    return (
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, cursor: 'pointer' }}
        onClick={() => setFlipped((current) => !current)}
      >
        <Stack spacing={1.25}>
          {tag && <Chip label={tag} size="small" sx={{ alignSelf: 'flex-start' }} />}
          <Typography variant="caption" color="text.secondary">
            {flipped ? 'Answer' : 'Prompt'}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {flipped ? back : front}
          </Typography>
          {!flipped && hint && (
            <Typography variant="body2" color="text.secondary">
              Hint: {hint}
            </Typography>
          )}
          {flipped && Boolean(props.selfGrade) && (
            <Stack direction="row" spacing={1} onClick={(event) => event.stopPropagation()}>
              <Button
                size="small"
                variant={selfGrade === 'known' ? 'contained' : 'outlined'}
                color="success"
                onClick={() => setSelfGrade('known')}
              >
                I knew it
              </Button>
              <Button
                size="small"
                variant={selfGrade === 'missed' ? 'contained' : 'outlined'}
                color="error"
                onClick={() => setSelfGrade('missed')}
              >
                I missed it
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    )
  }

  if (type === 'QuizBlock') {
    const question = String(props.question || 'Question')
    const quizMode = String(props.quizMode || 'multipleChoice')
    const correctIndex = Number(props.correctIndex || 0)
    const answer = String(props.answer || options[correctIndex] || '')
    const explanation = String(props.explanation || '')
    const submittedShortAnswer = Boolean(shortAnswer.trim())
    const shortAnswerCorrect =
      submittedShortAnswer && normalizeAnswer(shortAnswer) === normalizeAnswer(answer)

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            {question}
          </Typography>
          {quizMode === 'shortAnswer' ? (
            <Stack spacing={1}>
              <TextField
                label="Answer"
                value={shortAnswer}
                onChange={(event) => setShortAnswer(event.target.value)}
                size="small"
                fullWidth
              />
              {submittedShortAnswer && (
                <Typography
                  variant="body2"
                  color={shortAnswerCorrect ? 'success.main' : 'error.main'}
                >
                  {shortAnswerCorrect ? 'Correct' : `Expected: ${answer}`}
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack spacing={1}>
              {options.map((option, index) => {
                const isSelected = selectedIndex === index
                const isCorrect = index === correctIndex
                const color =
                  selectedIndex === null
                    ? 'inherit'
                    : isCorrect
                      ? 'success.main'
                      : isSelected
                        ? 'error.main'
                        : 'inherit'

                return (
                  <Button
                    key={`${option}-${index}`}
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={
                      selectedIndex !== null && isCorrect
                        ? 'success'
                        : selectedIndex !== null && isSelected
                          ? 'error'
                          : 'primary'
                    }
                    onClick={() => setSelectedIndex(index)}
                    sx={{ justifyContent: 'flex-start', color }}
                  >
                    {option}
                  </Button>
                )
              })}
            </Stack>
          )}
          {(selectedIndex !== null || submittedShortAnswer) && explanation && (
            <Typography variant="body2" color="text.secondary">
              {explanation}
            </Typography>
          )}
        </Stack>
      </Paper>
    )
  }

  if (type === 'RevealBlock') {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            {String(props.prompt || 'Prompt')}
          </Typography>
          {revealed ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {String(props.hiddenText || '')}
            </Typography>
          ) : (
            <Button variant="outlined" onClick={() => setRevealed(true)}>
              {String(props.revealLabel || 'Show answer')}
            </Button>
          )}
        </Stack>
      </Paper>
    )
  }

  if (type === 'StudyNoteBlock') {
    const suggestions = toStringArray(props.suggestedTypes)

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" fontWeight={700}>
            {String(props.title || 'Study note')}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {String(props.text || '')}
          </Typography>
          {suggestions.length > 0 && (
            <Stack direction="row" gap={1} flexWrap="wrap">
              {suggestions.map((suggestion) => (
                <Chip key={suggestion} label={suggestion} size="small" />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
    )
  }

  if (type === 'CodeBlock') {
    const title = String(props.title || 'Code note')
    const code = String(props.code || '')
    const language = String(props.language || '')
    const caption = String(props.caption || '')

    return (
      <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
        <Stack spacing={0}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={700}>
                {title}
              </Typography>
              {language && <Chip label={language} size="small" />}
            </Stack>
            {caption && (
              <Typography variant="caption" color="text.secondary">
                {caption}
              </Typography>
            )}
          </Box>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              overflowX: 'auto',
              bgcolor: '#111827',
              color: '#f9fafb',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              whiteSpace: 'pre',
              tabSize: 2,
            }}
          >
            <Box component="code">{code}</Box>
          </Box>
        </Stack>
      </Paper>
    )
  }

  if (type === 'DefinitionBlock') {
    const term = String(props.term || 'Term')
    const definition = String(props.definition || 'Definition')
    const example = String(props.example || '')
    const showDefinition = !Boolean(props.makeFlashcard) || definitionStudy

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" fontWeight={700}>
            {term}
          </Typography>
          {showDefinition ? (
            <>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {definition}
              </Typography>
              {example && (
                <Typography variant="body2" color="text.secondary">
                  Example: {example}
                </Typography>
              )}
            </>
          ) : (
            <Button variant="outlined" onClick={() => setDefinitionStudy(true)}>
              Show definition
            </Button>
          )}
        </Stack>
      </Paper>
    )
  }

  if (type === 'ComparisonBlock') {
    const columnCount = Math.max(columns.length, ...rows.map((row) => row.length), 1)

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {String(props.title || 'Comparison')}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            {columns.length > 0 && (
              <TableHead>
                <TableRow>
                  {columns.map((column, index) => (
                    <TableCell key={`${column}-${index}`} sx={{ fontWeight: 700 }}>
                      {column}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={`comparison-row-${rowIndex}`}>
                  {Array.from({ length: columnCount }, (_, cellIndex) => (
                    <TableCell key={`comparison-cell-${rowIndex}-${cellIndex}`}>
                      {row[cellIndex] || ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )
  }

  if (type === 'SequenceBlock') {
    const ordered = Boolean(props.ordered)
    const interactive = Boolean(props.interactiveChecklist)

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {String(props.title || 'Sequence')}
        </Typography>
        <Box component={ordered ? 'ol' : 'ul'} sx={{ pl: interactive ? 0 : 3, my: 0 }}>
          {steps.map((step, index) => (
            <Typography
              component="li"
              variant="body2"
              key={`${step}-${index}`}
              sx={{
                mb: 0.5,
                display: interactive ? 'flex' : 'list-item',
                alignItems: 'center',
                listStyle: interactive ? 'none' : undefined,
                textDecoration: checkedSteps[index] ? 'line-through' : 'none',
                color: checkedSteps[index] ? 'text.secondary' : 'text.primary',
              }}
            >
              {interactive && (
                <Checkbox
                  size="small"
                  checked={Boolean(checkedSteps[index])}
                  onChange={(event) =>
                    setCheckedSteps((current) => ({
                      ...current,
                      [index]: event.target.checked,
                    }))
                  }
                  sx={{ mr: 0.5, p: 0.25 }}
                />
              )}
              {step}
            </Typography>
          ))}
        </Box>
      </Box>
    )
  }

  if (type === 'ReviewPromptBlock') {
    const statusLabels: Record<string, string> = {
      needsReview: 'need review',
      reviewing: 'reviewing',
      mastered: 'mastered',
    }
    const nextStatus = {
      needsReview: 'reviewing',
      reviewing: 'mastered',
      mastered: 'needsReview',
    }[reviewStatus]
    const statusColor = reviewStatus === 'mastered' ? 'success' : 'warning'

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle1" fontWeight={700}>
              {String(props.title || 'Review this')}
            </Typography>
            <Chip
              label={statusLabels[reviewStatus] || reviewStatus}
              size="small"
              color={statusColor}
              onClick={() => setReviewStatus(nextStatus || 'needsReview')}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {String(props.prompt || '')}
          </Typography>
          {props.reason && (
            <Typography variant="body2" color="text.secondary">
              {String(props.reason)}
            </Typography>
          )}
        </Stack>
      </Paper>
    )
  }

  return null
}

export default StudyBlockView

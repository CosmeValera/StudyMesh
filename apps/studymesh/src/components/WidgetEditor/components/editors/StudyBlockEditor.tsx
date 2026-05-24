import React from 'react'
import {
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { ComponentEditorProps } from '../../types/types'

interface StudyBlockEditorProps extends ComponentEditorProps {
  blockType?: string
}

const toLines = (value: unknown): string =>
  Array.isArray(value)
    ? value.map((item) => String(item)).join('\n')
    : String(value || '')

const parseLines = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

const normalizeQuizOptions = (value: string): string[] => {
  const options = parseLines(value).slice(0, 4)

  while (options.length < 4) {
    options.push(`Option ${String.fromCharCode(65 + options.length)}`)
  }

  return options
}

const rowsToText = (value: unknown): string =>
  Array.isArray(value)
    ? value
        .map((row) =>
          Array.isArray(row) ? row.map(String).join(' | ') : String(row),
        )
        .join('\n')
    : ''

const textToRows = (value: string): string[][] =>
  value
    .split('\n')
    .map((row) => row.split('|').map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean))

const StudyBlockEditor: React.FC<StudyBlockEditorProps> = ({
  blockType: propBlockType,
  props,
  onChange,
}) => {
  const blockType = propBlockType || String(props.__blockType || '')
  const update = (key: string, value: unknown) => onChange({ [key]: value })

  if (
    blockType === 'FlashcardCarouselBlock' ||
    blockType === 'QuizCarouselBlock' ||
    blockType === 'FocusedFlashcardSessionBlock' ||
    blockType === 'FocusedQuizSessionBlock'
  ) {
    const itemCount = Array.isArray(props.items) ? props.items.length : 0

    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {blockType.includes('Flashcard')
            ? 'Flashcard carousel'
            : 'Quiz carousel'}
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <Typography variant="body2" color="text.secondary">
          {itemCount} generated item{itemCount === 1 ? '' : 's'}
        </Typography>
      </Stack>
    )
  }

  if (blockType === 'FlashcardBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Flashcard
        </Typography>
        <TextField
          label="Front"
          value={(props.front as string) || ''}
          onChange={(event) => update('front', event.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
        <TextField
          label="Back"
          value={(props.back as string) || ''}
          onChange={(event) => update('back', event.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
        <TextField
          label="Hint"
          value={(props.hint as string) || ''}
          onChange={(event) => update('hint', event.target.value)}
          fullWidth
        />
        <TextField
          label="Tag"
          value={(props.tag as string) || ''}
          onChange={(event) => update('tag', event.target.value)}
          fullWidth
        />
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(props.selfGrade)}
                onChange={(event) => update('selfGrade', event.target.checked)}
              />
            }
            label="Show self-grade buttons"
          />
        </Box>
      </Stack>
    )
  }

  if (blockType === 'QuizBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Quiz
        </Typography>
        <TextField
          label="Question"
          value={(props.question as string) || ''}
          onChange={(event) => update('question', event.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <TextField
          label="Options"
          value={toLines(props.options)}
          onChange={(event) =>
            update('options', parseLines(event.target.value))
          }
          fullWidth
          multiline
          minRows={4}
          helperText="Exactly four options. Extra lines are ignored; missing lines are filled."
          onBlur={(event) =>
            update('options', normalizeQuizOptions(event.target.value))
          }
        />
        <TextField
          label="Correct option index"
          type="number"
          value={(props.correctIndex as number) || 0}
          onChange={(event) =>
            update(
              'correctIndex',
              Math.max(0, Math.min(3, Number(event.target.value) || 0)),
            )
          }
          helperText="Use 0, 1, 2, or 3."
        />
        <TextField
          label="Correct answer"
          value={(props.answer as string) || ''}
          onChange={(event) => update('answer', event.target.value)}
          fullWidth
        />
        <TextField
          label="Explanation"
          value={(props.explanation as string) || ''}
          onChange={(event) => update('explanation', event.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
      </Stack>
    )
  }

  if (blockType === 'QuizzSingle') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Quiz single
        </Typography>
        <TextField
          label="Question"
          value={(props.question as string) || ''}
          onChange={(event) => update('question', event.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <TextField
          label="Expected answer"
          value={(props.answer as string) || ''}
          onChange={(event) => update('answer', event.target.value)}
          fullWidth
        />
        <TextField
          label="Explanation"
          value={(props.explanation as string) || ''}
          onChange={(event) => update('explanation', event.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
      </Stack>
    )
  }

  if (blockType === 'RevealBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Reveal answer
        </Typography>
        <TextField
          label="Prompt"
          value={(props.prompt as string) || ''}
          onChange={(event) => update('prompt', event.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <TextField
          label="Hidden answer"
          value={(props.hiddenText as string) || ''}
          onChange={(event) => update('hiddenText', event.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
        <TextField
          label="Reveal button label"
          value={(props.revealLabel as string) || ''}
          onChange={(event) => update('revealLabel', event.target.value)}
          fullWidth
        />
      </Stack>
    )
  }

  if (blockType === 'StudyNoteBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Study note
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Text"
          value={(props.text as string) || ''}
          onChange={(event) => update('text', event.target.value)}
          fullWidth
          multiline
          minRows={6}
        />
        <TextField
          label="Suggested types"
          value={toLines(props.suggestedTypes)}
          onChange={(event) =>
            update('suggestedTypes', parseLines(event.target.value))
          }
          fullWidth
          multiline
          minRows={3}
          helperText="One suggestion per line."
        />
      </Stack>
    )
  }

  if (blockType === 'MarkdownBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Markdown
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Markdown"
          value={(props.markdown as string) || ''}
          onChange={(event) => update('markdown', event.target.value)}
          fullWidth
          multiline
          minRows={12}
          InputProps={{
            sx: {
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              alignItems: 'flex-start',
            },
          }}
        />
      </Stack>
    )
  }

  if (blockType === 'CodeBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Code note
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Language"
          value={(props.language as string) || ''}
          onChange={(event) => update('language', event.target.value)}
          fullWidth
        />
        <TextField
          label="Code"
          value={(props.code as string) || ''}
          onChange={(event) => update('code', event.target.value)}
          fullWidth
          multiline
          minRows={10}
          InputProps={{
            sx: {
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              alignItems: 'flex-start',
            },
          }}
        />
        <TextField
          label="Caption"
          value={(props.caption as string) || ''}
          onChange={(event) => update('caption', event.target.value)}
          fullWidth
        />
      </Stack>
    )
  }

  if (blockType === 'DefinitionBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Definition
        </Typography>
        <TextField
          label="Term"
          value={(props.term as string) || ''}
          onChange={(event) => update('term', event.target.value)}
          fullWidth
        />
        <TextField
          label="Definition"
          value={(props.definition as string) || ''}
          onChange={(event) => update('definition', event.target.value)}
          fullWidth
          multiline
          minRows={4}
        />
        <TextField
          label="Example"
          value={(props.example as string) || ''}
          onChange={(event) => update('example', event.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(props.makeFlashcard)}
                onChange={(event) =>
                  update('makeFlashcard', event.target.checked)
                }
              />
            }
            label="Study definition as reveal card"
          />
        </Box>
      </Stack>
    )
  }

  if (blockType === 'ComparisonBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Comparison
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Columns"
          value={toLines(props.columns)}
          onChange={(event) =>
            update('columns', parseLines(event.target.value))
          }
          fullWidth
          multiline
          minRows={2}
          helperText="One column per line."
        />
        <TextField
          label="Rows"
          value={rowsToText(props.rows)}
          onChange={(event) => update('rows', textToRows(event.target.value))}
          fullWidth
          multiline
          minRows={6}
          helperText="One row per line. Separate cells with |."
        />
      </Stack>
    )
  }

  if (blockType === 'SequenceBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Sequence
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Steps"
          value={toLines(props.steps)}
          onChange={(event) => update('steps', parseLines(event.target.value))}
          fullWidth
          multiline
          minRows={6}
          helperText="One step per line."
        />
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(props.ordered)}
                onChange={(event) => update('ordered', event.target.checked)}
              />
            }
            label="Show as ordered list"
          />
        </Box>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(props.interactiveChecklist)}
                onChange={(event) =>
                  update('interactiveChecklist', event.target.checked)
                }
              />
            }
            label="Make steps checkable"
          />
        </Box>
      </Stack>
    )
  }

  if (blockType === 'ListBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          List
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Items"
          value={toLines(props.items)}
          onChange={(event) => update('items', event.target.value)}
          fullWidth
          multiline
          minRows={6}
          helperText="One item per line."
        />
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(props.ordered)}
                onChange={(event) => update('ordered', event.target.checked)}
              />
            }
            label="Show as ordered list"
          />
        </Box>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(props.interactiveChecklist)}
                onChange={(event) =>
                  update('interactiveChecklist', event.target.checked)
                }
              />
            }
            label="Make items checkable"
          />
        </Box>
      </Stack>
    )
  }

  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        Review prompt
      </Typography>
      <TextField
        label="Title"
        value={(props.title as string) || ''}
        onChange={(event) => update('title', event.target.value)}
        fullWidth
      />
      <TextField
        label="Prompt"
        value={(props.prompt as string) || ''}
        onChange={(event) => update('prompt', event.target.value)}
        fullWidth
        multiline
        minRows={3}
      />
      <TextField
        label="Reason"
        value={(props.reason as string) || ''}
        onChange={(event) => update('reason', event.target.value)}
        fullWidth
        multiline
        minRows={2}
      />
      <TextField
        select
        label="Status"
        value={(props.status as string) || 'needsReview'}
        onChange={(event) => update('status', event.target.value)}
      >
        <MenuItem value="needsReview">Needs review</MenuItem>
        <MenuItem value="reviewing">Reviewing</MenuItem>
        <MenuItem value="mastered">Mastered</MenuItem>
      </TextField>
    </Stack>
  )
}

export default StudyBlockEditor

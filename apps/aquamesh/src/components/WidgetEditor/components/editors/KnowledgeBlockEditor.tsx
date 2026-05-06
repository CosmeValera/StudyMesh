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

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const KnowledgeBlockEditor: React.FC<ComponentEditorProps> = ({
  props,
  onChange,
}) => {
  const blockType = String(props.__blockType || '')

  const update = (key: string, value: unknown) => {
    onChange({ [key]: value })
  }

  if (blockType === 'ImageBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Image block
        </Typography>
        <TextField
          label="Image URL"
          value={(props.src as string) || ''}
          onChange={(event) => update('src', event.target.value)}
          fullWidth
          helperText="Use an image URL for now. Upload/local media can be added in a later storage PR."
        />
        <TextField
          label="Alt text"
          value={(props.alt as string) || ''}
          onChange={(event) => update('alt', event.target.value)}
          fullWidth
        />
        <TextField
          label="Caption"
          value={(props.caption as string) || ''}
          onChange={(event) => update('caption', event.target.value)}
          fullWidth
        />
        <TextField
          label="Max height"
          type="number"
          value={(props.maxHeight as number) || 260}
          onChange={(event) =>
            update('maxHeight', parseNumber(event.target.value, 260))
          }
        />
      </Stack>
    )
  }

  if (blockType === 'PdfBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          PDF block
        </Typography>
        <TextField
          label="PDF URL"
          value={(props.src as string) || ''}
          onChange={(event) => update('src', event.target.value)}
          fullWidth
          helperText="Embeds a PDF URL when the browser allows it, with an open-link fallback."
        />
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Height"
          type="number"
          value={(props.height as number) || 420}
          onChange={(event) =>
            update('height', parseNumber(event.target.value, 420))
          }
        />
      </Stack>
    )
  }

  if (blockType === 'ListBlock') {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          List block
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <TextField
          label="Items"
          value={(props.items as string) || ''}
          onChange={(event) => update('items', event.target.value)}
          fullWidth
          multiline
          minRows={6}
          helperText="One item per line. Great for concepts, checklist-style notes, or study steps."
        />
        <TextField
          select
          label="Style"
          value={(props.ordered as boolean) ? 'ordered' : 'bulleted'}
          onChange={(event) =>
            update('ordered', event.target.value === 'ordered')
          }
        >
          <MenuItem value="bulleted">Bulleted</MenuItem>
          <MenuItem value="ordered">Numbered</MenuItem>
        </TextField>
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
        Long text block
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
        minRows={8}
      />
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(props.callout)}
              onChange={(event) => update('callout', event.target.checked)}
            />
          }
          label="Show as callout card"
        />
      </Box>
    </Stack>
  )
}

export default KnowledgeBlockEditor

import React from 'react'
import {
  Box,
  Button,
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

  const getTableHeaders = () =>
    Array.isArray(props.headers) ? (props.headers as string[]) : []

  const getTableRows = () =>
    Array.isArray(props.rows) ? (props.rows as string[][]) : []

  const updateTable = (headers: string[], rows: string[][]) => {
    onChange({ headers, rows })
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

  if (blockType === 'TableBlock') {
    const headers = getTableHeaders()
    const rows = getTableRows()
    const columnCount = Math.max(
      headers.length,
      ...rows.map((row) => row.length),
      1,
    )
    const normalizedHeaders =
      headers.length > 0
        ? headers
        : Array.from(
            { length: columnCount },
            (_, index) => `Column ${index + 1}`,
          )

    const updateHeader = (index: number, value: string) => {
      const nextHeaders = normalizedHeaders.map((header, headerIndex) =>
        headerIndex === index ? value : header,
      )
      const nextRows = rows.map((row) =>
        Array.from(
          { length: nextHeaders.length },
          (_, cellIndex) => row[cellIndex] || '',
        ),
      )
      updateTable(nextHeaders, nextRows)
    }

    const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
      const nextRows = rows.map((row, currentRowIndex) => {
        if (currentRowIndex !== rowIndex) {
          return row
        }

        return Array.from({ length: normalizedHeaders.length }, (_, index) =>
          index === cellIndex ? value : row[index] || '',
        )
      })
      updateTable(normalizedHeaders, nextRows)
    }

    const addColumn = () => {
      const nextHeaders = [
        ...normalizedHeaders,
        `Column ${normalizedHeaders.length + 1}`,
      ]
      const nextRows = rows.map((row) => [...row, ''])
      updateTable(nextHeaders, nextRows)
    }

    const removeColumn = (index: number) => {
      if (normalizedHeaders.length <= 1) {
        return
      }

      const nextHeaders = normalizedHeaders.filter(
        (_, headerIndex) => headerIndex !== index,
      )
      const nextRows = rows.map((row) =>
        row.filter((_, cellIndex) => cellIndex !== index),
      )
      updateTable(nextHeaders, nextRows)
    }

    const addRow = () => {
      updateTable(normalizedHeaders, [
        ...rows,
        Array.from({ length: normalizedHeaders.length }, () => ''),
      ])
    }

    const removeRow = (index: number) => {
      updateTable(
        normalizedHeaders,
        rows.filter((_, rowIndex) => rowIndex !== index),
      )
    }

    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Table block
        </Typography>
        <TextField
          label="Title"
          value={(props.title as string) || ''}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
        />
        <Stack spacing={1}>
          <Typography variant="subtitle2">Headers</Typography>
          {normalizedHeaders.map((header, index) => (
            <Stack
              key={`table-header-${index}`}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <TextField
                label={`Header ${index + 1}`}
                value={header}
                onChange={(event) => updateHeader(index, event.target.value)}
                fullWidth
              />
              <Button
                variant="outlined"
                color="error"
                onClick={() => removeColumn(index)}
                disabled={normalizedHeaders.length <= 1}
              >
                Remove
              </Button>
            </Stack>
          ))}
          <Box>
            <Button variant="outlined" onClick={addColumn}>
              Add column
            </Button>
          </Box>
        </Stack>
        <Stack spacing={1}>
          <Typography variant="subtitle2">Rows</Typography>
          {rows.map((row, rowIndex) => (
            <Stack key={`table-row-${rowIndex}`} spacing={1}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2">Row {rowIndex + 1}</Typography>
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeRow(rowIndex)}
                >
                  Remove row
                </Button>
              </Stack>
              <Stack spacing={1}>
                {normalizedHeaders.map((header, cellIndex) => (
                  <TextField
                    key={`table-cell-${rowIndex}-${cellIndex}`}
                    label={header || `Column ${cellIndex + 1}`}
                    value={row[cellIndex] || ''}
                    onChange={(event) =>
                      updateCell(rowIndex, cellIndex, event.target.value)
                    }
                    fullWidth
                  />
                ))}
              </Stack>
            </Stack>
          ))}
          <Box>
            <Button variant="outlined" onClick={addRow}>
              Add row
            </Button>
          </Box>
        </Stack>
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

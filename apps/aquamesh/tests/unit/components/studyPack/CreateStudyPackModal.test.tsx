/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CreateStudyPackModal from '../../../../src/components/studyPack/CreateStudyPackModal'
import { detectMarkdownSource, parseStudyPack } from '../../../../src/studyPack'

vi.mock('../../../../src/studyPack', () => ({
  createStudyPackWidgets: vi.fn(),
  createStudyPackWidgetsFromGroups: vi.fn(() => []),
  detectMarkdownSource: vi.fn(),
  parseStudyPack: vi.fn(
    (_source: string, options: { sourceFormat: string }) => ({
      id: 'study-pack',
      title: 'Study Pack',
      sourceFormat: options.sourceFormat,
      objects: [
        {
          id: 'study-pack-note-1',
          kind: 'note',
          title: 'Markdown section',
          sourceLine: 1,
          tags: [],
          body: 'Grouped markdown note',
        },
      ],
      warnings: [],
    }),
  ),
}))

describe('CreateStudyPackModal markdown detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const pasteNotes = (value: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: /^paste notes$/i }), {
      target: { value },
    })
  }

  it('asks before switching pasted notes to markdown', async () => {
    vi.mocked(detectMarkdownSource).mockReturnValue(true)

    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    pasteNotes('# Biology\n\n## Cell theory\n\n- Cells carry DNA')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(
      await screen.findByRole('dialog', { name: /use markdown format/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /use markdown/i }))

    await waitFor(() => {
      expect(parseStudyPack).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sourceFormat: 'markdown' }),
      )
    })
  })

  it('keeps the selected parser when markdown is declined', async () => {
    vi.mocked(detectMarkdownSource).mockReturnValue(true)

    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    pasteNotes('# Biology\n\n## Cell theory\n\n- Cells carry DNA')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(
      await screen.findByRole('button', {
        name: /keep current format/i,
      }),
    )

    await waitFor(() => {
      expect(parseStudyPack).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sourceFormat: 'paste' }),
      )
    })
  })

  it('does not prompt when markdown is already selected', async () => {
    vi.mocked(detectMarkdownSource).mockReturnValue(true)

    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /source type/i }))
    fireEvent.click(screen.getByRole('option', { name: /markdown/i }))
    pasteNotes('# Biology\n\n## Cell theory')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(parseStudyPack).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sourceFormat: 'markdown' }),
      )
    })
    expect(
      screen.queryByRole('dialog', { name: /use markdown format/i }),
    ).not.toBeInTheDocument()
  })
})

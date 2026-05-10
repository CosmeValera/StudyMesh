/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CreateStudyPackModal from '../../../../src/components/studyPack/CreateStudyPackModal'
import {
  createStudyPackOrchestratorWidgets,
  createStudyPackSmartWidgetGroups,
  parseStudyPack,
} from '../../../../src/studyPack'
import { extractRawNotesFromImage } from '../../../../src/studyPack/imageOcr'

vi.mock('../../../../src/studyPack/imageOcr', () => ({
  extractRawNotesFromImage: vi.fn(),
}))

vi.mock('../../../../src/studyPack', () => ({
  createStudyPackWidgets: vi.fn(),
  createStudyPackOrchestratorWidgets: vi.fn(() => [
    {
      name: 'Study Pack Source',
      components: [],
      category: 'Study Pack',
      tags: ['study-pack', 'source', 'text'],
      description: 'Original study notes rendered as Markdown.',
      version: '1.0',
      author: 'AquaMesh',
    },
  ]),
  createStudyPackSmartWidgetGroups: vi.fn((pack) => {
    const objects = pack.objects.filter(
      (object: { kind: string }) =>
        object.kind !== 'note' && object.kind !== 'markdown',
    )

    return objects.length > 0
      ? [{ name: `${pack.title} Generated`, objects }]
      : []
  }),
  parseStudyPack: vi.fn(
    (source: string, options: { sourceFormat?: string } = {}) => {
      const basePack = {
        id: 'study-pack',
        title: 'Study Pack',
        sourceFormat: options.sourceFormat || 'text',
        warnings: [],
      }

      if (source.includes('Rule,Formula')) {
        return {
          ...basePack,
          sourceFormat: 'csv',
          objects: [
            {
              id: 'study-pack-table-1',
              kind: 'table',
              title: 'CSV Table',
              sourceLine: 1,
              tags: [],
              headers: ['Rule', 'Formula'],
              rows: [['Power', 'nx^(n-1)']],
            },
          ],
        }
      }

      if (source.includes('Only loose')) {
        return {
          ...basePack,
          objects: [
            {
              id: 'study-pack-note-1',
              kind: 'note',
              title: 'Loose note',
              sourceLine: 1,
              tags: [],
              body: 'Only loose notes here',
            },
          ],
        }
      }

      return {
        ...basePack,
        objects: [
          {
            id: 'study-pack-note-1',
            kind: 'note',
            title: 'Loose note',
            sourceLine: 1,
            tags: [],
            body: 'Loose text that should stay in the source widget.',
          },
          {
            id: 'study-pack-quiz-1',
            kind: 'quiz',
            quizMode: 'shortAnswer',
            title: 'Derivative quiz',
            sourceLine: 1,
            tags: [],
            question: 'What is a derivative?',
            options: [],
            correctIndex: 0,
            answer: 'Rate of change',
            explanation: '',
          },
        ],
      }
    },
  ),
}))

describe('CreateStudyPackModal orchestrator pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(extractRawNotesFromImage).mockResolvedValue(
      'Quiz:: What is OCR? | Image text extraction',
    )
    URL.createObjectURL = vi.fn(() => 'blob:study-notes')
    URL.revokeObjectURL = vi.fn()
  })

  const pasteNotes = (value: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: /^paste notes$/i }), {
      target: { value },
    })
  }

  const selectImageSource = () => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /source type/i }))
    fireEvent.click(screen.getByRole('option', { name: /^image$/i }))
  }

  const getImageFileInput = () =>
    document.querySelector(
      'input[type="file"][accept*=".png"]',
    ) as HTMLInputElement

  it('uses text source input by default and previews generated widgets', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    expect(
      screen.getByRole('combobox', { name: /source type/i }),
    ).toHaveTextContent('Text')

    pasteNotes('# Biology\n\n## Cell theory\n\n- Cells carry DNA')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(parseStudyPack).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ defaultTags: ['study-pack'] }),
      )
    })
    expect(screen.getByText('Source notes widget')).toBeInTheDocument()
    expect(screen.getByText('1 MarkdownBlock')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Derivative quiz')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Study Pack Generated')).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /dashboard layout/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Smart split')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Loose note')).not.toBeInTheDocument()
    expect(screen.queryByText('1 note')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: /use markdown format/i }),
    ).not.toBeInTheDocument()
  })

  it('creates orchestrator widgets with the raw source and orchestrator layout', async () => {
    const onCreatePack = vi.fn()

    render(
      <CreateStudyPackModal
        open
        onClose={vi.fn()}
        onCreatePack={onCreatePack}
      />,
    )

    pasteNotes('Quiz:: What is derivative? | Rate of change')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /create pack/i }))

    expect(createStudyPackOrchestratorWidgets).toHaveBeenCalledWith(
      expect.objectContaining({ sourceFormat: 'text' }),
      expect.objectContaining({
        includeSourceWidget: true,
        includeSummaryChart: true,
        rawSource: 'Quiz:: What is derivative? | Rate of change',
        widgetGroups: [
          expect.objectContaining({
            name: 'Study Pack Generated',
            objects: [expect.objectContaining({ kind: 'quiz' })],
          }),
        ],
      }),
    )
    expect(onCreatePack).toHaveBeenCalledWith(
      expect.objectContaining({ layoutMode: 'orchestrator' }),
    )
  })

  it('can create a source-only pack when parsing only finds study notes', async () => {
    const onCreatePack = vi.fn()

    render(
      <CreateStudyPackModal
        open
        onClose={vi.fn()}
        onCreatePack={onCreatePack}
      />,
    )

    pasteNotes('Only loose notes here')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(
      await screen.findByText(
        /AquaMesh was not able to extract any knowledge widgets/i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('AquaMesh found')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', { name: /dashboard layout/i }),
    ).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /create pack/i }))

    expect(createStudyPackOrchestratorWidgets).toHaveBeenCalledWith(
      expect.objectContaining({ objects: [] }),
      expect.objectContaining({ rawSource: 'Only loose notes here' }),
    )
    expect(onCreatePack).toHaveBeenCalledWith(
      expect.objectContaining({ layoutMode: 'orchestrator' }),
    )
  })

  it('previews CSV sources as a source table widget', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    pasteNotes('Rule,Formula\nPower,nx^(n-1)')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByText('1 TableBlock')).toBeInTheDocument()
    expect(screen.getByDisplayValue('CSV Table')).toBeInTheDocument()
    expect(createStudyPackSmartWidgetGroups).toHaveBeenCalled()
  })

  it('extracts image notes before parsing the study pack', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()

    expect(screen.getByText(/drop an image of your notes/i)).toBeInTheDocument()

    const input = getImageFileInput()
    const image = new File(['image-bytes'], 'lecture.png', {
      type: 'image/png',
    })

    fireEvent.change(input, { target: { files: [image] } })
    fireEvent.click(screen.getByRole('button', { name: /extract notes/i }))

    await waitFor(() => {
      expect(extractRawNotesFromImage).toHaveBeenCalledWith(
        image,
        expect.any(Function),
      )
    })
    expect(parseStudyPack).not.toHaveBeenCalled()
    expect(
      await screen.findByDisplayValue(
        'Quiz:: What is OCR? | Image text extraction',
      ),
    ).toBeInTheDocument()
  })

  it('parses edited OCR notes and uses them as the raw source', async () => {
    const onCreatePack = vi.fn()
    render(
      <CreateStudyPackModal
        open
        onClose={vi.fn()}
        onCreatePack={onCreatePack}
      />,
    )

    selectImageSource()
    const input = getImageFileInput()
    const image = new File(['image-bytes'], 'lecture.png', {
      type: 'image/png',
    })

    fireEvent.change(input, { target: { files: [image] } })
    fireEvent.click(screen.getByRole('button', { name: /extract notes/i }))

    const extractedNotes = await screen.findByRole('textbox', {
      name: /extracted notes/i,
    })
    fireEvent.change(extractedNotes, {
      target: { value: 'Quiz:: Edited OCR question | Edited OCR answer' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /create pack/i }))

    expect(parseStudyPack).toHaveBeenCalledWith(
      'Quiz:: Edited OCR question | Edited OCR answer',
      expect.objectContaining({ defaultTags: ['study-pack'] }),
    )
    expect(createStudyPackOrchestratorWidgets).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        rawSource: 'Quiz:: Edited OCR question | Edited OCR answer',
      }),
    )
    expect(onCreatePack).toHaveBeenCalled()
  })

  it('rejects unsupported image files before OCR', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()
    const input = getImageFileInput()
    const unsupported = new File(['pdf-bytes'], 'notes.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(input, { target: { files: [unsupported] } })

    expect(
      await screen.findByText(/use a png, jpg, webp, gif, bmp, or pbm image/i),
    ).toBeInTheDocument()
    expect(extractRawNotesFromImage).not.toHaveBeenCalled()
  })
})

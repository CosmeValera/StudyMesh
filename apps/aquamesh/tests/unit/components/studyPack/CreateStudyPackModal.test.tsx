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
import {
  extractRawNotesWithAi,
  generateStudyPackWithAi,
  resolveStudyPackAiCredentials,
} from '../../../../src/studyPack/ai'

vi.mock('../../../../src/studyPack/imageOcr', () => ({
  extractRawNotesFromImage: vi.fn(),
}))

vi.mock('../../../../src/studyPack/ai', () => ({
  extractRawNotesWithAi: vi.fn(),
  generateStudyPackWithAi: vi.fn(),
  resolveStudyPackAiCredentials: vi.fn(() => ({
    apiToken: '',
    model: 'gemini-test',
    tokenSource: 'none',
  })),
}))

vi.mock('../../../../src/studyPack', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../src/studyPack')
  >('../../../../src/studyPack')

  return {
    ...actual,
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
  }
})

describe('CreateStudyPackModal orchestrator pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      apiToken: '',
      model: 'gemini-test',
      tokenSource: 'none',
    })
    vi.mocked(generateStudyPackWithAi).mockResolvedValue({
      title: 'AI Study Pack',
      sourceFormat: 'text',
      objects: [
        {
          id: 'ai-quiz-1',
          kind: 'quiz',
          quizMode: 'shortAnswer',
          sourceLine: 1,
          tags: [],
          question: 'What did AI find?',
          options: [],
          correctIndex: 0,
          answer: 'A grounded answer',
          explanation: '',
        },
      ],
      warnings: [],
    })
    vi.mocked(extractRawNotesWithAi).mockResolvedValue(
      'AI extracted handwritten notes',
    )
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

  const selectBasicMode = () => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /mode/i }))
    fireEvent.click(screen.getByRole('option', { name: /basic fallback/i }))
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

    selectBasicMode()
    expect(screen.getByText('Basic mode')).toBeInTheDocument()
    expect(screen.getByText('Practice')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Structured')).toBeInTheDocument()
    expect(screen.getByLabelText('Summaries')).toBeInTheDocument()
    expect(screen.getByLabelText('Definitions')).toBeInTheDocument()
    expect(screen.getByLabelText('Flashcards')).toBeInTheDocument()
    expect(screen.getByLabelText('Quizzes')).toBeInTheDocument()
    expect(screen.getByLabelText('Review prompts')).toBeInTheDocument()
    expect(screen.getByLabelText('Lists / steps')).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /target amount/i }),
    ).toBeInTheDocument()
    pasteNotes('# Biology\n\n## Cell theory\n\n- Cells carry DNA')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(parseStudyPack).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ defaultTags: ['study-pack'] }),
      )
    })
    expect(screen.getByText('Source notes')).toBeInTheDocument()
    expect(screen.getByText('1 MarkdownBlock')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Derivative quiz')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Study Pack Generated')).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /workspace layout/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Smart split')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Loose note')).not.toBeInTheDocument()
    expect(screen.queryByText('1 note')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: /use markdown format/i }),
    ).not.toBeInTheDocument()
  })

  it('respects selected widget types in Basic mode', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectBasicMode()
    fireEvent.click(screen.getByLabelText('Quizzes'))
    pasteNotes('Only loose notes here with one useful fact for review.')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(await screen.findByRole('button', { name: /create pack/i }))

    const createdPack = vi.mocked(createStudyPackOrchestratorWidgets).mock
      .calls[0][0]
    expect(createdPack.objects.some((object) => object.kind === 'quiz')).toBe(
      false,
    )
    expect(createdPack.objects).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'qa' })]),
    )
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

    selectBasicMode()
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
            objects: expect.arrayContaining([
              expect.objectContaining({ kind: 'quiz' }),
            ]),
          }),
        ],
      }),
    )
    expect(onCreatePack).toHaveBeenCalledWith(
      expect.objectContaining({ layoutMode: 'orchestrator' }),
    )
  })

  it('adds basic practice when parsing only finds study notes', async () => {
    const onCreatePack = vi.fn()

    render(
      <CreateStudyPackModal
        open
        onClose={vi.fn()}
        onCreatePack={onCreatePack}
      />,
    )

    selectBasicMode()
    pasteNotes('Only loose notes here with one useful fact for review.')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(await screen.findByText('AquaMesh found')).toBeInTheDocument()
    expect(screen.getByText(/target study blocks/i)).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /workspace layout/i }),
    ).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /create pack/i }))

    expect(createStudyPackOrchestratorWidgets).toHaveBeenCalledWith(
      expect.objectContaining({
        objects: expect.arrayContaining([
          expect.objectContaining({ kind: 'quiz' }),
          expect.objectContaining({ kind: 'qa' }),
        ]),
      }),
      expect.objectContaining({
        rawSource: 'Only loose notes here with one useful fact for review.',
      }),
    )
    expect(onCreatePack).toHaveBeenCalledWith(
      expect.objectContaining({ layoutMode: 'orchestrator' }),
    )
  })

  it('previews CSV sources as a source table widget', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectBasicMode()
    pasteNotes('Rule,Formula\nPower,nx^(n-1)')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByText('1 TableBlock')).toBeInTheDocument()
    expect(screen.getByDisplayValue('CSV Table')).toBeInTheDocument()
    expect(createStudyPackSmartWidgetGroups).toHaveBeenCalled()
  })

  it('requires an API key before AI mode generates widgets', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    pasteNotes('Photosynthesis happens in chloroplasts.')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(
      await screen.findByText(/configured provider key/i),
    ).toBeInTheDocument()
    expect(generateStudyPackWithAi).not.toHaveBeenCalled()
    expect(parseStudyPack).not.toHaveBeenCalled()
  })

  it('uses AI mode to generate reviewable widgets from raw text notes', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      apiToken: 'settings-token',
      model: 'gemini-test',
      tokenSource: 'settings',
    })

    pasteNotes('Photosynthesis happens in chloroplasts.')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(generateStudyPackWithAi).toHaveBeenCalledWith(
        expect.objectContaining({
          apiToken: 'settings-token',
          model: 'gemini-test',
          rawNotes: 'Photosynthesis happens in chloroplasts.',
        }),
      )
    })
    expect(
      await screen.findByDisplayValue('What did AI find?'),
    ).toBeInTheDocument()
    expect(parseStudyPack).not.toHaveBeenCalled()
  })

  it('extracts image notes before parsing the study pack', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectBasicMode()
    selectImageSource()

    expect(screen.getByText(/drop an image of your notes/i)).toBeInTheDocument()
    expect(
      screen.getByText(/works best with screenshots, slides/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/may fail or return inaccurate text for handwritten/i),
    ).toBeInTheDocument()

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

  it('uses Gemini image extraction in AI mode instead of local OCR', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      apiToken: 'settings-token',
      model: 'gemini-test',
      tokenSource: 'settings',
    })

    selectImageSource()
    const input = getImageFileInput()
    const image = new File(['image-bytes'], 'handwritten.png', {
      type: 'image/png',
    })

    fireEvent.change(input, { target: { files: [image] } })
    fireEvent.click(screen.getByRole('button', { name: /extract notes/i }))

    await waitFor(() => {
      expect(extractRawNotesWithAi).toHaveBeenCalledWith(
        expect.objectContaining({
          apiToken: 'settings-token',
          model: 'gemini-test',
          image,
        }),
      )
    })
    expect(extractRawNotesFromImage).not.toHaveBeenCalled()
    expect(
      await screen.findByDisplayValue('AI extracted handwritten notes'),
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

    selectBasicMode()
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

    selectBasicMode()
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

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
  extractNotesFromImageWithLocalLanguageModel,
  generateStudyPackWithAi,
  readStudyPackAiSettings,
  resolveStudyPackAiCredentials,
} from '../../../../src/studyPack/ai'

vi.mock('../../../../src/studyPack/imageOcr', () => ({
  extractRawNotesFromImage: vi.fn(),
}))

vi.mock('../../../../src/studyPack/ai', () => ({
  extractRawNotesWithAi: vi.fn(),
  extractNotesFromImageWithLocalLanguageModel: vi.fn(),
  generateStudyPackWithAi: vi.fn(),
  readStudyPackAiSettings: vi.fn(() => ({
    provider: 'basic',
    apiToken: '',
    model: 'gemini-test',
  })),
  resolveStudyPackAiCredentials: vi.fn(() => ({
    provider: 'basic',
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

describe('CreateStudyPackModal create from notes flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(readStudyPackAiSettings).mockReturnValue({
      provider: 'basic',
      apiToken: '',
      model: 'gemini-test',
    })
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      provider: 'basic',
      apiToken: '',
      model: 'gemini-test',
      tokenSource: 'none',
    })
    vi.mocked(generateStudyPackWithAi).mockResolvedValue({
      title: 'AI Study Pack',
      sourceFormat: 'text',
      concepts: [],
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
    vi.mocked(extractNotesFromImageWithLocalLanguageModel).mockRejectedValue(
      new Error('Local image unavailable'),
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
    fireEvent.click(screen.getByRole('button', { name: /image notes/i }))
  }

  const getImageFileInput = () =>
    document.querySelector(
      'input[type="file"][accept*=".png"]',
    ) as HTMLInputElement

  it('presents a simple Create from notes source choice and no AI Tutor controls', () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    expect(screen.getByText('Create from notes')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /text notes/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /image notes/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/AI Tutor/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Target amount/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Practice$/i)).not.toBeInTheDocument()
  })

  it('creates a dashboard from pasted notes with a compact review screen', async () => {
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

    expect(await screen.findByText('1 study blocks')).toBeInTheDocument()
    expect(screen.getByText('1 sections')).toBeInTheDocument()
    expect(screen.getByText('Notes Dashboard Generated')).toBeInTheDocument()
    expect(
      screen.queryByDisplayValue('Derivative quiz'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /create dashboard/i }))

    expect(createStudyPackOrchestratorWidgets).toHaveBeenCalledWith(
      expect.objectContaining({ sourceFormat: 'text' }),
      expect.objectContaining({
        includeSourceWidget: true,
        includeSummaryChart: false,
        rawSource: 'Quiz:: What is derivative? | Rate of change',
        widgetGroups: [
          expect.objectContaining({
            name: 'Notes Dashboard Generated',
            objects: expect.arrayContaining([
              expect.objectContaining({ kind: 'quiz' }),
            ]),
          }),
        ],
      }),
    )
    expect(onCreatePack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Notes Dashboard',
        layoutMode: 'orchestrator',
      }),
    )
  })

  it('uses configured AI generation for text notes without exposing AI Tutor mode', async () => {
    vi.mocked(readStudyPackAiSettings).mockReturnValue({
      provider: 'gemini',
      apiToken: 'settings-token',
      model: 'gemini-test',
    })
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      provider: 'gemini',
      apiToken: 'settings-token',
      model: 'gemini-test',
      tokenSource: 'settings',
    })

    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    pasteNotes('Photosynthesis happens in chloroplasts.')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(generateStudyPackWithAi).toHaveBeenCalledWith(
        expect.objectContaining({
          apiToken: 'settings-token',
          model: 'gemini-test',
          rawNotes: 'Photosynthesis happens in chloroplasts.',
          promptMode: false,
        }),
      )
    })
    expect(
      await screen.findByText('AI Study Pack Generated'),
    ).toBeInTheDocument()
  })

  it('extracts image notes before parsing the dashboard', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()
    expect(screen.getByText(/drop an image here/i)).toBeInTheDocument()

    const image = new File(['image-bytes'], 'lecture.png', {
      type: 'image/png',
    })
    fireEvent.change(getImageFileInput(), { target: { files: [image] } })
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

  it('uses Gemini image extraction when configured', async () => {
    vi.mocked(readStudyPackAiSettings).mockReturnValue({
      provider: 'gemini',
      apiToken: 'settings-token',
      model: 'gemini-test',
    })
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      provider: 'gemini',
      apiToken: 'settings-token',
      model: 'gemini-test',
      tokenSource: 'settings',
    })

    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()
    const image = new File(['image-bytes'], 'handwritten.png', {
      type: 'image/png',
    })
    fireEvent.change(getImageFileInput(), { target: { files: [image] } })
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

  it('rejects unsupported image files before OCR', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()
    const unsupported = new File(['pdf-bytes'], 'notes.pdf', {
      type: 'application/pdf',
    })
    fireEvent.change(getImageFileInput(), { target: { files: [unsupported] } })

    expect(
      await screen.findByText(/use a png, jpg, webp, gif, bmp, or pbm image/i),
    ).toBeInTheDocument()
    expect(extractRawNotesFromImage).not.toHaveBeenCalled()
  })

  it('previews CSV sources as a source table dashboard', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    pasteNotes('Rule,Formula\nPower,nx^(n-1)')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByText('Source table included')).toBeInTheDocument()
    expect(createStudyPackSmartWidgetGroups).toHaveBeenCalled()
  })
})

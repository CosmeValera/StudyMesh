/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import {
  extractTextFromPdf,
  extractTextFromPptx,
} from '../../../../src/studyPack/documentExtraction'

vi.mock('../../../../src/studyPack/imageOcr', () => ({
  extractRawNotesFromImage: vi.fn(),
}))

vi.mock('../../../../src/studyPack/ai', () => ({
  cancelAllLocalAiSessions: vi.fn(),
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

vi.mock('../../../../src/studyPack/documentExtraction', () => ({
  extractTextFromPdf: vi.fn(),
  extractTextFromPptx: vi.fn(),
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
        author: 'StudyMesh',
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
    vi.mocked(extractTextFromPdf).mockResolvedValue({
      text: '# PDF Notes\n\n## Page 1\n\nQuiz:: PDF? | Selectable text',
      warnings: [],
    })
    vi.mocked(extractTextFromPptx).mockResolvedValue({
      text: '# Slide Notes\n\n## Slide 1\n\nQuiz:: PPTX? | Slide text',
      warnings: [],
    })
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

  const getTextFileInput = () =>
    document.querySelector(
      'input[type="file"][accept*=".txt"]',
    ) as HTMLInputElement

  const getPdfFileInput = () =>
    document.querySelector(
      'input[type="file"][accept*=".pdf"]',
    ) as HTMLInputElement

  const getPowerPointFileInput = () =>
    document.querySelector(
      'input[type="file"][accept*=".pptx"]',
    ) as HTMLInputElement

  const makeTextFile = (contents: string, name: string, type: string) => {
    const file = new File([contents], name, { type })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(contents),
    })
    return file
  }

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
    expect(
      screen.getByRole('button', { name: /pdf notes/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /powerpoint notes/i }),
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

  it('combines multiple uploaded text files', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    const first = makeTextFile(
      'Quiz:: One? | First answer',
      'one.md',
      'text/markdown',
    )
    const second = makeTextFile(
      'Quiz:: Two? | Second answer',
      'two.txt',
      'text/plain',
    )
    fireEvent.change(getTextFileInput(), {
      target: { files: [first, second] },
    })

    expect(await screen.findByDisplayValue(/# one/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/# one[\s\S]*# two/i)).toBeInTheDocument()
  })

  it('appends text files uploaded in separate batches', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    const first = makeTextFile('Quiz:: One? | A', 'one.md', 'text/markdown')
    const second = makeTextFile('Quiz:: Two? | B', 'two.md', 'text/markdown')
    fireEvent.change(getTextFileInput(), { target: { files: [first] } })
    await screen.findByDisplayValue(/# one/i)

    fireEvent.change(getTextFileInput(), { target: { files: [second] } })

    expect(
      await screen.findByDisplayValue(/# one[\s\S]*---[\s\S]*# two/i),
    ).toBeInTheDocument()
  })

  it('shows Gemini elapsed and estimated Create from notes timing capped at 99%', async () => {
    vi.useFakeTimers()
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
    vi.mocked(generateStudyPackWithAi).mockImplementation(
      () => new Promise(() => undefined),
    )

    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    pasteNotes('Photosynthesis happens in chloroplasts.')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByText(/estimated total 1m/i)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(60 * 1000)
    })

    expect(screen.getByText(/elapsed 1m/i)).toBeInTheDocument()
    expect(screen.getByText('99%')).toBeInTheDocument()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
    expect(screen.getByText(/remaining 0s/i)).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('extracts image notes before parsing the dashboard', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()
    expect(screen.getByText(/drop images here/i)).toBeInTheDocument()

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
      await screen.findByDisplayValue(/# lecture[\s\S]*Quiz:: What is OCR/i),
    ).toBeInTheDocument()
  })

  it('extracts multiple images and allows removing thumbnails', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()
    const first = new File(['first-image'], 'first.png', {
      type: 'image/png',
    })
    const second = new File(['second-image'], 'second.png', {
      type: 'image/png',
    })
    fireEvent.change(getImageFileInput(), {
      target: { files: [first, second] },
    })

    expect(screen.getByAltText('first.png')).toBeInTheDocument()
    expect(screen.getByAltText('second.png')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /remove first.png/i }))
    fireEvent.click(screen.getByRole('button', { name: /extract notes/i }))

    await waitFor(() => {
      expect(extractRawNotesFromImage).toHaveBeenCalledTimes(1)
      expect(extractRawNotesFromImage).toHaveBeenCalledWith(
        second,
        expect.any(Function),
      )
    })
    expect(
      await screen.findByDisplayValue(/# second[\s\S]*Quiz:: What is OCR/i),
    ).toBeInTheDocument()
  })

  it('accumulates images selected in separate batches', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    selectImageSource()
    const first = new File(['first-image'], 'first.png', {
      type: 'image/png',
    })
    const second = new File(['second-image'], 'second.png', {
      type: 'image/png',
    })
    fireEvent.change(getImageFileInput(), { target: { files: [first] } })
    fireEvent.change(getImageFileInput(), { target: { files: [second] } })

    expect(screen.getByAltText('first.png')).toBeInTheDocument()
    expect(screen.getByAltText('second.png')).toBeInTheDocument()
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
      await screen.findByDisplayValue(/# handwritten[\s\S]*AI extracted/i),
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

  it('extracts selectable text from multiple PDFs', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf notes/i }))
    const first = new File(['pdf-1'], 'chapter-one.pdf', {
      type: 'application/pdf',
    })
    const second = new File(['pdf-2'], 'chapter-two.pdf', {
      type: 'application/pdf',
    })
    vi.mocked(extractTextFromPdf)
      .mockResolvedValueOnce({
        text: '# Chapter One\n\n## Page 1\n\nQuiz:: One? | A',
        warnings: [],
      })
      .mockResolvedValueOnce({
        text: '# Chapter Two\n\n## Page 1\n\nQuiz:: Two? | B',
        warnings: [],
      })

    fireEvent.change(getPdfFileInput(), {
      target: { files: [first, second] },
    })

    await waitFor(() => {
      expect(extractTextFromPdf).toHaveBeenCalledWith(first)
      expect(extractTextFromPdf).toHaveBeenCalledWith(second)
    })
    expect(
      await screen.findByDisplayValue(/# Chapter One[\s\S]*# Chapter Two/i),
    ).toBeInTheDocument()
  })

  it('appends PDFs uploaded in separate batches', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf notes/i }))
    const first = new File(['pdf-1'], 'one.pdf', { type: 'application/pdf' })
    const second = new File(['pdf-2'], 'two.pdf', { type: 'application/pdf' })
    vi.mocked(extractTextFromPdf)
      .mockResolvedValueOnce({
        text: '# One\n\n## Page 1\n\nQuiz:: One? | A',
        warnings: [],
      })
      .mockResolvedValueOnce({
        text: '# Two\n\n## Page 1\n\nQuiz:: Two? | B',
        warnings: [],
      })

    fireEvent.change(getPdfFileInput(), { target: { files: [first] } })
    await screen.findByDisplayValue(/# One/i)
    fireEvent.change(getPdfFileInput(), { target: { files: [second] } })

    expect(
      await screen.findByDisplayValue(/# One[\s\S]*---[\s\S]*# Two/i),
    ).toBeInTheDocument()
  })

  it('extracts slide text from PPTX and rejects legacy PPT', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /powerpoint notes/i }))
    const ppt = new File(['legacy'], 'lecture.ppt', {
      type: 'application/vnd.ms-powerpoint',
    })
    fireEvent.change(getPowerPointFileInput(), { target: { files: [ppt] } })

    expect(
      await screen.findByText(/legacy \.ppt files are not supported/i),
    ).toBeInTheDocument()

    const pptx = new File(['pptx'], 'lecture.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    fireEvent.change(getPowerPointFileInput(), { target: { files: [pptx] } })

    await waitFor(() => {
      expect(extractTextFromPptx).toHaveBeenCalledWith(pptx)
    })
    expect(
      await screen.findByDisplayValue(/# Slide Notes[\s\S]*Quiz:: PPTX/i),
    ).toBeInTheDocument()
  })

  it('appends PPTX files uploaded in separate batches', async () => {
    render(
      <CreateStudyPackModal open onClose={vi.fn()} onCreatePack={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /powerpoint notes/i }))
    const first = new File(['pptx-1'], 'one.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    const second = new File(['pptx-2'], 'two.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    vi.mocked(extractTextFromPptx)
      .mockResolvedValueOnce({
        text: '# One Slides\n\n## Slide 1\n\nQuiz:: One? | A',
        warnings: [],
      })
      .mockResolvedValueOnce({
        text: '# Two Slides\n\n## Slide 1\n\nQuiz:: Two? | B',
        warnings: [],
      })

    fireEvent.change(getPowerPointFileInput(), { target: { files: [first] } })
    await screen.findByDisplayValue(/# One Slides/i)
    fireEvent.change(getPowerPointFileInput(), {
      target: { files: [second] },
    })

    expect(
      await screen.findByDisplayValue(
        /# One Slides[\s\S]*---[\s\S]*# Two Slides/i,
      ),
    ).toBeInTheDocument()
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

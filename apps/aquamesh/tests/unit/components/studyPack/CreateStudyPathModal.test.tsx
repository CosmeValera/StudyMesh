/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import CreateStudyPathModal from '../../../../src/components/studyPack/CreateStudyPathModal'
import {
  readStudyPackAiSettings,
  resolveStudyPackAiCredentials,
} from '../../../../src/studyPack/ai'

vi.mock('../../../../src/studyPack/ai', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../src/studyPack/ai')
  >('../../../../src/studyPack/ai')

  return {
    ...actual,
    readStudyPackAiSettings: vi.fn(() => ({
      provider: 'gemini',
      apiToken: 'test-token',
      model: 'gemini-test',
    })),
    resolveStudyPackAiCredentials: vi.fn(() => ({
      provider: 'gemini',
      apiToken: 'test-token',
      model: 'gemini-test',
      tokenSource: 'settings',
    })),
  }
})

const makeDashboard = (index: number) => {
  const label = `Lesson ${index}`

  return {
    title: `${String(index).padStart(2, '0')} - ${label}`,
    summary: `${label} preview`,
    rawNotes: `${label} explains French subjunctive rules with examples, contrasts, and mistakes so the lesson has grounding.`,
    sourceSummary: {
      title: `${label} source summary`,
      bullets: [`${label} source summary bullet.`],
    },
    conceptRecap: {
      title: `${label} concept recap`,
      sections: [
        {
          title: `${label} concept recap/list`,
          bullets: [`${label} recap bullet.`],
          example: `${label} example.`,
        },
      ],
    },
    practice: {
      shortAnswer: [
        {
          question: `Complete a new ${label.toLowerCase()} example with the correct form.`,
          expectedAnswer: `${label} answer`,
          explanation: `${label} short-answer explanation.`,
        },
      ],
      multipleChoice: [
        {
          question: `Which option applies ${label.toLowerCase()} in a new context?`,
          options: [
            `${label} correct`,
            `${label} distractor A`,
            `${label} distractor B`,
          ],
          correctOptionIndex: 0,
          explanation: `${label} multiple-choice explanation.`,
        },
      ],
    },
    flashcards: [
      {
        front: `When do you use ${label.toLowerCase()}?`,
        back: `Use ${label.toLowerCase()} for the matching rule.`,
      },
    ],
  }
}

const mockGeminiDashboards = (dashboardCount: number) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'French Subjunctive Path',
                    folderName: 'French Subjunctive Path',
                    dashboards: Array.from(
                      { length: dashboardCount },
                      (_value, index) => makeDashboard(index + 1),
                    ),
                  }),
                },
              ],
            },
          },
        ],
      }),
    }),
  )
}

const generatePath = async (amount?: 'Compact' | 'Deep') => {
  render(<CreateStudyPathModal open onClose={vi.fn()} onCreatePath={vi.fn()} />)

  if (amount) {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /path depth/i }))
    fireEvent.click(
      screen.getByRole('option', { name: new RegExp(amount, 'i') }),
    )
  }

  fireEvent.change(
    screen.getByRole('textbox', { name: /what should aquamesh teach/i }),
    {
      target: { value: 'Teach French subjunctive' },
    },
  )
  fireEvent.click(screen.getByRole('button', { name: /generate study path/i }))
}

describe('CreateStudyPathModal role enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(readStudyPackAiSettings).mockReturnValue({
      provider: 'gemini',
      apiToken: 'test-token',
      model: 'gemini-test',
    })
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      provider: 'gemini',
      apiToken: 'test-token',
      model: 'gemini-test',
      tokenSource: 'settings',
    })
  })

  it('previews and creates balanced paths from role-filtered final objects', async () => {
    const onCreatePath = vi.fn()
    mockGeminiDashboards(5)
    render(
      <CreateStudyPathModal
        open
        onClose={vi.fn()}
        onCreatePath={onCreatePath}
      />,
    )

    fireEvent.change(
      screen.getByRole('textbox', { name: /what should aquamesh teach/i }),
      {
        target: { value: 'Teach French subjunctive' },
      },
    )
    fireEvent.click(
      screen.getByRole('button', { name: /generate study path/i }),
    )

    await waitFor(() => {
      expect(screen.getByText('04 - Lesson 4')).toBeInTheDocument()
      expect(screen.getByText('05 - Lesson 5')).toBeInTheDocument()
    })

    const summaryCard = screen.getByTestId('study-path-dashboard-4')
    const exercisesCard = screen.getByTestId('study-path-dashboard-5')

    expect(within(summaryCard).getByText('summary')).toBeInTheDocument()
    expect(within(summaryCard).getByText('1 study items')).toBeInTheDocument()
    expect(within(exercisesCard).getByText('exercises')).toBeInTheDocument()
    expect(
      within(exercisesCard).getByText('14 study items'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('AI generation debug'))
    const rawDashboardInput = screen.getByTestId(
      'study-path-debug-raw-dashboard-input',
    )
    const sanitizedInput = screen.getByTestId(
      'study-path-debug-role-sanitized-input-before-normalization',
    )
    const finalMapping = screen.getByTestId(
      'study-path-debug-final-studyobject-mapping',
    )
    const roleFilteredContract = screen.getByTestId(
      'study-path-debug-role-filtered-contract',
    )

    expect(roleFilteredContract).toHaveTextContent('roleFilteredContract')
    expect(rawDashboardInput).toHaveTextContent('Lesson 4 short-answer')
    expect(rawDashboardInput).toHaveTextContent('Lesson 5 concept recap/list')
    expect(sanitizedInput).not.toHaveTextContent('Lesson 4 short-answer')
    expect(sanitizedInput).not.toHaveTextContent('Lesson 5 concept recap/list')
    expect(finalMapping).not.toHaveTextContent('study-path-4-short-answer')
    expect(finalMapping).not.toHaveTextContent('study-path-4-multiple-choice')
    expect(finalMapping).not.toHaveTextContent('study-path-4-flashcard')
    expect(finalMapping).not.toHaveTextContent('study-path-5-concept-recap')
    expect(finalMapping).toHaveTextContent('study-path-4-concept-recap')
    expect(finalMapping).toHaveTextContent('study-path-5-short-answer')
    expect(finalMapping).toHaveTextContent('study-path-5-multiple-choice')
    expect(finalMapping).toHaveTextContent('study-path-5-flashcard')

    fireEvent.click(
      screen.getByRole('button', { name: /^create 5 dashboards$/i }),
    )

    expect(onCreatePath).toHaveBeenCalledTimes(1)
    const payload = onCreatePath.mock.calls[0][0]
    const summaryWidgets = JSON.stringify(payload.dashboards[3].widgets)
    const exerciseWidgets = JSON.stringify(payload.dashboards[4].widgets)

    expect(summaryWidgets).not.toContain('QuizBlock')
    expect(summaryWidgets).not.toContain('FlashcardBlock')
    expect(exerciseWidgets).toContain('QuizBlock')
    expect(exerciseWidgets).toContain('FlashcardBlock')
    expect(exerciseWidgets).not.toContain('Lesson 5 concept recap/list')
    expect(exerciseWidgets).not.toContain('Lesson 5 Summary')
  })

  it('previews compact paths with an exercises-only final dashboard', async () => {
    mockGeminiDashboards(3)
    await generatePath('Compact')

    await waitFor(() => {
      expect(screen.getByText('03 - Lesson 3')).toBeInTheDocument()
    })

    const exercisesCard = screen.getByTestId('study-path-dashboard-3')
    expect(within(exercisesCard).getByText('exercises')).toBeInTheDocument()
    expect(
      within(exercisesCard).getByText('10 study items'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('AI generation debug'))
    const finalMapping = screen.getByTestId(
      'study-path-debug-final-studyobject-mapping',
    )

    expect(finalMapping).not.toHaveTextContent('study-path-3-concept-recap')
    expect(finalMapping).toHaveTextContent('study-path-3-short-answer')
    expect(finalMapping).toHaveTextContent('study-path-3-multiple-choice')
    expect(finalMapping).toHaveTextContent('study-path-3-flashcard')
  })

  it('previews extended paths with summary and exercises final dashboards filtered', async () => {
    mockGeminiDashboards(7)
    await generatePath('Deep')

    await waitFor(() => {
      expect(screen.getByText('06 - Lesson 6')).toBeInTheDocument()
      expect(screen.getByText('07 - Lesson 7')).toBeInTheDocument()
    })

    const summaryCard = screen.getByTestId('study-path-dashboard-6')
    const exercisesCard = screen.getByTestId('study-path-dashboard-7')

    expect(within(summaryCard).getByText('summary')).toBeInTheDocument()
    expect(within(summaryCard).getByText('1 study items')).toBeInTheDocument()
    expect(within(exercisesCard).getByText('exercises')).toBeInTheDocument()
    expect(
      within(exercisesCard).getByText('18 study items'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('AI generation debug'))
    const finalMapping = screen.getByTestId(
      'study-path-debug-final-studyobject-mapping',
    )

    expect(finalMapping).not.toHaveTextContent('study-path-6-short-answer')
    expect(finalMapping).not.toHaveTextContent('study-path-6-multiple-choice')
    expect(finalMapping).not.toHaveTextContent('study-path-6-flashcard')
    expect(finalMapping).not.toHaveTextContent('study-path-7-concept-recap')
    expect(finalMapping).toHaveTextContent('study-path-6-concept-recap')
    expect(finalMapping).toHaveTextContent('study-path-7-short-answer')
    expect(finalMapping).toHaveTextContent('study-path-7-multiple-choice')
    expect(finalMapping).toHaveTextContent('study-path-7-flashcard')
  })

  it('blocks Deep Study Path when Local AI is selected', async () => {
    vi.mocked(readStudyPackAiSettings).mockReturnValue({
      provider: 'local',
      apiToken: '',
      model: 'gemini-test',
    })
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      provider: 'local',
      apiToken: '',
      model: 'gemini-test',
      tokenSource: 'none',
    })
    render(
      <CreateStudyPathModal open onClose={vi.fn()} onCreatePath={vi.fn()} />,
    )

    expect(
      screen.getByText(/Super small usually takes 2-3 min/i),
    ).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /path depth/i }))
    expect(
      screen.getByRole('option', {
        name: /Super small - 2 lesson dashboards/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: /Compact - 3 lesson dashboards/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: /Average - 5 lesson dashboards/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Deep/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('shows Local AI failure debug after failed Study Path generation', async () => {
    vi.mocked(readStudyPackAiSettings).mockReturnValue({
      provider: 'local',
      apiToken: '',
      model: 'gemini-test',
    })
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      provider: 'local',
      apiToken: '',
      model: 'gemini-test',
      tokenSource: 'none',
    })
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(
        JSON.stringify({
          title: 'Italian B1',
          folderName: 'Italian B1',
          dashboards: [
            {
              title: '01 - Modal verbs',
              goal: 'Learn modal verbs.',
              topics: ['potere', 'dovere'],
              avoid: ['summary dashboard'],
            },
            {
              title: '02 - Practice contexts',
              goal: 'Use modal verbs in context.',
              topics: ['travel', 'study'],
              avoid: ['exercises-only dashboard'],
            },
          ],
        }),
      )
      .mockResolvedValueOnce('{"title":"Broken",')
      .mockResolvedValueOnce('{"title":"Broken again",')
      .mockResolvedValueOnce('{"title":"Broken final",')
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    render(
      <CreateStudyPathModal open onClose={vi.fn()} onCreatePath={vi.fn()} />,
    )

    fireEvent.change(
      screen.getByRole('textbox', { name: /what should aquamesh teach/i }),
      {
        target: { value: 'Teach Italian B1 modal verbs' },
      },
    )
    fireEvent.click(
      screen.getByRole('button', { name: /generate study path/i }),
    )

    expect(
      await screen.findByText(/Local AI returned malformed JSON/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Local AI failure debug')).toBeInTheDocument()
    expect(
      screen.getByTestId('local-ai-failure-debug-raw-dashboard-response'),
    ).toHaveTextContent('{"title":"Broken final",')
    expect(
      screen.getByTestId('local-ai-failure-debug-parse-error'),
    ).toHaveTextContent(/JSON|Unexpected/i)
    expect(
      screen.getByTestId('local-ai-failure-debug-failed-attempts'),
    ).toHaveTextContent('Broken')
  })

  it('creates Local AI Study Path dashboards with visible source notes widgets', async () => {
    vi.mocked(readStudyPackAiSettings).mockReturnValue({
      provider: 'local',
      apiToken: '',
      model: 'gemini-test',
    })
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
      provider: 'local',
      apiToken: '',
      model: 'gemini-test',
      tokenSource: 'none',
    })
    const onCreatePath = vi.fn()
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(
        JSON.stringify({
          title: 'German A2',
          folderName: 'German A2',
          dashboards: [
            {
              title: '01 - Everyday routines',
              goal: 'Talk about routines.',
              topics: ['time phrases', 'separable verbs'],
              avoid: ['summary dashboard'],
            },
            {
              title: '02 - Travel basics',
              goal: 'Handle travel situations.',
              topics: ['tickets', 'directions'],
              avoid: ['exercises-only dashboard'],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '01 - Everyday routines',
          notes:
            '## Lesson notes\n\nGerman A2 routines use time phrases like jeden Morgen with present tense verbs.',
          flashcards: [
            {
              question: 'What does jeden Morgen mean?',
              answer: 'Every morning.',
            },
            {
              question: 'Where does a separable prefix go?',
              answer: 'To the end in simple present main clauses.',
            },
          ],
          quizzes: [
            {
              question: 'Which phrase means every morning?',
              options: ['jeden Morgen', 'gestern Abend', 'naechste Woche'],
              correctIndex: 0,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '02 - Travel basics',
          notes:
            '## Lesson notes\n\nGerman A2 travel lessons use polite requests and short direction phrases.',
          flashcards: [
            {
              question: 'What should travel requests be?',
              answer: 'Polite and short.',
            },
            {
              question: 'What is the lesson focus?',
              answer: 'Tickets and directions.',
            },
          ],
          quizzes: [
            {
              question: 'What is useful in travel situations?',
              options: ['directions', 'advanced poetry', 'chemical symbols'],
              correctIndex: 0,
            },
          ],
        }),
      )
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    render(
      <CreateStudyPathModal
        open
        onClose={vi.fn()}
        onCreatePath={onCreatePath}
      />,
    )

    fireEvent.change(
      screen.getByRole('textbox', { name: /what should aquamesh teach/i }),
      {
        target: { value: 'German A2' },
      },
    )
    fireEvent.click(
      screen.getByRole('button', { name: /generate study path/i }),
    )

    await waitFor(() => {
      expect(screen.getByText('02 - Travel basics')).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByRole('button', { name: /^create 2 dashboards$/i }),
    )

    expect(onCreatePath).toHaveBeenCalledTimes(1)
    const payload = onCreatePath.mock.calls[0][0]
    const firstDashboardWidgets = JSON.stringify(payload.dashboards[0].widgets)

    expect(firstDashboardWidgets).toContain('Source notes')
    expect(firstDashboardWidgets).toContain(
      'German A2 routines use time phrases',
    )
    expect(firstDashboardWidgets).toContain('FlashcardBlock')
    expect(firstDashboardWidgets).toContain('QuizBlock')
    expect(firstDashboardWidgets).not.toContain('"Chart"')
    expect(firstDashboardWidgets).not.toContain('Summary')
  })
})

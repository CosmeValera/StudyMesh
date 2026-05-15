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
import { resolveStudyPackAiCredentials } from '../../../../src/studyPack/ai'

vi.mock('../../../../src/studyPack/ai', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../src/studyPack/ai')
  >('../../../../src/studyPack/ai')

  return {
    ...actual,
    resolveStudyPackAiCredentials: vi.fn(() => ({
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

const generatePath = async (amount?: 'Compact' | 'Extended') => {
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
    vi.mocked(resolveStudyPackAiCredentials).mockReturnValue({
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
    await generatePath('Extended')

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
})

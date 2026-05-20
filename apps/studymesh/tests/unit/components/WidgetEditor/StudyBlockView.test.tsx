/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StudyBlockView from '../../../../src/components/WidgetEditor/components/preview/StudyBlockView'

describe('StudyBlockView', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    vi.mocked(localStorage.getItem).mockImplementation(
      (key: string) => storage.get(key) || null,
    )
    vi.mocked(localStorage.setItem).mockImplementation(
      (key: string, value: string) => {
        storage.set(key, value)
      },
    )
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      storage.delete(key)
    })
    vi.mocked(localStorage.clear).mockImplementation(() => storage.clear())
  })

  it('renders ListBlock items generated from study packs', () => {
    render(
      <StudyBlockView
        type="ListBlock"
        props={{
          title: 'factory system changed work',
          items: 'time clocks / shifts\nrepetitive jobs\nwomen + kids working',
          ordered: false,
          interactiveChecklist: false,
        }}
      />,
    )

    expect(screen.getByText('factory system changed work')).toBeInTheDocument()
    expect(screen.getByText('time clocks / shifts')).toBeInTheDocument()
    expect(screen.getByText('repetitive jobs')).toBeInTheDocument()
    expect(screen.getByText('women + kids working')).toBeInTheDocument()
  })

  it('does not render duplicate review prompt text as the reason', () => {
    render(
      <StudyBlockView
        type="ReviewPromptBlock"
        props={{
          title: 'Review later',
          prompt:
            'need memorize: laissez-faire = gov stays out of business mostly.',
          reason:
            'need memorize: laissez-faire = gov stays out of business mostly.',
          status: 'needsReview',
        }}
      />,
    )

    expect(
      screen.getAllByText(
        'need memorize: laissez-faire = gov stays out of business mostly.',
      ),
    ).toHaveLength(1)
  })

  it('records Study Path quiz attempts without filled red or green buttons', () => {
    render(
      <StudyBlockView
        type="QuizBlock"
        props={{
          question: 'When is the subjunctive used?',
          quizMode: 'multipleChoice',
          options: ['Only for past events', 'For doubt or emotion'],
          correctIndex: 1,
          answer: 'For doubt or emotion',
          explanation: 'The subjunctive expresses doubt, wish, or emotion.',
          studyPathId: 'french-b1',
          studyPathTitle: 'French B1',
          studyPathDashboardKey: 'french-b1-1',
          studyPathDashboardName: '01 - Content 1',
          studyPathDashboardIndex: 1,
          studyPathDashboardCount: 7,
          studyPathFolderName: 'French B1',
          studyPathItemId: 'quiz-1',
        }}
      />,
    )

    const wrongButton = screen.getByRole('button', {
      name: 'Only for past events',
    })
    fireEvent.click(wrongButton)

    expect(wrongButton).toHaveClass('MuiButton-outlined')
    expect(localStorage.getItem('studymesh-study-path-progress-v1')).toContain(
      '"missed":true',
    )
  })
})

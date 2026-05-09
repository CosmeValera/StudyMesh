/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import StudyBlockView from '../../../../src/components/WidgetEditor/components/preview/StudyBlockView'

describe('StudyBlockView', () => {
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
})

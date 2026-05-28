import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { KnowledgeLinkWidget } from '../../../../src/components/knowledge/KnowledgeLinkWidget'
import {
  OPEN_KNOWLEDGE_REFERENCE_EVENT,
  UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT,
} from '../../../../src/knowledgeReferences'

describe('KnowledgeLinkWidget', () => {
  it('renders references and dispatches open events', () => {
    const listener = vi.fn()
    window.addEventListener(OPEN_KNOWLEDGE_REFERENCE_EVENT, listener)

    render(
      <KnowledgeLinkWidget
        cardSize="detailed"
        references={[
          {
            id: 'ref-1',
            target: {
              type: 'studyPath',
              id: 'path-1',
              title: 'Machine Learning',
              subtitle: '4 sections',
            },
            description: 'Main tutorial path',
            createdAt: '2026-05-28T10:00:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    expect(screen.getByText('Study Path')).toBeInTheDocument()
    expect(screen.getByText('Main tutorial path')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Machine Learning'))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail.target).toEqual({
      type: 'studyPath',
      id: 'path-1',
      title: 'Machine Learning',
      subtitle: '4 sections',
    })

    window.removeEventListener(OPEN_KNOWLEDGE_REFERENCE_EVENT, listener)
  })

  it('dispatches settings updates for card size and empty-dashboard panels', () => {
    const listener = vi.fn()
    window.addEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)

    render(<KnowledgeLinkWidget references={[]} editMode />)

    fireEvent.click(screen.getByRole('button', { name: /compact cards/i }))
    expect(listener.mock.calls[0][0].detail.options).toEqual({
      cardSize: 'compact',
    })

    fireEvent.click(screen.getByRole('checkbox', { name: /creation/i }))
    expect(listener.mock.calls[1][0].detail.options).toEqual({
      showCreationActions: true,
    })

    fireEvent.click(screen.getByRole('checkbox', { name: /open material/i }))
    expect(listener.mock.calls[2][0].detail.options).toEqual({
      showOpenStudyMaterial: true,
    })

    fireEvent.click(screen.getByRole('button', { name: /3 columns per row/i }))
    expect(listener.mock.calls[3][0].detail.options).toEqual({
      columns: 3,
    })

    window.removeEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)
  })

  it('hides configuration controls in view mode', () => {
    render(<KnowledgeLinkWidget references={[]} />)

    expect(
      screen.queryByRole('button', { name: /compact cards/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: /creation/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /use for new dashboards/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the committed title immediately after renaming', () => {
    const listener = vi.fn()
    window.addEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)

    render(<KnowledgeLinkWidget references={[]} editMode />)

    fireEvent.click(screen.getByText('Study links'))
    const titleInput = screen.getByRole('textbox', {
      name: /study links dashboard name/i,
    })
    fireEvent.change(titleInput, { target: { value: 'My Exam Index' } })
    fireEvent.blur(titleInput)

    expect(screen.getByText('My Exam Index')).toBeInTheDocument()
    expect(screen.queryByText('Study links')).not.toBeInTheDocument()
    expect(listener.mock.calls.at(-1)?.[0].detail.options).toEqual({
      title: 'My Exam Index',
    })

    window.removeEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)
  })

  it('reorders study link cards in edit mode', () => {
    const listener = vi.fn()
    window.addEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)

    render(
      <KnowledgeLinkWidget
        editMode
        references={[
          {
            id: 'ref-1',
            target: {
              type: 'studyPath',
              id: 'path-1',
              title: 'Biology',
            },
            createdAt: '2026-05-28T10:00:00.000Z',
          },
          {
            id: 'ref-2',
            target: {
              type: 'dashboard',
              id: 'dashboard-1',
              title: 'Exam dashboard',
            },
            createdAt: '2026-05-28T10:01:00.000Z',
          },
        ]}
      />,
    )

    fireEvent.dragStart(screen.getByTestId('study-link-card-ref-2'))
    fireEvent.drop(screen.getByTestId('study-link-card-ref-1'))

    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          options: expect.objectContaining({
            references: expect.arrayContaining([
              expect.objectContaining({ id: 'ref-2' }),
              expect.objectContaining({ id: 'ref-1' }),
            ]),
          }),
        }),
      }),
    )
    expect(
      listener.mock.calls.at(-1)?.[0].detail.options.references[0].id,
    ).toBe('ref-2')

    window.removeEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)
  })

  it('moves and removes study links with edit controls', () => {
    const listener = vi.fn()
    window.addEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)

    render(
      <KnowledgeLinkWidget
        editMode
        references={[
          {
            id: 'ref-1',
            target: {
              type: 'studyPath',
              id: 'path-1',
              title: 'Biology',
            },
            createdAt: '2026-05-28T10:00:00.000Z',
          },
          {
            id: 'ref-2',
            target: {
              type: 'dashboard',
              id: 'dashboard-1',
              title: 'Exam dashboard',
            },
            createdAt: '2026-05-28T10:01:00.000Z',
          },
        ]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /move exam dashboard left/i }),
    )
    expect(
      listener.mock.calls.at(-1)?.[0].detail.options.references[0].id,
    ).toBe('ref-2')

    fireEvent.click(screen.getByRole('button', { name: /remove biology/i }))
    expect(listener.mock.calls.at(-1)?.[0].detail.options.references).toEqual([
      expect.objectContaining({ id: 'ref-2' }),
    ])

    window.removeEventListener(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, listener)
  })
})

/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomWidget from '../../../../src/components/WidgetEditor/CustomWidget'
import {
  WIDGET_STORAGE_UPDATED,
  WidgetStorageUpdatedDetail,
} from '../../../../src/components/WidgetEditor/WidgetStorage'

const widgetWithLabel = (text: string) => ({
  id: 'widget-1',
  name: 'Operations Summary',
  components: [
    {
      id: `label-${text}`,
      type: 'Label',
      props: { text },
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  category: 'Dashboard',
  tags: [],
  description: '',
  version: '1.0',
  author: '',
})

describe('CustomWidget live storage refresh', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null)
  })

  it('prefers storage over stale dashboard component props', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify([widgetWithLabel('Stored label')]),
    )

    render(
      <CustomWidget
        widgetId="widget-1"
        components={[
          {
            id: 'stale-label',
            type: 'Label',
            props: { text: 'Stale prop label' },
          },
        ]}
      />,
    )

    expect(screen.getByText('Stored label')).toBeInTheDocument()
    expect(screen.queryByText('Stale prop label')).not.toBeInTheDocument()
  })

  it('reloads matching widget content when storage updates', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify([widgetWithLabel('Before update')]),
    )

    render(<CustomWidget widgetId="widget-1" />)

    expect(screen.getByText('Before update')).toBeInTheDocument()

    const updatedWidget = widgetWithLabel('After update')
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify([updatedWidget]),
    )
    act(() => {
      document.dispatchEvent(
        new CustomEvent<WidgetStorageUpdatedDetail>(WIDGET_STORAGE_UPDATED, {
          detail: {
            action: 'update',
            widgetId: 'widget-1',
            name: 'Operations Summary',
            widget: updatedWidget,
          },
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText('After update')).toBeInTheDocument()
    })
  })

  it('clears content when the matching stored widget is deleted', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify([widgetWithLabel('Before delete')]),
    )

    render(<CustomWidget widgetId="widget-1" />)

    expect(screen.getByText('Before delete')).toBeInTheDocument()

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([]))
    act(() => {
      document.dispatchEvent(
        new CustomEvent<WidgetStorageUpdatedDetail>(WIDGET_STORAGE_UPDATED, {
          detail: {
            action: 'delete',
            widgetId: 'widget-1',
            name: 'Operations Summary',
          },
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText('This widget has no blocks')).toBeInTheDocument()
    })
  })

  it('renders code notes and cycles review prompt status in session', () => {
    render(
      <CustomWidget
        components={[
          {
            id: 'code-1',
            type: 'CodeBlock',
            props: {
              __blockType: 'CodeBlock',
              title: 'Nginx location',
              code: 'location / {\n  root /var/www/example.com;\n}',
              language: 'nginx',
            },
          },
          {
            id: 'review-1',
            type: 'ReviewPromptBlock',
            props: {
              __blockType: 'ReviewPromptBlock',
              title: 'Review this',
              prompt: 'Diffusion vs osmosis',
              status: 'needsReview',
            },
          },
        ]}
      />,
    )

    expect(screen.getByText('Nginx location')).toBeInTheDocument()
    expect(screen.getByText(/root \/var\/www\/example\.com/)).toBeInTheDocument()

    const status = screen.getByText('need review')
    fireEvent.click(status)
    expect(screen.getByText('reviewing')).toBeInTheDocument()
    fireEvent.click(screen.getByText('reviewing'))
    expect(screen.getByText('mastered')).toBeInTheDocument()
  })

  it('temporarily turns study notes into flashcards from suggestion chips', () => {
    render(
      <CustomWidget
        components={[
          {
            id: 'note-1',
            type: 'StudyNoteBlock',
            props: {
              __blockType: 'StudyNoteBlock',
              title: 'Cell terms',
              text: 'osmosis = water moving across membrane',
              suggestedTypes: ['definition', 'flashcard', 'review'],
            },
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByText('flashcard'))

    expect(screen.getByText('temporary flashcard')).toBeInTheDocument()
    expect(screen.getByText('osmosis')).toBeInTheDocument()

    fireEvent.click(screen.getByText('osmosis'))

    expect(screen.getByText('water moving across membrane')).toBeInTheDocument()
    expect(localStorage.setItem).toHaveBeenCalled()
  })
})

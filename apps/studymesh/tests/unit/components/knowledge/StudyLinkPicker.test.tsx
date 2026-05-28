import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  StudyLinkPicker,
  StudyLinkPickerOption,
} from '../../../../src/components/knowledge/StudyLinkPicker'

const options: StudyLinkPickerOption[] = [
  {
    id: 'studyPath||path-1',
    target: {
      type: 'studyPath',
      id: 'path-1',
      title: 'Biology Path',
      subtitle: '2 sections',
    },
  },
  {
    id: 'studyPathSection|path-1|section-1',
    target: {
      type: 'studyPathSection',
      id: 'section-1',
      parentId: 'path-1',
      title: 'Cell division',
      subtitle: 'Biology Path',
    },
    parentTitle: 'Biology Path',
  },
  {
    id: 'dashboard||dashboard-2',
    target: {
      type: 'dashboard',
      id: 'dashboard-2',
      title: 'Exam Index',
    },
  },
]

describe('StudyLinkPicker', () => {
  it('keeps Study Paths, sections, and dashboards in separate tabs', () => {
    render(
      <StudyLinkPicker
        options={options}
        selectedOptionIds={['studyPath||path-1']}
        onSelectedOptionIdsChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Biology Path')).toBeInTheDocument()
    expect(screen.queryByText('Cell division')).not.toBeInTheDocument()
    expect(screen.queryByText('Exam Index')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /sections/i }))
    expect(screen.getByText('Cell division')).toBeInTheDocument()
    expect(screen.getAllByText('Biology Path')).toHaveLength(2)
    expect(screen.queryByText('Exam Index')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /dashboards/i }))
    expect(screen.getByText('Exam Index')).toBeInTheDocument()
    expect(screen.queryByText('Cell division')).not.toBeInTheDocument()
  })

  it('selects multiple requested options', () => {
    const onSelectedOptionIdsChange = vi.fn()
    render(
      <StudyLinkPicker
        options={options}
        selectedOptionIds={['studyPath||path-1']}
        onSelectedOptionIdsChange={onSelectedOptionIdsChange}
        initialTab="dashboards"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /exam index/i }))

    expect(onSelectedOptionIdsChange).toHaveBeenCalledWith([
      'studyPath||path-1',
      'dashboard||dashboard-2',
    ])
  })
})

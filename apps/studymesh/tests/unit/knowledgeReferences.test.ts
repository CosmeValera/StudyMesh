import { describe, expect, it } from 'vitest'

import {
  addKnowledgeReferencesToLayout,
  appendKnowledgeLinkWidgetToLayout,
  createKnowledgeReference,
  getKnowledgeBacklinks,
  getKnowledgeReferencesFromLayout,
} from '../../src/knowledgeReferences'
import type { StateDashboard } from '../../src/state/store'

describe('knowledge references', () => {
  it('creates and serializes a Study Path reference', () => {
    const reference = createKnowledgeReference(
      {
        type: 'studyPath',
        id: 'path-1',
        title: 'Biology Year 1',
      },
      {
        id: 'ref-1',
        label: 'Biology index',
        createdAt: '2026-05-28T10:00:00.000Z',
      },
    )

    expect(JSON.parse(JSON.stringify(reference))).toEqual({
      id: 'ref-1',
      target: {
        type: 'studyPath',
        id: 'path-1',
        title: 'Biology Year 1',
      },
      label: 'Biology index',
      createdAt: '2026-05-28T10:00:00.000Z',
    })
  })

  it('adds link widgets to dashboard layouts and derives backlinks', () => {
    const sectionReference = createKnowledgeReference(
      {
        type: 'studyPathSection',
        id: 'lesson-2',
        parentId: 'path-1',
        title: 'Cell division',
      },
      { id: 'section-ref', createdAt: '2026-05-28T10:00:00.000Z' },
    )
    const layout = appendKnowledgeLinkWidgetToLayout(
      { type: 'row', children: [] },
      [sectionReference],
      'Cell division',
    )
    const dashboards: StateDashboard[] = [
      {
        id: 'dashboard-1',
        name: 'Exam Prep',
        layout,
      },
    ]

    expect(getKnowledgeReferencesFromLayout(layout)).toHaveLength(1)
    expect(
      getKnowledgeBacklinks(dashboards, {
        type: 'studyPathSection',
        id: 'lesson-2',
        parentId: 'path-1',
        title: 'Cell division',
      }),
    ).toEqual([
      expect.objectContaining({
        dashboardId: 'dashboard-1',
        dashboardName: 'Exam Prep',
        widgetName: 'Cell division',
      }),
    ])
  })

  it('appends references to an existing knowledge widget on index dashboards', () => {
    const firstReference = createKnowledgeReference(
      {
        type: 'studyPath',
        id: 'path-1',
        title: 'Machine Learning',
      },
      { id: 'ref-1', createdAt: '2026-05-28T10:00:00.000Z' },
    )
    const secondReference = createKnowledgeReference(
      {
        type: 'studyPath',
        id: 'path-2',
        title: 'Statistics',
      },
      { id: 'ref-2', createdAt: '2026-05-28T10:01:00.000Z' },
    )

    const layout = addKnowledgeReferencesToLayout(undefined, [firstReference])
    const updatedLayout = addKnowledgeReferencesToLayout(layout, [
      secondReference,
    ])

    expect(
      getKnowledgeReferencesFromLayout(updatedLayout).map(
        ({ reference }) => reference.target.title,
      ),
    ).toEqual(['Machine Learning', 'Statistics'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildDashboardChatContext,
  selectDashboardChatChunks,
} from '../../../src/dashboardChat/contextBuilder'

const dashboard = {
  id: 'dashboard-1',
  name: 'French Subjunctive',
  layout: {
    type: 'row',
    children: [
      {
        type: 'tabset',
        children: [
          {
            type: 'tab',
            name: 'Source notes',
            component: 'CustomWidget',
            config: {
              customProps: {
                components: [
                  {
                    id: 'source-markdown',
                    type: 'MarkdownBlock',
                    props: {
                      __blockType: 'MarkdownBlock',
                      title: 'Source notes',
                      markdown:
                        'Use the subjunctive after il faut que and other trigger phrases.',
                    },
                  },
                  {
                    id: 'quiz',
                    type: 'QuizBlock',
                    props: {
                      __blockType: 'QuizBlock',
                      question: 'Which mood follows il faut que?',
                      answer: 'The subjunctive.',
                      explanation: 'Il faut que is a subjunctive trigger.',
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  },
}

describe('dashboard chat context builder', () => {
  it('extracts useful source chunks from dashboard widget custom props', () => {
    const context = buildDashboardChatContext(dashboard)

    expect(context.dashboardTitle).toBe('French Subjunctive')
    expect(context.chunks).toHaveLength(2)
    expect(context.chunks[0].text).toContain('subjunctive')
    expect(context.chunks[1].text).toContain('Which mood follows')
  })

  it('ranks chunks by the user question', () => {
    const context = buildDashboardChatContext(dashboard)
    const chunks = selectDashboardChatChunks(context, 'trigger phrases')

    expect(chunks[0].title).toBe('Source notes')
  })

  it('extracts source chunks from dashboards inside a study path workspace', () => {
    const context = buildDashboardChatContext({
      id: 'path-1',
      name: 'Spanish Study Path Workspace',
      kind: 'studyPathContainer',
      layout: {
        type: 'row',
        children: [],
      },
      studyPath: {
        pathId: 'spanish-path',
        title: 'Spanish Basics',
        folderName: 'Spanish',
        selectedIndex: 0,
        dashboards: [
          {
            id: 'lesson-dashboard',
            name: 'Lesson 1',
            dashboardKey: 'lesson-1',
            dashboardIndex: 0,
            dashboardCount: 1,
            folderName: 'Spanish',
            layout: dashboard.layout,
          },
        ],
      },
    })

    expect(context.dashboardTitle).toBe('Spanish Basics')
    expect(context.chunks).toHaveLength(2)
    expect(context.chunks[0].title).toBe('Lesson 1: Source notes')
    expect(context.chunks[0].text).toContain('subjunctive')
  })
})

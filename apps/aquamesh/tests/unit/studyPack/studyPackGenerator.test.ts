import { describe, expect, it } from 'vitest'
import {
  createStudyPackDashboardLayout,
  createStudyPackOrchestratorWidgets,
  createStudyPackWidgets,
  createStudyPackWidgetsFromGroups,
  parseStudyPack,
} from '../../../src/studyPack'

describe('study pack generator', () => {
  it('creates widgets with study-native blocks and dashboard CustomWidget tabs', () => {
    const pack = parseStudyPack(
      `# Derivatives

| Rule | Formula |
|---|---|
| Power | nx^(n-1) |

Q: What is derivative?
A: Rate of change

Definition:: Power rule: d/dx x^n = nx^(n-1)
Reveal:: Mitosis order | Prophase, metaphase, anaphase
Quiz:: Which rule handles x^n? | Power rule | Chain rule | Product rule
\`\`\`nginx
location / {
  root /var/www/example.com;
}
\`\`\`
review this because it is probably important`,
    )
    const widgets = createStudyPackWidgets(pack, { maxObjectsPerWidget: 12 })
    const layout = createStudyPackDashboardLayout(widgets)

    expect(widgets).toHaveLength(1)
    expect(widgets[0]).toMatchObject({
      name: 'Derivatives',
      category: 'Study Pack',
      tags: ['study-pack', 'markdown-table'],
      author: 'AquaMesh',
    })
    expect(JSON.stringify(widgets[0].components)).toContain('"TableBlock"')
    expect(JSON.stringify(widgets[0].components)).toContain('"FlashcardBlock"')
    expect(JSON.stringify(widgets[0].components)).toContain('"DefinitionBlock"')
    expect(JSON.stringify(widgets[0].components)).toContain('"QuizBlock"')
    expect(JSON.stringify(widgets[0].components)).toContain('"CodeBlock"')
    expect(JSON.stringify(widgets[0].components)).toContain(
      '"ReviewPromptBlock"',
    )
    expect(layout.children?.[0].children?.[0]).toMatchObject({
      type: 'tab',
      name: 'Derivatives',
      component: 'CustomWidget',
      config: {
        customProps: {
          widgetId: widgets[0].id,
        },
      },
    })
  })

  it('creates one markdown block when the study pack source is markdown', () => {
    const pack = parseStudyPack(
      `# Biology

## Cell theory

- Cells are the basic unit of life
- Cells come from existing cells`,
      { sourceFormat: 'markdown' },
    )
    const widgets = createStudyPackWidgets(pack)

    expect(pack.objects).toHaveLength(1)
    expect(widgets).toHaveLength(1)
    expect(widgets[0].components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MarkdownBlock',
          props: expect.objectContaining({
            __blockType: 'MarkdownBlock',
            title: 'Biology',
            markdown: expect.stringContaining('## Cell theory'),
          }),
        }),
      ]),
    )
  })

  it('splits generated dashboards into smart panes and tabs overflow widgets after four panes', () => {
    const pack = parseStudyPack(
      'Alpha:: one\nBeta:: two\nGamma:: three\nDelta:: four\nEpsilon:: five',
    )
    const widgets = createStudyPackWidgetsFromGroups(pack, [
      { name: 'Widget 1', objects: [pack.objects[0]] },
      { name: 'Widget 2', objects: [pack.objects[1]] },
      { name: 'Widget 3', objects: [pack.objects[2]] },
      { name: 'Widget 4', objects: [pack.objects[3]] },
      { name: 'Widget 5', objects: [pack.objects[4]] },
    ])
    const smartLayout = createStudyPackDashboardLayout(widgets)
    const tabbedLayout = createStudyPackDashboardLayout(widgets, {
      mode: 'tabs',
    })

    expect(smartLayout.children).toHaveLength(2)
    expect(smartLayout.children?.[0].children?.[0].children).toHaveLength(2)
    expect(smartLayout.children?.[1].children?.[0].children).toHaveLength(1)
    expect(tabbedLayout.children?.[0].children).toHaveLength(5)
  })

  it('creates orchestrator widgets with source notes on the left and useful generated widgets on the right', () => {
    const pack = parseStudyPack(
      `Loose sentence that should stay out of generated widgets.

Quiz:: One? | A | B | C
Quiz:: Two? | A | B | C
Quiz:: Three? | A | B | C
Q: Front
A: Back
- first list item
- second list item`,
      { sourceFormat: 'text' },
    )
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      rawSource: 'Raw **source** notes',
    })
    const layout = createStudyPackDashboardLayout(widgets, {
      mode: 'orchestrator',
    })

    expect(widgets[0]).toMatchObject({
      name: `${pack.title} Source`,
      tags: ['study-pack', 'source', 'text'],
    })
    expect(widgets[0].components.map((component) => component.type)).toEqual([
      'Label',
      'Chart',
      'MarkdownBlock',
    ])
    expect(widgets[0].components[1]).toMatchObject({
      type: 'Chart',
      props: expect.objectContaining({
        title: `${pack.title} Mix`,
        chartType: 'pie',
        data: expect.stringContaining('"source"'),
      }),
    })
    expect(widgets[0].components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MarkdownBlock',
          props: expect.objectContaining({
            markdown: 'Raw **source** notes',
          }),
        }),
      ]),
    )
    expect(widgets.map((widget) => widget.name)).toEqual([
      `${pack.title} Source`,
      `${pack.title} Summary`,
      `${pack.title} Quizzes`,
      `${pack.title} Misc`,
    ])
    expect(JSON.stringify(widgets.slice(1))).not.toContain('"Chart"')
    expect(JSON.stringify(widgets.slice(1))).not.toContain('StudyNoteBlock')
    expect(layout.children?.[0].children?.[0]).toMatchObject({
      type: 'tab',
      name: `${pack.title} Source`,
    })
    expect(layout.children?.[0].children?.[1]).toMatchObject({
      type: 'tab',
      name: `${pack.title} Summary`,
    })
    expect(layout.children?.[0].weight).toBe(50)
    expect(layout.children?.[1].weight).toBe(50)
    expect(layout.children?.[1].children).toHaveLength(2)
  })

  it('does not create generated widgets when only study notes are detected', () => {
    const pack = parseStudyPack('Loose sentence only', { sourceFormat: 'text' })
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      rawSource: 'Loose sentence only',
    })

    expect(widgets).toHaveLength(2)
    expect(JSON.stringify(widgets)).not.toContain('StudyNoteBlock')
  })

  it('creates right-side generated widgets from prose definitions and facts', () => {
    const source =
      'Photosynthesis is a biological process used by plants, algae, and some bacteria to convert light energy into chemical energy. It usually takes place in chloroplasts that contain chlorophyll. The process produces oxygen as a byproduct and stores energy in sugars. Photosynthesis supports most food chains because organisms depend on plant biomass.'
    const pack = parseStudyPack(source, { sourceFormat: 'text' })
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      rawSource: source,
    })

    expect(pack.objects.map((object) => object.kind)).toEqual([
      'term',
      'list',
      'note',
    ])
    expect(widgets.map((widget) => widget.name)).toEqual([
      `${pack.title} Source`,
      `${pack.title} Summary`,
      `${pack.title} Misc`,
    ])
    expect(JSON.stringify(widgets.slice(1))).toContain('DefinitionBlock')
    expect(JSON.stringify(widgets.slice(1))).toContain('ListBlock')
    expect(JSON.stringify(widgets.slice(1))).not.toContain('StudyNoteBlock')
  })

  it('can create a CSV source widget as a table without the source chart', () => {
    const pack = parseStudyPack('Rule,Formula\nPower,nx^(n-1)', {
      title: 'Rules',
    })
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      includeSummaryChart: false,
      rawSource: 'Rule,Formula\nPower,nx^(n-1)',
    })

    expect(widgets[0]).toMatchObject({
      name: 'Rules Source',
      tags: ['study-pack', 'source', 'csv'],
    })
    expect(widgets[0].components.map((component) => component.type)).toEqual([
      'Label',
      'TableBlock',
    ])
    expect(widgets[0].components[1]).toMatchObject({
      type: 'TableBlock',
      props: expect.objectContaining({
        headers: ['Rule', 'Formula'],
        rows: [['Power', 'nx^(n-1)']],
      }),
    })
    expect(JSON.stringify(widgets)).not.toContain('"Chart"')
  })

  it('adds Study Path progress metadata and a source summary tab', () => {
    const pack = parseStudyPack(
      `Quiz:: Which rule handles x^n? | Power rule | Chain rule | Product rule
Q: When is the power rule used?
A: When differentiating x raised to a constant power.`,
      { title: 'Derivatives', sourceFormat: 'text' },
    )
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      rawSource: 'The power rule differentiates x raised to a constant power.',
      studyPath: {
        pathId: 'derivatives-path',
        title: 'Derivatives Path',
        dashboardKey: 'derivatives-path-1',
        dashboardName: '01 - Content 1',
        dashboardIndex: 1,
        dashboardCount: 7,
        folderName: 'Derivatives Path',
      },
    })
    const serialized = JSON.stringify(widgets)

    expect(widgets.map((widget) => widget.name)).toEqual([
      'Derivatives Source',
      'Derivatives Summary',
      'Derivatives Misc',
    ])
    expect(serialized).toContain('StudyPathProgressBlock')
    expect(serialized).toContain('studyPathItemId')
    expect(serialized).toContain('derivatives-path-1')
  })

  it('can skip the source widget and use caller-provided widget groups', () => {
    const pack = parseStudyPack(
      `Quiz:: One? | A | B | C
Q: Front
A: Back`,
      { sourceFormat: 'text' },
    )
    const widgets = createStudyPackOrchestratorWidgets(pack, {
      includeSourceWidget: false,
      widgetGroups: [
        {
          name: 'Practice',
          objects: pack.objects.filter((object) => object.kind === 'quiz'),
        },
      ],
    })

    expect(widgets).toHaveLength(1)
    expect(widgets[0].name).toBe('Practice')
    expect(JSON.stringify(widgets)).not.toContain('Source notes')
    expect(JSON.stringify(widgets)).not.toContain('"Chart"')
  })
})

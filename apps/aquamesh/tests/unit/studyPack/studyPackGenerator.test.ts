import { describe, expect, it } from 'vitest'
import {
  createStudyPackDashboardLayout,
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
    expect(JSON.stringify(widgets[0].components)).toContain('"ReviewPromptBlock"')
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

  it('splits generated dashboards into smart panes and tabs overflow widgets after four panes', () => {
    const pack = parseStudyPack('Alpha:: one\nBeta:: two\nGamma:: three\nDelta:: four\nEpsilon:: five')
    const widgets = createStudyPackWidgetsFromGroups(pack, [
      { name: 'Widget 1', objects: [pack.objects[0]] },
      { name: 'Widget 2', objects: [pack.objects[1]] },
      { name: 'Widget 3', objects: [pack.objects[2]] },
      { name: 'Widget 4', objects: [pack.objects[3]] },
      { name: 'Widget 5', objects: [pack.objects[4]] },
    ])
    const smartLayout = createStudyPackDashboardLayout(widgets)
    const tabbedLayout = createStudyPackDashboardLayout(widgets, { mode: 'tabs' })

    expect(smartLayout.children).toHaveLength(2)
    expect(smartLayout.children?.[0].children?.[0].children).toHaveLength(2)
    expect(smartLayout.children?.[1].children?.[0].children).toHaveLength(1)
    expect(tabbedLayout.children?.[0].children).toHaveLength(5)
  })
})

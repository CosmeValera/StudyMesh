import { describe, expect, it } from 'vitest'
import {
  createStudyPackDashboardLayout,
  createStudyPackWidgets,
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
review this because it is probably important`,
    )
    const widgets = createStudyPackWidgets(pack)
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
    expect(JSON.stringify(widgets[0].components)).toContain('"RevealBlock"')
    expect(JSON.stringify(widgets[0].components)).toContain('"QuizBlock"')
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
})

import { describe, expect, it } from 'vitest'
import {
  createStudyPackDashboardLayout,
  createStudyPackWidgets,
  parseStudyPack,
} from '../../../src/studyPack'

describe('study pack generator', () => {
  it('creates widgets with TableBlock and dashboard CustomWidget tabs', () => {
    const pack = parseStudyPack(
      `# Derivatives

| Rule | Formula |
|---|---|
| Power | nx^(n-1) |

Q: What is derivative?
A: Rate of change`,
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

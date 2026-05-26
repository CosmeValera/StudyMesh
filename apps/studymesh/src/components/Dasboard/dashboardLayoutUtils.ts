import { DashboardLayout } from '../../state/store'
import type { DashboardEditorWidgetConfig } from './dashboardEditorTypes'

export const createDashboardTabFromWidget = (
  componentConfig: DashboardEditorWidgetConfig,
): DashboardLayout => ({
  type: 'tab',
  name: componentConfig.name,
  component: componentConfig.component,
  config: componentConfig.customProps
    ? { customProps: componentConfig.customProps }
    : undefined,
})

export const createLayoutWithComponent = (
  componentConfig: DashboardEditorWidgetConfig,
): DashboardLayout => ({
  type: 'row',
  weight: 100,
  children: [
    {
      type: 'tabset',
      weight: 100,
      active: true,
      children: [createDashboardTabFromWidget(componentConfig)],
    },
  ],
})

export const collectDashboardWidgetTabs = (
  layout?: DashboardLayout,
): DashboardLayout[] => {
  if (!layout) {
    return []
  }

  if (layout.type === 'tab' && layout.component) {
    return [layout]
  }

  return (layout.children || []).flatMap((child) =>
    collectDashboardWidgetTabs(child),
  )
}

export const createMobileOrderedWidgetLayout = (
  widgetTabs: DashboardLayout[],
): DashboardLayout => ({
  type: 'row',
  weight: 100,
  children: widgetTabs.map((widgetTab, index) => ({
    type: 'tabset',
    weight: 100 / Math.max(widgetTabs.length, 1),
    active: index === 0,
    children: [widgetTab],
  })),
})

export const hasDashboardContent = (layout?: DashboardLayout): boolean => {
  if (!layout) {
    return false
  }

  if (layout.type === 'tab' && Boolean(layout.component)) {
    return true
  }

  return Boolean(layout.children?.some((child) => hasDashboardContent(child)))
}

export const countDashboardNodes = (
  layout?: DashboardLayout,
): { tabCount: number; tabsetCount: number } => {
  if (!layout) {
    return { tabCount: 0, tabsetCount: 0 }
  }

  const childCounts = (layout.children || []).reduce(
    (counts, child) => {
      const next = countDashboardNodes(child)
      return {
        tabCount: counts.tabCount + next.tabCount,
        tabsetCount: counts.tabsetCount + next.tabsetCount,
      }
    },
    { tabCount: 0, tabsetCount: 0 },
  )

  return {
    tabCount: childCounts.tabCount + (layout.type === 'tab' ? 1 : 0),
    tabsetCount: childCounts.tabsetCount + (layout.type === 'tabset' ? 1 : 0),
  }
}

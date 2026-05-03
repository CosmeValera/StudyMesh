import { useCallback } from 'react'
import { Actions } from 'flexlayout-react'

import { useDashboards } from '../components/Dasboard/DashboardProvider'
import { useLayout } from '../components/Layout/LayoutProvider'
import WidgetStorage from '../components/WidgetEditor/WidgetStorage'
import { cloneTemplate } from '../components/WidgetEditor/constants/templateWidgets'
import { DashboardLayout } from '../state/store'

export const OPEN_WIDGET_MENU_EVENT = 'aquamesh-open-widget-menu'

export interface WorkspaceComponentConfig {
  id?: string
  name: string
  component: string
  customProps?: Record<string, unknown>
}

const createLayoutWithComponent = (
  componentConfig: WorkspaceComponentConfig,
): DashboardLayout => ({
  type: 'row',
  weight: 100,
  children: [
    {
      type: 'tabset',
      weight: 100,
      active: true,
      children: [
        {
          type: 'tab',
          name: componentConfig.name,
          component: componentConfig.component,
          config: componentConfig.customProps
            ? { customProps: componentConfig.customProps }
            : undefined,
        },
      ],
    },
  ],
})

const hasDashboardContent = (layout?: DashboardLayout): boolean => {
  if (!layout) {
    return false
  }

  if (layout.type === 'tab' && Boolean(layout.component)) {
    return true
  }

  return Boolean(layout.children?.some((child) => hasDashboardContent(child)))
}

export const useWorkspaceActions = () => {
  const { ref: layoutRef, addComponent } = useLayout()
  const {
    addDashboard,
    openDashboards,
    selectedDashboard,
    updateDashboardLayout,
  } = useDashboards()

  const ensureDashboardAndAddComponent = useCallback(
    (componentConfig: WorkspaceComponentConfig) => {
      if (openDashboards.length === 0) {
        addDashboard({
          name: 'Dashboard',
          layout: createLayoutWithComponent(componentConfig),
        })
        return
      }

      const currentDashboard = openDashboards[selectedDashboard]

      if (!hasDashboardContent(currentDashboard?.layout)) {
        updateDashboardLayout(
          selectedDashboard,
          createLayoutWithComponent(componentConfig),
        )
        return
      }

      if (layoutRef.current) {
        const model = layoutRef.current.props.model
        if (!model.getActiveTabset()) {
          const firstTabset = model.getFirstTabSet()
          if (firstTabset) {
            // @ts-expect-error: doAction exists at runtime on Layout instance
            layoutRef.current.doAction(
              Actions.setActiveTabset(firstTabset.getId()),
            )
          }
        }
      }

      addComponent(componentConfig)
    },
    [
      addComponent,
      addDashboard,
      layoutRef,
      openDashboards,
      selectedDashboard,
      updateDashboardLayout,
    ],
  )

  const openCreateWidget = useCallback(() => {
    ensureDashboardAndAddComponent({
      id: `widget-editor-${Date.now()}`,
      name: 'Create Widget',
      component: 'WidgetEditor',
    })
  }, [ensureDashboardAndAddComponent])

  const openOperationsExample = useCallback(() => {
    const widgetName = 'Daily Operations Dashboard'
    let operationsWidget = WidgetStorage.getAllWidgets().find(
      (widget) => widget.name === widgetName,
    )

    if (!operationsWidget) {
      const template = cloneTemplate('template-operations-dashboard')

      if (template) {
        operationsWidget = WidgetStorage.saveWidget({
          name: widgetName,
          description:
            'Daily operations dashboard for orders, delayed tasks, support tickets, system status, team notes, and handoff actions.',
          category: 'Dashboard',
          tags: ['dashboard', 'daily operations', 'orders', 'tickets'],
          components: template.components,
          version: '1.0',
          author: 'AquaMesh',
        })
      }
    }

    addDashboard({
      name: widgetName,
      layout: createLayoutWithComponent({
        name: widgetName,
        component: 'CustomWidget',
        customProps: operationsWidget
          ? {
              widgetId: operationsWidget.id,
              components: operationsWidget.components,
            }
          : undefined,
      }),
    })
  }, [addDashboard])

  const openWidgetMenu = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_WIDGET_MENU_EVENT))
  }, [])

  return {
    ensureDashboardAndAddComponent,
    openCreateWidget,
    openOperationsExample,
    openWidgetMenu,
  }
}

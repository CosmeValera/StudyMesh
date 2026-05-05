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

const createLayoutWithComponents = (
  componentConfigs: WorkspaceComponentConfig[],
): DashboardLayout => ({
  type: 'row',
  weight: 100,
  children: [
    {
      type: 'tabset',
      weight: 100,
      active: true,
      children: componentConfigs.map((componentConfig) => ({
        type: 'tab',
        name: componentConfig.name,
        component: componentConfig.component,
        config: componentConfig.customProps
          ? { customProps: componentConfig.customProps }
          : undefined,
      })),
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

  const openTemplateDashboard = useCallback(
    ({
      widgetName,
      templateId,
      description,
      tags,
    }: {
      widgetName: string
      templateId: string
      description: string
      tags: string[]
    }) => {
      let widget = WidgetStorage.getAllWidgets().find(
        (savedWidget) => savedWidget.name === widgetName,
      )

      if (!widget) {
        const template = cloneTemplate(templateId)

        if (template) {
          widget = WidgetStorage.saveWidget({
            name: widgetName,
            description,
            category: 'Knowledge Workspace',
            tags,
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
          customProps: widget
            ? {
                widgetId: widget.id,
                components: widget.components,
              }
            : undefined,
        }),
      })
    },
    [addDashboard],
  )

  const saveTemplateWidget = useCallback(
    ({
      widgetName,
      templateId,
      description,
      category = 'Knowledge Workspace',
      tags,
    }: {
      widgetName: string
      templateId: string
      description: string
      category?: string
      tags: string[]
    }) => {
      let widget = WidgetStorage.getAllWidgets().find(
        (savedWidget) => savedWidget.name === widgetName,
      )

      if (!widget) {
        const template = cloneTemplate(templateId)

        if (template) {
          widget = WidgetStorage.saveWidget({
            name: widgetName,
            description,
            category,
            tags,
            components: template.components,
            version: '1.0',
            author: 'AquaMesh',
          })
        }
      }

      return widget
    },
    [],
  )

  const openOperationsExample = useCallback(() => {
    openTemplateDashboard({
      widgetName: 'Daily Operations Dashboard',
      templateId: 'template-operations-dashboard',
      description:
        'Daily operations dashboard for orders, delayed tasks, support tickets, system status, team notes, and handoff actions.',
      tags: ['dashboard', 'daily operations', 'orders', 'tickets'],
    })
  }, [openTemplateDashboard])

  const openMathExample = useCallback(() => {
    const mathWidgets = [
      saveTemplateWidget({
        widgetName: 'Mathematics 1 — Chart',
        templateId: 'template-math-derivatives-chart',
        description:
          'Practice-progress chart for the derivatives study dashboard.',
        tags: ['mathematics', 'derivatives', 'chart'],
      }),
      saveTemplateWidget({
        widgetName: 'Mathematics 1 — Derivatives Example',
        templateId: 'template-math-derivatives-example',
        description:
          'Worked derivative examples and a question input for the study dashboard.',
        tags: ['mathematics', 'derivatives', 'example'],
      }),
      saveTemplateWidget({
        widgetName: 'Mathematics 1 — Theory Derivatives',
        templateId: 'template-math-derivatives-theory',
        description:
          'Core derivative theory and formulas for the study dashboard.',
        tags: ['mathematics', 'derivatives', 'theory'],
      }),
    ].filter(Boolean)

    addDashboard({
      name: 'Mathematics 1 — Derivatives',
      layout: createLayoutWithComponents(
        mathWidgets.map((widget) => ({
          name: widget!.name,
          component: 'CustomWidget',
          customProps: {
            widgetId: widget!.id,
            components: widget!.components,
          },
        })),
      ),
    })
  }, [addDashboard, saveTemplateWidget])

  const openTutorialExample = useCallback(() => {
    openTemplateDashboard({
      widgetName: 'AquaMesh Tutorial',
      templateId: 'template-knowledge-tutorial',
      description:
        'A simple dashboard that explains widgets, dashboards, and blocks with visual examples.',
      tags: ['tutorial', 'knowledge wiki', 'dashboard', 'blocks'],
    })
  }, [openTemplateDashboard])

  const openWidgetMenu = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_WIDGET_MENU_EVENT))
  }, [])

  return {
    ensureDashboardAndAddComponent,
    openCreateWidget,
    openOperationsExample,
    openMathExample,
    openTutorialExample,
    openWidgetMenu,
  }
}

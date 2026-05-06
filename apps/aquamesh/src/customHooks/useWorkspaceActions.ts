import { useCallback } from 'react'
import { Actions } from 'flexlayout-react'

import { useDashboards } from '../components/Dasboard/DashboardProvider'
import { useLayout } from '../components/Layout/LayoutProvider'
import WidgetStorage from '../components/WidgetEditor/WidgetStorage'
import { cloneTemplate } from '../components/WidgetEditor/constants/templateWidgets'
import { DashboardLayout } from '../state/store'
import { normalizeFolderColor } from '../components/Dasboard/folderColors'

export const OPEN_WIDGET_MENU_EVENT = 'aquamesh-open-widget-menu'

export interface WorkspaceComponentConfig {
  id?: string
  name: string
  component: string
  customProps?: Record<string, unknown>
}

interface SavedDashboardRecord {
  id: string
  name: string
  folder?: string
  folderColor?: string
  layout: DashboardLayout
  description?: string
  tags?: string[]
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

const STARTER_DASHBOARDS_SEEDED_KEY = 'aquamesh-starter-dashboards-seeded-v5'

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

const createMathStarterLayout = (
  componentConfigs: WorkspaceComponentConfig[],
): DashboardLayout => {
  const [chart, example, theory] = componentConfigs

  const createTab = (componentConfig: WorkspaceComponentConfig) => ({
    type: 'tab',
    name: componentConfig.name,
    component: componentConfig.component,
    config: componentConfig.customProps
      ? { customProps: componentConfig.customProps }
      : undefined,
  })

  return {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 43,
        active: true,
        children: [createTab(chart)],
      },
      {
        type: 'row',
        weight: 57,
        children: [
          {
            type: 'tabset',
            weight: 50,
            children: [createTab(example)],
          },
          {
            type: 'tabset',
            weight: 50,
            children: [createTab(theory)],
          },
        ],
      },
    ],
  }
}

const saveTemplateWidget = ({
  widgetName,
  templateId,
  description,
  category = 'Knowledge Workspace',
  tags,
  refreshExisting = false,
}: {
  widgetName: string
  templateId: string
  description: string
  category?: string
  tags: string[]
  refreshExisting?: boolean
}) => {
  const savedWidgets = WidgetStorage.getAllWidgets()
  let widget = savedWidgets.find(
    (savedWidget) => savedWidget.name === widgetName,
  )
  const template = cloneTemplate(templateId)

  if (
    widget &&
    savedWidgets.filter((savedWidget) => savedWidget.id === widget!.id).length >
      1
  ) {
    WidgetStorage.deleteWidget(widget.id)
    widget = undefined
  }

  if (template) {
    if (!widget) {
      widget = WidgetStorage.saveWidget({
        name: widgetName,
        description,
        category,
        tags,
        components: template.components,
        version: '1.0',
        author: 'AquaMesh',
      })
    } else if (refreshExisting) {
      widget =
        WidgetStorage.updateWidget(widget.id, {
          description,
          category,
          tags,
          components: template.components,
          author: 'AquaMesh',
        }) || widget
    }
  }

  return widget
}

const createCustomWidgetConfig = (
  widget: NonNullable<ReturnType<typeof saveTemplateWidget>>,
) => ({
  name: widget.name,
  component: 'CustomWidget',
  customProps: {
    widgetId: widget.id,
    components: widget.components,
  },
})

const getSavedDashboards = (): SavedDashboardRecord[] => {
  try {
    const dashboards = window.localStorage.getItem('customDashboards')
    return dashboards ? JSON.parse(dashboards) : []
  } catch (error) {
    console.error('Failed to read saved dashboards', error)
    return []
  }
}

const saveStarterDashboard = (
  dashboard: Omit<SavedDashboardRecord, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const dashboards = getSavedDashboards()
  const now = new Date().toISOString()
  const existingIndex = dashboards.findIndex(
    (savedDashboard) => savedDashboard.name === dashboard.name,
  )

  if (existingIndex >= 0) {
    dashboards[existingIndex] = {
      ...dashboards[existingIndex],
      ...dashboard,
      folderColor: normalizeFolderColor(dashboard.folderColor),
      updatedAt: now,
    }
  } else {
    dashboards.push({
      id: `dashboard-starter-${dashboard.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      ...dashboard,
      folderColor: normalizeFolderColor(dashboard.folderColor),
      createdAt: now,
      updatedAt: now,
    })
  }

  window.localStorage.setItem('customDashboards', JSON.stringify(dashboards))
}

export const ensureStarterDashboards = () => {
  if (typeof window === 'undefined') {
    return
  }

  if (window.localStorage.getItem(STARTER_DASHBOARDS_SEEDED_KEY) === 'true') {
    return
  }

  const mathWidgets = [
    saveTemplateWidget({
      widgetName: 'Mathematics 1 — Chart',
      templateId: 'template-math-derivatives-chart',
      description:
        'Practice-progress chart for the derivatives study dashboard.',
      tags: ['mathematics', 'derivatives', 'chart'],
      refreshExisting: true,
    }),
    saveTemplateWidget({
      widgetName: 'Mathematics 1 — Derivatives Example',
      templateId: 'template-math-derivatives-example',
      description:
        'Worked derivative examples and a question input for the study dashboard.',
      tags: ['mathematics', 'derivatives', 'example'],
      refreshExisting: true,
    }),
    saveTemplateWidget({
      widgetName: 'Mathematics 1 — Theory Derivatives',
      templateId: 'template-math-derivatives-theory',
      description:
        'Core derivative theory and formulas for the study dashboard.',
      tags: ['mathematics', 'derivatives', 'theory'],
      refreshExisting: true,
    }),
  ].filter(Boolean)

  if (mathWidgets.length === 3) {
    saveStarterDashboard({
      name: 'Mathematics 1 — Derivatives',
      folder: 'Mathematics',
      folderColor: '#1976D2',
      layout: createMathStarterLayout(
        mathWidgets.map((widget) => createCustomWidgetConfig(widget!)),
      ),
      description:
        'A starter mathematics dashboard with theory, examples, and a chart.',
      tags: ['mathematics', 'derivatives', 'starter'],
      isPublic: true,
    })
  }

  const tutorialWidget = saveTemplateWidget({
    widgetName: 'AquaMesh Tutorial',
    templateId: 'template-knowledge-tutorial',
    description:
      'A simple dashboard that explains widgets, dashboards, and blocks with visual examples.',
    tags: ['tutorial', 'knowledge wiki', 'dashboard', 'blocks'],
    refreshExisting: true,
  })

  if (tutorialWidget) {
    saveStarterDashboard({
      name: 'AquaMesh Tutorial',
      folder: 'Tutorial',
      folderColor: '#007C66',
      layout: createLayoutWithComponent(
        createCustomWidgetConfig(tutorialWidget),
      ),
      description:
        'A starter dashboard that explains the basic AquaMesh concepts.',
      tags: ['tutorial', 'widgets', 'dashboards', 'blocks'],
      isPublic: true,
    })
  }

  const interactivityWidget = saveTemplateWidget({
    widgetName: 'AquaMesh Interactivity',
    templateId: 'template-aquamesh-interactivity',
    description:
      'A hands-on tutorial dashboard for buttons, checklists, answer boxes, and chart updates.',
    tags: ['tutorial', 'interactivity', 'buttons', 'charts', 'tasks'],
    refreshExisting: true,
  })

  if (interactivityWidget) {
    saveStarterDashboard({
      name: 'AquaMesh Interactivity',
      folder: 'Tutorial',
      folderColor: '#007C66',
      layout: createLayoutWithComponent(
        createCustomWidgetConfig(interactivityWidget),
      ),
      description:
        'A starter dashboard that demonstrates AquaMesh widget interactivity.',
      tags: ['tutorial', 'interactivity', 'buttons', 'charts', 'tasks'],
      isPublic: true,
    })
  }

  window.localStorage.setItem(STARTER_DASHBOARDS_SEEDED_KEY, 'true')
}

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
    ensureStarterDashboards()
    const mathDashboard = getSavedDashboards().find(
      (dashboard) => dashboard.name === 'Mathematics 1 — Derivatives',
    )

    if (mathDashboard) {
      addDashboard({
        name: mathDashboard.name,
        layout: mathDashboard.layout,
      })
    }
  }, [addDashboard])

  const openTutorialExample = useCallback(() => {
    ensureStarterDashboards()
    const tutorialDashboard = getSavedDashboards().find(
      (dashboard) => dashboard.name === 'AquaMesh Tutorial',
    )

    if (tutorialDashboard) {
      addDashboard({
        name: tutorialDashboard.name,
        layout: tutorialDashboard.layout,
      })
    }
  }, [addDashboard])

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

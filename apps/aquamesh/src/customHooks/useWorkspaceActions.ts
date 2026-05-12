import { useCallback } from 'react'
import { Actions } from 'flexlayout-react'

import { useDashboards } from '../components/Dasboard/DashboardProvider'
import { useLayout } from '../components/Layout/LayoutProvider'
import WidgetStorage from '../components/WidgetEditor/WidgetStorage'
import { cloneTemplate } from '../components/WidgetEditor/constants/templateWidgets'
import {
  STARTER_WIDGET_NAMES,
  STARTER_WIDGET_TEMPLATES,
} from '../components/WidgetEditor/constants/starterWidgetTemplates'
import { DashboardLayout } from '../state/store'
import { normalizeFolderColor } from '../components/Dasboard/folderColors'
import {
  createStudyPackDashboardLayout,
  StudyPackDashboardLayoutMode,
} from '../studyPack'
import { ComponentData } from '../components/WidgetEditor/types/types'

export const OPEN_WIDGET_EDITOR_EVENT = 'aquamesh-open-widget-editor'
export const OPEN_DASHBOARD_EDITOR_EVENT = 'aquamesh-open-dashboard-editor'
export const OPEN_SAVED_DASHBOARDS_EVENT = 'aquamesh-open-saved-dashboards'
export const OPEN_STUDY_PACK_EVENT = 'aquamesh-open-study-pack'

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

const STARTER_DASHBOARDS_SEEDED_KEY = 'aquamesh-starter-dashboards-seeded-v12'

const STARTER_DASHBOARD_NAMES = [
  'Mathematics 1 - Derivatives',
  'AquaMesh Tutorial',
  'AquaMesh Interactivity',
  'Content Load Reference Pack',
  'Grouping Layout Tutorial',
]

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
  const matchingWidgets = savedWidgets.filter(
    (savedWidget) => savedWidget.name === widgetName,
  )
  let widget = matchingWidgets[matchingWidgets.length - 1]
  const template = cloneTemplate(templateId)

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
      matchingWidgets.forEach((matchingWidget) => {
        const updatedWidget = WidgetStorage.updateWidget(matchingWidget.id, {
          description,
          category,
          tags,
          components: template.components,
          author: 'AquaMesh',
        })

        if (matchingWidget.id === widget?.id && updatedWidget) {
          widget = updatedWidget
        }
      })
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

const getUniqueSavedDashboardName = (
  requestedName: string,
  dashboards: SavedDashboardRecord[],
) => {
  const baseName = requestedName.trim() || 'Study Pack'
  const usedNames = new Set(dashboards.map((dashboard) => dashboard.name))

  if (!usedNames.has(baseName)) {
    return baseName
  }

  let suffix = 2
  let candidate = `${baseName} (${suffix})`
  while (usedNames.has(candidate)) {
    suffix += 1
    candidate = `${baseName} (${suffix})`
  }

  return candidate
}

const saveStudyPackDashboard = (
  name: string,
  layout: DashboardLayout,
): SavedDashboardRecord => {
  const dashboards = getSavedDashboards()
  const now = new Date().toISOString()
  const dashboard: SavedDashboardRecord = {
    id: `study-pack-dashboard-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    name: getUniqueSavedDashboardName(name, dashboards),
    folder: 'Study Packs',
    folderColor: '#007C66',
    layout,
    description: 'Generated from student notes.',
    tags: ['study-pack', 'notes'],
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  }

  window.localStorage.setItem(
    'customDashboards',
    JSON.stringify([...dashboards, dashboard]),
  )

  return dashboard
}

const countWidgetComponents = (components?: unknown): number => {
  if (!Array.isArray(components)) {
    return 0
  }

  return components.reduce((count, component) => {
    if (!component || typeof component !== 'object') {
      return count
    }

    const children = 'children' in component ? component.children : undefined
    return count + 1 + countWidgetComponents(children)
  }, 0)
}

const hasDashboardContent = (layout?: DashboardLayout): boolean => {
  if (!layout) {
    return false
  }

  if (layout.type === 'tab' && Boolean(layout.component)) {
    if (layout.component !== 'CustomWidget') {
      return true
    }

    const customProps = layout.config?.customProps
    const embeddedComponentsCount = countWidgetComponents(
      customProps?.components,
    )

    if (embeddedComponentsCount > 0) {
      return true
    }

    if (typeof customProps?.widgetId === 'string') {
      const storedWidget = WidgetStorage.getWidgetById(customProps.widgetId)
      return countWidgetComponents(storedWidget?.components) > 0
    }

    return false
  }

  if (layout.component) {
    return true
  }

  return Boolean(layout.children?.some((child) => hasDashboardContent(child)))
}

const getStarterDashboardId = (name: string) =>
  `dashboard-starter-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

const saveStarterDashboard = (
  dashboard: Omit<SavedDashboardRecord, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const dashboards = getSavedDashboards()
  const now = new Date().toISOString()
  const starterId = getStarterDashboardId(dashboard.name)
  const existingIndex = dashboards.findIndex(
    (savedDashboard) =>
      savedDashboard.name === dashboard.name || savedDashboard.id === starterId,
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
      id: starterId,
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

  const savedDashboards = getSavedDashboards()
  const startersArePresent = STARTER_DASHBOARD_NAMES.every((name) => {
    const savedDashboard = savedDashboards.find(
      (dashboard) => dashboard.name === name,
    )

    return hasDashboardContent(savedDashboard?.layout)
  })
  const starterWidgetsArePresent = STARTER_WIDGET_NAMES.every((name) => {
    const savedWidgets = WidgetStorage.getAllWidgets().filter(
      (widget) => widget.name === name,
    )
    const expectedBlocks = STARTER_WIDGET_TEMPLATES[name]?.minBlocks || 1

    return (
      savedWidgets.length > 0 &&
      savedWidgets.every(
        (savedWidget) =>
          countWidgetComponents(savedWidget.components) >= expectedBlocks,
      )
    )
  })

  if (
    window.localStorage.getItem(STARTER_DASHBOARDS_SEEDED_KEY) === 'true' &&
    startersArePresent &&
    starterWidgetsArePresent
  ) {
    return
  }

  const mathWidgets = [
    saveTemplateWidget({
      widgetName: 'Mathematics 1 - Chart',
      templateId: 'template-math-derivatives-chart',
      description:
        'Practice-progress chart for the derivatives study dashboard.',
      tags: ['mathematics', 'derivatives', 'chart'],
      refreshExisting: true,
    }),
    saveTemplateWidget({
      widgetName: 'Mathematics 1 - Derivatives Example',
      templateId: 'template-math-derivatives-example',
      description:
        'Worked derivative examples and a question input for the study dashboard.',
      tags: ['mathematics', 'derivatives', 'example'],
      refreshExisting: true,
    }),
    saveTemplateWidget({
      widgetName: 'Mathematics 1 - Theory Derivatives',
      templateId: 'template-math-derivatives-theory',
      description:
        'Core derivative theory and formulas for the study dashboard.',
      tags: ['mathematics', 'derivatives', 'theory'],
      refreshExisting: true,
    }),
  ].filter(Boolean)

  if (mathWidgets.length === 3) {
    saveStarterDashboard({
      name: 'Mathematics 1 - Derivatives',
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

  const contentLoadWidget = saveTemplateWidget({
    widgetName: 'Content Load Reference Pack',
    templateId: 'template-content-load-reference-pack',
    description:
      'A heavier dashboard example with an embedded PDF, image, long text, and checklist content.',
    tags: ['content', 'pdf', 'image', 'long text', 'reference'],
    refreshExisting: true,
  })

  if (contentLoadWidget) {
    saveStarterDashboard({
      name: 'Content Load Reference Pack',
      folder: 'Examples',
      folderColor: '#D81B60',
      layout: createLayoutWithComponent(
        createCustomWidgetConfig(contentLoadWidget),
      ),
      description:
        'A heavier starter dashboard with PDF, image, long text, and mixed content blocks.',
      tags: ['content', 'pdf', 'image', 'long text', 'reference'],
      isPublic: true,
    })
  }

  const groupingWidget = saveTemplateWidget({
    widgetName: 'Grouping Layout Tutorial',
    templateId: 'template-grouping-layout-tutorial',
    description:
      'Explains when to use FieldSet, FlexBox, and GridBox layout groups.',
    tags: ['tutorial', 'grouping', 'fieldset', 'flex', 'grid'],
    refreshExisting: true,
  })

  if (groupingWidget) {
    saveStarterDashboard({
      name: 'Grouping Layout Tutorial',
      folder: 'Tutorial',
      folderColor: '#007C66',
      layout: createLayoutWithComponent(
        createCustomWidgetConfig(groupingWidget),
      ),
      description:
        'A starter dashboard for understanding FieldSet, FlexBox, and GridBox groupings.',
      tags: ['tutorial', 'grouping', 'layout', 'fieldset', 'flex', 'grid'],
      isPublic: true,
    })
  }

  window.localStorage.setItem(STARTER_DASHBOARDS_SEEDED_KEY, 'true')
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
    window.dispatchEvent(new CustomEvent(OPEN_WIDGET_EDITOR_EVENT))
  }, [])

  const openCreateDashboard = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_DASHBOARD_EDITOR_EVENT))
  }, [])

  const openCreateStudyPack = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_STUDY_PACK_EVENT))
  }, [])

  const createStudyPackDashboard = useCallback(
    ({
      name,
      widgets,
      layoutMode = 'smart',
    }: {
      name: string
      widgets: Array<{
        name: string
        components: ComponentData[]
        category?: string
        tags?: string[]
        description?: string
        version?: string
        author?: string
      }>
      layoutMode?: StudyPackDashboardLayoutMode
    }) => {
      const savedWidgets = widgets.map((widget) =>
        WidgetStorage.saveWidget({
          name: widget.name,
          components: widget.components,
          category: widget.category || 'Study Pack',
          tags: widget.tags || ['study-pack'],
          description: widget.description || 'Generated from student notes.',
          version: widget.version || '1.0',
          author: widget.author || 'AquaMesh',
        }),
      )
      const layout = createStudyPackDashboardLayout(savedWidgets, {
        mode: layoutMode,
      })
      const dashboard = saveStudyPackDashboard(name, layout)

      addDashboard({
        name: dashboard.name,
        layout: dashboard.layout,
      })

      return dashboard
    },
    [addDashboard],
  )

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
      (dashboard) => dashboard.name === 'Mathematics 1 - Derivatives',
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

  return {
    ensureDashboardAndAddComponent,
    openCreateWidget,
    openCreateDashboard,
    openCreateStudyPack,
    createStudyPackDashboard,
    openOperationsExample,
    openMathExample,
    openTutorialExample,
  }
}

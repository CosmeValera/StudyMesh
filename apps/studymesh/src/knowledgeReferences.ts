import { DashboardLayout, StateDashboard } from './state/store'

export type KnowledgeReferenceTargetType =
  | 'dashboard'
  | 'studyPath'
  | 'studyPathSection'
  | 'widget'
  | 'note'
  | 'source'

export interface KnowledgeReferenceTarget {
  type: KnowledgeReferenceTargetType
  id: string
  parentId?: string
  title: string
  subtitle?: string
}

export interface KnowledgeReference {
  id: string
  target: KnowledgeReferenceTarget
  label?: string
  description?: string
  createdAt: string
}

export interface KnowledgeBacklink {
  reference: KnowledgeReference
  dashboardId: string
  dashboardName: string
  widgetName?: string
}

export type KnowledgeLinkWidgetCardSize = 'compact' | 'standard' | 'detailed'
export type KnowledgeLinkWidgetSectionId = 'creation' | 'openMaterial' | 'links'
export type KnowledgeLinkWidgetColumns = 1 | 2 | 3 | 4

export interface KnowledgeLinkWidgetOptions {
  title?: string
  editMode?: boolean
  cardSize?: KnowledgeLinkWidgetCardSize
  columns?: KnowledgeLinkWidgetColumns
  references?: KnowledgeReference[]
  showCreationActions?: boolean
  showOpenStudyMaterial?: boolean
  sectionOrder?: KnowledgeLinkWidgetSectionId[]
}

export const OPEN_KNOWLEDGE_REFERENCE_EVENT =
  'studymesh-open-knowledge-reference'
export const UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT =
  'studymesh-update-knowledge-link-widget'
export const OPEN_STUDY_LINK_PICKER_EVENT = 'studymesh-open-study-link-picker'
export const SAVE_KNOWLEDGE_LINK_DASHBOARD_AS_DEFAULT_EVENT =
  'studymesh-save-knowledge-link-dashboard-as-default'
export const RESET_DEFAULT_EMPTY_DASHBOARD_EVENT =
  'studymesh-reset-default-empty-dashboard'

export interface OpenKnowledgeReferenceEventDetail {
  target: KnowledgeReferenceTarget
}

export interface UpdateKnowledgeLinkWidgetEventDetail {
  options: KnowledgeLinkWidgetOptions
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const createKnowledgeReference = (
  target: KnowledgeReferenceTarget,
  options: {
    label?: string
    description?: string
    createdAt?: string
    id?: string
  } = {},
): KnowledgeReference => ({
  id:
    options.id ||
    `knowledge-reference-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
  target,
  label: options.label,
  description: options.description,
  createdAt: options.createdAt || new Date().toISOString(),
})

export const getKnowledgeReferenceTitle = (
  reference: KnowledgeReference,
): string => reference.label || reference.target.title

export const getKnowledgeReferenceKindLabel = (
  target: KnowledgeReferenceTarget,
): string => {
  if (target.type === 'studyPath') {
    return 'Study Path'
  }

  if (target.type === 'studyPathSection') {
    return 'Section'
  }

  if (target.type === 'dashboard') {
    return 'Dashboard'
  }

  if (target.type === 'widget') {
    return 'Widget'
  }

  if (target.type === 'source') {
    return 'Source'
  }

  return 'Note'
}

export const createKnowledgeLinkWidgetLayout = (
  references: KnowledgeReference[],
  name = 'Study links',
  options: KnowledgeLinkWidgetOptions = {},
): DashboardLayout => ({
  type: 'tab',
  name,
  component: 'KnowledgeLinkWidget',
  className: 'studymesh-study-links-flex-tab',
  enableClose: false,
  enableDrag: false,
  enableFloat: false,
  config: {
    customProps: {
      references,
      ...options,
    },
  },
})

export const appendKnowledgeLinkWidgetToLayout = (
  layout: DashboardLayout | undefined,
  references: KnowledgeReference[],
  name = 'Study links',
  options: KnowledgeLinkWidgetOptions = {},
): DashboardLayout => {
  const tab = createKnowledgeLinkWidgetLayout(references, name, options)

  if (!layout?.children?.length) {
    return {
      type: 'row',
      weight: 100,
      enableDivide: false,
      enableDrop: false,
      children: [
        {
          type: 'tabset',
          weight: 100,
          active: true,
          classNameTabStrip: 'studymesh-study-links-flex-tabstrip',
          enableDrop: false,
          enableDivide: false,
          enableMaximize: false,
          enableClose: false,
          children: [tab],
        },
      ],
    }
  }

  return {
    ...layout,
    children: [
      ...(layout.children || []),
      {
        type: 'tabset',
        weight: 100,
        active: true,
        classNameTabStrip: 'studymesh-study-links-flex-tabstrip',
        enableDrop: false,
        enableDivide: false,
        enableMaximize: false,
        enableClose: false,
        children: [tab],
      },
    ],
  }
}

export const appendReferencesToExistingKnowledgeWidget = (
  layout: DashboardLayout | undefined,
  references: KnowledgeReference[],
): { layout: DashboardLayout | undefined; updated: boolean } => {
  if (!layout) {
    return { layout, updated: false }
  }

  if (layout.component === 'KnowledgeLinkWidget') {
    const customProps = isRecord(layout.config?.customProps)
      ? layout.config?.customProps
      : {}
    const existingReferences = Array.isArray(customProps.references)
      ? customProps.references
          .map(normalizeReference)
          .filter((reference): reference is KnowledgeReference =>
            Boolean(reference),
          )
      : []

    return {
      layout: {
        ...layout,
        config: {
          ...layout.config,
          customProps: {
            ...customProps,
            references: [...existingReferences, ...references],
          },
        },
      },
      updated: true,
    }
  }

  if (!layout.children?.length) {
    return { layout, updated: false }
  }

  let updated = false
  const children = layout.children.map((child) => {
    if (updated) {
      return child
    }

    const result = appendReferencesToExistingKnowledgeWidget(child, references)
    updated = result.updated
    return result.layout || child
  })

  return {
    layout: updated ? { ...layout, children } : layout,
    updated,
  }
}

export const addKnowledgeReferencesToLayout = (
  layout: DashboardLayout | undefined,
  references: KnowledgeReference[],
  name = 'Study links',
): DashboardLayout => {
  const existingResult = appendReferencesToExistingKnowledgeWidget(
    layout,
    references,
  )

  if (existingResult.updated) {
    return existingResult.layout as DashboardLayout
  }

  return appendKnowledgeLinkWidgetToLayout(layout, references, name)
}

const normalizeReference = (value: unknown): KnowledgeReference | null => {
  if (!isRecord(value) || !isRecord(value.target)) {
    return null
  }

  const target = value.target
  const type = target.type
  const id = target.id
  const title = target.title

  if (
    typeof type !== 'string' ||
    typeof id !== 'string' ||
    typeof title !== 'string'
  ) {
    return null
  }

  return {
    id: typeof value.id === 'string' ? value.id : `${type}:${id}`,
    target: {
      type: type as KnowledgeReferenceTargetType,
      id,
      parentId:
        typeof target.parentId === 'string' ? target.parentId : undefined,
      title,
      subtitle:
        typeof target.subtitle === 'string' ? target.subtitle : undefined,
    },
    label: typeof value.label === 'string' ? value.label : undefined,
    description:
      typeof value.description === 'string' ? value.description : undefined,
    createdAt:
      typeof value.createdAt === 'string'
        ? value.createdAt
        : new Date(0).toISOString(),
  }
}

export const getKnowledgeReferencesFromLayout = (
  layout?: DashboardLayout,
): Array<{ reference: KnowledgeReference; widgetName?: string }> => {
  if (!layout) {
    return []
  }

  const customProps = isRecord(layout.config?.customProps)
    ? layout.config?.customProps
    : undefined
  const references = Array.isArray(customProps?.references)
    ? customProps.references
        .map(normalizeReference)
        .filter((reference): reference is KnowledgeReference =>
          Boolean(reference),
        )
        .map((reference) => ({ reference, widgetName: layout.name }))
    : []

  return [
    ...references,
    ...(layout.children || []).flatMap((child) =>
      getKnowledgeReferencesFromLayout(child),
    ),
  ]
}

export const targetMatchesKnowledgeReference = (
  target: KnowledgeReferenceTarget,
  reference: KnowledgeReference,
): boolean => {
  if (
    target.type !== reference.target.type ||
    target.id !== reference.target.id
  ) {
    return false
  }

  if (target.type === 'studyPathSection') {
    return target.parentId === reference.target.parentId
  }

  return true
}

export const getKnowledgeBacklinks = (
  dashboards: StateDashboard[],
  target: KnowledgeReferenceTarget,
): KnowledgeBacklink[] =>
  dashboards.flatMap((dashboard) =>
    getKnowledgeReferencesFromLayout(dashboard.layout)
      .filter(({ reference }) =>
        targetMatchesKnowledgeReference(target, reference),
      )
      .map(({ reference, widgetName }) => ({
        reference,
        dashboardId: dashboard.id,
        dashboardName: dashboard.name,
        widgetName,
      })),
  )

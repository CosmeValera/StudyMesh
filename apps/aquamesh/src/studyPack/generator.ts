import { CustomWidget } from '../components/WidgetEditor/WidgetStorage'
import { ComponentData } from '../components/WidgetEditor/types/types'
import { DashboardLayout } from '../state/store'
import {
  GeneratedStudyPack,
  StudyObject,
  StudyPack,
  StudyPackGeneratorOptions,
  StudyPackSaveWidgetInput,
} from './types'

const DEFAULT_CREATED_AT = '1970-01-01T00:00:00.000Z'
const STUDY_PACK_CATEGORY = 'Study Pack'
const STUDY_PACK_AUTHOR = 'AquaMesh'

const colorPalette = [
  'rgba(54, 162, 235, 0.8)',
  'rgba(75, 192, 192, 0.8)',
  'rgba(255, 206, 86, 0.8)',
  'rgba(153, 102, 255, 0.8)',
  'rgba(255, 99, 132, 0.8)',
  'rgba(255, 159, 64, 0.8)',
]

const sanitizeIdPart = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized || 'study-pack'
}

const createComponentId = (
  widgetId: string,
  object: StudyObject,
  suffix: string,
): string => `${widgetId}-${object.id}-${suffix}`

const createLabel = (
  id: string,
  text: string,
  variant: 'h6' | 'subtitle1' | 'body1' | 'body2' = 'subtitle1',
): ComponentData => ({
  id,
  type: 'Label',
  props: {
    text,
    variant,
    fontWeight: variant === 'body2' ? 400 : 700,
    gutterBottom: true,
  },
})

const objectToComponents = (
  object: StudyObject,
  widgetId: string,
): ComponentData[] => {
  switch (object.kind) {
    case 'note':
      return [
        {
          id: createComponentId(widgetId, object, 'note'),
          type: 'LongText',
          props: {
            __blockType: 'LongText',
            title: object.title || 'Study note',
            text: object.body,
            callout: true,
          },
        },
      ]
    case 'term':
      return [
        {
          id: createComponentId(widgetId, object, 'term'),
          type: 'FieldSet',
          props: {
            legend: object.term,
            collapsed: false,
          },
          children: [
            {
              id: createComponentId(widgetId, object, 'definition'),
              type: 'LongText',
              props: {
                __blockType: 'LongText',
                title: 'Definition',
                text: object.definition,
                callout: false,
              },
            },
          ],
        },
      ]
    case 'qa':
      return [
        {
          id: createComponentId(widgetId, object, 'qa'),
          type: 'FieldSet',
          props: {
            legend: object.question,
            collapsed: true,
          },
          children: [
            {
              id: createComponentId(widgetId, object, 'answer'),
              type: 'LongText',
              props: {
                __blockType: 'LongText',
                title: 'Answer',
                text: object.answer,
                callout: false,
              },
            },
          ],
        },
      ]
    case 'list':
      return [
        {
          id: createComponentId(widgetId, object, 'list'),
          type: 'ListBlock',
          props: {
            __blockType: 'ListBlock',
            title: object.title || 'Study list',
            items: object.items.join('\n'),
            ordered: object.ordered,
            interactiveChecklist: object.checklist,
          },
        },
      ]
    case 'table': {
      return [
        {
          id: createComponentId(widgetId, object, 'table'),
          type: 'TableBlock',
          props: {
            __blockType: 'TableBlock',
            title: object.title || 'Study table',
            headers: object.headers,
            rows: object.rows,
          },
        },
      ]
    }
    case 'resource':
      if (object.resourceType === 'image') {
        return [
          {
            id: createComponentId(widgetId, object, 'image'),
            type: 'ImageBlock',
            props: {
              __blockType: 'ImageBlock',
              src: object.url,
              alt: object.label,
              caption: object.label,
              maxHeight: 260,
            },
          },
        ]
      }

      if (object.resourceType === 'pdf') {
        return [
          {
            id: createComponentId(widgetId, object, 'pdf'),
            type: 'PdfBlock',
            props: {
              __blockType: 'PdfBlock',
              src: object.url,
              title: object.label,
              height: 420,
            },
          },
        ]
      }

      return [
        createLabel(
          createComponentId(widgetId, object, 'link-label'),
          object.label,
        ),
        {
          id: createComponentId(widgetId, object, 'link'),
          type: 'Button',
          props: {
            text: 'Open reference',
            variant: 'outlined',
            clickAction: 'openUrl',
            url: object.url,
            showEndIcon: true,
            iconName: 'openNew',
          },
        },
      ]
  }
}

const createSummaryChart = (
  pack: StudyPack,
  widgetId: string,
): ComponentData => {
  const counts = pack.objects.reduce<Record<string, number>>(
    (currentCounts, object) => {
      currentCounts[object.kind] = (currentCounts[object.kind] || 0) + 1
      return currentCounts
    },
    {},
  )
  const labels = Object.keys(counts)

  return {
    id: `${widgetId}-summary-chart`,
    type: 'Chart',
    props: {
      title: 'Study Pack Mix',
      chartType: 'pie',
      height: 400,
      description: `${pack.objects.length} parsed study objects`,
      data: JSON.stringify(
        {
          labels,
          datasets: [
            {
              label: 'Objects',
              data: labels.map((label) => counts[label]),
              backgroundColor: labels.map(
                (_label, index) => colorPalette[index % colorPalette.length],
              ),
            },
          ],
        },
        null,
        2,
      ),
    },
  }
}

const chunkObjects = (
  objects: StudyObject[],
  maxObjectsPerWidget: number,
): StudyObject[][] => {
  const chunks: StudyObject[][] = []

  for (let index = 0; index < objects.length; index += maxObjectsPerWidget) {
    chunks.push(objects.slice(index, index + maxObjectsPerWidget))
  }

  return chunks.length > 0 ? chunks : [[]]
}

const createWidgetRecord = (
  pack: StudyPack,
  objects: StudyObject[],
  widgetIndex: number,
  options: Required<
    Pick<
      StudyPackGeneratorOptions,
      | 'author'
      | 'category'
      | 'createdAt'
      | 'maxObjectsPerWidget'
      | 'widgetIdPrefix'
    >
  >,
): CustomWidget => {
  const widgetId = `${options.widgetIdPrefix}-${sanitizeIdPart(pack.id)}-${widgetIndex + 1}`
  const bodyComponents = objects.flatMap((object) =>
    objectToComponents(object, widgetId),
  )
  const components: ComponentData[] = [
    createLabel(
      `${widgetId}-title`,
      pack.title,
      widgetIndex === 0 ? 'h6' : 'subtitle1',
    ),
    ...(widgetIndex === 0 ? [createSummaryChart(pack, widgetId)] : []),
    ...bodyComponents,
  ]

  return {
    id: widgetId,
    name: widgetIndex === 0 ? pack.title : `${pack.title} ${widgetIndex + 1}`,
    components,
    createdAt: options.createdAt,
    updatedAt: options.createdAt,
    category: options.category,
    tags: ['study-pack', pack.sourceFormat],
    description: `Generated from ${pack.sourceFormat} with ${objects.length} study objects.`,
    version: '1.0',
    author: options.author,
  }
}

export const createStudyPackWidgets = (
  pack: StudyPack,
  options: StudyPackGeneratorOptions = {},
): CustomWidget[] => {
  const normalizedOptions = {
    author: options.author || STUDY_PACK_AUTHOR,
    category: options.category || STUDY_PACK_CATEGORY,
    createdAt: options.createdAt || DEFAULT_CREATED_AT,
    maxObjectsPerWidget: Math.max(1, options.maxObjectsPerWidget || 6),
    widgetIdPrefix: options.widgetIdPrefix || 'study-widget',
  }
  const chunks = chunkObjects(
    pack.objects,
    normalizedOptions.maxObjectsPerWidget,
  )

  return chunks.map((objects, index) =>
    createWidgetRecord(pack, objects, index, normalizedOptions),
  )
}

export const createStudyPackDashboardLayout = (
  widgets: CustomWidget[],
): DashboardLayout => ({
  type: 'row',
  weight: 100,
  children: [
    {
      type: 'tabset',
      weight: 100,
      active: true,
      selected: 0,
      children: widgets.map((widget) => ({
        type: 'tab',
        name: widget.name,
        component: 'CustomWidget',
        config: {
          customProps: {
            widgetId: widget.id,
            components: widget.components,
          },
        },
      })),
    },
  ],
})

export const createStudyPackSaveWidgetInputs = (
  widgets: CustomWidget[],
): StudyPackSaveWidgetInput[] =>
  widgets.map((widget) => ({
    name: widget.name,
    components: widget.components,
    category: widget.category,
    tags: widget.tags,
    description: widget.description,
    version: widget.version,
    author: widget.author,
  }))

export const generateStudyPack = (
  pack: StudyPack,
  options: StudyPackGeneratorOptions = {},
): GeneratedStudyPack => {
  const widgets = createStudyPackWidgets(pack, options)

  return {
    pack,
    widgets,
    dashboard: {
      name: options.dashboardName || pack.title,
      layout: createStudyPackDashboardLayout(widgets),
    },
  }
}

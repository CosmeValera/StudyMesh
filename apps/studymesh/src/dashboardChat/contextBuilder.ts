import { DashboardLayout, StateDashboard } from '../state/store'
import WidgetStorage from '../components/WidgetEditor/WidgetStorage'

export interface DashboardSourceChunk {
  id: string
  title: string
  type: string
  text: string
}

export interface DashboardChatContext {
  dashboardId: string
  dashboardTitle: string
  chunks: DashboardSourceChunk[]
}

const MAX_CHUNK_LENGTH = 2200
const MAX_CONTEXT_LENGTH = 12000

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}…` : value

const titleFrom = (...values: unknown[]) => {
  for (const value of values) {
    const text = normalizeText(value)
    if (text) {
      return text
    }
  }

  return 'Dashboard source'
}

const ignoredTextKeys = new Set([
  'id',
  'parentId',
  'widgetId',
  '__blockType',
  'type',
  'component',
  'createdAt',
  'updatedAt',
])

const collectTextDeep = (
  value: unknown,
  values: string[],
  key = '',
  depth = 0,
): void => {
  if (depth > 6 || value === null || value === undefined) {
    return
  }

  if (typeof value === 'string') {
    const text = normalizeText(value)
    if (text.length > 2 && !ignoredTextKeys.has(key)) {
      values.push(text)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextDeep(item, values, key, depth + 1))
    return
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(
      ([childKey, childValue]) => {
        if (!ignoredTextKeys.has(childKey)) {
          collectTextDeep(childValue, values, childKey, depth + 1)
        }
      },
    )
  }
}

const textFromProps = (props: Record<string, unknown>): string[] => {
  const values: string[] = []

  ;[
    'markdown',
    'body',
    'text',
    'content',
    'description',
    'caption',
    'question',
    'answer',
    'explanation',
    'prompt',
    'hiddenText',
    'definition',
    'term',
    'code',
  ].forEach((key) => {
    const text = normalizeText(props[key])
    if (text) {
      values.push(text)
    }
  })

  const items = props.items
  if (Array.isArray(items)) {
    values.push(
      items
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .join('\n'),
    )
  } else if (typeof items === 'string') {
    values.push(items)
  }

  const rows = props.rows
  if (Array.isArray(rows)) {
    values.push(
      rows
        .map((row) =>
          Array.isArray(row)
            ? row.map(normalizeText).join(' | ')
            : normalizeText(row),
        )
        .filter(Boolean)
        .join('\n'),
    )
  }

  const options = props.options
  if (Array.isArray(options)) {
    values.push(options.map(normalizeText).filter(Boolean).join('\n'))
  }

  return values.map(normalizeText).filter(Boolean)
}

const componentToChunks = (
  component: unknown,
  node: DashboardLayout,
  chunks: DashboardSourceChunk[],
  path: string[],
): void => {
  if (!component || typeof component !== 'object') {
    return
  }

  const record = component as Record<string, unknown>
  const props =
    record.props && typeof record.props === 'object'
      ? (record.props as Record<string, unknown>)
      : {}
  const text = textFromProps(props).join('\n\n')

  if (text) {
    chunks.push({
      id: String(record.id || path.join('-') || chunks.length),
      title: titleFrom(props.title, record.name, node.name),
      type: String(
        props.__blockType || record.type || node.component || 'widget',
      ),
      text: truncate(text, MAX_CHUNK_LENGTH),
    })
  }

  if (!text) {
    const fallbackValues: string[] = []
    collectTextDeep(props, fallbackValues)
    const fallbackText = Array.from(new Set(fallbackValues)).join('\n')
    if (fallbackText) {
      chunks.push({
        id: String(record.id || path.join('-') || chunks.length),
        title: titleFrom(props.title, record.name, node.name),
        type: String(
          props.__blockType || record.type || node.component || 'widget',
        ),
        text: truncate(fallbackText, MAX_CHUNK_LENGTH),
      })
    }
  }

  const children = Array.isArray(record.children) ? record.children : []
  children.forEach((child, index) =>
    componentToChunks(child, node, chunks, [...path, String(index)]),
  )
}

const collectChunksFromLayout = (
  node: DashboardLayout | undefined,
  chunks: DashboardSourceChunk[],
  path: string[] = [],
): void => {
  if (!node) {
    return
  }

  const customProps = node.config?.customProps
  let components = Array.isArray(customProps?.components)
    ? customProps.components
    : []

  if (
    components.length === 0 &&
    typeof customProps?.widgetId === 'string' &&
    typeof window !== 'undefined'
  ) {
    components =
      WidgetStorage.getWidgetById(customProps.widgetId)?.components || []
  }

  components.forEach((component, index) =>
    componentToChunks(component, node, chunks, [...path, String(index)]),
  )

  const nodeText = [node.name, node.component]
    .map(normalizeText)
    .filter(Boolean)
    .join('\n')
  if (node.component && nodeText && components.length === 0) {
    chunks.push({
      id: node.id || path.join('-') || `node-${chunks.length}`,
      title: titleFrom(node.name, node.component),
      type: node.component,
      text: truncate(nodeText, MAX_CHUNK_LENGTH),
    })
  }

  if (components.length === 0 && customProps) {
    const fallbackValues: string[] = []
    collectTextDeep(customProps, fallbackValues)
    const fallbackText = Array.from(new Set(fallbackValues)).join('\n')
    if (fallbackText) {
      chunks.push({
        id: `${node.id || path.join('-') || chunks.length}-custom-props`,
        title: titleFrom(node.name, node.component),
        type: node.component || 'dashboard widget',
        text: truncate(fallbackText, MAX_CHUNK_LENGTH),
      })
    }
  }
  ;(node.children || []).forEach((child, index) =>
    collectChunksFromLayout(child, chunks, [...path, String(index)]),
  )
}

const scoreChunk = (chunk: DashboardSourceChunk, question: string): number => {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/i)
    .filter((term) => term.length > 2)
  const haystack = `${chunk.title} ${chunk.type} ${chunk.text}`.toLowerCase()

  return terms.reduce(
    (score, term) => score + (haystack.includes(term) ? 2 : 0),
    chunk.type.toLowerCase().includes('source') ? 2 : 0,
  )
}

export const buildDashboardChatContext = (
  dashboard: StateDashboard | undefined,
): DashboardChatContext => {
  const chunks: DashboardSourceChunk[] = []
  collectChunksFromLayout(dashboard?.layout, chunks)

  return {
    dashboardId: dashboard?.id || 'unknown-dashboard',
    dashboardTitle: dashboard?.name || 'Dashboard',
    chunks,
  }
}

export const selectDashboardChatChunks = (
  context: DashboardChatContext,
  question: string,
): DashboardSourceChunk[] => {
  let totalLength = 0

  return [...context.chunks]
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, question) }))
    .sort((left, right) => right.score - left.score)
    .map(({ chunk }) => chunk)
    .filter((chunk) => {
      if (totalLength >= MAX_CONTEXT_LENGTH) {
        return false
      }

      totalLength += chunk.text.length
      return true
    })
}

export const formatDashboardChatContext = (
  context: DashboardChatContext,
  chunks: DashboardSourceChunk[],
): string =>
  [`Dashboard: ${context.dashboardTitle}`]
    .concat(
      chunks.map(
        (chunk, index) =>
          `Source ${index + 1}: ${chunk.title} (${chunk.type})\n${chunk.text}`,
      ),
    )
    .join('\n\n---\n\n')

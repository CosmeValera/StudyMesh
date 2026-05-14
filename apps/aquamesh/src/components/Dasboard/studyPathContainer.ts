import {
  DashboardLayout,
  StudyPathContainerState,
  StudyPathDashboardItem,
} from '../../state/store'

interface SavedDashboardLike {
  id?: string
  name: string
  folder?: string
  layout: DashboardLayout
  createdAt?: string
  updatedAt?: string
}

interface StudyPathMeta {
  studyPathId: string
  studyPathTitle: string
  dashboardKey: string
  dashboardName: string
  dashboardIndex: number
  dashboardCount: number
  folderName: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readMetaFromCustomProps = (
  customProps?: Record<string, unknown>,
): StudyPathMeta | null => {
  if (!customProps) {
    return null
  }

  const studyPathId = String(customProps.studyPathId || '')
  const dashboardKey = String(customProps.studyPathDashboardKey || '')

  if (!studyPathId || !dashboardKey) {
    return null
  }

  return {
    studyPathId,
    studyPathTitle: String(customProps.studyPathTitle || 'Study Path'),
    dashboardKey,
    dashboardName: String(customProps.studyPathDashboardName || 'Lesson'),
    dashboardIndex: Number(customProps.studyPathDashboardIndex || 1),
    dashboardCount: Number(customProps.studyPathDashboardCount || 1),
    folderName: String(customProps.studyPathFolderName || 'Study Path'),
  }
}

export const getStudyPathMetaFromLayout = (
  layout?: DashboardLayout,
): StudyPathMeta | null => {
  if (!layout) {
    return null
  }

  const customProps = isRecord(layout.config?.customProps)
    ? layout.config?.customProps
    : undefined
  const meta = readMetaFromCustomProps(customProps)

  if (meta) {
    return meta
  }

  for (const child of layout.children || []) {
    const childMeta = getStudyPathMetaFromLayout(child)
    if (childMeta) {
      return childMeta
    }
  }

  return null
}

export const getDashboardCreatedTime = (dashboard: SavedDashboardLike): number => {
  const timestamp = Date.parse(dashboard.createdAt || dashboard.updatedAt || '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const createStudyPathContainerState = (
  dashboards: SavedDashboardLike[],
): StudyPathContainerState | null => {
  const studyPathDashboards = dashboards
    .map((dashboard) => ({
      dashboard,
      meta: getStudyPathMetaFromLayout(dashboard.layout),
    }))
    .filter(
      (entry): entry is { dashboard: SavedDashboardLike; meta: StudyPathMeta } =>
        Boolean(entry.meta),
    )

  if (studyPathDashboards.length < 2) {
    return null
  }

  const pathId = studyPathDashboards[0].meta.studyPathId
  const samePathDashboards = studyPathDashboards.filter(
    (entry) => entry.meta.studyPathId === pathId,
  )

  if (samePathDashboards.length !== dashboards.length) {
    return null
  }

  const orderedDashboards: StudyPathDashboardItem[] = samePathDashboards
    .sort((first, second) => {
      const indexDelta = first.meta.dashboardIndex - second.meta.dashboardIndex
      return indexDelta !== 0
        ? indexDelta
        : getDashboardCreatedTime(first.dashboard) -
            getDashboardCreatedTime(second.dashboard)
    })
    .map(({ dashboard, meta }) => ({
      id: dashboard.id,
      name: dashboard.name || meta.dashboardName,
      layout: dashboard.layout,
      dashboardKey: meta.dashboardKey,
      dashboardIndex: meta.dashboardIndex,
      dashboardCount: meta.dashboardCount,
      folderName: meta.folderName || dashboard.folder || 'Study Path',
    }))

  return {
    pathId,
    title: studyPathDashboards[0].meta.studyPathTitle,
    folderName:
      studyPathDashboards[0].meta.folderName ||
      studyPathDashboards[0].dashboard.folder ||
      'Study Path',
    dashboards: orderedDashboards,
    selectedIndex: 0,
    pinnedDashboardKeys: [],
  }
}

import React, { useEffect, useState } from 'react'
import { useContext } from 'react'

import { nanoid } from 'nanoid'

import { DEFAULT_DASHBOARD, DefaultDashboard } from './fixture'
import { DashboardStorage } from './dashboardStorage'

import {
  useStore,
  StateDashboard,
  DashboardLayout,
  StudyPathContainerState,
} from '../../state/store'

import { Model } from 'flexlayout-react'

interface DashboardProviderProps {
  children: React.ReactNode
}

interface DashboardContextType {
  openDashboards: StateDashboard[]
  selectedDashboard: number
  setSelectedDashboard: (index: number) => void
  removeDashboard: (id: string) => void
  closeAllDashboards: () => void
  closeDashboardsToRight: (index: number) => void
  reorderDashboard: (fromIndex: number, toIndex: number) => void
  addDashboard: (dashboard?: DefaultDashboard) => string
  addDashboards: (
    dashboards: DefaultDashboard[],
    options?: { replaceEmptySelected?: boolean },
  ) => string[]
  addStudyPathContainer: (studyPath: StudyPathContainerState) => string
  updateStudyPathContainer: (
    dashboardId: string,
    updater: (studyPath: StudyPathContainerState) => StudyPathContainerState,
  ) => void
  replaceDashboard: (
    index: number,
    dashboard: DefaultDashboard | Omit<StateDashboard, 'id'>,
  ) => string
  updateLayout: (model: Model) => void
  updateDashboardLayout: (index: number, layout: DashboardLayout) => void
  renameDashboard: (id: string, newName: string) => void
  editingDashboardIds: string[]
  setDashboardEditing: (id: string, isEditing: boolean) => void
  isDashboardEditing: (id?: string) => boolean
}

const DashboardContext = React.createContext<DashboardContextType | null>(null)

const cloneLayout = (layout?: DashboardLayout): DashboardLayout | undefined =>
  layout ? JSON.parse(JSON.stringify(layout)) : undefined

const getEmptyDashboardTemplate = (): DefaultDashboard => {
  const defaultEmptyDashboard = DashboardStorage.getDefaultEmptyDashboard()

  if (!defaultEmptyDashboard) {
    return DEFAULT_DASHBOARD
  }

  return {
    name: defaultEmptyDashboard.name,
    layout: cloneLayout(defaultEmptyDashboard.layout),
  }
}

const createEmptyDashboard = (): StateDashboard => ({
  id: nanoid(),
  ...getEmptyDashboardTemplate(),
})

const DashboardProvider: React.FC<DashboardProviderProps> = (props) => {
  const selectedDashboard = useStore((state) => state.selectedDashboard)
  const setSelectedDashboard = useStore((state) => state.setSelectedDashboard)
  const openDashboards = useStore((state) => state.openDashboards)
  const setDashboards = useStore((state) => state.setDashboards)
  const [editingDashboardIds, setEditingDashboardIds] = useState<string[]>([])

  const hasDashboardContent = (layout?: DashboardLayout): boolean => {
    if (!layout) {
      return false
    }

    if (layout.type === 'tab' && Boolean(layout.component)) {
      return true
    }

    return Boolean(layout.children?.some((child) => hasDashboardContent(child)))
  }

  const isReplaceableEmptyDashboard = (dashboard?: StateDashboard): boolean =>
    Boolean(
      dashboard &&
        dashboard.kind !== 'studyPathContainer' &&
        !hasDashboardContent(dashboard.layout),
    )

  const setDashboardEditing = (id: string, isEditing: boolean) => {
    setEditingDashboardIds((currentIds) => {
      if (isEditing) {
        return currentIds.includes(id) ? currentIds : [...currentIds, id]
      }

      return currentIds.filter((currentId) => currentId !== id)
    })
  }

  const isDashboardEditing = (id?: string) => {
    if (!id) {
      return false
    }

    return editingDashboardIds.includes(id)
  }

  useEffect(() => {
    if (openDashboards.length === 0) {
      const emptyDashboard = createEmptyDashboard()
      setDashboards([emptyDashboard])
      setSelectedDashboard(0)
      setEditingDashboardIds([emptyDashboard.id])
      return
    }

    if (selectedDashboard < 0 || selectedDashboard >= openDashboards.length) {
      setSelectedDashboard(0)
    }
  }, [openDashboards, selectedDashboard, setDashboards, setSelectedDashboard])

  const removeDashboard = (id: string) => {
    const dashboards = openDashboards.filter((dashboard) => dashboard.id !== id)

    if (dashboards.length === 0) {
      const emptyDashboard = createEmptyDashboard()
      setDashboards([emptyDashboard])
      setSelectedDashboard(0)
      setEditingDashboardIds([emptyDashboard.id])
      return
    }

    setDashboards(dashboards)
    setEditingDashboardIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== id),
    )

    if (selectedDashboard >= dashboards.length) {
      setSelectedDashboard(Math.max(0, dashboards.length - 1))
    }
  }

  const closeAllDashboards = () => {
    const emptyDashboard = createEmptyDashboard()
    setDashboards([emptyDashboard])
    setSelectedDashboard(0)
    setEditingDashboardIds([emptyDashboard.id])
  }

  const closeDashboardsToRight = (index: number) => {
    if (index < 0 || index >= openDashboards.length - 1) {
      return
    }

    const dashboards = openDashboards.slice(0, index + 1)
    setDashboards(dashboards)
    setSelectedDashboard(Math.min(selectedDashboard, dashboards.length - 1))
    setEditingDashboardIds((currentIds) =>
      currentIds.filter((currentId) =>
        dashboards.some((dashboard) => dashboard.id === currentId),
      ),
    )
  }

  const reorderDashboard = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= openDashboards.length ||
      toIndex < 0 ||
      toIndex >= openDashboards.length ||
      fromIndex === toIndex
    ) {
      return
    }

    const dashboards = [...openDashboards]
    const [movedDashboard] = dashboards.splice(fromIndex, 1)
    dashboards.splice(toIndex, 0, movedDashboard)

    setDashboards(dashboards)
    setSelectedDashboard(toIndex)
  }

  const addDashboard = (dashboard?: DefaultDashboard) => {
    const dashboardToAdd = dashboard || getEmptyDashboardTemplate()
    const id = nanoid()
    const newDashboard = openDashboards.concat(
      Object.assign({ id }, dashboardToAdd),
    )
    const newSelectedDashboard = openDashboards.length

    setDashboards(newDashboard)
    setSelectedDashboard(newSelectedDashboard)

    if (!hasDashboardContent(dashboardToAdd.layout)) {
      setDashboardEditing(id, true)
    }

    return id
  }

  const addDashboards = (
    dashboards: DefaultDashboard[],
    options: { replaceEmptySelected?: boolean } = {},
  ) => {
    if (dashboards.length === 0) {
      return []
    }

    const dashboardsWithIds = dashboards.map((dashboard) =>
      Object.assign({ id: nanoid() }, dashboard),
    )
    const newOpenDashboards = [...openDashboards]
    const focusedDashboard = newOpenDashboards[selectedDashboard]
    const shouldReplaceSelected = Boolean(
      options.replaceEmptySelected &&
        isReplaceableEmptyDashboard(focusedDashboard),
    )
    const replacedDashboardId = shouldReplaceSelected
      ? focusedDashboard?.id
      : undefined
    let selectedDashboardIndex = newOpenDashboards.length

    if (shouldReplaceSelected) {
      const [firstDashboard, ...remainingDashboards] = dashboardsWithIds
      newOpenDashboards[selectedDashboard] = firstDashboard
      selectedDashboardIndex = selectedDashboard
      newOpenDashboards.push(...remainingDashboards)
    } else {
      newOpenDashboards.push(...dashboardsWithIds)
    }

    setDashboards(newOpenDashboards)
    setSelectedDashboard(selectedDashboardIndex)
    setEditingDashboardIds((currentIds) => {
      const nextIds = replacedDashboardId
        ? currentIds.filter((currentId) => currentId !== replacedDashboardId)
        : currentIds
      const emptyDashboardIds = dashboardsWithIds
        .filter((dashboard) => !hasDashboardContent(dashboard.layout))
        .map((dashboard) => dashboard.id)

      return [...nextIds, ...emptyDashboardIds]
    })

    return dashboardsWithIds.map((dashboard) => dashboard.id)
  }

  const addStudyPathContainer = (studyPath: StudyPathContainerState) => {
    const id = nanoid()
    const containerDashboard: StateDashboard = {
      id,
      name: studyPath.title || studyPath.folderName || 'Study Path',
      kind: 'studyPathContainer',
      studyPath: {
        ...studyPath,
        selectedIndex: Math.min(
          Math.max(studyPath.selectedIndex || 0, 0),
          Math.max(studyPath.dashboards.length - 1, 0),
        ),
      },
    }
    const newOpenDashboards = [...openDashboards]
    const focusedDashboard = newOpenDashboards[selectedDashboard]
    const shouldReplaceSelected = isReplaceableEmptyDashboard(focusedDashboard)

    if (shouldReplaceSelected) {
      newOpenDashboards[selectedDashboard] = containerDashboard
      setDashboards(newOpenDashboards)
      setSelectedDashboard(selectedDashboard)
    } else {
      setDashboards([...newOpenDashboards, containerDashboard])
      setSelectedDashboard(newOpenDashboards.length)
    }

    return id
  }

  const updateStudyPathContainer = (
    dashboardId: string,
    updater: (studyPath: StudyPathContainerState) => StudyPathContainerState,
  ) => {
    const newOpenDashboards = openDashboards.map((dashboard) => {
      if (dashboard.id !== dashboardId || !dashboard.studyPath) {
        return dashboard
      }

      const nextStudyPath = updater(dashboard.studyPath)
      return {
        ...dashboard,
        name: nextStudyPath.title || dashboard.name,
        studyPath: nextStudyPath,
      }
    })

    setDashboards(newOpenDashboards)
  }

  const replaceDashboard = (
    index: number,
    dashboard: DefaultDashboard | Omit<StateDashboard, 'id'>,
  ) => {
    const currentDashboard = openDashboards[index]
    const id = nanoid()
    const newOpenDashboards = [...openDashboards]

    newOpenDashboards[index] = Object.assign({ id }, dashboard)
    setDashboards(newOpenDashboards)
    setSelectedDashboard(index)

    if (currentDashboard) {
      setDashboardEditing(currentDashboard.id, false)
    }

    setDashboardEditing(
      id,
      dashboard.kind !== 'studyPathContainer' &&
        !hasDashboardContent(dashboard.layout),
    )

    return id
  }

  const updateLayout = (model: Model) => {
    const newLayout = model.toJson().layout
    const newOpenDashboards = [...openDashboards]
    newOpenDashboards[selectedDashboard] = {
      ...openDashboards[selectedDashboard],
      layout: newLayout,
    }
    setDashboards(newOpenDashboards)
  }

  const updateDashboardLayout = (index: number, layout: DashboardLayout) => {
    const dashboard = openDashboards[index]

    if (!dashboard) {
      return
    }

    const newOpenDashboards = [...openDashboards]
    newOpenDashboards[index] = {
      ...dashboard,
      layout,
    }

    setDashboards(newOpenDashboards)
    setSelectedDashboard(index)
  }

  const renameDashboard = (id: string, newName: string) => {
    const newOpenDashboards = openDashboards.map((dashboard) => {
      if (dashboard.id === id) {
        return { ...dashboard, name: newName }
      }
      return dashboard
    })

    setDashboards(newOpenDashboards)
  }

  return (
    <DashboardContext.Provider
      {...props}
      value={{
        openDashboards,
        selectedDashboard,
        setSelectedDashboard,
        removeDashboard,
        closeAllDashboards,
        closeDashboardsToRight,
        reorderDashboard,
        addDashboard,
        addDashboards,
        addStudyPathContainer,
        updateStudyPathContainer,
        replaceDashboard,
        updateLayout,
        updateDashboardLayout,
        renameDashboard,
        editingDashboardIds,
        setDashboardEditing,
        isDashboardEditing,
      }}
    />
  )
}

export const useDashboards = () => {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboards must be used within a DashboardProvider')
  }
  return context
}

export default DashboardProvider

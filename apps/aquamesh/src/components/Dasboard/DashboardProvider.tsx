import React, { useState } from 'react'
import { useContext } from 'react'

import { nanoid } from 'nanoid'

import { DEFAULT_DASHBOARD, DefaultDashboard } from './fixture'

import { useStore, StateDashboard, DashboardLayout } from '../../state/store'

import { Model } from 'flexlayout-react'

interface DashboardProviderProps {
  children: React.ReactNode
}

interface DashboardContextType {
  openDashboards: StateDashboard[]
  selectedDashboard: number
  setSelectedDashboard: (index: number) => void
  removeDashboard: (id: string) => void
  addDashboard: (dashboard?: DefaultDashboard) => string
  replaceDashboard: (index: number, dashboard: DefaultDashboard) => string
  updateLayout: (model: Model) => void
  updateDashboardLayout: (index: number, layout: DashboardLayout) => void
  renameDashboard: (id: string, newName: string) => void
  editingDashboardIds: string[]
  setDashboardEditing: (id: string, isEditing: boolean) => void
  isDashboardEditing: (id?: string) => boolean
}

const DashboardContext = React.createContext<DashboardContextType | null>(null)

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

  const removeDashboard = (id: string) => {
    const dashboards = openDashboards.filter((dashboard) => dashboard.id !== id)

    setDashboards(dashboards)
    setEditingDashboardIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== id),
    )

    if (selectedDashboard >= dashboards.length) {
      setSelectedDashboard(selectedDashboard - 1)
    }
  }

  const addDashboard = (dashboard = DEFAULT_DASHBOARD) => {
    const id = nanoid()
    const newDashboard = openDashboards.concat(Object.assign({ id }, dashboard))
    const newSelectedDashboard = openDashboards.length

    setDashboards(newDashboard)
    setSelectedDashboard(newSelectedDashboard)

    if (!hasDashboardContent(dashboard.layout)) {
      setDashboardEditing(id, true)
    }

    return id
  }

  const replaceDashboard = (index: number, dashboard: DefaultDashboard) => {
    const currentDashboard = openDashboards[index]
    const id = nanoid()
    const newOpenDashboards = [...openDashboards]

    newOpenDashboards[index] = Object.assign({ id }, dashboard)
    setDashboards(newOpenDashboards)
    setSelectedDashboard(index)

    if (currentDashboard) {
      setDashboardEditing(currentDashboard.id, false)
    }

    setDashboardEditing(id, !hasDashboardContent(dashboard.layout))

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
        addDashboard,
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

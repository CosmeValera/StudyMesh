import { Layout } from '../../types/types'

export interface DefaultDashboard {
  name: string
  isEditing?: boolean
  layout?: Layout
}

export const DEFAULT_DASHBOARD: DefaultDashboard = {
  name: 'Dashboard',
  isEditing: true,
  layout: {
    type: 'row',
    weight: 100,
    children: [],
  },
}

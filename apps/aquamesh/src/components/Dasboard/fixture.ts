import { DashboardLayout } from '../../state/store'

export interface DefaultDashboard {
  name: string;
  layout?: DashboardLayout
}

export const DEFAULT_DASHBOARD: DefaultDashboard = {
  name: 'Dashboard',
  layout: {
    type: 'row',
    weight: 100,
    children: [],
  },
}

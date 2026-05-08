export const AQUAMESH_ONBOARDING_EVENT = 'aquamesh-workspace-onboarding-event'
export const AQUAMESH_ONBOARDING_RESET_EVENT =
  'aquamesh-workspace-onboarding-reset'

export type WorkspaceOnboardingEventType =
  | 'dashboard-editor-opened'
  | 'widgets-menu-opened'
  | 'widget-editor-opened'
  | 'component-added'
  | 'container-selected'
  | 'component-edit-saved'
  | 'widget-saved'
  | 'widget-editor-closed'
  | 'saved-widget-added'
  | 'dashboard-layout-changed'
  | 'dashboard-saved'
  | 'dashboard-editor-closed'
  | 'dashboard-menu-opened'
  | 'saved-dashboard-opened'

export interface WorkspaceOnboardingEventDetail {
  type: WorkspaceOnboardingEventType
  componentType?: string
  componentId?: string
  widgetId?: string
  widgetName?: string
  dashboardId?: string
  dashboardName?: string
  tabCount?: number
  tabsetCount?: number
}

export const dispatchWorkspaceOnboardingEvent = (
  detail: WorkspaceOnboardingEventDetail,
) => {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<WorkspaceOnboardingEventDetail>(AQUAMESH_ONBOARDING_EVENT, {
      detail,
    }),
  )
}

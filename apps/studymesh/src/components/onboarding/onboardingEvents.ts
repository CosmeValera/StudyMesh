export const STUDYMESH_ONBOARDING_EVENT = 'studymesh-workspace-onboarding-event'
export const STUDYMESH_ONBOARDING_RESET_EVENT =
  'studymesh-workspace-onboarding-reset'
export const AQUAMESH_ONBOARDING_EVENT = STUDYMESH_ONBOARDING_EVENT
export const AQUAMESH_ONBOARDING_RESET_EVENT = STUDYMESH_ONBOARDING_RESET_EVENT

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
    new CustomEvent<WorkspaceOnboardingEventDetail>(STUDYMESH_ONBOARDING_EVENT, {
      detail,
    }),
  )
}

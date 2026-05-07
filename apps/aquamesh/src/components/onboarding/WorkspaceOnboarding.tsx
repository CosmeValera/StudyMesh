import React from 'react'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import {
  AQUAMESH_ONBOARDING_EVENT,
  AQUAMESH_ONBOARDING_RESET_EVENT,
  WorkspaceOnboardingEventDetail,
} from './onboardingEvents'

export const WORKSPACE_ONBOARDING_KEY = 'aquamesh-workspace-onboarding-v1'
const OLD_DASHBOARD_ONBOARDING_KEY = 'aquamesh-dashboard-onboarding-step-v2'

export type WorkspaceOnboardingStepId =
  | 'create-dashboard'
  | 'open-widgets'
  | 'create-widget'
  | 'add-group'
  | 'select-group'
  | 'add-component'
  | 'tune-component'
  | 'save-widget'
  | 'close-widget'
  | 'add-saved-widget'
  | 'add-second-widget'
  | 'split-layout'
  | 'save-dashboard'
  | 'close-dashboard'
  | 'open-dashboard-menu'
  | 'open-saved-dashboard'
  | 'done'

type WorkspaceOnboardingStatus = 'active' | 'dismissed' | 'done'

export interface WorkspaceOnboardingState {
  status: WorkspaceOnboardingStatus
  stepId: WorkspaceOnboardingStepId
  createdWidgetId?: string
  createdWidgetName?: string
  savedDashboardId?: string
  savedDashboardName?: string
  showDone?: boolean
}

interface StepDefinition {
  id: WorkspaceOnboardingStepId
  targetId?: string
  progress: string
  instruction: (state: WorkspaceOnboardingState) => string
  actionLabel?: string
}

const stepOrder: WorkspaceOnboardingStepId[] = [
  'create-dashboard',
  'open-widgets',
  'create-widget',
  'add-group',
  'select-group',
  'add-component',
  'tune-component',
  'save-widget',
  'close-widget',
  'add-saved-widget',
  'add-second-widget',
  'split-layout',
  'save-dashboard',
  'close-dashboard',
  'open-dashboard-menu',
  'open-saved-dashboard',
  'done',
]

const stepDefinitions: Record<WorkspaceOnboardingStepId, StepDefinition> = {
  'create-dashboard': {
    id: 'create-dashboard',
    targetId: 'create-dashboard-empty',
    progress: 'Step 1 of 17 | Step 1 of 3 (Dashboard Creation)',
    instruction: () => 'Create a dashboard from the empty workspace.'
  },
  'open-widgets': {
    id: 'open-widgets',
    targetId: 'dashboard-editor-widgets',
    progress: 'Step 2 of 17',
    instruction: () => 'Open Widgets in the dashboard editor.',
    actionLabel: 'Widgets',
  },
  'create-widget': {
    id: 'create-widget',
    targetId: 'dashboard-widget-create',
    progress: 'Step 3 of 17',
    instruction: () => 'Choose Create Widget from this menu.'
  },
  'add-group': {
    id: 'add-group',
    targetId: 'palette-item-FieldSet',
    progress: 'Step 4 of 17',
    instruction: () => 'Add a Grouped Section to start a reusable widget.',
  },
  'select-group': {
    id: 'select-group',
    targetId: 'component-target-control',
    progress: 'Step 5 of 17',
    instruction: () =>
      'Select the group target so the next block lands inside it.',
  },
  'add-component': {
    id: 'add-component',
    targetId: 'palette-item-Label',
    progress: 'Step 6 of 17',
    instruction: () => 'Add a Label inside the active group (click the item, or drag it inside the group).',
  },
  'tune-component': {
    id: 'tune-component',
    targetId: 'component-edit-control',
    progress: 'Step 7 of 17',
    instruction: () => 'Edit a block, then save the component settings.',
  },
  'save-widget': {
    id: 'save-widget',
    targetId: 'widget-editor-save',
    progress: 'Step 8 of 17',
    instruction: () => 'Save the widget so it can be reused in dashboards.',
  },
  'close-widget': {
    id: 'close-widget',
    targetId: 'close-create-widget',
    progress: 'Step 9 of 17',
    instruction: (state) =>
      `Close Create Widget and return to the dashboard editor${state.createdWidgetName ? ` with "${state.createdWidgetName}" saved` : ''}.`,
  },
  'add-saved-widget': {
    id: 'add-saved-widget',
    targetId: 'dashboard-widget-saved',
    progress: 'Step 10 of 17',
    instruction: (state) =>
      `Add ${state.createdWidgetName || 'your saved widget'} to the dashboard.`,
    actionLabel: 'Widgets',
  },
  'add-second-widget': {
    id: 'add-second-widget',
    targetId: 'dashboard-editor-widgets',
    progress: 'Step 11 of 17',
    instruction: () => 'Add one more widget so the dashboard has two tabs.',
    actionLabel: 'Widgets',
  },
  'split-layout': {
    id: 'split-layout',
    targetId: 'flexlayout-tab',
    progress: 'Step 12 of 17',
    instruction: () => 'Drag a tab into a new area to split the layout.',
  },
  'save-dashboard': {
    id: 'save-dashboard',
    targetId: 'dashboard-editor-save',
    progress: 'Step 13 of 17',
    instruction: () => 'Save the dashboard so it appears in Dashboards.',
    actionLabel: 'Save',
  },
  'close-dashboard': {
    id: 'close-dashboard',
    targetId: 'dashboard-editor-close',
    progress: 'Step 14 of 17',
    instruction: () => 'Close the dashboard editor.',
    actionLabel: 'Close',
  },
  'open-dashboard-menu': {
    id: 'open-dashboard-menu',
    targetId: 'topnav-dashboards',
    progress: 'Step 15 of 17',
    instruction: () => 'Open Dashboards from the top navigation.',
    actionLabel: 'Dashboards',
  },
  'open-saved-dashboard': {
    id: 'open-saved-dashboard',
    targetId: 'topnav-saved-dashboard',
    progress: 'Step 16 of 17',
    instruction: (state) =>
      `Open ${state.savedDashboardName || 'your saved dashboard'} from this menu.`,
  },
  done: {
    id: 'done',
    progress: 'Step 17 of 17',
    instruction: () => 'Dashboard opened in the workspace. You have completed the onboarding! 🥳 Feel free to explore and build more dashboards and widgets. You can reactivate the tutorial in settings whenever you want.',
  },
}

export const createInitialWorkspaceOnboardingState =
  (): WorkspaceOnboardingState => ({
    status: 'active',
    stepId: 'create-dashboard',
  })

const defaultState: WorkspaceOnboardingState = {
  status: 'active',
  stepId: 'create-dashboard',
}

const readStoredState = (): WorkspaceOnboardingState => {
  if (typeof window === 'undefined') {
    return defaultState
  }

  try {
    const saved = window.localStorage.getItem(WORKSPACE_ONBOARDING_KEY)
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) }
    }

    if (window.localStorage.getItem(OLD_DASHBOARD_ONBOARDING_KEY) === 'done') {
      return { ...defaultState, status: 'done', stepId: 'done' }
    }
  } catch (error) {
    console.error('Failed to read workspace onboarding state', error)
  }

  return defaultState
}

const getNextStep = (stepId: WorkspaceOnboardingStepId) =>
  stepOrder[Math.min(stepOrder.indexOf(stepId) + 1, stepOrder.length - 1)]

const countDashboardNodes = (
  layout: unknown,
): { tabCount: number; tabsetCount: number } => {
  if (!layout || typeof layout !== 'object') {
    return { tabCount: 0, tabsetCount: 0 }
  }

  const node = layout as { type?: string; children?: unknown[] }
  const childCounts = (node.children || []).reduce(
    (counts, child) => {
      const next = countDashboardNodes(child)
      return {
        tabCount: counts.tabCount + next.tabCount,
        tabsetCount: counts.tabsetCount + next.tabsetCount,
      }
    },
    { tabCount: 0, tabsetCount: 0 },
  )

  return {
    tabCount: childCounts.tabCount + (node.type === 'tab' ? 1 : 0),
    tabsetCount: childCounts.tabsetCount + (node.type === 'tabset' ? 1 : 0),
  }
}

const shouldAdvance = (
  stepId: WorkspaceOnboardingStepId,
  detail: WorkspaceOnboardingEventDetail,
) => {
  switch (stepId) {
    case 'create-dashboard':
      return detail.type === 'dashboard-editor-opened'
    case 'open-widgets':
      return detail.type === 'widgets-menu-opened'
    case 'create-widget':
      return detail.type === 'widget-editor-opened'
    case 'add-group':
      return (
        detail.type === 'component-added' &&
        ['FieldSet', 'FlexBox', 'GridBox'].includes(detail.componentType || '')
      )
    case 'select-group':
      return detail.type === 'container-selected'
    case 'add-component':
      return (
        detail.type === 'component-added' &&
        detail.componentType !== 'FieldSet' &&
        detail.componentType !== 'FlexBox' &&
        detail.componentType !== 'GridBox'
      )
    case 'tune-component':
      return detail.type === 'component-edit-saved'
    case 'save-widget':
      return detail.type === 'widget-saved'
    case 'close-widget':
      return detail.type === 'widget-editor-closed'
    case 'add-saved-widget':
      return detail.type === 'saved-widget-added'
    case 'add-second-widget':
      return (
        detail.type === 'dashboard-layout-changed' &&
        (detail.tabCount || 0) >= 2
      )
    case 'split-layout':
      return (
        detail.type === 'dashboard-layout-changed' &&
        (detail.tabCount || 0) >= 2 &&
        (detail.tabsetCount || 0) >= 2
      )
    case 'save-dashboard':
      return detail.type === 'dashboard-saved'
    case 'close-dashboard':
      return detail.type === 'dashboard-editor-closed'
    case 'open-dashboard-menu':
      return detail.type === 'dashboard-menu-opened'
    case 'open-saved-dashboard':
      return detail.type === 'saved-dashboard-opened'
    default:
      return false
  }
}

export const reduceWorkspaceOnboardingState = (
  state: WorkspaceOnboardingState,
  detail: WorkspaceOnboardingEventDetail,
): WorkspaceOnboardingState => {
  if (state.status !== 'active' || !shouldAdvance(state.stepId, detail)) {
    return state
  }

  const nextStep = getNextStep(state.stepId)
  const nextState: WorkspaceOnboardingState = {
    ...state,
    stepId: nextStep,
    showDone: nextStep === 'done',
  }

  if (detail.type === 'widget-saved') {
    nextState.createdWidgetId = detail.widgetId
    nextState.createdWidgetName = detail.widgetName
  }

  if (detail.type === 'dashboard-saved') {
    nextState.savedDashboardId = detail.dashboardId
    nextState.savedDashboardName = detail.dashboardName
  }

  if (nextStep === 'done') {
    nextState.status = 'done'
  }

  return nextState
}

const getTarget = (targetId?: string, state?: WorkspaceOnboardingState) => {
  if (!targetId || typeof document === 'undefined') {
    return null
  }

  if (targetId === 'topnav-saved-dashboard') {
    return document.querySelector(
      `[data-onboarding-id="${targetId}"][data-dashboard-id="${state?.savedDashboardId || ''}"]`,
    ) as HTMLElement | null
  }

  if (targetId === 'dashboard-widget-saved') {
    return document.querySelector(
      `[data-onboarding-id="${targetId}"][data-widget-id="${state?.createdWidgetId || ''}"]`,
    ) as HTMLElement | null
  }

  return document.querySelector(
    `[data-onboarding-id="${targetId}"]`,
  ) as HTMLElement | null
}

const WorkspaceOnboarding = () => {
  const [state, setState] = React.useState(readStoredState)

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        WORKSPACE_ONBOARDING_KEY,
        JSON.stringify(state),
      )
    } catch (error) {
      console.error('Failed to save workspace onboarding state', error)
    }
  }, [state])

  React.useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<WorkspaceOnboardingEventDetail>
      setState((current) =>
        reduceWorkspaceOnboardingState(current, customEvent.detail),
      )
    }
    const handleReset = () => {
      setState(createInitialWorkspaceOnboardingState())
    }
    const handleWidgetStorageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        action?: string
        widgetId?: string
        name?: string
      }>

      if (
        customEvent.detail?.action !== 'save' &&
        customEvent.detail?.action !== 'update'
      ) {
        return
      }

      setState((current) =>
        reduceWorkspaceOnboardingState(current, {
          type: 'widget-saved',
          widgetId: customEvent.detail?.widgetId,
          widgetName: customEvent.detail?.name,
        }),
      )
    }

    window.addEventListener(AQUAMESH_ONBOARDING_EVENT, handleEvent)
    window.addEventListener(AQUAMESH_ONBOARDING_RESET_EVENT, handleReset)
    document.addEventListener('widgetStorageUpdated', handleWidgetStorageEvent)
    return () => {
      window.removeEventListener(AQUAMESH_ONBOARDING_EVENT, handleEvent)
      window.removeEventListener(AQUAMESH_ONBOARDING_RESET_EVENT, handleReset)
      document.removeEventListener(
        'widgetStorageUpdated',
        handleWidgetStorageEvent,
      )
    }
  }, [])

  React.useEffect(() => {
    if (state.status !== 'active') {
      return
    }

    const step = stepDefinitions[state.stepId]
    const target = getTarget(step.targetId, state)
    if (!target) {
      return
    }

    const previousOutline = target.style.outline
    const previousOutlineOffset = target.style.outlineOffset
    const previousScrollMargin = target.style.scrollMargin
    target.style.outline = '3px solid #00C49A'
    target.style.outlineOffset = '3px'
    target.style.scrollMargin = '96px'
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' })

    return () => {
      target.style.outline = previousOutline
      target.style.outlineOffset = previousOutlineOffset
      target.style.scrollMargin = previousScrollMargin
    }
  }, [state])

  React.useEffect(() => {
    if (!state.showDone) {
      return
    }

    const timeout = window.setTimeout(() => {
      setState((current) => ({ ...current, showDone: false }))
    }, 3000)

    return () => window.clearTimeout(timeout)
  }, [state.showDone])

  const userIsBuilder = React.useMemo(() => {
    try {
      const userData = window.localStorage.getItem('userData')
      if (!userData) {
        return false
      }
      const parsed = JSON.parse(userData)
      return parsed.id === 'admin' && parsed.role === 'ADMIN_ROLE'
    } catch {
      return false
    }
  }, [])

  if (!userIsBuilder || state.status === 'dismissed') {
    return null
  }

  if (state.status === 'done' && !state.showDone) {
    return null
  }

  const step = stepDefinitions[state.stepId]
  const target = getTarget(step.targetId, state)

  const handleAction = () => {
    target?.click()
  }

  const handleSkip = () => {
    setState({ ...state, status: 'dismissed' })
  }

  return (
    <Paper
      elevation={8}
      aria-live="polite"
      data-testid="workspace-onboarding-coach"
      sx={{
        position: 'fixed',
        top: { xs: 'auto', sm: 88 },
        bottom: { xs: 12, sm: 'auto' },
        right: { xs: 12, sm: 16 },
        left: { xs: 12, sm: 'auto' },
        width: { xs: 'auto', sm: 360 },
        zIndex: 1500,
        p: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'primary.light',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Stack spacing={1}>
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 700 }}
          >
            {step.progress}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25 }}>
            {step.instruction(state)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {step.actionLabel && target && (
            <Button size="small" variant="contained" onClick={handleAction}>
              {step.actionLabel}
            </Button>
          )}
          {state.stepId !== 'done' && (
            <Button size="small" variant="text" onClick={handleSkip}>
              Skip
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}

export { countDashboardNodes }
export default WorkspaceOnboarding

import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  default as WorkspaceOnboarding,
  reduceWorkspaceOnboardingState,
  WorkspaceOnboardingState,
  countDashboardNodes,
} from '../../../../src/components/onboarding/WorkspaceOnboarding'
import { dispatchWorkspaceOnboardingNotice } from '../../../../src/components/onboarding/onboardingEvents'

const activeState = (
  stepId: WorkspaceOnboardingState['stepId'],
): WorkspaceOnboardingState => ({
  status: 'active',
  stepId,
})

describe('WorkspaceOnboarding reducer', () => {
  it('advances through adaptive creation events and captures saved names', () => {
    const afterDashboard = reduceWorkspaceOnboardingState(
      activeState('create-dashboard'),
      { type: 'dashboard-editor-opened' },
    )
    expect(afterDashboard.stepId).toBe('open-widgets')

    const afterWidgetSave = reduceWorkspaceOnboardingState(
      activeState('save-widget'),
      {
        type: 'widget-saved',
        widgetId: 'widget-1',
        widgetName: 'Study Notes',
      },
    )
    expect(afterWidgetSave.stepId).toBe('close-widget')
    expect(afterWidgetSave.createdWidgetId).toBe('widget-1')
    expect(afterWidgetSave.createdWidgetName).toBe('Study Notes')

    const afterDashboardSave = reduceWorkspaceOnboardingState(
      activeState('save-dashboard'),
      {
        type: 'dashboard-saved',
        dashboardId: 'dashboard-1',
        dashboardName: 'Physics',
      },
    )
    expect(afterDashboardSave.stepId).toBe('close-dashboard')
    expect(afterDashboardSave.savedDashboardId).toBe('dashboard-1')
    expect(afterDashboardSave.savedDashboardName).toBe('Physics')
  })

  it('requires grouped component, second tab, and split layout milestones', () => {
    expect(
      reduceWorkspaceOnboardingState(activeState('add-group'), {
        type: 'component-added',
        componentType: 'Label',
      }).stepId,
    ).toBe('add-group')

    expect(
      reduceWorkspaceOnboardingState(activeState('add-group'), {
        type: 'component-added',
        componentType: 'FieldSet',
      }).stepId,
    ).toBe('select-group')

    expect(
      reduceWorkspaceOnboardingState(activeState('add-second-widget'), {
        type: 'dashboard-layout-changed',
        tabCount: 2,
        tabsetCount: 1,
      }).stepId,
    ).toBe('split-layout')

    expect(
      reduceWorkspaceOnboardingState(activeState('split-layout'), {
        type: 'dashboard-layout-changed',
        tabCount: 2,
        tabsetCount: 1,
      }).stepId,
    ).toBe('split-layout')

    expect(
      reduceWorkspaceOnboardingState(activeState('split-layout'), {
        type: 'dashboard-layout-changed',
        tabCount: 2,
        tabsetCount: 2,
      }).stepId,
    ).toBe('save-dashboard')
  })

  it('suppresses dismissed and done states', () => {
    expect(
      reduceWorkspaceOnboardingState(
        { status: 'dismissed', stepId: 'create-dashboard' },
        { type: 'dashboard-editor-opened' },
      ).stepId,
    ).toBe('create-dashboard')

    const done = reduceWorkspaceOnboardingState(
      activeState('open-saved-dashboard'),
      { type: 'saved-dashboard-opened' },
    )
    expect(done.status).toBe('done')
    expect(done.stepId).toBe('done')
    expect(done.showDone).toBe(true)
  })

  it('counts dashboard tabs and tabsets', () => {
    expect(
      countDashboardNodes({
        type: 'row',
        children: [
          {
            type: 'tabset',
            children: [{ type: 'tab', component: 'CustomWidget' }],
          },
          {
            type: 'tabset',
            children: [{ type: 'tab', component: 'CustomWidget' }],
          },
        ],
      }),
    ).toEqual({ tabCount: 2, tabsetCount: 2 })
  })
})

describe('WorkspaceOnboarding display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'userData') {
        return JSON.stringify({
          id: 'admin',
          role: 'ADMIN_ROLE',
        })
      }

      return null
    })
  })

  it('does not show the onboarding coach for a first-time user by default', () => {
    render(React.createElement(WorkspaceOnboarding))

    expect(
      screen.queryByTestId('workspace-onboarding-coach'),
    ).not.toBeInTheDocument()
  })

  it('shows onboarding-style notices', async () => {
    render(React.createElement(WorkspaceOnboarding))

    act(() => {
      dispatchWorkspaceOnboardingNotice('AI mode changed to Google Local AI.')
    })

    expect(
      await screen.findByTestId('workspace-onboarding-notice'),
    ).toHaveTextContent('AI settings saved')
    expect(
      screen.getByText('AI mode changed to Google Local AI.'),
    ).toBeInTheDocument()
  })
})

export type WorkspaceCreationTask = 'study-path' | 'from-notes'

export type WorkspaceCreationTaskState =
  | 'idle'
  | 'running'
  | 'complete'
  | 'error'

export interface WorkspaceCreationStatusDetail {
  task: WorkspaceCreationTask
  state: WorkspaceCreationTaskState
  message?: string
}

export const WORKSPACE_CREATION_STATUS_EVENT =
  'studymesh-workspace-creation-status'

export const workspaceCreationTaskLabels: Record<WorkspaceCreationTask, string> =
  {
    'study-path': 'Create Study Path',
    'from-notes': 'Create From Notes',
  }

export const dispatchWorkspaceCreationStatus = (
  detail: WorkspaceCreationStatusDetail,
) => {
  window.dispatchEvent(
    new CustomEvent<WorkspaceCreationStatusDetail>(
      WORKSPACE_CREATION_STATUS_EVENT,
      { detail },
    ),
  )
}

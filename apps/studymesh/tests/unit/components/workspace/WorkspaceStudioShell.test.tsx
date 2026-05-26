import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import WorkspaceStudioShell from '../../../../src/components/workspace/WorkspaceStudioShell'
import { OPEN_CREATE_HUB_EVENT } from '../../../../src/customHooks/useWorkspaceActions'
import { generateStudyPackWithAi } from '../../../../src/studyPack/ai'

const createStudyPackDashboardMock = vi.fn()
let dashboardContextText = 'Dashboard notes about photosynthesis'

vi.mock('../../../../src/customHooks/useWorkspaceActions', () => ({
  __esModule: true,
  OPEN_CREATE_HUB_EVENT: 'studymesh-open-create-hub',
  OPEN_DASHBOARD_EDITOR_EVENT: 'studymesh-open-dashboard-editor',
  OPEN_STUDY_PACK_EVENT: 'studymesh-open-study-pack',
  OPEN_STUDY_PATH_EVENT: 'studymesh-open-study-path',
  OPEN_WIDGET_EDITOR_EVENT: 'studymesh-open-widget-editor',
  useWorkspaceActions: () => ({
    createStudyPackDashboard: createStudyPackDashboardMock,
    createStudyPackDashboards: vi.fn(),
  }),
}))

vi.mock('../../../../src/components/Dasboard/DashboardProvider', () => ({
  __esModule: true,
  useDashboards: () => ({
    openDashboards: [
      {
        id: 'dashboard-1',
        name: 'Biology Dashboard',
        layout: { type: 'row', children: [] },
      },
    ],
    selectedDashboard: 0,
  }),
}))

vi.mock('../../../../src/dashboardChat/contextBuilder', () => ({
  __esModule: true,
  buildDashboardChatContext: () => ({ chunks: [{}] }),
  formatDashboardChatContext: () => dashboardContextText,
}))

vi.mock('../../../../src/studyPack/ai', () => ({
  __esModule: true,
  STUDY_PACK_AI_SETTINGS_CHANGED_EVENT: 'studymesh-ai-settings-changed',
  readStudyPackAiSettings: () => ({ provider: 'basic' }),
  resolveStudyPackAiCredentials: () => ({ apiToken: '', model: '' }),
  generateStudyPackWithAi: vi.fn(),
}))

vi.mock('../../../../src/studyPack', () => ({
  __esModule: true,
  createStudyPackOrchestratorWidgets: vi.fn(() => []),
}))

vi.mock('../../../../src/studyPack/documentExtraction', () => ({
  __esModule: true,
  extractTextFromPdf: vi.fn(),
  extractTextFromPptx: vi.fn(),
}))

vi.mock('../../../../src/studyPack/imageOcr', () => ({
  __esModule: true,
  extractRawNotesFromImage: vi.fn(),
}))

vi.mock('../../../../src/components/studyPack/CreateStudyPackModal', () => ({
  __esModule: true,
  default: () => <div data-testid="create-study-pack-modal" />,
}))

vi.mock('../../../../src/components/studyPack/CreateStudyPathModal', () => ({
  __esModule: true,
  default: () => <div data-testid="create-study-path-modal" />,
}))

vi.mock('../../../../src/components/workspace/WidgetEditorDialog', () => ({
  __esModule: true,
  default: () => null,
}))

const openCreation = (detail: Record<string, unknown> = {}) => {
  act(() => {
    window.dispatchEvent(
      new CustomEvent(OPEN_CREATE_HUB_EVENT, {
        detail,
      }),
    )
  })
}

const clickQuickCard = (label: string) => {
  const labelNode = screen.getByText(label)
  const button = labelNode.closest('button')
  if (!button) {
    throw new Error(`Could not find ${label} quick card button`)
  }
  fireEvent.click(button)
}

describe('WorkspaceStudioShell Quick Create', () => {
  beforeEach(() => {
    dashboardContextText = 'Dashboard notes about photosynthesis'
    Element.prototype.scrollIntoView = vi.fn()
    createStudyPackDashboardMock.mockReturnValue({
      name: 'Generated Dashboard',
    })
    vi.mocked(generateStudyPackWithAi).mockResolvedValue({
      id: 'draft-pack',
      title: 'Generated Dashboard',
      sourceFormat: 'text',
      objects: [],
      warnings: [],
      sourceSummary: { title: 'Summary', bullets: [] },
    })
  })

  it('runs quick creation immediately when options are collapsed', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation()
    clickQuickCard('Quiz')

    await waitFor(() => expect(generateStudyPackWithAi).toHaveBeenCalled())
    expect(generateStudyPackWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'quiz',
        rawNotes: expect.stringContaining(
          'Dashboard notes about photosynthesis',
        ),
      }),
    )
  })

  it('selects a quick action without generating when options are expanded', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ openQuickOptions: true })
    clickQuickCard('Flashcards')

    expect(generateStudyPackWithAi).not.toHaveBeenCalled()
    expect(screen.getByText(/Flashcards selected/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Create Flashcards$/i }),
    ).toBeEnabled()
    expect(screen.queryByText(/^Add sources$/i)).not.toBeInTheDocument()
  })

  it('generates from the bottom CTA for the selected expanded-options action', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ openQuickOptions: true })
    clickQuickCard('Flashcards')
    fireEvent.click(
      screen.getByRole('button', { name: /^Create Flashcards$/i }),
    )

    await waitFor(() => expect(generateStudyPackWithAi).toHaveBeenCalled())
    expect(generateStudyPackWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'flashcards',
      }),
    )
  })

  it('uses pasted source material from options when the bottom CTA runs', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ intent: 'quiz', openQuickOptions: true })
    fireEvent.click(screen.getByRole('button', { name: /^Sources$/i }))
    fireEvent.click(screen.getByRole('button', { name: /Copied text/i }))
    fireEvent.change(screen.getByLabelText(/Copied text/i), {
      target: { value: 'Custom source notes about enzymes' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Add copied text/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Create Quiz$/i }))

    await waitFor(() => expect(generateStudyPackWithAi).toHaveBeenCalled())
    expect(generateStudyPackWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'quiz',
        rawNotes: expect.stringContaining('Custom source notes about enzymes'),
      }),
    )
  })

  it('returns to dashboard context for quick card clicks after options collapse', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ openQuickOptions: true })
    fireEvent.click(screen.getByRole('button', { name: /^Sources$/i }))
    fireEvent.click(screen.getByRole('button', { name: /Copied text/i }))
    fireEvent.change(screen.getByLabelText(/Copied text/i), {
      target: { value: 'Custom source notes about enzymes' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Add copied text/i }))
    fireEvent.click(screen.getByRole('button', { name: /Hide options/i }))
    clickQuickCard('Quiz')

    await waitFor(() => expect(generateStudyPackWithAi).toHaveBeenCalled())
    expect(generateStudyPackWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'quiz',
        rawNotes: expect.stringContaining(
          'Dashboard notes about photosynthesis',
        ),
      }),
    )
  })

  it('disables the selected action CTA when no source or dashboard context exists', () => {
    dashboardContextText = ''

    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ openQuickOptions: true })
    clickQuickCard('Quiz')

    expect(
      screen.getAllByText(/Add material to create Quiz/i).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: /^Create Quiz$/i }),
    ).toBeDisabled()
    expect(generateStudyPackWithAi).not.toHaveBeenCalled()
  })

  it('shows the source upload area only after Sources is selected', () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ openQuickOptions: true })

    expect(
      screen.getByRole('button', { name: /^Current dashboard$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Sources$/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Add sources$/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Sources$/i }))

    expect(screen.getByText(/^Add sources$/i)).toBeInTheDocument()
  })
})

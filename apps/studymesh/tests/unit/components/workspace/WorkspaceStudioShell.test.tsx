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
  const button = screen.getAllByRole('button', { name: label })[0]
  if (!button) {
    throw new Error(`Could not find ${label} quick card button`)
  }
  fireEvent.click(button)
}

const openCreateFromMaterial = () => {
  fireEvent.click(screen.getByRole('button', { name: /Create from material/i }))
}

const addCopiedMaterial = (text: string) => {
  fireEvent.click(screen.getByRole('button', { name: /Copied text/i }))
  fireEvent.change(screen.getByLabelText(/Copied text/i), {
    target: { value: text },
  })
  fireEvent.click(screen.getByRole('button', { name: /Add copied text/i }))
}

describe('WorkspaceStudioShell Quick Create', () => {
  beforeEach(() => {
    dashboardContextText = 'Dashboard notes about photosynthesis'
    Element.prototype.scrollIntoView = vi.fn()
    createStudyPackDashboardMock.mockReturnValue({
      name: 'Generated Dashboard',
    })
    vi.mocked(generateStudyPackWithAi).mockClear()
    vi.mocked(generateStudyPackWithAi).mockResolvedValue({
      id: 'draft-pack',
      title: 'Generated Dashboard',
      sourceFormat: 'text',
      objects: [],
      warnings: [],
      sourceSummary: { title: 'Summary', bullets: [] },
    })
  })

  it('runs quick creation immediately from the dashboard', async () => {
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

  it('opens a separate Create from Material flow from the hub link', () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation()
    openCreateFromMaterial()

    expect(
      screen.getByRole('heading', { name: /Create from Material/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Step 1: Choose output/i)).toBeInTheDocument()
    expect(screen.getByText(/Step 2: Choose source/i)).toBeInTheDocument()
    expect(screen.getByText(/Step 3: Options/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Current dashboard$/i }),
    ).toHaveClass('MuiButton-contained')
    expect(screen.queryByText(/^Add sources$/i)).not.toBeInTheDocument()
    expect(generateStudyPackWithAi).not.toHaveBeenCalled()
  })

  it('output cards in Create from Material select output without generating immediately', () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation()
    openCreateFromMaterial()
    clickQuickCard('Flashcards')

    expect(screen.getByText(/Flashcards selected/i)).toBeInTheDocument()
    expect(generateStudyPackWithAi).not.toHaveBeenCalled()
  })

  it('uses pasted source material from Create from Material when the bottom CTA runs', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ intent: 'quiz', openQuickOptions: true })
    addCopiedMaterial('Custom source notes about enzymes')
    fireEvent.click(screen.getByRole('button', { name: /^Create Quiz$/i }))

    await waitFor(() => expect(generateStudyPackWithAi).toHaveBeenCalled())
    expect(generateStudyPackWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'quiz',
        rawNotes: expect.stringContaining('Custom source notes about enzymes'),
      }),
    )
  })

  it('keeps Quick Create one-click after returning from Create from Material', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({ openQuickOptions: true })
    addCopiedMaterial('Custom source notes about enzymes')
    fireEvent.click(screen.getByRole('button', { name: /Back to Creation/i }))
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

  it('routes empty-dashboard quick card clicks into Create from Material with the output preselected', () => {
    dashboardContextText = ''

    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation()
    clickQuickCard('Quiz')

    expect(
      screen.getByRole('heading', { name: /Create from Material/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Quiz selected/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Create Quiz$/i }),
    ).toBeDisabled()
    expect(generateStudyPackWithAi).not.toHaveBeenCalled()
  })

  it('focuses the upload area when an empty-dashboard upload launcher opens Create from Material', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({
      intent: 'improvedNotes',
      openQuickOptions: true,
      quickSourceFocus: 'upload',
    })

    expect(
      screen.getByRole('heading', { name: /Create from Material/i }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^Upload files$/i }),
      ).toHaveFocus(),
    )
  })

  it('focuses the paste textarea when an empty-dashboard paste launcher opens Create from Material', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation({
      intent: 'improvedNotes',
      openQuickOptions: true,
      quickSourceFocus: 'paste',
    })

    expect(
      screen.getByRole('heading', { name: /Create from Material/i }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByLabelText(/Copied text/i)).toHaveFocus(),
    )
  })

  it('uses the dashboard source by default when the final CTA runs', async () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation()
    openCreateFromMaterial()
    fireEvent.click(screen.getByRole('button', { name: /^Create Quiz$/i }))

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

  it('shows source controls after Sources is selected inside Create from Material', () => {
    render(
      <WorkspaceStudioShell>
        <div>Dashboard canvas</div>
      </WorkspaceStudioShell>,
    )

    openCreation()
    openCreateFromMaterial()

    expect(screen.queryByText(/^Add sources$/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Current dashboard$/i }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Sources$/i }))
    expect(screen.getByText(/^Add sources$/i)).toBeInTheDocument()
  })
})

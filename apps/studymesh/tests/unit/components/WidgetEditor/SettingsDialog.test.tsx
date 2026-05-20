import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SettingsDialog from '../../../../src/components/WidgetEditor/components/dialogs/SettingsDialog'

vi.mock('../../../../src/studyPack/ai', () => ({
  DEFAULT_STUDY_PACK_AI_MODEL: 'gemini-test-model',
  getEnvGeminiApiKey: vi.fn(() => ''),
  readStudyPackAiSettings: vi.fn(() => ({
    provider: 'basic',
    apiToken: '',
    model: 'gemini-test-model',
  })),
  saveStudyPackAiSettings: vi.fn(),
  testLocalLanguageModel: vi.fn(),
}))

vi.mock('../../../../src/studyPack/studyMeshGuideSeed', () => ({
  seedStudyMeshGuideStudyPath: vi.fn(() => true),
}))

const readBlobText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

const createMemoryStorage = () => {
  const store = new Map<string, string>()

  vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
    store.has(key) ? store.get(key)! : null,
  )
  vi.mocked(localStorage.setItem).mockImplementation(
    (key: string, value: string) => {
      store.set(key, value)
    },
  )
  vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
    store.delete(key)
  })
  vi.mocked(localStorage.clear).mockImplementation(() => store.clear())

  return store
}

describe('SettingsDialog study library export', () => {
  let exportedBlob: Blob | null
  let downloadedFileName: string

  beforeEach(() => {
    exportedBlob = null
    downloadedFileName = ''

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          exportedBlob = blob
          return 'blob:study-library'
        }),
        revokeObjectURL: vi.fn(),
      }),
    )

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function click(this: HTMLAnchorElement) {
        downloadedFileName = this.download
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exports only selected dashboards from grouped folders', async () => {
    const storage = createMemoryStorage()
    storage.set(
      'customDashboards',
      JSON.stringify([
        { id: 'bio-1', name: 'Cells', folder: 'Biology' },
        { id: 'bio-2', name: 'Genetics', folder: 'Biology' },
        { id: 'hist-1', name: 'Rome', folder: 'History' },
      ]),
    )

    render(<SettingsDialog open onClose={vi.fn()} scope="global" />)

    fireEvent.click(screen.getByRole('button', { name: /export library/i }))

    const exportDialog = await screen.findByRole('dialog', {
      name: /export study library/i,
    })

    expect(
      within(exportDialog).getByRole('checkbox', {
        name: /select biology folder/i,
      }),
    ).toBeChecked()
    expect(
      within(exportDialog).getByRole('checkbox', { name: /select cells/i }),
    ).toBeChecked()
    expect(
      within(exportDialog).getByRole('checkbox', { name: /select genetics/i }),
    ).toBeChecked()

    fireEvent.click(
      within(exportDialog).getByRole('checkbox', { name: /select genetics/i }),
    )
    fireEvent.click(
      within(exportDialog).getByRole('checkbox', {
        name: /select history folder/i,
      }),
    )
    fireEvent.click(
      within(exportDialog).getByRole('button', { name: /export selected/i }),
    )

    expect(downloadedFileName).toMatch(
      /^studymesh-study-library-\d{4}-\d{2}-\d{2}\.json$/,
    )
    expect(exportedBlob).not.toBeNull()

    const payload = JSON.parse(await readBlobText(exportedBlob!))
    expect(payload.version).toBe(1)
    expect(payload.exportedAt).toEqual(expect.any(String))
    expect(payload.dashboards).toEqual([
      { id: 'bio-1', name: 'Cells', folder: 'Biology' },
    ])
  })
})

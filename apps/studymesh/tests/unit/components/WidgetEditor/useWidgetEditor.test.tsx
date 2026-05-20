/// <reference types="@testing-library/jest-dom" />
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWidgetEditor } from '../../../../src/components/WidgetEditor/hooks/useWidgetEditor'
import WidgetStorage from '../../../../src/components/WidgetEditor/WidgetStorage'

vi.mock('uuid', () => ({
  v4: () => 'editor-1',
}))

const component = {
  id: 'label-1',
  type: 'Label',
  props: { text: 'Status' },
}

describe('useWidgetEditor save naming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const store = new Map<string, string>()
    vi.mocked(localStorage.getItem).mockImplementation(
      (key: string) => store.get(key) ?? null,
    )
    vi.mocked(localStorage.setItem).mockImplementation(
      (key: string, value: string) => {
        store.set(key, value)
      },
    )
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      store.delete(key)
    })
    vi.mocked(localStorage.clear).mockImplementation(() => {
      store.clear()
    })
    localStorage.clear()
  })

  it('saves default duplicate widget names with readable numeric suffixes', async () => {
    WidgetStorage.saveWidget({
      name: 'New Widget',
      components: [component],
    })
    WidgetStorage.saveWidget({
      name: 'New Widget (2)',
      components: [component],
    })

    const { result } = renderHook(() => useWidgetEditor())

    await waitFor(() => {
      expect(result.current.savedWidgets).toHaveLength(2)
    })

    act(() => {
      result.current.setWidgetData({
        name: 'New Widget',
        components: [component],
      })
    })

    act(() => {
      result.current.handleSaveWidget()
    })

    await waitFor(() => {
      expect(result.current.savedWidgets.map((widget) => widget.name)).toEqual([
        'New Widget',
        'New Widget (2)',
        'New Widget (3)',
      ])
    })
  })

  it('cycles through all three view modes with Ctrl+E', async () => {
    const { result } = renderHook(() => useWidgetEditor())

    expect(result.current.viewMode).toBe('both')

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }),
      )
    })

    await waitFor(() => {
      expect(result.current.viewMode).toBe('edit')
    })

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }),
      )
    })

    await waitFor(() => {
      expect(result.current.viewMode).toBe('preview')
    })

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }),
      )
    })

    await waitFor(() => {
      expect(result.current.viewMode).toBe('both')
    })
  })
})

/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'

import ThemeModeToggle from '../../../src/components/shared/ThemeModeToggle'
import { createAquaMeshTheme, THEME_STORAGE_KEY } from '../../../src/theme'
import {
  ThemeModeProvider,
  useThemeMode,
} from '../../../src/theme/ThemeModeContext'

const Probe = () => {
  const { mode } = useThemeMode()
  const theme = React.useMemo(() => createAquaMeshTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <span data-testid="theme-mode">{mode}</span>
      <ThemeModeToggle />
    </ThemeProvider>
  )
}

describe('ThemeModeProvider', () => {
  it('uses the saved user preference and persists toggles', () => {
    vi.mocked(window.localStorage.getItem).mockImplementation((key) =>
      key === THEME_STORAGE_KEY ? 'dark' : null,
    )

    render(
      <ThemeModeProvider>
        <Probe />
      </ThemeModeProvider>,
    )

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')

    fireEvent.click(screen.getByRole('button', { name: /switch to light/i }))

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      THEME_STORAGE_KEY,
      'light',
    )
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light')
  })

  it('falls back to the system preference when no user preference exists', () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null)
    vi.mocked(window.matchMedia).mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <ThemeModeProvider>
        <Probe />
      </ThemeModeProvider>,
    )

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')
  })
})

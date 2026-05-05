import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { THEME_STORAGE_KEY } from './index'

export type ThemeMode = 'light' | 'dark'

interface ThemeModeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined,
)

const getSystemThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const getInitialThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedMode = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (savedMode === 'light' || savedMode === 'dark') {
    return savedMode
  }

  return getSystemThemeMode()
}

export const ThemeModeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [mode, setModeState] = useState<ThemeMode>(getInitialThemeMode)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemPreferenceChange = (event: MediaQueryListEvent) => {
      const savedMode = window.localStorage.getItem(THEME_STORAGE_KEY)

      if (!savedMode) {
        setModeState(event.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleSystemPreferenceChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemPreferenceChange)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = mode
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      setMode: (nextMode: ThemeMode) => {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextMode)
        setModeState(nextMode)
      },
      toggleMode: () => {
        setModeState((currentMode) => {
          const nextMode = currentMode === 'dark' ? 'light' : 'dark'
          window.localStorage.setItem(THEME_STORAGE_KEY, nextMode)
          return nextMode
        })
      },
    }),
    [mode],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  )
}

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext)

  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider')
  }

  return context
}

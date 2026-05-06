import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useSearchParams,
} from 'react-router-dom'

import TopNavBar from './components/topnavbar/TopNavBar'
import Main from './components/Main'
import Dashboards from './components/Dasboard/Dashboard'
import DashboardProvider from './components/Dasboard/DashboardProvider'
import LayoutProvider from './components/Layout/LayoutProvider'
import Login from './components/auth/Login'
import AquaMeshLanding from './components/landing/AquaMeshLanding'
import { useWorkspaceActions } from './customHooks/useWorkspaceActions'

import { createAquaMeshTheme } from './theme'
import { AccentColorProvider } from './theme/AccentColorContext'
import {
  accentColorOptions,
  applyAccentCssVariables,
  getAccentColorById,
  readStoredAccentColorId,
  writeStoredAccentColorId,
} from './theme/accentColors'
import { ThemeModeProvider, useThemeMode } from './theme/ThemeModeContext'
import { PrimeReactProvider } from 'primereact/api'
import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'
import 'primereact/resources/themes/lara-light-green/theme.css'
import 'primereact/resources/primereact.min.css'

import '../../../style/themes/aquamesh-theme/theme.scss'

import './variables.scss'
import './hide-overlay.scss'

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userData = localStorage.getItem('userData')

  // If no user data exists, automatically set admin user and continue to app
  if (!userData) {
    const defaultAdminUser = {
      id: 'admin',
      name: 'Admin',
      role: 'ADMIN_ROLE',
    }
    localStorage.setItem('userData', JSON.stringify(defaultAdminUser))
  }

  return <>{children}</>
}

const WorkspacePage = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    openCreateWidget,
    openOperationsExample,
    openMathExample,
    openTutorialExample,
    openWidgetMenu,
  } = useWorkspaceActions()
  const handledActionRef = useRef<string | null>(null)

  useEffect(() => {
    const action = searchParams.get('action')

    if (!action || handledActionRef.current === action) {
      return
    }

    handledActionRef.current = action

    if (action === 'create-widget') {
      openCreateWidget()
    } else if (action === 'open-operations-example') {
      openOperationsExample()
    } else if (action === 'open-math-example') {
      openMathExample()
    } else if (action === 'open-tutorial-example') {
      openTutorialExample()
    } else if (action === 'add-widget') {
      openWidgetMenu()
    }

    setSearchParams({}, { replace: true })
  }, [
    openCreateWidget,
    openOperationsExample,
    openMathExample,
    openTutorialExample,
    openWidgetMenu,
    searchParams,
    setSearchParams,
  ])

  return (
    <Box sx={{ overflow: 'hidden', height: '100dvh' }}>
      <TopNavBar open={menuOpen} setOpen={setMenuOpen} />
      <Main
        sx={{
          position: 'relative',
          marginTop: 0,
          height: { xs: 'calc(100dvh - 72px)', sm: 'calc(100dvh - 64px)' },
        }}
      >
        <Dashboards />
      </Main>
    </Box>
  )
}

const AppShell = () => {
  const { mode } = useThemeMode()
  const [accentColorId, setAccentColorId] = useState(readStoredAccentColorId)
  const accentColor = useMemo(
    () => getAccentColorById(accentColorId),
    [accentColorId],
  )
  const theme = useMemo(
    () => createAquaMeshTheme(mode, accentColorId),
    [accentColorId, mode],
  )

  useEffect(() => {
    writeStoredAccentColorId(accentColorId)
    applyAccentCssVariables(accentColor)
  }, [accentColor, accentColorId])

  const accentColorContextValue = useMemo(
    () => ({
      accentColorId,
      accentColor,
      setAccentColorId,
      options: accentColorOptions,
    }),
    [accentColor, accentColorId],
  )

  return (
    <AccentColorProvider value={accentColorContextValue}>
      <ThemeProvider theme={theme}>
        <PrimeReactProvider value={{ ripple: true }}>
          <CssBaseline />
          <DashboardProvider>
            <LayoutProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<AquaMeshLanding />} />
                <Route
                  path="/workspace"
                  element={
                    <ProtectedRoute>
                      <WorkspacePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </LayoutProvider>
          </DashboardProvider>
        </PrimeReactProvider>
      </ThemeProvider>
    </AccentColorProvider>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <ThemeModeProvider>
        <AppShell />
      </ThemeModeProvider>
    </BrowserRouter>
  )
}

export default App

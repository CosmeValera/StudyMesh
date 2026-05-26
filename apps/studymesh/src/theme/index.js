import { alpha, createTheme } from '@mui/material/styles'

import createPalette from './palette'
import { defaultAccentColorId, getAccentColorById } from './accentColors'
import typography from './typography'

export const THEME_STORAGE_KEY = 'studymesh-theme-mode'
const LEGACY_THEME_STORAGE_KEY = 'aquamesh-theme-mode'

if (
  typeof window !== 'undefined' &&
  window.localStorage.getItem(THEME_STORAGE_KEY) === null
) {
  const legacyMode = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
  if (legacyMode !== null) {
    window.localStorage.setItem(THEME_STORAGE_KEY, legacyMode)
  }
}

const createCssVariables = (themePalette, mode) => ({
  colorScheme: mode,
  '--studymesh-radius-sm': '10px',
  '--studymesh-radius-md': '14px',
  '--studymesh-radius-lg': '18px',
  '--studymesh-radius-xl': '24px',
  '--studymesh-space-1': '4px',
  '--studymesh-space-2': '8px',
  '--studymesh-space-3': '12px',
  '--studymesh-space-4': '16px',
  '--studymesh-space-5': '20px',
  '--studymesh-space-6': '24px',
  '--studymesh-shadow-card':
    mode === 'dark'
      ? '0 16px 44px rgba(0, 0, 0, 0.34)'
      : '0 16px 44px rgba(15, 23, 42, 0.08)',
  '--studymesh-shadow-raised':
    mode === 'dark'
      ? '0 22px 60px rgba(0, 0, 0, 0.46)'
      : '0 22px 60px rgba(15, 23, 42, 0.12)',
  '--studymesh-focus-ring': `${themePalette.primary.main}52`,
  '--studymesh-panel-border': themePalette.other.hairlineBorder,
  '--studymesh-panel-bg': themePalette.background.panel,
  '--studymesh-card-bg': themePalette.background.card,
  '--studymesh-card-hover-bg': themePalette.background.cardHover,
  '--studymesh-muted-bg': themePalette.background.muted,
  '--common-black': themePalette.common.black,
  '--common-white': themePalette.common.white,
  '--common-clear': themePalette.common.clear,
  '--foreground-primary': themePalette.foreground.primary,
  '--foreground-contrast-primary': themePalette.foreground.contrastPrimary,
  '--foreground-secondary': themePalette.foreground.secondary,
  '--foreground-contrast-secondary': themePalette.foreground.contrastSecondary,
  '--foreground-disabled': themePalette.foreground.disabled,
  '--foreground-contrast-disabled': themePalette.foreground.contrastDisabled,
  '--background-default': themePalette.background.default,
  '--background-paper': themePalette.background.paper,
  '--background-header': themePalette.background.header,
  '--background-bar-dark': themePalette.background.barDark,
  '--background-bar-medium': themePalette.background.barMedium,
  '--background-light': themePalette.background.light,
  '--background-accent-soft': themePalette.background.accentSoft,
  '--background-accent-surface': themePalette.background.accentSurface,
  '--surface-ground': themePalette.background.default,
  '--surface-section': themePalette.background.barMedium,
  '--surface-card': themePalette.background.paper,
  '--surface-overlay': themePalette.background.paper,
  '--surface-border': themePalette.divider,
  '--surface-hover': themePalette.action.hover,
  '--surface-0': themePalette.background.paper,
  '--surface-50': themePalette.background.default,
  '--surface-100': themePalette.background.barMedium,
  '--surface-200': themePalette.background.barDark,
  '--surface-700': themePalette.grey[700],
  '--surface-800': themePalette.grey[800],
  '--surface-900': themePalette.grey[900],
  '--text-color': themePalette.text.primary,
  '--text-color-secondary': themePalette.text.secondary,
  '--primary-main': themePalette.primary.main,
  '--primary-light': themePalette.primary.light,
  '--primary-dark': themePalette.primary.dark,
  '--primary-color': themePalette.primary.main,
  '--primary-color-text': themePalette.primary.contrastText,
  '--secondary-main': themePalette.secondary.main,
  '--secondary-light': themePalette.secondary.light,
  '--secondary-dark': themePalette.secondary.dark,
  '--accent-soft': themePalette.background.accentSoft,
  '--accent-surface': themePalette.background.accentSurface,
  '--grey-50': themePalette.grey[50],
  '--grey-100': themePalette.grey[100],
  '--grey-200': themePalette.grey[200],
  '--grey-300': themePalette.grey[300],
  '--grey-400': themePalette.grey[400],
  '--grey-500': themePalette.grey[500],
  '--grey-600': themePalette.grey[600],
  '--grey-700': themePalette.grey[700],
  '--grey-800': themePalette.grey[800],
  '--grey-900': themePalette.grey[900],
  '--action-active': themePalette.action.active,
  '--action-contrast-active': themePalette.action.contrastActive,
  '--action-hover': themePalette.action.hover,
  '--action-contrast-hover': themePalette.action.contrastHover,
  '--action-selected': themePalette.action.selected,
  '--action-contrast-selected': themePalette.action.contrastSelected,
  '--action-disabled': themePalette.action.disabled,
  '--action-contrast-disabled': themePalette.action.contrastDisabled,
  '--tabs-background': themePalette.tabs.background,
  '--other-divider': themePalette.other.divider,
  '--other-hairline-border': themePalette.other.hairlineBorder,
  '--other-outlined-border': themePalette.other.outlinedBorder,
  '--other-backdrop-overlay': themePalette.other.backdropOverlay,
  '--other-filled-input-background': themePalette.other.filledInputBackground,
  '--other-standard-input-line': themePalette.other.standardInputLine,
  '--other-snackbar': themePalette.other.snackbar,
})

export const createStudyMeshTheme = (
  mode = 'light',
  accentColorId = defaultAccentColorId,
) => {
  const themePalette = createPalette(getAccentColorById(accentColorId), mode)
  const isDark = mode === 'dark'
  const cssVariables = createCssVariables(themePalette, mode)

  return createTheme({
    palette: themePalette,
    typography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': cssVariables,
          body: {
            ...cssVariables,
            backgroundColor: themePalette.background.default,
            color: themePalette.text.primary,
            transition: 'background-color 180ms ease, color 180ms ease',
          },
          '#root': {
            minHeight: '100dvh',
            backgroundColor: themePalette.background.default,
          },
          '::selection': {
            backgroundColor: alpha(themePalette.primary.main, 0.35),
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${alpha(themePalette.text.secondary, 0.28)} transparent`,
          },
          '*::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(themePalette.text.secondary, 0.22),
            borderRadius: 999,
            border: `3px solid ${themePalette.background.default}`,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: alpha(themePalette.text.secondary, 0.34),
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: themePalette.common.black },
          arrow: { color: themePalette.common.black },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        defaultProps: {
          color: 'default',
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: themePalette.background.dialog,
            color: themePalette.text.primary,
            border: `1px solid ${themePalette.other.hairlineBorder}`,
            borderRadius: 18,
            boxShadow: isDark
              ? '0 28px 90px rgba(0,0,0,0.58)'
              : '0 28px 90px rgba(15,23,42,0.18)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: themePalette.background.paper,
            color: themePalette.text.primary,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: themePalette.background.dialog,
            border: `1px solid ${themePalette.other.hairlineBorder}`,
            borderRadius: 14,
            boxShadow: isDark
              ? '0 18px 52px rgba(0,0,0,0.48)'
              : '0 18px 52px rgba(15,23,42,0.14)',
          },
          list: {
            paddingTop: 6,
            paddingBottom: 6,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            margin: '2px 6px',
            borderRadius: 10,
            minHeight: 38,
            '&:hover': {
              backgroundColor: themePalette.action.hover,
            },
            '&.Mui-selected': {
              backgroundColor: themePalette.action.selected,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 800,
            minHeight: 38,
            boxShadow: 'none',
            transition:
              'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
            '&:focus-visible': {
              outline: `3px solid ${alpha(themePalette.primary.main, 0.32)}`,
              outlineOffset: 2,
            },
          },
          containedPrimary: {
            color: themePalette.primary.contrastText,
            boxShadow: isDark
              ? `0 10px 24px ${alpha(themePalette.primary.main, 0.22)}`
              : undefined,
            '&:hover': {
              boxShadow: `0 12px 28px ${alpha(themePalette.primary.main, isDark ? 0.28 : 0.2)}`,
              transform: 'translateY(-1px)',
            },
          },
          outlined: {
            borderColor: themePalette.other.hairlineBorder,
            backgroundColor: alpha(
              themePalette.background.paper,
              isDark ? 0.6 : 0.72,
            ),
            '&:hover': {
              borderColor: alpha(themePalette.primary.main, 0.55),
              backgroundColor: themePalette.action.hover,
            },
          },
          text: {
            '&:hover': {
              backgroundColor: themePalette.action.hover,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&:focus-visible': {
              outline: `3px solid ${alpha(themePalette.primary.main, 0.3)}`,
              outlineOffset: 2,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark
              ? alpha(themePalette.common.white, 0.035)
              : alpha(themePalette.common.white, 0.72),
            transition:
              'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(themePalette.primary.main, 0.45),
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(themePalette.primary.main, 0.18)}`,
            },
          },
          notchedOutline: {
            borderColor: themePalette.other.hairlineBorder,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: themePalette.text.secondary,
            fontWeight: 700,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
            borderColor: themePalette.other.hairlineBorder,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${themePalette.other.hairlineBorder}`,
            alignItems: 'center',
          },
          standardWarning: {
            backgroundColor: alpha(
              themePalette.serious.main,
              isDark ? 0.12 : 0.1,
            ),
          },
          standardError: {
            backgroundColor: alpha(
              themePalette.critical.main,
              isDark ? 0.12 : 0.08,
            ),
          },
          standardSuccess: {
            backgroundColor: alpha(
              themePalette.normal.main,
              isDark ? 0.12 : 0.08,
            ),
          },
          standardInfo: {
            backgroundColor: alpha(
              themePalette.primary.main,
              isDark ? 0.12 : 0.08,
            ),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
            backgroundColor: themePalette.background.card,
            border: `1px solid ${themePalette.other.hairlineBorder}`,
            boxShadow: 'var(--studymesh-shadow-card)',
          },
        },
      },
    },
  })
}

export const createAquaMeshTheme = createStudyMeshTheme

export default createStudyMeshTheme()

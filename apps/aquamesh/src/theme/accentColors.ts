export type AccentColorId =
  | 'aquamesh'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'rose'
  | 'slate'

export interface AccentColorOption {
  id: AccentColorId
  name: string
  main: string
  light: string
  dark: string
  contrastText: string
}

export const ACCENT_COLOR_STORAGE_KEY = 'aquamesh-accent-color'

export const accentColorOptions: AccentColorOption[] = [
  {
    id: 'aquamesh',
    name: 'Aqua green',
    main: '#007C66',
    light: '#00C49A',
    dark: '#005A49',
    contrastText: '#FFFFFF',
  },
  {
    id: 'blue',
    name: 'Ocean blue',
    main: '#1976D2',
    light: '#42A5F5',
    dark: '#0D47A1',
    contrastText: '#FFFFFF',
  },
  {
    id: 'purple',
    name: 'Signal purple',
    main: '#7B1FA2',
    light: '#BA68C8',
    dark: '#4A148C',
    contrastText: '#FFFFFF',
  },
  {
    id: 'orange',
    name: 'Beacon orange',
    main: '#EF6C00',
    light: '#FFB74D',
    dark: '#E65100',
    contrastText: '#FFFFFF',
  },
  {
    id: 'rose',
    name: 'Coral rose',
    main: '#C2185B',
    light: '#F06292',
    dark: '#880E4F',
    contrastText: '#FFFFFF',
  },
  {
    id: 'slate',
    name: 'Slate',
    main: '#455A64',
    light: '#90A4AE',
    dark: '#263238',
    contrastText: '#FFFFFF',
  },
]

export const defaultAccentColorId: AccentColorId = 'aquamesh'

export const getAccentColorById = (id?: string | null): AccentColorOption => {
  return (
    accentColorOptions.find((option) => option.id === id) ??
    accentColorOptions[0]
  )
}

export const readStoredAccentColorId = (): AccentColorId => {
  if (typeof window === 'undefined') {
    return defaultAccentColorId
  }

  const storedAccent = window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)
  return getAccentColorById(storedAccent).id
}

export const writeStoredAccentColorId = (accentColorId: AccentColorId) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, accentColorId)
}

export const applyAccentCssVariables = (accent: AccentColorOption) => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.style.setProperty('--primary-main', accent.main)
  root.style.setProperty('--primary-light', accent.light)
  root.style.setProperty('--primary-dark', accent.dark)
  root.style.setProperty('--secondary-main', accent.main)
  root.style.setProperty('--secondary-light', accent.light)
  root.style.setProperty('--secondary-dark', accent.dark)
  root.style.setProperty('--action-active', `${accent.light}33`)
  root.style.setProperty('--action-hover', `${accent.light}1F`)
  root.style.setProperty('--action-selected', `${accent.light}24`)
}

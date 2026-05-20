import React, { createContext, useContext } from 'react'

import {
  AccentColorId,
  AccentColorOption,
  accentColorOptions,
  defaultAccentColorId,
  getAccentColorById,
} from './accentColors'

interface AccentColorContextValue {
  accentColorId: AccentColorId
  accentColor: AccentColorOption
  setAccentColorId: (accentColorId: AccentColorId) => void
  options: AccentColorOption[]
}

const AccentColorContext = createContext<AccentColorContextValue>({
  accentColorId: defaultAccentColorId,
  accentColor: getAccentColorById(defaultAccentColorId),
  setAccentColorId: () => undefined,
  options: accentColorOptions,
})

export const AccentColorProvider = AccentColorContext.Provider

export const useAccentColor = () => useContext(AccentColorContext)

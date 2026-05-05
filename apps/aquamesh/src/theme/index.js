import { createTheme } from '@mui/material/styles'

import createPalette from './palette'
import { getAccentColorById } from './accentColors'
import typography from './typography'

export const createAquaMeshTheme = (accentColorId) => {
  const palette = createPalette(getAccentColorById(accentColorId))

  return createTheme({
    palette,
    typography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.background.barMedium,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: palette.common.black },
          arrow: { color: palette.common.black },
        },
      },
    },
  })
}

export default createAquaMeshTheme()

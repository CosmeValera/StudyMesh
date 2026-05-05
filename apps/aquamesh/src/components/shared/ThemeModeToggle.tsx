import React from 'react'
import { IconButton, Tooltip, useTheme } from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'

import { useThemeMode } from '../../theme/ThemeModeContext'

interface ThemeModeToggleProps {
  compact?: boolean
}

const ThemeModeToggle: React.FC<ThemeModeToggleProps> = ({
  compact = false,
}) => {
  const theme = useTheme()
  const { mode, toggleMode } = useThemeMode()
  const isDark = mode === 'dark'

  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      <IconButton
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        onClick={toggleMode}
        size={compact ? 'small' : 'medium'}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          bgcolor:
            theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.72)',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        {isDark ? (
          <LightModeIcon fontSize="small" />
        ) : (
          <DarkModeIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  )
}

export default ThemeModeToggle

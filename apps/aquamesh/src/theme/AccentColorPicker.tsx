import React from 'react'
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'

import { AccentColorId } from './accentColors'
import { useAccentColor } from './AccentColorContext'

interface AccentColorPickerProps {
  dense?: boolean
}

const AccentColorPicker: React.FC<AccentColorPickerProps> = ({ dense }) => {
  const { accentColorId, setAccentColorId, options } = useAccentColor()

  return (
    <Box sx={{ display: 'flex', gap: dense ? 0.75 : 1, flexWrap: 'wrap' }}>
      {options.map((option) => {
        const selected = option.id === accentColorId

        return (
          <Tooltip title={option.name} key={option.id}>
            <ButtonBase
              aria-label={`Use ${option.name} accent color`}
              aria-pressed={selected}
              onClick={() => setAccentColorId(option.id as AccentColorId)}
              sx={{
                width: dense ? 32 : 40,
                height: dense ? 32 : 40,
                borderRadius: '50%',
                bgcolor: option.main,
                color: option.contrastText,
                border: '2px solid',
                borderColor: selected ? 'text.primary' : 'transparent',
                boxShadow: selected ? 3 : 1,
                outline: selected ? `2px solid ${option.light}` : 'none',
                outlineOffset: 2,
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: 4,
                },
              }}
            >
              {selected && <CheckIcon fontSize={dense ? 'small' : 'medium'} />}
            </ButtonBase>
          </Tooltip>
        )
      })}
      <Typography component="span" sx={{ position: 'absolute', left: -10000 }}>
        Current accent color:{' '}
        {options.find((o) => o.id === accentColorId)?.name}
      </Typography>
    </Box>
  )
}

export default AccentColorPicker

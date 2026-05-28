import React from 'react'
import {
  DialogTitle,
  Typography,
  Box,
  IconButton,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface DialogHeaderProps {
  title: string
  icon?: React.ReactNode
  onClose?: () => void
  color?: string
  textColor?: string
}

/**
 * Consistent header component for dialogs throughout the application
 */
const DialogHeader: React.FC<DialogHeaderProps> = ({
  title,
  icon,
  onClose,
  color,
  textColor = '#191919',
}) => {
  const theme = useTheme()
  const headerColor = color ?? theme.palette.background.paper

  return (
    <DialogTitle
      sx={{
        bgcolor: headerColor,
        color: textColor,
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: theme.palette.divider,
      }}
    >
      <Box display="flex" alignItems="center">
        {icon && <Box sx={{ mr: 1.5, color: textColor }}>{icon}</Box>}
        <Typography
          variant="h6"
          component="div"
          fontWeight="bold"
          color={textColor}
        >
          {title}
        </Typography>
      </Box>
      {onClose && (
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{
            color: textColor,
            '&:hover': {
              bgcolor: theme.palette.action.hover,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      )}
    </DialogTitle>
  )
}

export default DialogHeader

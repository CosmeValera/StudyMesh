import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import { dialogStyles, buttonStyles } from '../../../shared/DialogStyles'

interface DeleteConfirmationDialogProps {
  open: boolean
  title: string
  content: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  title,
  content,
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          ...dialogStyles.paper,
          borderRadius: isMobile ? '8px' : '12px',
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogStyles.errorTitle,
          display: 'flex',
          alignItems: 'center',
          px: isMobile ? 2 : 3,
          py: isMobile ? 1 : 1.5,
        }}
      >
        <DeleteOutlineIcon
          sx={{
            mr: isMobile ? 1 : 1.5,
            fontSize: isMobile ? 20 : 24,
            color: 'white',
          }}
        />
        <Typography
          variant={isMobile ? 'subtitle1' : 'h6'}
          sx={{
            fontWeight: 500,
            color: 'white',
            fontSize: isMobile ? '1rem' : undefined,
          }}
        >
          {title}
        </Typography>
        <IconButton
          size={isMobile ? 'small' : 'medium'}
          aria-label="close"
          sx={{
            ...dialogStyles.closeButton,
            right: isMobile ? 4 : 8,
          }}
          onClick={onCancel}
        >
          <CloseIcon fontSize={isMobile ? 'small' : 'medium'} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          ...dialogStyles.content,
          px: isMobile ? 2 : 3,
          pt: isMobile ? 1.5 : 2.5,
          pb: isMobile ? 1 : 1.5,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            mb: isMobile ? 1.5 : 2,
            pt: isMobile ? 1 : 1.5,
            fontWeight: 400,
            fontSize: isMobile ? '0.875rem' : undefined,
          }}
        >
          {content}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: isMobile ? 0.5 : 1,
            fontSize: isMobile ? '0.75rem' : undefined,
          }}
        >
          This action cannot be undone.
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          ...dialogStyles.centeredActions,
          px: isMobile ? 2 : 3,
          py: isMobile ? 1 : 1.5,
          gap: isMobile ? 1 : 2,
        }}
      >
        <Button
          onClick={onCancel}
          variant="outlined"
          size={isMobile ? 'small' : 'medium'}
          sx={{
            ...buttonStyles.secondary,
            px: isMobile ? 2 : 3,
            py: isMobile ? 0.5 : 1,
            minWidth: isMobile ? 70 : 100,
            fontSize: isMobile ? '0.75rem' : undefined,
          }}
        >
          CANCEL
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          startIcon={
            <DeleteOutlineIcon fontSize={isMobile ? 'small' : 'medium'} />
          }
          size={isMobile ? 'small' : 'medium'}
          sx={{
            ...buttonStyles.danger,
            px: isMobile ? 2 : 3,
            py: isMobile ? 0.5 : 1,
            minWidth: isMobile ? 70 : 100,
            fontSize: isMobile ? '0.75rem' : undefined,
          }}
        >
          DELETE
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteConfirmationDialog

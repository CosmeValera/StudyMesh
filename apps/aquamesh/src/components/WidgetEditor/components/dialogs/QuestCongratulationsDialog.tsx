import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

interface QuestCongratulationsDialogProps {
  open: boolean
  onClose: () => void
  onOpenTutorial: () => void
}

const QuestCongratulationsDialog: React.FC<QuestCongratulationsDialogProps> = ({
  open,
  onClose,
  onOpenTutorial,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background:
            'linear-gradient(90deg, rgba(255, 183, 77, 0.18), rgba(0, 209, 171, 0.15))',
        }}
      >
        <EmojiEventsIcon color="warning" />
        Mission Complete!
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Congratulations — you completed the full Widget Quest.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You can keep building more advanced widgets right away, or jump into the tutorial to discover the broader platform.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} variant="outlined" color="secondary">
            Continue building
          </Button>
          <Button
            onClick={() => {
              onOpenTutorial()
              onClose()
            }}
            variant="contained"
            color="primary"
          >
            Explore tutorial
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}

export default QuestCongratulationsDialog

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Stack,
  Chip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

interface QuestStep {
  label: string
  complete: boolean
}

interface FirstRunWidgetQuestDialogProps {
  open: boolean
  onClose: () => void
  onAddStarterChart: () => void
  onAddStarterLabel: () => void
  onAutoRename: () => void
  steps: QuestStep[]
}

const FirstRunWidgetQuestDialog: React.FC<FirstRunWidgetQuestDialogProps> = ({
  open,
  onClose,
  onAddStarterChart,
  onAddStarterLabel,
  onAutoRename,
  steps,
}) => {
  const completedSteps = steps.filter((step) => step.complete).length
  const completionPercent = Math.round((completedSteps / steps.length) * 100)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon color="primary" />
        Widget Quest
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Welcome to the Widget Editor! Complete this mini-quest to unlock your first custom widget.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {completedSteps}/{steps.length}
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={completionPercent} sx={{ height: 8, borderRadius: 6 }} />
        </Box>

        <Stack spacing={1.2} sx={{ mb: 2.5 }}>
          {steps.map((step) => (
            <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {step.complete ? (
                <CheckCircleIcon color="success" fontSize="small" />
              ) : (
                <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
              )}
              <Typography variant="body2">{step.label}</Typography>
            </Box>
          ))}
        </Stack>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Quick actions
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="Add starter chart" onClick={onAddStarterChart} clickable color="primary" variant="outlined" />
          <Chip label="Add text label" onClick={onAddStarterLabel} clickable color="primary" variant="outlined" />
          <Chip label="Auto-name widget" onClick={onAutoRename} clickable color="secondary" variant="outlined" />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Got it</Button>
      </DialogActions>
    </Dialog>
  )
}

export default FirstRunWidgetQuestDialog

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
  Tooltip,
  Paper,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

interface QuestStep {
  label: string
  complete: boolean
  helpText: string
}

interface FirstRunWidgetQuestDialogProps {
  open: boolean
  onClose: () => void
  steps: QuestStep[]
}

const FirstRunWidgetQuestDialog: React.FC<FirstRunWidgetQuestDialogProps> = ({
  open,
  onClose,
  steps,
}) => {
  const completedSteps = steps.filter((step) => step.complete).length
  const completionPercent = Math.round((completedSteps / steps.length) * 100)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
          background: 'linear-gradient(90deg, rgba(0, 209, 171, 0.15), rgba(127, 86, 217, 0.16))',
        }}
      >
        <AutoAwesomeIcon color="secondary" />
        Widget Quest
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Complete the 4 missions to master your first widget workflow. Hover the info icon on each mission if you need a hint.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2.5,
            borderRadius: 2,
            bgcolor: 'rgba(0, 0, 0, 0.04)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
            <Typography variant="caption" color="text.secondary">
              Quest progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {completedSteps}/{steps.length}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={completionPercent}
            sx={{
              height: 10,
              borderRadius: 8,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 8,
              },
            }}
          />
        </Paper>

        <Stack spacing={1.2}>
          {steps.map((step, index) => (
            <Box
              key={step.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.2,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: step.complete ? 'success.main' : 'divider',
                bgcolor: step.complete ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {step.complete ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                )}
                <Typography variant="body2">
                  {index + 1}. {step.label}
                </Typography>
              </Box>

              <Tooltip title={step.helpText} placement="left" arrow>
                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="secondary" sx={{ borderRadius: 2 }}>
          Close Quest
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default FirstRunWidgetQuestDialog

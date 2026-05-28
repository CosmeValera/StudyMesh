import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Stack,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DashboardIcon from '@mui/icons-material/Dashboard'
import WidgetsIcon from '@mui/icons-material/Widgets'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import EditIcon from '@mui/icons-material/Edit'

interface DashboardWidgetExplanationModalProps {
  open: boolean
  onClose: () => void
}

const workflowSteps = [
  {
    title: '1. Create a dashboard',
    text: 'Open Create Dashboard first so you have a workspace ready for the widget you are about to build.',
  },
  {
    title: '2. Create a widget',
    text: 'Open Create Widget, add one layout block such as FieldSet, FlexBox, or GridBox, then add a normal content block inside it.',
  },
  {
    title: '3. Save and close the widget',
    text: 'Save the widget to the library, then close Create Widget and return to the dashboard builder.',
  },
  {
    title: '4. Add the widget to the dashboard',
    text: 'Use Widgets, choose the saved widget, place it on the dashboard, arrange the layout, and save the dashboard.',
  },
  {
    title: '5. Reopen it from Dashboards',
    text: 'Open the Dashboards menu later and choose the saved dashboard from its folder.',
  },
]

const blockTypes = [
  'Text',
  'List',
  'Image',
  'PDF',
  'Input',
  'Button',
  'Chart',
  'Layout',
]

const DashboardWidgetExplanationModal: React.FC<
  DashboardWidgetExplanationModalProps
> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="explanation-dialog-title"
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        id="explanation-dialog-title"
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight="bold">
            How StudyMesh is organised
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Three simple layers
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Blocks make widgets. Widgets make dashboards. Start by creating a
              dashboard, build one reusable widget, then place and save it.
            </Typography>
          </Box>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <ViewModuleIcon color="primary" sx={{ mt: 0.4 }} />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Blocks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The smallest pieces inside a widget: explanations, lists,
                  diagrams, PDFs, answers, buttons, charts, and layout helpers.
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  {blockTypes.map((block) => (
                    <Chip key={block} label={block} size="small" />
                  ))}
                </Stack>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <WidgetsIcon color="primary" sx={{ mt: 0.4 }} />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Widgets
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reusable knowledge objects you create once and then place on
                  one or many dashboards.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <DashboardIcon color="primary" sx={{ mt: 0.4 }} />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Dashboards
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The final workspace view: combine widgets, drag their tabs to
                  reposition them, resize separators, and save the layout.
                </Typography>
              </Box>
            </Box>
          </Stack>

          <Box
            sx={{
              borderTop: 1,
              borderColor: 'divider',
              pt: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EditIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Typical workflow
              </Typography>
            </Box>
            <Stack component="ol" spacing={1.25} sx={{ pl: 2.5, m: 0 }}>
              {workflowSteps.map((step) => (
                <Box component="li" key={step.title}>
                  <Typography variant="body1" fontWeight={700}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button onClick={onClose} color="primary" variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DashboardWidgetExplanationModal

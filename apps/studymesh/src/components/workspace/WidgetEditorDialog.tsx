import React from 'react'
import { Box, Dialog, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

import WidgetEditor from '../WidgetEditor/WidgetEditor'
import { CustomWidget } from '../WidgetEditor/WidgetStorage'

interface WidgetEditorDialogProps {
  open: boolean
  payload: {
    loadWidget?: CustomWidget
    initialEditMode?: boolean
  } | null
  onClose: () => void
  onSaveComplete?: () => void
}

const WidgetEditorDialog = ({
  open,
  payload,
  onClose,
  onSaveComplete,
}: WidgetEditorDialogProps) => (
  <Dialog
    fullScreen
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        bgcolor: 'background.default',
      },
    }}
  >
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Create Widget
        </Typography>
        <IconButton
          aria-label="Close Create Widget"
          data-onboarding-id="close-create-widget"
          onClick={onClose}
          sx={{
            color: 'text.primary',
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
            width: 36,
            height: 36,
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'text.secondary',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <WidgetEditor
          key={`widget-editor-${open}-${payload?.loadWidget?.id || 'new'}`}
          customProps={payload || undefined}
          onSaveComplete={onSaveComplete}
        />
      </Box>
    </Box>
  </Dialog>
)

export default WidgetEditorDialog

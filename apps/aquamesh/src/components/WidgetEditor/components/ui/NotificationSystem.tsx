import React from 'react'
import { Box } from '@mui/material'
import { Notification } from '../../types/types'
import EnhancedNotification from '../../../shared/EnhancedNotification'

interface NotificationSystemProps {
  notification: Notification
  componentToast: {
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  }
  handleCloseNotification: () => void
  handleCloseComponentToast: () => void
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notification,
  componentToast,
  handleCloseNotification,
  handleCloseComponentToast
}) => {
  const activeToast = notification.open
    ? {
        open: notification.open,
        message: notification.message,
        severity: notification.severity,
        duration: 5000,
        onClose: handleCloseNotification,
      }
    : {
        open: componentToast.open,
        message: componentToast.message,
        severity: componentToast.severity,
        duration: 3000,
        onClose: handleCloseComponentToast,
      }

  return (
    <Box>
      <EnhancedNotification
        key={`${activeToast.severity}-${activeToast.message}`}
        open={activeToast.open}
        message={activeToast.message}
        type={activeToast.severity}
        variant="filled"
        autoHideDuration={activeToast.duration}
        onClose={activeToast.onClose}
      />
    </Box>
  )
}

export default NotificationSystem

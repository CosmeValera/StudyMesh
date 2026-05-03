import React, { useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Paper,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ReactComponent as Logo } from '../../../public/logo.svg'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

export const userOptions: Record<
  string,
  { id: string; name: string; role: string }
> = {
  admin: { id: 'admin', name: 'Admin', role: 'ADMIN_ROLE' },
  viewer: { id: 'viewer', name: 'Viewer', role: 'VIEWER_ROLE' },
}

const PUBLIC_LOGIN_USER_ID = 'admin'

const Login: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem(
      'userData',
      JSON.stringify(userOptions[PUBLIC_LOGIN_USER_ID]),
    )
  }, [])

  const handleLogin = () => {
    localStorage.setItem(
      'userData',
      JSON.stringify(userOptions[PUBLIC_LOGIN_USER_ID]),
    )

    // Navigate back to the main workspace
    navigate('/workspace')
  }

  return (
    <Container
      maxWidth={false}
      sx={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          boxShadow: 3,
          bgcolor: 'background.paper',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Logo height="64px" width="64px" style={{ marginBottom: '16px' }} />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}
            >
              AquaMesh
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Admin demo access
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              border: '1px solid rgba(0, 196, 154, 0.45)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              background: 'rgba(0, 196, 154, 0.08)',
            }}
          >
            <CheckCircleIcon
              fontSize="small"
              sx={{
                color: 'primary.main',
                mr: 1.5,
                mt: 0.3,
              }}
            />
            <Typography
              variant="body2"
              color="text.primary"
              sx={{
                '& strong': {
                  color: 'primary.dark',
                },
              }}
            >
              <span>
                <strong>Admins</strong> get full access, including the{' '}
                <strong>Widget Editor</strong>, creating templates and editing
                dashboards.
              </span>
            </Typography>
          </Paper>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleLogin}
            sx={{
              mt: 2,
              color: 'primary.contrastText',
            }}
          >
            Login
          </Button>
        </CardContent>
      </Card>
    </Container>
  )
}

export default Login

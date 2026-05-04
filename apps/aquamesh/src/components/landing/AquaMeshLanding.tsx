import React from 'react'
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AddchartIcon from '@mui/icons-material/Addchart'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import WidgetsIcon from '@mui/icons-material/Widgets'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import NotesIcon from '@mui/icons-material/Notes'

import { ReactComponent as Logo } from '../../../public/logo.svg'

const workflow = [
  {
    title: 'Create Widget',
    body: 'Name a Daily Operations widget and start from visual building blocks.',
    icon: <WidgetsIcon />,
  },
  {
    title: 'Add Blocks',
    body: 'Drag in text, inputs, buttons, charts, and layout sections.',
    icon: <AddchartIcon />,
  },
  {
    title: 'Preview And Save',
    body: 'Check the widget, save it to your library, and keep versions.',
    icon: <SaveAltIcon />,
  },
  {
    title: 'Add To Dashboard',
    body: 'Place the saved widget into the dashboard canvas.',
    icon: <DashboardCustomizeIcon />,
  },
]

const useCases = [
  {
    title: 'Orders today',
    body: 'Track intake, fulfillment, and handoff status.',
    icon: <LocalShippingIcon />,
  },
  {
    title: 'Delayed tasks',
    body: 'Surface blocked work before it misses the day.',
    icon: <TaskAltIcon />,
  },
  {
    title: 'Support tickets',
    body: 'Show ticket mix, priority, and follow-up notes.',
    icon: <SupportAgentIcon />,
  },
  {
    title: 'System status',
    body: 'Keep health indicators visible beside team actions.',
    icon: <SettingsSuggestIcon />,
  },
  {
    title: 'Team handoff',
    body: 'Capture notes and next actions in the same view.',
    icon: <NotesIcon />,
  },
]

const quickAnswers = [
  {
    question: 'What should I do first?',
    answer:
      'Start with Create Widget. Build one reusable Daily Operations widget first, then add it to a dashboard.',
  },
  {
    question: 'Which blocks should I start with?',
    answer:
      'Use a chart for support tickets, a status label for system health, or a note field for team handoff.',
  },
  {
    question: 'Where does my saved widget go?',
    answer:
      'Saved widgets appear in Add Widget so you can reuse them in dashboards.',
  },
]

const AquaMeshLanding = () => {
  const navigate = useNavigate()

  const openWorkspace = (action?: string) => {
    navigate(action ? `/workspace?action=${action}` : '/workspace')
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#f6fbf9',
        color: '#12352f',
        overflowX: 'hidden',
      }}
    >
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid rgba(0, 90, 73, 0.12)',
          bgcolor: 'rgba(246, 251, 249, 0.92)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Logo height="36px" width="36px" />
            <Typography variant="h6" fontWeight={800}>
              AquaMesh
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            onClick={() => openWorkspace()}
            sx={{ borderRadius: 1, textTransform: 'none' }}
          >
            Enter workspace
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" component="main">
        <Grid
          container
          spacing={5}
          alignItems="center"
          sx={{ minHeight: { xs: 'auto', md: 'calc(100dvh - 120px)' }, py: 6 }}
        >
          <Grid item xs={12} md={6}>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '2.35rem', md: '4rem' },
                lineHeight: 1.04,
                mb: 2,
              }}
            >
              AquaMesh
            </Typography>
            <Typography
              variant="h5"
              component="p"
              sx={{ fontWeight: 700, color: '#005A49', mb: 2 }}
            >
              Create operational dashboard widgets without code.
            </Typography>
            <Typography variant="body1" sx={{ color: '#425c57', mb: 3 }}>
              Build reusable widgets for orders, delayed tasks, support
              tickets, system status, team notes, and handoff actions, then
              place them into dashboards.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                onClick={() => openWorkspace('create-widget')}
                sx={{ borderRadius: 1, textTransform: 'none' }}
              >
                Create your own widget
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => openWorkspace('open-operations-example')}
                sx={{ borderRadius: 1, textTransform: 'none' }}
              >
                Open operations example
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid rgba(0, 90, 73, 0.16)',
                overflow: 'hidden',
                bgcolor: '#ffffff',
                boxShadow: '0 22px 60px rgba(0, 61, 49, 0.14)',
              }}
            >
              <Box
                component="img"
                src="/images/widget_editor.png"
                alt="AquaMesh widget editor"
                sx={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '16 / 10',
                  objectFit: 'cover',
                  objectPosition: 'top left',
                }}
              />
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ py: 5 }}>
          <Typography variant="h4" component="h2" fontWeight={850} mb={3}>
            Build one widget, then reuse it
          </Typography>
          <Grid container spacing={2}>
            {workflow.map((step, index) => (
              <Grid item xs={12} sm={6} md={3} key={step.title}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: 2.5,
                    borderRadius: 1,
                    border: '1px solid rgba(0, 90, 73, 0.14)',
                    bgcolor: '#ffffff',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Box sx={{ color: '#007C66', display: 'flex' }}>
                      {step.icon}
                    </Box>
                    <Typography variant="caption" color="#667c78">
                      Step {index + 1}
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={800} mb={1}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="#425c57">
                    {step.body}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ py: 5 }}>
          <Typography variant="h4" component="h2" fontWeight={850} mb={3}>
            Made for daily operations
          </Typography>
          <Grid container spacing={2}>
            {useCases.map((useCase) => (
              <Grid item xs={12} sm={6} md={4} key={useCase.title}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: 2.5,
                    borderRadius: 1,
                    border: '1px solid rgba(0, 90, 73, 0.14)',
                    bgcolor: '#ffffff',
                  }}
                >
                  <Box sx={{ color: '#007C66', display: 'flex', mb: 1 }}>
                    {useCase.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={800} mb={0.5}>
                    {useCase.title}
                  </Typography>
                  <Typography variant="body2" color="#425c57">
                    {useCase.body}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ py: 5, pb: 8 }}>
          <Typography variant="h4" component="h2" fontWeight={850} mb={3}>
            Quick answers
          </Typography>
          <Grid container spacing={2}>
            {quickAnswers.map((item) => (
              <Grid item xs={12} md={4} key={item.question}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: 2.5,
                    borderRadius: 1,
                    border: '1px solid rgba(0, 90, 73, 0.14)',
                    bgcolor: '#ffffff',
                  }}
                >
                  <Typography variant="h6" fontWeight={800} mb={1}>
                    {item.question}
                  </Typography>
                  <Typography variant="body2" color="#425c57">
                    {item.answer}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  )
}

export default AquaMeshLanding

import React from 'react'
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import AddchartIcon from '@mui/icons-material/Addchart'
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import BiotechIcon from '@mui/icons-material/Biotech'
import ImageIcon from '@mui/icons-material/Image'
import SchoolIcon from '@mui/icons-material/School'
import MenuBookIcon from '@mui/icons-material/MenuBook'

import { ReactComponent as Logo } from '../../../public/logo.svg'
import ThemeModeToggle from '../shared/ThemeModeToggle'

const workflow = [
  {
    title: 'Enter the workspace',
    body: 'Start with a clean workspace, then open saved dashboards or create your own widgets when you need them.',
    icon: <SchoolIcon />,
  },
  {
    title: 'Collect knowledge blocks',
    body: 'Use long text, formulas, inputs, charts, images, and layout sections as visual notes.',
    icon: <AddchartIcon />,
  },
  {
    title: 'Save reusable widgets',
    body: 'Turn a formula card, revision tracker, or note section into a widget you can reuse.',
    icon: <SaveAltIcon />,
  },
  {
    title: 'Organize dashboards',
    body: 'Keep study pages by subject, topic, or project and evolve them like a visual wiki.',
    icon: <DashboardCustomizeIcon />,
  },
]

const useCases = [
  {
    title: 'Study wiki',
    body: 'Build subject pages for mathematics, tutorials, biology, or exam revision.',
    icon: <SchoolIcon />,
  },
  {
    title: 'Formula notebook',
    body: 'Keep formulas, examples, charts, and doubts in one visual dashboard.',
    icon: <MenuBookIcon />,
  },
  {
    title: 'Research board',
    body: 'Pair images, notes, references, and observations for projects or labs.',
    icon: <BiotechIcon />,
  },
  {
    title: 'Task workspace',
    body: 'Organize priorities, blockers, owners, and follow-up actions.',
    icon: <TaskAltIcon />,
  },
  {
    title: 'Operations hub',
    body: 'Track orders, delayed work, tickets, status, and handoffs when you need a CRM-like view.',
    icon: <SupportAgentIcon />,
  },
  {
    title: 'Image and notes board',
    body: 'Pair visual references with structured text and controls.',
    icon: <ImageIcon />,
  },
]

const quickAnswers = [
  {
    question: 'What is AquaMesh for?',
    answer:
      'AquaMesh is a visual knowledge wiki: notes, formulas, charts, images, and reusable widgets organized into dashboards.',
  },
  {
    question: 'What should I do first?',
    answer:
      'Enter the workspace. From there you can create a dashboard, save it to a folder, or open existing dashboards.',
  },
  {
    question: 'How are dashboards organized?',
    answer:
      'When you save a dashboard, choose a folder name. Dashboards with the same folder name appear together.',
  },
]

const AquaMeshLanding = () => {
  const navigate = useNavigate()
  const theme = useTheme()

  const openWorkspace = (action?: string) => {
    navigate(action ? `/workspace?action=${action}` : '/workspace')
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
      }}
    >
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.default, 0.92),
          backdropFilter: 'blur(14px)',
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
          <Stack direction="row" spacing={1} alignItems="center">
            <ThemeModeToggle />
            <Button
              variant="outlined"
              onClick={() => openWorkspace()}
              sx={{ borderRadius: 1, textTransform: 'none' }}
            >
              Enter workspace
            </Button>
          </Stack>
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
              sx={{ fontWeight: 700, color: 'primary.dark', mb: 2 }}
            >
              Create a visual knowledge wiki from reusable widgets.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              Turn study notes, formulas, charts, images, and questions into
              visual dashboards. Start from subject examples, then adapt the
              workspace into your own personal wiki.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                onClick={() => openWorkspace()}
                sx={{ borderRadius: 1, textTransform: 'none' }}
              >
                Enter workspace
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 22px 60px ${alpha(theme.palette.common.black, 0.42)}`
                    : `0 22px 60px ${alpha(theme.palette.primary.dark, 0.14)}`,
              }}
            >
              <Box
                component="img"
                src="/images/widget_builder_overview.svg"
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
            Start from knowledge, then customize it
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
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Box sx={{ color: 'primary.main', display: 'flex' }}>
                      {step.icon}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Step {index + 1}
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={800} mb={1}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.body}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ py: 5 }}>
          <Typography variant="h4" component="h2" fontWeight={850} mb={3}>
            Use AquaMesh as a visual wiki
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
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ color: 'primary.main', display: 'flex', mb: 1 }}>
                    {useCase.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={800} mb={0.5}>
                    {useCase.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {useCase.body}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ py: 5 }}>
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
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="h6" fontWeight={800} mb={1}>
                    {item.question}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.answer}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Paper
          elevation={0}
          sx={{
            mb: 8,
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h2" fontWeight={850} mb={1}>
            Ready to build your workspace?
          </Typography>
          <Typography
            sx={{
              color: alpha(theme.palette.primary.contrastText, 0.82),
              mb: 3,
            }}
          >
            Enter the workspace, create dashboards, and organize them by folder.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => openWorkspace()}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            Enter workspace
          </Button>
        </Paper>
      </Container>
    </Box>
  )
}

export default AquaMeshLanding

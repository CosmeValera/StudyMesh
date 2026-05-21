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
import SchoolIcon from '@mui/icons-material/School'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import RouteIcon from '@mui/icons-material/Route'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import KeyIcon from '@mui/icons-material/Key'
import MemoryIcon from '@mui/icons-material/Memory'
import CloudQueueIcon from '@mui/icons-material/CloudQueue'

const mainUseCases = [
  {
    title: 'Create Study Path',
    eyebrow: 'From a goal',
    body: 'Describe what you want to learn and StudyMesh creates an ordered path with lessons, recap, and practice dashboards.',
    icon: <RouteIcon />,
    action: 'create-study-path',
    cta: 'Start a path',
    accent: '#2196F3',
    steps: ['Prompt a topic', 'Review the path', 'Study in order'],
  },
  {
    title: 'Create from context',
    eyebrow: 'From your material',
    body: 'Paste notes, upload documents, or bring study context and turn it into a clean dashboard with summaries and exercises.',
    icon: <MenuBookIcon />,
    action: 'create-from-notes',
    cta: 'Use context',
    accent: '#00A878',
    steps: ['Add material', 'Clean it up', 'Practice from it'],
  },
]

const workflow = [
  {
    title: 'Plan the learning journey',
    body: 'Break a topic into a clear sequence instead of staring at a blank workspace.',
    icon: <SchoolIcon />,
  },
  {
    title: 'Clean up real context',
    body: 'Turn notes, files, screenshots, or rough material into something structured and usable.',
    icon: <MenuBookIcon />,
  },
  {
    title: 'Practice where the notes live',
    body: 'Keep explanations, flashcards, quizzes, and review prompts together in one study view.',
    icon: <CheckCircleIcon />,
  },
]

const quickAnswers = [
  {
    question: 'What is StudyMesh for?',
    answer:
      'StudyMesh helps students turn learning goals, notes, images, and references into study paths, clean dashboards, exercises, and review material.',
  },
  {
    question: 'What should I do first?',
    answer:
      'Create a Study Path from a learning goal, or use Create from Context when you already have notes, files, or screenshots.',
  },
  {
    question: 'How are dashboards organized?',
    answer:
      'Generated study paths and context dashboards can be opened in the workspace and reused by folder.',
  },
]

const aiPricing = [
  {
    title: 'Fallback mode',
    price: '0€',
    label: 'Always available',
    body: 'Basic local parsing and practice generation when you just want a quick dashboard without configuring AI.',
    icon: <CheckCircleIcon />,
    features: ['No API key', 'No payment', 'Good for quick notes'],
  },
  {
    title: 'Local Gemini Nano',
    price: '0€',
    label: 'Private on-device AI',
    body: 'Run compatible local AI in the browser when available. Slower, but private and free to use.',
    icon: <MemoryIcon />,
    features: ['No server tokens', 'Runs locally', 'Best for privacy'],
  },
  {
    title: 'BYOK Gemini',
    price: '0€',
    label: 'Use your own key',
    body: 'Bring your Gemini API key and StudyMesh uses it directly for deeper study paths and notes cleanup.',
    icon: <KeyIcon />,
    features: ['Your quota', 'Your control', 'Great quality'],
  },
  {
    title: 'Hosted API tokens',
    price: '2€',
    label: 'No API keys to manage',
    body: 'Start with 5-10 free tries. If you need more, make a one-time 2€ payment for greater hourly limits.',
    icon: <CloudQueueIcon />,
    features: ['5-10 free tries', 'One-time payment', 'Higher hourly limits'],
    highlighted: true,
  },
]

const StudyMeshLanding = () => {
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
            <Box
              component="img"
              src="/logo.png"
              alt="StudyMesh logo"
              sx={{ width: 36, height: 36, display: 'block' }}
            />
            <Typography variant="h6" fontWeight={800}>
              StudyMesh
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
                display: 'inline-block',
                background: 'linear-gradient(90deg, #2196F3, #00C49A, #2196F3)',
                backgroundSize: '190% auto',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                animation: 'studyMeshHeroGradientShift 4s ease infinite',
                '@keyframes studyMeshHeroGradientShift': {
                  '0%': { backgroundPosition: '0% center' },
                  '50%': { backgroundPosition: '95% center' },
                  '100%': { backgroundPosition: '0% center' },
                },
              }}
            >
              StudyMesh
            </Typography>
            <Typography
              variant="h5"
              component="p"
              sx={{ fontWeight: 700, color: 'primary.dark', mb: 2 }}
            >
              Turn prompts and messy notes into study paths.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              Create tutorials, study dashboards, exercises, and reusable
              workspace views from learning material without designing the
              dashboard first.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={<RouteIcon />}
                onClick={() => openWorkspace('create-study-path')}
                sx={{ borderRadius: 1, textTransform: 'none' }}
              >
                Create Study Path
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<MenuBookIcon />}
                onClick={() => openWorkspace('create-from-notes')}
                sx={{ borderRadius: 1, textTransform: 'none' }}
              >
                Create From Context
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
                alt="StudyMesh workspace"
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

        <Box sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={1} textAlign="center" alignItems="center" mb={3}>
            <Typography
              variant="overline"
              fontWeight={900}
              color="primary.main"
            >
              Two ways to start
            </Typography>
            <Typography variant="h4" component="h2" fontWeight={900}>
              Start from a learning goal or from your context
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 760 }}
            >
              StudyMesh keeps the product focused: generate a guided path when
              you need structure, or transform existing material when you
              already have notes, files, or screenshots.
            </Typography>
          </Stack>

          <Grid container spacing={2.5} alignItems="stretch">
            {mainUseCases.map((useCase, index) => (
              <Grid item xs={12} md={6} key={useCase.title}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: alpha(useCase.accent, 0.28),
                    bgcolor: alpha(useCase.accent, 0.06),
                    position: 'relative',
                    overflow: 'hidden',
                    transition:
                      'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                    animation: `studyMeshUseCaseFloat${index} 7s ease-in-out infinite`,
                    '@keyframes studyMeshUseCaseFloat0': {
                      '0%, 100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-4px)' },
                    },
                    '@keyframes studyMeshUseCaseFloat1': {
                      '0%, 100%': { transform: 'translateY(-2px)' },
                      '50%': { transform: 'translateY(2px)' },
                    },
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      borderColor: alpha(useCase.accent, 0.58),
                      boxShadow: `0 24px 54px ${alpha(useCase.accent, 0.16)}`,
                      animationPlayState: 'paused',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 'auto -12% -28% auto',
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      bgcolor: alpha(useCase.accent, 0.14),
                    },
                  }}
                >
                  <Stack spacing={2.25} height="100%" position="relative">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          color: useCase.accent,
                          bgcolor: alpha(useCase.accent, 0.12),
                        }}
                      >
                        {useCase.icon}
                      </Box>
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={800}
                        >
                          {useCase.eyebrow}
                        </Typography>
                        <Typography variant="h5" fontWeight={900}>
                          {useCase.title}
                        </Typography>
                      </Box>
                    </Stack>

                    <Typography color="text.secondary">
                      {useCase.body}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {useCase.steps.map((step) => (
                        <Box
                          key={step}
                          sx={{
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 999,
                            border: '1px solid',
                            borderColor: alpha(useCase.accent, 0.22),
                            bgcolor: alpha(theme.palette.background.paper, 0.7),
                            fontSize: '0.78rem',
                            fontWeight: 800,
                          }}
                        >
                          {step}
                        </Box>
                      ))}
                    </Stack>

                    <Button
                      variant={index === 0 ? 'contained' : 'outlined'}
                      onClick={() => openWorkspace(useCase.action)}
                      sx={{
                        mt: 'auto',
                        alignSelf: 'flex-start',
                        borderRadius: 1,
                        textTransform: 'none',
                        ...(index === 0
                          ? { bgcolor: useCase.accent }
                          : {
                              color: useCase.accent,
                              borderColor: alpha(useCase.accent, 0.42),
                            }),
                      }}
                    >
                      {useCase.cta}
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ py: 5 }}>
          <Typography variant="h4" component="h2" fontWeight={850} mb={3}>
            What StudyMesh helps with
          </Typography>
          <Grid container spacing={2}>
            {workflow.map((step, index) => (
              <Grid item xs={12} md={4} key={step.title}>
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
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 4 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.22),
              bgcolor:
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.primary.dark, 0.24)
                  : alpha(theme.palette.primary.light, 0.1),
              background:
                theme.palette.mode === 'dark'
                  ? `radial-gradient(circle at top right, ${alpha(
                      theme.palette.primary.main,
                      0.24,
                    )}, transparent 34%), ${alpha(
                      theme.palette.background.paper,
                      0.74,
                    )}`
                  : `radial-gradient(circle at top right, ${alpha(
                      theme.palette.primary.light,
                      0.38,
                    )}, transparent 34%), linear-gradient(135deg, ${alpha(
                      theme.palette.primary.light,
                      0.14,
                    )}, ${alpha(theme.palette.success.light, 0.14)})`,
            }}
          >
            <Stack spacing={1} alignItems="center" textAlign="center" mb={3}>
              <Typography
                variant="overline"
                fontWeight={900}
                color="primary.main"
              >
                Pricing
              </Typography>
              <Typography variant="h4" component="h2" fontWeight={900}>
                Choose the AI mode that fits you
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 720 }}
              >
                StudyMesh is designed to stay useful even at 0€. Use free modes,
                bring your own Gemini key, run local AI, or choose hosted tokens
                when you do not want to worry about API keys, quotas, or setup.
              </Typography>
            </Stack>

            <Grid container spacing={2} alignItems="stretch">
              {aiPricing.map((plan) => (
                <Grid item xs={12} sm={6} md={3} key={plan.title}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: '100%',
                      p: 2.25,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: plan.highlighted
                        ? 'primary.main'
                        : alpha(theme.palette.divider, 0.9),
                      bgcolor: plan.highlighted
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.background.paper, 0.86),
                      boxShadow: plan.highlighted
                        ? `0 18px 44px ${alpha(
                            theme.palette.primary.main,
                            0.18,
                          )}`
                        : 'none',
                    }}
                  >
                    <Stack spacing={1.5} height="100%">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            color: plan.highlighted
                              ? 'primary.contrastText'
                              : 'primary.main',
                            bgcolor: plan.highlighted
                              ? 'primary.main'
                              : alpha(theme.palette.primary.main, 0.1),
                          }}
                        >
                          {plan.icon}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {plan.label}
                        </Typography>
                      </Stack>
                      <Box>
                        <Typography variant="h6" fontWeight={900}>
                          {plan.title}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="end">
                          <Typography variant="h3" fontWeight={950}>
                            {plan.price}
                          </Typography>
                          {plan.highlighted && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ pb: 0.75 }}
                            >
                              one-time
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {plan.body}
                      </Typography>
                      <Stack spacing={0.75} sx={{ mt: 'auto' }}>
                        {plan.features.map((feature) => (
                          <Stack
                            key={feature}
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                          >
                            <CheckCircleIcon
                              fontSize="small"
                              color={plan.highlighted ? 'primary' : 'success'}
                            />
                            <Typography variant="body2">{feature}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
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
            Ready to create your next study view?
          </Typography>
          <Typography
            sx={{
              color: alpha(theme.palette.primary.contrastText, 0.82),
              mb: 3,
            }}
          >
            Start with a prompt or notes, then open the generated work in your
            workspace.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => openWorkspace('create-study-path')}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.light' },
              }}
            >
              Create Study Path
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => openWorkspace('create-from-notes')}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                color: 'primary.contrastText',
                borderColor: alpha(theme.palette.primary.contrastText, 0.64),
                '&:hover': {
                  borderColor: 'primary.contrastText',
                  bgcolor: alpha(theme.palette.primary.contrastText, 0.08),
                },
              }}
            >
              Create From Context
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}

export default StudyMeshLanding

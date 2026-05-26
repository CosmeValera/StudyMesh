import React from 'react'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import QuizIcon from '@mui/icons-material/Quiz'
import RouteIcon from '@mui/icons-material/Route'
import StyleIcon from '@mui/icons-material/Style'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import { createStudyPathContainerState } from './studyPathContainer'
import { normalizeFolderColor } from './folderColors'
import { DashboardStorage, SavedDashboard } from './dashboardStorage'

type EmptyDashboardQuickCreate = 'quiz' | 'flashcards' | 'improvedNotes'

interface DashboardEmptyStateProps {
  isAdmin: boolean
  hasDashboard: boolean
  onCreateStudyPath: () => void
  onUploadMaterial: () => void
  onPasteNotes: () => void
  onQuickCreate: (intent: EmptyDashboardQuickCreate) => void
  onOpenSavedLibrary: () => void
  dashboardOptions: SavedDashboard[]
  onOpenDashboard: (dashboard: SavedDashboard) => void
  onOpenStudyGuide: (dashboards: SavedDashboard[]) => void
}

const quickActions: Array<{
  intent: EmptyDashboardQuickCreate
  label: string
  icon: React.ReactNode
  accent: string
}> = [
  {
    intent: 'quiz',
    label: 'Create Quiz',
    icon: <QuizIcon fontSize="small" />,
    accent: '#5b9dff',
  },
  {
    intent: 'flashcards',
    label: 'Create Flashcards',
    icon: <StyleIcon fontSize="small" />,
    accent: '#b66cff',
  },
  {
    intent: 'improvedNotes',
    label: 'Create Clean Notes',
    icon: <AutoStoriesIcon fontSize="small" />,
    accent: '#18b992',
  },
]

const DashboardEmptyState = ({
  isAdmin,
  onCreateStudyPath,
  onUploadMaterial,
  onPasteNotes,
  onQuickCreate,
  onOpenSavedLibrary,
  dashboardOptions,
  onOpenDashboard,
  onOpenStudyGuide,
}: DashboardEmptyStateProps) => {
  const dashboardsByFolder = dashboardOptions.reduce<
    Record<string, SavedDashboard[]>
  >((folders, dashboard) => {
    const folderName = dashboard.folder?.trim() || 'Default'
    folders[folderName] = folders[folderName] || []
    folders[folderName].push(dashboard)
    return folders
  }, {})
  const folderEntries = Object.entries(dashboardsByFolder)
  const hasStudyGuides = folderEntries.some(([, dashboards]) =>
    Boolean(createStudyPathContainerState(dashboards)),
  )
  const hasStandaloneDashboards = folderEntries.some(
    ([, dashboards]) => !createStudyPathContainerState(dashboards),
  )
  const openExistingLabel = hasStudyGuides
    ? hasStandaloneDashboards
      ? 'Open existing dashboard or study guide'
      : 'Open existing study guide'
    : 'Open existing dashboard'
  const featuredFolders = folderEntries.slice(0, 4)

  return (
    <Box
      sx={{
        height: { xs: '100%', md: 'auto' },
        minHeight: { xs: '100%', md: 'calc(100dvh - 130px)' },
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'center',
        p: { xs: 1, sm: 1.5, md: 2.5 },
        pb: { xs: 1.25, md: 2.5 },
        bgcolor: 'background.default',
        width: '100%',
        maxWidth: '100%',
        overflow: { xs: 'hidden', md: 'visible' },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: 'min(1240px, 100%)',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 3fr) minmax(300px, 2fr)',
          },
          gap: { xs: 1.25, sm: 1.5, lg: 2 },
          alignItems: 'stretch',
          maxHeight: { xs: '100%', lg: 'none' },
          overflowY: { xs: 'auto', lg: 'visible' },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 'auto', lg: 560 },
            p: { xs: 1.25, sm: 2, md: 2.5 },
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.5, md: 2 },
            minWidth: 0,
            boxSizing: 'border-box',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 20px 56px rgba(0,0,0,0.28)'
                : '0 20px 56px rgba(15,23,42,0.08)',
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="primary"
              fontWeight={900}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
            >
              Start creating
            </Typography>
            <Typography
              variant="h4"
              fontWeight={950}
              sx={{
                mt: 0.5,
                lineHeight: 1.08,
                fontSize: { xs: '1.45rem', sm: '1.85rem', md: '2.2rem' },
              }}
            >
              What do you want to build?
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 620 }}
            >
              Create a guided Study Path, or add material first to generate a
              focused quiz, flashcards, or clean notes.
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              sx={{ mt: 1.25 }}
            >
              {['1 Add material', '2 Pick output', '3 Review dashboard'].map(
                (label) => (
                  <Chip
                    key={label}
                    size="small"
                    label={label}
                    sx={{
                      fontWeight: 800,
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.08),
                      border: 1,
                      borderColor: (theme) =>
                        alpha(theme.palette.primary.main, 0.16),
                    }}
                  />
                ),
              )}
            </Stack>
          </Box>

          <Paper
            component="button"
            type="button"
            elevation={0}
            onClick={onCreateStudyPath}
            disabled={!isAdmin}
            sx={{
              width: '100%',
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2.5,
              border: 1,
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.42),
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.075),
              color: 'text.primary',
              cursor: isAdmin ? 'pointer' : 'default',
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: 'auto minmax(0, 1fr) auto',
              alignItems: 'center',
              gap: { xs: 1.25, sm: 1.5 },
              boxShadow: (theme) =>
                `0 16px 38px ${alpha(theme.palette.primary.main, 0.1)}`,
              '&:hover': {
                borderColor: isAdmin ? 'primary.main' : undefined,
                bgcolor: (theme) =>
                  isAdmin
                    ? alpha(theme.palette.primary.main, 0.105)
                    : alpha(theme.palette.primary.main, 0.075),
                transform: isAdmin ? 'translateY(-1px)' : undefined,
              },
              '&:focus-visible': {
                outline: (theme) =>
                  `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                outlineOffset: 2,
              },
              transition:
                'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
            }}
          >
            <Box
              sx={{
                width: { xs: 44, sm: 52 },
                height: { xs: 44, sm: 52 },
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <RouteIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="primary" fontWeight={900}>
                  Recommended
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={950} lineHeight={1.12}>
                Create Study Path
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.4 }}
              >
                A guided multi-dashboard tutorial with lessons, exercises,
                flashcards, and review structure.
              </Typography>
            </Box>
            <ChevronRightIcon color="primary" />
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={onUploadMaterial}
              disabled={!isAdmin}
              sx={{
                justifyContent: 'flex-start',
                minHeight: 48,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 900,
              }}
            >
              <Stack alignItems="flex-start" spacing={0}>
                <span>Upload material</span>
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ opacity: 0.78, fontWeight: 700 }}
                >
                  PDF, slides, images, text
                </Typography>
              </Stack>
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentPasteIcon />}
              onClick={onPasteNotes}
              disabled={!isAdmin}
              sx={{
                justifyContent: 'flex-start',
                minHeight: 48,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 900,
                bgcolor: 'background.paper',
              }}
            >
              <Stack alignItems="flex-start" spacing={0}>
                <span>Paste notes</span>
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  Fastest for copied text
                </Typography>
              </Stack>
            </Button>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.25, sm: 1.5 },
              borderRadius: 2.5,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Stack spacing={1.25}>
              <Box>
                <Typography variant="subtitle1" fontWeight={900}>
                  Fast creation from material
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.3 }}
                >
                  This dashboard is empty, so these actions open Create from
                  Material with the right setup ready.
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 1,
                }}
              >
                {quickActions.map((action) => (
                  <Paper
                    key={action.intent}
                    component="button"
                    type="button"
                    elevation={0}
                    onClick={() => onQuickCreate(action.intent)}
                    disabled={!isAdmin}
                    sx={{
                      minHeight: 92,
                      p: 1.25,
                      borderRadius: 2,
                      border: 1,
                      borderColor: alpha(action.accent, 0.24),
                      bgcolor: alpha(action.accent, 0.07),
                      color: 'text.primary',
                      cursor: isAdmin ? 'pointer' : 'default',
                      textAlign: 'left',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: 1,
                      '&:hover': {
                        borderColor: isAdmin
                          ? alpha(action.accent, 0.72)
                          : undefined,
                        bgcolor: isAdmin
                          ? alpha(action.accent, 0.1)
                          : undefined,
                        transform: isAdmin ? 'translateY(-1px)' : undefined,
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${alpha(action.accent, 0.26)}`,
                        outlineOffset: 2,
                      },
                      transition:
                        'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
                    }}
                  >
                    <Stack spacing={1} sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 1.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: alpha(action.accent, 0.14),
                          color: action.accent,
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Typography variant="subtitle2" fontWeight={900}>
                        {action.label}
                      </Typography>
                      <Chip
                        size="small"
                        label="opens material flow"
                        sx={{
                          alignSelf: 'flex-start',
                          height: 21,
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          bgcolor: alpha(action.accent, 0.12),
                        }}
                      />
                    </Stack>
                    <ChevronRightIcon sx={{ color: action.accent }} />
                  </Paper>
                ))}
              </Box>
            </Stack>
          </Paper>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 'auto', lg: 560 },
            p: { xs: 1.25, sm: 2, md: 2.25 },
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.25, md: 1.75 },
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'background.default',
                color: 'primary.main',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <FolderOpenIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={900}>
                Open study material
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                Continue saved Study Paths, packs, or dashboards.
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ mb: 1, color: 'text.secondary' }}
            >
              Recent folders
            </Typography>
            {featuredFolders.length > 0 ? (
              <Stack spacing={1}>
                {featuredFolders.map(([folderName, dashboards]) => {
                  const studyGuide = createStudyPathContainerState(dashboards)
                  const folderColor = normalizeFolderColor(
                    dashboards.find((dashboard) => dashboard.folderColor)
                      ?.folderColor ||
                      DashboardStorage.getFolderColor(folderName),
                  )
                  const firstDashboard = dashboards[0]

                  return (
                    <Button
                      key={folderName}
                      variant="text"
                      onClick={() =>
                        studyGuide
                          ? onOpenStudyGuide(dashboards)
                          : firstDashboard && onOpenDashboard(firstDashboard)
                      }
                      sx={{
                        minHeight: { xs: 48, md: 58 },
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        textTransform: 'none',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        px: 1.25,
                        minWidth: 0,
                        maxWidth: '100%',
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          borderColor: folderColor,
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: folderColor,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                          }}
                        >
                          {folderName}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {studyGuide?.title || firstDashboard?.name}
                        </Typography>
                      </Box>
                    </Button>
                  )
                })}
              </Stack>
            ) : (
              <Box
                sx={{
                  minHeight: 220,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  px: 2,
                  color: 'text.secondary',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <Box>
                  <FolderOpenIcon sx={{ fontSize: 38, mb: 1, opacity: 0.65 }} />
                  <Typography variant="body2" fontWeight={800}>
                    Saved Study Paths and dashboards appear here.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          <Stack direction="row" gap={0.75} flexWrap="wrap">
            <Chip size="small" label="Study Paths" />
            <Chip size="small" label="Study Packs" />
            <Chip size="small" label="Dashboards" />
          </Stack>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={onOpenSavedLibrary}
            sx={{
              textTransform: 'none',
              bgcolor: 'background.default',
              borderRadius: 2,
              fontWeight: 800,
            }}
          >
            {openExistingLabel}
          </Button>
        </Paper>
      </Box>
    </Box>
  )
}

export default DashboardEmptyState

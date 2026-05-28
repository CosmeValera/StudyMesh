import React from 'react'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import AddLinkIcon from '@mui/icons-material/AddLink'
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
  onAddStudyLink: () => void
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
    label: 'Expand on this',
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
  dashboardOptions,
  onOpenDashboard,
  onOpenStudyGuide,
  onAddStudyLink,
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
  const featuredFolders = folderEntries.slice(0, 3)

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
          width: { xs: '100%', md: 'min(760px, 100%)' },
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
            width: '100%',
            maxWidth: 760,
            mx: 'auto',
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
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: '0.56rem',
              }}
            >
              Start creating
            </Typography>
            <Typography
              variant="h4"
              fontWeight={950}
              sx={{
                mt: 0.5,
                lineHeight: 1.08,
                fontSize: { xs: '1.16rem', sm: '1.48rem', md: '1.76rem' },
              }}
            >
              Build an index dashboard
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 620, fontSize: '0.72rem' }}
            >
              Use this dashboard as an index page for your learning.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddLinkIcon />}
            onClick={onAddStudyLink}
            sx={{
              justifyContent: 'flex-start',
              minHeight: 44,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 900,
            }}
          >
            Add your first study link
          </Button>

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
                minHeight: 42,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.8125rem',
              }}
            >
              Upload material
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentPasteIcon />}
              onClick={onPasteNotes}
              disabled={!isAdmin}
              sx={{
                justifyContent: 'flex-start',
                minHeight: 42,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.8125rem',
                bgcolor: 'background.paper',
              }}
            >
              Paste notes
            </Button>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
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
            width: '100%',
            maxWidth: 760,
            mx: 'auto',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'background.default',
                color: 'primary.main',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <FolderOpenIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                fontWeight={900}
                sx={{ fontSize: '1rem' }}
              >
                Open study material
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Typography
              variant="caption"
              fontWeight={800}
              sx={{ mb: 0.75, color: 'text.secondary', fontSize: '0.6875rem' }}
            >
              Recent
            </Typography>
            {featuredFolders.length > 0 ? (
              <Stack spacing={1} alignItems="flex-start">
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
                        width: { xs: '100%', md: 260 },
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
                            fontSize: '0.625rem',
                          }}
                        >
                          {folderName}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            fontSize: '0.8125rem',
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
            <Chip size="small" label="Dashboards" />
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}

export default DashboardEmptyState

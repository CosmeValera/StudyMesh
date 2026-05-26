import React from 'react'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import RouteIcon from '@mui/icons-material/Route'

import { createStudyPathContainerState } from './studyPathContainer'
import { normalizeFolderColor } from './folderColors'
import { DashboardStorage, SavedDashboard } from './dashboardStorage'

interface DashboardEmptyStateProps {
  isAdmin: boolean
  hasDashboard: boolean
  onCreateStudyPath: () => void
  onCreateFromNotes: () => void
  onOpenSavedLibrary: () => void
  dashboardOptions: SavedDashboard[]
  onOpenDashboard: (dashboard: SavedDashboard) => void
  onOpenStudyGuide: (dashboards: SavedDashboard[]) => void
}

const DashboardEmptyState = ({
  isAdmin,
  onCreateStudyPath,
  onCreateFromNotes,
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
          width: 'min(1280px, 100%)',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(240px, 3fr) minmax(320px, 4fr) minmax(240px, 3fr)',
          },
          gap: { xs: 1, sm: 1.5, lg: 2 },
          alignItems: 'stretch',
          maxHeight: { xs: '100%', lg: 'none' },
          overflowY: { xs: 'auto', lg: 'visible' },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 'auto', lg: 520 },
            p: { xs: 1.25, sm: 2, md: 2.5 },
            borderRadius: 2,
            border: 1,
            borderColor: 'primary.light',
            bgcolor: 'background.accentSurface',
            color: 'foreground.contrastPrimary',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: { xs: 1, md: 2.5 },
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <Box>
            <RouteIcon
              sx={{
                fontSize: { xs: 30, md: 44 },
                color: 'primary.main',
                mb: { xs: 0.5, md: 1 },
              }}
            />
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{
                lineHeight: 1.15,
                fontSize: { xs: '1.12rem', md: '1.5rem' },
              }}
            >
              Create a Study Path
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: { xs: 0.5, md: 1 },
                color: 'foreground.contrastSecondary',
              }}
            >
              Start from a topic or prompt and generate ordered tutorial
              dashboards.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<RouteIcon />}
            onClick={onCreateStudyPath}
            disabled={!isAdmin}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.dark',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            Create Study Path
          </Button>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 'auto', lg: 520 },
            p: { xs: 1.25, sm: 2, md: 2.5 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1, md: 2 },
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <FolderOpenIcon color="primary" />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                fontWeight={900}
                sx={{
                  lineHeight: 1.15,
                  fontSize: { xs: '1.12rem', md: '1.5rem' },
                }}
              >
                Open study material
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Continue existing Study Paths, Study Packs, or custom
                dashboards.
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
                        minHeight: { xs: 42, md: 54 },
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        textTransform: 'none',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1.25,
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
                  minHeight: 190,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  px: 2,
                  color: 'text.secondary',
                }}
              >
                <Box>
                  <FolderOpenIcon sx={{ fontSize: 38, mb: 1, opacity: 0.65 }} />
                  <Typography variant="body2" fontWeight={700}>
                    Saved Study Paths and dashboards appear here.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={onOpenSavedLibrary}
            sx={{ textTransform: 'none', bgcolor: 'background.default' }}
          >
            {openExistingLabel}
          </Button>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            minHeight: { xs: 'auto', lg: 520 },
            p: { xs: 1.25, sm: 2, md: 2.5 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1, md: 2 },
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <Box>
            <AutoStoriesIcon
              sx={{
                fontSize: { xs: 30, md: 44 },
                color: 'primary.main',
                mb: { xs: 0.5, md: 1 },
              }}
            />
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{
                lineHeight: 1.15,
                fontSize: { xs: '1.12rem', md: '1.5rem' },
              }}
            >
              Create From Notes
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: { xs: 0.5, md: 1 } }}
            >
              Upload notes, screenshots, PDFs, or slides and turn them into a
              widget-based study dashboard.
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Paper
              component="button"
              type="button"
              elevation={0}
              onClick={onCreateFromNotes}
              disabled={!isAdmin}
              sx={{
                width: '100%',
                minHeight: { xs: 92, md: 170 },
                p: { xs: 1.25, md: 2 },
                borderRadius: 2,
                border: '1.5px dashed',
                borderColor: 'primary.main',
                bgcolor: 'background.default',
                color: 'text.primary',
                cursor: isAdmin ? 'pointer' : 'default',
                textAlign: 'center',
                display: 'grid',
                placeItems: 'center',
                boxSizing: 'border-box',
                '&:hover': {
                  bgcolor: isAdmin ? 'action.hover' : 'background.default',
                  borderColor: isAdmin ? 'primary.dark' : 'primary.main',
                },
              }}
            >
              <Stack spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: { xs: 36, md: 48 },
                    height: { xs: 36, md: 48 },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <CloudUploadIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={900}>
                    Add sources
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Text, images, PDFs, and slides.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

export default DashboardEmptyState

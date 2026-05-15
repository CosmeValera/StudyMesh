import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import LaunchIcon from '@mui/icons-material/Launch'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import DashboardLayoutView from '../Layout/Layout'
import {
  DashboardLayout,
  StudyPathContainerState,
  StudyPathDashboardItem,
} from '../../state/store'
import { getStudyPathDashboardProgress } from '../../studyPack/progress'

const STUDY_PATH_NAV_COLLAPSED_STORAGE_KEY =
  'aquamesh-study-path-navigator-collapsed-v1'

interface StudyPathWorkspaceViewProps {
  studyPath: StudyPathContainerState
  onStudyPathChange: (studyPath: StudyPathContainerState) => void
  onOpenLesson: (dashboard: StudyPathDashboardItem) => void
  onOpenAll: () => void
}

const getProgressForLesson = (
  studyPath: StudyPathContainerState,
  lesson: StudyPathDashboardItem,
) =>
  getStudyPathDashboardProgress({
    studyPathId: studyPath.pathId,
    studyPathTitle: studyPath.title,
    dashboardKey: lesson.dashboardKey,
    dashboardName: lesson.name,
    dashboardIndex: lesson.dashboardIndex,
    dashboardCount: lesson.dashboardCount,
    folderName: lesson.folderName || studyPath.folderName,
  })

const sanitizeStudentWidgetName = (name?: string): string | undefined => {
  if (!name) {
    return name
  }

  if (/\bmisc\b/i.test(name)) {
    return 'Extra practice'
  }

  return name.replace(/\s*\(?\d+\s+(study\s+)?objects?\)?/gi, '').trim() || name
}

const sanitizeStudentComponent = (component: unknown): unknown => {
  if (typeof component !== 'object' || component === null) {
    return component
  }

  const record = component as Record<string, unknown>
  const props =
    typeof record.props === 'object' && record.props !== null
      ? ({ ...(record.props as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : undefined

  if (props) {
    if (
      typeof props.description === 'string' &&
      /study objects?/i.test(props.description)
    ) {
      delete props.description
    }

    if (typeof props.title === 'string') {
      props.title = sanitizeStudentWidgetName(props.title)
    }
  }

  return props ? { ...record, props } : record
}

const sanitizeStudentLayout = (
  layout?: DashboardLayout,
): DashboardLayout | undefined => {
  if (!layout) {
    return layout
  }

  const customProps = layout.config?.customProps
  const nextCustomProps = customProps
    ? {
        ...customProps,
        components: Array.isArray(customProps.components)
          ? customProps.components.map(sanitizeStudentComponent)
          : customProps.components,
      }
    : undefined

  return {
    ...layout,
    name: sanitizeStudentWidgetName(layout.name),
    config: layout.config
      ? {
          ...layout.config,
          customProps: nextCustomProps,
        }
      : layout.config,
    children: layout.children?.map(
      (child) => sanitizeStudentLayout(child) as DashboardLayout,
    ),
  }
}

const StudyPathWorkspaceView: React.FC<StudyPathWorkspaceViewProps> = ({
  studyPath,
  onStudyPathChange,
  onOpenLesson,
  onOpenAll,
}) => {
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false)
  const selectedIndex = Math.min(
    Math.max(studyPath.selectedIndex || 0, 0),
    Math.max(studyPath.dashboards.length - 1, 0),
  )
  const currentLesson = studyPath.dashboards[selectedIndex]
  const pinnedDashboardKeys = studyPath.pinnedDashboardKeys || []
  const progressByKey = useMemo(
    () =>
      Object.fromEntries(
        studyPath.dashboards.map((lesson) => [
          lesson.dashboardKey,
          getProgressForLesson(studyPath, lesson),
        ]),
      ),
    [studyPath],
  )
  const completedCount = Object.values(progressByKey).filter(
    (progress) => progress.completedAt,
  ).length
  const currentProgress = currentLesson
    ? progressByKey[currentLesson.dashboardKey]
    : null
  const studentLayout = useMemo(
    () => sanitizeStudentLayout(currentLesson?.layout),
    [currentLesson?.layout],
  )

  useEffect(() => {
    try {
      const storedState = localStorage.getItem(
        `${STUDY_PATH_NAV_COLLAPSED_STORAGE_KEY}:${studyPath.pathId}`,
      )
      setNavigatorCollapsed(storedState === 'true')
    } catch (error) {
      console.error('Failed to load Study Path navigator state', error)
    }
  }, [studyPath.pathId])

  useEffect(() => {
    try {
      localStorage.setItem(
        `${STUDY_PATH_NAV_COLLAPSED_STORAGE_KEY}:${studyPath.pathId}`,
        String(navigatorCollapsed),
      )
    } catch (error) {
      console.error('Failed to save Study Path navigator state', error)
    }
  }, [navigatorCollapsed, studyPath.pathId])

  const selectLesson = (index: number) => {
    onStudyPathChange({ ...studyPath, selectedIndex: index })
  }

  const updateCurrentLayout = (layout: DashboardLayout) => {
    if (!currentLesson) {
      return
    }

    onStudyPathChange({
      ...studyPath,
      dashboards: studyPath.dashboards.map((lesson, index) =>
        index === selectedIndex ? { ...lesson, layout } : lesson,
      ),
    })
  }

  const togglePinnedLesson = () => {
    if (!currentLesson) {
      return
    }

    const isPinned = pinnedDashboardKeys.includes(currentLesson.dashboardKey)
    onStudyPathChange({
      ...studyPath,
      pinnedDashboardKeys: isPinned
        ? pinnedDashboardKeys.filter(
            (key) => key !== currentLesson.dashboardKey,
          )
        : [...pinnedDashboardKeys, currentLesson.dashboardKey],
    })
  }

  const toggleNavigatorCollapsed = () => {
    setNavigatorCollapsed((currentState) => !currentState)
  }

  if (!currentLesson) {
    return (
      <Paper sx={{ p: 3, m: 2 }}>
        <Typography variant="h6">Study Path is empty</Typography>
        <Typography color="text.secondary">
          This container does not have lessons attached yet.
        </Typography>
      </Paper>
    )
  }

  const isPinned = pinnedDashboardKeys.includes(currentLesson.dashboardKey)
  const canGoPrevious = selectedIndex > 0
  const canGoNext = selectedIndex < studyPath.dashboards.length - 1
  const completionPercent =
    studyPath.dashboards.length > 0
      ? Math.round((completedCount / studyPath.dashboards.length) * 100)
      : 0

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: navigatorCollapsed
            ? '72px minmax(0, 1fr)'
            : '340px minmax(0, 1fr)',
        },
        gridTemplateRows: {
          xs: navigatorCollapsed
            ? 'auto minmax(0, 1fr)'
            : 'minmax(260px, auto) minmax(0, 1fr)',
          lg: '1fr',
        },
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(0,124,102,0.12), rgba(25,118,210,0.08))',
        border: 1,
        borderColor: 'primary.main',
        borderRadius: { xs: 0, md: 2 },
      }}
    >
      <Paper
        square
        elevation={0}
        sx={{
          borderRight: { lg: 1 },
          borderBottom: { xs: 1, lg: 0 },
          borderColor: 'divider',
          p: 2.25,
          background:
            'linear-gradient(180deg, rgba(0,124,102,0.18), rgba(0,16,38,0.02)), var(--background-paper)',
          overflowY: navigatorCollapsed ? 'hidden' : 'auto',
          position: 'relative',
          zIndex: 2,
          p: navigatorCollapsed ? 1 : 2.25,
        }}
      >
        {navigatorCollapsed ? (
          <Stack
            spacing={1.5}
            alignItems="center"
            sx={{ height: '100%', minHeight: { lg: 0 } }}
          >
            <Tooltip title="Expand Course navigator">
              <IconButton
                aria-label="Expand Course navigator"
                onClick={toggleNavigatorCollapsed}
                color="primary"
                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
            <AutoStoriesIcon color="primary" />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 900,
                writingMode: { xs: 'horizontal-tb', lg: 'vertical-rl' },
                transform: { lg: 'rotate(180deg)' },
                textAlign: 'center',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Course navigator
            </Typography>
            <Chip
              size="small"
              color="primary"
              label={`${selectedIndex + 1}/${studyPath.dashboards.length}`}
              sx={{ mt: 'auto' }}
            />
          </Stack>
        ) : (
          <Stack spacing={2.25}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.contrastText',
                  bgcolor: 'primary.main',
                  boxShadow: 2,
                  flex: '0 0 auto',
                }}
              >
                <AutoStoriesIcon />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="overline"
                    color="primary.main"
                    sx={{ fontWeight: 900, letterSpacing: '.08em' }}
                  >
                    Course navigator
                  </Typography>
                  <Tooltip title="Collapse Course navigator">
                    <IconButton
                      size="small"
                      aria-label="Collapse Course navigator"
                      onClick={toggleNavigatorCollapsed}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        border: 1,
                        borderColor: 'primary.dark',
                        boxShadow: 2,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                    >
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography variant="h6" sx={{ lineHeight: 1.18 }}>
                  {studyPath.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  One Study Path tab · switch lessons below
                </Typography>
              </Box>
            </Stack>

            <Paper
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}
            >
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                Step {selectedIndex + 1}/{studyPath.dashboards.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentLesson.name}
              </Typography>
            </Paper>

            <Box>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {completedCount}/{studyPath.dashboards.length} completed
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {completionPercent}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={completionPercent}
                sx={{ mt: 0.75, borderRadius: 999 }}
              />
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              Lessons
            </Typography>

            <Stack spacing={1.1}>
              {studyPath.dashboards.map((lesson, index) => {
                const progress = progressByKey[lesson.dashboardKey]
                const active = index === selectedIndex
                const pinned = pinnedDashboardKeys.includes(lesson.dashboardKey)

                return (
                  <Button
                    key={lesson.dashboardKey}
                    onClick={() => selectLesson(index)}
                    variant={active ? 'contained' : 'text'}
                    color={active ? 'primary' : 'inherit'}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      alignItems: 'stretch',
                      borderRadius: 2.5,
                      py: 1.15,
                      px: 1.25,
                      border: 1,
                      borderColor: active ? 'primary.main' : 'divider',
                      bgcolor: active ? 'primary.main' : 'background.paper',
                      boxShadow: active ? 2 : 0,
                      '&:hover': {
                        bgcolor: active ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.2} sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          flex: '0 0 auto',
                          fontWeight: 900,
                          bgcolor: active
                            ? 'rgba(255,255,255,0.22)'
                            : 'action.hover',
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </Box>
                      <Stack spacing={0.3} sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {lesson.name}
                          </Typography>
                          {pinned && <PushPinIcon sx={{ fontSize: 14 }} />}
                          {progress?.completedAt && (
                            <CheckCircleIcon sx={{ fontSize: 15 }} />
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ opacity: 0.78 }}>
                          Step {lesson.dashboardIndex}/{lesson.dashboardCount}
                          {progress?.score ? ` · Score ${progress.score}%` : ''}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Button>
                )
              })}
            </Stack>

            <Divider />

            <Button
              size="small"
              variant="outlined"
              onClick={onOpenAll}
              fullWidth
            >
              Open all dashboards
            </Button>
          </Stack>
        )}
      </Paper>

      <Box
        sx={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: { xs: 1, md: 1.5 },
          gap: 1.5,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            px: 2.25,
            py: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Chip
                  size="small"
                  color={currentProgress?.completedAt ? 'success' : 'primary'}
                  label={`Step ${currentLesson.dashboardIndex}/${currentLesson.dashboardCount}`}
                />
                {currentProgress?.completedAt && (
                  <Chip size="small" color="success" label="Completed" />
                )}
                {typeof currentProgress?.score === 'number' &&
                  currentProgress.answered > 0 && (
                    <Chip
                      size="small"
                      label={`Score ${currentProgress.score}%`}
                    />
                  )}
              </Stack>
              <Typography variant="h6" sx={{ mt: 0.75 }}>
                {currentLesson.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Embedded dashboard preview — use the sidebar to move through
                this Study Path without creating more workspace tabs.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                disabled={!canGoPrevious}
                onClick={() => selectLesson(selectedIndex - 1)}
              >
                Previous
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!canGoNext}
                onClick={() => selectLesson(selectedIndex + 1)}
              >
                Next lesson
              </Button>
              <Tooltip title="Open lesson in new workspace tab">
                <IconButton onClick={() => onOpenLesson(currentLesson)}>
                  <LaunchIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={isPinned ? 'Unpin lesson' : 'Pin lesson'}>
                <IconButton
                  onClick={togglePinnedLesson}
                  color={isPinned ? 'primary' : 'default'}
                >
                  {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minHeight: 0,
            p: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <DashboardLayoutView
            layout={studentLayout}
            readOnly
            updateLayout={(model) => updateCurrentLayout(model.toJson().layout)}
          />
        </Paper>
      </Box>
    </Box>
  )
}

export default StudyPathWorkspaceView

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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PushPinIcon from '@mui/icons-material/PushPin'
import DashboardLayoutView from '../Layout/Layout'
import {
  DashboardLayout,
  StudyPathContainerState,
  StudyPathDashboardItem,
} from '../../state/store'
import { getStudyPathDashboardProgress } from '../../studyPack/progress'

const STUDY_PATH_NAV_COLLAPSED_STORAGE_KEY =
  'aquamesh-study-path-navigator-collapsed-v1'
const NAVIGATOR_EXPANDED_WIDTH = 340
const NAVIGATOR_COLLAPSED_WIDTH = 72

interface StudyPathWorkspaceViewProps {
  studyPath: StudyPathContainerState
  onStudyPathChange: (studyPath: StudyPathContainerState) => void
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

  const canGoPrevious = selectedIndex > 0
  const canGoNext = selectedIndex < studyPath.dashboards.length - 1
  const completionPercent =
    studyPath.dashboards.length > 0
      ? Math.round((completedCount / studyPath.dashboards.length) * 100)
      : 0
  const navigatorWidth = navigatorCollapsed
    ? NAVIGATOR_COLLAPSED_WIDTH
    : NAVIGATOR_EXPANDED_WIDTH

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: 'stretch',
        width: '100%',
        maxWidth: '100%',
        '& > .study-path-navigator': {
          width: { xs: '100%', lg: navigatorWidth },
          flex: { xs: '0 0 auto', lg: `0 0 ${navigatorWidth}px` },
          maxWidth: { xs: '100%', lg: navigatorWidth },
          height: { xs: 'auto', lg: '100%' },
          maxHeight: { xs: 'none', lg: '100%' },
          minHeight: 0,
          boxSizing: 'border-box',
        },
        '& > .study-path-content': {
          width: { xs: '100%', lg: `calc(100% - ${navigatorWidth}px)` },
          flex: { xs: '1 1 auto', lg: '1 1 auto' },
          maxWidth: { xs: '100%', lg: `calc(100% - ${navigatorWidth}px)` },
          minHeight: 0,
        },
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        background:
          'linear-gradient(135deg, rgba(0,124,102,0.12), rgba(25,118,210,0.08))',
        border: 1,
        borderColor: 'primary.main',
        borderRadius: { xs: 0, md: 2 },
      }}
    >
      <Paper
        className="study-path-navigator"
        square
        elevation={0}
        sx={{
          borderRight: { lg: 1 },
          borderBottom: { xs: 1, lg: 0 },
          borderColor: 'divider',
          background:
            'linear-gradient(180deg, rgba(0,124,102,0.18), rgba(0,16,38,0.02)), var(--background-paper)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
                sx={{
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
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
            <Stack spacing={1} alignItems="center">
              <Tooltip title="Previous lesson">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Previous lesson"
                    disabled={!canGoPrevious}
                    onClick={() => selectLesson(selectedIndex - 1)}
                    sx={{
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Next lesson">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Next lesson"
                    disabled={!canGoNext}
                    onClick={() => selectLesson(selectedIndex + 1)}
                    sx={{
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        ) : (
          <Stack
            spacing={2.25}
            sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
          >
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
                        bgcolor: 'background.paper',
                        color: 'primary.main',
                        border: 1,
                        borderColor: 'divider',
                        boxShadow: 1,
                        '&:hover': {
                          bgcolor: 'action.hover',
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

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
              <Stack spacing={1.1}>
                {studyPath.dashboards.map((lesson, index) => {
                  const progress = progressByKey[lesson.dashboardKey]
                  const active = index === selectedIndex
                  const pinned = pinnedDashboardKeys.includes(
                    lesson.dashboardKey,
                  )

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
                      <Stack
                        direction="row"
                        spacing={1.2}
                        sx={{ width: '100%' }}
                      >
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
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
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
                            {progress?.score
                              ? ` · Score ${progress.score}%`
                              : ''}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Button>
                  )
                })}
              </Stack>
            </Box>

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
        className="study-path-content"
        sx={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          p: { xs: 1, md: 1.5 },
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <DashboardLayoutView
            key={`${currentLesson.dashboardKey}-${navigatorWidth}`}
            layout={studentLayout}
            readOnly
            updateLayout={(model) => updateCurrentLayout(model.toJson().layout)}
          />
        </Box>
      </Box>
    </Box>
  )
}

export default StudyPathWorkspaceView

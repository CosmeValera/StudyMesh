import React, { useMemo } from 'react'
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
import LaunchIcon from '@mui/icons-material/Launch'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import DashboardLayoutView from '../Layout/Layout'
import {
  DashboardLayout,
  StudyPathContainerState,
  StudyPathDashboardItem,
} from '../../state/store'
import { getStudyPathDashboardProgress } from '../../studyPack/progress'

interface StudyPathWorkspaceViewProps {
  studyPath: StudyPathContainerState
  onStudyPathChange: (studyPath: StudyPathContainerState) => void
  onOpenLesson: (dashboard: StudyPathDashboardItem) => void
  onOpenAll: () => void
}

const formatLessonLabel = (index: number, name: string) =>
  `${String(index + 1).padStart(2, '0')} ${name}`

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

const StudyPathWorkspaceView: React.FC<StudyPathWorkspaceViewProps> = ({
  studyPath,
  onStudyPathChange,
  onOpenLesson,
  onOpenAll,
}) => {
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
        ? pinnedDashboardKeys.filter((key) => key !== currentLesson.dashboardKey)
        : [...pinnedDashboardKeys, currentLesson.dashboardKey],
    })
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
        gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
        minHeight: 'calc(100dvh - 112px)',
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        square
        elevation={0}
        sx={{
          borderRight: { md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
          p: 2,
          backgroundColor: 'background.paper',
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="primary.main">
              Study Path
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {studyPath.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              One workspace tab · {studyPath.dashboards.length} lessons
            </Typography>
          </Box>

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

          <Stack spacing={1}>
            {studyPath.dashboards.map((lesson, index) => {
              const progress = progressByKey[lesson.dashboardKey]
              const active = index === selectedIndex
              const pinned = pinnedDashboardKeys.includes(lesson.dashboardKey)

              return (
                <Button
                  key={lesson.dashboardKey}
                  onClick={() => selectLesson(index)}
                  variant={active ? 'contained' : 'outlined'}
                  color={active ? 'primary' : 'inherit'}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    borderRadius: 2,
                    py: 1,
                  }}
                >
                  <Stack spacing={0.3} sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {formatLessonLabel(index, lesson.name)}
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
                </Button>
              )
            })}
          </Stack>

          <Divider />

          <Button size="small" variant="outlined" onClick={onOpenAll}>
            Open all dashboards
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Paper
          square
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
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
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                    <Chip size="small" label={`Score ${currentProgress.score}%`} />
                  )}
              </Stack>
              <Typography variant="h6" sx={{ mt: 0.75 }}>
                {currentLesson.name}
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
                <IconButton onClick={togglePinnedLesson} color={isPinned ? 'primary' : 'default'}>
                  {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <DashboardLayoutView
            layout={currentLesson.layout}
            updateLayout={(model) => updateCurrentLayout(model.toJson().layout)}
          />
        </Box>
      </Box>
    </Box>
  )
}

export default StudyPathWorkspaceView

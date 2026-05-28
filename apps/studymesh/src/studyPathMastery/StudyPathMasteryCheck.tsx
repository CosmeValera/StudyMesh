import React, { useState, useCallback, useMemo } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import LockIcon from '@mui/icons-material/Lock'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import RateReviewIcon from '@mui/icons-material/RateReview'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import ListAltIcon from '@mui/icons-material/ListAlt'
import InfoIcon from '@mui/icons-material/Info'
import {
  evaluateTeachBackLocally,
  generateSelfCheckQuestions,
  getNextRecommendedStep,
  getOverallMasteryPercent,
  getReviewQueue,
  isSectionUnlocked,
  MASTERYPASSINGSCORE,
  scoreToStatus,
  StudyPathSectionMasteryStatus,
} from './types'
import { useStudyPathMasteryStore } from './progressStore'

interface DashboardItem {
  dashboardKey: string
  name: string
  dashboardIndex: number
}

interface StudyPathMasteryCheckProps {
  pathId: string
  title: string
  dashboards: DashboardItem[]
  activeDashboardKey?: string
  onDashboardSelect: (dashboardKey: string) => void
}

const STATUSCOLORS: Record<StudyPathSectionMasteryStatus, string> = {
  notStarted: 'default',
  inProgress: 'primary',
  needsReview: 'warning',
  mastered: 'success',
  locked: 'secondary',
}

const STATUSLABELS: Record<StudyPathSectionMasteryStatus, string> = {
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  needsReview: 'Needs review',
  mastered: 'Mastered',
  locked: 'Locked',
}

const StudyPathMasteryCheck: React.FC<StudyPathMasteryCheckProps> = ({
  pathId,
  title,
  dashboards,
  activeDashboardKey,
  onDashboardSelect,
}) => {
  const [expanded, setExpanded] = useState(true)
  const [showQuiz, setShowQuiz] = useState(false)
  const [showTeachBack, setShowTeachBack] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [teachBackText, setTeachBackText] = useState('')
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [teachBackSubmitted, setTeachBackSubmitted] = useState(false)
  const [teachBackFeedback, setTeachBackFeedback] = useState('')

  const {
    getProgress,
    initProgress,
    updateSectionStatus,
    recordQuizScore,
    recordTeachBack,
    setActiveSection,
    setGuidedMode,
  } = useStudyPathMasteryStore()

  const progress = useMemo(() => {
    if (!getProgress(pathId)) {
      initProgress(
        pathId,
        dashboards.map((d) => d.dashboardKey),
      )
    }
    return getProgress(pathId)
  }, [pathId, dashboards, getProgress, initProgress])

  const activeDashboard = dashboards.find((d) => d.dashboardKey === activeDashboardKey)
  const activeProgress = activeDashboardKey && progress
    ? progress.sections[activeDashboardKey]
    : undefined

  const masteryStatusMap = useMemo(() => {
    const map: Record<string, StudyPathSectionMasteryStatus> = {}
    dashboards.forEach((d) => {
      const sectionProgress = progress?.sections[d.dashboardKey]
      map[d.dashboardKey] = sectionProgress?.status ?? 'locked'
    })
    return map
  }, [dashboards, progress])

  const masteryPercent = useMemo(
    () => getOverallMasteryPercent(dashboards, masteryStatusMap),
    [dashboards, masteryStatusMap],
  )

  const reviewQueue = useMemo(
    () => getReviewQueue(dashboards, masteryStatusMap),
    [dashboards, masteryStatusMap],
  )

  const nextStep = useMemo(
    () => getNextRecommendedStep(dashboards, masteryStatusMap),
    [dashboards, masteryStatusMap],
  )

  const quizQuestions = useMemo(() => {
    if (!activeDashboard) {
      return []
    }
    return generateSelfCheckQuestions(activeDashboard.name, activeDashboard.dashboardKey)
  }, [activeDashboard])

  const handleDashboardClick = useCallback(
    (dashboardKey: string) => {
      const status = masteryStatusMap[dashboardKey]

      if (status === 'locked' && progress?.guidedMode) {
        return
      }

      setActiveSection(pathId, dashboardKey)
      onDashboardSelect(dashboardKey)
      setShowQuiz(false)
      setShowTeachBack(false)
      setQuizSubmitted(false)
      setTeachBackSubmitted(false)
      setQuizAnswers({})
      setTeachBackText('')
      setTeachBackFeedback('')
    },
    [masteryStatusMap, progress, pathId, setActiveSection, onDashboardSelect],
  )

  const handleStartSection = useCallback(() => {
    if (activeDashboardKey) {
      updateSectionStatus(pathId, activeDashboardKey, 'inProgress')
    }
  }, [pathId, activeDashboardKey, updateSectionStatus])

  const handleMarkMastered = useCallback(() => {
    if (activeDashboardKey) {
      updateSectionStatus(pathId, activeDashboardKey, 'mastered')
    }
  }, [pathId, activeDashboardKey, updateSectionStatus])

  const handleMarkNeedsReview = useCallback(() => {
    if (activeDashboardKey) {
      updateSectionStatus(pathId, activeDashboardKey, 'needsReview')
    }
  }, [pathId, activeDashboardKey, updateSectionStatus])

  const handleQuizSubmit = useCallback(() => {
    if (!quizQuestions.length || !activeDashboardKey) {
      return
    }

    let correct = 0
    quizQuestions.forEach((q) => {
      const answer = quizAnswers[q.id]
      if (answer !== undefined && answer === q.correctIndex) {
        correct++
      }
    })

    const score = Math.round((correct / quizQuestions.length) * 100)
    const newStatus = scoreToStatus(score)

    recordQuizScore(pathId, activeDashboardKey, score)
    updateSectionStatus(pathId, activeDashboardKey, newStatus)
    setQuizSubmitted(true)
  }, [quizQuestions, quizAnswers, activeDashboardKey, pathId, recordQuizScore, updateSectionStatus])

  const handleTeachBackSubmit = useCallback(() => {
    if (!teachBackText.trim() || !activeDashboardKey || !activeDashboard) {
      return
    }

    const feedback = evaluateTeachBackLocally(teachBackText, activeDashboard.name)
    setTeachBackFeedback(feedback)
    recordTeachBack(pathId, activeDashboardKey, feedback)
    setTeachBackSubmitted(true)

    if (feedback.startsWith('Amazing')) {
      updateSectionStatus(pathId, activeDashboardKey, 'mastered')
    }
  }, [teachBackText, activeDashboardKey, activeDashboard, pathId, recordTeachBack, updateSectionStatus])

  const handleUnlockSection = useCallback(
    (dashboardKey: string) => {
      updateSectionStatus(pathId, dashboardKey, 'notStarted')
    },
    [pathId, updateSectionStatus],
  )

  const handleGuidedModeToggle = useCallback(
    (enabled: boolean) => {
      setGuidedMode(pathId, enabled)
    },
    [pathId, setGuidedMode],
  )

  const allAnswered = quizQuestions.length > 0 && Object.keys(quizAnswers).length >= quizQuestions.length

  if (!progress) {
    return null
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Mastery check
          </Typography>
          <Chip
            label={`${masteryPercent}%`}
            size="small"
            color={masteryPercent === 100 ? 'success' : 'primary'}
            sx={{ height: 20, fontWeight: 700 }}
          />
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <LinearProgress
        variant="determinate"
        value={masteryPercent}
        sx={{
          height: 3,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: masteryPercent === 100 ? 'success.main' : 'primary.main',
          },
        }}
      />

      <Collapse in={expanded}>
        <Box sx={{ p: 1.5 }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" fontWeight={600}>
                Guided mode
              </Typography>
              <Switch
                size="small"
                checked={progress.guidedMode}
                onClick={(e) => {
                  e.stopPropagation()
                  handleGuidedModeToggle(e.target.checked)
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {progress.guidedMode ? 'On' : 'Off'}
              </Typography>
            </Box>
          </Box>

          {nextStep && (
            <Alert
              severity="info"
              icon={<NavigateNextIcon />}
              sx={{ mb: 1.5, py: 0.5 }}
            >
              <Typography variant="caption" fontWeight={600}>Next recommended step:</Typography>
              <Typography variant="caption">{nextStep}</Typography>
            </Alert>
          )}

          {reviewQueue.length > 0 && (
            <Box
              sx={{
                mb: 1.5,
                p: 1,
                borderRadius: 1,
                bgcolor: 'warning.light',
                border: 1,
                borderColor: 'warning.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <ListAltIcon sx={{ fontSize: 14, color: 'warning.dark' }} />
                <Typography variant="caption" fontWeight={700} color="warning.dark">
                  Review queue ({reviewQueue.length})
                </Typography>
              </Box>
              <Stack spacing={0.25}>
                {reviewQueue.map((dashboard) => (
                  <Button
                    key={dashboard.dashboardKey}
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => handleDashboardClick(dashboard.dashboardKey)}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      borderRadius: 1,
                      py: 0.25,
                      px: 1,
                    }}
                  >
                    Review "{dashboard.name}"
                  </Button>
                ))}
              </Stack>
            </Box>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: 'block', fontWeight: 600 }}
          >
            Sections
          </Typography>

          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {dashboards.map((dashboard, index) => {
              const status = masteryStatusMap[dashboard.dashboardKey]
              const unlocked = isSectionUnlocked(index, dashboards.length, progress.guidedMode, status)
              const isActive = dashboard.dashboardKey === activeDashboardKey

              return (
                <Box
                  key={dashboard.dashboardKey}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.75,
                    borderRadius: 1,
                    bgcolor: isActive ? 'action.selected' : 'transparent',
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    opacity: unlocked ? 1 : 0.6,
                    border: isActive ? 1 : 0,
                    borderColor: 'primary.main',
                    '&:hover': unlocked ? { bgcolor: 'action.hover' } : undefined,
                  }}
                  onClick={() => handleDashboardClick(dashboard.dashboardKey)}
                >
                  {!unlocked && <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
                  {status === 'mastered' && (
                    <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      fontWeight: isActive ? 700 : 400,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {index + 1}. {dashboard.name}
                  </Typography>
                  <Chip
                    label={STATUSLABELS[status]}
                    size="small"
                    color={STATUSCOLORS[status] as any}
                    sx={{ height: 18, fontSize: '0.625rem' }}
                  />
                </Box>
              )
            })}
          </Stack>

          {activeDashboard && activeProgress && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: 'grey.50',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {activeDashboard.name}
                </Typography>
                {!isSectionUnlocked(
                  activeDashboard.dashboardIndex - 1,
                  dashboards.length,
                  progress.guidedMode,
                  masteryStatusMap[activeDashboard.dashboardKey],
                ) && (
                  <Button
                    size="small"
                    variant="text"
                    color="primary"
                    onClick={() => handleUnlockSection(activeDashboard.dashboardKey)}
                    sx={{ ml: 'auto', py: 0.25 }}
                  >
                    Unlock section
                  </Button>
                )}
              </Box>

              <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip
                  label={STATUSLABELS[activeProgress.status]}
                  size="small"
                  color={STATUSCOLORS[activeProgress.status] as any}
                />
                {activeProgress.quizAttempts > 0 && (
                  <Chip
                    label={`Best: ${activeProgress.bestScore ?? 0}%`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {activeProgress.lastScore !== undefined && (
                  <Chip
                    label={`Last: ${activeProgress.lastScore}%`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {activeProgress.lastReviewedAt && (
                  <Chip
                    label={`Reviewed ${new Date(activeProgress.lastReviewedAt).toLocaleDateString()}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>

              <Divider sx={{ my: 1 }} />

              {activeProgress.status === 'locked' ? (
                <Typography variant="caption" color="text.secondary">
                  <LockIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.25 }} />
                  Complete the previous section to unlock.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {activeProgress.status === 'notStarted' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleStartSection}
                      sx={{ borderRadius: 1.5 }}
                    >
                      Start section
                    </Button>
                  )}

                  {activeProgress.status === 'inProgress' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={handleStartSection}
                      sx={{ borderRadius: 1.5 }}
                    >
                      Continue studying
                    </Button>
                  )}

                  {(activeProgress.status === 'inProgress' ||
                    activeProgress.status === 'needsReview' ||
                    activeProgress.status === 'notStarted') && (
                    <Button
                      size="small"
                      variant={showQuiz ? 'contained' : 'outlined'}
                      startIcon={<RateReviewIcon />}
                      onClick={() => {
                        setShowQuiz(!showQuiz)
                        setShowTeachBack(false)
                      }}
                      sx={{ borderRadius: 1.5 }}
                    >
                      {quizQuestions.length > 0
                        ? `Mastery check (${quizQuestions.length})`
                        : 'Mastery check'}
                    </Button>
                  )}

                  {activeProgress.status !== 'mastered' && (
                    <Button
                      size="small"
                      variant={showTeachBack ? 'contained' : 'outlined'}
                      startIcon={<RefreshIcon />}
                      onClick={() => {
                        setShowTeachBack(!showTeachBack)
                        setShowQuiz(false)
                      }}
                      sx={{ borderRadius: 1.5 }}
                    >
                      Teach it back
                    </Button>
                  )}

                  {(activeProgress.status === 'mastered' ||
                    activeProgress.status === 'needsReview' ||
                    activeProgress.status === 'inProgress') && (
                    <Stack direction="row" spacing={0.5}>
                      {activeProgress.status !== 'mastered' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={handleMarkMastered}
                          sx={{ borderRadius: 1.5 }}
                        >
                          Mark as mastered
                        </Button>
                      )}
                      {activeProgress.status === 'inProgress' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={handleMarkNeedsReview}
                          sx={{ borderRadius: 1.5 }}
                        >
                          Needs review
                        </Button>
                      )}
                    </Stack>
                  )}
                </Stack>
              )}

              {showQuiz && quizQuestions.length > 0 && !quizSubmitted && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <InfoIcon sx={{ fontSize: 14, color: 'info.main' }} />
                    <Typography variant="caption" color="info.main" fontWeight={600}>
                      Mastery check — no AI required
                    </Typography>
                  </Box>
                  {quizQuestions.map((q, qIndex) => (
                    <Box key={q.id} sx={{ mb: 1.5 }}>
                      <Typography variant="body2" sx={{ mb: 0.75 }}>
                        {qIndex + 1}. {q.question}
                      </Typography>
                      {q.options && (
                        <Stack spacing={0.25}>
                          {q.options.map((option, oIndex) => (
                            <Box
                              key={oIndex}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                p: 0.75,
                                borderRadius: 1,
                                border: 1,
                                borderColor:
                                  quizAnswers[q.id] === oIndex ? 'primary.main' : 'divider',
                                bgcolor:
                                  quizAnswers[q.id] === oIndex ? 'action.selected' : 'background.paper',
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                              onClick={() =>
                                setQuizAnswers((prev) => ({ ...prev, [q.id]: oIndex }))
                              }
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  color: quizAnswers[q.id] === oIndex ? 'primary.main' : 'text.secondary',
                                }}
                              >
                                {String.fromCharCode(65 + oIndex)}.
                              </Typography>
                              <Typography variant="caption">{option}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleQuizSubmit}
                    disabled={!allAnswered}
                    sx={{ borderRadius: 1.5, mt: 1 }}
                  >
                    Submit mastery check
                  </Button>
                </Box>
              )}

              {quizSubmitted && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Alert
                    severity={(activeProgress.lastScore ?? 0) >= MASTERYPASSINGSCORE ? 'success' : 'warning'}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      Your score: {activeProgress.lastScore}%
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>
                      {(activeProgress.lastScore ?? 0) >= MASTERYPASSINGSCORE
                        ? '🎉 Great job! This section is mastered!'
                        : '💪 Keep going! Try again with a simpler explanation to master this section.'}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>
                      Best: {activeProgress.bestScore}%
                    </Typography>
                  </Alert>
                </Box>
              )}

              {showTeachBack && !teachBackSubmitted && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>
                    Teach it back
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Explaining something is the best way to know if you really understand it. Try it!
                  </Typography>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    size="small"
                    placeholder="Type your explanation here. Try to use your own words and include the main concepts..."
                    value={teachBackText}
                    onChange={(e) => setTeachBackText(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleTeachBackSubmit}
                    disabled={!teachBackText.trim()}
                    sx={{ borderRadius: 1.5 }}
                  >
                    Submit explanation
                  </Button>
                </Box>
              )}

              {teachBackSubmitted && teachBackFeedback && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Alert
                    severity={teachBackFeedback.startsWith('Amazing') ? 'success' : 'info'}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      Feedback:
                    </Typography>
                    <Typography variant="caption" display="block">
                      {teachBackFeedback}
                    </Typography>
                    {teachBackFeedback.startsWith('Amazing') && (
                      <Typography variant="caption" color="success.dark" display="block" sx={{ mt: 0.25 }}>
                        Section marked as mastered!
                      </Typography>
                    )}
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}

export default StudyPathMasteryCheck
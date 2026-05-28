import React, { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Button,
  TextField,
  Collapse,
  IconButton,
  Stack,
  LinearProgress,
  Paper,
  Divider,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import LockIcon from '@mui/icons-material/Lock'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import RateReviewIcon from '@mui/icons-material/RateReview'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import type {
  StudyPathSection,
  StudyPathProgress,
  StudyPathSectionProgress,
  StudyPathSectionMasteryStatus,
  QuizQuestion,
} from './types'
import {
  isSectionUnlocked,
  getOverallMasteryPercent,
  MASTERYPASSINGSCORE,
} from './types'

interface StudyPathMasteryCheckProps {
  studyPathId: string
  title: string
  sections: StudyPathSection[]
  progress: StudyPathProgress
  onSectionSelect: (sectionId: string) => void
  onStatusChange: (
    studyPathId: string,
    sectionId: string,
    status: StudyPathSectionMasteryStatus,
  ) => void
  onQuizSubmit: (
    studyPathId: string,
    sectionId: string,
    score: number,
  ) => void
  onTeachBackSubmit: (
    studyPathId: string,
    sectionId: string,
    feedback: string,
  ) => void
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
  needsReview: 'Needs Review',
  mastered: 'Mastered',
  locked: 'Locked',
}

const StudyPathMasteryCheck: React.FC<StudyPathMasteryCheckProps> = ({
  studyPathId,
  title,
  sections,
  progress,
  onSectionSelect,
  onStatusChange,
  onQuizSubmit,
  onTeachBackSubmit,
}) => {
  const [expanded, setExpanded] = useState(true)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    progress.activeSectionId ?? sections[0]?.id ?? null,
  )
  const [showQuiz, setShowQuiz] = useState(false)
  const [showTeachBack, setShowTeachBack] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | string>>({})
  const [teachBackText, setTeachBackText] = useState('')
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [teachBackSubmitted, setTeachBackSubmitted] = useState(false)

  const activeSection = sections.find(s => s.id === activeSectionId)
  const activeProgress = activeSectionId
    ? progress.sections[activeSectionId]
    : undefined
  const masteryPercent = getOverallMasteryPercent(sections, progress)

  const handleSectionClick = (section: StudyPathSection) => {
    const unlocked = isSectionUnlocked(section.id, sections, progress)
    if (!unlocked) {
      return
    }
    setActiveSectionId(section.id)
    setShowQuiz(false)
    setShowTeachBack(false)
    setQuizSubmitted(false)
    setTeachBackSubmitted(false)
    onSectionSelect(section.id)
  }

  const handleStartSection = () => {
    if (activeSectionId) {
      onStatusChange(studyPathId, activeSectionId, 'inProgress')
    }
  }

  const handleMarkMastered = () => {
    if (activeSectionId) {
      onStatusChange(studyPathId, activeSectionId, 'mastered')
    }
  }

  const handleMarkNeedsReview = () => {
    if (activeSectionId) {
      onStatusChange(studyPathId, activeSectionId, 'needsReview')
    }
  }

  const handleQuizSubmit = () => {
    if (!activeSection?.quizQuestions || !activeSectionId) {
      return
    }

    let correct = 0
    activeSection.quizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correctAnswer) {
        correct++
      }
    })

    const score = Math.round(
      (correct / activeSection.quizQuestions.length) * 100,
    )
    onQuizSubmit(studyPathId, activeSectionId, score)
    setQuizSubmitted(true)

    if (score >= MASTERYPASSINGSCORE) {
      onStatusChange(studyPathId, activeSectionId, 'mastered')
    } else {
      onStatusChange(studyPathId, activeSectionId, 'needsReview')
    }
  }

  const handleTeachBackSubmit = () => {
    if (!teachBackText.trim() || !activeSectionId) {
      return
    }
    const feedback = `Your explanation: "${teachBackText.slice(0, 50)}..." - AI feedback pending. Keep explaining in your own words!`
    onTeachBackSubmit(studyPathId, activeSectionId, feedback)
    setTeachBackSubmitted(true)
    onStatusChange(studyPathId, activeSectionId, 'mastered')
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
            Study Path Progress
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: 'block' }}
          >
            {title}
          </Typography>

          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {sections.map((section, index) => {
              const sectionProgress = progress.sections[section.id]
              const status = sectionProgress?.status ?? 'locked'
              const unlocked = isSectionUnlocked(section.id, sections, progress)
              const isActive = section.id === activeSectionId

              return (
                <Box
                  key={section.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.75,
                    borderRadius: 1,
                    bgcolor: isActive ? 'action.selected' : 'transparent',
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    opacity: unlocked ? 1 : 0.5,
                    border: isActive ? 1 : 0,
                    borderColor: 'primary.main',
                    '&:hover': unlocked
                      ? { bgcolor: 'action.hover' }
                      : undefined,
                  }}
                  onClick={() => handleSectionClick(section)}
                >
                  {!unlocked && (
                    <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  )}
                  {status === 'mastered' && (
                    <CheckCircleIcon
                      sx={{ fontSize: 14, color: 'success.main' }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      fontWeight: isActive ? 700 : 400,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {index + 1}. {section.title}
                  </Typography>
                  <Chip
                    label={STATUSLABELS[status]}
                    size="small"
                    color={STATUSCOLORS[status]}
                    sx={{ height: 18, fontSize: '0.625rem' }}
                  />
                </Box>
              )
            })}
          </Stack>

          {activeSection && activeProgress && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: 'grey.50',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                {activeSection.title}
              </Typography>

              <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip
                  label={STATUSLABELS[activeProgress.status]}
                  size="small"
                  color={STATUSCOLORS[activeProgress.status]}
                />
                {activeProgress.quizAttempts > 0 && (
                  <Chip
                    label={`Quiz: ${activeProgress.bestScore}% best`}
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
                  Complete the previous section to unlock.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {activeProgress.status !== 'mastered' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleStartSection}
                      disabled={activeProgress.status === 'inProgress'}
                      sx={{ borderRadius: 1.5 }}
                    >
                      {activeProgress.status === 'inProgress'
                        ? 'In Progress'
                        : 'Start Studying'}
                    </Button>
                  )}

                  {activeSection.quizQuestions &&
                    activeSection.quizQuestions.length > 0 && (
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
                        Quick Check ({activeSection.quizQuestions.length} questions)
                      </Button>
                    )}

                  {!teachBackSubmitted && (
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
                      Teach it Back
                    </Button>
                  )}

                  {(activeProgress.status === 'mastered' ||
                    activeProgress.status === 'needsReview') && (
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
                          Mark Mastered
                        </Button>
                      )}
                      {activeProgress.status === 'inProgress' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<RefreshIcon />}
                          onClick={handleMarkNeedsReview}
                          sx={{ borderRadius: 1.5 }}
                        >
                          Needs Review
                        </Button>
                      )}
                    </Stack>
                  )}
                </Stack>
              )}

              {showQuiz && activeSection.quizQuestions && !quizSubmitted && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
                    Quick Check
                  </Typography>
                  {activeSection.quizQuestions.map((q, qIndex) => (
                    <Box key={q.id} sx={{ mb: 1.5 }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
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
                                p: 0.5,
                                borderRadius: 1,
                                border: 1,
                                borderColor:
                                  quizAnswers[q.id] === oIndex
                                    ? 'primary.main'
                                    : 'divider',
                                bgcolor:
                                  quizAnswers[q.id] === oIndex
                                    ? 'action.selected'
                                    : 'transparent',
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                              onClick={() =>
                                setQuizAnswers(prev => ({
                                  ...prev,
                                  [q.id]: oIndex,
                                }))
                              }
                            >
                              <Typography variant="caption">
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
                    disabled={Object.keys(quizAnswers).length !== activeSection.quizQuestions?.length}
                    sx={{ borderRadius: 1.5, mt: 1 }}
                  >
                    Submit Answers
                  </Button>
                </Box>
              )}

              {quizSubmitted && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="success.main" fontWeight={700}>
                    Quiz submitted! Score: {activeProgress.lastScore}%
                    {activeProgress.lastScore !== undefined &&
                      activeProgress.lastScore >= MASTERYPASSINGSCORE
                        ? ' - Section Mastered!'
                        : ' - Review and try again'}
                  </Typography>
                </Box>
              )}

              {showTeachBack && !teachBackSubmitted && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>
                    Explain in your own words
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Teaching a concept is the best way to verify understanding.
                  </Typography>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    size="small"
                    placeholder="Type your explanation here..."
                    value={teachBackText}
                    onChange={e => setTeachBackText(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleTeachBackSubmit}
                    disabled={!teachBackText.trim()}
                    sx={{ borderRadius: 1.5 }}
                  >
                    Submit Explanation
                  </Button>
                </Box>
              )}

              {teachBackSubmitted && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="success.main" fontWeight={700}>
                    Explanation submitted! Section marked as mastered.
                  </Typography>
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
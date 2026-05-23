import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SendIcon from '@mui/icons-material/Send'
import { StateDashboard } from '../../state/store'
import {
  buildDashboardChatContext,
  formatDashboardChatContext,
  selectDashboardChatChunks,
} from '../../dashboardChat/contextBuilder'
import { askDashboardSources } from '../../dashboardChat/askDashboard'
import { readStudyPackAiSettings } from '../../studyPack/ai'
import { renderMarkdown } from '../WidgetEditor/components/preview/StudyBlockView'

export interface DashboardChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  sources?: string[]
  pending?: boolean
}

interface DashboardChatPanelProps {
  dashboard?: StateDashboard
  messages: DashboardChatMessage[]
  onMessagesChange: (messages: DashboardChatMessage[]) => void
  onClose: () => void
}

const suggestions = [
  'Summarize the key ideas',
  'Explain this like I’m new',
  'Generate exam-style questions',
  'What should I review first?',
]

const makeMessageId = () =>
  `dashboard-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`

const DashboardChatPanel = ({
  dashboard,
  messages,
  onMessagesChange,
  onClose,
}: DashboardChatPanelProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const messagesRef = useRef(messages)
  const queueRef = useRef(Promise.resolve())
  const settings = readStudyPackAiSettings()
  const isLocalAi = settings.provider === 'local'
  const context = useMemo(
    () =>
      buildDashboardChatContext(
        dashboard,
        isLocalAi
          ? { sourceNotesOnly: true, studyPathScope: 'selected' }
          : undefined,
      ),
    [dashboard, isLocalAi],
  )
  const hasContext = context.chunks.length > 0

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (!activeStartedAt) {
      setElapsedSeconds(0)
      return undefined
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - activeStartedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeStartedAt])

  const updateMessage = (
    messageId: string,
    updater: (message: DashboardChatMessage) => DashboardChatMessage,
  ) => {
    const updated = messagesRef.current.map((message) =>
      message.id === messageId ? updater(message) : message,
    )
    messagesRef.current = updated
    onMessagesChange(updated)
  }

  const answerQuestion = async (
    question: string,
    pendingMessageId: string,
    historyMessages: DashboardChatMessage[],
  ) => {
    setActiveStartedAt(Date.now())

    if (!hasContext) {
      updateMessage(pendingMessageId, (message) => ({
        ...message,
        content:
          'This dashboard does not have enough source content to answer from yet. Add source notes or generated study material, then ask again.',
        pending: false,
      }))
      setActiveStartedAt(null)
      return
    }

    const sourceChunks = selectDashboardChatChunks(context, question)

    try {
      const result = await askDashboardSources({
        dashboardTitle: context.dashboardTitle,
        contextText: formatDashboardChatContext(context, sourceChunks),
        question,
        history: historyMessages.map(({ role, content }) => ({
          role,
          content,
        })),
        sourceChunks,
      })
      updateMessage(pendingMessageId, (message) => ({
        ...message,
        content: result.answer,
        sources: result.sources,
        pending: false,
      }))
    } catch (err) {
      updateMessage(pendingMessageId, (message) => ({
        ...message,
        content: 'I could not answer from this dashboard yet.',
        pending: false,
      }))
      setError(
        err instanceof Error
          ? err.message
          : 'Could not answer from this dashboard.',
      )
    } finally {
      setActiveStartedAt(null)
    }
  }

  const sendQuestion = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) {
      return
    }

    const userMessage: DashboardChatMessage = {
      id: makeMessageId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    }
    const pendingMessage: DashboardChatMessage = {
      id: makeMessageId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      pending: true,
    }
    const previousMessages = messagesRef.current
    const nextMessages = [...previousMessages, userMessage, pendingMessage]
    messagesRef.current = nextMessages
    onMessagesChange(nextMessages)
    setDraft('')
    setError('')

    queueRef.current = queueRef.current.then(() =>
      answerQuestion(trimmed, pendingMessage.id, previousMessages),
    )
  }

  const formatSeconds = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0
      ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      : `${remainingSeconds}s`
  }

  return (
    <Box
      sx={{
        height: isMobile ? '100dvh' : '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          minHeight: 58,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={900} noWrap>
            Ask this dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Based on sources and study material here
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {messages.length > 0 && (
            <Tooltip title="Clear chat">
              <IconButton
                size="small"
                onClick={() => onMessagesChange([])}
                aria-label="Clear dashboard chat"
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Close">
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close Ask Sources"
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
        {!hasContext ? (
          <Alert severity="info">
            This dashboard does not have enough source content to chat with yet.
          </Alert>
        ) : messages.length === 0 ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Ask this dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ask questions based on the sources and study material in this
                dashboard.
              </Typography>
            </Box>
            <Stack spacing={1}>
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outlined"
                  size="small"
                  onClick={() => sendQuestion(suggestion)}
                  sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                >
                  {suggestion}
                </Button>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  alignSelf:
                    message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor:
                      message.role === 'user'
                        ? 'primary.main'
                        : 'background.default',
                    color:
                      message.role === 'user'
                        ? 'primary.contrastText'
                        : 'text.primary',
                    border: message.role === 'assistant' ? 1 : 0,
                    borderColor: 'divider',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.pending ? (
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {[0, 1, 2].map((dot) => (
                          <Box
                            key={dot}
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: 'text.secondary',
                              animation:
                                'studymesh-chat-dot 1s infinite ease-in-out',
                              animationDelay: `${dot * 140}ms`,
                              '@keyframes studymesh-chat-dot': {
                                '0%, 80%, 100%': {
                                  opacity: 0.35,
                                  transform: 'translateY(0)',
                                },
                                '40%': {
                                  opacity: 1,
                                  transform: 'translateY(-3px)',
                                },
                              },
                            }}
                          />
                        ))}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {activeStartedAt &&
                        messages.findIndex(({ id }) => id === message.id) ===
                          messages.findIndex(
                            ({ role, pending }) =>
                              role === 'assistant' && pending,
                          )
                          ? isLocalAi
                            ? `Local AI is replying… ${formatSeconds(
                                elapsedSeconds,
                              )} elapsed. Estimate: about 1:30.`
                            : `Replying… ${formatSeconds(
                                elapsedSeconds,
                              )} elapsed.`
                          : 'Queued — I’ll answer this after the previous question.'}
                      </Typography>
                    </Stack>
                  ) : message.role === 'assistant' ? (
                    <Box
                      sx={{
                        '& p': { m: 0, mb: 1 },
                        '& p:last-child': { mb: 0 },
                        '& ul, & ol': { pl: 2.5, my: 0.75 },
                        '& pre': { maxWidth: '100%' },
                      }}
                    >
                      {renderMarkdown(message.content)}
                    </Box>
                  ) : (
                    <Typography variant="body2">{message.content}</Typography>
                  )}
                </Box>
                {message.sources?.length ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    sx={{ mt: 0.75 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mr: 0.5 }}
                    >
                      Based on:
                    </Typography>
                    {message.sources.map((source) => (
                      <Chip
                        key={source}
                        label={source}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </Stack>
                ) : null}
              </Box>
            ))}
          </Stack>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about this dashboard…"
            fullWidth
            multiline
            maxRows={4}
            size="small"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                sendQuestion(draft)
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={() => sendQuestion(draft)}
            disabled={!draft.trim()}
            aria-label="Send dashboard question"
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  )
}

export default DashboardChatPanel

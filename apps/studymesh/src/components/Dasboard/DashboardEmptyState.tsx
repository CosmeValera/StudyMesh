import React, { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import TuneIcon from '@mui/icons-material/Tune'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import RouteIcon from '@mui/icons-material/Route'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import { createStudyPathContainerState } from './studyPathContainer'
import { normalizeFolderColor } from './folderColors'
import { DashboardStorage, SavedDashboard } from './dashboardStorage'

type EmptyDashboardQuickCreate = 'quiz' | 'flashcards' | 'improvedNotes'
type EmptyDashboardBlock = 'creation' | 'studyMaterial'
type EmptyDashboardStudyMaterialMode = 'recent' | 'custom'

interface EmptyDashboardSettings {
  blockOrder: EmptyDashboardBlock[]
  showCreationBlock: boolean
  studyMaterialMode: EmptyDashboardStudyMaterialMode
  studyMaterialLimit: number
  studyMaterialColumns: number
  customEntryIds: string[]
}

interface StudyMaterialEntry {
  id: string
  folderName: string
  dashboards: SavedDashboard[]
  firstDashboard?: SavedDashboard
  title: string
  isStudyPath: boolean
  colorSourceFolder: string
}

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

const EMPTY_DASHBOARD_SETTINGS_KEY = 'studymesh-empty-dashboard-settings-v1'
const MAX_STUDY_MATERIAL_ITEMS = 20

const defaultEmptyDashboardSettings: EmptyDashboardSettings = {
  blockOrder: ['creation', 'studyMaterial'],
  showCreationBlock: true,
  studyMaterialMode: 'recent',
  studyMaterialLimit: 3,
  studyMaterialColumns: 1,
  customEntryIds: [],
}

const isEmptyDashboardBlock = (value: unknown): value is EmptyDashboardBlock =>
  value === 'creation' || value === 'studyMaterial'

const normalizeEmptyDashboardSettings = (
  value: Partial<EmptyDashboardSettings> | null,
): EmptyDashboardSettings => {
  const blockOrder = Array.isArray(value?.blockOrder)
    ? value.blockOrder.filter(isEmptyDashboardBlock)
    : defaultEmptyDashboardSettings.blockOrder
  const uniqueBlockOrder = Array.from(new Set(blockOrder))
  const normalizedBlockOrder: EmptyDashboardBlock[] = [
    ...uniqueBlockOrder,
    ...defaultEmptyDashboardSettings.blockOrder.filter(
      (block) => !uniqueBlockOrder.includes(block),
    ),
  ]

  return {
    blockOrder: normalizedBlockOrder,
    showCreationBlock:
      typeof value?.showCreationBlock === 'boolean'
        ? value.showCreationBlock
        : defaultEmptyDashboardSettings.showCreationBlock,
    studyMaterialMode:
      value?.studyMaterialMode === 'custom'
        ? 'custom'
        : defaultEmptyDashboardSettings.studyMaterialMode,
    studyMaterialLimit:
      typeof value?.studyMaterialLimit === 'number'
        ? Math.max(
            0,
            Math.min(MAX_STUDY_MATERIAL_ITEMS, value.studyMaterialLimit),
          )
        : defaultEmptyDashboardSettings.studyMaterialLimit,
    studyMaterialColumns:
      typeof value?.studyMaterialColumns === 'number'
        ? Math.max(1, Math.min(6, Math.round(value.studyMaterialColumns)))
        : defaultEmptyDashboardSettings.studyMaterialColumns,
    customEntryIds: Array.isArray(value?.customEntryIds)
      ? value.customEntryIds.filter(
          (entryId): entryId is string => typeof entryId === 'string',
        )
      : [],
  }
}

const readEmptyDashboardSettings = (): EmptyDashboardSettings => {
  if (typeof window === 'undefined') {
    return defaultEmptyDashboardSettings
  }

  try {
    const stored = window.localStorage.getItem(EMPTY_DASHBOARD_SETTINGS_KEY)
    return normalizeEmptyDashboardSettings(stored ? JSON.parse(stored) : null)
  } catch (error) {
    console.error('Failed to load empty dashboard settings', error)
    return defaultEmptyDashboardSettings
  }
}

const saveEmptyDashboardSettings = (settings: EmptyDashboardSettings) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      EMPTY_DASHBOARD_SETTINGS_KEY,
      JSON.stringify(settings),
    )
  } catch (error) {
    console.error('Failed to save empty dashboard settings', error)
  }
}

const getStudyPathEntryId = (folderName: string) =>
  `studyPath:${folderName.trim().toLowerCase()}`

const getDashboardEntryId = (dashboardId: string) => `dashboard:${dashboardId}`

const DashboardEmptyState = ({
  isAdmin,
  onCreateStudyPath,
  onUploadMaterial,
  onPasteNotes,
  dashboardOptions,
  onOpenDashboard,
  onOpenStudyGuide,
}: DashboardEmptyStateProps) => {
  const [settings, setSettings] = useState(readEmptyDashboardSettings)
  const [draftSettings, setDraftSettings] = useState(settings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dashboardsByFolder = dashboardOptions.reduce<
    Record<string, SavedDashboard[]>
  >((folders, dashboard) => {
    const folderName = dashboard.folder?.trim() || 'Default'
    folders[folderName] = folders[folderName] || []
    folders[folderName].push(dashboard)
    return folders
  }, {})
  const folderEntries: StudyMaterialEntry[] = Object.entries(
    dashboardsByFolder,
  ).flatMap(([folderName, dashboards]) => {
    const studyGuide = createStudyPathContainerState(dashboards)

    if (studyGuide) {
      return [
        {
          id: getStudyPathEntryId(folderName),
          folderName,
          dashboards,
          firstDashboard: dashboards[0],
          title: studyGuide.title,
          isStudyPath: true,
          colorSourceFolder: folderName,
        },
      ]
    }

    return dashboards.map((dashboard) => ({
      id: getDashboardEntryId(dashboard.id),
      folderName: dashboard.folder?.trim() || 'Default',
      dashboards: [dashboard],
      firstDashboard: dashboard,
      title: dashboard.name,
      isStudyPath: false,
      colorSourceFolder: dashboard.folder?.trim() || 'Default',
    }))
  })
  const entryById = new Map(folderEntries.map((entry) => [entry.id, entry]))
  const selectedCustomIds = new Set(settings.customEntryIds)
  const draftCustomIds = new Set(draftSettings.customEntryIds)
  const draftCustomEntries = draftSettings.customEntryIds
    .map((entryId) => entryById.get(entryId))
    .filter((entry): entry is StudyMaterialEntry => Boolean(entry))
  const availableCustomEntries = folderEntries.filter(
    (entry) => !draftCustomIds.has(entry.id),
  )
  const visibleStudyMaterialEntries =
    settings.studyMaterialMode === 'custom'
      ? settings.customEntryIds
          .map((entryId) => entryById.get(entryId))
          .filter((entry): entry is StudyMaterialEntry => Boolean(entry))
          .slice(0, settings.studyMaterialLimit)
      : folderEntries.slice(0, settings.studyMaterialLimit)
  const isSingleBlock =
    !settings.showCreationBlock ||
    settings.blockOrder.filter(
      (block) => block === 'studyMaterial' || settings.showCreationBlock,
    ).length < 2

  const openSettings = () => {
    setDraftSettings(settings)
    setSettingsOpen(true)
  }

  const saveSettings = () => {
    const normalized = normalizeEmptyDashboardSettings(draftSettings)
    setSettings(normalized)
    saveEmptyDashboardSettings(normalized)
    setSettingsOpen(false)
  }

  const resetSettings = () => {
    setDraftSettings(defaultEmptyDashboardSettings)
  }

  const addCustomEntry = (entryId: string) => {
    if (!entryId) {
      return
    }

    setDraftSettings((current) => {
      if (current.customEntryIds.includes(entryId)) {
        return current
      }

      return {
        ...current,
        customEntryIds: [...current.customEntryIds, entryId],
      }
    })
  }

  const removeCustomEntry = (entryId: string) => {
    setDraftSettings((current) => ({
      ...current,
      customEntryIds: current.customEntryIds.filter(
        (customEntryId) => customEntryId !== entryId,
      ),
    }))
  }

  const moveCustomEntry = (entryId: string, direction: -1 | 1) => {
    setDraftSettings((current) => {
      const currentIndex = current.customEntryIds.indexOf(entryId)
      const nextIndex = currentIndex + direction

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= current.customEntryIds.length
      ) {
        return current
      }

      const customEntryIds = [...current.customEntryIds]
      const [movedEntryId] = customEntryIds.splice(currentIndex, 1)
      customEntryIds.splice(nextIndex, 0, movedEntryId)

      return {
        ...current,
        customEntryIds,
      }
    })
  }

  const setFirstBlock = (block: EmptyDashboardBlock) => {
    setDraftSettings((current) => ({
      ...current,
      blockOrder:
        block === 'creation'
          ? ['creation', 'studyMaterial']
          : ['studyMaterial', 'creation'],
    }))
  }

  const creationBlock = settings.showCreationBlock ? (
    <Paper
      key="creation"
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
          What do you want to learn?
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: 620, fontSize: '0.72rem' }}
        >
          Create a guided Study Path, or add material to generate a quiz,
          flashcards, or Expand on this.
        </Typography>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            A guided multi-dashboard tutorial with lessons, exercises,
            flashcards, and review structure.
          </Typography>
        </Box>
        <ChevronRightIcon color="primary" />
      </Paper>

      <Box>
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{ mb: 0.75, color: 'text.secondary', fontSize: '0.6875rem' }}
        >
          Fast creation from material
        </Typography>
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
      </Box>
    </Paper>
  ) : null

  const studyMaterialBlock = (
    <Paper
      key="studyMaterial"
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
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
            <Typography variant="h6" fontWeight={900} sx={{ fontSize: '1rem' }}>
              Open study material
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TuneIcon />}
          onClick={openSettings}
          sx={{
            textTransform: 'none',
            fontWeight: 900,
            borderRadius: 2,
            alignSelf: { xs: 'stretch', sm: 'center' },
          }}
        >
          Customize this page!
        </Button>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{ mb: 0.75, color: 'text.secondary', fontSize: '0.6875rem' }}
        >
          {settings.studyMaterialMode === 'custom' ? 'Custom' : 'Recent'}
        </Typography>
        {visibleStudyMaterialEntries.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: `repeat(${settings.studyMaterialColumns}, minmax(0, 1fr))`,
              },
              gap: 1,
            }}
          >
            {visibleStudyMaterialEntries.map((entry) => {
              const folderColor = normalizeFolderColor(
                entry.dashboards.find((dashboard) => dashboard.folderColor)
                  ?.folderColor ||
                  DashboardStorage.getFolderColor(entry.colorSourceFolder),
              )

              return (
                <Button
                  key={entry.id}
                  variant="text"
                  onClick={() =>
                    entry.isStudyPath
                      ? onOpenStudyGuide(entry.dashboards)
                      : entry.firstDashboard &&
                        onOpenDashboard(entry.firstDashboard)
                  }
                  sx={{
                    width: '100%',
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
                      {entry.folderName}
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
                      {entry.title}
                    </Typography>
                  </Box>
                </Button>
              )
            })}
          </Box>
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
                {settings.studyMaterialMode === 'custom'
                  ? 'Choose custom Study Paths and dashboards to show here.'
                  : 'Saved Study Paths and dashboards appear here.'}
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
  )
  const blocks = settings.blockOrder
    .map((block) => (block === 'creation' ? creationBlock : studyMaterialBlock))
    .filter(Boolean)

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
            lg: isSingleBlock
              ? 'minmax(0, 760px)'
              : settings.blockOrder[0] === 'studyMaterial'
                ? 'minmax(300px, 2fr) minmax(0, 3fr)'
                : 'minmax(0, 3fr) minmax(300px, 2fr)',
          },
          justifyContent: isSingleBlock ? 'center' : undefined,
          gap: { xs: 1.25, sm: 1.5, lg: 2 },
          alignItems: 'stretch',
          maxHeight: { xs: '100%', lg: 'none' },
          overflowY: { xs: 'auto', lg: 'visible' },
        }}
      >
        {blocks}
      </Box>
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 28px 80px rgba(15,23,42,0.24)',
          },
        }}
      >
        <DialogTitle component="div" sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Typography component="div" variant="h5" fontWeight={950}>
            Customize empty dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Choose the home layout and the study material shown when no
            dashboard is open.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2.25,
                bgcolor: 'background.default',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <TextField
                  select
                  label="First block"
                  value={draftSettings.blockOrder[0]}
                  onChange={(event) =>
                    setFirstBlock(event.target.value as EmptyDashboardBlock)
                  }
                  fullWidth
                >
                  <MenuItem value="creation">Creation</MenuItem>
                  <MenuItem value="studyMaterial">Open study material</MenuItem>
                </TextField>

                <FormControlLabel
                  sx={{
                    minWidth: { sm: 210 },
                    m: 0,
                    px: 1.25,
                    py: 0.75,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                  }}
                  control={
                    <Switch
                      checked={draftSettings.showCreationBlock}
                      onChange={(event) =>
                        setDraftSettings((current) => ({
                          ...current,
                          showCreationBlock: event.target.checked,
                        }))
                      }
                    />
                  }
                  label="Show Creation"
                />
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2.25,
                bgcolor: 'background.default',
              }}
            >
              <Stack spacing={1.75}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <TextField
                    select
                    label="Study material"
                    value={draftSettings.studyMaterialMode}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        studyMaterialMode: event.target
                          .value as EmptyDashboardStudyMaterialMode,
                      }))
                    }
                    fullWidth
                  >
                    <MenuItem value="recent">Recent</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </TextField>

                  <Box sx={{ width: '100%', minWidth: { sm: 260 } }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 0.25 }}
                    >
                      <Typography variant="caption" fontWeight={900}>
                        Visible items
                      </Typography>
                      <Chip
                        size="small"
                        label={draftSettings.studyMaterialLimit}
                        sx={{ fontWeight: 900 }}
                      />
                    </Stack>
                    <Slider
                      aria-label="Visible items"
                      value={draftSettings.studyMaterialLimit}
                      min={0}
                      max={MAX_STUDY_MATERIAL_ITEMS}
                      step={1}
                      marks={[
                        { value: 0, label: '0' },
                        { value: 10, label: '10' },
                        { value: 20, label: '20' },
                      ]}
                      onChange={(_, value) =>
                        setDraftSettings((current) => ({
                          ...current,
                          studyMaterialLimit: Array.isArray(value)
                            ? value[0]
                            : value,
                        }))
                      }
                    />
                  </Box>
                </Stack>

                <Box>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 0.25 }}
                  >
                    <Typography variant="caption" fontWeight={900}>
                      Columns
                    </Typography>
                    <Chip
                      size="small"
                      label={draftSettings.studyMaterialColumns}
                      sx={{ fontWeight: 900 }}
                    />
                  </Stack>
                  <Slider
                    aria-label="Study material columns"
                    value={draftSettings.studyMaterialColumns}
                    min={1}
                    max={6}
                    step={1}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 3, label: '3' },
                      { value: 6, label: '6' },
                    ]}
                    onChange={(_, value) =>
                      setDraftSettings((current) => ({
                        ...current,
                        studyMaterialColumns: Array.isArray(value)
                          ? value[0]
                          : value,
                      }))
                    }
                  />
                </Box>

                {draftSettings.studyMaterialMode === 'custom' ? (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={950}
                        sx={{ mb: 1 }}
                      >
                        Custom order
                      </Typography>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{ mb: 1.25 }}
                      >
                        <TextField
                          select
                          label="Add Study Path or dashboard"
                          value=""
                          onChange={(event) =>
                            addCustomEntry(event.target.value)
                          }
                          fullWidth
                          disabled={availableCustomEntries.length === 0}
                        >
                          {availableCustomEntries.map((entry) => (
                            <MenuItem key={entry.id} value={entry.id}>
                              {entry.title} -{' '}
                              {entry.isStudyPath ? 'Study Path' : 'Dashboard'}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>

                      <Box
                        sx={{
                          minHeight: 180,
                          maxHeight: 320,
                          overflowY: 'auto',
                          p: 1,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                        }}
                      >
                        {draftCustomEntries.length > 0 ? (
                          <Stack spacing={0.75}>
                            {draftCustomEntries.map((entry, index) => (
                              <Paper
                                key={entry.id}
                                elevation={0}
                                sx={{
                                  p: 1,
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1.75,
                                  display: 'grid',
                                  gridTemplateColumns:
                                    'minmax(0, 1fr) auto auto',
                                  alignItems: 'center',
                                  gap: 0.75,
                                }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={900}
                                    noWrap
                                  >
                                    {entry.title}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {entry.isStudyPath
                                      ? 'Study Path'
                                      : 'Dashboard'}
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={0.25}>
                                  <IconButton
                                    aria-label={`Move ${entry.title} up`}
                                    size="small"
                                    onClick={() =>
                                      moveCustomEntry(entry.id, -1)
                                    }
                                    disabled={index === 0}
                                  >
                                    <KeyboardArrowUpIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    aria-label={`Move ${entry.title} down`}
                                    size="small"
                                    onClick={() => moveCustomEntry(entry.id, 1)}
                                    disabled={
                                      index === draftCustomEntries.length - 1
                                    }
                                  >
                                    <KeyboardArrowDownIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                                <IconButton
                                  aria-label={`Remove ${entry.title}`}
                                  size="small"
                                  onClick={() => removeCustomEntry(entry.id)}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Paper>
                            ))}
                          </Stack>
                        ) : (
                          <Box
                            sx={{
                              minHeight: 160,
                              display: 'grid',
                              placeItems: 'center',
                              textAlign: 'center',
                              color: 'text.secondary',
                              px: 2,
                            }}
                          >
                            <Typography variant="body2" fontWeight={800}>
                              Add Study Paths or standalone dashboards to build
                              a custom list.
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
          <Button onClick={resetSettings} sx={{ mr: 'auto' }}>
            Reset
          </Button>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSettings}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DashboardEmptyState

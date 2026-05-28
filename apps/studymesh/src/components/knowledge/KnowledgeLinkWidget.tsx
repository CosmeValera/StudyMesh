import React from 'react'
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddLinkIcon from '@mui/icons-material/AddLink'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LinkIcon from '@mui/icons-material/Link'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RouteIcon from '@mui/icons-material/Route'
import CloseIcon from '@mui/icons-material/Close'
import {
  getKnowledgeReferenceKindLabel,
  getKnowledgeReferenceTitle,
  KnowledgeLinkWidgetCardSize,
  KnowledgeLinkWidgetColumns,
  KnowledgeLinkWidgetOptions,
  KnowledgeLinkWidgetSectionId,
  KnowledgeReference,
  OPEN_KNOWLEDGE_REFERENCE_EVENT,
  OPEN_STUDY_LINK_PICKER_EVENT,
  RESET_DEFAULT_EMPTY_DASHBOARD_EVENT,
  SAVE_KNOWLEDGE_LINK_DASHBOARD_AS_DEFAULT_EVENT,
  UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT,
} from '../../knowledgeReferences'
import {
  OPEN_CREATE_HUB_EVENT,
  OPEN_SAVED_DASHBOARDS_EVENT,
} from '../../customHooks/useWorkspaceActions'

interface KnowledgeLinkWidgetProps {
  references?: KnowledgeReference[]
  title?: string
  cardSize?: KnowledgeLinkWidgetCardSize
  editMode?: boolean
  showCreationActions?: boolean
  showOpenStudyMaterial?: boolean
  sectionOrder?: KnowledgeLinkWidgetSectionId[]
  columns?: KnowledgeLinkWidgetColumns
}

const defaultSectionOrder: KnowledgeLinkWidgetSectionId[] = [
  'creation',
  'openMaterial',
  'links',
]
const reorderablePanelSections: KnowledgeLinkWidgetSectionId[] = [
  'creation',
  'openMaterial',
]

const normalizeSectionOrder = (
  order?: KnowledgeLinkWidgetSectionId[],
): KnowledgeLinkWidgetSectionId[] => [
  ...(order || []).filter((section) =>
    reorderablePanelSections.includes(section),
  ),
  ...reorderablePanelSections.filter((section) => !order?.includes(section)),
  'links',
]

const getIcon = (type: string) => {
  if (type === 'studyPath' || type === 'studyPathSection') {
    return <AutoStoriesIcon fontSize="small" />
  }

  if (type === 'dashboard') {
    return <DashboardIcon fontSize="small" />
  }

  if (type === 'source') {
    return <InsertDriveFileIcon fontSize="small" />
  }

  return <LinkIcon fontSize="small" />
}

const openReference = (reference: KnowledgeReference) => {
  window.dispatchEvent(
    new CustomEvent(OPEN_KNOWLEDGE_REFERENCE_EVENT, {
      detail: { target: reference.target },
    }),
  )
}

const getActionLabel = (reference: KnowledgeReference): string => {
  if (reference.target.type === 'studyPath') {
    return 'Open study path'
  }

  if (reference.target.type === 'studyPathSection') {
    return 'Open section'
  }

  if (reference.target.type === 'dashboard') {
    return 'Open dashboard'
  }

  return 'Open link'
}

const updateWidgetOptions = (options: KnowledgeLinkWidgetOptions) => {
  window.dispatchEvent(
    new CustomEvent(UPDATE_KNOWLEDGE_LINK_WIDGET_EVENT, {
      detail: { options },
    }),
  )
}

const openCreateHub = (
  detail:
    | { intent: 'study-path' }
    | {
        intent: 'improvedNotes'
        openQuickOptions: boolean
        quickSourceFocus: 'upload' | 'paste'
      },
) => {
  window.dispatchEvent(new CustomEvent(OPEN_CREATE_HUB_EVENT, { detail }))
}

const saveAsDefaultEmptyDashboard = () => {
  window.dispatchEvent(
    new CustomEvent(SAVE_KNOWLEDGE_LINK_DASHBOARD_AS_DEFAULT_EVENT),
  )
}

const resetDefaultEmptyDashboard = () => {
  window.dispatchEvent(new CustomEvent(RESET_DEFAULT_EMPTY_DASHBOARD_EVENT))
}

const openStudyLinkPicker = () => {
  window.dispatchEvent(new CustomEvent(OPEN_STUDY_LINK_PICKER_EVENT))
}

const editToggleSx = (theme: import('@mui/material/styles').Theme) => ({
  '& .MuiToggleButton-root': {
    color: 'text.primary',
    borderColor: 'divider',
    bgcolor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.08)
        : alpha(theme.palette.common.black, 0.04),
    fontWeight: 850,
    textTransform: 'none',
    '&:hover': {
      bgcolor:
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, 0.14)
          : alpha(theme.palette.common.black, 0.08),
    },
    '&.Mui-selected': {
      color: 'primary.contrastText',
      bgcolor: 'primary.main',
      borderColor: 'primary.dark',
      '&:hover': {
        bgcolor: 'primary.dark',
      },
    },
  },
})

const editIconButtonSx = (theme: import('@mui/material/styles').Theme) => ({
  width: 30,
  height: 30,
  color: 'text.primary',
  border: 1,
  borderColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.32)
      : alpha(theme.palette.common.black, 0.28),
  bgcolor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.12)
      : alpha(theme.palette.common.white, 0.92),
  boxShadow:
    theme.palette.mode === 'dark'
      ? `0 1px 0 ${alpha(theme.palette.common.white, 0.12)} inset`
      : `0 1px 3px ${alpha(theme.palette.common.black, 0.12)}`,
  '&:hover': {
    color: 'primary.contrastText',
    borderColor: 'primary.main',
    bgcolor: 'primary.main',
  },
  '&.Mui-disabled': {
    color:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.34)
        : alpha(theme.palette.common.black, 0.34),
    borderColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.14)
        : alpha(theme.palette.common.black, 0.12),
    bgcolor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.04)
        : alpha(theme.palette.common.black, 0.04),
  },
})

export const KnowledgeLinkWidget: React.FC<KnowledgeLinkWidgetProps> = ({
  references = [],
  title = 'Study links',
  cardSize = 'standard',
  editMode = false,
  showCreationActions = false,
  showOpenStudyMaterial = false,
  sectionOrder,
  columns = 1,
}) => {
  const compact = cardSize === 'compact'
  const detailed = cardSize === 'detailed'
  const orderedSections = normalizeSectionOrder(sectionOrder)
  const [editingTitle, setEditingTitle] = React.useState(false)
  const [displayTitle, setDisplayTitle] = React.useState(title)
  const [draftTitle, setDraftTitle] = React.useState(title)
  const [draggedSection, setDraggedSection] =
    React.useState<KnowledgeLinkWidgetSectionId | null>(null)
  const [draggedReferenceId, setDraggedReferenceId] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    setDisplayTitle(title)
    setDraftTitle(title)
  }, [title])

  const handleCardSizeChange = (
    _: React.MouseEvent<HTMLElement>,
    value: KnowledgeLinkWidgetCardSize | null,
  ) => {
    if (!value) {
      return
    }

    updateWidgetOptions({ cardSize: value })
  }

  const handleColumnsChange = (
    _: React.MouseEvent<HTMLElement>,
    value: KnowledgeLinkWidgetColumns | null,
  ) => {
    if (!value) {
      return
    }

    updateWidgetOptions({ columns: value })
  }

  const commitTitle = () => {
    const nextTitle = draftTitle.trim() || 'Study links'
    setDisplayTitle(nextTitle)
    setDraftTitle(nextTitle)
    setEditingTitle(false)
    if (nextTitle !== title) {
      updateWidgetOptions({ title: nextTitle })
    }
  }

  const moveSection = (
    targetSection: KnowledgeLinkWidgetSectionId,
    sourceSection: KnowledgeLinkWidgetSectionId | null,
  ) => {
    if (
      !sourceSection ||
      sourceSection === targetSection ||
      !reorderablePanelSections.includes(sourceSection) ||
      !reorderablePanelSections.includes(targetSection)
    ) {
      return
    }

    const nextOrder = orderedSections.filter(
      (section) => section !== sourceSection,
    )
    const targetIndex = nextOrder.indexOf(targetSection)
    nextOrder.splice(targetIndex, 0, sourceSection)
    updateWidgetOptions({ sectionOrder: nextOrder })
  }

  const moveReference = (
    targetReferenceId: string,
    sourceReferenceId: string | null,
  ) => {
    if (!sourceReferenceId || sourceReferenceId === targetReferenceId) {
      return
    }

    const sourceReference = references.find(
      (reference) => reference.id === sourceReferenceId,
    )
    if (!sourceReference) {
      return
    }

    const nextReferences = references.filter(
      (reference) => reference.id !== sourceReferenceId,
    )
    const targetIndex = nextReferences.findIndex(
      (reference) => reference.id === targetReferenceId,
    )
    nextReferences.splice(Math.max(0, targetIndex), 0, sourceReference)
    updateWidgetOptions({ references: nextReferences })
  }

  const moveReferenceByIndex = (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex < 0 ||
      sourceIndex >= references.length ||
      targetIndex < 0 ||
      targetIndex >= references.length ||
      sourceIndex === targetIndex
    ) {
      return
    }

    const nextReferences = [...references]
    const [movedReference] = nextReferences.splice(sourceIndex, 1)
    nextReferences.splice(targetIndex, 0, movedReference)
    updateWidgetOptions({ references: nextReferences })
  }

  const removeReference = (referenceId: string) => {
    updateWidgetOptions({
      references: references.filter(
        (reference) => reference.id !== referenceId,
      ),
    })
  }

  const sectionDragProps = (section: KnowledgeLinkWidgetSectionId) =>
    editMode && reorderablePanelSections.includes(section)
      ? {
          draggable: true,
          onDragStart: () => setDraggedSection(section),
          onDragOver: (event: React.DragEvent) => {
            event.preventDefault()
          },
          onDrop: () => {
            moveSection(section, draggedSection)
            setDraggedSection(null)
          },
          onDragEnd: () => setDraggedSection(null),
        }
      : {}

  const renderCreationSection = () =>
    showCreationActions ? (
      <Paper
        key="creation"
        variant="outlined"
        {...sectionDragProps('creation')}
        sx={{
          width:
            showCreationActions && showOpenStudyMaterial
              ? 'calc(50% - 4px)'
              : '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          p: 1.25,
          borderRadius: 1,
          bgcolor: 'background.default',
          cursor: editMode ? 'grab' : 'default',
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <RouteIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={900}>
              Build
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              size="small"
              variant="contained"
              startIcon={<RouteIcon />}
              onClick={() => openCreateHub({ intent: 'study-path' })}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Study Path
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() =>
                openCreateHub({
                  intent: 'improvedNotes',
                  openQuickOptions: true,
                  quickSourceFocus: 'upload',
                })
              }
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Upload
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentPasteIcon />}
              onClick={() =>
                openCreateHub({
                  intent: 'improvedNotes',
                  openQuickOptions: true,
                  quickSourceFocus: 'paste',
                })
              }
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Paste
            </Button>
          </Stack>
        </Stack>
      </Paper>
    ) : null

  const renderOpenMaterialSection = () =>
    showOpenStudyMaterial ? (
      <Paper
        key="openMaterial"
        variant="outlined"
        {...sectionDragProps('openMaterial')}
        sx={{
          width:
            showCreationActions && showOpenStudyMaterial
              ? 'calc(50% - 4px)'
              : '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          p: 1.25,
          borderRadius: 1,
          bgcolor: 'background.default',
          cursor: editMode ? 'grab' : 'default',
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FolderOpenIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={900}>
              Open study material
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={() =>
              window.dispatchEvent(new CustomEvent(OPEN_SAVED_DASHBOARDS_EVENT))
            }
            sx={{
              alignSelf: 'flex-start',
              textTransform: 'none',
              fontWeight: 800,
            }}
          >
            Open library
          </Button>
        </Stack>
      </Paper>
    ) : null

  const renderReferenceCardContent = (
    reference: KnowledgeReference,
    referenceIndex: number,
  ) => (
    <Box
      sx={(theme) => ({
        p: compact ? 1 : 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.primary.main, 0.035),
        transition: 'border-color 120ms ease, background 120ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
        },
      })}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: compact ? 28 : 32,
            height: compact ? 28 : 32,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            flex: '0 0 auto',
          }}
        >
          {getIcon(reference.target.type)}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ mb: 0.5, minWidth: 0 }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={800}
              noWrap
              sx={{ minWidth: 0, flex: 1 }}
            >
              {getKnowledgeReferenceTitle(reference)}
            </Typography>
            {!compact && !editMode && (
              <OpenInNewIcon
                fontSize="small"
                sx={{ color: 'text.secondary', flex: '0 0 auto' }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Chip
              size="small"
              label={getKnowledgeReferenceKindLabel(reference.target)}
              sx={{ height: 22, fontWeight: 700 }}
            />
            {!compact && reference.target.subtitle && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {reference.target.subtitle}
              </Typography>
            )}
          </Stack>
          {detailed && reference.description && (
            <Typography variant="body2" color="text.secondary">
              {reference.description}
            </Typography>
          )}
          {!compact && !editMode && (
            <Typography
              variant="caption"
              color="primary"
              fontWeight={800}
              sx={{ display: 'block', mt: 0.75 }}
            >
              {getActionLabel(reference)}
            </Typography>
          )}
          {editMode && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
              <IconButton
                size="small"
                aria-label={`Move ${getKnowledgeReferenceTitle(
                  reference,
                )} left`}
                disabled={referenceIndex === 0}
                onClick={() =>
                  moveReferenceByIndex(referenceIndex, referenceIndex - 1)
                }
                sx={editIconButtonSx}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Move ${getKnowledgeReferenceTitle(
                  reference,
                )} right`}
                disabled={referenceIndex === references.length - 1}
                onClick={() =>
                  moveReferenceByIndex(referenceIndex, referenceIndex + 1)
                }
                sx={editIconButtonSx}
              >
                <ArrowForwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Remove ${getKnowledgeReferenceTitle(reference)}`}
                onClick={() => removeReference(reference.id)}
                sx={(theme) => ({
                  ...editIconButtonSx(theme),
                  '&:hover': {
                    color: theme.palette.error.contrastText,
                    borderColor: 'error.main',
                    bgcolor: 'error.main',
                  },
                })}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  )

  const referenceDragProps = (referenceId: string) =>
    editMode
      ? {
          draggable: true,
          onDragStart: () => setDraggedReferenceId(referenceId),
          onDragOver: (event: React.DragEvent) => {
            event.preventDefault()
          },
          onDrop: () => {
            moveReference(referenceId, draggedReferenceId)
            setDraggedReferenceId(null)
          },
          onDragEnd: () => setDraggedReferenceId(null),
        }
      : {}

  const renderLinksSection = () => (
    <Box
      key="links"
      sx={{
        width: '100%',
        minWidth: 0,
      }}
    >
      {editMode && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1.25 }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Button
            variant="contained"
            startIcon={<AddLinkIcon />}
            onClick={openStudyLinkPicker}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
              textTransform: 'none',
              fontWeight: 850,
            }}
          >
            Add study link
          </Button>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={columns}
              onChange={handleColumnsChange}
              aria-label="Study link columns per row"
              sx={(theme) => ({
                ...editToggleSx(theme),
                '& .MuiToggleButton-root': {
                  ...editToggleSx(theme)['& .MuiToggleButton-root'],
                  minWidth: 38,
                },
              })}
            >
              {[1, 2, 3, 4].map((columnCount) => (
                <ToggleButton
                  key={columnCount}
                  value={columnCount}
                  aria-label={`${columnCount} column${
                    columnCount === 1 ? '' : 's'
                  } per row`}
                >
                  {columnCount}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={cardSize}
              onChange={handleCardSizeChange}
              aria-label="Study link card size"
              sx={editToggleSx}
            >
              <ToggleButton value="compact" aria-label="Compact cards">
                Compact
              </ToggleButton>
              <ToggleButton value="standard" aria-label="Standard cards">
                Standard
              </ToggleButton>
              <ToggleButton value="detailed" aria-label="Detailed cards">
                Detailed
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      )}
      {editMode && (
        <Typography variant="caption" color="text.secondary">
          Drag study links to reorder them.
        </Typography>
      )}
      {references.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            minHeight: 96,
            color: 'text.secondary',
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={0.75} alignItems="center" textAlign="center">
            <AddLinkIcon color="primary" />
            <Typography variant="body2" fontWeight={800}>
              No study links yet.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: `repeat(${columns}, minmax(0, 1fr))`,
            },
            gap: 1.25,
            mt: editMode ? 0.75 : 0,
          }}
        >
          {references.map((reference, referenceIndex) =>
            editMode ? (
              <Box
                key={reference.id}
                data-testid={`study-link-card-${reference.id}`}
                {...referenceDragProps(reference.id)}
                sx={{
                  width: '100%',
                  minWidth: 0,
                  borderRadius: 1,
                  cursor: 'grab',
                }}
              >
                {renderReferenceCardContent(reference, referenceIndex)}
              </Box>
            ) : (
              <ButtonBase
                key={reference.id}
                data-testid={`study-link-card-${reference.id}`}
                onClick={() => openReference(reference)}
                sx={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                {renderReferenceCardContent(reference, referenceIndex)}
              </ButtonBase>
            ),
          )}
        </Box>
      )}
    </Box>
  )

  const sectionRenderers: Record<
    KnowledgeLinkWidgetSectionId,
    () => React.ReactNode
  > = {
    creation: renderCreationSection,
    openMaterial: renderOpenMaterialSection,
    links: renderLinksSection,
  }

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'auto',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box sx={{ minWidth: 0 }}>
            {editMode && editingTitle ? (
              <TextField
                autoFocus
                size="small"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitTitle()
                  }
                }}
                inputProps={{ 'aria-label': 'Study links dashboard name' }}
              />
            ) : (
              <Typography
                variant="subtitle1"
                fontWeight={900}
                onClick={() => {
                  if (editMode) {
                    setEditingTitle(true)
                  }
                }}
                sx={{ cursor: editMode ? 'text' : 'default' }}
              >
                {displayTitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {editMode && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="contained"
              onClick={saveAsDefaultEmptyDashboard}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Use for new dashboards
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={resetDefaultEmptyDashboard}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Restore blank default
            </Button>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showCreationActions}
                  onChange={(event) =>
                    updateWidgetOptions({
                      showCreationActions: event.target.checked,
                    })
                  }
                />
              }
              label="Creation"
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showOpenStudyMaterial}
                  onChange={(event) =>
                    updateWidgetOptions({
                      showOpenStudyMaterial: event.target.checked,
                    })
                  }
                />
              }
              label="Open material"
            />
          </Stack>
        )}

        <Divider />

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'stretch',
          }}
        >
          {orderedSections.map((section) => sectionRenderers[section]())}
        </Box>
      </Stack>
    </Paper>
  )
}

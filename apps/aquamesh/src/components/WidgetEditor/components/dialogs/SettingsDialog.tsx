import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Switch,
  Divider,
  Paper,
  Grid,
  Chip,
  TextField,
  MenuItem,
  Alert,
  LinearProgress,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import WidgetsIcon from '@mui/icons-material/Widgets'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import SaveIcon from '@mui/icons-material/Save'
import EditIcon from '@mui/icons-material/Edit'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import SettingsIcon from '@mui/icons-material/Settings'
import DashboardIcon from '@mui/icons-material/Dashboard'
import SearchIcon from '@mui/icons-material/Search'
import ColorLensIcon from '@mui/icons-material/ColorLens'
import ReplayIcon from '@mui/icons-material/Replay'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

import AccentColorPicker from '../../../../theme/AccentColorPicker'
import { AQUAMESH_ONBOARDING_RESET_EVENT } from '../../../onboarding/onboardingEvents'
import {
  DEFAULT_STUDY_PACK_AI_MODEL,
  StudyPackAiProvider,
  getEnvGeminiApiKey,
  readStudyPackAiSettings,
  saveStudyPackAiSettings,
  testLocalLanguageModel,
} from '../../../../studyPack/ai'

const WORKSPACE_ONBOARDING_KEY = 'aquamesh-workspace-onboarding-v1'
const LOCAL_AI_ESTIMATE_COPY =
  'Local AI runs on your device and can be slow. Super small usually takes 1-2 min, Compact 2-3 min, Average 3-5 min. For faster/deeper paths, use Own Gemini token.'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  title?: string
  scope?: 'editor' | 'global'
  showTooltips?: boolean
  onShowTooltipsChange?: (value: boolean) => void
  showDeleteConfirmation?: boolean
  onShowDeleteConfirmationChange?: (value: boolean) => void
  showComponentPaletteHelp?: boolean
  onShowComponentPaletteHelpChange?: (value: boolean) => void
  showDeleteWidgetConfirmation?: boolean
  onShowDeleteWidgetConfirmationChange?: (value: boolean) => void
  showDeleteDashboardConfirmation?: boolean
  onShowDeleteDashboardConfirmationChange?: (value: boolean) => void
  showAdvancedInToolbar?: boolean
  onShowAdvancedInToolbarChange?: (value: boolean) => void
  showDeleteTemplateConfirmation?: boolean
  onShowDeleteTemplateConfirmationChange?: (value: boolean) => void
}

// Keyboard shortcut card component
interface ShortcutCardProps {
  icon: React.ReactNode
  title: string
  shortcut: string
  color?: string
}

const ShortcutCard: React.FC<ShortcutCardProps> = ({
  icon,
  title,
  shortcut,
  color = 'primary.main',
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 1.5,
      display: 'flex',
      alignItems: 'center',
      mb: 1.5,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      },
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        bgcolor: color,
        borderRadius: '50%',
        minWidth: 36,
        minHeight: 36,
        mr: 2,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" fontWeight="medium" color="text.primary">
        {title}
      </Typography>
    </Box>
    <Chip
      label={shortcut}
      size="small"
      sx={{
        fontFamily: 'monospace',
        fontWeight: 'bold',
        bgcolor: 'rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 1,
        px: 0.5,
        color: 'text.primary',
      }}
    />
  </Paper>
)

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  showTooltips,
  onShowTooltipsChange,
  showDeleteConfirmation,
  onShowDeleteConfirmationChange,
  showComponentPaletteHelp,
  onShowComponentPaletteHelpChange,
  showDeleteWidgetConfirmation,
  onShowDeleteWidgetConfirmationChange,
  showDeleteDashboardConfirmation,
  onShowDeleteDashboardConfirmationChange,
  showAdvancedInToolbar = false,
  onShowAdvancedInToolbarChange,
  showDeleteTemplateConfirmation,
  onShowDeleteTemplateConfirmationChange,
  title = 'Widget Editor Settings',
  scope = 'editor',
}) => {
  const showEditorSettings = scope === 'editor'
  const showGlobalSettings = scope === 'global'
  const [aiProvider, setAiProvider] =
    React.useState<StudyPackAiProvider>('basic')
  const [aiApiToken, setAiApiToken] = React.useState('')
  const [aiModel, setAiModel] = React.useState(DEFAULT_STUDY_PACK_AI_MODEL)
  const [localAiStatus, setLocalAiStatus] = React.useState('')
  const [localAiProgress, setLocalAiProgress] = React.useState<number | null>(
    null,
  )
  const [isTestingLocalAi, setIsTestingLocalAi] = React.useState(false)
  const [libraryTransferStatus, setLibraryTransferStatus] = React.useState('')
  const hasEnvToken = Boolean(getEnvGeminiApiKey())

  React.useEffect(() => {
    if (!open || !showGlobalSettings) {
      return
    }

    const settings = readStudyPackAiSettings()
    setAiProvider(settings.provider || 'basic')
    setAiApiToken(settings.apiToken)
    setAiModel(settings.model)
    setLocalAiStatus('')
    setLocalAiProgress(null)
  }, [open, showGlobalSettings])

  // Create safe handlers for all possibly undefined callbacks
  const handleTooltipsChange = (checked: boolean) => {
    if (onShowTooltipsChange) {
      onShowTooltipsChange(checked)
    }
  }

  const handleComponentPaletteHelpChange = (checked: boolean) => {
    if (onShowComponentPaletteHelpChange) {
      onShowComponentPaletteHelpChange(checked)
    }
  }

  const handleAdvancedInToolbarChange = (checked: boolean) => {
    if (onShowAdvancedInToolbarChange) {
      onShowAdvancedInToolbarChange(checked)
    }
  }

  const handleDeleteDashboardConfirmationChange = (checked: boolean) => {
    if (onShowDeleteDashboardConfirmationChange) {
      onShowDeleteDashboardConfirmationChange(checked)
    }
  }

  const handleDeleteTemplateConfirmationChange = (checked: boolean) => {
    if (onShowDeleteTemplateConfirmationChange) {
      onShowDeleteTemplateConfirmationChange(checked)
    }
  }

  const handleReplayTutorial = () => {
    window.localStorage.setItem(
      WORKSPACE_ONBOARDING_KEY,
      JSON.stringify({
        status: 'active',
        stepId: 'create-dashboard',
      }),
    )
    window.dispatchEvent(new CustomEvent(AQUAMESH_ONBOARDING_RESET_EVENT))
    onClose()
  }

  const handleSaveAiSettings = () => {
    saveStudyPackAiSettings({
      provider: aiProvider,
      apiToken: aiApiToken,
      model: aiModel,
    })
  }

  const handleClearAiToken = () => {
    setAiApiToken('')
    saveStudyPackAiSettings({
      provider: aiProvider,
      apiToken: '',
      model: aiModel,
    })
  }

  const handleTestLocalAi = async () => {
    setIsTestingLocalAi(true)
    setLocalAiStatus('Checking Google Local AI...')
    setLocalAiProgress(null)

    try {
      const result = await testLocalLanguageModel((progress) => {
        setLocalAiProgress(progress)
        setLocalAiStatus(`Downloading local model ${progress}%`)
      })

      if (!result.supported) {
        setLocalAiStatus(
          '❌ Google Local AI is not supported in this browser. Use Google Chrome with the built-in AI model enabled.',
        )
      } else if (result.availability === 'unavailable') {
        setLocalAiStatus(
          '❌ Google Local AI is unavailable. The browser may need Chrome, model access, or a downloaded local model.',
        )
      } else {
        const promptResult = result.result?.trim()
        setLocalAiStatus(
          promptResult
            ? `✅ Google Local AI ${result.availability}: ${promptResult}`
            : `❌ Google Local AI ${result.availability}: No prompt result returned.`,
        )
      }
    } catch (error) {
      setLocalAiStatus(
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Google Local AI test failed.',
      )
    } finally {
      setIsTestingLocalAi(false)
    }
  }

  const handleExportLibrary = () => {
    try {
      const savedDashboards = window.localStorage.getItem('customDashboards')
      const dashboards = savedDashboards ? JSON.parse(savedDashboards) : []
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        dashboards,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `aquamesh-study-library-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setLibraryTransferStatus('Library export created.')
    } catch (error) {
      console.error('Failed to export Study Pack library', error)
      setLibraryTransferStatus('Could not export the library.')
    }
  }

  const handleImportLibrary = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const payload = JSON.parse(await file.text()) as {
        dashboards?: unknown
      }
      if (!Array.isArray(payload.dashboards)) {
        setLibraryTransferStatus('Import file must include a dashboards array.')
        return
      }

      window.localStorage.setItem(
        'customDashboards',
        JSON.stringify(payload.dashboards),
      )
      window.dispatchEvent(new CustomEvent('dashboardStorageUpdated'))
      setLibraryTransferStatus(
        `Imported ${payload.dashboards.length} library item${
          payload.dashboards.length === 1 ? '' : 's'
        }.`,
      )
    } catch (error) {
      console.error('Failed to import Study Pack library', error)
      setLibraryTransferStatus('Could not import that library file.')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiTypography-h6': { fontSize: { xs: '1rem', sm: '1.25rem' } },
        '& .MuiTypography-body1': { fontSize: { xs: '0.75rem', sm: '1rem' } },
        '& .MuiTypography-body2': {
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center">
          <SettingsIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography
            variant="h6"
            component="div"
            fontWeight="bold"
            color="text.primary"
          >
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography
            variant="h6"
            gutterBottom
            fontWeight="medium"
            color="text.primary"
          >
            {showGlobalSettings ? 'Application Options' : 'Editor Options'}
          </Typography>

          {showGlobalSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <AutoAwesomeIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight="medium" color="text.primary">
                    Advanced AI Provider Settings
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Create Study Pack uses the configured provider only when AI
                    mode runs. API keys are optional advanced settings and stay
                    in this browser.
                  </Typography>
                  <TextField
                    select
                    label="AI provider"
                    value={aiProvider}
                    onChange={(event) =>
                      setAiProvider(event.target.value as StudyPackAiProvider)
                    }
                    fullWidth
                    size="small"
                    sx={{ mb: 1.5 }}
                    helperText="This provider is used by Create Study Pack and Create Study Path."
                  >
                    <MenuItem value="basic">Basic fallback</MenuItem>
                    <MenuItem value="local">
                      Google Local AI (experimental)
                    </MenuItem>
                    <MenuItem value="gemini">Own Gemini API token</MenuItem>
                    <MenuItem value="hosted">Hosted AI tokens</MenuItem>
                  </TextField>
                  {aiProvider === 'local' && (
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      {LOCAL_AI_ESTIMATE_COPY}
                    </Alert>
                  )}
                  {aiProvider === 'hosted' && (
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      Hosted AI is not configured yet.
                    </Alert>
                  )}
                  {aiProvider === 'local' && (
                    <Box sx={{ mb: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleTestLocalAi}
                        disabled={isTestingLocalAi}
                      >
                        {isTestingLocalAi
                          ? 'Testing local AI...'
                          : 'Check Google Local AI'}
                      </Button>
                      {localAiProgress !== null && (
                        <LinearProgress
                          variant="determinate"
                          value={localAiProgress}
                          sx={{ mt: 1 }}
                        />
                      )}
                      {localAiStatus && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {localAiStatus}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {aiProvider === 'gemini' && (
                    <>
                      <TextField
                        label="API key"
                        type="password"
                        value={aiApiToken}
                        onChange={(event) => setAiApiToken(event.target.value)}
                        fullWidth
                        size="small"
                        placeholder={
                          hasEnvToken
                            ? 'Using .env key unless you enter one here'
                            : 'Paste your Gemini API key'
                        }
                        sx={{ mb: 1.5 }}
                      />
                      <TextField
                        label="Model"
                        value={aiModel}
                        onChange={(event) => setAiModel(event.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mb: 1.5 }}
                      />
                    </>
                  )}
                  {aiProvider !== 'gemini' && (
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      Gemini API key and model are kept for Own Gemini API token
                      mode.
                    </Alert>
                  )}
                  {aiProvider === 'gemini' && (
                    <Chip
                      size="small"
                      label={
                        aiApiToken.trim()
                          ? 'Settings key active'
                          : hasEnvToken
                            ? '.env key available'
                            : 'No key configured'
                      }
                      color={
                        aiApiToken.trim() || hasEnvToken ? 'primary' : 'default'
                      }
                      sx={{ mb: 1.5 }}
                    />
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Chip size="small" label={`Mode: ${aiProvider}`} />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleClearAiToken}
                      disabled={aiProvider !== 'gemini'}
                    >
                      Clear key
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveAiSettings}
                    >
                      Save AI settings
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}

          {showGlobalSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <FolderOpenIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight="medium" color="text.primary">
                    Study Library Backup
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1.5 }}
                  >
                    Export or replace all saved Study Packs, subjects, and
                    advanced workspaces stored in this browser.
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleExportLibrary}
                    >
                      Export library
                    </Button>
                    <Button component="label" variant="outlined" size="small">
                      Import library
                      <input
                        hidden
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImportLibrary}
                      />
                    </Button>
                    {libraryTransferStatus && (
                      <Typography variant="caption" color="text.secondary">
                        {libraryTransferStatus}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}

          {showGlobalSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ReplayIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight="medium" color="text.primary">
                    Replay Workspace Tutorial
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Restart the guided dashboard and widget tutorial from the
                    first step.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleReplayTutorial}
                  sx={{ ml: 2, whiteSpace: 'nowrap' }}
                >
                  Replay
                </Button>
              </Box>
            </Paper>
          )}

          {showEditorSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <InfoOutlinedIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                    <Typography fontWeight="medium" color="text.primary">
                      Show Helpful Tips
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Switch
                      checked={Boolean(showTooltips)}
                      onChange={(e) => handleTooltipsChange(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 5, mb: 1 }}
                  >
                    Show short explanations when hovering over building blocks
                    in the palette.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {showEditorSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <HelpOutlineIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                    <Typography fontWeight="medium" color="text.primary">
                      Show Building Blocks Help
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Switch
                      checked={Boolean(showComponentPaletteHelp)}
                      onChange={(e) =>
                        handleComponentPaletteHelpChange(e.target.checked)
                      }
                      color="primary"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 5, mb: 1 }}
                  >
                    Show the help text at the bottom of the Building Blocks
                    panel.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {showEditorSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
                display: { xs: 'none', lg: 'block' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SearchIcon
                      fontSize="small"
                      sx={{ mr: 1.5, color: 'primary.main' }}
                    />
                    <Typography fontWeight="medium" color="text.primary">
                      Show Advanced Features in Toolbar
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Switch
                      checked={Boolean(showAdvancedInToolbar)}
                      onChange={(e) =>
                        handleAdvancedInToolbarChange(e.target.checked)
                      }
                      color="primary"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 5, mb: 1 }}
                  >
                    Display Templates, Export/Import, and Version History
                    buttons directly in the toolbar for easy access.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {showGlobalSettings && <Divider sx={{ my: 3 }} />}

          {showGlobalSettings && (
            <Typography
              variant="h6"
              gutterBottom
              fontWeight="medium"
              color="text.primary"
            >
              Confirmation Options
            </Typography>
          )}

          {showGlobalSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <DashboardIcon sx={{ mr: 1.5, color: 'error.main' }} />
                    <Typography fontWeight="medium" color="text.primary">
                      Confirm Dashboard Deletion
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Switch
                      checked={Boolean(showDeleteDashboardConfirmation)}
                      onChange={(e) =>
                        handleDeleteDashboardConfirmationChange(
                          e.target.checked,
                        )
                      }
                      color="primary"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 5, mb: 1 }}
                  >
                    Show a confirmation dialog when deleting dashboards.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {showGlobalSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <DeleteOutlineIcon sx={{ mr: 1.5, color: 'error.main' }} />
                    <Typography fontWeight="medium" color="text.primary">
                      Confirm Template Deletion
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Switch
                      checked={Boolean(showDeleteTemplateConfirmation)}
                      onChange={(e) =>
                        handleDeleteTemplateConfirmationChange(e.target.checked)
                      }
                      color="primary"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 5, mb: 1 }}
                  >
                    Show a confirmation dialog when deleting templates.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {showGlobalSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <WidgetsIcon sx={{ mr: 1.5, color: 'error.main' }} />
                    <Typography fontWeight="medium" color="text.primary">
                      Confirm Widget Deletion
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Switch
                      checked={Boolean(showDeleteWidgetConfirmation)}
                      onChange={(e) =>
                        onShowDeleteWidgetConfirmationChange?.(e.target.checked)
                      }
                      color="primary"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 5, mb: 1 }}
                  >
                    Show a confirmation dialog when deleting widgets from the
                    library.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {showGlobalSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <DeleteOutlineIcon sx={{ mr: 1.5, color: 'error.main' }} />
                    <Typography fontWeight="medium" color="text.primary">
                      Confirm Block Deletion
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Switch
                      checked={Boolean(showDeleteConfirmation)}
                      onChange={(e) =>
                        onShowDeleteConfirmationChange?.(e.target.checked)
                      }
                      color="primary"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 5, mb: 1 }}
                  >
                    Show a confirmation dialog when deleting blocks.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {showEditorSettings && (
            <Divider sx={{ my: 3, display: { xs: 'none', sm: 'flex' } }} />
          )}

          {showEditorSettings && (
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                mb: 2.5,
              }}
            >
              <KeyboardIcon
                sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }}
              />
              <Typography variant="h6" fontWeight="medium" color="text.primary">
                Keyboard Shortcuts
              </Typography>
            </Box>
          )}

          {showEditorSettings && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <ShortcutCard
                    icon={<UndoIcon />}
                    title="Undo"
                    shortcut="Ctrl + Z"
                    color="#3f51b5"
                  />

                  <ShortcutCard
                    icon={<RedoIcon />}
                    title="Redo"
                    shortcut="Ctrl + Y"
                    color="#3f51b5"
                  />

                  <ShortcutCard
                    icon={<SaveIcon />}
                    title="Save Widget"
                    shortcut="Ctrl + S"
                    color="#4caf50"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <ShortcutCard
                    icon={<EditIcon />}
                    title="Cycle through both, edit, and preview views"
                    shortcut="Ctrl + E"
                    color="#ff9800"
                  />

                  <ShortcutCard
                    icon={<FolderOpenIcon />}
                    title="Open or close saved widgets"
                    shortcut="Ctrl + O"
                    color="#9c27b0"
                  />

                  <ShortcutCard
                    icon={<SettingsIcon />}
                    title="Open or close settings"
                    shortcut="Ctrl + ,"
                    color="#2196f3"
                  />
                </Grid>
              </Grid>
            </Paper>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: 'primary.light',
            color: '#191919',
            '&:hover': {
              bgcolor: 'primary.main',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog

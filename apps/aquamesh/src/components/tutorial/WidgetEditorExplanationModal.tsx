import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  IconButton,
  Grid,
  Fade,
  Zoom,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import PreviewIcon from '@mui/icons-material/Visibility'
import SaveIcon from '@mui/icons-material/Save'
import WidgetsIcon from '@mui/icons-material/Widgets'
import GridViewIcon from '@mui/icons-material/GridView'
import InputIcon from '@mui/icons-material/Input'
import SmartButtonIcon from '@mui/icons-material/SmartButton'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt'
import FlexibleIcon from '@mui/icons-material/Dashboard'
import PieChartIcon from '@mui/icons-material/PieChart'
import BuildIcon from '@mui/icons-material/Build'
import CategoryIcon from '@mui/icons-material/Category'
import VisibilityIcon from '@mui/icons-material/Visibility'

interface WidgetEditorExplanationModalProps {
  open: boolean
  onClose: () => void
  onCloseTutorial?: () => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

// Add interfaces for the sections data structure
interface EditorSubsection {
  title: string
  icon: React.ReactElement
  content: string
}

interface EditorSection {
  title: string
  content?: string
  subsections?: EditorSubsection[]
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`widget-editor-tabpanel-${index}`}
      aria-labelledby={`widget-editor-tab-${index}`}
      {...other}
      style={{ paddingTop: '20px' }}
    >
      {value === index && (
        <Fade in={true} timeout={500}>
          <Box>{children}</Box>
        </Fade>
      )}
    </div>
  )
}

const WidgetEditorExplanationModal: React.FC<
  WidgetEditorExplanationModalProps
> = ({ open, onClose, onCloseTutorial }) => {
  const [tabValue, setTabValue] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Handler for opening the widget editor
  const handleOpenWidgetEditor = () => {
    // Close this modal
    onClose()

    // Close the tutorial modal if the prop is provided
    if (onCloseTutorial) {
      onCloseTutorial()
    }

    const createWidgetButton = document.querySelector(
      '[data-tutorial-id="create-widget-button"]',
    )
    if (createWidgetButton) {
      ;(createWidgetButton as HTMLElement).click()
    }
  }

  // Section data
  const sections: EditorSection[] = [
    {
      title: 'Create Widget Quick Start',
      content:
        'Create one reusable widget: add a layout block, place a content block inside it, preview, save, then place it from Create Dashboard > Widgets.',
    },
    {
      title: 'Build The Widget',
      subsections: [
        {
          title: 'Name It',
          icon: <EditIcon />,
          content:
            'Give the widget a clear name so it is easy to find later in Saved Widgets.',
        },
        {
          title: 'Add Building Blocks',
          icon: <WidgetsIcon />,
          content: isMobile
            ? 'Tap a layout group first, then tap text, lists, inputs, buttons, or charts to add content inside it.'
            : 'Drag one layout group first, then drag text, lists, inputs, buttons, or charts inside it.',
        },
        {
          title: 'Arrange The Canvas',
          icon: <GridViewIcon />,
          content:
            'Move each item and adjust its wording or display options until the widget is ready to reuse in dashboards.',
        },
      ],
    },
    {
      title: 'Save And Reuse',
      subsections: [
        {
          title: 'Preview',
          icon: <PreviewIcon />,
          content:
            'Check how the widget will look before it appears on a dashboard.',
        },
        {
          title: 'Save',
          icon: <SaveIcon />,
          content:
            'Save the widget to the library. Saved widgets are available from Create Dashboard > Widgets.',
        },
        {
          title: 'Use In Dashboard',
          icon: <WidgetsIcon />,
          content:
            'Open Create Dashboard, choose Widgets, place your saved widget, save the dashboard, then reopen it later from Dashboards.',
        },
      ],
    },
    {
      title: 'Building Blocks You Can Use',
      subsections: [
        {
          title: 'Content and Controls',
          icon: <InputIcon />,
          content:
            'Everyday dashboard items such as text, answer boxes, buttons, switches, and charts.',
        },
        {
          title: 'Layout Helpers',
          icon: <GridViewIcon />,
          content:
            'Helpers that keep related information together or arrange items into rows and columns.',
        },
      ],
    },
    {
      title: 'Content and Controls',
      subsections: [
        {
          title: 'Display Text',
          icon: <TextFieldsIcon />,
          content:
            'Shows helpful text such as a heading, status, instruction, or note. You can choose its size and color.',
        },
        {
          title: 'Answer Box',
          icon: <InputIcon />,
          content:
            'Lets someone type a value, note, or answer. You can choose the expected answer type and helper message.',
        },
        {
          title: 'Button',
          icon: <SmartButtonIcon />,
          content:
            'A button someone can press to show a message or open a link. You can choose the label, style, color, and message.',
        },
        {
          title: 'Switch',
          icon: <ToggleOnIcon />,
          content:
            'A simple on/off choice for statuses like Enabled, Open, or Needs review. You can choose its label and starting state.',
        },
        {
          title: 'Pie Chart',
          icon: <PieChartIcon />,
          content:
            'Shows a simple breakdown, such as ticket categories or incident causes, in a circular chart.',
        },
      ],
    },
    {
      title: 'Layout Helpers',
      subsections: [
        {
          title: 'Grouped Section',
          icon: <ViewQuiltIcon />,
          content:
            'Groups related items under one heading. People can open or close the section to keep a busy widget tidy.',
        },
        {
          title: 'Grid Group',
          icon: <GridViewIcon />,
          content:
            'Arranges items into clear columns, like dashboard cards or summary boxes.',
        },
        {
          title: 'Flexible Group',
          icon: <FlexibleIcon />,
          content:
            'Places items next to each other or stacks them, while adapting to the space available on the screen.',
        },
      ],
    },
  ]

  const tabContent = [
    // Overview tab
    <>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          gutterBottom
          fontWeight="bold"
          color="text.primary"
        >
          {sections[0].title}
        </Typography>
        <Typography variant="body1" paragraph color="text.primary">
          {sections[0].content}
        </Typography>
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            my: 3,
          }}
        >
          <img
            src="/images/widget_editor.png"
            alt="Create Widget interface"
            style={{
              maxWidth: '90%',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
          />
        </Box>
      </Box>

      <Typography
        variant="h5"
        gutterBottom
        fontWeight="bold"
        color="text.primary"
      >
        Key Features
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: 'background.paper',
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                borderColor: 'primary.dark',
              },
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 124, 102, 0.1)',
                  color: 'primary.dark',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  mr: 1.5,
                }}
              >
                <BuildIcon />
              </Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="text.primary"
              >
                1. Create
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Open Create Widget and start with one useful dashboard widget.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: 'background.paper',
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                borderColor: 'primary.dark',
              },
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 124, 102, 0.1)',
                  color: 'primary.dark',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  mr: 1.5,
                }}
              >
                <CategoryIcon />
              </Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="text.primary"
              >
                2. Add Blocks
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Add blocks that match your chosen workflow: status labels, charts,
              notes, images, controls, or layout sections.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: '100%',
              bgcolor: 'background.paper',
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                borderColor: 'primary.dark',
              },
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 124, 102, 0.1)',
                  color: 'primary.dark',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  mr: 1.5,
                }}
              >
                <VisibilityIcon />
              </Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="text.primary"
              >
                3. Save And Use
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Preview, save, then add the saved widget to a dashboard.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </>,

    // Interface tab
    <>
      <Typography
        variant="h5"
        gutterBottom
        fontWeight="bold"
        color="text.primary"
      >
        {sections[1].title}
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {sections[1]?.subsections?.map((subsection, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Zoom in={true} style={{ transitionDelay: `${i * 100}ms` }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  bgcolor: 'background.paper',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                    borderColor: 'primary.dark',
                  },
                }}
              >
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0, 124, 102, 0.1)',
                      color: 'primary.dark',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      mr: 1.5,
                    }}
                  >
                    {subsection.icon}
                  </Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color="text.primary"
                  >
                    {subsection.title}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {subsection.content}
                </Typography>
              </Paper>
            </Zoom>
          </Grid>
        ))}
      </Grid>

      <Typography
        variant="h5"
        gutterBottom
        fontWeight="bold"
        color="text.primary"
        sx={{ mt: 4 }}
      >
        {sections[2].title}
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {sections[2]?.subsections?.map((subsection, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Zoom in={true} style={{ transitionDelay: `${i * 100 + 300}ms` }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  bgcolor: 'background.paper',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                    borderColor: 'primary.dark',
                  },
                }}
              >
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0, 124, 102, 0.1)',
                      color: 'primary.dark',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      mr: 1.5,
                    }}
                  >
                    {subsection.icon}
                  </Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color="text.primary"
                  >
                    {subsection.title}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {subsection.content}
                </Typography>
              </Paper>
            </Zoom>
          </Grid>
        ))}
      </Grid>
    </>,

    // Components tab
    <>
      <Typography
        variant="h5"
        gutterBottom
        fontWeight="bold"
        color="text.primary"
      >
        {sections[4].title}
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {sections[4]?.subsections?.map((subsection, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Zoom in={true} style={{ transitionDelay: `${i * 80}ms` }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  bgcolor: 'background.paper',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                    borderColor: 'primary.dark',
                  },
                }}
              >
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0, 124, 102, 0.1)',
                      color: 'primary.dark',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      mr: 1.5,
                      cursor: 'grab',
                    }}
                  >
                    {subsection.icon}
                  </Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color="text.primary"
                  >
                    {subsection.title}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {subsection.content}
                </Typography>
              </Paper>
            </Zoom>
          </Grid>
        ))}
      </Grid>

      <Typography
        variant="h5"
        gutterBottom
        fontWeight="bold"
        color="text.primary"
        sx={{ mt: 4 }}
      >
        {sections[5].title}
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {sections[5]?.subsections?.map((subsection, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Zoom in={true} style={{ transitionDelay: `${i * 80 + 400}ms` }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  bgcolor: 'background.paper',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                    borderColor: 'primary.dark',
                  },
                }}
              >
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0, 124, 102, 0.1)',
                      color: 'primary.dark',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      mr: 1.5,
                      cursor: 'grab',
                    }}
                  >
                    {subsection.icon}
                  </Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color="text.primary"
                  >
                    {subsection.title}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {subsection.content}
                </Typography>
              </Paper>
            </Zoom>
          </Grid>
        ))}
      </Grid>
    </>,
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      TransitionComponent={Fade}
      transitionDuration={500}
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'background.paper',
          color: 'primary.dark',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center">
          <EditIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Create Widget
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="widget editor explanation tabs"
        centered
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile ? 'auto' : false}
        allowScrollButtonsMobile
        sx={{
          bgcolor: 'background.paper',
          '& .MuiTab-root': {
            color: 'text.secondary',
            fontWeight: 'bold',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            minWidth: isMobile ? 'auto' : 90,
            px: isMobile ? 2 : 3,
            '&.Mui-selected': {
              color: 'primary.dark',
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.dark',
          },
        }}
      >
        <Tab
          label="Quick Start"
          id="widget-editor-tab-0"
          aria-controls="widget-editor-tabpanel-0"
        />
        <Tab
          label="Build"
          id="widget-editor-tab-1"
          aria-controls="widget-editor-tabpanel-1"
        />
        <Tab
          label="Blocks"
          id="widget-editor-tab-2"
          aria-controls="widget-editor-tabpanel-2"
        />
      </Tabs>

      <DialogContent sx={{ p: 3 }}>
        <TabPanel value={tabValue} index={0}>
          {tabContent[0]}
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {tabContent[1]}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          {tabContent[2]}
        </TabPanel>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Button
          onClick={handleOpenWidgetEditor}
          variant="contained"
          size="large"
          startIcon={<EditIcon />}
          sx={{
            bgcolor: 'primary.light',
            color: '#191919',
            px: 3,
            py: 1,
            '&:hover': {
              bgcolor: 'primary.main',
              transform: 'translateY(-3px)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
            },
            transition: 'all 0.2s ease',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          Open Create Widget
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default WidgetEditorExplanationModal

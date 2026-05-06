import React from 'react'
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'

interface WorkspaceHelpModalProps {
  open: boolean
  onClose: () => void
}

const helpSections = [
  {
    title: 'Main workspace buttons',
    items: [
      [
        'Dashboards',
        'Open, create, rename, organize, and color your study dashboards.',
      ],
      [
        'Add Widget',
        'Place starter widgets or saved widgets onto the current dashboard.',
      ],
      [
        'Create Widget',
        'Build your own reusable widget from blocks such as text, lists, images, charts, and inputs.',
      ],
      [
        'Theme',
        'Switch between light and dark mode. AquaMesh starts in light mode for readability.',
      ],
      ['User menu', 'Change accent color or switch account/session options.'],
    ],
  },
  {
    title: 'Widget builder controls',
    items: [
      [
        'Building Blocks',
        'Tap a block on phone, or drag it on desktop, to add it to the widget.',
      ],
      ['Preview', 'Check how the widget will look before saving it.'],
      ['Save', 'Save the widget so it can be reused from Add Widget.'],
      [
        'Edit pencil',
        'Change a block’s text, data, image URL, PDF URL, chart values, or styling.',
      ],
      ['Target icon', 'Choose which container receives new blocks on phone.'],
      ['Eye icon', 'Hide or show a block without deleting it.'],
    ],
  },
  {
    title: 'Knowledge workspace idea',
    items: [
      ['Folders', 'Group dashboards by subject, project, or course.'],
      ['Dashboards', 'Use each dashboard as a visual study page.'],
      [
        'Blocks',
        'Mix formulas, notes, lists, charts, images, PDFs, inputs, and buttons.',
      ],
    ],
  },
]

const WorkspaceHelpModal: React.FC<WorkspaceHelpModalProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>How AquaMesh works</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          AquaMesh is a visual knowledge workspace: organize subjects into
          folders, then build dashboard pages from reusable widgets and blocks.
        </Typography>
        {helpSections.map((section, sectionIndex) => (
          <Box
            key={section.title}
            sx={{ mb: sectionIndex === helpSections.length - 1 ? 0 : 2 }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
              {section.title}
            </Typography>
            <List dense disablePadding>
              {section.items.map(([label, description]) => (
                <ListItem
                  key={label}
                  disableGutters
                  sx={{ alignItems: 'flex-start' }}
                >
                  <ListItemText
                    primary={label}
                    secondary={description}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      variant: 'body2',
                    }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
            {sectionIndex !== helpSections.length - 1 && (
              <Divider sx={{ mt: 1 }} />
            )}
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  )
}

export default WorkspaceHelpModal

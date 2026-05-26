import React from 'react'
import { Box, Slide, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { Theme } from '@mui/material/styles'

import { studioPanelRailWidth, workspaceCanvasSx } from './workspaceStudioModel'

interface WorkspaceMobileLayoutProps {
  children: React.ReactNode
  studioContent: React.ReactNode
  mobileCreationStatusTray: React.ReactNode
  mobileSectionTabs: React.ReactNode
  widgetBuilderDialog: React.ReactNode
  isStudioOpen: boolean
  mobileSection: 'creation' | 'dashboard' | 'ai-chat'
  visibleCreationMarkerCount: number
  theme: Theme
}

export const WorkspaceMobileLayout = ({
  children,
  studioContent,
  mobileCreationStatusTray,
  mobileSectionTabs,
  widgetBuilderDialog,
  isStudioOpen,
  mobileSection,
  visibleCreationMarkerCount,
  theme,
}: WorkspaceMobileLayoutProps) => (
  <Box
    sx={{
      position: 'relative',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      background:
        theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 12% 0%, var(--accent-soft) 0, transparent 34%), linear-gradient(180deg, var(--background-default), var(--background-bar-dark))'
          : 'radial-gradient(circle at 12% 0%, var(--accent-soft) 0, transparent 34%), linear-gradient(180deg, var(--background-default), var(--background-bar-medium))',
      '--studymesh-mobile-generation-tray-height': visibleCreationMarkerCount
        ? '48px'
        : '0px',
      ...(isStudioOpen && mobileSection === 'creation'
        ? {
            '& [data-testid="study-path-navigator-overlay"]': {
              display: 'none',
            },
          }
        : {}),
    }}
  >
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          ...workspaceCanvasSx,
        }}
      >
        {children}
      </Box>
      <Slide
        direction="right"
        in={mobileSection === 'creation'}
        mountOnEnter
        timeout={{ enter: 260, exit: 220 }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            p: '8px',
            boxSizing: 'border-box',
            zIndex: 2,
            bgcolor: 'background.default',
          }}
        >
          <Box
            sx={{
              height: '100%',
              overflow: 'hidden',
              border: 1,
              borderColor: 'var(--studymesh-panel-border)',
              borderRadius: 2,
              bgcolor: 'var(--studymesh-panel-bg)',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 18px 40px rgba(0,0,0,0.42)'
                  : '0 18px 42px rgba(16,24,40,0.10)',
            }}
          >
            {studioContent}
          </Box>
        </Box>
      </Slide>
    </Box>
    {mobileCreationStatusTray}
    {mobileSectionTabs}
    {widgetBuilderDialog}
  </Box>
)

interface WorkspaceDesktopLayoutProps {
  children: React.ReactNode
  studioContent: React.ReactNode
  creationStatusMarkers: React.ReactNode
  widgetBuilderDialog: React.ReactNode
  isStudioOpen: boolean
  studioWidth: number
  openCreateHub: () => void
  startStudioResize: (event: React.MouseEvent<HTMLDivElement>) => void
  theme: Theme
}

export const WorkspaceDesktopLayout = ({
  children,
  studioContent,
  creationStatusMarkers,
  widgetBuilderDialog,
  isStudioOpen,
  studioWidth,
  openCreateHub,
  startStudioResize,
  theme,
}: WorkspaceDesktopLayoutProps) => (
  <Box
    sx={{
      position: 'relative',
      height: '100%',
      display: 'flex',
      overflow: 'hidden',
      bgcolor: 'background.default',
      background:
        theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 8% 0%, var(--accent-soft) 0, transparent 32%), linear-gradient(180deg, var(--background-default), var(--background-bar-dark))'
          : 'radial-gradient(circle at 8% 0%, var(--accent-soft) 0, transparent 32%), linear-gradient(180deg, var(--background-default), var(--background-bar-medium))',
    }}
  >
    <Box
      sx={{
        width: isStudioOpen ? studioWidth : studioPanelRailWidth,
        flex: '0 0 auto',
        minHeight: 0,
        overflow: 'hidden',
        p: '8px 0 8px 8px',
        boxSizing: 'border-box',
        position: 'relative',
        transition: theme.transitions.create(['width'], {
          duration: theme.transitions.duration.shorter,
          easing: theme.transitions.easing.easeInOut,
        }),
      }}
    >
      <Box
        sx={{
          height: '100%',
          overflow: 'hidden',
          border: 1,
          borderColor: 'var(--studymesh-panel-border)',
          borderRadius: 2.5,
          bgcolor: 'var(--studymesh-panel-bg)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 18px 40px rgba(0,0,0,0.42)'
              : '0 18px 42px rgba(16,24,40,0.10)',
          display: isStudioOpen ? 'block' : 'none',
        }}
      >
        {studioContent}
      </Box>
      {!isStudioOpen && (
        <Tooltip title="Open Create" placement="right">
          <Box
            component="button"
            type="button"
            aria-label="Open Create panel"
            onClick={openCreateHub}
            sx={{
              width: '100%',
              height: '100%',
              border: 1,
              borderColor: 'var(--studymesh-panel-border)',
              borderRadius: 2.5,
              bgcolor: 'var(--studymesh-panel-bg)',
              color: 'primary.main',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 12px 32px rgba(0,0,0,0.32)'
                  : '0 12px 30px rgba(16,24,40,0.12)',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <AddIcon fontSize="small" />
            <Typography
              variant="caption"
              sx={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                fontWeight: 800,
                letterSpacing: 0.4,
              }}
            >
              Create
            </Typography>
          </Box>
        </Tooltip>
      )}
      {isStudioOpen && (
        <Box
          role="separator"
          aria-label="Resize Create panel"
          onMouseDown={startStudioResize}
          sx={{
            position: 'absolute',
            top: 14,
            right: -3,
            width: 8,
            height: 'calc(100% - 28px)',
            cursor: 'col-resize',
            zIndex: 2,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 3,
              width: 2,
              borderRadius: 999,
              bgcolor: 'divider',
            },
            '&:hover::after': { bgcolor: 'primary.main' },
          }}
        />
      )}
    </Box>
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        ...workspaceCanvasSx,
        transition: theme.transitions.create('padding', {
          duration: theme.transitions.duration.shorter,
        }),
      }}
    >
      <Box
        sx={{
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: 'var(--studymesh-panel-bg)',
          border: 1,
          borderColor: 'var(--studymesh-panel-border)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
              : '0 10px 34px rgba(15,23,42,0.06)',
        }}
      >
        {children}
      </Box>
    </Box>
    {creationStatusMarkers}
    {widgetBuilderDialog}
  </Box>
)

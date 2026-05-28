import React, { useMemo, useState } from 'react'
import {
  Box,
  ButtonBase,
  Checkbox,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import DashboardIcon from '@mui/icons-material/Dashboard'
import { KnowledgeReferenceTarget } from '../../knowledgeReferences'

export type StudyLinkPickerTab = 'studyPaths' | 'sections' | 'dashboards'

export interface StudyLinkPickerOption {
  id: string
  target: KnowledgeReferenceTarget
  description?: string
  parentTitle?: string
}

interface StudyLinkPickerProps {
  options: StudyLinkPickerOption[]
  selectedOptionIds: string[]
  onSelectedOptionIdsChange: (optionIds: string[]) => void
  initialTab?: StudyLinkPickerTab
}

const tabLabels: Record<StudyLinkPickerTab, string> = {
  studyPaths: 'Study Paths',
  sections: 'Sections',
  dashboards: 'Dashboards',
}

const getOptionTab = (option: StudyLinkPickerOption): StudyLinkPickerTab => {
  if (option.target.type === 'studyPath') {
    return 'studyPaths'
  }

  if (option.target.type === 'studyPathSection') {
    return 'sections'
  }

  return 'dashboards'
}

const getOptionIcon = (option: StudyLinkPickerOption) =>
  option.target.type === 'dashboard' ? (
    <DashboardIcon fontSize="small" />
  ) : (
    <AutoStoriesIcon fontSize="small" />
  )

export const StudyLinkPicker = ({
  options,
  selectedOptionIds,
  onSelectedOptionIdsChange,
  initialTab,
}: StudyLinkPickerProps) => {
  const selectedOption = options.find(
    (option) => option.id === selectedOptionIds[0],
  )
  const [activeTab, setActiveTab] = useState<StudyLinkPickerTab>(
    initialTab ||
      (selectedOption ? getOptionTab(selectedOption) : 'studyPaths'),
  )

  const optionsByTab = useMemo(
    () =>
      options.reduce<Record<StudyLinkPickerTab, StudyLinkPickerOption[]>>(
        (groups, option) => {
          groups[getOptionTab(option)].push(option)
          return groups
        },
        { studyPaths: [], sections: [], dashboards: [] },
      ),
    [options],
  )

  const visibleOptions = optionsByTab[activeTab]
  const sectionGroups = useMemo(() => {
    if (activeTab !== 'sections') {
      return []
    }

    const groups = new Map<string, StudyLinkPickerOption[]>()
    visibleOptions.forEach((option) => {
      const parentTitle =
        option.parentTitle || option.target.subtitle || 'Study Path'
      groups.set(parentTitle, [...(groups.get(parentTitle) || []), option])
    })
    return Array.from(groups.entries())
  }, [activeTab, visibleOptions])

  const renderOption = (option: StudyLinkPickerOption) => {
    const selected = selectedOptionIds.includes(option.id)

    return (
      <ButtonBase
        key={option.id}
        onClick={() => {
          onSelectedOptionIdsChange(
            selected
              ? selectedOptionIds.filter((optionId) => optionId !== option.id)
              : [...selectedOptionIds, option.id],
          )
        }}
        sx={{
          width: '100%',
          display: 'block',
          textAlign: 'left',
          border: 1,
          borderColor: selected ? 'primary.main' : 'divider',
          borderRadius: 1,
          p: 1.25,
          bgcolor: selected ? 'action.selected' : 'background.paper',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              bgcolor: selected ? 'primary.main' : 'action.hover',
              color: selected ? 'primary.contrastText' : 'text.secondary',
              flex: '0 0 auto',
            }}
          >
            {getOptionIcon(option)}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={850} noWrap>
              {option.target.title}
            </Typography>
            {(option.description || option.target.subtitle) && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {option.description || option.target.subtitle}
              </Typography>
            )}
          </Box>
          <Checkbox
            checked={selected}
            tabIndex={-1}
            disableRipple
            inputProps={{
              'aria-label': selected
                ? `Remove ${option.target.title}`
                : `Select ${option.target.title}`,
            }}
            sx={{ p: 0.25, flex: '0 0 auto' }}
          />
        </Stack>
      </ButtonBase>
    )
  }

  return (
    <Stack spacing={1.5}>
      <Tabs
        value={activeTab}
        onChange={(_, value: StudyLinkPickerTab) => setActiveTab(value)}
        variant="fullWidth"
      >
        {(Object.keys(tabLabels) as StudyLinkPickerTab[]).map((tab) => (
          <Tab
            key={tab}
            value={tab}
            label={`${tabLabels[tab]} (${optionsByTab[tab].length})`}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          />
        ))}
      </Tabs>

      {visibleOptions.length === 0 ? (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            No {tabLabels[activeTab].toLowerCase()} available.
          </Typography>
        </Box>
      ) : activeTab === 'sections' ? (
        <Stack spacing={1.25}>
          {sectionGroups.map(([parentTitle, groupOptions]) => (
            <Stack key={parentTitle} spacing={0.75}>
              <Chip
                label={parentTitle}
                size="small"
                sx={{ alignSelf: 'flex-start', fontWeight: 800 }}
              />
              {groupOptions.map(renderOption)}
            </Stack>
          ))}
        </Stack>
      ) : (
        <Stack spacing={0.75}>{visibleOptions.map(renderOption)}</Stack>
      )}
    </Stack>
  )
}

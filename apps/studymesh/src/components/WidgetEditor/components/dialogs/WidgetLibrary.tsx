import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  IconButton,
  Box,
  Paper,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
  InputLabel,
  Grid,
  Fade,
  CircularProgress,
  Checkbox,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import WidgetsIcon from '@mui/icons-material/Widgets'
import SearchIcon from '@mui/icons-material/Search'
import SortIcon from '@mui/icons-material/Sort'
import CloseIcon from '@mui/icons-material/Close'
import { CustomWidget } from '../../WidgetStorage'
import DeleteConfirmationDialog from './DeleteConfirmationDialog'

// Sorting options
type SortOption =
  | 'dateNewest'
  | 'dateOldest'
  | 'nameAsc'
  | 'nameDesc'
  | 'mostComponents'
  | 'fewestComponents'

interface WidgetManagementModalProps {
  open: boolean
  onClose: () => void
  widgets: CustomWidget[]
  onPreview: (widget: CustomWidget) => void
  onEdit: (widget: CustomWidget) => void
  onDelete: (id: string) => void
}

const WidgetManagementModal: React.FC<WidgetManagementModalProps> = ({
  open,
  onClose,
  widgets,
  onEdit,
  onDelete,
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState('')

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('dateNewest')

  // Loading state for operations
  const [isLoading, setIsLoading] = useState(false)

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [widgetToDelete, setWidgetToDelete] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleteSelectedIds, setBulkDeleteSelectedIds] = useState<string[]>(
    [],
  )

  // Clear search when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setIsLoading(false)
    }
  }, [open])

  // Function to check if delete confirmation is enabled
  const shouldConfirmDelete = (): boolean => {
    try {
      const storedValue = localStorage.getItem(
        'widget-editor-delete-widget-confirmation',
      )
      return storedValue !== 'false' // Default to true if not set
    } catch (error) {
      console.error(
        'Error reading widget-editor-delete-widget-confirmation from localStorage',
        error,
      )
      return true // Default to true if there's an error
    }
  }

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent, widgetId: string) => {
    e.stopPropagation()

    if (shouldConfirmDelete()) {
      // Show confirmation dialog if enabled
      setWidgetToDelete(widgetId)
      setDeleteConfirmOpen(true)
    } else {
      // Delete directly if confirmation is disabled
      onDelete(widgetId)
    }
  }

  // Confirm deletion
  const confirmDelete = () => {
    if (widgetToDelete) {
      onDelete(widgetToDelete)
      setDeleteConfirmOpen(false)
      setWidgetToDelete(null)
    }
  }

  // Cancel deletion
  const cancelDelete = () => {
    setDeleteConfirmOpen(false)
    setWidgetToDelete(null)
  }

  // Handle delete all button click
  const handleDeleteAllClick = () => {
    setBulkDeleteSelectedIds(widgets.map((widget) => widget.id))
    setBulkDeleteOpen(true)
  }

  const confirmBulkDelete = () => {
    bulkDeleteSelectedIds.forEach((widgetId) => onDelete(widgetId))
    setBulkDeleteOpen(false)
    setBulkDeleteSelectedIds([])
  }

  const cancelBulkDelete = () => {
    setBulkDeleteOpen(false)
    setBulkDeleteSelectedIds([])
  }

  const toggleBulkDeleteWidget = (widgetId: string) => {
    setBulkDeleteSelectedIds((selectedIds) =>
      selectedIds.includes(widgetId)
        ? selectedIds.filter((id) => id !== widgetId)
        : [...selectedIds, widgetId],
    )
  }

  const setBulkDeleteCategorySelected = (
    categoryName: string,
    selected: boolean,
  ) => {
    const categoryWidgetIds = widgets
      .filter((widget) => (widget.category || 'Other') === categoryName)
      .map((widget) => widget.id)

    setBulkDeleteSelectedIds((selectedIds) => {
      const nextIds = new Set(selectedIds)

      categoryWidgetIds.forEach((id) => {
        if (selected) {
          nextIds.add(id)
        } else {
          nextIds.delete(id)
        }
      })

      return Array.from(nextIds)
    })
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Handle sort change
  const handleSortChange = (e: SelectChangeEvent) => {
    setSortBy(e.target.value as SortOption)
  }

  // Filter widgets based on search term
  const filteredWidgets = useMemo(() => {
    if (!searchTerm.trim()) {
      return widgets
    }

    const term = searchTerm.toLowerCase()
    return widgets.filter((widget) => widget.name.toLowerCase().includes(term))
  }, [widgets, searchTerm])

  // Sort filtered widgets
  const sortedWidgets = useMemo(() => {
    return [...filteredWidgets].sort((a, b) => {
      switch (sortBy) {
        case 'nameAsc':
          return a.name.localeCompare(b.name)
        case 'nameDesc':
          return b.name.localeCompare(a.name)
        case 'dateNewest':
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        case 'dateOldest':
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          )
        case 'mostComponents':
          return b.components.length - a.components.length
        case 'fewestComponents':
          return a.components.length - b.components.length
        default:
          return 0
      }
    })
  }, [filteredWidgets, sortBy])

  const bulkDeleteGroups = useMemo(() => {
    const groups = new Map<string, CustomWidget[]>()

    widgets.forEach((widget) => {
      const categoryName = widget.category || 'Other'
      groups.set(categoryName, [...(groups.get(categoryName) || []), widget])
    })

    return Array.from(groups.entries())
      .map(([categoryName, categoryWidgets]) => ({
        categoryName,
        widgets: [...categoryWidgets].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
  }, [widgets])

  // Format date to human-readable format
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      console.error('Invalid date format:', dateString)
      return 'Unknown date'
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            pb: 1,
            borderBottom: 1,
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            zIndex: 1200,
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WidgetsIcon sx={{ mr: 1 }} />
              <Typography
                variant="h5"
                component="div"
                fontWeight="bold"
                sx={{
                  color: 'text.primary',
                }}
              >
                Saved Widgets
              </Typography>
            </Box>

            <Box display="flex" alignItems="center">
              <IconButton
                aria-label="close"
                onClick={onClose}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
          {/* Search and Sort Controls */}
          <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search saved widgets by name or purpose..."
                value={searchTerm}
                onChange={handleSearchChange}
                variant="outlined"
                size="small"
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm('')}
                        sx={{ color: 'text.secondary' }}
                        disabled={isLoading}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'divider',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
                sx={{
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl
                fullWidth
                size="small"
                variant="outlined"
                disabled={isLoading}
              >
                <InputLabel id="sort-by-label" sx={{ color: 'text.secondary' }}>
                  Sort Widgets
                </InputLabel>
                <Select
                  labelId="sort-by-label"
                  value={sortBy}
                  onChange={handleSortChange}
                  label="Sort Widgets"
                  startAdornment={
                    <InputAdornment position="start">
                      <SortIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  sx={{
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'divider',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <MenuItem value="nameAsc">Name (A-Z)</MenuItem>
                  <MenuItem value="nameDesc">Name (Z-A)</MenuItem>
                  <MenuItem value="dateNewest">Newest First</MenuItem>
                  <MenuItem value="dateOldest">Oldest First</MenuItem>
                  <MenuItem value="mostComponents">Most Items</MenuItem>
                  <MenuItem value="fewestComponents">Fewest Items</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Widget editor status info */}
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {sortedWidgets.length === 0
                ? 'No saved widgets found'
                : `Showing ${sortedWidgets.length} saved widget${sortedWidgets.length !== 1 ? 's' : ''}`}
              {searchTerm && ` matching "${searchTerm}"`}
            </Typography>
            {sortedWidgets.length > 0 && (
              <Tooltip title="Delete All Saved Widgets">
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleDeleteAllClick}
                  disabled={isLoading || widgets.length === 0}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Loading overlay */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: 2,
              }}
            >
              <CircularProgress
                size={60}
                sx={{ color: 'primary.light', mb: 2 }}
              />
              <Typography variant="h6" color="white">
                Loading saved widgets...
              </Typography>
            </Box>
          )}

          {/* Widget cards */}
          {sortedWidgets.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                color: 'text.secondary',
                opacity: 0.7,
                textAlign: 'center',
              }}
            >
              <WidgetsIcon sx={{ fontSize: 64, mb: 2, opacity: 0.6 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No Saved Widgets Found
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: 400 }}>
                {searchTerm
                  ? `No saved widgets match your search for "${searchTerm}"`
                  : 'Create a widget for a real use case, save it here, then reuse it in any dashboard.'}
              </Typography>
            </Box>
          ) : (
            <List
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(auto-fill, minmax(240px, 1fr))',
                  md: 'repeat(auto-fill, minmax(320px, 1fr))',
                },
                gap: 2,
                pb: 2,
                px: 0,
              }}
            >
              {sortedWidgets.map((widget, index) => (
                <Fade
                  key={widget.id}
                  in={true}
                  timeout={300}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <Paper
                    elevation={3}
                    sx={{
                      width: '100%',
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.12)',
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => onEdit(widget)}
                  >
                    {/* Widget Header */}
                    <Box
                      sx={{
                        bgcolor: 'rgba(0, 124, 102, 0.08)',
                        color: 'text.primary',
                        p: { xs: 1, sm: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WidgetsIcon sx={{ mr: 1 }} />
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: { xs: '0.7rem', sm: '1rem' },
                          }}
                        >
                          {widget.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${widget.components.length} ${widget.components.length === 1 ? 'block' : 'blocks'}`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(0, 124, 102, 0.12)',
                          color: 'primary.dark',
                          fontWeight: 'bold',
                          '& .MuiChip-label': {
                            fontSize: { xs: '0.6rem', sm: '0.875rem' },
                          },
                        }}
                      />
                    </Box>

                    {/* Widget Info */}
                    <Box sx={{ p: { xs: 1, sm: 2 }, color: 'text.primary' }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: { xs: 0.5, sm: 1 },
                          fontSize: { xs: '0.65rem', sm: '0.875rem' },
                        }}
                      >
                        Last updated: {formatDate(widget.updatedAt)}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: { xs: 0.5, sm: 1 },
                          fontSize: { xs: '0.65rem', sm: '0.875rem' },
                        }}
                      >
                        Created: {formatDate(widget.createdAt)}
                      </Typography>

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mr: 1 }}
                        >
                          Click card to open
                        </Typography>
                        <Tooltip title="Delete Widget">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => handleDeleteClick(e, widget.id)}
                            sx={{
                              bgcolor: 'rgba(211, 47, 47, 0.1)',
                              '&:hover': {
                                bgcolor: 'rgba(211, 47, 47, 0.2)',
                              },
                            }}
                            disabled={isLoading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Paper>
                </Fade>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
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
              bgcolor: 'primary.dark',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.main',
              },
            }}
            disabled={isLoading}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        title="Delete Saved Widget"
        content="Are you sure you want to delete this saved widget?"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <Dialog
        open={bulkDeleteOpen}
        onClose={cancelBulkDelete}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Delete All Saved Widgets
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select the exact widgets to delete.
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'background.default', p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {bulkDeleteSelectedIds.length} of {widgets.length} widget
            {widgets.length === 1 ? '' : 's'} selected.
          </Typography>
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {bulkDeleteGroups.map(({ categoryName, widgets }) => {
              const categoryIds = widgets.map((widget) => widget.id)
              const selectedInCategory = categoryIds.filter((id) =>
                bulkDeleteSelectedIds.includes(id),
              )
              const categoryChecked =
                selectedInCategory.length === widgets.length
              const categoryIndeterminate =
                selectedInCategory.length > 0 &&
                selectedInCategory.length < widgets.length

              return (
                <Paper
                  key={categoryName}
                  elevation={0}
                  sx={{
                    mb: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      bgcolor: 'rgba(0, 124, 102, 0.08)',
                    }}
                  >
                    <Checkbox
                      checked={categoryChecked}
                      indeterminate={categoryIndeterminate}
                      onChange={(event) =>
                        setBulkDeleteCategorySelected(
                          categoryName,
                          event.target.checked,
                        )
                      }
                      inputProps={{
                        'aria-label': `Select ${categoryName} category widgets`,
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={800}>{categoryName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {widgets.length} widget{widgets.length === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                  </Box>
                  {widgets.map((widget) => (
                    <Box
                      key={widget.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        borderTop: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Checkbox
                        checked={bulkDeleteSelectedIds.includes(widget.id)}
                        onChange={() => toggleBulkDeleteWidget(widget.id)}
                        inputProps={{
                          'aria-label': `Select ${widget.name}`,
                        }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {widget.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {widget.components.length} block
                          {widget.components.length === 1 ? '' : 's'} · Updated{' '}
                          {formatDate(widget.updatedAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            px: 2,
            py: 1.5,
          }}
        >
          <Button onClick={cancelBulkDelete}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={bulkDeleteSelectedIds.length === 0}
            onClick={confirmBulkDelete}
            startIcon={<DeleteIcon />}
          >
            Delete selected
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default WidgetManagementModal

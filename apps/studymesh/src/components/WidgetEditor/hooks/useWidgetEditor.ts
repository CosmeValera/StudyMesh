import { useState, useRef, useEffect } from 'react'
import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ComponentData,
  WidgetData,
  DropTarget,
  WidgetEditorViewMode,
} from '../types/types'
import { COMPONENT_TYPES } from '../constants/componentTypes'
import {
  findComponentById,
  updateComponentById,
  removeComponentById,
  moveComponent,
} from '../utils/componentUtils'
import WidgetStorage, {
  CustomWidget,
  WIDGET_STORAGE_UPDATED,
} from '../WidgetStorage'

// Maximum history states to keep
const MAX_HISTORY_STATES = 50

// Debounce delay for name changes in milliseconds
const NAME_CHANGE_DEBOUNCE_DELAY = 750
const DEFAULT_WIDGET_NAME = 'New Widget'

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getUniqueWidgetName = (
  requestedName: string,
  widgets: CustomWidget[],
  ignoreWidgetId?: string,
) => {
  const baseName = requestedName.trim() || DEFAULT_WIDGET_NAME
  const usedNames = new Set(
    widgets
      .filter((widget) => widget.id !== ignoreWidgetId)
      .map((widget) => widget.name),
  )

  if (!usedNames.has(baseName)) {
    return baseName
  }

  const suffixPattern = new RegExp(`^${escapeRegExp(baseName)} \\((\\d+)\\)$`)
  let nextSuffix = 2

  usedNames.forEach((name) => {
    const match = name.match(suffixPattern)
    if (match) {
      nextSuffix = Math.max(nextSuffix, Number(match[1]) + 1)
    }
  })

  let candidate = `${baseName} (${nextSuffix})`
  while (usedNames.has(candidate)) {
    nextSuffix += 1
    candidate = `${baseName} (${nextSuffix})`
  }

  return candidate
}

// Interface for tracking widget history
interface WidgetHistoryItem extends WidgetData {
  widgetId?: string // Optional ID to identify the source widget
}

/**
 * Custom hook for managing widget editor state and logic
 */
export const useWidgetEditor = () => {
  // Generate a unique identifier for this widget editor instance
  const [editorId] = useState<string>(() => uuidv4())

  // Active container for adding components (null means add to root)
  const [activeContainerId, setActiveContainerId] = useState<string | null>(
    null,
  )

  // Widget data and editor state
  const [widgetData, setWidgetData] = useState<WidgetData>({
    name: 'New Widget',
    components: [],
  })
  const [viewMode, setViewMode] = useState<WidgetEditorViewMode>('both')
  const editMode = viewMode !== 'preview'
  const setEditMode = React.useCallback((nextEditMode: boolean) => {
    setViewMode(nextEditMode ? 'edit' : 'preview')
  }, [])
  // Saved widgets management
  const [savedWidgets, setSavedWidgets] = useState<CustomWidget[]>([])
  const [showWidgetList, setShowWidgetList] = useState(false)

  // Component editing
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentEditComponent, setCurrentEditComponent] =
    useState<ComponentData | null>(null)

  // Confirmation dialogs for deletion
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [componentToDelete, setComponentToDelete] = useState<string | null>(
    null,
  )
  const [widgetToDelete, setWidgetToDelete] = useState<string | null>(null)

  // Drag and drop state
  const [dropTarget, setDropTarget] = useState<DropTarget>({
    id: null,
    isHovering: false,
  })
  const dropAreaRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Settings state
  const [stayOpen, setStayOpen] = useState<boolean>(() => {
    const savedValue = localStorage.getItem('widget-editor-stay-open')
    return savedValue ? JSON.parse(savedValue) : true
  })
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showTooltips, setShowTooltips] = useState<boolean>(() => {
    const savedValue = localStorage.getItem('widget-editor-show-tooltips')
    return savedValue ? JSON.parse(savedValue) : false
  })
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(
    () => {
      const savedValue = localStorage.getItem(
        'widget-editor-delete-component-confirmation',
      )
      return savedValue ? JSON.parse(savedValue) : true
    },
  )
  const [showDeleteWidgetConfirmation, setShowDeleteWidgetConfirmation] =
    useState<boolean>(() => {
      const savedValue = localStorage.getItem(
        'widget-editor-delete-widget-confirmation',
      )
      return savedValue ? JSON.parse(savedValue) : true
    })
  const [showComponentPaletteHelp, setShowComponentPaletteHelp] =
    useState<boolean>(() => {
      const savedValue = localStorage.getItem('widget-editor-show-palette-help')
      return savedValue ? JSON.parse(savedValue) : false
    })

  // Dashboard deletion confirmation setting
  const [showDeleteDashboardConfirmation, setShowDeleteDashboardConfirmation] =
    useState<boolean>(() => {
      const savedValue = localStorage.getItem(
        'widget-editor-delete-dashboard-confirmation',
      )
      return savedValue ? JSON.parse(savedValue) : true
    })

  // Advanced features toolbar setting
  const [showAdvancedInToolbar, setShowAdvancedInToolbar] = useState<boolean>(
    () => {
      const savedValue = localStorage.getItem(
        'widget-editor-show-advanced-in-toolbar',
      )
      return savedValue ? JSON.parse(savedValue) : false
    },
  )

  // Confirmation dialog for template deletion setting
  const [showDeleteTemplateConfirmation, setShowDeleteTemplateConfirmation] =
    useState<boolean>(() => {
      const saved = localStorage.getItem(
        'widget-editor-delete-template-confirmation',
      )
      return saved ? JSON.parse(saved) : true
    })

  // History states for undo/redo functionality
  const [history, setHistory] = useState<WidgetHistoryItem[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false)

  // Ref for tracking the name change timeout
  const nameChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  // Flag to prevent recording history for widget name changes
  const [isChangingName, setIsChangingName] = useState(false)

  // Current active widget ID for history tracking between widgets
  const [currentWidgetId, setCurrentWidgetId] = useState<string | undefined>(
    undefined,
  )

  // Additional flag to prevent duplicate dialog events
  const [, setIsSaveDialogRequested] = useState(false)

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('widget-editor-stay-open', JSON.stringify(stayOpen))
  }, [stayOpen])

  useEffect(() => {
    localStorage.setItem(
      'widget-editor-show-tooltips',
      JSON.stringify(showTooltips),
    )
  }, [showTooltips])

  useEffect(() => {
    localStorage.setItem(
      'widget-editor-delete-component-confirmation',
      JSON.stringify(showDeleteConfirmation),
    )
  }, [showDeleteConfirmation])

  useEffect(() => {
    localStorage.setItem(
      'widget-editor-delete-widget-confirmation',
      JSON.stringify(showDeleteWidgetConfirmation),
    )
  }, [showDeleteWidgetConfirmation])

  useEffect(() => {
    localStorage.setItem(
      'widget-editor-show-palette-help',
      JSON.stringify(showComponentPaletteHelp),
    )
  }, [showComponentPaletteHelp])

  useEffect(() => {
    localStorage.setItem(
      'widget-editor-delete-dashboard-confirmation',
      JSON.stringify(showDeleteDashboardConfirmation),
    )
  }, [showDeleteDashboardConfirmation])

  useEffect(() => {
    localStorage.setItem(
      'widget-editor-show-advanced-in-toolbar',
      JSON.stringify(showAdvancedInToolbar),
    )
  }, [showAdvancedInToolbar])

  useEffect(() => {
    localStorage.setItem(
      'widget-editor-delete-template-confirmation',
      JSON.stringify(showDeleteTemplateConfirmation),
    )
  }, [showDeleteTemplateConfirmation])

  // Record widget data changes to history
  useEffect(() => {
    // Skip recording if this change was from an undo/redo action
    if (isUndoRedoAction) {
      setIsUndoRedoAction(false)
      // Skipping history recording - undo/redo action
      return
    }

    // Skip recording if we're in the middle of changing the widget name
    if (isChangingName) {
      // Skipping history recording - name change in progress
      return
    }

    // Skip recording if the widget data hasn't meaningfully changed
    // This helps prevent duplicate entries when loading widgets or undoing/redoing
    if (history.length > 0 && historyIndex >= 0) {
      const currentHistoryItem = history[historyIndex]

      // Compare current widget name and ID to prevent duplicates when switching widgets
      if (
        currentHistoryItem?.name === widgetData.name &&
        currentHistoryItem?.widgetId === currentWidgetId
      ) {
        // For deeper comparison, check if components are equivalent
        // We need to handle when the histories are equal and no need to record
        const currentComponents = JSON.stringify(currentHistoryItem.components)
        const newComponents = JSON.stringify(widgetData.components)

        if (currentComponents === newComponents) {
          // Skipping history recording - no meaningful change
          return
        }
      }
    }

    // Deep clone the widget data to ensure history separation
    const stateToSave: WidgetHistoryItem = {
      ...JSON.parse(JSON.stringify(widgetData)),
      widgetId: currentWidgetId,
    }

    // If we're in the middle of the history and make a change,
    // we should truncate the future history
    if (historyIndex >= 0 && historyIndex < history.length - 1) {
      const newHistory = history.slice(0, historyIndex + 1)
      setHistory([...newHistory, stateToSave])
      setHistoryIndex(historyIndex + 1)
    } else {
      // Normal case: add to history and increment index
      setHistory((prev) => {
        // Limit history size by removing oldest states if needed
        const newHistory =
          prev.length >= MAX_HISTORY_STATES
            ? [...prev.slice(prev.length - MAX_HISTORY_STATES + 1), stateToSave]
            : [...prev, stateToSave]
        return newHistory
      })
      setHistoryIndex((prev) => prev + 1)
    }
  }, [widgetData, currentWidgetId, isChangingName])

  // Handler for widget name changes with debouncing
  const handleWidgetNameChange = (newName: string) => {
    // Mark that we're changing the name - prevents history recording during typing
    setIsChangingName(true)

    // Update widget data with new name immediately for UI responsiveness
    setWidgetData((prev) => ({
      ...prev,
      name: newName,
    }))

    // Clear any existing timeout
    if (nameChangeTimeoutRef.current) {
      clearTimeout(nameChangeTimeoutRef.current)
    }

    // Set a new timeout to record history after typing stops
    nameChangeTimeoutRef.current = setTimeout(() => {
      setIsChangingName(false)
      // This will trigger the useEffect above after the debounce period
      // which will record the name change in history
    }, NAME_CHANGE_DEBOUNCE_DELAY)
  }

  // Clean up the timeout on component unmount
  useEffect(() => {
    return () => {
      if (nameChangeTimeoutRef.current) {
        clearTimeout(nameChangeTimeoutRef.current)
      }
    }
  }, [])

  // Handle undo action
  const handleUndo = () => {
    if (historyIndex > 0) {
      // Already moving back in history
      setIsUndoRedoAction(true)

      const prevState = history[historyIndex - 1]
      const newHistoryIndex = historyIndex - 1

      // Set current widget ID when undoing to a different widget
      if (prevState.widgetId !== currentWidgetId) {
        // We're undoing to a different widget
        setCurrentWidgetId(prevState.widgetId)
      }

      // Copy previous state and remove widgetId and version to preserve the current version
      const stateWithoutVersion = { ...prevState }
      delete stateWithoutVersion.widgetId
      delete stateWithoutVersion.version
      // Set history index before updating widget data to prevent race conditions
      setHistoryIndex(newHistoryIndex)
      // Update widget data by merging previous state fields, preserving version
      setWidgetData((prev) => ({
        ...prev,
        ...stateWithoutVersion,
      }))
    }
  }

  // Handle redo action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      // Already moving forward in history
      setIsUndoRedoAction(true)

      const nextState = history[historyIndex + 1]
      const newHistoryIndex = historyIndex + 1

      // Set current widget ID when redoing to a different widget
      if (nextState.widgetId !== currentWidgetId) {
        // We're redoing to a different widget
        setCurrentWidgetId(nextState.widgetId)
      }

      // Copy next state and remove widgetId and version to preserve the current version
      const stateWithoutVersion = { ...nextState }
      delete stateWithoutVersion.widgetId
      delete stateWithoutVersion.version
      // Set history index before updating widget data to prevent race conditions
      setHistoryIndex(newHistoryIndex)
      // Update widget data by merging next state fields, preserving version
      setWidgetData((prev) => ({
        ...prev,
        ...stateWithoutVersion,
      }))
    }
  }

  // Load saved widgets on component mount and listen for widget storage update events
  useEffect(() => {
    // Initial load of saved widgets
    setSavedWidgets(WidgetStorage.getAllWidgets())

    // Listen for widget storage updates (when widgets are deleted through TopNavBar)
    const handleWidgetUpdate = () => {
      setSavedWidgets(WidgetStorage.getAllWidgets())
    }

    // Add event listener for widget storage updates
    document.addEventListener(WIDGET_STORAGE_UPDATED, handleWidgetUpdate)

    // Clean up event listener on component unmount
    return () => {
      document.removeEventListener(WIDGET_STORAGE_UPDATED, handleWidgetUpdate)
    }
  }, [])

  // Listen for direct component add events from ComponentPalette
  useEffect(() => {
    const handleDirectAdd = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail && customEvent.detail.componentType) {
        const componentType = customEvent.detail.componentType

        // Find the component configuration
        const componentConfig = COMPONENT_TYPES.find(
          (c) => c.type === componentType,
        )

        if (componentConfig) {
          // Create a new component
          const newComponent: ComponentData = {
            id: `${componentType}-${Date.now()}`,
            type: componentType,
            props: { ...componentConfig.defaultProps },
          }

          // If we have an active container, add the component to that container
          if (activeContainerId) {
            // Find the container component
            const container = findComponentById(
              activeContainerId,
              widgetData.components,
            )

            if (
              container &&
              ['FieldSet', 'FlexBox', 'GridBox'].includes(container.type)
            ) {
              // Add to the container's children
              const updatedContainer = {
                ...container,
                children: [...(container.children || []), newComponent],
              }

              // Update the widget data
              setWidgetData((prev) => ({
                ...prev,
                components: updateComponentById(
                  activeContainerId,
                  updatedContainer,
                  prev.components,
                ),
              }))

              return
            }
          }

          // If no active container or container not found, add to root level
          setWidgetData((prev) => ({
            ...prev,
            components: [...prev.components, newComponent],
          }))
        }
      }
    }

    // Add event listener
    document.addEventListener('addComponentDirectly', handleDirectAdd)

    // Clean up
    return () => {
      document.removeEventListener('addComponentDirectly', handleDirectAdd)
    }
  }, [activeContainerId])

  // Listen for loadWidgetInEditor events from widget management
  useEffect(() => {
    const handleExternalWidgetLoad = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail && customEvent.detail.widget) {
        const widget = customEvent.detail.widget as CustomWidget
        const shouldEditMode = Boolean(customEvent.detail.editMode)

        // Set flag to prevent recording in history
        setIsUndoRedoAction(true)

        // Update the current widget ID for history tracking
        setCurrentWidgetId(widget.id)

        // Update edit mode
        setEditMode(shouldEditMode)

        // Set widget data with deep clone to avoid reference issues
        setWidgetData({
          id: widget.id,
          name: widget.name,
          components: JSON.parse(JSON.stringify(widget.components)),
          version: widget.version,
        })
      }
    }

    document.addEventListener('loadWidgetInEditor', handleExternalWidgetLoad)

    return () => {
      document.removeEventListener(
        'loadWidgetInEditor',
        handleExternalWidgetLoad,
      )
    }
  }, [])

  // Listen for reset of save dialog requested flag
  useEffect(() => {
    const handleResetSaveDialogRequested = (event: Event) => {
      const customEvent = event as CustomEvent
      // Only reset the flag if the event is for this editor instance
      if (!customEvent.detail || customEvent.detail.editorId === editorId) {
        setIsSaveDialogRequested(false)
      }
    }

    document.addEventListener(
      'resetSaveDialogRequested',
      handleResetSaveDialogRequested,
    )

    return () => {
      document.removeEventListener(
        'resetSaveDialogRequested',
        handleResetSaveDialogRequested,
      )
    }
  }, [editorId]) // Add editorId as dependency

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save with Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSaveWidget()
      }

      // Cycle between editor view modes with Ctrl+E
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        toggleEditMode()
      }

      // Toggle widget list with Ctrl+O
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        setShowWidgetList((prev) => !prev)
      }

      // Toggle settings with Ctrl+, (comma)
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        setShowSettingsModal((prev) => !prev)
      }

      // Undo with Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }

      // Redo with Ctrl+Y or Ctrl+Shift+Z
      if (
        (e.ctrlKey && e.key === 'y') ||
        (e.ctrlKey && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault()
        handleRedo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [widgetData, historyIndex, history]) // Dependencies for undo/redo

  // Handle drag start from component palette
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('componentType', type)
    setIsDragging(true)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false)
    setDropTarget({ id: null, isHovering: false })
  }

  // Handle drag enter for container components
  const handleContainerDragEnter = (
    e: React.DragEvent,
    containerId: string,
  ) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling to parent containers

    setDropTarget({
      id: containerId,
      isHovering: true,
    })
  }

  // Handle drag leave for container components
  const handleContainerDragLeave = (e: React.DragEvent) => {
    e.preventDefault()

    // Only clear if we're not entering a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget({ id: null, isHovering: false })
    }
  }

  // Handle drag over for container components
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  // Handle drop onto a container component
  const handleContainerDrop = (e: React.DragEvent, containerId: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling to parent containers

    const componentType = e.dataTransfer.getData('componentType')
    if (!componentType) {
      return
    }

    const componentConfig = COMPONENT_TYPES.find(
      (c) => c.type === componentType,
    )
    if (!componentConfig) {
      return
    }

    const newComponent: ComponentData = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      props: { ...componentConfig.defaultProps },
    }

    // Find the container by ID
    const container = findComponentById(containerId, widgetData.components)

    if (
      container &&
      ['FieldSet', 'FlexBox', 'GridBox'].includes(container.type)
    ) {
      const updatedContainer = {
        ...container,
        children: [...(container.children || []), newComponent],
      }

      setWidgetData((prev) => ({
        ...prev,
        components: updateComponentById(
          containerId,
          updatedContainer,
          prev.components,
        ),
      }))
    }

    setDropTarget({ id: null, isHovering: false })
    setIsDragging(false)
  }

  // Handle adding component inside a fieldset or container
  const handleAddInsideFieldset = (parentId: string) => {
    // Show component selector or use a default component type
    const componentType = 'Label' // Default component type
    const componentConfig = COMPONENT_TYPES.find(
      (c) => c.type === componentType,
    )

    if (componentConfig) {
      const newComponent: ComponentData = {
        id: `${componentType}-${Date.now()}`,
        type: componentType,
        props: { ...componentConfig.defaultProps },
      }

      const container = findComponentById(parentId, widgetData.components)

      if (container) {
        const updatedContainer = {
          ...container,
          children: [...(container.children || []), newComponent],
        }

        setWidgetData((prev) => ({
          ...prev,
          components: updateComponentById(
            parentId,
            updatedContainer,
            prev.components,
          ),
        }))
      }
    }
  }

  // Handle dropping a component into the main drop area
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    const componentType = e.dataTransfer.getData('componentType')
    if (!componentType) {
      return
    }

    const componentConfig = COMPONENT_TYPES.find(
      (c) => c.type === componentType,
    )
    if (!componentConfig) {
      return
    }

    const newComponent: ComponentData = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      props: { ...componentConfig.defaultProps },
    }

    setWidgetData((prev) => ({
      ...prev,
      components: [...prev.components, newComponent],
    }))

    setIsDragging(false)
  }

  // Handle drag over for the main drop area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  // Handle deleting a component
  const handleDeleteComponent = (id: string) => {
    // If delete confirmation is turned off, delete immediately
    if (!showDeleteConfirmation) {
      setWidgetData((prev) => ({
        ...prev,
        components: removeComponentById(id, prev.components),
      }))

      return
    }

    // Otherwise show confirmation dialog
    setComponentToDelete(id)
    setDeleteConfirmOpen(true)
  }

  // Actual delete component function
  const confirmDeleteComponent = () => {
    if (componentToDelete) {
      setWidgetData((prev) => ({
        ...prev,
        components: removeComponentById(componentToDelete, prev.components),
      }))

      setComponentToDelete(null)
      setDeleteConfirmOpen(false)
    }
  }

  // Cancel delete
  const cancelDeleteComponent = () => {
    setComponentToDelete(null)
    setDeleteConfirmOpen(false)
  }

  // Handle toggling collapsed state for FieldSet components (used by collapse arrow)
  const handleToggleFieldsetCollapse = (id: string) => {
    const component = findComponentById(id, widgetData.components)
    if (component && component.type === 'FieldSet') {
      const updatedComponent = {
        ...component,
        props: {
          ...component.props,
          collapsed: !(component.props.collapsed as boolean),
        },
      }
      setWidgetData((prev) => ({
        ...prev,
        components: updateComponentById(id, updatedComponent, prev.components),
      }))
    }
  }

  // Handle editing a component: open the edit dialog for all component types
  const handleEditComponent = (id: string) => {
    const component = findComponentById(id, widgetData.components)

    if (component) {
      setCurrentEditComponent(component)
      setEditDialogOpen(true)
    }
  }

  // Handle toggling component visibility
  const handleToggleVisibility = (id: string) => {
    const component = findComponentById(id, widgetData.components)

    if (component) {
      const updatedComponent = {
        ...component,
        hidden: !component.hidden,
      }

      setWidgetData((prev) => ({
        ...prev,
        components: updateComponentById(id, updatedComponent, prev.components),
      }))
    }
  }

  // Handle saving edited component
  const handleSaveComponent = (updatedComponent: ComponentData) => {
    setWidgetData((prev) => ({
      ...prev,
      components: updateComponentById(
        updatedComponent.id,
        updatedComponent,
        prev.components,
      ),
    }))

    setEditDialogOpen(false)
    setCurrentEditComponent(null)
  }

  // Handle moving component up/down
  const handleMoveComponent = (id: string, direction: 'up' | 'down') => {
    setWidgetData((prev) => ({
      ...prev,
      components: moveComponent(id, direction, prev.components),
    }))
  }

  // Handle saving the widget
  const handleSaveWidget = (
    isMajorUpdate: boolean = false,
    requestedName?: string,
  ) => {
    const currentWidget = currentWidgetId
      ? savedWidgets.find((widget) => widget.id === currentWidgetId)
      : undefined
    let nameToSave = getUniqueWidgetName(
      requestedName ?? widgetData.name,
      savedWidgets,
      currentWidget?.id,
    )

    if (widgetData.components.length === 0) {
      return
    }

    try {
      // Always set this flag to prevent save/update operations from being recorded in history
      setIsUndoRedoAction(true)

      const existingWidget = currentWidget

      // Prepare basic widget data for saving
      const widgetToSave = {
        name: nameToSave,
        components: [...widgetData.components],
      }

      let savedWidgetId: string

      // Handle updating existing widget
      if (existingWidget) {
        // Determine if this is a branch-from-older version based on loaded preview version
        const restoreVersion = widgetData.version
        const isRestoreOperation =
          restoreVersion !== undefined &&
          restoreVersion !== existingWidget.version
        // Perform update and capture updated widget info
        let updatedWidget = null as CustomWidget | null
        if (isRestoreOperation) {
          updatedWidget = WidgetStorage.updateWidget(
            existingWidget.id,
            {
              ...widgetToSave,
              version: restoreVersion,
            },
            isMajorUpdate,
          )
        } else {
          updatedWidget = WidgetStorage.updateWidget(
            existingWidget.id,
            widgetToSave,
            isMajorUpdate,
          )
        }
        // Update local widgetData to reflect the new version/id
        if (updatedWidget) {
          setWidgetData((prev) => ({
            ...prev,
            name: nameToSave,
            id: updatedWidget.id,
            version: updatedWidget.version,
          }))
        }

        savedWidgetId = existingWidget.id
      }
      // Handle saving new widget
      else {
        const savedWidget = WidgetStorage.saveWidget(widgetToSave)
        savedWidgetId = savedWidget.id
        // Set new widgetData id and version
        setWidgetData((prev) => ({
          ...prev,
          name: nameToSave,
          id: savedWidget.id,
          version: savedWidget.version,
        }))
      }

      // Update current widget ID without triggering a re-render of widget data
      // This prevents the ID update from triggering another history recording
      setCurrentWidgetId((prev) => {
        if (prev !== savedWidgetId) {
          return savedWidgetId
        }
        return prev
      })

      setSavedWidgets(WidgetStorage.getAllWidgets())
      console.log(
        'All saved widgets after save/update:',
        WidgetStorage.getAllWidgets(),
      )
    } catch (error) {
      console.error('Failed to save widget:', error)
    }
  }

  // Handle loading a widget
  const handleLoadWidget = (
    widget: CustomWidget,
    shouldEnterEditMode?: boolean,
  ) => {
    // Set flag BEFORE updating any state to prevent duplicate history entries
    setIsUndoRedoAction(true)

    // Create the widget history item first
    const widgetHistoryItem: WidgetHistoryItem = {
      name: widget.name,
      components: JSON.parse(JSON.stringify(widget.components)),
      widgetId: widget.id,
    }

    // Update the current widget ID for history tracking
    setCurrentWidgetId(widget.id)

    // Set widget data with version info
    setWidgetData({
      id: widget.id,
      name: widget.name,
      components: [...widget.components],
      version: widget.version,
    })

    // Handle history for loaded widget
    if (history.length === 0) {
      // First widget ever loaded - create new history
      setHistory([widgetHistoryItem])
      setHistoryIndex(0)
    } else {
      // Check if we're loading the same widget as current
      const currentWidget =
        historyIndex >= 0 && historyIndex < history.length
          ? history[historyIndex]
          : null

      if (currentWidget && currentWidget.widgetId === widget.id) {
        // We're reloading the same widget - replace current history entry
        const updatedHistory = [...history]
        updatedHistory[historyIndex] = widgetHistoryItem
        setHistory(updatedHistory)
        // Keep same history index
      } else {
        // Loading a different widget - add to history and truncate if needed
        if (historyIndex < history.length - 1) {
          // We're in the middle of history, truncate future entries
          const newHistory = history.slice(0, historyIndex + 1)
          setHistory([...newHistory, widgetHistoryItem])
        } else {
          // We're at the end of history, append
          setHistory((prev) => [...prev, widgetHistoryItem])
        }
        // Move to new history position
        setHistoryIndex((prev) => prev + 1)
      }
    }

    setShowWidgetList(false)

    // Set editor mode based on the passed parameter
    if (shouldEnterEditMode !== undefined) {
      setViewMode(shouldEnterEditMode ? 'both' : 'preview')
    }
  }

  // Handle deleting a saved widget
  const handleDeleteSavedWidget = (id: string) => {
    // If the saved widgets list is open (WidgetManagementModal handles its own confirmation), delete immediately
    if (showWidgetList) {
      const widget = WidgetStorage.getWidgetById(id)
      if (widget) {
        WidgetStorage.deleteWidget(id)
        setSavedWidgets(WidgetStorage.getAllWidgets())
      }
      return
    }

    // If delete confirmation is turned off, delete immediately
    if (!showDeleteWidgetConfirmation) {
      const widget = WidgetStorage.getWidgetById(id)
      if (widget) {
        WidgetStorage.deleteWidget(id)
        setSavedWidgets(WidgetStorage.getAllWidgets())
      }
      return
    }

    // Otherwise show confirmation dialog
    setWidgetToDelete(id)
    setDeleteConfirmOpen(true)
  }

  // Confirm deleting a saved widget
  const confirmDeleteSavedWidget = () => {
    if (widgetToDelete) {
      const widget = WidgetStorage.getWidgetById(widgetToDelete)
      if (widget) {
        WidgetStorage.deleteWidget(widgetToDelete)
        setSavedWidgets(WidgetStorage.getAllWidgets())
      }

      setWidgetToDelete(null)
      setDeleteConfirmOpen(false)
    }
  }

  // Handle direct component addition (for mobile devices)
  const handleDirectAdd = (componentType: string) => {
    // Find the component configuration
    const componentConfig = COMPONENT_TYPES.find(
      (c) => c.type === componentType,
    )

    if (componentConfig) {
      // Create a new component
      const newComponent: ComponentData = {
        id: `${componentType}-${Date.now()}`,
        type: componentType,
        props: { ...componentConfig.defaultProps },
      }

      // If we have an active container, add the component to that container
      if (activeContainerId) {
        // Find the container component
        const container = findComponentById(
          activeContainerId,
          widgetData.components,
        )

        if (
          container &&
          ['FieldSet', 'FlexBox', 'GridBox'].includes(container.type)
        ) {
          // Add to the container's children
          const updatedContainer = {
            ...container,
            children: [...(container.children || []), newComponent],
          }

          // Update the widget data
          setWidgetData((prev) => ({
            ...prev,
            components: updateComponentById(
              activeContainerId,
              updatedContainer,
              prev.components,
            ),
          }))

          return
        }
      }

      // If no active container or container not found, add to root level
      setWidgetData((prev) => ({
        ...prev,
        components: [...prev.components, newComponent],
      }))
    }
  }

  // Cycle through both/edit/preview view modes
  const toggleEditMode = () => {
    setViewMode((prev) => {
      if (prev === 'both') {
        return 'edit'
      }

      if (prev === 'edit') {
        return 'preview'
      }

      return 'both'
    })
  }

  // Utility function to load saved widgets
  const loadSavedWidgets = () => {
    // Get widgets from local storage
    const savedWidgets = WidgetStorage.getAllWidgets()
    setSavedWidgets(savedWidgets)
  }

  return {
    // State
    widgetData,
    setWidgetData,
    editMode,
    setEditMode,
    viewMode,
    setViewMode,
    savedWidgets,
    showWidgetList,
    setShowWidgetList,
    editDialogOpen,
    setEditDialogOpen,
    currentEditComponent,
    dropTarget,
    dropAreaRef,
    isDragging,
    stayOpen,
    setStayOpen,
    showSettingsModal,
    setShowSettingsModal,
    showTooltips,
    setShowTooltips,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showComponentPaletteHelp,
    setShowComponentPaletteHelp,
    showDeleteWidgetConfirmation,
    setShowDeleteWidgetConfirmation,
    showDeleteTemplateConfirmation,
    setShowDeleteTemplateConfirmation,
    showDeleteDashboardConfirmation,
    setShowDeleteDashboardConfirmation,
    showAdvancedInToolbar,
    setShowAdvancedInToolbar,
    deleteConfirmOpen,
    componentToDelete,
    widgetToDelete,
    editorId,
    activeContainerId,
    setActiveContainerId,

    // Event handlers
    handleDragStart,
    handleDragEnd,
    handleContainerDragEnter,
    handleContainerDragLeave,
    handleContainerDragOver,
    handleContainerDrop,
    handleAddInsideFieldset,
    handleDrop,
    handleDragOver,
    handleDeleteComponent,
    handleEditComponent,
    handleToggleFieldsetCollapse,
    handleSaveComponent,
    handleMoveComponent,
    handleSaveWidget,
    handleLoadWidget,
    handleDeleteSavedWidget,
    handleDirectAdd,
    toggleEditMode,
    handleToggleVisibility,
    confirmDeleteComponent,
    cancelDeleteComponent,
    confirmDeleteSavedWidget,

    // History/Undo/Redo
    handleUndo,
    handleRedo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,

    // Utility
    setCurrentEditComponent,
    handleWidgetNameChange,
    loadSavedWidgets,
  }
}

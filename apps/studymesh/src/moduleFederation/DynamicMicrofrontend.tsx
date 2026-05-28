import React, { useState, useEffect } from 'react'

import useTopNavBarWidgets, { Item } from '../customHooks/useTopNavBarWidgets'

import { useStore } from '../state/store'
import ModuleLoader from './ModuleLoader'

// Import components
import WidgetEditor from '../components/WidgetEditor/WidgetEditor'
import CustomWidget from '../components/WidgetEditor/CustomWidget'
import WidgetStorage from '../components/WidgetEditor/WidgetStorage'
import { KnowledgeLinkWidget } from '../components/knowledge/KnowledgeLinkWidget'
import type {
  KnowledgeLinkWidgetCardSize,
  KnowledgeLinkWidgetColumns,
  KnowledgeLinkWidgetSectionId,
  KnowledgeReference,
} from '../knowledgeReferences'

// Define the ComponentData type
interface ComponentData {
  id: string
  type: string
  props: Record<string, unknown>
  children?: ComponentData[]
  parentId?: string
}

// Define the custom props type
interface CustomWidgetProps {
  widgetId?: string
  components?: ComponentData[]
}

export interface DynamicMicrofrontendProps {
  name: string
  component: string
  width: number
  height: number
  customProps?: Record<string, unknown>
}

const DynamicMicrofrontend: React.FC<DynamicMicrofrontendProps> = (props) => {
  const [remote, setRemote] = useState<Item>()
  const [widgetData, setWidgetData] = useState<{
    components?: ComponentData[]
  }>({})

  const { topNavBarWidgets } = useTopNavBarWidgets()

  const changeWidgetData = useStore((state) => state.changeWidgetData)
  const getCurrentDashboard = useStore((state) => state.getCurrentDashboard)

  useEffect(() => {
    // Check if it's a local component first
    if (
      props.component === 'WidgetEditor' ||
      props.component === 'CustomWidget'
    ) {
      return
    }

    // SET REMOTE from widgets.json
    const topNavBarWidget = topNavBarWidgets.find((topNavBarWidget) =>
      topNavBarWidget.items.some((item) => item.name === props.name),
    )

    if (topNavBarWidget) {
      const widgetItem: Item | undefined = topNavBarWidget.items.find(
        (item) => item.name === props.name,
      )
      if (widgetItem) {
        setRemote(widgetItem)
      }
    }
  }, [topNavBarWidgets, props.component, props.name])

  // Load widget data from storage when needed
  useEffect(() => {
    if (props.component === 'CustomWidget') {
      // Verify the widget exists in storage
      if (props.customProps && 'widgetId' in props.customProps) {
        const widgetId = props.customProps.widgetId as string
        const widget = WidgetStorage.getWidgetById(widgetId)

        if (
          widget &&
          Array.isArray(widget.components) &&
          widget.components.length > 0
        ) {
          setWidgetData({
            components: widget.components,
          })
        } else if (props.customProps && 'components' in props.customProps) {
          setWidgetData({
            components: props.customProps.components as ComponentData[],
          })
        }
      }
    }
  }, [props])

  // Return proper content for local components
  if (props.component === 'WidgetEditor') {
    return <WidgetEditor />
  }

  if (props.component === 'CustomWidget') {
    // Create a merged props object with both the original customProps and our loaded components
    const customWidgetProps: CustomWidgetProps = {
      ...(props.customProps as CustomWidgetProps),
      ...(widgetData.components && { components: widgetData.components }),
    }

    return (
      <CustomWidget
        widgetId={customWidgetProps.widgetId}
        components={customWidgetProps.components}
        customProps={
          props.customProps as {
            widgetId?: string
            components?: ComponentData[]
          }
        }
        name={props.name}
      />
    )
  }

  if (props.component === 'KnowledgeLinkWidget') {
    return (
      <KnowledgeLinkWidget
        references={
          Array.isArray(props.customProps?.references)
            ? (props.customProps.references as KnowledgeReference[])
            : []
        }
        cardSize={
          props.customProps?.cardSize as KnowledgeLinkWidgetCardSize | undefined
        }
        columns={
          props.customProps?.columns as KnowledgeLinkWidgetColumns | undefined
        }
        title={
          typeof props.customProps?.title === 'string'
            ? props.customProps.title
            : props.name
        }
        editMode={props.customProps?.editMode === true}
        showCreationActions={props.customProps?.showCreationActions === true}
        showOpenStudyMaterial={
          props.customProps?.showOpenStudyMaterial === true
        }
        sectionOrder={
          Array.isArray(props.customProps?.sectionOrder)
            ? (props.customProps.sectionOrder as KnowledgeLinkWidgetSectionId[])
            : undefined
        }
      />
    )
  }

  return (
    <>
      {remote && (
        <ModuleLoader
          url={remote.url}
          {...props}
          {...remote.customProps}
          changeWidgetData={changeWidgetData}
          getCurrentView={getCurrentDashboard}
          component={remote.component}
        />
      )}
    </>
  )
}

export default DynamicMicrofrontend

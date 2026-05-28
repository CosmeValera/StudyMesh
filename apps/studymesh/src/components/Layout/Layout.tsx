import React, { useMemo } from 'react'
import { Layout, Model, TabNode } from 'flexlayout-react'

import { ReactComponent as EmptyWidgetIcon } from '../../icons/gui.svg'
import { ReactComponent as CloseIcon } from '../../icons/close.svg'
import { ReactComponent as OpenInNewIcon } from '../../icons/launch.svg'
import { ReactComponent as MaximizeIcon } from '../../icons/maximize.svg'
import { ReactComponent as MinimizeIcon } from '../../icons/minimize.svg'
// import { ReactComponent as MoreIcon } from '../icons/overflow-menu-vertical.svg'

import DynamicMicrofrontend from '../../moduleFederation/DynamicMicrofrontend'

import { useLayout } from './LayoutProvider'
import { DashboardLayout } from '../../state/store'
import { countDashboardNodes } from '../onboarding/WorkspaceOnboarding'
import { dispatchWorkspaceOnboardingEvent } from '../onboarding/onboardingEvents'

import 'flexlayout-react/style/light.css'
import './layout.scss'

interface DashboardLayoutViewProps {
  layout?: DashboardLayout
  updateLayout: (model: Model) => void
  readOnly?: boolean
  mobileView?: boolean
}

interface MobileWidgetNode {
  id: string
  name: string
  component: string
  customProps?: Record<string, unknown>
}

const collectMobileWidgetNodes = (
  node: DashboardLayout | undefined,
  path: string[] = [],
): MobileWidgetNode[] => {
  if (!node) {
    return []
  }

  if (node.component) {
    return [
      {
        id: node.id || path.join('-') || node.name || node.component,
        name: node.name || node.component,
        component: node.component,
        customProps: node.config?.customProps,
      },
    ]
  }

  return (node.children || []).flatMap((child, index) =>
    collectMobileWidgetNodes(child, [...path, String(index)]),
  )
}

const CONFIG = {
  global: {
    tabEnableFloat: true,
    tabSetEnableClose: true,
    // tabSetEnableTabStrip: false,
    tabSetTabStripHeight: 32,
    // tabSetHeaderHeight: 24,
    tabEnableRename: false,
    tabDragSpeed: 0.15,
  },
  borders: [],
}

const withDesktopTabMovementEnabled = (
  node: DashboardLayout | undefined,
): DashboardLayout | undefined => {
  if (!node) {
    return node
  }

  const children = node.children?.map((child) =>
    withDesktopTabMovementEnabled(child),
  ) as DashboardLayout[] | undefined

  if (node.type === 'tab') {
    return {
      ...node,
      children,
      enableDrag: node.enableDrag === false ? false : true,
    } as DashboardLayout
  }

  if (node.type === 'tabset') {
    return {
      ...node,
      children,
      enableDrag: node.enableDrag === false ? false : true,
      enableDrop: node.enableDrop === false ? false : true,
      enableDivide: node.enableDivide === false ? false : true,
    } as DashboardLayout
  }

  return {
    ...node,
    children,
  }
}

const EmptyWidget = () => (
  <div
    style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <EmptyWidgetIcon width={60} height={60} opacity={0.16} />
  </div>
)

const DashboardLayoutView: React.FC<DashboardLayoutViewProps> = ({
  layout,
  updateLayout,
  readOnly = false,
  mobileView = false,
}) => {
  const { ref } = useLayout()

  const factory = (node: TabNode) => {
    const { width, height } = node.getRect()
    const name = node.getName()
    const component = node.getComponent()
    const config = node.getConfig() as
      | { customProps?: Record<string, unknown> }
      | undefined

    if (!component) {
      return <EmptyWidget />
    }

    return (
      <DynamicMicrofrontend
        name={name}
        component={component}
        width={width}
        height={height}
        customProps={config?.customProps}
      />
    )
  }

  const model = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = Object.assign({}, CONFIG, {
      global: {
        ...CONFIG.global,
        tabEnableDrag: !readOnly,
        tabEnableFloat: !readOnly,
        tabSetEnableDrag: !readOnly,
        tabSetEnableDrop: !readOnly,
        tabSetEnableDivide: !readOnly,
        tabEnableClose: !readOnly,
        tabSetEnableClose: !readOnly,
        splitterEnableHandle: !readOnly,
      },
      layout: readOnly
        ? layout || {}
        : withDesktopTabMovementEnabled(layout) || {},
    })
    return Model.fromJson(config)
  }, [layout, readOnly])

  const mobileWidgets = useMemo(
    () => collectMobileWidgetNodes(layout),
    [layout],
  )

  if (mobileView) {
    return (
      <div className="studymesh-mobile-dashboard-layout">
        {mobileWidgets.length === 0 ? (
          <div className="studymesh-mobile-dashboard-empty">
            <EmptyWidget />
          </div>
        ) : (
          mobileWidgets.map((widget) => (
            <section key={widget.id} className="studymesh-mobile-widget-card">
              <DynamicMicrofrontend
                name={widget.name}
                component={widget.component}
                width={
                  typeof window !== 'undefined' ? window.innerWidth - 32 : 360
                }
                height={0}
                customProps={widget.customProps}
              />
            </section>
          ))
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        minWidth: 0,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <Layout
        ref={ref}
        model={model}
        factory={factory}
        icons={{
          close: (
            <CloseIcon
              width={16}
              height={16}
              color="var(--foreground-primary, #001026DE)"
            />
          ),
          closeTabset: (
            <CloseIcon
              width={16}
              height={16}
              color="var(--foreground-primary, #001026DE)"
            />
          ),
          maximize: (
            <MaximizeIcon
              width={16}
              height={16}
              color="var(--foreground-primary, #001026DE)"
            />
          ),
          restore: (
            <MinimizeIcon
              width={16}
              height={16}
              color="var(--foreground-primary, #001026DE)"
            />
          ),
          popout: (
            <OpenInNewIcon
              width={16}
              height={16}
              color="var(--foreground-primary, #001026DE)"
            />
          ),
          // NOTE displayed when some tabs are hidden
          // more: (
          //   <MoreIcon
          //     width={16}
          //     height={16}
          //     color="var(--foreground-primary, #001026DE)"
          //   />
          // ),
        }}
        onTabSetPlaceHolder={() => (
          <EmptyWidgetIcon width={60} height={60} opacity={0.16} />
        )}
        onModelChange={(nextModel) => {
          if (!readOnly) {
            const nextLayout = nextModel.toJson().layout as DashboardLayout
            updateLayout(nextModel)
            dispatchWorkspaceOnboardingEvent({
              type: 'dashboard-layout-changed',
              ...countDashboardNodes(nextLayout),
            })
          }
        }}
      />
    </div>
  )
}

export default DashboardLayoutView

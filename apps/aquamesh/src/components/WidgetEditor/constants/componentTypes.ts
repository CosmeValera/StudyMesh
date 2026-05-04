import TextFieldsIcon from '@mui/icons-material/TextFields'
import InputIcon from '@mui/icons-material/Input'
import SmartButtonIcon from '@mui/icons-material/SmartButton'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt'
import FlexibleIcon from '@mui/icons-material/Dashboard'
import GridViewIcon from '@mui/icons-material/GridView'
import PieChartIcon from '@mui/icons-material/PieChart'
import { ComponentType } from '../types/types'

// Building blocks that can be added to a widget.
export const COMPONENT_TYPES: ComponentType[] = [
  // UI Components
  {
    type: 'Label',
    label: 'Display Text',
    defaultProps: { text: 'Display Text' },
    category: 'UI Components',
    icon: TextFieldsIcon,
    tooltip: 'Shows a short piece of text, such as a title, status, or note.'
  },
  {
    type: 'TextField',
    label: 'Answer Box',
    defaultProps: { label: 'Answer Box', placeholder: 'Enter text...', defaultValue: '' },
    category: 'UI Components',
    icon: InputIcon,
    tooltip: 'Lets someone type a value, note, or answer into the widget.'
  },
  {
    type: 'Button',
    label: 'Button',
    defaultProps: { text: 'Button', variant: 'contained', showToast: true, toastMessage: 'Action completed!', toastSeverity: 'info' },
    category: 'UI Components',
    icon: SmartButtonIcon,
    tooltip: 'Adds a button for actions like confirming a step, opening a link, or showing a message.'
  },
  {
    type: 'SwitchEnable',
    label: 'Switch',
    defaultProps: { label: 'Switch', defaultChecked: false },
    category: 'UI Components',
    icon: ToggleOnIcon,
    tooltip: 'Adds a simple on/off choice, such as Enabled, Open, or Needs review.'
  },
  {
    type: 'Chart',
    label: 'Pie Chart',
    defaultProps: { 
      title: '', 
      chartType: 'pie',
      height: 400,
      description: '',
      data: `{
        "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        "datasets": [
          {
            "data": [30, 20, 15, 25, 10, 5],
            "backgroundColor": [
              "rgba(255, 99, 132, 0.8)",
              "rgba(54, 162, 235, 0.8)",
              "rgba(255, 206, 86, 0.8)",
              "rgba(75, 192, 192, 0.8)",
              "rgba(153, 102, 255, 0.8)",
              "rgba(255, 159, 64, 0.8)"
            ]
          }
        ]
      }`
    },
    category: 'UI Components',
    icon: PieChartIcon,
    tooltip: 'Shows a pie chart for simple breakdowns, such as ticket types or incident causes.'
  },
  
  // Layout Containers
  {
    type: 'FieldSet',
    label: 'Grouped Section',
    defaultProps: { legend: 'Grouped Section', collapsed: false },
    category: 'Layout Containers',
    icon: ViewQuiltIcon,
    tooltip: 'Groups related items under one heading. It can be opened or collapsed.'
  },
  {
    type: 'FlexBox',
    label: 'Row or Column Group',
    defaultProps: { 
      direction: 'row', 
      justifyContent: 'flex-start', 
      alignItems: 'center', 
      spacing: 0,
      wrap: 'wrap'
    },
    category: 'Layout Containers',
    icon: FlexibleIcon,
    tooltip: 'Places items next to each other or stacks them, with simple spacing controls.'
  },
  {
    type: 'GridBox',
    label: 'Grid Group',
    defaultProps: { 
      columns: 2, 
      rows: 1,
      spacing: 2
    },
    category: 'Layout Containers',
    icon: GridViewIcon,
    tooltip: 'Arranges items into clear columns, like cards on a dashboard.'
  },
]

/**
 * Get a component icon by type
 */
export const getComponentIcon = (type: string) => {
  const componentType = COMPONENT_TYPES.find(c => c.type === type)
  return componentType?.icon || null
}

/**
 * Get components organized by category
 */
export const getComponentsByCategory = () => {
  const categories: Record<string, ComponentType[]> = {}
  
  COMPONENT_TYPES.forEach(component => {
    if (!categories[component.category]) {
      categories[component.category] = []
    }
    categories[component.category].push(component)
  })
  
  return categories
} 
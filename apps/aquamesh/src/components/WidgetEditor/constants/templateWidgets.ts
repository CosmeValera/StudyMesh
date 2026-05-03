import { CustomWidget } from '../WidgetStorage'

// Templates for common widget types
export const WIDGET_TEMPLATES: CustomWidget[] = [
  {
    id: 'template-basic-form',
    name: 'Basic Form Template',
    description:
      'A clean, user-friendly form with styled fieldset, input fields, and submit button perfect for collecting information.',
    components: [
      {
        id: 'template-fieldset-1',
        type: 'FieldSet',
        props: {
          legend: 'User Information',
          collapsed: false,
          borderStyle: 'solid',
          useCustomColor: true,
          borderColor: '#2c7be5',
          backgroundColor: 'rgba(44, 123, 229, 0.04)',
          legendColor: '#2c7be5',
          legendBold: true,
          padding: 2,
          borderRadius: 8,
        },
        children: [
          {
            id: 'template-text-1',
            type: 'TextField',
            props: {
              label: 'Full Name',
              placeholder: 'Enter your full name',
              defaultValue: '',
              required: true,
              fullWidth: true,
              variant: 'outlined',
              margin: 'normal',
              helperText: 'Your first and last name',
            },
          },
          {
            id: 'template-text-2',
            type: 'TextField',
            props: {
              label: 'Email Address',
              placeholder: 'Enter your email',
              defaultValue: '',
              required: true,
              fullWidth: true,
              variant: 'outlined',
              margin: 'normal',
              helperText: "We'll never share your email",
            },
          },
          {
            id: 'template-switch-1',
            type: 'SwitchEnable',
            props: {
              label: 'Subscribe to newsletter',
              defaultChecked: true,
              labelPlacement: 'end',
              margin: 'normal',
              color: 'primary',
            },
          },
        ],
      },
      {
        id: 'template-button-1',
        type: 'Button',
        props: {
          text: 'Submit',
          variant: 'contained',
          color: 'primary',
          size: 'large',
          fullWidth: false,
          showToast: true,
          toastMessage: 'Form submitted successfully!',
          toastSeverity: 'success',
          sx: {
            marginTop: 3,
            borderRadius: 2,
            fontWeight: 'bold',
            boxShadow: 3,
            padding: '10px 24px',
          },
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['form', 'input', 'user data'],
  },
  {
    id: 'template-dashboard',
    name: 'Dashboard Stats Template',
    description:
      'A modern dashboard layout featuring key performance metrics in visually distinct panels with a color-coded chart for data visualization.',
    components: [
      {
        id: 'template-flex-1',
        type: 'FlexBox',
        props: {
          direction: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          spacing: 2,
          wrap: 'wrap',
          sx: {
            marginBottom: 3,
          },
        },
        children: [
          {
            id: 'template-fieldset-stat1',
            type: 'FieldSet',
            props: {
              legend: 'Total Users',
              borderStyle: 'solid',
              useCustomColor: true,
              borderColor: '#3bc179',
              backgroundColor: 'rgba(59, 193, 121, 0.08)',
              legendColor: '#3bc179',
              legendBold: true,
              padding: 1.5,
              borderRadius: 8,
              borderWidth: 1.5,
              boxShadow: '0 4px 12px rgba(59, 193, 121, 0.15)',
            },
            children: [
              {
                id: 'template-label-stat1',
                type: 'Label',
                props: {
                  text: '1,254',
                  variant: 'h3',
                  align: 'center',
                  useCustomColor: true,
                  customColor: '#3bc179',
                  fontWeight: 'bold',
                  sx: {
                    textShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    letterSpacing: '-0.5px',
                  },
                },
              },
            ],
          },
          {
            id: 'template-fieldset-stat2',
            type: 'FieldSet',
            props: {
              legend: 'Active Sessions',
              borderStyle: 'solid',
              useCustomColor: true,
              borderColor: '#e67c13',
              backgroundColor: 'rgba(230, 124, 19, 0.08)',
              legendColor: '#e67c13',
              legendBold: true,
              padding: 1.5,
              borderRadius: 8,
              borderWidth: 1.5,
              boxShadow: '0 4px 12px rgba(230, 124, 19, 0.15)',
            },
            children: [
              {
                id: 'template-label-stat2',
                type: 'Label',
                props: {
                  text: '423',
                  variant: 'h3',
                  align: 'center',
                  useCustomColor: true,
                  customColor: '#e67c13',
                  fontWeight: 'bold',
                  sx: {
                    textShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    letterSpacing: '-0.5px',
                  },
                },
              },
            ],
          },
          {
            id: 'template-fieldset-stat3',
            type: 'FieldSet',
            props: {
              legend: 'System Status',
              borderStyle: 'solid',
              useCustomColor: true,
              borderColor: '#0c87f2',
              backgroundColor: 'rgba(12, 135, 242, 0.08)',
              legendColor: '#0c87f2',
              legendBold: true,
              padding: 1.5,
              borderRadius: 8,
              borderWidth: 1.5,
              boxShadow: '0 4px 12px rgba(12, 135, 242, 0.15)',
            },
            children: [
              {
                id: 'template-label-stat3',
                type: 'Label',
                props: {
                  text: 'Online',
                  variant: 'h3',
                  align: 'center',
                  useCustomColor: true,
                  customColor: '#0c87f2',
                  fontWeight: 'bold',
                  sx: {
                    textShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    letterSpacing: '-0.5px',
                  },
                },
              },
            ],
          },
        ],
      },
      {
        id: 'template-chart-1',
        type: 'Chart',
        props: {
          title: 'Monthly Usage',
          chartType: 'pie',
          height: 320,
          description: 'System resources usage by month',
          sx: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: 2,
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          },
          data: `{
            "labels": ["CPU", "Memory", "Storage", "Network", "GPU"],
            "datasets": [
              {
                "data": [35, 25, 15, 15, 10],
                "backgroundColor": [
                  "rgba(75, 192, 192, 0.85)",
                  "rgba(54, 162, 235, 0.85)",
                  "rgba(255, 99, 132, 0.85)",
                  "rgba(255, 206, 86, 0.85)",
                  "rgba(153, 102, 255, 0.85)"
                ],
                "borderColor": [
                  "rgba(75, 192, 192, 1)",
                  "rgba(54, 162, 235, 1)",
                  "rgba(255, 99, 132, 1)",
                  "rgba(255, 206, 86, 1)",
                  "rgba(153, 102, 255, 1)"
                ],
                "borderWidth": 2
              }
            ]
          }`,
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['dashboard', 'stats', 'chart', 'metrics'],
  },
  {
    id: 'template-operations-dashboard',
    name: 'Daily Operations Dashboard Template',
    description:
      'A ready-made daily operations dashboard for tracking orders, delayed tasks, support tickets, system status, team notes, and handoff actions.',
    category: 'Dashboard',
    components: [
      {
        id: 'template-ops-title',
        type: 'Label',
        props: {
          text: 'Daily Operations Dashboard',
          variant: 'h4',
          gutterBottom: true,
          useCustomColor: true,
          customColor: '#174A5C',
          fontWeight: 700,
          styleJson: '{"marginBottom":"16px"}',
        },
      },
      {
        id: 'template-ops-status-grid',
        type: 'GridBox',
        props: {
          columns: 3,
          spacing: 2,
          responsive: true,
          sx: {
            marginBottom: 2,
          },
        },
        children: [
          {
            id: 'template-ops-status-card',
            type: 'FieldSet',
            props: {
              legend: 'Orders Today',
              collapsed: false,
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#1E88E5',
              legendColor: '#1E88E5',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-ops-status-value',
                type: 'Label',
                props: {
                  text: '128',
                  variant: 'h5',
                  textAlign: 'center',
                  useCustomColor: true,
                  customColor: '#1E88E5',
                  fontWeight: 700,
                },
              },
              {
                id: 'template-ops-status-caption',
                type: 'Label',
                props: {
                  text: '18 still waiting for dispatch',
                  variant: 'body2',
                  useCustomColor: true,
                  customColor: '#455A64',
                },
              },
            ],
          },
          {
            id: 'template-ops-incidents-card',
            type: 'FieldSet',
            props: {
              legend: 'Delayed Tasks',
              collapsed: false,
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#E67E22',
              legendColor: '#E67E22',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-ops-incidents-value',
                type: 'Label',
                props: {
                  text: '7',
                  variant: 'h5',
                  textAlign: 'center',
                  useCustomColor: true,
                  customColor: '#E67E22',
                  fontWeight: 700,
                },
              },
              {
                id: 'template-ops-incidents-caption',
                type: 'Label',
                props: {
                  text: '3 need owner follow-up',
                  variant: 'body2',
                  useCustomColor: true,
                  customColor: '#455A64',
                },
              },
            ],
          },
          {
            id: 'template-ops-queue-card',
            type: 'FieldSet',
            props: {
              legend: 'Open Tickets',
              collapsed: false,
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#2E7D32',
              legendColor: '#2E7D32',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-ops-queue-value',
                type: 'Label',
                props: {
                  text: '23',
                  variant: 'h5',
                  textAlign: 'center',
                  useCustomColor: true,
                  customColor: '#2E7D32',
                  fontWeight: 700,
                },
              },
              {
                id: 'template-ops-queue-caption',
                type: 'Label',
                props: {
                  text: '5 waiting more than 24 hours',
                  variant: 'body2',
                  useCustomColor: true,
                  customColor: '#455A64',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'template-ops-content-grid',
        type: 'GridBox',
        props: {
          columns: 2,
          spacing: 3,
          responsive: true,
        },
        children: [
          {
            id: 'template-ops-chart',
            type: 'Chart',
            props: {
              title: 'Support Ticket Mix',
              chartType: 'pie',
              description: 'Current support ticket categories',
              data: `{
                "labels": ["Shipping", "Payments", "Returns", "Account Help"],
                "datasets": [
                  {
                    "label": "Tickets",
                    "data": [34, 28, 18, 20],
                    "backgroundColor": [
                      "rgba(229, 57, 53, 0.85)",
                      "rgba(30, 136, 229, 0.85)",
                      "rgba(251, 192, 45, 0.85)",
                      "rgba(67, 160, 71, 0.85)"
                    ]
                  }
                ]
              }`,
            },
          },
          {
            id: 'template-ops-controls',
            type: 'FieldSet',
            props: {
              legend: 'Team Handoff',
              collapsed: false,
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#546E7A',
              legendColor: '#546E7A',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-ops-maintenance-switch',
                type: 'SwitchEnable',
                props: {
                  label: 'System status healthy',
                  defaultChecked: true,
                  labelPlacement: 'end',
                  color: 'success',
                  showToast: true,
                  onMessage: 'System marked healthy',
                  offMessage: 'System needs attention',
                  toastSeverity: 'success',
                },
              },
              {
                id: 'template-ops-note',
                type: 'TextField',
                props: {
                  label: "Today's focus",
                  placeholder: 'Add handoff note for the next shift',
                  defaultValue:
                    'Clear delayed shipments before 16:00 and follow up on payment tickets.',
                  fullWidth: true,
                  multiline: true,
                  rows: 3,
                  variant: 'outlined',
                  margin: 'normal',
                },
              },
              {
                id: 'template-ops-notify-button',
                type: 'Button',
                props: {
                  text: 'Send Handoff',
                  variant: 'contained',
                  color: 'primary',
                  size: 'medium',
                  showStartIcon: true,
                  iconName: 'notification',
                  clickAction: 'toast',
                  toastMessage: 'Daily operations handoff sent to the team',
                  toastSeverity: 'success',
                  borderRadius: 6,
                  fontWeight: 700,
                },
              },
            ],
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['dashboard', 'daily operations', 'orders', 'tickets', 'handoff'],
  },
  {
    id: 'template-report',
    name: 'Status Report Template',
    description:
      'A comprehensive status report interface with system health indicators, key metrics display, and action buttons for data management.',
    components: [
      {
        id: 'template-title',
        type: 'Label',
        props: {
          text: 'System Status Report',
          variant: 'h4',
          align: 'center',
          useCustomColor: true,
          customColor: '#3f51b5',
          gutterBottom: true,
          fontWeight: 'bold',
          sx: {
            marginBottom: 3,
            paddingBottom: 2,
            borderBottom: '1px solid rgba(63, 81, 181, 0.2)',
            textShadow: '0 1px 2px rgba(0,0,0,0.05)',
          },
        },
      },
      {
        id: 'template-grid-1',
        type: 'GridBox',
        props: {
          columns: 2,
          spacing: 3,
          sx: {
            marginBottom: 3,
          },
        },
        children: [
          {
            id: 'template-fieldset-report1',
            type: 'FieldSet',
            props: {
              legend: 'System Health',
              borderStyle: 'solid',
              collapsed: false,
              borderColor: '#5c6bc0',
              backgroundColor: 'rgba(92, 107, 192, 0.05)',
              padding: 2,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            },
            children: [
              {
                id: 'template-switch-system',
                type: 'SwitchEnable',
                props: {
                  label: 'System Online',
                  defaultChecked: true,
                  disabled: true,
                  color: 'success',
                  sx: { marginY: 1 },
                },
              },
              {
                id: 'template-switch-backups',
                type: 'SwitchEnable',
                props: {
                  label: 'Backups Active',
                  defaultChecked: true,
                  disabled: true,
                  color: 'success',
                  sx: { marginY: 1 },
                },
              },
              {
                id: 'template-switch-alerts',
                type: 'SwitchEnable',
                props: {
                  label: 'Alerts Enabled',
                  defaultChecked: true,
                  disabled: false,
                  color: 'primary',
                  showToast: true,
                  onMessage: 'Alerts enabled',
                  offMessage: 'Alerts disabled',
                  toastSeverity: 'info',
                  sx: { marginY: 1 },
                },
              },
            ],
          },
          {
            id: 'template-fieldset-report2',
            type: 'FieldSet',
            props: {
              legend: 'Key Metrics',
              borderStyle: 'solid',
              collapsed: false,
              borderColor: '#26a69a',
              backgroundColor: 'rgba(38, 166, 154, 0.05)',
              padding: 2,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            },
            children: [
              {
                id: 'template-text-uptime',
                type: 'TextField',
                props: {
                  label: 'System Uptime',
                  defaultValue: '14 days, 6 hours',
                  disabled: true,
                  fullWidth: true,
                  variant: 'outlined',
                  margin: 'normal',
                  InputProps: {
                    sx: {
                      backgroundColor: 'rgba(0,0,0,0.03)',
                    },
                  },
                },
              },
              {
                id: 'template-text-lastbackup',
                type: 'TextField',
                props: {
                  label: 'Last Backup',
                  defaultValue: '2023-05-15 04:30 UTC',
                  disabled: true,
                  fullWidth: true,
                  variant: 'outlined',
                  margin: 'normal',
                  InputProps: {
                    sx: {
                      backgroundColor: 'rgba(0,0,0,0.03)',
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        id: 'template-actions',
        type: 'FlexBox',
        props: {
          direction: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          spacing: 2,
          wrap: 'wrap',
          sx: {
            marginTop: 2,
            paddingTop: 2,
            borderTop: '1px solid rgba(0,0,0,0.08)',
          },
        },
        children: [
          {
            id: 'template-button-refresh',
            type: 'Button',
            props: {
              text: 'Refresh Data',
              variant: 'outlined',
              icon: 'refresh',
              color: 'info',
              showToast: true,
              toastMessage: 'Data refreshed',
              toastSeverity: 'info',
              sx: {
                borderRadius: 2,
                fontWeight: 'medium',
                textTransform: 'none',
              },
            },
          },
          {
            id: 'template-button-export',
            type: 'Button',
            props: {
              text: 'Export Report',
              variant: 'contained',
              icon: 'save',
              color: 'primary',
              showToast: true,
              toastMessage: 'Report exported successfully',
              toastSeverity: 'success',
              sx: {
                borderRadius: 2,
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: 2,
              },
            },
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['report', 'status', 'system', 'monitoring'],
  },
]

// Function to clone a template and generate new IDs
export const cloneTemplate = (templateId: string): CustomWidget | null => {
  const template = WIDGET_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    return null
  }

  // Generate a new ID for the widget
  const newWidget: CustomWidget = {
    ...JSON.parse(JSON.stringify(template)),
    id: `widget-${Date.now()}`,
    name: `${template.name.replace(' Template', '')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Generate new IDs for all components recursively
  const regenerateIds = (components: any[]): any[] => {
    return components.map((component) => {
      const newComponent = {
        ...component,
        id: `component-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      }

      if (newComponent.children && Array.isArray(newComponent.children)) {
        newComponent.children = regenerateIds(newComponent.children)
      }

      return newComponent
    })
  }

  newWidget.components = regenerateIds(newWidget.components)
  return newWidget
}

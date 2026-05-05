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
    name: 'Daily Operations Example Template',
    description:
      'One concrete starter example for tracking orders, delayed tasks, support tickets, system status, team notes, and handoff actions. Use it as inspiration, then adapt AquaMesh to your own domain.',
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
  {
    id: 'template-knowledge-math',
    name: 'Mathematics Knowledge Wiki Template',
    description:
      'A visual study page for formulas, worked examples, practice progress, and questions to review later.',
    category: 'Knowledge Workspace',
    components: [
      {
        id: 'template-math-title',
        type: 'Label',
        props: {
          text: 'Mathematics 1 — Derivatives',
          variant: 'h4',
          gutterBottom: true,
          useCustomColor: true,
          customColor: '#1976D2',
          fontWeight: 700,
        },
      },
      {
        id: 'template-math-overview',
        type: 'FieldSet',
        props: {
          legend: 'What this dashboard teaches',
          collapsed: false,
          borderStyle: 'solid',
          useCustomBorderColor: true,
          useCustomLegendColor: true,
          borderColor: '#1976D2',
          legendColor: '#1976D2',
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
          padding: 2,
          borderRadius: 8,
        },
        children: [
          {
            id: 'template-math-goal',
            type: 'Label',
            props: {
              text: 'Use this as a wiki page: collect the concept, formulas, examples, practice questions, and a progress chart in one reusable dashboard.',
              variant: 'body1',
            },
          },
        ],
      },
      {
        id: 'template-math-grid',
        type: 'GridBox',
        props: { columns: 2, spacing: 2, responsive: true },
        children: [
          {
            id: 'template-math-formulas',
            type: 'FieldSet',
            props: {
              legend: 'Core formulas',
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#7B1FA2',
              legendColor: '#7B1FA2',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-math-formula-label',
                type: 'Label',
                props: {
                  text: 'Power rule: d/dx xⁿ = n·xⁿ⁻¹\nChain rule: d/dx f(g(x)) = f′(g(x))·g′(x)\nProduct rule: (fg)′ = f′g + fg′',
                  variant: 'body1',
                  whiteSpace: 'pre-line',
                },
              },
            ],
          },
          {
            id: 'template-math-questions',
            type: 'FieldSet',
            props: {
              legend: 'Questions to resolve',
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#EF6C00',
              legendColor: '#EF6C00',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-math-question-input',
                type: 'TextField',
                props: {
                  label: 'Add a doubt or exam question',
                  placeholder: 'Example: when should I use chain rule?',
                  fullWidth: true,
                  variant: 'outlined',
                  helperText:
                    'Future idea: turn notes/questions into dashboard blocks automatically.',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'template-math-progress',
        type: 'Chart',
        props: {
          title: 'Study progress',
          chartType: 'pie',
          height: 260,
          description: 'Example of using charts as visual study feedback.',
          data: `{
            "labels": ["Understood", "Needs practice", "Ask teacher"],
            "datasets": [{
              "data": [55, 35, 10],
              "backgroundColor": ["rgba(25, 118, 210, 0.85)", "rgba(239, 108, 0, 0.85)", "rgba(194, 24, 91, 0.85)"],
              "borderWidth": 2
            }]
          }`,
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['knowledge wiki', 'math', 'study', 'formulas', 'chart'],
  },
  {
    id: 'template-knowledge-physics',
    name: 'Physics Knowledge Wiki Template',
    description:
      'A visual physics study page for formulas, experiment notes, diagrams, and revision status.',
    category: 'Knowledge Workspace',
    components: [
      {
        id: 'template-physics-title',
        type: 'Label',
        props: {
          text: 'Physics 1 — Motion',
          variant: 'h4',
          gutterBottom: true,
          useCustomColor: true,
          customColor: '#007C66',
          fontWeight: 700,
        },
      },
      {
        id: 'template-physics-overview',
        type: 'FieldSet',
        props: {
          legend: 'Knowledge page structure',
          collapsed: false,
          borderStyle: 'solid',
          useCustomBorderColor: true,
          useCustomLegendColor: true,
          borderColor: '#007C66',
          legendColor: '#007C66',
          backgroundColor: 'rgba(0, 124, 102, 0.08)',
          padding: 2,
          borderRadius: 8,
        },
        children: [
          {
            id: 'template-physics-overview-label',
            type: 'Label',
            props: {
              text: 'This example shows how AquaMesh can behave like a visual wiki: formulas, notes, questions, and charts live in the same dashboard.',
              variant: 'body1',
            },
          },
        ],
      },
      {
        id: 'template-physics-grid',
        type: 'GridBox',
        props: { columns: 2, spacing: 2, responsive: true },
        children: [
          {
            id: 'template-physics-formulas',
            type: 'FieldSet',
            props: {
              legend: 'Motion formulas',
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#455A64',
              legendColor: '#455A64',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-physics-formula-label',
                type: 'Label',
                props: {
                  text: 'Velocity: v = Δx / Δt\nAcceleration: a = Δv / Δt\nPosition: x = x₀ + vt + ½at²',
                  variant: 'body1',
                  whiteSpace: 'pre-line',
                },
              },
            ],
          },
          {
            id: 'template-physics-lab-notes',
            type: 'FieldSet',
            props: {
              legend: 'Experiment notes',
              borderStyle: 'solid',
              useCustomBorderColor: true,
              useCustomLegendColor: true,
              borderColor: '#C2185B',
              legendColor: '#C2185B',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-physics-note-input',
                type: 'TextField',
                props: {
                  label: 'Observation',
                  placeholder:
                    'Example: slope of position/time graph gives velocity',
                  fullWidth: true,
                  variant: 'outlined',
                  helperText:
                    'Future idea: paste notes and generate a dashboard from them.',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'template-physics-chart',
        type: 'Chart',
        props: {
          title: 'Revision status',
          chartType: 'bar',
          height: 280,
          description: 'Track what needs review before the exam.',
          data: `{
            "labels": ["Formulas", "Graphs", "Problems", "Lab notes"],
            "datasets": [{
              "label": "Confidence",
              "data": [80, 55, 45, 70],
              "backgroundColor": "rgba(0, 124, 102, 0.75)",
              "borderColor": "rgba(0, 124, 102, 1)",
              "borderWidth": 2
            }]
          }`,
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['knowledge wiki', 'physics', 'study', 'formulas', 'notes'],
  },

  {
    id: 'template-math-derivatives-chart',
    name: 'Mathematics Derivatives Chart Template',
    description: 'A chart widget for derivative practice progress.',
    category: 'Knowledge Workspace',
    components: [
      {
        id: 'template-math-chart-title',
        type: 'Label',
        props: {
          text: 'Mathematics 1 — Chart',
          variant: 'h5',
          gutterBottom: true,
          useCustomColor: true,
          customColor: '#1976D2',
          fontWeight: 700,
        },
      },
      {
        id: 'template-math-progress-chart',
        type: 'Chart',
        props: {
          title: 'Derivative practice progress',
          chartType: 'bar',
          height: 280,
          description:
            'Example chart: what is understood, what needs practice, and what needs help.',
          data: `{
            "labels": ["Power rule", "Chain rule", "Product rule", "Word problems"],
            "datasets": [{
              "label": "Confidence",
              "data": [85, 55, 65, 35],
              "backgroundColor": "rgba(25, 118, 210, 0.75)",
              "borderColor": "rgba(25, 118, 210, 1)",
              "borderWidth": 2
            }]
          }`,
        },
      },
      {
        id: 'template-math-chart-note',
        type: 'Label',
        props: {
          text: 'This is a chart block. Later it could react to answers, checks, or note data.',
          variant: 'body2',
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['mathematics', 'derivatives', 'chart'],
  },
  {
    id: 'template-math-derivatives-example',
    name: 'Mathematics Derivatives Example Template',
    description:
      'A widget with worked derivative examples and a question input.',
    category: 'Knowledge Workspace',
    components: [
      {
        id: 'template-math-example-title',
        type: 'Label',
        props: {
          text: 'Mathematics 1 — Derivatives Example',
          variant: 'h5',
          gutterBottom: true,
          useCustomColor: true,
          customColor: '#EF6C00',
          fontWeight: 700,
        },
      },
      {
        id: 'template-math-example-section',
        type: 'FieldSet',
        props: {
          legend: 'Worked example',
          borderStyle: 'solid',
          borderColor: '#EF6C00',
          legendColor: '#EF6C00',
          useCustomBorderColor: true,
          useCustomLegendColor: true,
          padding: 2,
          borderRadius: 8,
        },
        children: [
          {
            id: 'template-math-example-text',
            type: 'Label',
            props: {
              text: 'Example: f(x)=3x⁴ - 2x² + 7\nf′(x)=12x³ - 4x\n\nWhy: apply the power rule to each term.',
              variant: 'body1',
              whiteSpace: 'pre-line',
            },
          },
          {
            id: 'template-math-example-input',
            type: 'TextField',
            props: {
              label: 'Try one yourself',
              placeholder: 'Derivative of x³ + 5x?',
              fullWidth: true,
              variant: 'outlined',
              helperText:
                'This is an input block for answers, doubts, or notes.',
            },
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['mathematics', 'derivatives', 'example', 'input'],
  },
  {
    id: 'template-math-derivatives-theory',
    name: 'Mathematics Derivatives Theory Template',
    description: 'A widget with derivative theory and formulas.',
    category: 'Knowledge Workspace',
    components: [
      {
        id: 'template-math-theory-title',
        type: 'Label',
        props: {
          text: 'Mathematics 1 — Theory Derivatives',
          variant: 'h5',
          gutterBottom: true,
          useCustomColor: true,
          customColor: '#7B1FA2',
          fontWeight: 700,
        },
      },
      {
        id: 'template-math-theory-fieldset',
        type: 'FieldSet',
        props: {
          legend: 'Core theory',
          borderStyle: 'solid',
          borderColor: '#7B1FA2',
          legendColor: '#7B1FA2',
          useCustomBorderColor: true,
          useCustomLegendColor: true,
          padding: 2,
          borderRadius: 8,
        },
        children: [
          {
            id: 'template-math-theory-text',
            type: 'Label',
            props: {
              text: 'A derivative measures the rate of change of a function.\n\nPower rule: d/dx xⁿ = n·xⁿ⁻¹\nChain rule: d/dx f(g(x)) = f′(g(x))·g′(x)\nProduct rule: (fg)′ = f′g + fg′',
              variant: 'body1',
              whiteSpace: 'pre-line',
            },
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['mathematics', 'derivatives', 'theory', 'formulas'],
  },
  {
    id: 'template-knowledge-tutorial',
    name: 'AquaMesh Tutorial Template',
    description: 'A dashboard that explains widgets, dashboards, and blocks.',
    category: 'Knowledge Workspace',
    components: [
      {
        id: 'template-tutorial-title',
        type: 'Label',
        props: {
          text: 'AquaMesh Tutorial',
          variant: 'h4',
          gutterBottom: true,
          useCustomColor: true,
          customColor: '#007C66',
          fontWeight: 700,
        },
      },
      {
        id: 'template-tutorial-intro',
        type: 'FieldSet',
        props: {
          legend: 'The three ideas',
          borderStyle: 'solid',
          borderColor: '#007C66',
          legendColor: '#007C66',
          useCustomBorderColor: true,
          useCustomLegendColor: true,
          padding: 2,
          borderRadius: 8,
        },
        children: [
          {
            id: 'template-tutorial-text',
            type: 'Label',
            props: {
              text: 'Widgets are reusable pieces of knowledge.\nDashboards are pages where widgets live together.\nBlocks are the small parts inside a widget: labels, inputs, buttons, charts, and groups.',
              variant: 'body1',
              whiteSpace: 'pre-line',
            },
          },
        ],
      },
      {
        id: 'template-tutorial-blocks',
        type: 'GridBox',
        props: { columns: 2, spacing: 2, responsive: true },
        children: [
          {
            id: 'template-tutorial-label-section',
            type: 'FieldSet',
            props: { legend: 'Label block', padding: 2, borderRadius: 8 },
            children: [
              {
                id: 'template-tutorial-label-example',
                type: 'Label',
                props: {
                  text: 'This is a label: text, theory, explanations, or titles.',
                  variant: 'body1',
                },
              },
            ],
          },
          {
            id: 'template-tutorial-input-section',
            type: 'FieldSet',
            props: { legend: 'Input block', padding: 2, borderRadius: 8 },
            children: [
              {
                id: 'template-tutorial-input-example',
                type: 'TextField',
                props: {
                  label: 'This is an input',
                  placeholder: 'Write a note or answer',
                  fullWidth: true,
                },
              },
            ],
          },
          {
            id: 'template-tutorial-button-section',
            type: 'FieldSet',
            props: { legend: 'Button block', padding: 2, borderRadius: 8 },
            children: [
              {
                id: 'template-tutorial-button-example',
                type: 'Button',
                props: {
                  text: 'This is a button',
                  variant: 'contained',
                  showToast: true,
                  toastMessage: 'Button clicked',
                  toastSeverity: 'info',
                },
              },
            ],
          },
          {
            id: 'template-tutorial-chart-section',
            type: 'FieldSet',
            props: {
              legend: 'Chart / graph block',
              padding: 2,
              borderRadius: 8,
            },
            children: [
              {
                id: 'template-tutorial-chart-example',
                type: 'Chart',
                props: {
                  title: 'This is a chart',
                  chartType: 'pie',
                  height: 220,
                  data: `{"labels":["Labels","Inputs","Charts"],"datasets":[{"data":[35,30,35],"backgroundColor":["rgba(0,124,102,0.8)","rgba(25,118,210,0.8)","rgba(239,108,0,0.8)"]}]}`,
                },
              },
            ],
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['tutorial', 'widgets', 'dashboards', 'blocks'],
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

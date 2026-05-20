export const STARTER_WIDGET_TEMPLATES: Record<
  string,
  { templateId: string; minBlocks: number }
> = {
  'Mathematics 1 - Chart': {
    templateId: 'template-math-derivatives-chart',
    minBlocks: 3,
  },
  'Mathematics 1 - Derivatives Example': {
    templateId: 'template-math-derivatives-example',
    minBlocks: 4,
  },
  'Mathematics 1 - Theory Derivatives': {
    templateId: 'template-math-derivatives-theory',
    minBlocks: 3,
  },
  'StudyMesh Tutorial': {
    templateId: 'template-knowledge-tutorial',
    minBlocks: 16,
  },
  'StudyMesh Interactivity': {
    templateId: 'template-aquamesh-interactivity',
    minBlocks: 10,
  },
  'Content Load Reference Pack': {
    templateId: 'template-content-load-reference-pack',
    minBlocks: 12,
  },
  'Grouping Layout Tutorial': {
    templateId: 'template-grouping-layout-tutorial',
    minBlocks: 22,
  },
}

export const STARTER_WIDGET_NAMES = Object.keys(STARTER_WIDGET_TEMPLATES)

import { CustomWidget } from '../components/WidgetEditor/WidgetStorage'
import { ComponentData } from '../components/WidgetEditor/types/types'
import { DashboardLayout } from '../state/store'

export type StudyPackSourceFormat =
  | 'paste'
  | 'markdown'
  | 'text'
  | 'csv'
  | 'markdown-table'
  | 'quick-syntax'

export type StudyObjectKind =
  | 'note'
  | 'term'
  | 'qa'
  | 'list'
  | 'table'
  | 'resource'

export interface StudyObjectBase {
  id: string
  kind: StudyObjectKind
  title?: string
  sourceLine: number
  tags: string[]
}

export interface StudyNoteObject extends StudyObjectBase {
  kind: 'note'
  body: string
}

export interface StudyTermObject extends StudyObjectBase {
  kind: 'term'
  term: string
  definition: string
}

export interface StudyQAObject extends StudyObjectBase {
  kind: 'qa'
  question: string
  answer: string
}

export interface StudyListObject extends StudyObjectBase {
  kind: 'list'
  items: string[]
  ordered: boolean
  checklist: boolean
}

export interface StudyTableObject extends StudyObjectBase {
  kind: 'table'
  headers: string[]
  rows: string[][]
}

export interface StudyResourceObject extends StudyObjectBase {
  kind: 'resource'
  url: string
  label: string
  resourceType: 'image' | 'pdf' | 'link'
}

export type StudyObject =
  | StudyNoteObject
  | StudyTermObject
  | StudyQAObject
  | StudyListObject
  | StudyTableObject
  | StudyResourceObject

export interface StudyPack {
  id: string
  title: string
  sourceFormat: StudyPackSourceFormat
  objects: StudyObject[]
  warnings: string[]
}

export interface StudyPackParseOptions {
  title?: string
  sourceFormat?: StudyPackSourceFormat
  packId?: string
  defaultTags?: string[]
}

export interface StudyPackGeneratorOptions {
  author?: string
  category?: string
  createdAt?: string
  dashboardName?: string
  maxObjectsPerWidget?: number
  widgetIdPrefix?: string
}

export type StudyPackWidgetRecord = CustomWidget

export type StudyPackSaveWidgetInput = Omit<
  CustomWidget,
  'id' | 'createdAt' | 'updatedAt'
>

export interface StudyPackGeneratedDashboard {
  name: string
  layout: DashboardLayout
}

export interface GeneratedStudyPack {
  pack: StudyPack
  widgets: StudyPackWidgetRecord[]
  dashboard: StudyPackGeneratedDashboard
}

export type StudyPackComponent = ComponentData

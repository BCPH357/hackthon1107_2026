import type { TownPassServiceId } from './townpassServices'

/** 由使用者身分推導出的特徵，用來推薦事件、標示「你可能符合」 */
export type ProfileKey =
  | 'elder'
  | 'disability'
  | 'vision'
  | 'hearing'
  | 'mobility'
  | 'cognition'
  | 'mental'
  | 'pregnant'
  | 'injured'
  | 'majorIllness'
  | 'dementia'
  | 'caregiver'
  | 'careElder'
  | 'careDisabled'
  | 'carePatient'
  | 'childcare'
  | 'lowIncome'
  | 'livingAlone'
  | 'singleParent'
  | 'specialFamily'
  | 'jobSeeking'
  | 'taipeiResident'
  | 'indigenous'
  | 'veteran'

/** 這一步要怎麼辦，決定步驟按鈕上的標籤 */
export type StepMode = 'online' | 'counter' | 'phone' | 'visit' | 'home' | 'wait' | 'self'

export interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

export interface ResourceDef {
  name: string
  description: string
  /** 符合任一特徵時標示「你可能符合」 */
  for?: ProfileKey[]
  phone?: string
}

export interface WhereDef {
  name: string
  detail?: string
  phone?: string
  mapQuery?: string
  /** 知道使用者行政區時改用這組，{district} 會換成「中山區」等 */
  districtName?: string
  districtMapQuery?: string
}

export interface StepDef {
  id: string
  title: string
  summary: string
  mode: StepMode
  what: string
  prepare: string[]
  where: WhereDef
  resources: ResourceDef[]
  services: TownPassServiceId[]
}

export interface EventDef {
  id: string
  title: string
  summary?: string
  intro?: string
  recommendFor: ProfileKey[]
  /** 沒有步驟代表內容建置中 */
  steps?: StepDef[]
}

export interface CategoryDef {
  id: string
  title: string
  events: EventDef[]
}

import type { IconKey } from './icons'
import type { PlaceType } from './places'
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
  /** 有開放資料座標的地點類型：步驟頁會出現「用 AR 找方向」（src/data/places.ts） */
  placeType?: PlaceType
}

/**
 * 易讀版文字：一句只講一件事、用日常用詞、把術語換成具體說明。
 * 沒有寫的欄位會沿用一般版。
 */
export interface EasyStep {
  /** 步驟清單上的一句話 */
  summary: string
  /** 要做什麼，照順序一句一行 */
  what: string[]
  prepare?: string[]
  /** 不寫的話沿用一般版（已依行政區換成「大安區公所」這類具體地點） */
  where?: string
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
  easy?: EasyStep
}

export interface EventDef {
  id: string
  title: string
  summary?: string
  intro?: string
  recommendFor: ProfileKey[]
  /** 沒有指定時沿用類別的圖示 */
  icon?: IconKey
  /** 沒有步驟代表內容建置中 */
  steps?: StepDef[]
}

export interface CategoryDef {
  id: string
  title: string
  icon: IconKey
  events: EventDef[]
}

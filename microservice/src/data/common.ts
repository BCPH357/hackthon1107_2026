// 多個事件共用的資源與地點。
// 資源卡片的資料來源要對應卡片內容：辦哪件事就附那件事的官方說明；
// 有 AR 方向指引的地點，另外附上臺北資料大平台的地點資料集。

import { SOURCES } from './sources'
import type { ResourceDef, SourceDef, WhereDef } from './types'

/** 區公所社會課。sources 放這件事的官方說明，地點座標的開放資料會自動附上 */
export function districtOffice(...sources: SourceDef[]): ResourceDef {
  return {
    name: '區公所社會課',
    description: '受理身心障礙、急難救助、低收入戶等社會福利申請',
    sources: [...sources, SOURCES.openDataToilets],
  }
}

/** 戶政事務所。sources 放這件事的官方說明，名稱、地址與座標的開放資料會自動附上 */
export function householdOffice(...sources: SourceDef[]): ResourceDef {
  return {
    name: '戶政事務所',
    description: '辦理結婚、離婚、收養、出生、死亡等戶籍登記',
    sources: [...sources, SOURCES.openDataHousehold, SOURCES.openDataToilets],
  }
}

/** 臺北市立聯合醫院：AR 方向指引帶使用者去的院區 */
export function cityHospital(...sources: SourceDef[]): ResourceDef {
  return {
    name: '臺北市立聯合醫院',
    description: '各院區的地點；出發前先打電話確認有你要看的科',
    sources: [...sources, SOURCES.cityHospitalBranches, SOURCES.openDataToilets],
  }
}

export const WELFARE_HOTLINE: ResourceDef = {
  name: '1957 福利諮詢專線',
  description: '社會福利的問題都可以打電話問',
  phone: '1957',
  sources: [SOURCES.welfareHotline],
}

/** 戶籍地的區公所：知道使用者住哪一區時換成「中山區公所」，並可以用 AR 找方向 */
export function districtOfficeWhere(detail?: string): WhereDef {
  return {
    name: '戶籍所在地的區公所',
    detail,
    mapQuery: '臺北市 區公所',
    districtName: '{district}公所',
    districtMapQuery: '臺北市{district}公所',
    placeType: 'districtOffice',
  }
}

/** 戶政事務所：多數登記可以跨區辦，預設帶使用者去最近的 */
export function householdOfficeWhere(detail?: string): WhereDef {
  return {
    name: '戶政事務所',
    detail,
    mapQuery: '臺北市 戶政事務所',
    districtName: '{district}戶政事務所',
    districtMapQuery: '臺北市{district}戶政事務所',
    placeType: 'household',
  }
}

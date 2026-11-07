// 「去哪裡辦」AR 方向指引的目的地。資料由 scripts/fetch-places.mjs 從臺北資料大平台抓取後存成 places.json，
// 執行時不連網，比賽現場網路不穩也能用。要更新資料就重跑那支程式。

import data from './places.json'
import { distanceMeters, type LatLng } from '../utils/geo'

export type PlaceType = 'districtOffice' | 'household' | 'hospital'

export interface Place extends LatLng {
  id: string
  type: PlaceType
  name: string
  district: string
  address: string
  phone?: string
}

/** 開放資料裡找不到座標的地點，畫面上要說明並改用地圖搜尋 */
export interface MissingPlace {
  type: PlaceType
  district: string
  name: string
  address?: string
}

export interface DataSource {
  title: string
  url: string
}

export const PLACES = data.places as Place[]
export const MISSING_PLACES = data.missing as MissingPlace[]
export const PLACE_SOURCES: DataSource[] = Object.values(data.sources)
export const PLACES_FETCHED_AT = data.fetchedAt
export const PLACES_LICENSE = data.license

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  districtOffice: '區公所',
  household: '戶政事務所',
  hospital: '臺北市立聯合醫院院區',
}

/**
 * 預設帶使用者去哪裡：
 * 區公所要去戶籍地那一區（身障證明在戶籍地申請）；戶政事務所可以跨區辦，聯醫各院區也不分區，都去最近的。
 */
export const PREFER_OWN_DISTRICT: Record<PlaceType, boolean> = {
  districtOffice: true,
  household: false,
  hospital: false,
}

export function placesOf(type: PlaceType): Place[] {
  return PLACES.filter((place) => place.type === type)
}

export function placeInDistrict(type: PlaceType, district: string | null): Place | undefined {
  if (!district) return undefined
  return PLACES.find((place) => place.type === type && place.district === district)
}

export function missingInDistrict(type: PlaceType, district: string | null): MissingPlace | undefined {
  if (!district) return undefined
  return MISSING_PLACES.find((place) => place.type === type && place.district === district)
}

export interface PlaceWithDistance {
  place: Place
  distance: number
}

/** 由近到遠排序 */
export function byDistance(places: Place[], from: LatLng): PlaceWithDistance[] {
  return places
    .map((place) => ({ place, distance: distanceMeters(from, place) }))
    .sort((a, b) => a.distance - b.distance)
}

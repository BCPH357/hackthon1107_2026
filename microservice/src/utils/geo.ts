// 經緯度計算：距離、方位角，以及給人看的方向說法。座標一律是 WGS84（GPS 與臺北資料大平台都用這套）。

export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS = 6371008.8 // 公尺
const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/** 0 到 360 度 */
export function normalize360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** -180 到 180 度：負的在左邊、正的在右邊 */
export function normalize180(deg: number): number {
  const d = normalize360(deg)
  return d > 180 ? d - 360 : d
}

/** 兩點的直線距離（大圓距離），單位公尺 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 從 from 看 to 的方位角：正北 0 度、順時針到 360 度 */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return normalize360(toDeg(Math.atan2(y, x)))
}

/** 「約 650 公尺」「約 1.2 公里」：GPS 本身有誤差，不顯示到個位數 */
export function formatDistance(meters: number): string {
  if (meters < 100) return `約 ${Math.max(10, Math.round(meters / 10) * 10)} 公尺`
  if (meters < 1000) return `約 ${Math.round(meters / 50) * 50} 公尺`
  return `約 ${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} 公里`
}

/** 長者、推輪椅、孕婦走得比較慢，用每分鐘 60 公尺估（一般成人約 80 公尺） */
export const WALK_METERS_PER_MINUTE = 60

export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE))
}

const CARDINALS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'] as const

/** 八方位：給沒有指南針、只能用東西南北說明的情況 */
export function cardinal(bearing: number): string {
  return CARDINALS[Math.round(normalize360(bearing) / 45) % 8]!
}

export interface RelativeDirection {
  /** 「正前方」「右前方」「左邊」…… */
  word: string
  /** 時鐘方向：正前方是 12 點、右邊是 3 點 */
  clock: number
}

/** relative：目標相對手機面向的角度，-180 到 180，正的在右邊 */
export function relativeDirection(relative: number): RelativeDirection {
  const r = normalize180(relative)
  const abs = Math.abs(r)
  const side = r > 0 ? '右' : '左'
  let word: string
  if (abs <= 15) word = '正前方'
  else if (abs <= 60) word = `${side}前方`
  else if (abs <= 120) word = `${side}邊`
  else if (abs < 165) word = `${side}後方`
  else word = '正後方'
  const clock = Math.round(normalize360(r) / 30) % 12 || 12
  return { word, clock }
}

/** 臺北市的大致範圍，用來判斷使用者是不是人在臺北 */
export function isInTaipei({ lat, lng }: LatLng): boolean {
  return lat > 24.95 && lat < 25.22 && lng > 121.45 && lng < 121.67
}

// 與城市通 App 的雙向溝通。
// App 在 WebView 注入 window.flutterObject；送出與收到的都是 JSON 字串 { name, data }。
// 可用的 name 以 lib/util/web_message_handler/tp_web_message_handler.dart 為準。
// 一般瀏覽器沒有 flutterObject，改用模擬資料，方便在桌機 Chrome 開發。

import { showToast } from '../stores/toast'
import type { TownPassService } from '../data/townpassServices'

type MessageListener = (event: MessageEvent<string>) => void

interface FlutterObject {
  postMessage(message: string): void
  addEventListener(type: 'message', listener: MessageListener): void
  removeEventListener(type: 'message', listener: MessageListener): void
}

declare global {
  interface Window {
    flutterObject?: FlutterObject
  }
}

export interface TownPassAddress {
  city?: string
  town?: string
  priority?: boolean
}

/** userinfo 回傳的帳號資料，只列出這個服務會用到的欄位 */
export interface TownPassAccount {
  realName?: string
  birthday?: string
  citizen?: boolean
  nativePeople?: boolean
  addresses?: TownPassAddress[]
}

// 與 TownPass 的 assets/mock_data/account.json 相同的測試資料，只在一般瀏覽器使用
const MOCK_ACCOUNT: TownPassAccount = {
  realName: '金大森',
  birthday: '1988/12/12',
  citizen: true,
  nativePeople: false,
  addresses: [{ city: '臺北市', town: '中山區', priority: true }],
}

export function isInApp(): boolean {
  return typeof window !== 'undefined' && window.flutterObject !== undefined
}

function post(name: string, data: unknown): void {
  window.flutterObject?.postMessage(JSON.stringify({ name, data }))
}

/** 送出訊息並等待同名的回覆；逾時或不在 App 內時回傳 null。收到回覆或逾時後一定移除監聽。 */
function request<T>(name: string, data: unknown, timeoutMs = 3000): Promise<T | null> {
  const bridge = window.flutterObject
  if (!bridge) return Promise.resolve(null)

  return new Promise((resolve) => {
    const onMessage: MessageListener = (event) => {
      let reply: { name?: unknown; data?: unknown }
      try {
        reply = JSON.parse(event.data)
      } catch {
        return
      }
      if (reply.name !== name) return
      cleanup()
      resolve((reply.data ?? null) as T | null)
    }
    const timer = window.setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeoutMs)
    const cleanup = () => {
      window.clearTimeout(timer)
      bridge.removeEventListener('message', onMessage)
    }
    bridge.addEventListener('message', onMessage)
    post(name, data)
  })
}

export async function getUserInfo(): Promise<{ account: TownPassAccount | null; mocked: boolean }> {
  if (!isInApp()) return { account: MOCK_ACCOUNT, mocked: true }
  // 沒有帳號時 App 回傳空陣列
  const data = await request<TownPassAccount | unknown[]>('userinfo', null)
  if (!data || Array.isArray(data)) return { account: null, mocked: false }
  return { account: data, mocked: false }
}

export interface DevicePosition {
  lat: number
  lng: number
  /** 定位誤差半徑（公尺），不知道時為 null */
  accuracy: number | null
}

/** App 的 location 回傳 geolocator 的 Position.toJson()，只列出用到的欄位；取不到時回傳空陣列 */
interface AppPosition {
  latitude?: number
  longitude?: number
  accuracy?: number
}

/**
 * 取得目前位置。在台北通裡用 App 的 location（第一次會跳出系統的定位權限詢問，所以等久一點），
 * 一般瀏覽器用 navigator.geolocation。取不到位置回傳 null，由畫面決定怎麼退場。
 */
export async function getCurrentPosition(timeoutMs = 15000): Promise<DevicePosition | null> {
  if (isInApp()) {
    const data = await request<AppPosition | unknown[]>('location', null, timeoutMs)
    if (!data || Array.isArray(data) || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null
    return { lat: data.latitude, lng: data.longitude, accuracy: typeof data.accuracy === 'number' ? data.accuracy : null }
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 },
    )
  })
}

export function callPhone(number: string): void {
  if (isInApp()) post('phone_call', number)
  else showToast(`瀏覽器預覽：在台北通中會撥打 ${number}`)
}

/** 外部連結一律交給 App 開；WebView 不支援 window.open 開新視窗 */
export function openLink(url: string): void {
  if (isInApp()) post('open_link', url)
  else showToast(`瀏覽器預覽：在台北通中會開啟 ${url}`)
}

/** 地圖只用 OpenStreetMap（比賽規則） */
export function openMapSearch(query: string): void {
  openLink(`https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`)
}

/** OpenStreetMap 的步行路線規劃（OSRM 步行引擎） */
export function openWalkingDirections(from: { lat: number; lng: number }, to: { lat: number; lng: number }): void {
  const point = ({ lat, lng }: { lat: number; lng: number }) => `${lat.toFixed(6)},${lng.toFixed(6)}`
  openLink(
    `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${encodeURIComponent(`${point(from)};${point(to)}`)}`,
  )
}

export function openTownPassService(service: TownPassService): void {
  if (service.phone) callPhone(service.phone)
  else if (service.url) openLink(service.url)
  // CLAUDE_UI_GUIDE 7：沒有可用網址就明講尚未開放，不導向猜測的網址
  else showToast(`「${service.title}」在台北通尚未開放，可以先撥打 1999 詢問`)
}

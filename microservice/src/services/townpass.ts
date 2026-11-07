// 與城市通 App 的雙向溝通。
// App 在 WebView 注入 window.flutterObject；送出與收到的都是 JSON 字串 { name, data }。
// 可用的 name 以 lib/util/web_message_handler/tp_web_message_handler.dart 為準。
// 一般瀏覽器沒有 flutterObject，改用模擬資料，方便在桌機 Chrome 開發。

import { showToast } from '../stores/toast'
import type { TownPassService } from '../data/townpassServices'
import { readSharedJson, writeSharedJson } from '../utils/storage'

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

/** 持續接收同名的訊息（App 可能回覆多次），回傳取消監聽的函式 */
function subscribe<T>(name: string, onData: (data: T) => void): () => void {
  const bridge = window.flutterObject
  if (!bridge) return () => {}
  const onMessage: MessageListener = (event) => {
    let reply: { name?: unknown; data?: unknown }
    try {
      reply = JSON.parse(event.data)
    } catch {
      return
    }
    if (reply.name === name) onData(reply.data as T)
  }
  bridge.addEventListener('message', onMessage)
  return () => bridge.removeEventListener('message', onMessage)
}

// ---- 藍牙傳送基本資料（幫家人辦）----
// 資料由 App 依白名單從台北通帳號組成，不含身分證字號、電話、地址與健康資料；
// 只在兩支手機之間直接傳送，不經過任何伺服器。

/** 藍牙傳送的內容，欄位與 lib/service/ble_share_service.dart 一致 */
export interface SharedBasicInfo {
  v: number
  name?: string
  age?: number | null
  city?: string | null
  town?: string | null
  citizen?: boolean | null
  native?: boolean | null
}

/** 藍牙不能用的原因 */
export type BleUnavailableReason = 'off' | 'unauthorized' | 'unsupported' | 'noAccount'

export type BleShareEvent =
  | { state: 'advertising'; code: string }
  | { state: 'sent' }
  | { state: 'timeout' }
  | { state: 'unavailable'; reason: BleUnavailableReason }
  | { state: 'error'; message?: string }

export type BleReceiveResult =
  | { state: 'found'; code: string; data: SharedBasicInfo }
  | { state: 'notFound' }
  | { state: 'unavailable'; reason: BleUnavailableReason }
  | { state: 'error'; message?: string }

const MOCK_SHARED: SharedBasicInfo = {
  v: 1,
  name: '金大森',
  age: 80,
  city: '臺北市',
  town: '中山區',
  citizen: true,
  native: false,
}

/**
 * 開始用藍牙傳送自己的基本資料。App 會依序回覆：advertising（附核對代碼）→ sent／timeout。
 * 回傳停止傳送的函式；離開頁面時一定要呼叫。
 */
export function startBleShare(onEvent: (event: BleShareEvent) => void): { stop: () => void; mocked: boolean } {
  if (!isInApp()) {
    const timers = [
      window.setTimeout(() => onEvent({ state: 'advertising', code: '4821' }), 300),
      window.setTimeout(() => onEvent({ state: 'sent' }), 6000),
    ]
    return { stop: () => timers.forEach((timer) => window.clearTimeout(timer)), mocked: true }
  }
  const unsubscribe = subscribe<BleShareEvent>('ble_share_start', onEvent)
  post('ble_share_start', null)
  return {
    stop: () => {
      unsubscribe()
      post('ble_share_stop', null)
    },
    mocked: false,
  }
}

/** 搜尋附近正在傳送的家人並讀取資料。App 端最多搜尋 20 秒，這裡多留一點時間給連線與讀取。 */
export async function receiveBleShare(): Promise<{ result: BleReceiveResult; mocked: boolean }> {
  if (!isInApp()) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500))
    return { result: { state: 'found', code: '4821', data: MOCK_SHARED }, mocked: true }
  }
  const result = await request<BleReceiveResult>('ble_receive', null, 35000)
  return { result: result ?? { state: 'error', message: 'timeout' }, mocked: false }
}

// ---- 藍牙交棒（長輩把一件事交給子女）----
// 藍牙只傳「交棒票」：案件 id、存取權杖、金鑰，約 200 bytes（BLE 單一欄位上限 512 bytes）。
// 案件內容放在伺服器，子女拿票去下載；之後的進度由伺服器同步。

/** 交棒票，欄位與 lib/service/ble_share_service.dart 的 validHandoverTicket 一致 */
export interface HandoverTicket {
  v: 1
  caseId: string
  token: string
  key: string
}

export type BleHandoverReceiveResult =
  | { state: 'found'; code: string; data: HandoverTicket }
  | { state: 'notFound' }
  | { state: 'unavailable'; reason: BleUnavailableReason }
  | { state: 'error'; message?: string }

// 一般瀏覽器沒有藍牙：把交棒票暫存在 localStorage（各角色共用的 key），同一個瀏覽器的另一個分頁就能「接收」。
// 模擬子女的分頁要用 ?as=family 打開，兩個角色的其他資料才會分開存（見 utils/storage.ts）
const MOCK_TICKET_KEY = 'life-events.mock-handover-ticket'

/** 清除瀏覽器預覽用的假交棒票（清除資料時一併清掉，避免家人分頁又收到舊的） */
export function clearMockHandoverTicket(): void {
  if (!isInApp()) writeSharedJson(MOCK_TICKET_KEY, null)
}

/** 開始用藍牙傳送交棒票，回覆方式同 startBleShare；離開頁面時一定要呼叫 stop */
export function startBleHandoverShare(
  ticket: HandoverTicket,
  onEvent: (event: BleShareEvent) => void,
): { stop: () => void; mocked: boolean } {
  if (!isInApp()) {
    writeSharedJson(MOCK_TICKET_KEY, ticket)
    const timers = [
      window.setTimeout(() => onEvent({ state: 'advertising', code: '4821' }), 300),
      window.setTimeout(() => onEvent({ state: 'sent' }), 6000),
    ]
    return { stop: () => timers.forEach((timer) => window.clearTimeout(timer)), mocked: true }
  }
  const unsubscribe = subscribe<BleShareEvent>('ble_handover_share_start', onEvent)
  post('ble_handover_share_start', ticket)
  return {
    stop: () => {
      unsubscribe()
      post('ble_share_stop', null)
    },
    mocked: false,
  }
}

/** 搜尋附近正在交棒的家人並讀取交棒票 */
export async function receiveBleHandover(): Promise<{ result: BleHandoverReceiveResult; mocked: boolean }> {
  if (!isInApp()) {
    await new Promise((resolve) => window.setTimeout(resolve, 1500))
    const ticket = readSharedJson<HandoverTicket | null>(MOCK_TICKET_KEY, null)
    return { result: ticket ? { state: 'found', code: '4821', data: ticket } : { state: 'notFound' }, mocked: true }
  }
  const result = await request<BleHandoverReceiveResult>('ble_receive', { kind: 'handover' }, 35000)
  return { result: result ?? { state: 'error', message: 'timeout' }, mocked: false }
}

export function openTownPassService(service: TownPassService): void {
  if (service.phone) callPhone(service.phone)
  else if (service.url) openLink(service.url)
  // CLAUDE_UI_GUIDE 7：沒有可用網址就明講尚未開放，不導向猜測的網址
  else showToast(`「${service.title}」在台北通尚未開放，可以先撥打 1999 詢問`)
}

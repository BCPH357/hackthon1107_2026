// 指南針：算出手機背面（相機）朝向哪個方位，正北 0 度、順時針。
//
// iPhone：deviceorientation 事件的 webkitCompassHeading 已經是磁北方位；iOS 13 起要先呼叫
//   DeviceOrientationEvent.requestPermission()，而且必須在使用者點按鈕的當下呼叫。
//   在台北通裡，這個請求會交給 App 的 onPermissionRequest（lib/util/tp_web_view.dart）放行。
// Android：deviceorientationabsolute 事件的 alpha／beta／gamma 是相對地理北方的旋轉角，
//   依 W3C 規格的算法換成「手機背面」的方位；手機平放時背面朝地，改用手機頂端的方位。

interface IosOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

interface OrientationPermissionApi {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export type OrientationPermission = 'granted' | 'denied' | 'not-needed'

/** 一定要在點擊事件裡同步呼叫（不能先 await 別的東西），否則 iPhone 會直接拒絕 */
export function requestOrientationPermission(): Promise<OrientationPermission> {
  const api = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined) as
    | OrientationPermissionApi
    | undefined
  if (!api?.requestPermission) return Promise.resolve('not-needed')
  return api.requestPermission().catch(() => 'denied' as const)
}

export interface HeadingReading {
  /** 手機背面朝向的方位，0 到 360 度 */
  heading: number
  /** 誤差（度），不知道時為 null；iPhone 才有 */
  accuracy: number | null
}

const DEG = Math.PI / 180

/** W3C DeviceOrientation 規格附錄的算法：手機背面（-z 軸）投影到水平面的方位 */
export function headingFromEuler(alpha: number, beta: number, gamma: number): number {
  const a = alpha * DEG
  const b = beta * DEG
  const g = gamma * DEG
  const cA = Math.cos(a)
  const sA = Math.sin(a)
  const cB = Math.cos(b)
  const sB = Math.sin(b)
  const cG = Math.cos(g)
  const sG = Math.sin(g)

  // 背面方向在東（x）、北（y）的分量
  const backEast = -cA * sG - sA * sB * cG
  const backNorth = -sA * sG + cA * sB * cG
  // 手機接近平放時背面朝下，水平分量太小、方位會亂跳，改用手機頂端（+y 軸）的方位
  if (Math.hypot(backEast, backNorth) < 0.5) {
    const topEast = -sA * cB
    const topNorth = cA * cB
    return ((Math.atan2(topEast, topNorth) / DEG) + 360) % 360
  }
  return ((Math.atan2(backEast, backNorth) / DEG) + 360) % 360
}

/**
 * 開始讀取方位，回傳停止函式。數值會做平滑處理（角度用單位向量平均，避免 359→0 度時亂轉）。
 * 收不到事件代表這台裝置沒有指南針，由呼叫端逾時判斷。
 */
export function watchHeading(onReading: (reading: HeadingReading) => void): () => void {
  let east = 0
  let north = 0
  let started = false
  const SMOOTHING = 0.25

  const push = (heading: number, accuracy: number | null) => {
    const x = Math.sin(heading * DEG)
    const y = Math.cos(heading * DEG)
    if (!started) {
      east = x
      north = y
      started = true
    } else {
      east += (x - east) * SMOOTHING
      north += (y - north) * SMOOTHING
    }
    onReading({ heading: ((Math.atan2(east, north) / DEG) + 360) % 360, accuracy })
  }

  // 有些瀏覽器兩種事件都會送，收到絕對方位後就不再用一般事件，避免兩套數值互相拉扯
  let gotAbsolute = false

  const onAbsolute = (event: DeviceOrientationEvent) => {
    if (event.alpha === null || event.beta === null || event.gamma === null) return
    gotAbsolute = true
    push(headingFromEuler(event.alpha, event.beta, event.gamma), null)
  }

  const onOrientation = (event: DeviceOrientationEvent) => {
    const ios = event as IosOrientationEvent
    if (typeof ios.webkitCompassHeading === 'number' && ios.webkitCompassHeading >= 0) {
      const accuracy = typeof ios.webkitCompassAccuracy === 'number' ? ios.webkitCompassAccuracy : null
      push(ios.webkitCompassHeading, accuracy)
      return
    }
    // Firefox 等瀏覽器把絕對方位放在一般事件裡，absolute 為 true
    if (!gotAbsolute && event.absolute && event.alpha !== null && event.beta !== null && event.gamma !== null) {
      push(headingFromEuler(event.alpha, event.beta, event.gamma), null)
    }
  }

  window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener)
  window.addEventListener('deviceorientation', onOrientation)
  return () => {
    window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener)
    window.removeEventListener('deviceorientation', onOrientation)
  }
}

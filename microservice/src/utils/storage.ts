// localStorage 在無痕模式或網站資料被清除時可能讀不到或寫不進去，
// 一律包 try/catch，讀不到就用預設值，畫面照常運作。
//
// 電腦瀏覽器用兩個分頁模擬長輩與子女時，兩個分頁共用同一份 localStorage；
// 各個 store 開頁時讀一次、之後整份寫回，後寫的分頁會蓋掉另一個分頁的資料（例如長輩的案件紀錄）。
// 所以模擬子女的分頁用網址加上 ?as=family 打開（例如 http://localhost:5173/?as=family#/family），
// 這個分頁的資料改存在「sim.family:」開頭的 key，和長輩分開。
// 角色記在 sessionStorage（每個分頁各自一份），重新整理後仍維持；網址加 ?as=elder 可切回預設。
// 手機上的 WebView 網址不會有 ?as=，key 完全不變。

const PROFILE_KEY = 'life-events.sim-profile'

function detectProfile(): string | null {
  try {
    const param = new URLSearchParams(window.location.search).get('as')
    if (param !== null) {
      if (/^[a-z0-9-]{1,20}$/.test(param) && param !== 'elder') window.sessionStorage.setItem(PROFILE_KEY, param)
      else window.sessionStorage.removeItem(PROFILE_KEY)
    }
    return window.sessionStorage.getItem(PROFILE_KEY)
  } catch {
    return null
  }
}

/** 這個分頁模擬的角色；null 代表預設（長輩，也是手機上的情況） */
export const simProfile = detectProfile()

function scoped(key: string): string {
  return simProfile ? `sim.${simProfile}:${key}` : key
}

function readRaw<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function writeRaw(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 寫不進去只代表下次打開要重填，不影響這次使用
  }
}

export function readJson<T>(key: string, fallback: T): T {
  return readRaw(scoped(key), fallback)
}

export function writeJson(key: string, value: unknown): void {
  writeRaw(scoped(key), value)
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(scoped(key))
  } catch {
    // 同上
  }
}

/** 所有分頁共用、不分角色的資料（瀏覽器模擬藍牙用的交棒票） */
export function readSharedJson<T>(key: string, fallback: T): T {
  return readRaw(key, fallback)
}

export function writeSharedJson(key: string, value: unknown): void {
  writeRaw(key, value)
}

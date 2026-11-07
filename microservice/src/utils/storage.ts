// localStorage 在無痕模式或網站資料被清除時可能讀不到或寫不進去，
// 一律包 try/catch，讀不到就用預設值，畫面照常運作。

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 寫不進去只代表下次打開要重填，不影響這次使用
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // 同上
  }
}

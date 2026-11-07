// 交棒案件的同步 API（backend/app.py）。
// 每次呼叫都帶交棒票裡的存取權杖；伺服器只存權杖的雜湊值。
//
// API 位址：
// - 沒設定 VITE_API_BASE：用相對路徑 api/…，由 Vite（dev／preview）proxy 轉到本機 Flask，同一條通道就能同時提供前端與 API。
// - 部署到 Cloudflare Pages 或打包進 App（build:app）時，網頁所在的伺服器只放靜態檔，PUT 會回 405。
//   建置時要用 VITE_API_BASE 指定 Flask 的對外網址（例如 Flask 的 Cloudflare 通道），
//   Flask 端的 ALLOWED_ORIGINS 也要列出網頁的來源（見 backend/.env.example）。
const API_BASE = (() => {
  const base = (import.meta.env.VITE_API_BASE as string | undefined)?.trim()
  return base ? `${base.replace(/\/+$/, '')}/api/` : 'api/'
})()

export type CaseApiError =
  /** 版本不符：別人剛更新過，要先下載最新版、合併後再上傳 */
  | { kind: 'conflict'; version: number }
  | { kind: 'notFound' }
  /** 權杖錯誤或沒帶權杖 */
  | { kind: 'forbidden' }
  /** 斷線、逾時或伺服器沒開 */
  | { kind: 'network' }
  | { kind: 'server'; status: number }

export type CaseApiResult<T> = { ok: true; value: T } | ({ ok: false } & CaseApiError)

export interface CaseRecord<T> {
  version: number
  data: T
  updatedAt: number
}

const TIMEOUT_MS = 10000

async function call<T>(method: 'GET' | 'PUT' | 'DELETE', path: string, token: string, body?: unknown): Promise<CaseApiResult<T>> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        // 免費版 ngrok 會先顯示警告頁，加上這個 header 才會直接回 API 的內容
        'ngrok-skip-browser-warning': 'true',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })
    const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
    // DELETE 成功回 204，沒有內容
    if (response.ok) return { ok: true, value: (json ?? {}) as T }
    if (response.status === 409) return { ok: false, kind: 'conflict', version: Number(json?.version ?? 0) }
    if (response.status === 404) return { ok: false, kind: 'notFound' }
    if (response.status === 401 || response.status === 403) return { ok: false, kind: 'forbidden' }
    return { ok: false, kind: 'server', status: response.status }
  } catch {
    return { ok: false, kind: 'network' }
  } finally {
    window.clearTimeout(timer)
  }
}

/** 上傳案件。第一次上傳 baseVersion 給 0，同時綁定權杖；之後給目前手上的版本號 */
export function putCase<T>(caseId: string, token: string, baseVersion: number, data: T): Promise<CaseApiResult<{ version: number }>> {
  return call('PUT', `cases/${encodeURIComponent(caseId)}`, token, { baseVersion, data })
}

export function getCase<T>(caseId: string, token: string): Promise<CaseApiResult<CaseRecord<T>>> {
  return call('GET', `cases/${encodeURIComponent(caseId)}`, token)
}

/** 刪除案件：清除自己手機上的資料時呼叫，另一方之後讀取會拿到 notFound */
export function deleteCase(caseId: string, token: string): Promise<CaseApiResult<Record<string, never>>> {
  return call('DELETE', `cases/${encodeURIComponent(caseId)}`, token)
}

/** 只取版本號，給輪詢用：有變動才下載整份 */
export function getCaseVersion(caseId: string, token: string): Promise<CaseApiResult<{ version: number }>> {
  return call('GET', `cases/${encodeURIComponent(caseId)}/version`, token)
}

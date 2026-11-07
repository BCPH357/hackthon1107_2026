// 後鏡頭畫面，只在手機上顯示，不錄影、不上傳、不做影像辨識。
// iPhone 的 WebView 要 iOS 14.3 以上才有 getUserMedia；台北通 App 要開 allowsInlineMediaPlayback，
// 否則畫面會被切成全螢幕播放（lib/util/tp_web_view.dart）。

export type CameraError = 'unsupported' | 'denied' | 'not-found' | 'failed'

export const CAMERA_ERROR_TEXT: Record<CameraError, string> = {
  unsupported: '這台手機的瀏覽環境不支援相機畫面',
  denied: '沒有取得相機權限',
  'not-found': '找不到可以用的相機',
  failed: '相機暫時無法開啟',
}

export type CameraResult = { stream: MediaStream } | { error: CameraError }

export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/** 相機剛被關掉、被其他 App 或來電占用時，會暫時回報「找不到」或「無法讀取」，稍等再試通常就好 */
const TRANSIENT_ERRORS = new Set(['NotReadableError', 'AbortError', 'NotFoundError', 'TrackStartError'])
const RETRY_DELAY_MS = 700

/** retries：遇到暫時性錯誤時再試幾次；權限被拒不重試 */
export async function openRearCamera(retries = 0): Promise<CameraResult> {
  if (!cameraSupported()) return { error: 'unsupported' }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    return { stream }
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    if (retries > 0 && TRANSIENT_ERRORS.has(name)) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      return openRearCamera(retries - 1)
    }
    if (name === 'NotAllowedError' || name === 'SecurityError') return { error: 'denied' }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return { error: 'not-found' }
    return { error: 'failed' }
  }
}

/** 關掉相機：停止每一條影像軌，手機上的相機使用指示燈才會熄滅 */
export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

// 朗讀（文字轉語音）。用瀏覽器內建的 Web Speech API，聲音來自手機系統的語音引擎，不經過雲端。
//
// 目前只保證 iPhone：WKWebView 支援 speechSynthesis。
// Android 的 WebView 多半沒有語音可用，這時 ttsSupported 會是 false、朗讀按鈕自動隱藏；
// 之後要支援 Android，需在台北通 App 端加朗讀 Handler（flutter_tts），由網頁送訊息請 App 念。

import { ref } from 'vue'

export interface SpeechChunk {
  /** 念到這一段時，畫面上要框起來的區塊 */
  key: string
  text: string
}

export const ttsSupported = ref(false)
export const localTtsSupported = ref(false)
export const speaking = ref(false)
/** 正在念的區塊 key，畫面用來標示念到哪裡 */
export const currentKey = ref<string | null>(null)

const synth: SpeechSynthesis | undefined = typeof window !== 'undefined' ? window.speechSynthesis : undefined

// iPhone 的 WebView 有時要等一下才拿得到語音清單，但不影響朗讀，所以 iPhone 一律視為可用
const isApple =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

function refreshSupport(): void {
  const hasApi = Boolean(synth) && typeof window.SpeechSynthesisUtterance !== 'undefined'
  ttsSupported.value = hasApi && (isApple || (synth?.getVoices().length ?? 0) > 0)
  localTtsSupported.value = hasApi && Boolean(pickVoice(true))
}

refreshSupport()
synth?.addEventListener?.('voiceschanged', refreshSupport)

/** 優先用臺灣華語的聲音（iPhone 是「美佳」），沒有的話交給系統依 zh-TW 決定 */
function pickVoice(localOnly = false): SpeechSynthesisVoice | undefined {
  const voices = (synth?.getVoices() ?? []).filter((voice) => !localOnly || voice.localService)
  const normalized = (voice: SpeechSynthesisVoice) => voice.lang.replace('_', '-').toLowerCase()
  return (
    voices.find((voice) => normalized(voice) === 'zh-tw') ??
    voices.find((voice) => /zh-(hant|tw)/.test(normalized(voice)))
  )
}

const DIGITS: Record<string, string> = { '0': '零', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九' }

/**
 * 專線號碼要一個一個數字念，不然 1999 會念成「一千九百九十九」。
 * 只處理專線；「60 天」「3 張」這種數量照常念。不用 lookbehind，iOS 15 的 Safari 不支援。
 */
export function toSpeakable(text: string): string {
  return text.replace(/(^|\D)(1999|1966|1957|113|119|110)(?=\D|$)/g, (_match, before: string, number: string) =>
    before + [...number].map((digit) => DIGITS[digit]).join(''),
  )
}

let queue: SpeechChunk[] = []
let index = 0
let queueLocalOnly = false
// 保留目前這一句的參考：Chrome 會回收沒人參考的 utterance，導致 onend 不觸發
let current: SpeechSynthesisUtterance | null = null

function finish(): void {
  current = null
  queue = []
  queueLocalOnly = false
  speaking.value = false
  currentKey.value = null
}

function speakNext(): void {
  if (!synth) return
  const chunk = queue[index]
  if (!chunk) {
    finish()
    return
  }
  const utterance = new SpeechSynthesisUtterance(toSpeakable(chunk.text))
  utterance.lang = 'zh-TW'
  utterance.rate = 0.9 // 稍微放慢，長者比較聽得清楚
  const voice = pickVoice(queueLocalOnly)
  if (queueLocalOnly && !voice) {
    finish()
    return
  }
  if (voice) utterance.voice = voice
  utterance.onstart = () => {
    if (current === utterance) currentKey.value = chunk.key
  }
  utterance.onend = () => {
    if (current !== utterance) return
    index += 1
    speakNext()
  }
  utterance.onerror = (event) => {
    if (current !== utterance) return
    // 使用者按停止或換頁時會收到 interrupted／canceled，不必處理
    if (event.error === 'interrupted' || event.error === 'canceled') return
    index += 1
    speakNext()
  }
  current = utterance
  synth.speak(utterance)
}

/** 一段一段念；每段分開念，避免長文字在部分瀏覽器念到一半被切掉 */
export function speakChunks(chunks: SpeechChunk[], localOnly = false): void {
  if (!synth || !chunks.length) return
  stopSpeaking()
  queue = chunks
  queueLocalOnly = localOnly
  index = 0
  speaking.value = true
  speakNext()
}

export function stopSpeaking(): void {
  const wasActive = current !== null || speaking.value
  finish()
  // iPhone 上 cancel 後立刻 speak 偶爾會沒聲音，所以只在真的有在念時才 cancel
  if (wasActive || synth?.speaking || synth?.pending) synth?.cancel()
}

// 切到別的 App 或鎖螢幕就停，回來不會突然自己念
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopSpeaking()
  })
}

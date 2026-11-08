// 字級與對比設定（計畫書：無障礙介面、字級調整）。
// 不是個人資料，所以「清除這支手機上我填的資料」不會清掉它，避免長者清完資料字又變小。

import { reactive, watch } from 'vue'
import { readJson, writeJson } from '../utils/storage'

export const FONT_SCALE_OPTIONS = [
  { value: 'standard', label: '標準' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' },
  { value: 'max', label: '最大' },
] as const

export const CONTRAST_OPTIONS = [
  { value: 'standard', label: '標準' },
  { value: 'high', label: '高對比' },
] as const

export type FontScale = (typeof FONT_SCALE_OPTIONS)[number]['value']
export type Contrast = (typeof CONTRAST_OPTIONS)[number]['value']

// 版面全部用 rem，改 html 的字級就會整頁一起放大；200% 已經測過不會破版
const FONT_SCALE_PERCENT: Record<FontScale, number> = {
  standard: 100,
  large: 125,
  xlarge: 150,
  max: 200,
}

export const EASY_READ_OPTIONS = [
  { value: 'off', label: '一般' },
  { value: 'on', label: '易讀版' },
] as const

export type EasyReadSetting = (typeof EASY_READ_OPTIONS)[number]['value']

interface DisplaySettings {
  fontScale: FontScale
  contrast: Contrast
  /** 步驟改用更短、更白話的易讀版文字 */
  easyRead: EasyReadSetting
  /** 使用者是否已經在開始前選過一次 */
  chosen: boolean
}

const STORAGE_KEY = 'life-events.display.v1'

/** iPhone 開了「增加對比」時，第一次打開就用高對比 */
function systemPrefersHighContrast(): boolean {
  try {
    return window.matchMedia('(prefers-contrast: more)').matches
  } catch {
    return false
  }
}

export const display = reactive<DisplaySettings>({
  fontScale: 'standard',
  contrast: systemPrefersHighContrast() ? 'high' : 'standard',
  easyRead: 'off',
  chosen: false,
  ...readJson<Partial<DisplaySettings>>(STORAGE_KEY, {}),
})

watch(display, (value) => writeJson(STORAGE_KEY, value), { deep: true })

function apply(): void {
  const root = document.documentElement
  root.style.fontSize = `${FONT_SCALE_PERCENT[display.fontScale]}%`
  root.dataset.contrast = display.contrast
  root.dataset.easyRead = display.easyRead
}

watch(() => [display.fontScale, display.contrast, display.easyRead], apply, { immediate: true })

export function isEasyRead(): boolean {
  return display.easyRead === 'on'
}

export function toggleEasyRead(): void {
  display.easyRead = display.easyRead === 'on' ? 'off' : 'on'
}

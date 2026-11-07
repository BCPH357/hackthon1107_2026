import { watchEffect } from 'vue'

/** 城市通 WebView 的標題列會顯示 document.title，每頁設定成該頁的標題 */
export function useDocumentTitle(getTitle: () => string): void {
  watchEffect(() => {
    document.title = getTitle()
  })
}

import { ref } from 'vue'

export const toastMessage = ref('')

let timer: number | undefined

export function showToast(message: string, durationMs = 3000): void {
  toastMessage.value = message
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    toastMessage.value = ''
  }, durationMs)
}

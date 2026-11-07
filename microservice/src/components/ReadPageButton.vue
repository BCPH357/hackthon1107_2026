<script setup lang="ts">
// 每一頁的懸浮「朗讀」按鈕：按一下從頭念這一頁看得到的內容，再按一下停止。
// 只在能出聲的環境顯示（iPhone、有中文語音的瀏覽器）；Android WebView 沒有語音時自動隱藏。
import { computed, onBeforeUnmount, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { collectChunks, readingRoot, type PageChunk } from '../services/pageReader'
import { currentKey, speakChunks, speaking, stopSpeaking, ttsSupported } from '../services/speech'
import { display } from '../stores/display'

let chunks: PageChunk[] = []
let highlighted: HTMLElement | null = null
const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 字放大到 150% 以上時只留圖示，避免和右下角的「城市地圖」擠在一起
const compact = computed(() => display.fontScale === 'xlarge' || display.fontScale === 'max')

function clearHighlight() {
  highlighted?.removeAttribute('data-reading')
  highlighted = null
}

// 念到哪一段就框起來，並捲到看得到的位置
watch(currentKey, (key) => {
  clearHighlight()
  const chunk = key === null ? undefined : chunks[Number(key)]
  if (!chunk || !chunk.el.isConnected) return
  chunk.el.setAttribute('data-reading', '')
  chunk.el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
  highlighted = chunk.el
})

watch(speaking, (value) => {
  if (!value) clearHighlight()
})

function toggle() {
  if (speaking.value) {
    stopSpeaking()
    return
  }
  const root = readingRoot()
  chunks = root ? collectChunks(root) : []
  if (chunks.length) speakChunks(chunks.map((chunk, index) => ({ key: String(index), text: chunk.text })))
}

// 換頁（這個按鈕跟著頁面卸載）就停止朗讀
onBeforeUnmount(() => {
  stopSpeaking()
  clearHighlight()
})
</script>

<template>
  <button
    v-if="ttsSupported"
    type="button"
    class="read-page"
    :class="{ 'read-page--compact': compact, 'read-page--on': speaking }"
    :aria-label="speaking ? '停止朗讀' : '朗讀這一頁'"
    @click="toggle"
  >
    <span class="read-page__icon" aria-hidden="true">
      <AppIcon :name="speaking ? 'stop' : 'speaker'" size="1.25rem" />
    </span>
    <span v-if="!compact" class="read-page__text" aria-hidden="true">{{ speaking ? '停止' : '朗讀' }}</span>
  </button>
</template>

<style scoped>
/* 和「城市地圖」按鈕同一套樣式，放在另一側 */
.read-page {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: var(--tap);
  padding: 0.3125rem 1rem 0.3125rem 0.3125rem;
  border: 1.5px solid var(--c-primary-200);
  border-radius: 999px;
  background: var(--c-white);
  box-shadow:
    0 6px 16px rgb(0 0 0 / 10%),
    0 1px 3px rgb(0 0 0 / 8%);
  color: var(--c-primary-700);
  font-size: var(--fs-h3);
  font-weight: 600;
  transition: transform 0.2s var(--ease-soft);
}

.read-page:active {
  transform: scale(0.96);
}

.read-page__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--c-primary-100);
}

.read-page--on .read-page__icon {
  background: var(--c-secondary-200);
  color: var(--c-secondary-800);
}

.read-page__text {
  white-space: nowrap;
}

/* 大字級：只留圓形圖示，尺寸不再跟著字放大（至少 48px 好按） */
.read-page--compact {
  width: 56px;
  height: 56px;
  min-height: 0;
  padding: 0;
  justify-content: center;
}

.read-page--compact .read-page__icon {
  width: 44px;
  height: 44px;
}
</style>

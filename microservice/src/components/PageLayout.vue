<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { isInApp } from '../services/townpass'

const props = defineProps<{
  /** 只在一般瀏覽器預覽時顯示的標題列文字；在 App 裡標題由 document.title 交給 App 的標題列 */
  title: string
  /** 沒有上一頁可回時，返回鍵改去這裡 */
  fallbackBack?: string
}>()

const route = useRoute()
const router = useRouter()

// 在台北通裡，App 的標題列已有標題與返回鍵，網頁不再重複
const showPreviewBar = !isInApp()

const canGoBack = computed(() => {
  void route.fullPath
  return Boolean(window.history.state?.back) || Boolean(props.fallbackBack)
})

function goBack() {
  if (window.history.state?.back) router.back()
  else if (props.fallbackBack) router.replace(props.fallbackBack)
}
</script>

<template>
  <div class="page">
    <header v-if="showPreviewBar" class="preview-bar">
      <button v-if="canGoBack" type="button" class="preview-bar__back" aria-label="返回上一頁" @click="goBack">
        <AppIcon name="chevron-left" size="1.5rem" />
      </button>
      <span class="preview-bar__title">{{ title }}</span>
    </header>

    <main class="page__main">
      <slot />
    </main>

    <footer v-if="$slots.footer" class="page__footer">
      <div class="page__footer-inner">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* 模擬 TownPass 的 TPWebView 標題列：primary500 底、白字、標題置中 h3 半粗體；只在瀏覽器預覽時出現 */
.preview-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.5rem;
  padding: 0 3.5rem;
  background: var(--c-primary-500);
  color: var(--c-white);
}

.preview-bar__back {
  position: absolute;
  left: 0.25rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap);
  height: var(--tap);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
}

.preview-bar__title {
  font-size: var(--fs-h3);
  font-weight: 600;
  text-align: center;
}

.page__main {
  flex: 1;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 1.25rem var(--gutter) calc(2rem + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page__footer {
  position: sticky;
  bottom: 0;
  z-index: 5;
  background: rgb(255 255 255 / 96%);
  border-top: 1px solid var(--c-gray-100);
  padding: 0.75rem var(--gutter) calc(0.75rem + var(--safe-bottom));
}

.page__footer-inner {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 有固定底部按鈕時，內容底部不必再留安全區域 */
.page__main:has(+ .page__footer) {
  padding-bottom: 2rem;
}
</style>

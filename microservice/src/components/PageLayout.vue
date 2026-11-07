<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import CityLink from './CityLink.vue'
import DisplayButton from './DisplayButton.vue'
import EasyReadToggle from './EasyReadToggle.vue'
import { isInApp } from '../services/townpass'

const props = defineProps<{
  /** 只在一般瀏覽器預覽時顯示的標題列文字；在 App 裡標題由 document.title 交給 App 的標題列 */
  title: string
  /** 沒有上一頁可回時，返回鍵改去這裡 */
  fallbackBack?: string
  /** 首頁把「字級與對比」放在開場色塊裡、設定頁本身不需要，這兩頁傳 true */
  hideDisplayButton?: boolean
  /** 有易讀版內容的頁面（步驟清單、步驟詳情）顯示「易讀版」開關 */
  showEasyRead?: boolean
  /** 內容滿版：不留內距、不限寬度（城市地圖用） */
  flush?: boolean
  /** 不顯示「城市地圖」浮動按鈕（城市地圖本身用） */
  hideCityLink?: boolean
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

    <main class="page__main" :class="{ 'page__main--flush': flush, 'page__main--with-city-link': !hideCityLink }">
      <!-- 城市通的標題列由 App 繪製，網頁無法放按鈕進去，所以放在內容最上方；城市地圖也保留，看不清楚的人在地圖上也要能調字級 -->
      <div v-if="!hideDisplayButton || showEasyRead" class="page__tools">
        <EasyReadToggle v-if="showEasyRead" />
        <DisplayButton v-if="!hideDisplayButton" />
      </div>
      <slot />
    </main>

    <!-- 隨時都能跳進城市地圖：有固定底部按鈕時貼在它上方，沒有時浮在右下角 -->
    <footer v-if="$slots.footer" class="page__footer">
      <CityLink v-if="!hideCityLink" class="page__city-link page__city-link--docked" />
      <div class="page__footer-inner">
        <slot name="footer" />
      </div>
    </footer>
    <CityLink v-else-if="!hideCityLink" class="page__city-link page__city-link--floating" />
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

.page__tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  margin: -0.5rem 0 -0.75rem;
}

/* 滿版頁面（城市地圖）沒有內距，按鈕列自己留左右與上方空間，不壓到下面的內容 */
.page__main--flush > .page__tools {
  margin: 0;
  padding: 0.75rem var(--gutter) 0;
  background: var(--c-gray-50);
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

/* 城市地圖按鈕會蓋住內容最底下，多留空間讓最後的內容能捲到按鈕上方 */
.page__main--with-city-link {
  padding-bottom: calc(5.5rem + var(--safe-bottom));
}

.page__main--with-city-link:has(+ .page__footer) {
  padding-bottom: 5rem;
}

.page__main--flush {
  max-width: none;
  padding: 0;
  gap: 0;
}

.page__city-link {
  z-index: 6;
}

.page__city-link--docked {
  position: absolute;
  right: var(--gutter);
  bottom: calc(100% + 0.75rem);
}

.page__city-link--floating {
  position: fixed;
  right: var(--gutter);
  bottom: calc(1rem + var(--safe-bottom));
}
</style>

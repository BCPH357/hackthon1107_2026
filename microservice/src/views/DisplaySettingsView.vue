<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OptionGroup from '../components/OptionGroup.vue'
import PageLayout from '../components/PageLayout.vue'
import StepModeBadge from '../components/StepModeBadge.vue'
import { CONTRAST_OPTIONS, EASY_READ_OPTIONS, FONT_SCALE_OPTIONS, display } from '../stores/display'
import { arrayModel } from '../utils/arrayModel'

const route = useRoute()
const router = useRouter()

// 首頁按「開始」第一次進來；從各頁的「字級與對比」按鈕進來則不是
const isFirstTime = computed(() => route.query.first === '1')

// 這兩題一定要有值，再點一次已選的不會清空
const fontScale = arrayModel(
  () => display.fontScale,
  (value) => {
    if (value) display.fontScale = value
  },
)
const contrast = arrayModel(
  () => display.contrast,
  (value) => {
    if (value) display.contrast = value
  },
)
const easyRead = arrayModel(
  () => display.easyRead,
  (value) => {
    if (value) display.easyRead = value
  },
)

// 範例卡片跟著易讀版切換，讓使用者看得出差別
const sample = computed(() =>
  display.easyRead === 'on'
    ? { title: '就醫確認', text: '先帶家人去醫院看醫生' }
    : { title: '就醫確認', text: '帶家人到神經科或精神科，確認是否失智' },
)

function finish() {
  display.chosen = true
  if (isFirstTime.value) {
    router.push('/identity/basic')
  } else if (window.history.state?.back) {
    router.back()
  } else {
    router.replace('/')
  }
}
</script>

<template>
  <PageLayout title="字級與對比" fallback-back="/" hide-display-button>
    <div class="stack">
      <h1 class="page-title">{{ isFirstTime ? '先把畫面調成好讀的樣子' : '字級與對比' }}</h1>
      <p class="lead">選一個你看得最清楚的樣子，畫面會馬上改變。之後每一頁上方的「Aa」按鈕都可以再調，步驟頁上方也有「易讀版」可以一鍵切換。</p>
    </div>

    <OptionGroup v-model="fontScale" legend="字的大小" :options="FONT_SCALE_OPTIONS" inline />
    <OptionGroup
      v-model="contrast"
      legend="對比"
      hint="高對比會讓文字更黑、框線更粗"
      :options="CONTRAST_OPTIONS"
      inline
    />
    <OptionGroup
      v-model="easyRead"
      legend="步驟的說明方式"
      hint="易讀版用更短、更白話的句子，一句只講一件事"
      :options="EASY_READ_OPTIONS"
      inline
    />

    <section class="sample" aria-labelledby="sample-title">
      <h2 id="sample-title" class="sample__label">範例：步驟會長這樣</h2>
      <div class="card sample__card">
        <span class="sample__index">第 1 步</span>
        <span class="sample__title">{{ sample.title }}</span>
        <span class="sample__text">{{ sample.text }}</span>
        <span><StepModeBadge mode="visit" /></span>
      </div>
    </section>

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" @click="finish">
        {{ isFirstTime ? '就用這樣，開始' : '完成' }}
      </button>
    </template>
  </PageLayout>
</template>

<style scoped>
.sample {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sample__label {
  font-size: var(--fs-h3);
  font-weight: 600;
  color: var(--c-gray-800);
}

.sample__card {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sample__index {
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--c-primary-700);
}

.sample__title {
  font-size: var(--fs-title);
  font-weight: 600;
}

.sample__text {
  font-size: var(--fs-body);
  color: var(--c-gray-700);
}
</style>

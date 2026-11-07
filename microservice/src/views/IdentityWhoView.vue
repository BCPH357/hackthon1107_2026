<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import StepIndicator from '../components/StepIndicator.vue'
import type { ForWhom } from '../data/identityOptions'
import { identity, setForWhom } from '../stores/identity'

const router = useRouter()

const CHOICES: { value: ForWhom; icon: 'user' | 'users'; title: string; text: string }[] = [
  { value: 'self', icon: 'user', title: '幫自己辦', text: '年齡、戶籍會從台北通帳號帶入，你只要確認' },
  { value: 'family', icon: 'users', title: '幫家人辦', text: '例如替爸媽、孩子或伴侶辦理，接下來請填家人的情況' },
]

function next() {
  router.push('/identity/basic')
}
</script>

<template>
  <PageLayout title="你的情況" fallback-back="/">
    <StepIndicator :current="1" :total="5" />
    <div class="stack">
      <h1 class="page-title">這次是幫誰辦事？</h1>
      <p class="lead">我們會依照這個人的情況，推薦要辦的事。</p>
    </div>

    <!-- 原生 radio：方向鍵可切換，讀屏會念出「選項 1／2」 -->
    <fieldset class="choices">
      <legend class="visually-hidden">這次是幫誰辦事？</legend>
      <label
        v-for="choice in CHOICES"
        :key="choice.value"
        class="choice"
        :class="{ 'choice--on': identity.forWhom === choice.value }"
      >
        <input
          type="radio"
          name="for-whom"
          class="choice__input"
          :value="choice.value"
          :checked="identity.forWhom === choice.value"
          @change="setForWhom(choice.value)"
        />
        <span class="choice__icon"><AppIcon :name="choice.icon" size="1.75rem" /></span>
        <span class="choice__text">
          <span class="choice__title">{{ choice.title }}</span>
          <span class="choice__desc">{{ choice.text }}</span>
        </span>
        <span class="choice__radio" aria-hidden="true" />
      </label>
    </fieldset>

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" :disabled="!identity.forWhom" @click="next">下一步</button>
    </template>
  </PageLayout>
</template>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 字放大到 200% 時圖示在上、文字換到下一行，避免文字欄被擠成一字一行 */
.choice {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  min-height: 5.5rem;
  padding: 1rem;
  border: 1px solid var(--c-gray-200);
  border-radius: var(--radius);
  background: var(--c-white);
  box-shadow: var(--shadow);
  cursor: pointer;
}

.choice--on {
  border-color: var(--c-primary-500);
  background: var(--c-primary-50);
}

/* 透明的原生 radio 蓋滿整張卡片 */
.choice__input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.choice:has(.choice__input:focus-visible) {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

.choice__icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 50%;
  background: var(--c-primary-100);
  color: var(--c-primary-700);
}

.choice__text {
  flex: 1 1 10rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.choice__title {
  font-size: var(--fs-title);
  font-weight: 600;
}

.choice__desc {
  font-size: var(--fs-body);
  color: var(--c-gray-700);
}

/* 選取狀態不只靠顏色：右側的圓形單選標記 */
.choice__radio {
  flex: none;
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid var(--c-gray-300);
  border-radius: 50%;
  background: var(--c-white);
}

.choice--on .choice__radio {
  border-color: var(--c-primary-600);
  background: var(--c-primary-600);
  box-shadow: inset 0 0 0 0.25rem var(--c-white);
}
</style>

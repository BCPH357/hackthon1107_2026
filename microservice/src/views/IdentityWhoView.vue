<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import StepIndicator from '../components/StepIndicator.vue'
import type { ForWhom } from '../data/identityOptions'
import { identity, setForWhom } from '../stores/identity'

const router = useRouter()

const CHOICES: { value: ForWhom; icon: 'user' | 'users'; title: string; text: string }[] = [
  { value: 'self', icon: 'user', title: '幫自己辦', text: '年齡、戶籍會從台北通帳號帶入' },
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

    <div class="choices" role="radiogroup" aria-label="幫誰辦">
      <button
        v-for="choice in CHOICES"
        :key="choice.value"
        type="button"
        role="radio"
        class="choice"
        :class="{ 'choice--on': identity.forWhom === choice.value }"
        :aria-checked="identity.forWhom === choice.value"
        @click="setForWhom(choice.value)"
      >
        <span class="choice__icon"><AppIcon :name="choice.icon" size="1.75rem" /></span>
        <span class="choice__text">
          <span class="choice__title">
            {{ choice.title }}
            <AppIcon v-if="identity.forWhom === choice.value" name="check" class="choice__check" size="1.25em" />
          </span>
          <span class="choice__desc">{{ choice.text }}</span>
        </span>
      </button>
    </div>

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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  width: 100%;
  min-height: 5.5rem;
  padding: 1rem;
  border: 2px solid var(--c-gray-100);
  border-radius: var(--radius);
  background: var(--c-white);
  box-shadow: var(--shadow);
  text-align: left;
}

.choice--on {
  border-color: var(--c-primary-500);
  background: var(--c-primary-50);
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
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--fs-title);
  font-weight: 600;
}

.choice__desc {
  font-size: var(--fs-body);
  color: var(--c-gray-600);
}

.choice__check {
  flex: none;
  color: var(--c-primary-700);
}
</style>

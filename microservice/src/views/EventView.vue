<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import HelpCard from '../components/HelpCard.vue'
import PageLayout from '../components/PageLayout.vue'
import StepModeBadge from '../components/StepModeBadge.vue'
import { DATA_NOTICE } from '../config'
import { categoryOf, findEvent } from '../data/lifeEvents'
import { doneCount, isStepDone, lastEventId, setStepDone } from '../stores/progress'
import { useDocumentTitle } from '../utils/documentTitle'

const props = defineProps<{ eventId: string }>()

// 路由的 beforeEnter 已確認事件存在
const event = computed(() => findEvent(props.eventId)!)
const category = computed(() => categoryOf(props.eventId))
const steps = computed(() => event.value.steps ?? [])
const done = computed(() => doneCount(event.value.id, steps.value))
const allDone = computed(() => steps.value.length > 0 && done.value === steps.value.length)

useDocumentTitle(() => event.value.title)

// 記住有內容的事件，下次打開服務直接回到這裡
watchEffect(() => {
  if (steps.value.length) lastEventId.value = event.value.id
})
</script>

<template>
  <PageLayout :title="event.title" fallback-back="/events">
    <div class="stack">
      <p v-if="category" class="eyebrow">{{ category.title }}</p>
      <h1 class="page-title">{{ event.title }}</h1>
      <p v-if="event.intro" class="lead">{{ event.intro }}</p>
    </div>

    <template v-if="steps.length">
      <div class="progress">
        <p class="progress__text">已完成 {{ done }}/{{ steps.length }} 步</p>
        <div class="progress__bar" aria-hidden="true">
          <span class="progress__fill" :style="{ width: `${(done / steps.length) * 100}%` }" />
        </div>
      </div>

      <ol class="steps" aria-label="步驟">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          class="step"
          :class="{ 'step--done': isStepDone(event.id, step.id) }"
        >
          <span class="step__marker" aria-hidden="true">
            <AppIcon v-if="isStepDone(event.id, step.id)" name="check" size="1.125rem" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <div class="step__card">
            <RouterLink :to="`/events/${event.id}/steps/${step.id}`" class="step__link">
              <span class="step__index">第 {{ index + 1 }} 步</span>
              <span class="step__title">{{ step.title }}</span>
              <span class="step__summary">{{ step.summary }}</span>
              <span class="step__meta">
                <StepModeBadge :mode="step.mode" />
                <span v-if="isStepDone(event.id, step.id)" class="badge badge--primary">已完成</span>
              </span>
            </RouterLink>
            <button
              type="button"
              class="step__check"
              :aria-pressed="isStepDone(event.id, step.id)"
              :aria-label="`第 ${index + 1} 步「${step.title}」完成了`"
              @click="setStepDone(event.id, step.id, !isStepDone(event.id, step.id))"
            >
              <AppIcon :name="isStepDone(event.id, step.id) ? 'check-square' : 'square'" size="1.75rem" />
              <span class="step__check-label" aria-hidden="true">完成</span>
            </button>
          </div>
        </li>
      </ol>

      <p v-if="allDone" class="card card--tint" role="status">這件事的步驟都完成了，辛苦了！</p>
    </template>

    <section v-else class="card stack" aria-labelledby="building-title">
      <h2 id="building-title" class="section-title">內容還在整理中</h2>
      <p>這件事的步驟我們還在整理，可以先撥打 1999，請專人告訴你要怎麼辦。</p>
    </section>

    <RouterLink to="/events" class="btn btn--secondary btn--block">看其他要辦的事</RouterLink>

    <HelpCard />

    <p class="notice muted">
      <AppIcon name="info" />
      <span>{{ DATA_NOTICE }}</span>
    </p>
  </PageLayout>
</template>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.progress__text {
  font-weight: 600;
  color: var(--c-primary-700);
}

.progress__bar {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--c-gray-100);
  overflow: hidden;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary-500);
  transition: width 0.3s ease;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.625rem;
}

/* 步驟之間的連接線 */
.step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: calc(1.125rem - 1px);
  top: 3.25rem;
  bottom: -0.75rem;
  width: 2px;
  background: var(--c-primary-200);
}

.step__marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-top: 0.875rem;
  border: 2px solid var(--c-primary-500);
  border-radius: 50%;
  background: var(--c-white);
  color: var(--c-primary-700);
  font-weight: 600;
}

.step--done .step__marker {
  background: var(--c-primary-500);
  color: var(--c-white);
}

/* 字放大到 200% 時文字欄太窄，「完成」按鈕會換到下一行變成整列 */
.step__card {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  border-radius: var(--radius);
  background: var(--c-white);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.step__link {
  flex: 999 1 10rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.875rem 1rem;
  color: inherit;
  text-decoration: none;
}

.step__link:active {
  background: var(--c-gray-50);
}

.step__index {
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--c-primary-700);
}

.step__title {
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1.4;
}

.step__summary {
  font-size: var(--fs-body);
  color: var(--c-gray-700);
}

.step__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.step__check {
  flex: 1 0 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  min-height: var(--tap);
  border: 0;
  /* 同一列時左邊那條會顯示、上面那條被卡片裁掉；換行後反過來 */
  box-shadow:
    -1px 0 0 var(--c-gray-100),
    0 -1px 0 var(--c-gray-100);
  background: transparent;
  color: var(--c-primary-700);
}

.step__check:active {
  background: var(--c-primary-50);
}

.step__check-label {
  font-size: var(--fs-caption);
  font-weight: 600;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.notice :deep(svg) {
  flex: none;
  margin-top: 0.2em;
}
</style>

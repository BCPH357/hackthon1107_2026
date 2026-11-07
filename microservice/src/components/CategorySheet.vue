<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import EventIcon from './EventIcon.vue'
import EventRow from './EventRow.vue'
import { themeOf } from '../city/config'
import { categoryProgress, recommendedCategoryIds } from '../city/progress'
import { CITY_HOTLINE } from '../config'
import type { CategoryDef } from '../data/types'
import { callPhone } from '../services/townpass'

const props = defineProps<{ category: CategoryDef; titleId: string }>()
defineEmits<{ close: [] }>()

const theme = computed(() => themeOf(props.category.id))
// 和清單共用同一份進度
const progress = computed(() => categoryProgress(props.category))
const percent = computed(() => (progress.value.total ? (progress.value.done / progress.value.total) * 100 : 0))
const recommended = computed(() => recommendedCategoryIds.value.has(props.category.id))
const pendingCount = computed(() => props.category.events.length - progress.value.readyEvents)
</script>

<template>
  <div
    class="category-sheet"
    :style="{ '--theme-accent': theme.accent, '--theme-soft': theme.soft, '--theme-ink': theme.ink }"
  >
    <header class="category-sheet__head">
      <EventIcon :name="category.icon" class="category-sheet__icon" />
      <div class="category-sheet__titles">
        <p class="category-sheet__theme">
          <span class="category-sheet__dot" aria-hidden="true" />
          {{ theme.title }}
        </p>
        <h2 :id="titleId" class="category-sheet__title" tabindex="-1" data-autofocus>{{ category.title }}</h2>
      </div>
      <button type="button" class="category-sheet__close" aria-label="關閉" @click="$emit('close')">
        <AppIcon name="close" size="1.5rem" />
      </button>
    </header>

    <p class="category-sheet__meta">
      <span class="badge badge--muted">{{ category.events.length }} 件事</span>
      <span v-if="recommended" class="badge badge--match">為你推薦</span>
      <span v-if="pendingCount" class="muted">其中 {{ pendingCount }} 件內容建置中</span>
    </p>

    <section v-if="progress.total" class="category-sheet__progress" aria-label="這一類的進度">
      <p class="category-sheet__progress-text">已辦好 {{ progress.done }}/{{ progress.total }} 步</p>
      <div
        class="category-sheet__bar"
        role="progressbar"
        aria-label="已辦好的步驟"
        aria-valuemin="0"
        :aria-valuemax="progress.total"
        :aria-valuenow="progress.done"
      >
        <span class="category-sheet__fill" :style="{ width: `${percent}%` }" />
      </div>
      <p class="muted">和「要辦的事」的進度同步</p>
    </section>

    <ul class="category-sheet__list card">
      <li v-for="event in category.events" :key="event.id">
        <EventRow :event="event" :sub="event.summary" with-icon />
      </li>
    </ul>

    <button type="button" class="btn btn--ghost btn--block" @click="callPhone(CITY_HOTLINE)">
      <AppIcon name="phone" />
      不在這裡？撥打 1999 請專人協助
    </button>
  </div>
</template>

<style scoped>
.category-sheet {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.category-sheet__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 用兩個 class 提高權重，蓋過 EventIcon 自己的灰底 */
.category-sheet .category-sheet__icon {
  background: var(--theme-soft);
  box-shadow: inset 0 0 0 2px var(--theme-accent);
}

.category-sheet__titles {
  flex: 1;
  min-width: 0;
}

.category-sheet__theme {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--theme-ink);
}

.category-sheet__dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--theme-accent);
}

.category-sheet__title {
  font-size: var(--fs-h2);
  font-weight: 600;
  line-height: 1.3;
}

.category-sheet__title:focus {
  outline: none;
}

.category-sheet__title:focus-visible {
  outline: 3px solid var(--c-secondary-500);
  outline-offset: 2px;
}

.category-sheet__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap);
  height: var(--tap);
  border: 0;
  border-radius: 50%;
  background: var(--c-gray-50);
  color: var(--c-gray-700);
}

.category-sheet__close:active {
  background: var(--c-gray-100);
}

.category-sheet__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.5rem;
}

.category-sheet__progress {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.875rem 1rem;
  border-radius: var(--radius);
  background: var(--theme-soft);
}

.category-sheet__progress-text {
  font-weight: 600;
  color: var(--theme-ink);
}

.category-sheet__bar {
  height: 0.5rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 85%);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 6%);
  overflow: hidden;
}

.category-sheet__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--theme-accent);
  transition: width 0.4s var(--ease-out);
}

.category-sheet__list {
  padding: 0.25rem 0;
}

.category-sheet__list > li + li {
  border-top: 1px solid var(--c-gray-100);
}
</style>

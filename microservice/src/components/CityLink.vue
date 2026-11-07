<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { categoryOf } from '../data/lifeEvents'

const route = useRoute()

// 從事件或步驟頁跳進地圖時，直接打開那件事所在的大樓
const target = computed(() => {
  const eventId = route.params.eventId
  const category = typeof eventId === 'string' ? categoryOf(eventId) : undefined
  return { path: '/city', query: category ? { cat: category.id } : {} }
})
</script>

<template>
  <RouterLink :to="target" class="city-link">
    <span class="city-link__icon" aria-hidden="true">
      <AppIcon name="city" size="1.25rem" />
    </span>
    <span class="city-link__text">城市地圖</span>
  </RouterLink>
</template>

<style scoped>
.city-link {
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
  text-decoration: none;
  transition: transform 0.2s var(--ease-soft);
}

.city-link:active {
  transform: scale(0.96);
}

.city-link__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--c-primary-100);
}

.city-link__text {
  white-space: nowrap;
}
</style>

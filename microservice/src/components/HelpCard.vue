<script setup lang="ts">
import { useId } from 'vue'
import AppIcon from './AppIcon.vue'
import { CITY_HOTLINE } from '../config'
import { callPhone } from '../services/townpass'

withDefaults(defineProps<{ title?: string; text?: string }>(), {
  title: '還是不清楚？',
  text: '撥打 1999 臺北市民當家熱線，會有專人幫你轉接。',
})

const titleId = useId()
</script>

<template>
  <section class="help card tab-card" :aria-labelledby="titleId">
    <h2 :id="titleId" class="help__title">{{ title }}</h2>
    <p class="help__text">{{ text }}</p>
    <button type="button" class="btn btn--secondary btn--block" @click="callPhone(CITY_HOTLINE)">
      <AppIcon name="phone" />
      撥打 1999
    </button>
    <slot />
  </section>
</template>

<style scoped>
/* 求助出口用 primary50 淡藍底，和一般白色卡片區隔開來 */
.help {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  background: var(--c-primary-50);
}

.help__title {
  font-size: var(--fs-title);
  font-weight: 600;
}

.help__text {
  color: var(--c-gray-700);
}
</style>

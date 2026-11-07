<script setup lang="ts">
defineProps<{ current: number; total: number }>()
</script>

<template>
  <div class="indicator">
    <p class="indicator__text">第 {{ current }} 步，共 {{ total }} 步</p>
    <div class="indicator__bar" aria-hidden="true">
      <span class="indicator__fill" :style="{ width: `${(current / total) * 100}%` }" />
    </div>
  </div>
</template>

<style scoped>
.indicator {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.indicator__text {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--c-primary-700);
}

.indicator__bar {
  height: 0.375rem;
  border-radius: 999px;
  background: var(--c-gray-100);
  overflow: hidden;
}

.indicator__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary-500);
  transition: width 0.3s ease;
}
</style>

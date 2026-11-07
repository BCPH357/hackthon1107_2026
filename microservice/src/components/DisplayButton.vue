<script setup lang="ts">
// 每一頁都能隨時調整字級與對比的入口
</script>

<template>
  <RouterLink to="/display" class="display-btn">
    <span class="display-btn__aa" aria-hidden="true">Aa</span>
    字級與對比
  </RouterLink>
</template>

<style scoped>
.display-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: var(--tap);
  padding: 0.25rem 0.875rem;
  border: 1px solid var(--c-primary-500);
  border-radius: 999px;
  background: var(--c-white);
  color: var(--c-primary-700);
  font-size: var(--fs-body);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.display-btn:active {
  background: var(--c-primary-50);
}

.display-btn__aa {
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1;
}
</style>

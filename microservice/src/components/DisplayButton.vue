<script setup lang="ts">
// 每一頁都能隨時調整字級與對比的入口。畫面上只放「Aa」，讀屏念「Aa 字級與對比」（名稱包含畫面上的字，語音操作喊「Aa」也點得到）
</script>

<template>
  <RouterLink to="/display" class="display-btn" aria-label="Aa 字級與對比">
    <span class="display-btn__aa">Aa</span>
  </RouterLink>
</template>

<style scoped>
.display-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--tap);
  min-height: var(--tap);
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--c-primary-500);
  border-radius: 999px;
  background: var(--c-white);
  color: var(--c-primary-700);
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

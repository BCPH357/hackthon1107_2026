<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { display, toggleEasyRead } from '../stores/display'
import { showToast } from '../stores/toast'

const on = computed(() => display.easyRead === 'on')

function toggle() {
  toggleEasyRead()
  showToast(on.value ? '已切換成易讀版：句子更短、更白話' : '已切回一般版')
}
</script>

<template>
  <!-- 一鍵開關：aria-pressed 讓讀屏念出「易讀版，已按下／未按下」；狀態另有勾選框，不只靠顏色 -->
  <button type="button" class="easy-btn" :class="{ 'easy-btn--on': on }" :aria-pressed="on" @click="toggle">
    <AppIcon :name="on ? 'check-square' : 'square'" class="easy-btn__box" />
    易讀版
  </button>
</template>

<style scoped>
.easy-btn {
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
  white-space: nowrap;
}

.easy-btn:active {
  background: var(--c-primary-50);
}

.easy-btn--on {
  border-color: var(--c-primary-600);
  background: var(--c-primary-50);
}

.easy-btn__box {
  flex: none;
}
</style>

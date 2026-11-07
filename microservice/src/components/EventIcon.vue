<script setup lang="ts">
import { ICONS, type IconKey } from '../data/icons'

defineProps<{ name: IconKey }>()
</script>

<template>
  <!-- 仿 TownPass 服務頁：圓形底上放 24px 圖示；旁邊一定有文字，所以圖示對讀屏隱藏 -->
  <span class="event-icon" aria-hidden="true">
    <img :src="ICONS[name]" alt="" class="event-icon__img" />
  </span>
</template>

<style scoped>
.event-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--c-gray-50);
}

.event-icon__img {
  width: 1.5rem;
  height: 1.5rem;
}
</style>

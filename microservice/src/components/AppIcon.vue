<script setup lang="ts">
export type IconName =
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'check'
  | 'phone'
  | 'map-pin'
  | 'user'
  | 'users'
  | 'lock'
  | 'info'
  | 'edit'
  | 'arrow-up-right'
  | 'square'
  | 'check-square'
  | 'speaker'
  | 'stop'
  | 'city'
  | 'close'

withDefaults(defineProps<{ name: IconName; size?: string }>(), { size: '1.25em' })
</script>

<template>
  <!-- 裝飾用圖示，文字說明一律寫在旁邊或 aria-label，所以對讀屏隱藏 -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-if="name === 'chevron-right'" d="M9 5.5l6.5 6.5L9 18.5" />
    <path v-else-if="name === 'chevron-left'" d="M15 5.5L8.5 12l6.5 6.5" />
    <path v-else-if="name === 'chevron-down'" d="M5.5 9l6.5 6.5L18.5 9" />
    <path v-else-if="name === 'check'" d="M5 12.5l4.5 4.5L19 7.5" />
    <path
      v-else-if="name === 'phone'"
      d="M6.6 3h2.9l1.6 4.1-2.1 1.5a11.5 11.5 0 0 0 5.4 5.4l1.5-2.1 4.1 1.6v2.9A2.1 2.1 0 0 1 17.9 18.5 15.6 15.6 0 0 1 4.5 5.1 2.1 2.1 0 0 1 6.6 3z"
    />
    <template v-else-if="name === 'map-pin'">
      <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c0-4.1 3.6-7 8-7s8 2.9 8 7" />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M16.6 14.1c2.9.3 4.9 2.6 4.9 5.9" />
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </template>
    <path v-else-if="name === 'edit'" d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
    <path v-else-if="name === 'arrow-up-right'" d="M7 17L17 7M9 7h8v8" />
    <rect v-else-if="name === 'square'" x="4" y="4" width="16" height="16" rx="4" />
    <template v-else-if="name === 'speaker'">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.3a8 8 0 0 1 0 11.4" />
    </template>
    <rect v-else-if="name === 'stop'" x="6.5" y="6.5" width="11" height="11" rx="2" />
    <template v-else-if="name === 'check-square'">
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" stroke="currentColor" />
      <path d="M8 12.3l2.8 2.8L16.2 9.5" stroke="#fff" />
    </template>
    <template v-else-if="name === 'city'">
      <path d="M3 21h18" />
      <path d="M5 21V11l5-2.5V21" />
      <path d="M10 21V4.5h9V21" />
      <path d="M13.5 8.5h2M13.5 12.5h2M13.5 16.5h2" />
    </template>
    <path v-else-if="name === 'close'" d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
</template>

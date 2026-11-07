<script setup lang="ts">
import { computed } from 'vue'
import type { StepMode } from '../data/types'

const props = defineProps<{ mode: StepMode }>()

const MODES: Record<StepMode, { label: string; tone: string }> = {
  online: { label: '可線上辦', tone: 'primary' },
  phone: { label: '打電話辦', tone: 'primary' },
  counter: { label: '需臨櫃', tone: 'counter' },
  visit: { label: '需到醫療院所', tone: 'visit' },
  home: { label: '在家完成', tone: 'muted' },
  wait: { label: '等候聯繫', tone: 'muted' },
  self: { label: '自行安排', tone: 'muted' },
}

const mode = computed(() => MODES[props.mode])
</script>

<template>
  <span class="badge" :class="`badge--${mode.tone}`">{{ mode.label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GUIDE_STATIONS } from '../city/guide'
import { findEvent } from '../data/lifeEvents'
import { doneCount, isStepDone } from '../stores/progress'
import { callPhone } from '../services/townpass'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ index: number; fullRoute: boolean; stepId?: string; titleId: string }>()
const emit = defineEmits<{ close: []; next: [] }>()
const station = computed(() => GUIDE_STATIONS[props.index])
const event = computed(() => findEvent(station.value.eventId))
const next = computed(() => props.fullRoute ? GUIDE_STATIONS[props.index + 1] : undefined)
</script>

<template>
  <section v-if="event" class="guide-station">
    <header class="guide-station__head">
      <div>
        <p class="muted">{{ fullRoute ? `第 ${index + 1} / ${GUIDE_STATIONS.length} 站 · ` : '' }}{{ station.title }}</p>
        <h2 :id="titleId" tabindex="-1" data-autofocus>{{ event.title }}</h2>
      </div>
      <button type="button" class="btn btn--ghost" aria-label="關閉導覽" @click="emit('close')">
        <AppIcon name="close" />
      </button>
    </header>
    <p v-if="event.summary">{{ event.summary }}</p>
    <button v-if="next" type="button" class="btn btn--primary btn--block" @click="emit('next')">
      下一站 · {{ next.title }}
    </button>
    <p v-else-if="fullRoute" class="guide-station__complete" role="status">
      三站導覽完成。照顧家人辛苦了，也記得照顧自己。
    </p>
    <p class="muted">已辦好 {{ doneCount(event.id, event.steps) }}/{{ event.steps?.length ?? 0 }} 步</p>
    <ul class="guide-station__steps">
      <li v-for="step in event.steps" :key="step.id">
        <RouterLink
          :to="`/events/${event.id}/steps/${step.id}`"
          class="guide-station__step card"
          :class="{ 'guide-station__step--selected': step.id === stepId }"
        >
          <AppIcon v-if="isStepDone(event.id, step.id)" name="check" />
          <span>{{ step.title }}</span>
          <AppIcon name="chevron-right" />
        </RouterLink>
      </li>
    </ul>
    <div v-if="fullRoute && !next" class="guide-station__phones">
      <button type="button" class="btn btn--ghost" @click="callPhone('1999')">撥打 1999</button>
      <button type="button" class="btn btn--ghost" @click="callPhone('1966')">撥打 1966</button>
    </div>
  </section>
</template>

<style scoped>
.guide-station, .guide-station__steps { display: grid; gap: 0.6rem; }
.guide-station__head, .guide-station__step, .guide-station__phones { display: flex; align-items: center; gap: 0.5rem; }
.guide-station__head, .guide-station__step { justify-content: space-between; }
.guide-station__head h2 { font-size: var(--fs-title); font-weight: 700; }
.guide-station__step { padding: 0.6rem 0.75rem; min-height: var(--tap); }
.guide-station__step span { flex: 1; }
.guide-station__step--selected, .guide-station__complete { background: var(--c-primary-50); }
.guide-station__complete { padding: 0.7rem; border-radius: 0.5rem; }
</style>

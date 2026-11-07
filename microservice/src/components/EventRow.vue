<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import EventIcon from './EventIcon.vue'
import { iconOf } from '../data/lifeEvents'
import type { EventDef } from '../data/types'
import { doneCount } from '../stores/progress'

const props = defineProps<{ event: EventDef; sub?: string; withIcon?: boolean }>()

const total = computed(() => props.event.steps?.length ?? 0)
const done = computed(() => doneCount(props.event.id, props.event.steps))
</script>

<template>
  <RouterLink :to="`/events/${event.id}`" class="event-row">
    <EventIcon v-if="withIcon" :name="iconOf(event)" />
    <span class="event-row__text">
      <span class="event-row__title">{{ event.title }}</span>
      <span v-if="sub" class="event-row__sub">{{ sub }}</span>
    </span>
    <span v-if="!total" class="badge badge--muted">建置中</span>
    <span v-else-if="done" class="badge badge--primary">進度 {{ done }}/{{ total }}</span>
    <AppIcon name="chevron-right" class="event-row__chevron" />
  </RouterLink>
</template>

<style scoped>
.event-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.75rem;
  padding: 0.75rem 1rem;
  color: inherit;
  text-decoration: none;
}

.event-row:active {
  background: var(--c-gray-50);
}

.event-row__text {
  flex: 1 1 8rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.event-row__title {
  font-size: var(--fs-h3);
  font-weight: 600;
}

.event-row__sub {
  font-size: var(--fs-body);
  color: var(--c-gray-600);
}

.event-row__chevron {
  flex: none;
  color: var(--c-gray-500);
}
</style>

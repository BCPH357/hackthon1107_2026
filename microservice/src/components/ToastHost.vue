<script setup lang="ts">
import { toastMessage } from '../stores/toast'
</script>

<template>
  <div class="toast-region" role="status" aria-live="polite">
    <Transition name="toast">
      <p v-if="toastMessage" class="toast">{{ toastMessage }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.toast-region {
  position: fixed;
  left: 0;
  right: 0;
  top: 0.75rem;
  z-index: 50;
  display: flex;
  justify-content: center;
  padding: 0 var(--gutter);
  pointer-events: none;
}

.toast {
  max-width: var(--content-max);
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  background: var(--c-gray-900);
  color: var(--c-white);
  font-size: var(--fs-h3);
  box-shadow: var(--shadow);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/*
 * 底部抽屜，比照 TownPass 的 TPBottomSheet 由下往上滑出。
 * 非強制回應（aria-modal="false"）：抽屜上方的內容仍可操作，例如城市地圖可以直接點另一棟大樓切換。
 * 往下拖曳把手、按 Esc 或按關閉鍵都會關閉。
 */
const props = defineProps<{ open: boolean; labelledby?: string }>()
const emit = defineEmits<{ close: []; height: [px: number] }>()

const panel = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let dragStart: { y: number; time: number } | null = null
let observer: ResizeObserver | null = null

function reportHeight(): void {
  emit('height', props.open && panel.value ? panel.value.offsetHeight : 0)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

/** 把焦點移到抽屜裡標記 data-autofocus 的元素（通常是標題），讀屏會從這裡開始念 */
function focus(): void {
  const target = panel.value?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.value
  target?.focus({ preventScroll: true })
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      dragY.value = 0
      await nextTick()
      if (panel.value) {
        observer = new ResizeObserver(reportHeight)
        observer.observe(panel.value)
      }
      reportHeight()
      focus()
      document.addEventListener('keydown', onKeydown)
    } else {
      observer?.disconnect()
      observer = null
      emit('height', 0)
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', onKeydown)
})

function onPointerDown(event: PointerEvent): void {
  dragStart = { y: event.clientY, time: performance.now() }
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragStart) return
  dragY.value = Math.max(0, event.clientY - dragStart.y)
}

function onPointerUp(): void {
  if (!dragStart) return
  const distance = dragY.value
  const speed = distance / Math.max(1, performance.now() - dragStart.time)
  dragStart = null
  dragging.value = false
  // 拖得夠遠或甩得夠快就關閉；否則彈回原位
  if (distance > 96 || (distance > 32 && speed > 0.6)) emit('close')
  else dragY.value = 0
}

defineExpose({ focus })
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <section
        v-if="open"
        ref="panel"
        class="sheet"
        :class="{ 'sheet--dragging': dragging }"
        role="dialog"
        aria-modal="false"
        :aria-labelledby="labelledby"
        tabindex="-1"
        :style="{ '--drag': `${dragY}px` }"
      >
        <div
          class="sheet__grip"
          aria-hidden="true"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <span class="sheet__handle" />
        </div>
        <div class="sheet__body">
          <slot />
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--content-max);
  /* 最多蓋住畫面一半多一點，上方還看得到內容；內容多時在抽屜裡捲動 */
  max-height: 56vh;
  max-height: min(56dvh, 32rem);
  margin: 0 auto;
  border-radius: 1rem 1rem 0 0;
  background: var(--c-white);
  box-shadow:
    0 -8px 28px rgb(0 0 0 / 12%),
    0 0 0 1px rgb(0 0 0 / 4%);
  transform: translateY(var(--drag, 0px));
  transition: transform 0.38s var(--ease-out);
}

.sheet:focus {
  outline: none;
}

.sheet--dragging {
  transition: none;
}

/* 把手區整條都能拖，不會觸發頁面捲動 */
.sheet__grip {
  flex: none;
  display: flex;
  justify-content: center;
  padding: 0.625rem 0 0.375rem;
  cursor: grab;
  touch-action: none;
}

.sheet__handle {
  width: 2.5rem;
  height: 0.3125rem;
  border-radius: 999px;
  background: var(--c-gray-200);
}

.sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.25rem var(--gutter) calc(1rem + var(--safe-bottom));
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .sheet {
    transition-duration: 0.01s;
  }
}
</style>

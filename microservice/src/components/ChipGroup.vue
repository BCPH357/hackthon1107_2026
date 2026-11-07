<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  legend: string
  hint?: string
  options: readonly { value: T; label: string; hint?: string }[]
  /** 可複選；單選時再點一次已選的項目可以取消 */
  multiple?: boolean
}>()

const model = defineModel<T[]>({ required: true })
const legendId = useId()

function isOn(value: T): boolean {
  return model.value.includes(value)
}

function toggle(value: T): void {
  if (props.multiple) {
    model.value = isOn(value) ? model.value.filter((item) => item !== value) : [...model.value, value]
  } else {
    model.value = isOn(value) ? [] : [value]
  }
}
</script>

<template>
  <fieldset class="chip-group">
    <legend :id="legendId" class="chip-group__legend">{{ legend }}</legend>
    <p v-if="hint" class="chip-group__hint">{{ hint }}</p>
    <div class="chip-group__chips" :role="multiple ? 'group' : 'radiogroup'" :aria-labelledby="legendId">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="chip"
        :class="{ 'chip--on': isOn(option.value) }"
        :role="multiple ? undefined : 'radio'"
        :aria-pressed="multiple ? isOn(option.value) : undefined"
        :aria-checked="multiple ? undefined : isOn(option.value)"
        @click="toggle(option.value)"
      >
        <AppIcon v-if="isOn(option.value)" name="check" class="chip__check" />
        <span class="chip__text">
          {{ option.label }}
          <small v-if="option.hint" class="chip__hint">{{ option.hint }}</small>
        </span>
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.chip-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chip-group__legend {
  font-size: var(--fs-title);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.chip-group__hint {
  font-size: var(--fs-body);
  color: var(--c-gray-600);
  margin-top: -0.25rem;
}

.chip-group__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: var(--tap);
  padding: 0.5rem 1rem;
  border: 1.5px solid var(--c-gray-200);
  border-radius: 999px;
  background: var(--c-white);
  font-size: var(--fs-h3);
  line-height: 1.35;
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.chip:active {
  background: var(--c-gray-50);
}

.chip--on {
  border-color: var(--c-primary-500);
  background: var(--c-primary-50);
  color: var(--c-primary-800);
  font-weight: 600;
}

.chip__check {
  flex: none;
  color: var(--c-primary-700);
}

.chip__text {
  display: flex;
  flex-direction: column;
}

.chip__hint {
  font-size: var(--fs-caption);
  font-weight: 400;
  color: var(--c-gray-600);
}
</style>

<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'

/**
 * 用原生 checkbox／radio 做的選項群組（CLAUDE_UI_GUIDE：語意化控制項、可用鍵盤操作）。
 * 外觀比照 TownPass 的 TPCheckboxListTile 與 TPSettingList：白底列表、列與列之間有分隔線、
 * 未勾選時 grayscale300 2px 外框；勾選色用 primary600，讓勾選框與白底的對比達到 3:1。
 */
const props = defineProps<{
  legend: string
  hint?: string
  options: readonly { value: T; label: string; hint?: string }[]
  /** 可複選（checkbox）；預設單選（radio） */
  multiple?: boolean
  /** 選項很短（是／否、程度）時改成並排的小卡片 */
  inline?: boolean
  /** 單選且可以不填時，選了之後提供「清除這一題」 */
  clearable?: boolean
}>()

const model = defineModel<T[]>({ required: true })
const groupName = useId()
const hintId = useId()

function isOn(value: T): boolean {
  return model.value.includes(value)
}

function onChange(value: T, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  if (props.multiple) {
    model.value = checked ? [...model.value, value] : model.value.filter((item) => item !== value)
  } else if (checked) {
    model.value = [value]
  }
}
</script>

<template>
  <fieldset class="option-group" :aria-describedby="hint ? hintId : undefined">
    <legend class="option-group__legend">{{ legend }}</legend>
    <p v-if="hint" :id="hintId" class="option-group__hint">{{ hint }}</p>

    <div class="option-group__list" :class="{ 'option-group__list--inline': inline }">
      <label
        v-for="option in options"
        :key="option.value"
        class="option"
        :class="{ 'option--on': isOn(option.value), 'option--radio': !multiple }"
      >
        <input
          class="option__input"
          :type="multiple ? 'checkbox' : 'radio'"
          :name="groupName"
          :value="option.value"
          :checked="isOn(option.value)"
          @change="onChange(option.value, $event)"
        />
        <span class="option__mark" aria-hidden="true" />
        <span class="option__text">
          {{ option.label }}
          <small v-if="option.hint" class="option__hint">{{ option.hint }}</small>
        </span>
      </label>
    </div>

    <button
      v-if="!multiple && clearable && model.length"
      type="button"
      class="btn btn--ghost btn--sm option-group__clear"
      @click="model = []"
    >
      清除這一題
    </button>
  </fieldset>
</template>

<style scoped>
.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-group__legend {
  margin-bottom: 0.25rem;
  font-size: var(--fs-h3);
  font-weight: 600;
  color: var(--c-gray-800);
}

.option-group__hint {
  margin-top: -0.25rem;
  font-size: var(--fs-body);
  color: var(--c-gray-600);
}

/* 預設：TPSettingList 樣式的白底列表 */
.option-group__list {
  border-radius: var(--radius);
  background: var(--c-white);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

/* 分隔線左右各內縮 16，比照 TPSettingListTile.line */
.option + .option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 1rem;
  right: 1rem;
  height: 1px;
  background: var(--c-gray-100);
}

.option--on {
  background: var(--c-primary-50);
}

/* 原生 input 蓋滿整列且透明：點整列都能勾選，鍵盤與讀屏也拿到原生控制項 */
.option__input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.option:has(.option__input:focus-visible) {
  outline: 3px solid var(--c-secondary-500);
  outline-offset: -3px;
}

.option__mark {
  flex: none;
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid var(--c-gray-300);
  border-radius: 0.25rem;
  background: var(--c-white) center / 85% no-repeat;
}

.option--radio .option__mark {
  border-radius: 50%;
}

.option--on .option__mark {
  border-color: var(--c-primary-600);
  background-color: var(--c-primary-600);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E");
}

/* 單選：外圈加白色內圈形成圓點 */
.option--radio.option--on .option__mark {
  background-image: none;
  box-shadow: inset 0 0 0 0.25rem var(--c-white);
}

.option__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: var(--fs-h3);
  line-height: 1.4;
  color: var(--c-gray-900);
}

.option--on .option__text {
  font-weight: 600;
}

.option__hint {
  font-size: var(--fs-caption);
  font-weight: 400;
  color: var(--c-gray-600);
}

/* 並排：短選項各自一張小卡，寬度不夠或字放大時自動換行 */
.option-group__list--inline {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: 0.5rem;
  background: none;
  box-shadow: none;
  overflow: visible;
}

.option-group__list--inline .option {
  border: 1px solid var(--c-gray-200);
  border-radius: var(--radius);
  background: var(--c-white);
}

.option-group__list--inline .option + .option::before {
  display: none;
}

.option-group__list--inline .option--on {
  border-color: var(--c-primary-500);
  background: var(--c-primary-50);
}

.option-group__clear {
  align-self: flex-start;
  padding-left: 0;
}
</style>

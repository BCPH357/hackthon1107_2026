import { computed, type WritableComputedRef } from 'vue'

/** 讓單選欄位（值或 null）也能接到以陣列為 v-model 的 OptionGroup */
export function arrayModel<T extends string>(get: () => T | null, set: (value: T | null) => void): WritableComputedRef<T[]> {
  return computed({
    get: () => {
      const value = get()
      return value === null ? [] : [value]
    },
    set: (values: T[]) => set(values[0] ?? null),
  })
}

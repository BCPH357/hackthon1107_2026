import { reactive, ref, watch } from 'vue'
import { isSensitiveEvent } from '../data/lifeEvents'
import type { StepDef } from '../data/types'
import { readJson, writeJson } from '../utils/storage'

const PROGRESS_KEY = 'life-events.progress.v1'
const LAST_EVENT_KEY = 'life-events.last-event.v1'

/** 隱私事件的進度只留在記憶體，關掉服務就清除，不寫進手機 */
const withoutSensitive = (value: Record<string, string[]>) =>
  Object.fromEntries(Object.entries(value).filter(([eventId]) => !isSensitiveEvent(eventId)))

/** 每個事件已完成的步驟 id */
export const progress = reactive<Record<string, string[]>>(withoutSensitive(readJson(PROGRESS_KEY, {})))
watch(progress, (value) => writeJson(PROGRESS_KEY, withoutSensitive(value)), { deep: true })

/** 上次打開、有內容的事件；再次進入服務時直接回到這裡 */
export const lastEventId = ref<string | null>(readJson<string | null>(LAST_EVENT_KEY, null))
watch(lastEventId, (value) => writeJson(LAST_EVENT_KEY, value && isSensitiveEvent(value) ? null : value))

export function isStepDone(eventId: string, stepId: string): boolean {
  return progress[eventId]?.includes(stepId) ?? false
}

export function setStepDone(eventId: string, stepId: string, done: boolean): void {
  const current = progress[eventId] ?? []
  progress[eventId] = done ? [...new Set([...current, stepId])] : current.filter((id) => id !== stepId)
}

export function doneCount(eventId: string, steps: readonly StepDef[] | undefined): number {
  return steps?.filter((step) => isStepDone(eventId, step.id)).length ?? 0
}

export function clearProgress(): void {
  for (const key of Object.keys(progress)) delete progress[key]
  lastEventId.value = null
}

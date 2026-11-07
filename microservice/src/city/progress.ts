import { computed } from 'vue'
import { CATEGORIES, categoryOf, recommendEvents } from '../data/lifeEvents'
import type { CategoryDef } from '../data/types'
import { hasIdentity, profiles } from '../stores/identity'
import { doneCount } from '../stores/progress'

export interface CategoryProgress {
  /** 已打勾的步驟數 */
  done: number
  /** 有步驟內容的事件，步驟總數 */
  total: number
  /** 有步驟內容、可以點進去辦的事件數 */
  readyEvents: number
}

/*
 * 和清單共用同一份進度（stores/progress）：在步驟頁打勾，城市地圖的進度跟著變，反過來也一樣。
 * 在 computed 或 template 裡呼叫時會自動追蹤變化。
 */
export function categoryProgress(category: CategoryDef): CategoryProgress {
  let done = 0
  let total = 0
  let readyEvents = 0
  for (const event of category.events) {
    if (!event.steps?.length) continue
    readyEvents += 1
    total += event.steps.length
    done += doneCount(event.id, event.steps)
  }
  return { done, total, readyEvents }
}

/** 依「你的情況」推薦的事件所在的類別；沒填過情況時是空集合 */
export const recommendedCategoryIds = computed<ReadonlySet<string>>(() => {
  if (!hasIdentity.value) return new Set()
  const ids = recommendEvents(profiles.value)
    .map((event) => categoryOf(event.id)?.id)
    .filter((id): id is string => Boolean(id))
  return new Set(ids)
})

export function findCategory(categoryId: string | null | undefined): CategoryDef | undefined {
  return categoryId ? CATEGORIES.find((category) => category.id === categoryId) : undefined
}

<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import HelpCard from '../components/HelpCard.vue'
import PageLayout from '../components/PageLayout.vue'
import SafetyCard from '../components/SafetyCard.vue'
import StepModeBadge from '../components/StepModeBadge.vue'
import { DATA_NOTICE } from '../config'
import { categoryOf, findEvent } from '../data/lifeEvents'
import {
  elderCaseFor,
  hasPendingHandover,
  isHandedOver,
  isMarked,
  pushElderProgress,
  refreshElderCase,
  syncErrorMessage,
  toggleMark,
} from '../stores/cases'
import { isEasyRead } from '../stores/display'
import { doneCount, isStepDone, lastEventId, setStepDone } from '../stores/progress'
import { showToast } from '../stores/toast'
import { useDocumentTitle } from '../utils/documentTitle'

const props = defineProps<{ eventId: string }>()

// 路由的 beforeEnter 已確認事件存在
const event = computed(() => findEvent(props.eventId)!)
const category = computed(() => categoryOf(props.eventId))
const steps = computed(() => event.value.steps ?? [])
const done = computed(() => doneCount(event.value.id, steps.value))
const allDone = computed(() => steps.value.length > 0 && done.value === steps.value.length)

useDocumentTitle(() => event.value.title)

// 記住有內容的事件，下次打開服務直接回到這裡；隱私事件（家暴求助）不記，避免被同住的人看到
watchEffect(() => {
  if (steps.value.length && !event.value.sensitive) lastEventId.value = event.value.id
})

// 進度說明：隱私事件不存進手機，要講清楚
const progressNote = computed(() => {
  if (event.value.sensitive) return '打勾只在這次使用時記得，關掉服務就清除，不會留在手機上。'
  if (elderCase.value) return '這件事已經交棒，打勾會同步給家人。'
  return '打勾只記在這支手機上，幫你記得做到哪裡。'
})

// ---- 交棒給家人 ----
const elderCase = computed(() => elderCaseFor(event.value.id))
const handedCount = computed(() => steps.value.filter((step) => isHandedOver(event.value.id, step.id)).length)
const markedCount = computed(() => steps.value.filter((step) => isMarked(event.value.id, step.id)).length)
const pending = computed(() => hasPendingHandover(event.value.id, steps.value))

/** 家人辦好、已同步的步驟 */
function syncedDone(stepId: string): boolean {
  return elderCase.value?.doc?.steps[stepId]?.done ?? false
}

/** 步驟旁的交棒狀態 */
function handoverStatus(stepId: string): { text: string; tone: 'primary' | 'counter' | 'muted' } | null {
  const marked = isMarked(event.value.id, stepId)
  const handed = isHandedOver(event.value.id, stepId)
  if (handed && marked) return syncedDone(stepId) ? { text: '家人已辦好', tone: 'primary' } : { text: '已交給家人', tone: 'primary' }
  if (marked) return { text: '準備交給家人', tone: 'counter' }
  if (handed) return { text: '將取消交給家人', tone: 'muted' }
  return null
}

async function toggleDone(stepId: string) {
  const done = isStepDone(event.value.id, stepId)
  // 已完成的不會被退回：已同步給家人的完成狀態不能取消
  if (done && syncedDone(stepId)) {
    showToast('這一步已經同步給家人，不能取消打勾')
    return
  }
  setStepDone(event.value.id, stepId, !done)
  const error = await pushElderProgress(event.value.id, steps.value)
  if (error) showToast(`進度沒有同步給家人：${syncErrorMessage(error)}`)
}

onMounted(async () => {
  const error = await refreshElderCase(event.value.id)
  if (error) showToast(`沒有取得家人的最新進度：${syncErrorMessage(error)}`)
})
</script>

<template>
  <PageLayout :title="event.title" fallback-back="/events" show-easy-read>
    <div class="stack">
      <p v-if="category" class="eyebrow">{{ category.title }}</p>
      <h1 class="page-title"><span class="mark">{{ event.title }}</span></h1>
      <p v-if="event.intro" class="lead">{{ event.intro }}</p>
    </div>

    <SafetyCard v-if="event.sensitive" />

    <template v-if="steps.length">
      <div class="progress">
        <p class="progress__text">我的進度：已辦好 {{ done }}/{{ steps.length }} 步</p>
        <div class="progress__bar" aria-hidden="true">
          <span class="progress__fill" :style="{ width: `${(done / steps.length) * 100}%` }" />
        </div>
        <!-- CLAUDE_UI_GUIDE 2.4：打勾只是本機進度，不可當作政府已受理 -->
        <p class="muted">
          {{ progressNote }}不代表機關已經受理。
        </p>
      </div>

      <h2 class="section-title">一步一步來</h2>
      <ol class="steps" aria-label="步驟">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          class="step rise"
          :class="{ 'step--done': isStepDone(event.id, step.id) }"
          :style="{ '--i': index }"
        >
          <span class="step__marker" aria-hidden="true">
            <AppIcon v-if="isStepDone(event.id, step.id)" name="check" size="1.125rem" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <div class="step__card tab-card">
            <RouterLink :to="`/events/${event.id}/steps/${step.id}`" class="step__link">
              <span class="step__index">第 {{ index + 1 }} 步</span>
              <span class="step__title">{{ step.title }}</span>
              <span class="step__summary">{{ isEasyRead() ? (step.easy?.summary ?? step.summary) : step.summary }}</span>
              <span class="step__meta">
                <StepModeBadge :mode="step.mode" />
                <span v-if="isStepDone(event.id, step.id)" class="badge badge--primary">已辦好</span>
                <span v-if="handoverStatus(step.id)" class="badge" :class="`badge--${handoverStatus(step.id)!.tone}`">
                  {{ handoverStatus(step.id)!.text }}
                </span>
              </span>
            </RouterLink>
            <button
              type="button"
              class="step__check"
              :aria-pressed="isStepDone(event.id, step.id)"
              :aria-label="`打勾：第 ${index + 1} 步「${step.title}」我已辦好`"
              @click="toggleDone(step.id)"
            >
              <AppIcon :name="isStepDone(event.id, step.id) ? 'check-square' : 'square'" size="1.75rem" />
              <span class="step__check-label" aria-hidden="true">打勾</span>
            </button>
            <!-- 做不到的步驟（例如要臨櫃）交給家人；已辦好的步驟不用交 -->
            <button
              v-if="!isStepDone(event.id, step.id) && !event.sensitive"
              type="button"
              class="step__handover"
              :class="{ 'step__handover--on': isMarked(event.id, step.id) }"
              :aria-pressed="isMarked(event.id, step.id)"
              :aria-label="`交給家人：第 ${index + 1} 步「${step.title}」`"
              @click="toggleMark(event.id, step.id)"
            >
              <AppIcon name="users" size="1.5rem" />
              <span aria-hidden="true">{{ isMarked(event.id, step.id) ? '交給家人辦' : '交給家人' }}</span>
              <AppIcon v-if="isMarked(event.id, step.id)" name="check" size="1.5rem" />
            </button>
          </div>
        </li>
      </ol>

      <p v-if="allDone" class="card card--tint" role="status">這件事的步驟你都勾完了，辛苦了！</p>
    </template>

    <section v-else class="card stack" aria-labelledby="building-title">
      <h2 id="building-title" class="section-title">內容還在整理中</h2>
      <p>這件事的步驟我們還在整理，可以先撥打 1999，請專人告訴你要怎麼辦。</p>
    </section>

    <section v-if="steps.length && !event.sensitive && (markedCount || elderCase)" class="card handover" aria-labelledby="handover-title">
      <h2 id="handover-title" class="section-title">交給家人</h2>
      <p v-if="pending">已選 {{ markedCount }} 步要交給家人，按下面的按鈕交棒後才會生效。</p>
      <p v-else>已經交給家人 {{ handedCount }} 步。家人辦好後，這裡會自動打勾。</p>
      <RouterLink v-if="pending" :to="`/events/${event.id}/handover`" class="btn btn--primary btn--block">
        <AppIcon name="users" />
        交棒給家人（{{ markedCount }} 步）
      </RouterLink>
      <RouterLink v-else :to="`/events/${event.id}/handover`" class="btn btn--ghost btn--block">
        <AppIcon name="bluetooth" />
        家人換手機了？再傳一次交棒
      </RouterLink>
    </section>

    <RouterLink to="/events" class="btn btn--secondary btn--block">看其他要辦的事</RouterLink>

    <HelpCard />

    <p class="notice muted">
      <AppIcon name="info" />
      <span>{{ DATA_NOTICE }}</span>
    </p>
  </PageLayout>
</template>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.progress__text {
  font-weight: 600;
  color: var(--c-primary-700);
}

.progress__bar {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--c-gray-100);
  overflow: hidden;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary-500);
  transition: width 0.3s ease;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  gap: 0.625rem;
}

/* 步驟之間的連接線：卡片上方多了分頁的高度，標記與連接線一起往下移，線接到下一個標記上緣 */
.step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: calc(1.125rem - 1px);
  top: calc(3.25rem + var(--tab-h));
  bottom: calc(-1.5rem - var(--tab-h));
  width: 2px;
  background: var(--c-primary-200);
}

.step__marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-top: calc(0.875rem + var(--tab-h));
  border: 2px solid var(--c-primary-500);
  border-radius: 50%;
  background: var(--c-white);
  color: var(--c-primary-700);
  font-weight: 600;
}

.step--done .step__marker {
  background: var(--c-primary-500);
  color: var(--c-white);
}

@media (prefers-reduced-motion: no-preference) {
  .step--done .step__marker {
    animation: pop 0.35s var(--ease-soft);
  }
}

/* 字放大到 200% 時文字欄太窄，「完成」按鈕會換到下一行變成整列
 * 分頁卡的分頁在卡片外面，不能 overflow: hidden；圓角改由卡片本身處理 */
.step__card {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  border-radius: 0 var(--radius) var(--radius);
  background: var(--c-white);
}

.step__link {
  flex: 999 1 10rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.875rem 1rem;
  color: inherit;
  text-decoration: none;
}

.step__link:active {
  background: var(--c-gray-50);
}

.step__index {
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--c-primary-700);
}

.step__title {
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1.4;
}

.step__summary {
  font-size: var(--fs-body);
  color: var(--c-gray-700);
}

.step__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.step__check {
  flex: 1 0 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  min-height: var(--tap);
  border: 0;
  /* 同一列時左邊那條會顯示、上面那條被卡片裁掉；換行後反過來 */
  box-shadow:
    -1px 0 0 var(--c-gray-100),
    0 -1px 0 var(--c-gray-100);
  background: transparent;
  color: var(--c-primary-700);
}

.step__check:active {
  background: var(--c-primary-50);
}

.step__check-label {
  font-size: var(--fs-caption);
  font-weight: 600;
}

/* 交給家人：整列大按鈕，字放大時照樣好按 */
.step__handover {
  flex: 1 0 100%;
  display: flex;
  /* 字放大到 200% 時圖示和文字分兩行，「交給家人」不會被拆成兩行 */
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem 0.5rem;
  min-height: var(--tap);
  padding: 0.5rem 0.75rem;
  text-align: center;
  border: 0;
  border-top: 1px solid var(--c-gray-100);
  border-radius: 0 0 var(--radius) var(--radius);
  background: transparent;
  color: var(--c-primary-700);
  font-size: var(--fs-title);
  font-weight: 600;
}

.step__handover:active {
  background: var(--c-primary-50);
}

/* 選取狀態不只靠顏色：文字改成「交給家人辦」並多一個勾 */
.step__handover--on {
  background: var(--c-secondary-50);
  color: var(--c-secondary-800);
}

.handover {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.notice :deep(svg) {
  flex: none;
  margin-top: 0.2em;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import StepModeBadge from '../components/StepModeBadge.vue'
import { findEvent } from '../data/lifeEvents'
import { findLink, refreshCase, setFamilyStepDone, syncErrorMessage, type SyncError } from '../stores/cases'
import { isEasyRead } from '../stores/display'
import { showToast } from '../stores/toast'
import { useDocumentTitle } from '../utils/documentTitle'

// 子女：家人交給我的一件事。交給我的步驟可以打勾，其他步驟只看家人的進度

const props = defineProps<{ caseId: string }>()

// 路由的 beforeEnter 已確認案件存在
const link = computed(() => findLink('family', props.caseId)!)
const event = computed(() => findEvent(link.value.eventId))
const steps = computed(() => event.value?.steps ?? [])
const mySteps = computed(() => steps.value.filter((step) => link.value.doc?.steps[step.id]?.owner === 'family'))
const elderSteps = computed(() => steps.value.filter((step) => link.value.doc?.steps[step.id]?.owner !== 'family'))
const elderName = computed(() => link.value.doc?.elderName ?? '家人')
const syncing = ref(false)

useDocumentTitle(() => event.value?.title ?? '家人交給我的事')

function isDone(stepId: string): boolean {
  return link.value.doc?.steps[stepId]?.done ?? false
}

const router = useRouter()

/** 對方已經刪除這筆交棒：回到清單，清單打開時會同步並把它從這支手機拿掉 */
async function leaveIfDeleted(error: SyncError | null): Promise<boolean> {
  if (error?.kind !== 'notFound') return false
  await router.replace('/family')
  return true
}

async function refresh() {
  syncing.value = true
  const error = await refreshCase(link.value)
  syncing.value = false
  if (await leaveIfDeleted(error)) return
  if (error) showToast(`沒有取得最新進度：${syncErrorMessage(error)}`)
}

async function toggleDone(stepId: string) {
  const error = await setFamilyStepDone(link.value, stepId, !isDone(stepId))
  if (await leaveIfDeleted(error)) return
  if (error) showToast(`沒有同步給家人：${syncErrorMessage(error)}`)
}

onMounted(refresh)
</script>

<template>
  <PageLayout :title="event?.title ?? '家人交給我的事'" fallback-back="/family">
    <div class="stack">
      <p class="eyebrow">{{ elderName }}交給你</p>
      <h1 class="page-title"><span class="mark">{{ event?.title ?? '這件事已不在清單上' }}</span></h1>
      <p class="muted easy-hide">打勾會同步到{{ elderName }}的手機。打勾只是記錄進度，不代表機關已經受理。</p>
    </div>

    <section aria-labelledby="mine-title" class="stack">
      <h2 id="mine-title" class="section-title">交給你的步驟</h2>
      <p v-if="!mySteps.length" class="card card--tint">目前沒有交給你的步驟。</p>
      <ol class="steps">
        <li v-for="step in mySteps" :key="step.id" class="step card" :class="{ 'step--done': isDone(step.id) }">
          <div class="step__body">
            <span class="step__title">{{ step.title }}</span>
            <span class="step__summary">{{ isEasyRead() ? (step.easy?.summary ?? step.summary) : step.summary }}</span>
            <span class="step__meta"><StepModeBadge :mode="step.mode" /></span>
            <details class="step__details">
              <summary>怎麼辦、要帶什麼</summary>
              <p>{{ step.what }}</p>
              <ul v-if="step.prepare.length" class="step__prepare">
                <li v-for="item in step.prepare" :key="item">{{ item }}</li>
              </ul>
            </details>
          </div>
          <!-- 再按一次可以取消打勾，會同步到家人的手機 -->
          <button
            type="button"
            class="step__done"
            :aria-pressed="isDone(step.id)"
            :aria-label="`${isDone(step.id) ? '取消打勾' : '打勾'}：「${step.title}」我已辦好`"
            @click="toggleDone(step.id)"
          >
            <AppIcon :name="isDone(step.id) ? 'check-square' : 'square'" size="1.75rem" />
            {{ isDone(step.id) ? '已辦好' : '我已辦好' }}
          </button>
        </li>
      </ol>
    </section>

    <section v-if="elderSteps.length" aria-labelledby="elder-title" class="stack">
      <h2 id="elder-title" class="section-title">{{ elderName }}自己辦的步驟</h2>
      <ul class="elder-steps card">
        <li v-for="step in elderSteps" :key="step.id" class="elder-step">
          <AppIcon :name="isDone(step.id) ? 'check-square' : 'square'" size="1.5rem" />
          <span class="elder-step__title">{{ step.title }}</span>
          <span class="badge" :class="isDone(step.id) ? 'badge--primary' : 'badge--muted'">
            {{ isDone(step.id) ? '已辦好' : '還沒辦' }}
          </span>
        </li>
      </ul>
    </section>

    <template #footer>
      <button type="button" class="btn btn--ghost btn--block" :disabled="syncing" @click="refresh">
        {{ syncing ? '正在更新…' : '更新家人的進度' }}
      </button>
    </template>
  </PageLayout>
</template>

<style scoped>
.steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 字放大時按鈕換到下一行變成整列 */
.step {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.step--done {
  border-color: var(--c-primary-300);
  background: var(--c-primary-50);
}

.step__body {
  flex: 999 1 12rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.step__title {
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1.4;
}

.step__summary {
  color: var(--c-gray-700);
}

.step__details summary {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  font-weight: 600;
  color: var(--c-primary-700);
  cursor: pointer;
}

.step__prepare {
  margin-top: 0.5rem;
  padding-left: 1.25rem;
  list-style: disc;
}

.step__done {
  flex: 1 0 7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: var(--tap);
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--c-primary-500);
  border-radius: var(--radius-btn);
  background: var(--c-white);
  color: var(--c-primary-700);
  font-size: var(--fs-title);
  font-weight: 600;
}

.step__done:disabled {
  border-color: transparent;
  background: transparent;
}

.elder-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.elder-step {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  color: var(--c-gray-700);
}

.elder-step__title {
  flex: 1 1 8rem;
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import StepModeBadge from '../components/StepModeBadge.vue'
import { findEvent } from '../data/lifeEvents'
import { getUserInfo, startBleHandoverShare, type BleShareEvent } from '../services/townpass'
import {
  elderCaseFor,
  handOver,
  hasPendingHandover,
  isHandedOver,
  isMarked,
  maskName,
  syncErrorMessage,
  ticketOf,
  type CaseLink,
} from '../stores/cases'
import { useDocumentTitle } from '../utils/documentTitle'

// 長輩：確認要交給家人的步驟 → 上傳案件 → 用藍牙把交棒票傳給旁邊的家人

const props = defineProps<{ eventId: string }>()

// 路由的 beforeEnter 已確認事件存在
const event = computed(() => findEvent(props.eventId)!)
const steps = computed(() => event.value.steps ?? [])
const markedSteps = computed(() => steps.value.filter((step) => isMarked(event.value.id, step.id)))
/** 原本交給家人、這次取消的步驟 */
const unmarkedSteps = computed(() =>
  steps.value.filter((step) => !isMarked(event.value.id, step.id) && isHandedOver(event.value.id, step.id)),
)
/** 這件事之前交棒過，家人手上已經有交棒票 */
const hadCase = elderCaseFor(props.eventId)?.version ? true : false
const pending = computed(() => hasPendingHandover(event.value.id, steps.value))

useDocumentTitle(() => `交棒：${event.value.title}`)

type Status =
  | { step: 'confirm' }
  | { step: 'uploading' }
  | { step: 'uploaded' }
  | { step: 'waiting' }
  | { step: 'advertising'; code: string }
  | { step: 'sent' }
  | { step: 'timeout' }
  | { step: 'failed'; message: string }

const status = ref<Status>({ step: 'confirm' })
const mocked = ref(false)
let link: CaseLink | null = null
let stopShare: (() => void) | null = null

async function confirm() {
  status.value = { step: 'uploading' }
  const user = await getUserInfo()
  const result = await handOver(event.value.id, steps.value, maskName(user.account?.realName))
  link = result.link
  if (result.error) {
    status.value = { step: 'failed', message: `交棒沒有上傳成功：${syncErrorMessage(result.error)}` }
    return
  }
  // 家人之前已經收過交棒票，只要更新伺服器上的內容就好，不一定要再傳一次
  if (hadCase) status.value = { step: 'uploaded' }
  else startSharing()
}

function onShareEvent(shareEvent: BleShareEvent) {
  switch (shareEvent.state) {
    case 'advertising':
      status.value = { step: 'advertising', code: shareEvent.code }
      return
    case 'sent':
      status.value = { step: 'sent' }
      break
    case 'timeout':
      status.value = { step: 'timeout' }
      break
    case 'unavailable':
      status.value = {
        step: 'failed',
        message:
          shareEvent.reason === 'off'
            ? '藍牙沒有打開。請打開藍牙後再試一次。'
            : shareEvent.reason === 'unauthorized'
              ? '台北通沒有使用藍牙的權限。請到手機的「設定 → 台北通」開啟藍牙。'
              : '這支手機不能用藍牙傳送。',
      }
      break
    default:
      status.value = { step: 'failed', message: '傳送中斷了，請再試一次。' }
  }
  // 傳送結束（成功、逾時或失敗）就停止廣播
  stop()
}

function startSharing() {
  const current = link ?? elderCaseFor(event.value.id)
  if (!current) return
  stop()
  status.value = { step: 'waiting' }
  const share = startBleHandoverShare(ticketOf(current), onShareEvent)
  stopShare = share.stop
  mocked.value = share.mocked
}

function stop() {
  stopShare?.()
  stopShare = null
}

function cancelSharing() {
  stop()
  status.value = { step: 'timeout' }
}

/** 失敗後重試：上傳沒成功就重新上傳，上傳成功只是藍牙沒傳到就重傳 */
function retry() {
  if (link?.version && !pending.value) startSharing()
  else void confirm()
}

// 從事件頁的「交給家人」進來（?send=1）：不用再按「確認交棒」，一進來就上傳並開始用藍牙傳送。
// 網址的 send 拿掉，返回或重新整理時不會再送一次
const route = useRoute()
const router = useRouter()
onMounted(() => {
  if (route.query.send !== '1') return
  void router.replace({ query: {} })
  if (pending.value) void confirm()
})

// 離開頁面時一定要停止藍牙廣播
onBeforeUnmount(stop)
</script>

<template>
  <PageLayout title="交棒給家人" :fallback-back="`/events/${event.id}`">
    <div class="stack">
      <p class="eyebrow">{{ event.title }}</p>
      <h1 class="page-title">交棒給家人</h1>
    </div>

    <template v-if="status.step === 'confirm' || status.step === 'uploading'">
      <section v-if="markedSteps.length" class="card stack" aria-labelledby="give-title">
        <h2 id="give-title" class="section-title">這些步驟要交給家人辦</h2>
        <ol class="list">
          <li v-for="step in markedSteps" :key="step.id" class="list__item">
            <span class="list__title">{{ step.title }}</span>
            <StepModeBadge :mode="step.mode" />
          </li>
        </ol>
      </section>
      <section v-if="unmarkedSteps.length" class="card stack" aria-labelledby="take-title">
        <h2 id="take-title" class="section-title">這些步驟改回自己辦</h2>
        <ul class="list">
          <li v-for="step in unmarkedSteps" :key="step.id" class="list__item">
            <span class="list__title">{{ step.title }}</span>
          </li>
        </ul>
      </section>
      <p v-if="!markedSteps.length && !unmarkedSteps.length" class="card card--tint">
        還沒有選要交給家人的步驟。請回到上一頁，在做不到的步驟按「交給家人」。
      </p>
      <p class="privacy muted">
        <AppIcon name="info" />
        <span>家人會看到這件事每一步辦好了沒有，並可以勾選交給他的步驟。不會傳送你的身分證字號、電話、地址和健康資料。</span>
      </p>
    </template>

    <p v-else-if="status.step === 'uploaded'" class="card stack" role="status">
      已經更新給家人了。家人手機上的清單會跟著改變，不用再傳一次。
    </p>

    <section v-else-if="status.step === 'waiting'" class="card muted" role="status">正在打開藍牙…</section>

    <section v-else-if="status.step === 'advertising'" class="card stack waiting" aria-live="polite">
      <AppIcon name="bluetooth" size="2.5rem" />
      <p class="waiting__label">請家人在首頁按「接收家人交棒」，並核對這組代碼：</p>
      <p class="waiting__code" :aria-label="`代碼 ${status.code.split('').join(' ')}`">{{ status.code }}</p>
      <p class="muted">兩支手機靠近一點，畫面不要關掉。1 分鐘內有效。</p>
      <p v-if="mocked" class="badge badge--draft waiting__mock">瀏覽器預覽・沒有真的開藍牙；在同一個瀏覽器另開分頁、網址加上 ?as=family，按「接收家人交棒」即可測試</p>
    </section>

    <section v-else-if="status.step === 'sent'" class="card stack waiting" role="status">
      <span class="done-icon"><AppIcon name="check" size="2rem" /></span>
      <p class="waiting__label">已經交給家人了。</p>
      <p class="muted">家人辦好後，這件事的步驟會自動打勾。</p>
      <p v-if="mocked" class="badge badge--draft">瀏覽器預覽・模擬結果</p>
    </section>

    <p v-else-if="status.step === 'timeout'" class="notice" role="alert">1 分鐘內沒有家人接收，已經停止傳送。可以再試一次。</p>
    <p v-else-if="status.step === 'failed'" class="notice" role="alert">{{ status.message }}</p>

    <template #footer>
      <template v-if="status.step === 'confirm' || status.step === 'uploading'">
        <button
          v-if="markedSteps.length || unmarkedSteps.length"
          type="button"
          class="btn btn--primary btn--block"
          :disabled="status.step === 'uploading'"
          @click="confirm"
        >
          <AppIcon name="users" />
          {{ status.step === 'uploading' ? '正在上傳…' : '確認交棒' }}
        </button>
        <button v-else-if="hadCase" type="button" class="btn btn--primary btn--block" @click="startSharing">
          <AppIcon name="bluetooth" />
          用藍牙再傳一次交棒
        </button>
        <RouterLink :to="`/events/${event.id}`" class="btn btn--ghost btn--block">回上一頁</RouterLink>
      </template>
      <template v-else-if="status.step === 'uploaded'">
        <RouterLink :to="`/events/${event.id}`" class="btn btn--primary btn--block">完成</RouterLink>
        <button type="button" class="btn btn--ghost btn--block" @click="startSharing">家人換手機了，用藍牙再傳一次</button>
      </template>
      <button v-else-if="status.step === 'advertising' || status.step === 'waiting'" type="button" class="btn btn--ghost btn--block" @click="cancelSharing">
        停止傳送
      </button>
      <template v-else-if="status.step === 'timeout' || status.step === 'failed'">
        <button type="button" class="btn btn--primary btn--block" @click="retry">再試一次</button>
        <RouterLink :to="`/events/${event.id}`" class="btn btn--ghost btn--block">回上一頁</RouterLink>
      </template>
      <RouterLink v-else :to="`/events/${event.id}`" class="btn btn--primary btn--block">完成</RouterLink>
    </template>
  </PageLayout>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 字放大時標題和標籤改成上下排 */
.list__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--c-gray-100);
}

.list__title {
  font-size: var(--fs-title);
  font-weight: 600;
}

.privacy {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.privacy :deep(svg) {
  flex: none;
  margin-top: 0.2em;
}

.notice {
  padding: 0.75rem;
  border-radius: var(--radius);
  background: var(--c-orange-50);
  color: var(--c-orange-700);
}

.waiting {
  align-items: center;
  text-align: center;
  color: var(--c-primary-700);
}

.waiting__label {
  font-size: var(--fs-title);
  font-weight: 600;
  color: var(--c-gray-900);
}

/* 電腦瀏覽器預覽的說明比較長，要能換行，不超出卡片 */
.waiting__mock {
  white-space: normal;
}

/* 代碼要讓家人一眼就能對照，所以放大、加字距 */
.waiting__code {
  font-size: calc(var(--fs-h1) * 1.4);
  font-weight: 600;
  letter-spacing: 0.3em;
  font-variant-numeric: tabular-nums;
}

.done-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--c-primary-100);
}
</style>

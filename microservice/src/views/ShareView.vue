<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import { getUserInfo, startBleShare, type BleShareEvent, type TownPassAccount } from '../services/townpass'
import { ageFromBirthday } from '../utils/age'

// 被幫的人（例如長輩）用這頁把台北通的基本資料用藍牙傳給旁邊的家人。
// 實際傳送的內容由 App 組成（lib/service/ble_share_service.dart），這頁只負責預覽與顯示核對代碼。

type Status =
  | { step: 'loading' }
  | { step: 'preview' }
  | { step: 'noAccount' }
  | { step: 'waiting' }
  | { step: 'advertising'; code: string }
  | { step: 'sent' }
  | { step: 'timeout' }
  | { step: 'failed'; message: string }

const status = ref<Status>({ step: 'loading' })
const account = ref<TownPassAccount | null>(null)
const mocked = ref(false)
let stopShare: (() => void) | null = null

const previewItems = computed(() => {
  const a = account.value
  if (!a) return []
  const address = a.addresses?.find((item) => item.priority) ?? a.addresses?.[0]
  const age = ageFromBirthday(a.birthday)
  return [
    { label: '姓名', value: a.realName || '未提供' },
    { label: '年齡', value: age === null ? '未提供' : `${age} 歲` },
    { label: '戶籍在臺北市', value: a.citizen === undefined ? '未提供' : a.citizen ? '是' : '否' },
    { label: '居住地', value: address ? `${address.city ?? ''}${address.town ?? ''}` || '未提供' : '未提供' },
    { label: '原住民', value: a.nativePeople === undefined ? '未提供' : a.nativePeople ? '是' : '否' },
  ]
})

onMounted(async () => {
  const result = await getUserInfo()
  account.value = result.account
  mocked.value = result.mocked
  status.value = result.account ? { step: 'preview' } : { step: 'noAccount' }
})

function onShareEvent(event: BleShareEvent) {
  switch (event.state) {
    case 'advertising':
      status.value = { step: 'advertising', code: event.code }
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
          event.reason === 'off'
            ? '藍牙沒有打開。請打開藍牙後再試一次。'
            : event.reason === 'unauthorized'
              ? '台北通沒有使用藍牙的權限。請到手機的「設定 → 台北通」開啟藍牙。'
              : event.reason === 'noAccount'
                ? '讀不到台北通的帳號資料，沒有資料可以傳送。'
                : '這支手機不能用藍牙傳送。',
      }
      break
    default:
      status.value = { step: 'failed', message: '傳送中斷了，請再試一次。' }
  }
  // 傳送結束（成功、逾時或失敗）就停止廣播
  stop()
}

function start() {
  stop()
  status.value = { step: 'waiting' }
  const share = startBleShare(onShareEvent)
  stopShare = share.stop
  mocked.value = share.mocked
}

function stop() {
  stopShare?.()
  stopShare = null
}

function cancel() {
  stop()
  status.value = { step: 'preview' }
}

// 離開頁面時一定要停止藍牙廣播，避免資料一直對外傳送
onBeforeUnmount(stop)
</script>

<template>
  <PageLayout title="傳給家人" fallback-back="/">
    <div class="stack">
      <h1 class="page-title">把我的資料傳給家人</h1>
      <p class="lead">家人幫你辦事時，可以用藍牙收到你的年齡和戶籍，不用一項一項問。</p>
    </div>

    <p v-if="status.step === 'loading'" class="card muted" role="status">正在讀取台北通的資料…</p>

    <p v-else-if="status.step === 'noAccount'" class="card card--tint">讀不到台北通的帳號資料，沒有資料可以傳送。</p>

    <template v-else-if="status.step === 'preview' || status.step === 'failed' || status.step === 'timeout'">
      <section class="card stack" aria-labelledby="send-title">
        <div class="head">
          <h2 id="send-title" class="section-title">會傳送這些資料</h2>
          <span v-if="mocked" class="badge badge--draft">示範資料・未連接台北通</span>
        </div>
        <dl class="items">
          <div v-for="item in previewItems" :key="item.label" class="items__row">
            <dt class="muted">{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
        <p class="privacy muted">
          <AppIcon name="lock" />
          不會傳送身分證字號、電話、地址和健康資料。資料直接從這支手機傳到家人的手機，不經過網路。
        </p>
      </section>
      <p v-if="status.step === 'timeout'" class="notice" role="alert">1 分鐘內沒有家人接收，已經停止傳送。可以再試一次。</p>
      <p v-else-if="status.step === 'failed'" class="notice" role="alert">{{ status.message }}</p>
    </template>

    <section v-else-if="status.step === 'waiting'" class="card muted" role="status">正在打開藍牙…</section>

    <section v-else-if="status.step === 'advertising'" class="card stack waiting" aria-live="polite">
      <AppIcon name="bluetooth" size="2.5rem" />
      <p class="waiting__label">請家人在「幫家人辦」的基本資料頁，按「用藍牙接收家人的資料」，並核對這組代碼：</p>
      <p class="waiting__code" :aria-label="`代碼 ${status.code.split('').join(' ')}`">{{ status.code }}</p>
      <p class="muted">兩支手機靠近一點，畫面不要關掉。1 分鐘內有效。</p>
    </section>

    <section v-else-if="status.step === 'sent'" class="card stack waiting" role="status">
      <span class="done-icon"><AppIcon name="check" size="2rem" /></span>
      <p class="waiting__label">已經傳給家人了。</p>
      <p class="muted">藍牙傳送已經停止。</p>
    </section>

    <template #footer>
      <button
        v-if="status.step === 'preview' || status.step === 'failed' || status.step === 'timeout'"
        type="button"
        class="btn btn--primary btn--block"
        @click="start"
      >
        <AppIcon name="bluetooth" />
        {{ status.step === 'preview' ? '開始傳送' : '再傳一次' }}
      </button>
      <button v-else-if="status.step === 'advertising' || status.step === 'waiting'" type="button" class="btn btn--ghost btn--block" @click="cancel">
        停止傳送
      </button>
      <RouterLink v-else-if="status.step === 'sent' || status.step === 'noAccount'" to="/" class="btn btn--primary btn--block">回首頁</RouterLink>
    </template>
  </PageLayout>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 字放大時標籤和內容改成上下排 */
.items__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--c-gray-100);
}

.items__row dd {
  font-weight: 600;
}

.privacy {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
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

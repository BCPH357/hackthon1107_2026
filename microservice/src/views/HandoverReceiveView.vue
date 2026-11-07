<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import { findEvent } from '../data/lifeEvents'
import { receiveBleHandover, type BleHandoverReceiveResult, type HandoverTicket } from '../services/townpass'
import { acceptTicket, syncErrorMessage } from '../stores/cases'

// 子女：用藍牙接收長輩的交棒票 → 核對代碼 → 到伺服器下載這件事的進度

const router = useRouter()

type Status =
  | { step: 'idle' }
  | { step: 'searching' }
  | { step: 'confirm'; code: string; ticket: HandoverTicket; mocked: boolean }
  | { step: 'downloading' }
  | { step: 'failed'; message: string }

const status = ref<Status>({ step: 'idle' })

function failMessage(result: Exclude<BleHandoverReceiveResult, { state: 'found' }>): string {
  if (result.state === 'notFound') {
    return '附近找不到正在交棒的家人。請確認家人已按下「確認交棒」，兩支手機靠近一點再試一次。'
  }
  if (result.state === 'unavailable') {
    switch (result.reason) {
      case 'off':
        return '藍牙沒有打開。請打開藍牙後再試一次。'
      case 'unauthorized':
        return '台北通沒有使用藍牙的權限。請到手機的「設定 → 台北通」開啟藍牙。'
      default:
        return '這支手機不能用藍牙接收。'
    }
  }
  return '接收中斷了，請再試一次。'
}

async function receive() {
  status.value = { step: 'searching' }
  const { result, mocked } = await receiveBleHandover()
  status.value =
    result.state === 'found'
      ? { step: 'confirm', code: result.code, ticket: result.data, mocked }
      : { step: 'failed', message: failMessage(result) }
}

async function accept() {
  if (status.value.step !== 'confirm') return
  const ticket = status.value.ticket
  status.value = { step: 'downloading' }
  const { link, error } = await acceptTicket(ticket)
  if (!link || error) {
    status.value = { step: 'failed', message: error ? syncErrorMessage(error) : '收到的資料格式不正確，請長輩再交棒一次。' }
    return
  }
  if (!findEvent(link.eventId)) {
    status.value = { step: 'failed', message: '這件事在你的版本裡找不到，請更新台北通後再試一次。' }
    return
  }
  await router.replace(`/family/${link.caseId}`)
}
</script>

<template>
  <PageLayout title="接收家人交棒" fallback-back="/">
    <div class="stack">
      <h1 class="page-title">接收家人交棒</h1>
      <p class="lead">家人辦到一半、有做不到的步驟（例如要臨櫃），可以交給你。收到後，你們兩個人的進度會同步。</p>
    </div>

    <section v-if="status.step === 'confirm'" class="card stack confirm" aria-live="polite">
      <p>找到家人的交棒。</p>
      <p class="confirm__label">家人手機上顯示的代碼是</p>
      <p class="confirm__code" :aria-label="`代碼 ${status.code.split('').join(' ')}`">{{ status.code }}</p>
      <span v-if="status.mocked" class="badge badge--draft">瀏覽器預覽・模擬結果</span>
    </section>

    <p v-else-if="status.step === 'downloading'" class="card muted" role="status">正在下載家人的進度…</p>

    <section v-else class="card stack" aria-live="polite">
      <p v-if="status.step === 'failed'" class="notice" role="alert">{{ status.message }}</p>
      <ol class="how">
        <li>請家人打開這件事，在做不到的步驟按「交給家人」，再按「交棒給家人」。</li>
        <li>兩支手機靠近一點，你再按下面的按鈕。</li>
        <li>核對兩支手機上的 4 位數代碼一樣，就完成交棒。</li>
      </ol>
    </section>

    <template #footer>
      <template v-if="status.step === 'confirm'">
        <button type="button" class="btn btn--primary btn--block" @click="accept">代碼相同，接收交棒</button>
        <button type="button" class="btn btn--ghost btn--block" @click="receive">代碼不一樣，重新搜尋</button>
      </template>
      <button
        v-else
        type="button"
        class="btn btn--primary btn--block"
        :disabled="status.step === 'searching' || status.step === 'downloading'"
        @click="receive"
      >
        <AppIcon name="bluetooth" />
        {{ status.step === 'searching' ? '正在搜尋附近的家人…' : status.step === 'failed' ? '再試一次' : '用藍牙接收家人交棒' }}
      </button>
    </template>
  </PageLayout>
</template>

<style scoped>
.how {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1.25rem;
  list-style: decimal;
}

.notice {
  padding: 0.75rem;
  border-radius: var(--radius);
  background: var(--c-orange-50);
  color: var(--c-orange-700);
}

.confirm {
  align-items: center;
  text-align: center;
}

.confirm__label {
  color: var(--c-gray-700);
}

/* 代碼要讓家人一眼就能對照，所以放大、加字距 */
.confirm__code {
  font-size: calc(var(--fs-h1) * 1.4);
  font-weight: 600;
  letter-spacing: 0.3em;
  color: var(--c-primary-700);
  font-variant-numeric: tabular-nums;
}
</style>

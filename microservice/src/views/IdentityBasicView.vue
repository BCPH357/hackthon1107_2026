<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import OptionGroup from '../components/OptionGroup.vue'
import PageLayout from '../components/PageLayout.vue'
import StepIndicator from '../components/StepIndicator.vue'
import { DISTRICTS, OUTSIDE_TAIPEI, OUTSIDE_TAIPEI_LABEL, YES_NO_OPTIONS } from '../data/identityOptions'
import {
  getUserInfo,
  receiveBleShare,
  type BleReceiveResult,
  type SharedBasicInfo,
  type TownPassAccount,
} from '../services/townpass'
import { identity, identitySummary } from '../stores/identity'
import { ageFromBirthday } from '../utils/age'
import { arrayModel } from '../utils/arrayModel'

const router = useRouter()

const isSelf = computed(() => identity.forWhom === 'self')
const subject = computed(() => (isSelf.value ? '你' : '家人'))

const loading = ref(false)
const mocked = ref(false)
const accountMissing = ref(false)
const editing = ref(false)

const showAccountCard = computed(() => isSelf.value && identity.basicSource === 'account' && !editing.value)

const taipeiResident = arrayModel(
  () => identity.taipeiResident,
  (value) => (identity.taipeiResident = value),
)
const indigenous = arrayModel(
  () => identity.indigenous,
  (value) => (identity.indigenous = value),
)

const ageText = computed({
  get: () => (identity.age === null ? '' : String(identity.age)),
  set: (value: string | number) => {
    const age = Number.parseInt(String(value), 10)
    identity.age = Number.isInteger(age) && age >= 0 && age <= 120 ? age : null
  },
})

function applyAccount(account: TownPassAccount) {
  const address = account.addresses?.find((item) => item.priority) ?? account.addresses?.[0]
  const inTaipei = address?.city === '臺北市' || address?.city === '台北市'
  identity.age = ageFromBirthday(account.birthday)
  identity.taipeiResident = account.citizen === undefined ? null : account.citizen ? 'yes' : 'no'
  identity.district = address?.town && inTaipei ? address.town : address ? OUTSIDE_TAIPEI : null
  identity.indigenous = account.nativePeople === undefined ? null : account.nativePeople ? 'yes' : 'no'
  identity.basicSource = 'account'
}

// ---- 幫家人辦：用藍牙接收家人手機傳來的基本資料 ----
type BleStatus =
  | { step: 'idle' }
  | { step: 'searching' }
  | { step: 'confirm'; code: string; data: SharedBasicInfo; mocked: boolean }
  | { step: 'applied'; name: string; mocked: boolean }
  | { step: 'failed'; message: string }

const ble = ref<BleStatus>({ step: 'idle' })

function failMessage(result: Exclude<BleReceiveResult, { state: 'found' }>): string {
  if (result.state === 'notFound') {
    return '附近找不到正在傳送的家人。請確認家人已按下「開始傳送」，兩支手機靠近一點再試一次。'
  }
  if (result.state === 'unavailable') {
    switch (result.reason) {
      case 'off':
        return '藍牙沒有打開。請打開藍牙後再試一次。'
      case 'unauthorized':
        return '台北通沒有使用藍牙的權限。請到手機的「設定 → 台北通」開啟藍牙。'
      default:
        return '這支手機不能用藍牙接收，請直接填寫下面的資料。'
    }
  }
  return '接收中斷了，請再試一次。'
}

async function receiveFromFamily() {
  ble.value = { step: 'searching' }
  const { result, mocked } = await receiveBleShare()
  ble.value =
    result.state === 'found'
      ? { step: 'confirm', code: result.code, data: result.data, mocked }
      : { step: 'failed', message: failMessage(result) }
}

function applyShared(data: SharedBasicInfo) {
  const inTaipei = data.city === '臺北市' || data.city === '台北市'
  identity.age = typeof data.age === 'number' ? data.age : null
  identity.taipeiResident = typeof data.citizen === 'boolean' ? (data.citizen ? 'yes' : 'no') : null
  identity.district =
    inTaipei && data.town && (DISTRICTS as readonly string[]).includes(data.town)
      ? data.town
      : data.city
        ? OUTSIDE_TAIPEI
        : null
  identity.indigenous = typeof data.native === 'boolean' ? (data.native ? 'yes' : 'no') : null
  identity.basicSource = 'bluetooth'
}

function confirmShared() {
  if (ble.value.step !== 'confirm') return
  applyShared(ble.value.data)
  ble.value = { step: 'applied', name: ble.value.data.name || '家人', mocked: ble.value.mocked }
}

onMounted(async () => {
  if (!isSelf.value) {
    if (identity.basicSource !== 'bluetooth') identity.basicSource = 'manual'
    editing.value = true
    return
  }
  if (identity.basicSource === 'manual') {
    editing.value = true
    return
  }
  loading.value = true
  const result = await getUserInfo()
  loading.value = false
  mocked.value = result.mocked
  if (result.account) {
    applyAccount(result.account)
  } else {
    accountMissing.value = true
    identity.basicSource = 'manual'
    editing.value = true
  }
})

function startEditing() {
  identity.basicSource = 'manual'
  editing.value = true
}

function next() {
  identity.basicConfirmed = true
  router.push('/identity/health')
}
</script>

<template>
  <PageLayout title="你的情況" fallback-back="/identity/who">
    <StepIndicator :current="2" :total="5" />
    <div class="stack">
      <h1 class="page-title">{{ subject }}的基本資料</h1>
      <p class="lead">年齡與戶籍會影響可以申請的資源。</p>
    </div>

    <p v-if="loading" class="card muted" role="status">正在讀取台北通的資料…</p>

    <section v-else-if="showAccountCard" class="card account" aria-labelledby="account-title">
      <div class="account__head">
        <h2 id="account-title" class="section-title">從台北通帳號帶入</h2>
        <span v-if="mocked" class="badge badge--draft">示範資料・未連接台北通</span>
      </div>
      <p v-if="identitySummary.basic.length" class="tag-list">
        <span v-for="item in identitySummary.basic" :key="item" class="tag">{{ item }}</span>
      </p>
      <p v-else class="muted">帳號裡沒有可用的資料，請自己填寫。</p>
      <button type="button" class="btn btn--ghost btn--sm account__edit" @click="startEditing">
        <AppIcon name="edit" />
        資料有誤，我要修改
      </button>
    </section>

    <form v-else class="stack stack--lg" @submit.prevent="next">
      <p v-if="accountMissing" class="card card--tint">讀不到台北通的帳號資料，請自己填寫，不想填的可以略過。</p>

      <section v-if="!isSelf" class="card ble" aria-labelledby="ble-title" aria-live="polite">
        <h2 id="ble-title" class="section-title ble__title">
          <AppIcon name="bluetooth" />
          家人在旁邊嗎？
        </h2>

        <template v-if="ble.step === 'confirm'">
          <p>找到 <strong>{{ ble.data.name || '家人' }}</strong> 的資料。</p>
          <p class="ble__code-label">家人手機上顯示的代碼是</p>
          <p class="ble__code" :aria-label="`代碼 ${ble.code.split('').join(' ')}`">{{ ble.code }}</p>
          <span v-if="ble.mocked" class="badge badge--draft ble__badge">示範資料・未連接台北通</span>
          <button type="button" class="btn btn--primary btn--block" @click="confirmShared">代碼相同，帶入資料</button>
          <button type="button" class="btn btn--ghost btn--block" @click="receiveFromFamily">代碼不一樣，重新搜尋</button>
        </template>

        <template v-else>
          <p v-if="ble.step === 'applied'" class="ble__done">
            <AppIcon name="check" />
            已帶入{{ ble.name }}的資料，下面可以再修改。
            <span v-if="ble.mocked" class="badge badge--draft">示範資料・未連接台北通</span>
          </p>
          <p v-else-if="ble.step === 'failed'" class="ble__error" role="alert">{{ ble.message }}</p>
          <p v-else class="muted">
            請家人打開台北通的這個服務，在首頁點「把我的資料傳給家人」，就能用藍牙把年齡、戶籍帶過來，不用自己填。
          </p>
          <button
            type="button"
            class="btn btn--secondary btn--block"
            :disabled="ble.step === 'searching'"
            @click="receiveFromFamily"
          >
            <AppIcon name="bluetooth" />
            {{ ble.step === 'searching' ? '正在搜尋附近的家人…' : ble.step === 'idle' ? '用藍牙接收家人的資料' : '再接收一次' }}
          </button>
        </template>
      </section>

      <div class="field">
        <label for="age" class="field__label">{{ subject }}幾歲？</label>
        <div class="input-suffix">
          <input id="age" v-model="ageText" class="input" type="number" inputmode="numeric" min="0" max="120" />
          <span>歲</span>
        </div>
      </div>

      <OptionGroup v-model="taipeiResident" :legend="`${subject}的戶籍在臺北市嗎？`" :options="YES_NO_OPTIONS" inline clearable />

      <div class="field">
        <label for="district" class="field__label">{{ subject }}住在哪一區？</label>
        <select id="district" v-model="identity.district" class="select">
          <option :value="null">請選擇</option>
          <option v-for="district in DISTRICTS" :key="district" :value="district">{{ district }}</option>
          <option :value="OUTSIDE_TAIPEI">{{ OUTSIDE_TAIPEI_LABEL }}</option>
        </select>
      </div>

      <OptionGroup v-model="indigenous" :legend="`${subject}是原住民嗎？`" :options="YES_NO_OPTIONS" inline clearable />
    </form>

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" :disabled="loading" @click="next">
        {{ showAccountCard ? '資料正確，下一步' : '下一步' }}
      </button>
    </template>
  </PageLayout>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.account__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.account__edit {
  align-self: flex-start;
  padding-left: 0;
}

.ble {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ble__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--c-primary-700);
}

.ble__code-label {
  color: var(--c-gray-700);
}

/* 代碼要讓長輩和家人一眼就能對照，所以放大、加字距 */
.ble__code {
  font-size: var(--fs-h1);
  font-weight: 600;
  letter-spacing: 0.3em;
  color: var(--c-primary-700);
  font-variant-numeric: tabular-nums;
}

.ble__badge {
  align-self: flex-start;
}

.ble__done {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--c-primary-700);
}

.ble__error {
  padding: 0.75rem;
  border-radius: var(--radius);
  background: var(--c-orange-50);
  color: var(--c-orange-700);
}
</style>

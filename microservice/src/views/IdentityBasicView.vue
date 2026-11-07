<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import OptionGroup from '../components/OptionGroup.vue'
import PageLayout from '../components/PageLayout.vue'
import StepIndicator from '../components/StepIndicator.vue'
import { DISTRICTS, OUTSIDE_TAIPEI, OUTSIDE_TAIPEI_LABEL, YES_NO_OPTIONS } from '../data/identityOptions'
import { getUserInfo, type TownPassAccount } from '../services/townpass'
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

onMounted(async () => {
  if (!isSelf.value) {
    identity.basicSource = 'manual'
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
</style>

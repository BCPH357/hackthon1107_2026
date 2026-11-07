<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ChipGroup from '../components/ChipGroup.vue'
import PageLayout from '../components/PageLayout.vue'
import StepIndicator from '../components/StepIndicator.vue'
import {
  CARE_OPTIONS,
  EMPLOYMENT_OPTIONS,
  FAMILY_OPTIONS,
  GENDER_OPTIONS,
  NATIONALITY_OPTIONS,
  OTHER_OPTIONS,
} from '../data/identityOptions'
import { identity } from '../stores/identity'
import { arrayModel } from '../utils/arrayModel'

const router = useRouter()
const isSelf = computed(() => identity.forWhom === 'self')
const subject = computed(() => (isSelf.value ? '你' : '家人'))

const nationality = arrayModel(
  () => identity.nationality,
  (value) => (identity.nationality = value),
)
const employment = arrayModel(
  () => identity.employment,
  (value) => (identity.employment = value),
)
const gender = arrayModel(
  () => identity.gender,
  (value) => (identity.gender = value),
)

const nothingSelected = computed(
  () =>
    !identity.care.length &&
    !identity.family.length &&
    !identity.others.length &&
    identity.nationality === null &&
    identity.employment === null &&
    identity.gender === null,
)

function next() {
  router.push('/identity/summary')
}
</script>

<template>
  <PageLayout title="你的情況" fallback-back="/identity/health">
    <StepIndicator :current="4" :total="5" />
    <div class="stack">
      <h1 class="page-title">{{ subject }}的生活狀況</h1>
      <p class="lead">都可以略過，選了能讓推薦更準確。</p>
    </div>

    <!-- 幫家人辦時，操作的人就是照顧者，不必再問 -->
    <ChipGroup v-if="isSelf" v-model="identity.care" legend="你有在照顧家人嗎？" :options="CARE_OPTIONS" multiple />
    <ChipGroup v-model="identity.family" legend="經濟與家庭" :options="FAMILY_OPTIONS" multiple />
    <ChipGroup v-model="nationality" legend="國籍與居留" :options="NATIONALITY_OPTIONS" />
    <ChipGroup v-model="employment" legend="工作狀況" :options="EMPLOYMENT_OPTIONS" />
    <ChipGroup v-model="gender" legend="性別" :options="GENDER_OPTIONS" />
    <ChipGroup v-model="identity.others" legend="其他" :options="OTHER_OPTIONS" multiple />

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" @click="next">
        {{ nothingSelected ? '都略過，下一步' : '下一步' }}
      </button>
    </template>
  </PageLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ChipGroup from '../components/ChipGroup.vue'
import PageLayout from '../components/PageLayout.vue'
import StepIndicator from '../components/StepIndicator.vue'
import { DISABILITY_CARD_OPTIONS, DISABILITY_LEVEL_OPTIONS, FUNCTION_OPTIONS, HEALTH_OPTIONS } from '../data/identityOptions'
import { identity } from '../stores/identity'
import { arrayModel } from '../utils/arrayModel'

const router = useRouter()
const subject = computed(() => (identity.forWhom === 'family' ? '家人' : '你'))

const disabilityCard = arrayModel(
  () => identity.disabilityCard,
  (value) => {
    identity.disabilityCard = value
    if (value !== 'yes') identity.disabilityLevel = null
  },
)
const disabilityLevel = arrayModel(
  () => identity.disabilityLevel,
  (value) => (identity.disabilityLevel = value),
)

const nothingSelected = computed(
  () => !identity.functions.length && !identity.health.length && identity.disabilityCard === null,
)

function next() {
  router.push('/identity/life')
}
</script>

<template>
  <PageLayout title="你的情況" fallback-back="/identity/basic">
    <StepIndicator :current="3" :total="5" />
    <div class="stack">
      <h1 class="page-title">{{ subject }}的身心與健康狀況</h1>
      <p class="lead">可以複選，沒有的話直接按下一步。</p>
    </div>

    <ChipGroup
      v-model="identity.functions"
      legend="生活上有沒有這些困難？"
      hint="不需要有證明也可以選"
      :options="FUNCTION_OPTIONS"
      multiple
    />

    <ChipGroup v-model="disabilityCard" :legend="`${subject}有身心障礙證明嗎？`" :options="DISABILITY_CARD_OPTIONS" />
    <ChipGroup
      v-if="identity.disabilityCard === 'yes'"
      v-model="disabilityLevel"
      legend="證明上的障礙程度"
      :options="DISABILITY_LEVEL_OPTIONS"
    />

    <ChipGroup v-model="identity.health" legend="健康狀況" :options="HEALTH_OPTIONS" multiple />

    <p class="privacy muted">
      <AppIcon name="lock" />
      健康與身心資料只存在這支手機上，不會上傳。
    </p>

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" @click="next">
        {{ nothingSelected ? '都沒有，下一步' : '下一步' }}
      </button>
    </template>
  </PageLayout>
</template>

<style scoped>
.privacy {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import OptionGroup from '../components/OptionGroup.vue'
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
const subject = '你'

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

const moreFilled = computed(
  () => identity.nationality !== null || identity.employment !== null || identity.gender !== null || identity.others.length > 0,
)
// 「更多身分條件」預設收起；已經填過的話打開，避免使用者以為資料不見了
const moreOpen = ref(moreFilled.value)

const nothingSelected = computed(() => !identity.care.length && !identity.family.length && !moreFilled.value)

function next() {
  router.push('/identity/summary')
}
</script>

<template>
  <PageLayout title="你的情況" fallback-back="/identity/health">
    <StepIndicator :current="3" :total="4" />
    <div class="stack">
      <h1 class="page-title">{{ subject }}的生活狀況</h1>
      <p class="lead">都可以略過，選了能讓推薦更準確。</p>
    </div>

    <OptionGroup v-model="identity.care" legend="你有在照顧家人嗎？" :options="CARE_OPTIONS" multiple />
    <OptionGroup v-model="identity.family" legend="經濟與家庭" :options="FAMILY_OPTIONS" multiple />

    <!-- CLAUDE_UI_GUIDE 2.2：不要一次攤開全部欄位，次要條件收在這裡 -->
    <details class="more" :open="moreOpen" @toggle="moreOpen = ($event.target as HTMLDetailsElement).open">
      <summary class="more__summary">
        <span class="more__title">
          更多身分條件
          <span class="muted">國籍、工作、性別等，選填</span>
        </span>
        <AppIcon name="chevron-down" class="more__chevron" />
      </summary>
      <div class="more__body">
        <OptionGroup v-model="nationality" legend="國籍與居留" :options="NATIONALITY_OPTIONS" clearable />
        <OptionGroup v-model="employment" legend="工作狀況" :options="EMPLOYMENT_OPTIONS" clearable />
        <OptionGroup v-model="gender" legend="性別" :options="GENDER_OPTIONS" inline clearable />
        <OptionGroup v-model="identity.others" legend="其他" :options="OTHER_OPTIONS" multiple />
      </div>
    </details>

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" @click="next">
        {{ nothingSelected ? '都略過，下一步' : '下一步' }}
      </button>
    </template>
  </PageLayout>
</template>

<style scoped>
.more {
  border-radius: var(--radius);
  background: var(--c-white);
  box-shadow: var(--shadow);
}

.more__summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  list-style: none;
}

.more__summary::-webkit-details-marker {
  display: none;
}

.more__title {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-weight: 600;
}

.more__title .muted {
  font-weight: 400;
}

.more__chevron {
  flex: none;
  color: var(--c-gray-500);
  transition: transform 0.2s ease;
}

.more[open] .more__chevron {
  transform: rotate(180deg);
}

.more__body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 1rem 1.25rem;
  border-top: 1px solid var(--c-gray-100);
}

/* 收在白底區塊裡的選項列表改成淡灰底，才分得出層次 */
.more__body :deep(.option-group__list:not(.option-group__list--inline)) {
  background: var(--c-gray-50);
  box-shadow: none;
}
</style>

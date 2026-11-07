<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import StepIndicator from '../components/StepIndicator.vue'
import { identity, identitySummary, identityTags, resetIdentity } from '../stores/identity'
import { deleteAllCases } from '../stores/cases'
import { clearProgress } from '../stores/progress'
import { showToast } from '../stores/toast'

const router = useRouter()
const confirmingClear = ref(false)

const sections = computed(() => [
  { title: '基本資料', items: identitySummary.value.basic, to: '/identity/basic' },
  { title: '身心與健康', items: identitySummary.value.health, to: '/identity/health' },
  { title: '生活狀況', items: identitySummary.value.life, to: '/identity/life' },
])

function confirm() {
  identity.completed = true
  router.push('/events')
}

async function clearAll() {
  resetIdentity()
  clearProgress()
  confirmingClear.value = false
  // 交棒紀錄一併刪除：伺服器上的案件刪掉後，家人手機下次同步也會跟著拿掉
  const failed = await deleteAllCases()
  showToast(
    failed
      ? `已清除這支手機上的資料；有 ${failed} 筆交棒沒連上伺服器，對方手機上可能還看得到`
      : '已清除這支手機上的資料，交棒紀錄也一併刪除',
  )
  router.replace('/')
}
</script>

<template>
  <PageLayout title="你的情況" fallback-back="/identity/life">
    <StepIndicator :current="4" :total="4" />
    <div class="stack">
      <h1 class="page-title">確認一下</h1>
      <p class="lead">我們會依照下面的情況推薦要辦的事，之後隨時可以回來修改。</p>
    </div>

    <section class="overview card card--tint" aria-labelledby="overview-title">
      <h2 id="overview-title" class="overview__label">你的情況</h2>
      <p class="overview__line">{{ identityTags.join('・') || '還沒有填寫任何條件' }}</p>
    </section>

    <ul class="summary">
      <li v-for="section in sections" :key="section.title" class="summary__item card">
        <div class="summary__head">
          <h2 class="summary__title">{{ section.title }}</h2>
          <RouterLink :to="section.to" class="btn btn--ghost btn--sm" :aria-label="`修改${section.title}`">
            <AppIcon name="edit" />
            修改
          </RouterLink>
        </div>
        <p v-if="section.items.length" class="tag-list">
          <span v-for="item in section.items" :key="item" class="tag">{{ item }}</span>
        </p>
        <p v-else class="muted">沒有填寫</p>
      </li>
    </ul>

    <section class="clear" aria-label="清除資料">
      <button v-if="!confirmingClear" type="button" class="btn btn--ghost btn--sm" @click="confirmingClear = true">
        清除這支手機上我填的資料
      </button>
      <div v-else class="card clear__confirm" role="alert">
        <p>確定要清除嗎？身分、每件事的進度和交棒紀錄都會一起清除，家人手機上的這些交棒也會一起刪掉。</p>
        <div class="clear__actions">
          <button type="button" class="btn btn--danger btn--sm" @click="clearAll">確定清除</button>
          <button type="button" class="btn btn--ghost btn--sm" @click="confirmingClear = false">取消</button>
        </div>
      </div>
    </section>

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" @click="confirm">確認，開始選要辦的事</button>
    </template>
  </PageLayout>
</template>

<style scoped>
.overview {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.overview__label {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--c-primary-700);
}

.overview__line {
  font-size: var(--fs-title);
  font-weight: 600;
  color: var(--c-gray-900);
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary__item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}

.summary__title {
  font-size: var(--fs-h3);
  font-weight: 600;
  color: var(--c-gray-700);
}

.clear {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.clear__confirm {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.clear__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>

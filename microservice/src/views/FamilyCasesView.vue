<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import { findEvent } from '../data/lifeEvents'
import { familyCases, type CaseLink } from '../stores/cases'

// 子女：家人交給我的事

function summaryOf(link: CaseLink): { mine: number; mineDone: number } {
  const steps = Object.values(link.doc?.steps ?? {}).filter((step) => step.owner === 'family')
  return { mine: steps.length, mineDone: steps.filter((step) => step.done).length }
}
</script>

<template>
  <PageLayout title="家人交給我的事" fallback-back="/">
    <div class="stack">
      <h1 class="page-title">家人交給我的事</h1>
      <p class="lead">點進去可以看每一步怎麼辦，辦好後打勾，家人的手機也會看到。</p>
    </div>

    <ul v-if="familyCases.length" class="cases">
      <li v-for="link in familyCases" :key="link.caseId">
        <RouterLink :to="`/family/${link.caseId}`" class="case card tab-card">
          <span class="case__text">
            <span class="muted">{{ link.doc?.elderName ? `${link.doc.elderName}交給你` : '家人交給你' }}</span>
            <span class="case__title">{{ findEvent(link.eventId)?.title ?? '這件事已不在清單上' }}</span>
            <span class="muted">交給你的 {{ summaryOf(link).mine }} 步，已辦好 {{ summaryOf(link).mineDone }} 步</span>
          </span>
          <AppIcon name="chevron-right" size="1.5rem" />
        </RouterLink>
      </li>
    </ul>

    <p v-else class="card card--tint">還沒有家人交棒給你。請家人在要辦的事裡按「交棒給家人」，你再到首頁按「接收家人交棒」。</p>

    <template #footer>
      <RouterLink to="/handover/receive" class="btn btn--primary btn--block">
        <AppIcon name="bluetooth" />
        接收家人交棒
      </RouterLink>
    </template>
  </PageLayout>
</template>

<style scoped>
.cases {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.case {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
  text-decoration: none;
}

.case__text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.case__title {
  font-size: var(--fs-title);
  font-weight: 600;
}
</style>

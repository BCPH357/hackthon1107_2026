<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import HelpCard from '../components/HelpCard.vue'
import PageLayout from '../components/PageLayout.vue'
import StepModeBadge from '../components/StepModeBadge.vue'
import { DATA_NOTICE } from '../config'
import { findEvent } from '../data/lifeEvents'
import { TOWNPASS_SERVICES, isServiceAvailable } from '../data/townpassServices'
import { callPhone, openMapSearch, openTownPassService } from '../services/townpass'
import { profiles, taipeiDistrict } from '../stores/identity'
import { isStepDone, setStepDone } from '../stores/progress'
import { showToast } from '../stores/toast'
import { useDocumentTitle } from '../utils/documentTitle'
import { resolveWhere } from '../utils/where'

const props = defineProps<{ eventId: string; stepId: string }>()
const router = useRouter()

// 路由的 beforeEnter 已確認事件與步驟存在
const event = computed(() => findEvent(props.eventId)!)
const steps = computed(() => event.value.steps ?? [])
const index = computed(() => steps.value.findIndex((step) => step.id === props.stepId))
const step = computed(() => steps.value[index.value]!)
const done = computed(() => isStepDone(props.eventId, props.stepId))

useDocumentTitle(() => step.value.title)

const where = computed(() => resolveWhere(step.value.where, taipeiDistrict.value))

// 符合身分的資源排前面並標示「你可能符合」
const resources = computed(() =>
  step.value.resources
    .map((resource) => ({ ...resource, match: resource.for?.some((key) => profiles.value.has(key)) ?? false }))
    .sort((a, b) => Number(b.match) - Number(a.match)),
)

const services = computed(() =>
  step.value.services.map((id) => {
    const service = TOWNPASS_SERVICES[id]
    return { id, service, available: isServiceAvailable(service) }
  }),
)

const eventPath = computed(() => `/events/${props.eventId}`)

function backToEvent() {
  // 從清單點進來就退回去，避免標題列的返回鍵又回到這一步
  if (window.history.state?.back === eventPath.value) router.back()
  else router.replace(eventPath.value)
}

function complete() {
  setStepDone(props.eventId, props.stepId, true)
  showToast(`第 ${index.value + 1} 步「${step.value.title}」已打勾`)
  backToEvent()
}

function undo() {
  setStepDone(props.eventId, props.stepId, false)
  showToast('已取消打勾')
}
</script>

<template>
  <PageLayout :title="step.title" :fallback-back="eventPath">
    <div class="stack">
      <p class="eyebrow">{{ event.title }}・第 {{ index + 1 }} 步，共 {{ steps.length }} 步</p>
      <h1 class="page-title"><span class="mark">{{ step.title }}</span></h1>
      <p class="badges">
        <StepModeBadge :mode="step.mode" />
        <span v-if="done" class="badge badge--primary">已辦好</span>
        <span class="badge badge--draft">示範資料</span>
      </p>
    </div>

    <!-- CLAUDE_UI_GUIDE 2.5：固定依「要做什麼、要準備什麼、去哪裡辦、可以用的資源」的順序 -->
    <section class="card tab-card block" aria-labelledby="what-title">
      <h2 id="what-title" class="section-title">要做什麼</h2>
      <p>{{ step.what }}</p>
    </section>

    <section class="card tab-card block" aria-labelledby="prepare-title">
      <div class="block__head">
        <h2 id="prepare-title" class="section-title">要準備什麼</h2>
        <span class="badge badge--draft">待查證</span>
      </div>
      <p class="muted">清單是示範內容，出發前請先打電話確認要帶什麼。</p>
      <ul class="checklist">
        <li v-for="item in step.prepare" :key="item" class="checklist__item">
          <AppIcon name="check" class="checklist__icon" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </section>

    <section class="card tab-card block" aria-labelledby="where-title">
      <div class="block__head">
        <h2 id="where-title" class="section-title">去哪裡辦</h2>
        <span class="badge badge--draft">待查證</span>
      </div>
      <p class="where__name">{{ where.name }}</p>
      <p v-if="where.detail" class="muted">{{ where.detail }}</p>
      <div v-if="where.phone || where.mapQuery" class="actions">
        <button v-if="where.phone" type="button" class="btn btn--secondary" @click="callPhone(where.phone)">
          <AppIcon name="phone" />
          撥打 {{ where.phone }}
        </button>
        <button v-if="where.mapQuery" type="button" class="btn btn--secondary" @click="openMapSearch(where.mapQuery)">
          <AppIcon name="map-pin" />
          在地圖上搜尋
        </button>
      </div>
    </section>

    <section class="block" aria-labelledby="resources-title">
      <h2 id="resources-title" class="section-title">可以用的資源</h2>

      <h3 class="sub-title">政府資源</h3>
      <ul class="resources">
        <li v-for="resource in resources" :key="resource.name" class="resource card" :class="{ 'resource--match': resource.match }">
          <div class="resource__head">
            <span class="resource__name">{{ resource.name }}</span>
            <span v-if="resource.match" class="badge badge--match">你可能符合</span>
          </div>
          <p class="resource__desc">{{ resource.description }}</p>
          <button
            v-if="resource.phone"
            type="button"
            class="btn btn--ghost btn--sm resource__call"
            @click="callPhone(resource.phone)"
          >
            <AppIcon name="phone" />
            撥打 {{ resource.phone }}
          </button>
        </li>
      </ul>

      <template v-if="services.length">
        <h3 class="sub-title">台北通服務</h3>
        <ul class="services">
          <li v-for="{ id, service, available } in services" :key="id">
            <button
              type="button"
              class="service card"
              :class="{ 'service--off': !available }"
              @click="openTownPassService(service)"
            >
              <span class="service__text">
                <span class="service__name">{{ service.title }}</span>
                <span class="muted">{{ service.description }}</span>
              </span>
              <span v-if="!available" class="badge badge--muted">尚未開放</span>
              <AppIcon v-else :name="service.phone ? 'phone' : 'arrow-up-right'" class="service__icon" />
            </button>
          </li>
        </ul>
      </template>
    </section>

    <HelpCard />

    <p class="notice muted">
      <AppIcon name="info" />
      <span>{{ DATA_NOTICE }}</span>
    </p>

    <template #footer>
      <template v-if="!done">
        <button type="button" class="btn btn--primary btn--block" @click="complete">
          <AppIcon name="check" />
          我辦好這一步了
        </button>
        <button type="button" class="btn btn--ghost btn--block btn--sm" @click="backToEvent">回到步驟清單</button>
      </template>
      <template v-else>
        <button type="button" class="btn btn--primary btn--block" @click="backToEvent">回到步驟清單</button>
        <button type="button" class="btn btn--ghost btn--block btn--sm" @click="undo">取消打勾</button>
      </template>
    </template>
  </PageLayout>
</template>

<style scoped>
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.block__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
}

.sub-title {
  margin-top: 0.25rem;
  font-size: var(--fs-h3);
  font-weight: 600;
  color: var(--c-gray-700);
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checklist__item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.checklist__icon {
  flex: none;
  margin-top: 0.2em;
  color: var(--c-primary-600);
}

.where__name {
  font-size: var(--fs-title);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.actions .btn {
  flex: 1 1 10rem;
}

.resources,
.services {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.resource {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-left: 4px solid transparent;
}

.resource--match {
  border-left-color: var(--c-secondary-500);
}

.resource__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.5rem;
}

.resource__name {
  font-weight: 600;
}

.resource__desc {
  font-size: var(--fs-body);
  color: var(--c-gray-700);
}

.resource__call {
  align-self: flex-start;
  padding-left: 0;
}

.service {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 4rem;
  border: 0;
  text-align: left;
}

.service:active {
  background: var(--c-gray-50);
}

.service--off .service__name {
  color: var(--c-gray-700);
}

.service__text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.service__name {
  font-weight: 600;
}

.service__icon {
  flex: none;
  color: var(--c-primary-700);
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.notice :deep(svg) {
  flex: none;
  margin-top: 0.2em;
}
</style>

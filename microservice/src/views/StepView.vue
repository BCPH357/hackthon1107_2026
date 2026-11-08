<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import HelpCard from '../components/HelpCard.vue'
import PageLayout from '../components/PageLayout.vue'
import SafetyCard from '../components/SafetyCard.vue'
import StepModeBadge from '../components/StepModeBadge.vue'
import { DATA_NOTICE } from '../config'
import { findEvent } from '../data/lifeEvents'
import { TOWNPASS_SERVICES, isServiceAvailable } from '../data/townpassServices'
import { requestOrientationPermission } from '../services/compass'
import { callPhone, openLink, openTownPassService } from '../services/townpass'
import { isEasyRead } from '../stores/display'
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

// 易讀版：有寫易讀文字的欄位才換，沒寫的沿用一般版
const easy = computed(() => isEasyRead())
const easyStep = computed(() => (easy.value ? step.value.easy : undefined))
const prepareItems = computed(() => easyStep.value?.prepare ?? step.value.prepare)
const whereName = computed(() => easyStep.value?.where ?? where.value.name)

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
const stepPath = computed(() => `${eventPath.value}/steps/${props.stepId}`)

/** AR 不再經過說明頁：iPhone 的方向感測器權限一定要在點擊當下要求，先送出再換頁，AR 頁一進去就開相機 */
function openAr() {
  void requestOrientationPermission()
  void router.push(`${stepPath.value}/ar`)
}

function backToEvent() {
  // 從清單或城市地圖（嚮導的站點、類別抽屜）點進來就退回去，回到原本選步驟的地方；
  // 退回也避免標題列的返回鍵又回到這一步
  const back = window.history.state?.back
  if (back === eventPath.value || (typeof back === 'string' && back.startsWith('/city'))) router.back()
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
  <PageLayout :title="step.title" :fallback-back="eventPath" show-easy-read>
    <div class="stack">
      <p class="eyebrow">{{ event.title }}・第 {{ index + 1 }} 步，共 {{ steps.length }} 步</p>
      <h1 class="page-title"><span class="mark">{{ step.title }}</span></h1>
      <p class="badges">
        <StepModeBadge :mode="step.mode" />
        <span v-if="done" class="badge badge--primary">已辦好</span>
        <span v-if="easyStep" class="badge badge--primary">易讀版</span>
        <span class="badge badge--draft">示範資料</span>
      </p>
    </div>

    <SafetyCard v-if="event.sensitive" />

    <!-- CLAUDE_UI_GUIDE 2.5：固定依「要做什麼、要準備什麼、去哪裡辦、可以用的資源」的順序 -->
    <section class="card tab-card block" aria-labelledby="what-title">
      <h2 id="what-title" class="section-title">要做什麼</h2>
      <!-- 易讀版：照順序一句一行，加上編號 -->
      <ol v-if="easyStep" class="easy-list">
        <li v-for="(line, i) in easyStep.what" :key="line" class="easy-list__item">
          <span class="easy-list__num" aria-hidden="true">{{ i + 1 }}</span>
          <span>{{ line }}</span>
        </li>
      </ol>
      <p v-else>{{ step.what }}</p>
    </section>

    <section class="card tab-card block" aria-labelledby="prepare-title">
      <div class="block__head">
        <h2 id="prepare-title" class="section-title">要準備什麼</h2>
        <span class="badge badge--draft">待查證</span>
      </div>
      <p class="muted">{{ easyStep ? '出發前，先打電話問要帶什麼。' : '清單是示範內容，出發前請先打電話確認要帶什麼。' }}</p>
      <ul class="checklist" :class="{ 'checklist--easy': easyStep }">
        <li v-for="item in prepareItems" :key="item" class="checklist__item">
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
      <p class="where__name">{{ whereName }}</p>
      <p v-if="where.detail && !easyStep" class="muted">{{ where.detail }}</p>
      <div v-if="where.phone || where.placeType" class="actions">
        <button v-if="where.phone" type="button" class="btn btn--secondary" @click="callPhone(where.phone)">
          <AppIcon name="phone" />
          撥打 {{ where.phone }}
        </button>
        <!-- 有開放資料座標的地點：打開相機，用箭頭指出方向 -->
        <button v-if="where.placeType" type="button" class="btn btn--secondary" @click="openAr">
          <AppIcon name="navigation" />
          用 AR 找方向
        </button>
      </div>
    </section>

    <!-- 易讀版先只顯示要做什麼、要帶什麼、去哪裡，資源收進「看更多」 -->
    <component
      :is="easy ? 'details' : 'section'"
      class="block"
      :class="{ 'resources--collapsed': easy }"
      :aria-labelledby="easy ? undefined : 'resources-title'"
    >
      <summary v-if="easy" class="resources__toggle">
        <span>看可以用的資源和台北通服務</span>
        <AppIcon name="chevron-down" class="resources__chevron" />
      </summary>
      <h2 v-else id="resources-title" class="section-title">可以用的資源</h2>

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
          <!-- 這張卡片內容的出處：官方說明網頁，有 AR 地點的另附臺北資料大平台資料集 -->
          <div v-if="resource.sources?.length" class="resource__sources">
            <span class="resource__sources-label">資料來源</span>
            <button
              v-for="source in resource.sources"
              :key="source.url"
              type="button"
              class="resource__source"
              @click="openLink(source.url)"
            >
              <span>{{ source.title }}</span>
              <AppIcon name="arrow-up-right" class="resource__source-icon" />
            </button>
          </div>
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
                <span class="muted easy-hide">{{ service.description }}</span>
              </span>
              <span v-if="!available" class="badge badge--muted">尚未開放</span>
              <AppIcon v-else :name="service.phone ? 'phone' : 'arrow-up-right'" class="service__icon" />
            </button>
          </li>
        </ul>
      </template>
    </component>

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

/* 易讀版：字大一級、行距加寬、每句前面有編號圓點 */
.easy-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.easy-list__item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: var(--fs-title);
  line-height: 1.7;
}

.easy-list__num {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin-top: 0.15em;
  border-radius: 50%;
  background: var(--c-primary-100);
  color: var(--c-primary-800);
  font-size: var(--fs-h3);
  font-weight: 600;
}

.checklist--easy .checklist__item {
  font-size: var(--fs-title);
  line-height: 1.6;
}

.resources--collapsed {
  border-radius: var(--radius);
  background: var(--c-white);
  box-shadow: var(--shadow);
  padding: 0 1rem;
}

.resources--collapsed[open] {
  padding-bottom: 1rem;
}

.resources__toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.5rem;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

.resources__toggle::-webkit-details-marker {
  display: none;
}

.resources__toggle span {
  flex: 1;
}

.resources__chevron {
  flex: none;
  color: var(--c-gray-500);
  transition: transform 0.2s ease;
}

.resources--collapsed[open] .resources__chevron {
  transform: rotate(180deg);
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

.resource__sources {
  display: flex;
  flex-direction: column;
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--c-gray-100);
}

.resource__sources-label {
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--c-gray-600);
}

/* 連結樣式的按鈕：網址交給 App 開；高度至少 48px 方便點 */
.resource__source {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: var(--tap);
  padding: 0.25rem 0;
  border: 0;
  background: none;
  color: var(--c-primary-700);
  font-size: var(--fs-body);
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.resource__source-icon {
  flex: none;
}

/* 字放大到 200% 時，「尚未開放」標籤換到下一行，名稱不會被擠成一行兩個字 */
.service {
  display: flex;
  flex-wrap: wrap;
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
  flex: 1 1 8rem;
  min-width: 0;
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

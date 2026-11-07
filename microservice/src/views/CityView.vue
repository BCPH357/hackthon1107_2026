<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import BottomSheet from '../components/BottomSheet.vue'
import CategorySheet from '../components/CategorySheet.vue'
import CityGuideDialog from '../components/CityGuideDialog.vue'
import CityGuideStation from '../components/CityGuideStation.vue'
import DisplayButton from '../components/DisplayButton.vue'
import PageLayout from '../components/PageLayout.vue'
import { CITY_PLOTS, CITY_THEMES, themeOf } from '../city/config'
import { categoryProgress, findCategory, recommendedCategoryIds } from '../city/progress'
import { CityScene } from '../city/scene'
import { GUIDE_STATIONS, type GuideChoice } from '../city/guide'
import { CATEGORIES } from '../data/lifeEvents'

const route = useRoute()
const router = useRouter()

const SHEET_TITLE_ID = 'city-sheet-title'
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const sheet = ref<InstanceType<typeof BottomSheet> | null>(null)
const guidePin = ref<HTMLButtonElement | null>(null)
const guideOpen = ref(false)
const guideWalking = ref(false)
type GuideStationState = { index: number; fullRoute: boolean; stepId?: string }

// 嚮導目前在哪一站記在網址（?station=站序&route=1&step=步驟），點進步驟再返回時才接得回同一站
const GUIDE_QUERY_KEYS = ['station', 'route', 'step'] as const

function guideStationFromQuery(): GuideStationState | null {
  const index = Number(route.query.station)
  const stop = Number.isInteger(index) ? GUIDE_STATIONS[index] : undefined
  if (!stop || route.query.cat !== stop.categoryId) return null
  const step = route.query.step
  return { index, fullRoute: route.query.route === '1', stepId: typeof step === 'string' ? step : undefined }
}

function guideQuery(state: GuideStationState) {
  return { station: String(state.index), ...(state.fullRoute ? { route: '1' } : {}), ...(state.stepId ? { step: state.stepId } : {}) }
}

/** 網址的 query 拿掉嚮導站點的部分 */
function withoutGuideQuery(query: typeof route.query) {
  return Object.fromEntries(Object.entries(query).filter(([key]) => !(GUIDE_QUERY_KEYS as readonly string[]).includes(key)))
}

const guideStation = ref<GuideStationState | null>(guideStationFromQuery())
const status = ref<'loading' | 'ready' | 'unsupported' | 'error'>('loading')
const loadPercent = ref(0)
/** 字放大到 125% 以上，或螢幕太窄讓標籤排不開時，標籤改排在地圖下方 */
const crowded = ref(false)
const gridLabels = computed(() => crowded.value || status.value === 'unsupported' || status.value === 'error')

const themes = Object.values(CITY_THEMES)

// 依類別清單的順序：讀屏與 Tab 鍵的順序和「要辦的事」一致
const plotIds = new Set(CITY_PLOTS.map((plot) => plot.categoryId))
const pins = computed(() =>
  CATEGORIES.filter((category) => plotIds.has(category.id)).map((category, index) => {
    const theme = themeOf(category.id)
    const progress = categoryProgress(category)
    const recommended = recommendedCategoryIds.value.has(category.id)
    const complete = progress.total > 0 && progress.done === progress.total
    const label = [
      category.title,
      `${theme.title}主題`,
      `${category.events.length} 件事`,
      progress.done ? `已辦好 ${progress.done}/${progress.total} 步` : '',
      recommended ? '為你推薦' : '',
    ]
      .filter(Boolean)
      .join('，')
    return { id: category.id, index, title: category.title, theme, progress, recommended, complete, label }
  }),
)

// 選取的類別記在網址（?cat=）：Android 返回鍵會先關抽屜，也能從其他頁直接帶著類別跳進來
const selectedId = computed(() => {
  const cat = route.query.cat
  return typeof cat === 'string' && findCategory(cat) ? cat : null
})
const selectedCategory = computed(() => findCategory(selectedId.value))

function select(categoryId: string | null): void {
  if (guideWalking.value || guideOpen.value) return
  if (guideStation.value && GUIDE_STATIONS[guideStation.value.index].categoryId !== categoryId) {
    guideStation.value = null
  }
  if (!categoryId) {
    if (selectedId.value) closeSheet()
    return
  }
  if (categoryId === selectedId.value) {
    sheet.value?.focus()
    return
  }
  void showCategory(categoryId)
}

function showCategory(categoryId: string) {
  // 抽屜已開時換類別用 replace，返回鍵不必一棟一棟退
  const location = { query: { ...withoutGuideQuery(route.query), cat: categoryId } }
  return selectedId.value ? router.replace(location) : router.push(location)
}

function closeSheet(): void {
  if (guideWalking.value) return
  if (guideOpen.value) {
    guideOpen.value = false
    return
  }
  guideStation.value = null
  const lastId = selectedId.value
  // 抽屜是在地圖上點開的就退回上一筆；從其他頁帶著類別跳進來的，就只把類別拿掉
  if (window.history.state?.back === '/city') router.back()
  else router.replace({ query: {} })
  if (lastId) nextTick(() => pinEls.get(lastId)?.focus({ preventScroll: true }))
}

function openGuide(): void {
  if (guideWalking.value) return
  guideOpen.value = true
  nextTick(() => sheet.value?.focus())
}

async function goToGuideStation(index: number, fullRoute: boolean, stepId?: string): Promise<void> {
  const stop = GUIDE_STATIONS[index]
  if (!stop || guideWalking.value) return
  guideOpen.value = false
  guideWalking.value = true
  scene?.setInsetBottom(0)
  await scene?.walkGuideTo(stop.categoryId)
  if (unmounted) return
  if (selectedId.value !== stop.categoryId) await showCategory(stop.categoryId)
  if (unmounted) return
  guideStation.value = { index, fullRoute, stepId }
  await router.replace({ query: { ...withoutGuideQuery(route.query), cat: stop.categoryId, ...guideQuery(guideStation.value) } })
  if (unmounted) return
  guideWalking.value = false
  await nextTick()
  layoutPins()
  sheet.value?.focus()
}

function startGuide(choice: GuideChoice): void {
  void goToGuideStation(choice.station ?? 0, choice.station === null, choice.stepId)
}

/** 從站點點進某一步：先把這一步記在網址（返回時標示剛才看的那一步），再進步驟頁 */
async function openGuideStep(stepId: string): Promise<void> {
  const current = guideStation.value
  if (!current) return
  const stop = GUIDE_STATIONS[current.index]
  guideStation.value = { ...current, stepId }
  await router.replace({ query: { ...withoutGuideQuery(route.query), cat: stop.categoryId, ...guideQuery(guideStation.value) } })
  await router.push(`/events/${stop.eventId}/steps/${stepId}`)
}

function nextGuideStation(): void {
  if (guideStation.value?.fullRoute) void goToGuideStation(guideStation.value.index + 1, true)
}

// ── 3D 場景 ─────────────────────────

let scene: CityScene | null = null
let resizeObserver: ResizeObserver | null = null
let crowdTimer = 0
let unmounted = false

onMounted(async () => {
  if (!canvas.value || !stage.value || !CityScene.isSupported()) {
    status.value = 'unsupported'
    return
  }
  try {
    scene = new CityScene({
      canvas: canvas.value,
      reducedMotion,
      onPick: select,
      onFrame: layoutPins,
    })
  } catch {
    status.value = 'unsupported'
    return
  }
  scene.select(selectedId.value)

  resizeObserver = new ResizeObserver(([entry]) => {
    scene?.resize(entry.contentRect.width, entry.contentRect.height)
    scheduleCrowdCheck(250)
  })
  resizeObserver.observe(stage.value)

  try {
    await scene.load((ratio) => {
      loadPercent.value = Math.round(ratio * 100)
    })
    if (unmounted) return
    status.value = 'ready'
    void scene
      .addGuide()
      .then(() => {
        const restored = guideStation.value
        if (restored && !unmounted) scene?.placeGuideAt(GUIDE_STATIONS[restored.index].categoryId)
      })
      .catch(() => undefined)
    await nextTick()
    measurePins()
    layoutPins()
    // 等大樓長完再檢查標籤排不排得開
    scheduleCrowdCheck(reducedMotion ? 0 : 1400)
  } catch {
    if (!unmounted) status.value = 'error'
  }
})

onBeforeUnmount(() => {
  unmounted = true
  window.clearTimeout(crowdTimer)
  resizeObserver?.disconnect()
  scene?.dispose()
  scene = null
})

watch(selectedId, (id, previous) => {
  if (guideStation.value && GUIDE_STATIONS[guideStation.value.index].categoryId !== id) {
    guideStation.value = null
  }
  scene?.select(id)
  // 抽屜開著時換類別，焦點移到新的標題
  if (id && previous) nextTick(() => sheet.value?.focus())
})

/** 抽屜蓋住地圖的高度，讓選取的大樓移到抽屜上方 */
function onSheetHeight(px: number): void {
  if (!scene || !stage.value) return
  const rect = stage.value.getBoundingClientRect()
  scene.setInsetBottom(px ? Math.max(0, rect.bottom - (window.innerHeight - px)) : 0)
}

// ── 標籤 ───────────────────────────
// 每畫一次 3D 畫面就把標籤移到大樓屋頂上方；直接改 style，不經過 Vue 的響應式，避免每一幀重新渲染

const pinEls = new Map<string, HTMLElement>()
const pinSizes = new Map<string, { w: number; h: number }>()
const PIN_GAP = 4
const PIN_LIFT = 8

function setPinEl(id: string, el: unknown): void {
  if (el instanceof HTMLElement) pinEls.set(id, el)
  else pinEls.delete(id)
}

function measurePins(): void {
  pinSizes.clear()
  for (const [id, el] of pinEls) {
    const chip = el.querySelector<HTMLElement>('.pin__chip')
    if (chip) pinSizes.set(id, { w: chip.offsetWidth, h: chip.offsetHeight })
  }
}

interface PinBox {
  id: string
  x: number
  y: number
  w: number
  h: number
  lift: number
  shift: number
  /** 大樓被移出畫面：標籤先藏起來，不擠在畫面邊緣 */
  offscreen: boolean
}

function computePinBoxes(): PinBox[] {
  if (!scene || !stage.value) return []
  const width = stage.value.clientWidth
  const height = stage.value.clientHeight
  const boxes: PinBox[] = []
  for (const pin of pins.value) {
    const position = scene.screenPosition(pin.id)
    const size = pinSizes.get(pin.id)
    if (!position || !size) continue
    const offscreen = position.x < 0 || position.x > width || position.y < 0 || position.y > height
    // 屋頂在畫面內但靠近邊緣時，標籤往內挪，不超出畫面左右；錨點（細線）仍對準屋頂
    const half = size.w / 2
    const center = Math.min(Math.max(position.x, half + PIN_GAP), width - half - PIN_GAP)
    boxes.push({
      id: pin.id,
      x: position.x,
      y: position.y,
      w: size.w,
      h: size.h,
      lift: PIN_LIFT,
      shift: offscreen ? 0 : center - position.x,
      offscreen,
    })
  }
  // 由上往下檢查：兩個標籤重疊時，把位置較高的那個再往上推
  // 選了一棟之後其他標籤是隱藏的、移出畫面的也是，都不參與避讓，否則會把看得到的標籤推出畫面
  const visible = boxes
    .filter((box) => !box.offscreen && (!selectedId.value || box.id === selectedId.value))
    .sort((a, b) => a.y - b.y)
  for (let pass = 0; pass < 6; pass++) {
    let moved = false
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const upper = visible[i]
        const lower = visible[j]
        const upperLeft = upper.x + upper.shift - upper.w / 2
        const lowerLeft = lower.x + lower.shift - lower.w / 2
        if (upperLeft + upper.w + PIN_GAP <= lowerLeft || lowerLeft + lower.w + PIN_GAP <= upperLeft) continue
        const upperBottom = upper.y - upper.lift
        const lowerTop = lower.y - lower.lift - lower.h
        const lowerBottom = lower.y - lower.lift
        if (upperBottom + PIN_GAP <= lowerTop || lowerBottom + PIN_GAP <= upperBottom - upper.h) continue
        upper.lift += upperBottom + PIN_GAP - lowerTop
        moved = true
      }
    }
    if (!moved) break
  }
  return boxes
}

function layoutPins(): void {
  if (guideWalking.value) return
  const position = scene?.guideScreenPosition()
  if (guidePin.value) {
    const visible = position && stage.value &&
      position.x > 0 && position.y > 0 && position.x < stage.value.clientWidth && position.y < stage.value.clientHeight
    guidePin.value.style.visibility = visible ? 'visible' : 'hidden'
    if (position) guidePin.value.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -100%)`
  }
  if (gridLabels.value) return
  for (const box of computePinBoxes()) {
    const el = pinEls.get(box.id)
    if (!el) continue
    el.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`
    el.style.setProperty('--lift', `${box.lift}px`)
    el.style.setProperty('--shift', `${box.shift}px`)
    // 用 data 屬性而不是 class：Vue 重新渲染時會改寫 class，但不會動到它沒管的屬性
    if (box.offscreen) el.dataset.offscreen = ''
    else delete el.dataset.offscreen
  }
}

function scheduleCrowdCheck(delay: number): void {
  window.clearTimeout(crowdTimer)
  crowdTimer = window.setTimeout(checkCrowded, delay)
}

/** 標籤被推到畫面上緣之外就代表排不開，改排在地圖下方 */
async function checkCrowded(): Promise<void> {
  if (status.value !== 'ready' || selectedId.value) return
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  if (rootFontSize >= 20) {
    crowded.value = true
    return
  }
  crowded.value = false
  await nextTick()
  measurePins()
  layoutPins()
  crowded.value = computePinBoxes().some((box) => !box.offscreen && box.y - box.lift - box.h < 0)
}

// 改成排在下方時，清掉浮動定位的 style
watch(gridLabels, async (grid) => {
  if (!grid) return
  await nextTick()
  for (const el of pinEls.values()) {
    el.style.removeProperty('transform')
    el.style.removeProperty('--lift')
    el.style.removeProperty('--shift')
    delete el.dataset.offscreen
  }
})
</script>

<template>
  <PageLayout title="城市地圖" fallback-back="/" flush hide-city-link hide-display-button>
    <div class="city" :class="{ 'city--walking': guideWalking }">
      <header class="city__header" :inert="guideWalking" :aria-hidden="guideWalking">
        <div class="city__header-content">
          <div class="city__tools"><DisplayButton /></div>
          <div class="city__head">
            <div class="city__head-row">
              <h1 class="city__title">點一棟大樓，看看要辦的事</h1>
              <RouterLink to="/events" class="city__list-link">改用清單</RouterLink>
            </div>
            <button type="button" class="btn btn--primary guide-entry" @click="openGuide">
              問問城市嚮導
            </button>
            <p v-if="status === 'ready'" class="city__hint">兩指可以放大縮小、旋轉，也可以用地圖下方的按鈕</p>
            <ul class="legend" aria-label="大樓顏色代表的主題">
              <li v-for="theme in themes" :key="theme.key" class="legend__item" :style="{ '--accent': theme.accent }">
                <span class="legend__dot" aria-hidden="true" />
                {{ theme.title }}
              </li>
            </ul>
          </div>
        </div>
      </header>

      <div class="city__map">
        <div ref="stage" class="city__stage" :class="{ 'city__stage--static': status === 'unsupported' || status === 'error' }">
          <div class="city__clouds" aria-hidden="true" />
          <!-- 3D 畫面只是視覺；能操作的是下面的標籤按鈕 -->
          <canvas v-show="status !== 'unsupported' && status !== 'error'" ref="canvas" class="city__canvas" aria-hidden="true" />
          <button
            v-show="!guideWalking && !guideOpen"
            ref="guidePin"
            class="guide-pin"
            type="button"
            aria-label="問問城市嚮導"
            @click="openGuide"
          >問我</button>
          <p v-if="guideWalking" class="guide-walking card" role="status">嚮導帶你過去⋯</p>

          <div v-if="status === 'loading'" class="city__loading" role="status">
            <span class="city__loading-icon"><AppIcon name="city" size="2rem" /></span>
            <span>城市蓋起來中⋯ {{ loadPercent }}%</span>
            <span class="city__loading-bar" aria-hidden="true"><span :style="{ width: `${loadPercent}%` }" /></span>
          </div>
          <!-- 不會雙指操作也能調整視角（WCAG 2.5.1：手勢要有單指的替代方式） -->
          <div v-if="status === 'ready'" class="map-controls" :inert="guideWalking" :aria-hidden="guideWalking" role="toolbar" aria-label="調整地圖視角">
            <button type="button" class="map-controls__btn" aria-label="縮小" @click="scene?.zoomBy(1 / 1.4)">
              <AppIcon name="minus" size="1.375rem" />
            </button>
            <button type="button" class="map-controls__btn" aria-label="放大" @click="scene?.zoomBy(1.4)">
              <AppIcon name="plus" size="1.375rem" />
            </button>
            <span class="map-controls__divider" aria-hidden="true" />
            <button type="button" class="map-controls__btn" aria-label="逆時針旋轉" @click="scene?.rotateBy(-Math.PI / 4)">
              <AppIcon name="rotate-ccw" size="1.375rem" />
            </button>
            <button type="button" class="map-controls__btn" aria-label="順時針旋轉" @click="scene?.rotateBy(Math.PI / 4)">
              <AppIcon name="rotate-cw" size="1.375rem" />
            </button>
            <span class="map-controls__divider" aria-hidden="true" />
            <button type="button" class="map-controls__btn" aria-label="回到原本的視角" @click="scene?.resetView()">
              <AppIcon name="recenter" size="1.375rem" />
            </button>
          </div>
          <p v-else-if="status === 'unsupported' || status === 'error'" class="city__notice" role="status">
            <AppIcon name="info" />
            <span v-if="status === 'error'">城市模型沒有載入成功，請確認網路後重新整理。也可以直接點下面的類別。</span>
            <span v-else>這支手機不支援 3D 地圖，請直接點下面的類別。</span>
          </p>
        </div>

        <ul
          v-show="!guideWalking && (gridLabels || status === 'ready')"
          class="pins"
          :class="gridLabels ? 'pins--grid' : 'pins--overlay'"
          aria-label="城市裡的大樓"
        >
          <li v-for="pin in pins" :key="pin.id" class="pins__item">
            <button
              :ref="(el) => setPinEl(pin.id, el)"
              type="button"
              class="pin"
              :class="{
                'pin--selected': pin.id === selectedId,
                'pin--dimmed': selectedId && pin.id !== selectedId,
              }"
              :style="{ '--accent': pin.theme.accent, '--soft': pin.theme.soft, '--ink': pin.theme.ink, '--i': pin.index }"
              :aria-label="pin.label"
              :aria-expanded="pin.id === selectedId"
              aria-haspopup="dialog"
              @click="select(pin.id)"
            >
              <span class="pin__stem" aria-hidden="true" />
              <span class="pin__chip" aria-hidden="true">
                <span class="pin__dot" />
                <span class="pin__title">{{ pin.title }}</span>
                <span v-if="pin.complete" class="pin__progress pin__progress--done">
                  <AppIcon name="check" size="0.875rem" />
                </span>
                <span v-else-if="pin.progress.done" class="pin__progress">{{ pin.progress.done }}/{{ pin.progress.total }}</span>
                <span v-if="pin.recommended" class="pin__flag">推薦</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <BottomSheet
      ref="sheet"
      :open="guideOpen || (!guideWalking && Boolean(selectedCategory))"
      :labelledby="SHEET_TITLE_ID"
      @close="closeSheet"
      @height="onSheetHeight"
    >
      <CityGuideDialog v-if="guideOpen" :title-id="SHEET_TITLE_ID" @close="closeSheet" @guide="startGuide" />
      <CityGuideStation
        v-else-if="guideStation && selectedCategory"
        :index="guideStation.index"
        :full-route="guideStation.fullRoute"
        :step-id="guideStation.stepId"
        :title-id="SHEET_TITLE_ID"
        @close="closeSheet"
        @next="nextGuideStation"
        @open-step="openGuideStep"
      />
      <CategorySheet
        v-else-if="selectedCategory"
        :key="selectedCategory.id"
        :category="selectedCategory"
        :title-id="SHEET_TITLE_ID"
        @close="closeSheet"
      />
    </BottomSheet>
  </PageLayout>
</template>

<style scoped>
.guide-entry { align-self: flex-start; }
.guide-pin {
  position: absolute; left: 0; top: 0; z-index: 3; visibility: hidden;
  min-height: var(--tap); padding: 0.25rem 0.65rem; border: 2px solid white;
  border-radius: 1rem; background: var(--c-primary-700); color: white; font-weight: 700;
}
.guide-walking { position: absolute; top: 0.75rem; left: 0.75rem; z-index: 3; padding: 0.5rem; }
.city {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.city__header {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.32s var(--ease-out);
}

.city__header-content {
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.24s ease, transform 0.32s var(--ease-out);
}

.city__tools {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem var(--gutter) 0;
  background: var(--c-gray-50);
}

.city--walking .city__header {
  grid-template-rows: 0fr;
  pointer-events: none;
}

.city--walking .city__header-content {
  opacity: 0;
  transform: translateY(-1rem);
}

.city__head {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 1rem var(--gutter) 0.75rem;
}

.city__head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
}

/* TPTextStyles title（18・w600） */
.city__title {
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1.4;
}

.city__list-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap);
  font-weight: 600;
  color: var(--c-primary-700);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.875rem;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--fs-body);
  color: var(--c-gray-700);
}

.legend__dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 0.1875rem;
  background: var(--accent);
}

.city__map {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 26rem;
}

/* 天空：primary50 漸層到白，3D 畫布透明的部分（天際線後方）會透出來 */
.city__stage {
  position: relative;
  flex: 1;
  min-height: 22rem;
  overflow: hidden;
  background: linear-gradient(180deg, var(--c-primary-50) 0%, var(--c-white) 55%);
}

.city__stage--static {
  flex: none;
  min-height: 0;
}

.city--walking .city__map,
.city--walking .city__stage {
  min-height: 0;
}

/* 地圖上的觸控全部交給手勢（拖曳、捏合、旋轉），不讓瀏覽器拿去捲動或縮放整頁 */
.city__canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.city--walking .city__canvas {
  pointer-events: none;
}

.city__hint {
  font-size: var(--fs-caption);
  color: var(--c-gray-600);
}

/* 地圖下方置中的按鈕列；抽屜打開時被抽屜蓋住 */
.map-controls {
  position: absolute;
  left: 50%;
  bottom: 0.75rem;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 94%);
  box-shadow:
    0 4px 14px rgb(0 0 0 / 14%),
    0 0 0 1px rgb(0 0 0 / 5%);
  transform: translateX(-50%);
  transition: opacity 0.24s ease, transform 0.32s var(--ease-out);
}

.city--walking .map-controls {
  opacity: 0;
  transform: translate(-50%, calc(100% + 0.75rem));
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .city__header,
  .city__header-content,
  .map-controls {
    transition: none;
  }
}

.map-controls__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap);
  height: var(--tap);
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-primary-700);
}

.map-controls__btn:active {
  background: var(--c-primary-50);
}

.map-controls__divider {
  width: 1px;
  height: 1.5rem;
  margin: 0 0.125rem;
  background: var(--c-gray-100);
}

/* 兩朵慢慢飄的雲，只在天空露出來的地方看得到 */
.city__clouds::before,
.city__clouds::after {
  content: '';
  position: absolute;
  z-index: 0;
  width: 7rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--c-white);
  box-shadow:
    1.75rem -0.75rem 0 0.125rem var(--c-white),
    -1.5rem -0.375rem 0 -0.125rem var(--c-white);
}

.city__clouds::before {
  top: 2.75rem;
  left: 8%;
}

.city__clouds::after {
  top: 5.5rem;
  right: 6%;
  transform: scale(0.75);
}

@media (prefers-reduced-motion: no-preference) {
  .city__clouds::before {
    animation: cloud-drift 46s ease-in-out infinite alternate;
  }

  .city__clouds::after {
    animation: cloud-drift 58s ease-in-out -20s infinite alternate-reverse;
  }
}

@keyframes cloud-drift {
  to {
    translate: 3.5rem 0;
  }
}

.city__loading,
.city__notice {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--c-gray-700);
}

.city__loading {
  position: absolute;
  inset: 0;
  flex-direction: column;
  justify-content: center;
  font-weight: 600;
}

.city__loading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: var(--c-primary-100);
  color: var(--c-primary-700);
}

.city__loading-bar {
  width: 10rem;
  height: 0.375rem;
  border-radius: 999px;
  background: var(--c-gray-100);
  overflow: hidden;
}

.city__loading-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-primary-500);
  transition: width 0.2s ease;
}

.city__notice {
  align-items: flex-start;
  margin: 0;
  padding: 1rem var(--gutter);
}

.city__notice :deep(svg) {
  flex: none;
  margin-top: 0.2em;
}

/* ── 標籤 ───────────────────────── */

.pins {
  margin: 0;
}

.pin {
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
}

.pin__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0.375rem 0.75rem 0.375rem 0.625rem;
  border-radius: 999px;
  background: var(--c-white);
  box-shadow:
    inset 0 0 0 1.5px var(--accent),
    0 4px 12px rgb(0 0 0 / 12%);
  font-size: var(--fs-body);
  font-weight: 600;
  line-height: 1.3;
  color: var(--c-gray-900);
  transition:
    opacity 0.25s ease,
    background-color 0.25s ease,
    scale 0.25s var(--ease-soft);
}

.pin__dot {
  flex: none;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--accent);
}

.pin__progress {
  display: inline-flex;
  align-items: center;
  padding: 0 0.375rem;
  border-radius: 999px;
  background: var(--soft);
  font-size: var(--fs-caption);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.pin__progress--done {
  padding: 0.125rem;
  background: var(--accent);
  color: var(--c-white);
}

/* 依你的情況推薦：右上角的小標 */
.pin__flag {
  position: absolute;
  top: -0.625rem;
  right: -0.25rem;
  padding: 0 0.375rem;
  border-radius: 999px;
  background: var(--c-secondary-100);
  box-shadow: inset 0 0 0 1px var(--c-secondary-500);
  font-size: var(--fs-caption);
  line-height: 1.5;
  color: var(--c-secondary-800);
}

.pin--selected .pin__chip {
  background: var(--soft);
  box-shadow:
    inset 0 0 0 2.5px var(--accent),
    0 6px 18px rgb(0 0 0 / 18%);
  scale: 1.06;
}

/* 選了一棟之後，其他標籤先收起來，畫面只留主角；直接點其他大樓仍可切換，用鍵盤移到時會再出現 */
.pins--overlay .pin--dimmed .pin__chip,
.pins--overlay .pin--dimmed .pin__stem {
  opacity: 0;
  pointer-events: none;
}

.pins--overlay .pin[data-offscreen] .pin__chip,
.pins--overlay .pin[data-offscreen] .pin__stem {
  opacity: 0;
  pointer-events: none;
}

.pins--overlay .pin--dimmed:focus-visible .pin__chip,
.pins--overlay .pin--dimmed:focus-visible .pin__stem,
.pins--overlay .pin[data-offscreen]:focus-visible .pin__chip {
  opacity: 1;
}

.pins--grid .pin--dimmed .pin__chip {
  opacity: 0.6;
}

.pin:focus-visible {
  outline: none;
}

.pin:focus-visible .pin__chip {
  outline: 3px solid var(--c-secondary-500);
  outline-offset: 2px;
}

/* 浮在大樓屋頂上：按鈕本身縮成錨點，晶片往上偏移 --lift、左右偏移 --shift
 * 拉近時標籤可能移出地圖，超出的部分裁掉，不蓋到上方的標題與圖例 */
.pins--overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.pins--overlay .pin {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  padding: 0;
  will-change: transform;
}

.pins--overlay .pin--selected {
  z-index: 1;
}

.pins--overlay .pin__chip {
  position: absolute;
  left: 0;
  bottom: var(--lift, 8px);
  /* 浮在地圖上時縮小，少擋住後面大樓的招牌；可點範圍由 ::before 補回 44px */
  min-height: 2.25rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  transform: translateX(calc(-50% + var(--shift, 0px)));
  transform-origin: 50% 100%;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
}

.pins--overlay .pin__chip::before {
  content: '';
  position: absolute;
  inset: -0.25rem -0.125rem;
}

.pins--overlay .pin__stem {
  position: absolute;
  left: -1px;
  bottom: 0;
  width: 2px;
  height: var(--lift, 8px);
  border-radius: 1px;
  background: var(--accent);
}

@media (prefers-reduced-motion: no-preference) {
  .pins--overlay .pin__chip {
    animation: pin-in 0.45s var(--ease-out) backwards;
    animation-delay: calc(0.7s + var(--i, 0) * 0.05s);
  }
}

@keyframes pin-in {
  from {
    opacity: 0;
    scale: 0.6;
  }
}

/* 排在地圖下方：字放大、螢幕太窄、或不支援 3D 時 */
.pins--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.625rem;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0.75rem var(--gutter) calc(1rem + var(--safe-bottom));
}

.pins--grid .pin {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  text-align: left;
}

.pins--grid .pin__stem {
  display: none;
}

.pins--grid .pin__chip {
  position: relative;
  display: flex;
  width: 100%;
  border-radius: var(--radius);
}

.pins--grid .pin__title {
  flex: 1;
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import BottomSheet from '../components/BottomSheet.vue'
import CategorySheet from '../components/CategorySheet.vue'
import PageLayout from '../components/PageLayout.vue'
import { CITY_PLOTS, CITY_THEMES, themeOf } from '../city/config'
import { categoryProgress, findCategory, recommendedCategoryIds } from '../city/progress'
import { CityScene } from '../city/scene'
import { CATEGORIES } from '../data/lifeEvents'

const route = useRoute()
const router = useRouter()

const SHEET_TITLE_ID = 'city-sheet-title'
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const sheet = ref<InstanceType<typeof BottomSheet> | null>(null)
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
  if (!categoryId) {
    if (selectedId.value) closeSheet()
    return
  }
  if (categoryId === selectedId.value) {
    sheet.value?.focus()
    return
  }
  // 抽屜已開時換類別用 replace，返回鍵不必一棟一棟退
  const location = { query: { ...route.query, cat: categoryId } }
  if (selectedId.value) router.replace(location)
  else router.push(location)
}

function closeSheet(): void {
  const lastId = selectedId.value
  // 抽屜是在地圖上點開的就退回上一筆；從其他頁帶著類別跳進來的，就只把類別拿掉
  if (window.history.state?.back === '/city') router.back()
  else router.replace({ query: {} })
  if (lastId) nextTick(() => pinEls.get(lastId)?.focus({ preventScroll: true }))
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
}

function computePinBoxes(): PinBox[] {
  if (!scene || !stage.value) return []
  const width = stage.value.clientWidth
  const boxes: PinBox[] = []
  for (const pin of pins.value) {
    const position = scene.screenPosition(pin.id)
    const size = pinSizes.get(pin.id)
    if (!position || !size) continue
    // 標籤不超出畫面左右；錨點（細線）仍對準屋頂
    const half = size.w / 2
    const center = Math.min(Math.max(position.x, half + PIN_GAP), width - half - PIN_GAP)
    boxes.push({ id: pin.id, x: position.x, y: position.y, w: size.w, h: size.h, lift: PIN_LIFT, shift: center - position.x })
  }
  // 由上往下檢查：兩個標籤重疊時，把位置較高的那個再往上推
  // 選了一棟之後其他標籤是隱藏的，不參與避讓，否則會把選取的標籤推出畫面
  const visible = (selectedId.value ? boxes.filter((box) => box.id === selectedId.value) : boxes).sort(
    (a, b) => a.y - b.y,
  )
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
  if (gridLabels.value) return
  for (const box of computePinBoxes()) {
    const el = pinEls.get(box.id)
    if (!el) continue
    el.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`
    el.style.setProperty('--lift', `${box.lift}px`)
    el.style.setProperty('--shift', `${box.shift}px`)
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
  crowded.value = computePinBoxes().some((box) => box.y - box.lift - box.h < 0)
}

// 改成排在下方時，清掉浮動定位的 style
watch(gridLabels, async (grid) => {
  if (!grid) return
  await nextTick()
  for (const el of pinEls.values()) {
    el.style.removeProperty('transform')
    el.style.removeProperty('--lift')
    el.style.removeProperty('--shift')
  }
})
</script>

<template>
  <PageLayout title="城市地圖" fallback-back="/" flush hide-city-link>
    <div class="city">
      <header class="city__head">
        <div class="city__head-row">
          <h1 class="city__title">點一棟大樓，看看要辦的事</h1>
          <RouterLink to="/events" class="city__list-link">改用清單</RouterLink>
        </div>
        <ul class="legend" aria-label="大樓顏色代表的主題">
          <li v-for="theme in themes" :key="theme.key" class="legend__item" :style="{ '--accent': theme.accent }">
            <span class="legend__dot" aria-hidden="true" />
            {{ theme.title }}
          </li>
        </ul>
      </header>

      <div class="city__map">
        <div ref="stage" class="city__stage" :class="{ 'city__stage--static': status === 'unsupported' || status === 'error' }">
          <div class="city__clouds" aria-hidden="true" />
          <!-- 3D 畫面只是視覺；能操作的是下面的標籤按鈕 -->
          <canvas v-show="status !== 'unsupported' && status !== 'error'" ref="canvas" class="city__canvas" aria-hidden="true" />

          <div v-if="status === 'loading'" class="city__loading" role="status">
            <span class="city__loading-icon"><AppIcon name="city" size="2rem" /></span>
            <span>城市蓋起來中⋯ {{ loadPercent }}%</span>
            <span class="city__loading-bar" aria-hidden="true"><span :style="{ width: `${loadPercent}%` }" /></span>
          </div>
          <p v-else-if="status === 'unsupported' || status === 'error'" class="city__notice" role="status">
            <AppIcon name="info" />
            <span v-if="status === 'error'">城市模型沒有載入成功，請確認網路後重新整理。也可以直接點下面的類別。</span>
            <span v-else>這支手機不支援 3D 地圖，請直接點下面的類別。</span>
          </p>
        </div>

        <ul
          v-show="gridLabels || status === 'ready'"
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
      :open="Boolean(selectedCategory)"
      :labelledby="SHEET_TITLE_ID"
      @close="closeSheet"
      @height="onSheetHeight"
    >
      <CategorySheet
        v-if="selectedCategory"
        :key="selectedCategory.id"
        :category="selectedCategory"
        :title-id="SHEET_TITLE_ID"
        @close="closeSheet"
      />
    </BottomSheet>
  </PageLayout>
</template>

<style scoped>
.city {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
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

.city__canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
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

.pins--overlay .pin--dimmed:focus-visible .pin__chip,
.pins--overlay .pin--dimmed:focus-visible .pin__stem {
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
  transform: translateX(calc(-50% + var(--shift, 0px)));
  transform-origin: 50% 100%;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
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

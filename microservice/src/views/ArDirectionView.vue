<script setup lang="ts">
// 「去哪裡辦」的 AR 方向指引：打開後鏡頭，畫面上的箭頭指向要去的機關，並用文字與朗讀說出方向和距離。
// 箭頭是直線方向，不是路線規劃；要走的路線交給 OpenStreetMap。
// 地點座標來自臺北資料大平台（src/data/places.ts），相機畫面不錄影、不上傳。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ArViewport from '../components/ArViewport.vue'
import PageLayout from '../components/PageLayout.vue'
import { findEvent } from '../data/lifeEvents'
import {
  PLACE_SOURCES,
  PLACE_TYPE_LABEL,
  PLACES_FETCHED_AT,
  PLACES_LICENSE,
  PREFER_OWN_DISTRICT,
  byDistance,
  missingInDistrict,
  placeInDistrict,
  placesOf,
  type Place,
} from '../data/places'
import { CAMERA_ERROR_TEXT, closeCamera, openRearCamera, type CameraError } from '../services/camera'
import { requestOrientationPermission, watchHeading, type HeadingReading } from '../services/compass'
import { speakChunks, speaking, stopSpeaking, ttsSupported } from '../services/speech'
import {
  callPhone,
  getCurrentPosition,
  isInApp,
  openLink,
  openMapSearch,
  openWalkingDirections,
  type DevicePosition,
} from '../services/townpass'
import { taipeiDistrict } from '../stores/identity'
import { useDocumentTitle } from '../utils/documentTitle'
import {
  bearingDegrees,
  cardinal,
  distanceMeters,
  formatDistance,
  isInTaipei,
  normalize180,
  normalize360,
  relativeDirection,
  walkingMinutes,
  WALK_METERS_PER_MINUTE,
  type LatLng,
} from '../utils/geo'

const props = defineProps<{ eventId: string; stepId: string }>()
const router = useRouter()

// 路由的 beforeEnter 已確認事件、步驟存在，而且步驟有 placeType
const event = computed(() => findEvent(props.eventId)!)
const step = computed(() => event.value.steps!.find((s) => s.id === props.stepId)!)
const placeType = computed(() => step.value.where.placeType!)
const typeLabel = computed(() => PLACE_TYPE_LABEL[placeType.value])
const stepPath = computed(() => `/events/${props.eventId}/steps/${props.stepId}`)

useDocumentTitle(() => '用 AR 找方向')

/** 取不到位置時的示範起點：臺北市政府（市府路 1 號） */
const DEMO_ORIGIN: LatLng & { name: string } = { name: '臺北市政府', lat: 25.037529, lng: 121.563692 }

// ── 狀態 ──
const phase = ref<'intro' | 'running'>('intro')
const wantCamera = ref(true)
const stream = shallowRef<MediaStream | null>(null)
const cameraError = ref<CameraError | null>(null)

const compassStatus = ref<'off' | 'waiting' | 'ok' | 'denied' | 'unavailable'>('off')
const heading = ref<number | null>(null)
const headingAccuracy = ref<number | null>(null)
/** 電腦預覽沒有指南針，用滑桿模擬轉身 */
const manualHeading = ref(0)

const locationStatus = ref<'off' | 'waiting' | 'ok' | 'failed'>('off')
const position = ref<DevicePosition | null>(null)
const forceDemo = ref(false)

const selectedId = ref<string | null>(null)
const directionEl = ref<HTMLElement | null>(null)
const landscape = ref(false)

let alive = true
let stopHeading: (() => void) | null = null
let compassTimer = 0
let locateTimer = 0
let frame = 0
let pendingReading: HeadingReading | null = null

// ── 起點與目的地 ──
const demo = computed(() => forceDemo.value || locationStatus.value === 'failed')
const origin = computed<LatLng | null>(() => (demo.value ? DEMO_ORIGIN : position.value))
const outsideTaipei = computed(() => !demo.value && position.value !== null && !isInTaipei(position.value))

const candidates = computed(() => {
  const places = placesOf(placeType.value)
  return origin.value ? byDistance(places, origin.value) : places.map((place) => ({ place, distance: null }))
})
// 醫院和戶籍無關，不標「你的戶籍地」
const districtBound = computed(() => placeType.value !== 'hospital')
const ownPlace = computed(() => (districtBound.value ? placeInDistrict(placeType.value, taipeiDistrict.value) : undefined))
const ownMissing = computed(() => (districtBound.value ? missingInDistrict(placeType.value, taipeiDistrict.value) : undefined))
const nearest = computed(() => (origin.value ? candidates.value[0]?.place : undefined))

const target = computed<Place>(() => {
  const chosen = candidates.value.find(({ place }) => place.id === selectedId.value)?.place
  if (chosen) return chosen
  if (PREFER_OWN_DISTRICT[placeType.value] && ownPlace.value) return ownPlace.value
  return nearest.value ?? ownPlace.value ?? candidates.value[0]!.place
})

/** 目的地旁的小標：說明為什麼帶你去這裡 */
const targetReason = computed(() => {
  const reasons: string[] = []
  if (ownPlace.value?.id === target.value.id) reasons.push('你的戶籍地')
  if (nearest.value?.id === target.value.id) reasons.push(demo.value ? '離示範起點最近' : '離你最近')
  return reasons
})

const distance = computed(() => (origin.value ? distanceMeters(origin.value, target.value) : null))
const bearing = computed(() => (origin.value ? bearingDegrees(origin.value, target.value) : null))

/** 到達範圍：GPS 誤差大時放寬，最多 80 公尺 */
const arrived = computed(() => {
  if (demo.value || distance.value === null) return false
  const radius = Math.min(80, Math.max(30, position.value?.accuracy ?? 0))
  return distance.value <= radius
})

// ── 方向 ──
const effectiveHeading = computed(() => {
  if (compassStatus.value === 'ok') return heading.value
  if (!isInApp() && phase.value === 'running') return manualHeading.value
  return null
})
const relative = computed(() =>
  bearing.value === null || effectiveHeading.value === null ? null : normalize180(bearing.value - effectiveHeading.value),
)

// 對準與否加上緩衝區，避免在邊界時綠色一閃一閃
const aligned = ref(false)
watch(relative, (r) => {
  if (r === null || arrived.value) {
    aligned.value = false
    return
  }
  const abs = Math.abs(r)
  const next = aligned.value ? abs <= 20 : abs <= 12
  if (next && !aligned.value && 'vibrate' in navigator) navigator.vibrate(60)
  aligned.value = next
})

const directionWord = computed(() => {
  if (relative.value === null) return null
  if (aligned.value) return '正前方'
  const { word } = relativeDirection(relative.value)
  if (word !== '正前方') return word
  return relative.value > 0 ? '右前方' : '左前方'
})

const pointerLabel = computed(() => {
  if (arrived.value) return '已經到附近了'
  if (bearing.value === null) return '正在找你的位置'
  if (relative.value === null) return `在你的${cardinal(bearing.value)}方`
  if (aligned.value) return '就在前方'
  if (Math.abs(relative.value) >= 150) return '向後轉'
  return relative.value > 0 ? '往右轉' : '往左轉'
})

const distanceText = computed(() => (distance.value === null ? '計算距離中' : formatDistance(distance.value)))

/** 給讀屏與朗讀的完整句子 */
const directionSentence = computed(() => {
  const name = target.value.name
  if (distance.value === null || bearing.value === null) return `正在取得你的位置，稍後會說明${name}在哪個方向。`
  if (arrived.value) return `你已經在${name}附近了。請找大門或樓層指示牌。`
  const far = `直線距離${distanceText.value}`
  if (relative.value === null) return `${name}在你的${cardinal(bearing.value)}方，${far}。`
  if (aligned.value) return `${name}就在你的正前方，${far}。`
  const { clock } = relativeDirection(relative.value)
  return `${name}在你的${directionWord.value}，大約 ${clock} 點鐘方向，${far}。`
})

// 讀屏用：方向或距離（每 100 公尺）改變時才念，而且至少隔 3 秒，避免轉身時一直插話
const announcement = ref('')
let lastAnnounce = 0
let announceTimer = 0
const announceKey = computed(() => {
  if (phase.value !== 'running') return ''
  if (arrived.value) return 'arrived'
  return `${directionWord.value ?? (bearing.value === null ? '' : cardinal(bearing.value))}|${Math.round((distance.value ?? 0) / 100)}|${target.value.id}`
})
watch(announceKey, (key) => {
  window.clearTimeout(announceTimer)
  if (!key) return
  const wait = Math.max(0, lastAnnounce + 3000 - Date.now())
  announceTimer = window.setTimeout(() => {
    announcement.value = directionSentence.value
    lastAnnounce = Date.now()
  }, wait)
})

function speakDirection() {
  if (speaking.value) stopSpeaking()
  else speakChunks([{ key: 'direction', text: directionSentence.value }])
}

// ── 啟動與關閉 ──
function start(withCamera: boolean) {
  // iPhone 的方向感測器權限必須在點擊的當下要求，所以先送出，再做其他事
  const orientation = requestOrientationPermission()
  const camera = withCamera ? openRearCamera() : null
  wantCamera.value = withCamera
  phase.value = 'running'
  if (locationStatus.value === 'off') void locate(true)
  void orientation.then(startCompass)
  if (camera) void camera.then(attachCamera)
  // 按下的按鈕會消失，把讀屏焦點移到方向說明，VoiceOver 接著念出目前的方向
  void nextTick(() => directionEl.value?.focus())
}

function attachCamera(result: Awaited<ReturnType<typeof openRearCamera>>) {
  if ('error' in result) {
    cameraError.value = result.error
    wantCamera.value = false
    return
  }
  // 等待權限時使用者可能已經離開或關掉相機
  if (!alive || !wantCamera.value) {
    closeCamera(result.stream)
    return
  }
  cameraError.value = null
  // 連按兩次開啟時會拿到兩條串流，先關掉舊的
  closeCamera(stream.value)
  stream.value = result.stream
}

function stopCamera() {
  closeCamera(stream.value)
  stream.value = null
}

function toggleCamera() {
  if (wantCamera.value) {
    wantCamera.value = false
    stopCamera()
  } else {
    wantCamera.value = true
    void openRearCamera().then(attachCamera)
  }
}

function startCompass(permission: Awaited<ReturnType<typeof requestOrientationPermission>>) {
  if (!alive || stopHeading) return
  // 新版 Chrome 也有 requestPermission，回答「拒絕」時感測器事件卻可能照常送來，
  // 所以不論回答什麼都先聽著；3 秒內都沒收到數值，才依回答說明是被拒絕還是沒有指南針
  compassStatus.value = 'waiting'
  stopHeading = watchHeading((reading) => {
    pendingReading = reading
    // 感測器一秒送 60 次，畫面每一格只更新一次
    if (!frame) frame = window.requestAnimationFrame(flushHeading)
  })
  compassTimer = window.setTimeout(() => {
    if (compassStatus.value === 'waiting') compassStatus.value = permission === 'denied' ? 'denied' : 'unavailable'
  }, 3000)
}

function flushHeading() {
  frame = 0
  if (!pendingReading) return
  heading.value = pendingReading.heading
  headingAccuracy.value = pendingReading.accuracy
  compassStatus.value = 'ok'
}

async function locate(first = false) {
  // 切到背景時不定位，回來再繼續
  if (!first && document.hidden) {
    locateTimer = window.setTimeout(() => void locate(), 5000)
    return
  }
  if (first) locationStatus.value = 'waiting'
  const result = await getCurrentPosition(first ? 15000 : 8000)
  if (!alive) return
  if (result) {
    position.value = result
    locationStatus.value = 'ok'
  } else if (!position.value) {
    locationStatus.value = 'failed'
  }
  // 走路時位置會變，每 5 秒更新一次
  locateTimer = window.setTimeout(() => void locate(), 5000)
}

function useDemoOrigin() {
  forceDemo.value = true
}

function finish() {
  if (window.history.state?.back === stepPath.value) router.back()
  else router.replace(stepPath.value)
}

// 切到背景時關掉相機（省電，也避免相機燈一直亮著），回來後再打開
function onVisibility() {
  if (phase.value !== 'running') return
  if (document.hidden) stopCamera()
  else if (wantCamera.value && !stream.value) void openRearCamera().then(attachCamera)
}

const landscapeQuery = typeof window !== 'undefined' ? window.matchMedia('(orientation: landscape) and (pointer: coarse)') : null
const onLandscape = () => {
  landscape.value = Boolean(landscapeQuery?.matches)
}

onMounted(() => {
  onLandscape()
  landscapeQuery?.addEventListener('change', onLandscape)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  alive = false
  stopCamera()
  stopHeading?.()
  stopSpeaking()
  window.clearTimeout(compassTimer)
  window.clearTimeout(locateTimer)
  window.clearTimeout(announceTimer)
  window.cancelAnimationFrame(frame)
  landscapeQuery?.removeEventListener('change', onLandscape)
  document.removeEventListener('visibilitychange', onVisibility)
})

const rotation = computed(() => relative.value ?? bearing.value ?? 0)
const walkText = computed(() => (distance.value === null ? '' : `走路約 ${walkingMinutes(distance.value)} 分鐘`))
const poorAccuracy = computed(() => !demo.value && (position.value?.accuracy ?? 0) > 100)
const needsCalibration = computed(() => compassStatus.value === 'ok' && (headingAccuracy.value ?? 0) > 25)
const manualMode = computed(() => !isInApp() && phase.value === 'running' && compassStatus.value !== 'ok')
const manualLabel = computed(() => `${cardinal(manualHeading.value)}（${Math.round(normalize360(manualHeading.value))} 度）`)
const isHospital = computed(() => placeType.value === 'hospital')
</script>

<template>
  <PageLayout title="用 AR 找方向" :fallback-back="stepPath" hide-city-link>
    <div class="stack">
      <p class="eyebrow">{{ event.title }}・{{ step.title }}</p>
      <h1 class="page-title"><span class="mark">用 AR 找方向</span></h1>
      <p v-if="phase === 'intro'" class="lead">
        打開相機後，畫面上的箭頭會指向{{ typeLabel }}。慢慢轉身，箭頭變成綠色，就是正前方。
      </p>
    </div>

    <!-- ── 使用中：AR 畫面與方向文字 ── -->
    <template v-if="phase === 'running'">
      <section class="ar" aria-labelledby="direction-title">
        <ArViewport
          :stream="stream"
          :rotation="rotation"
          :heading="effectiveHeading"
          :aligned="aligned"
          :arrived="arrived"
          :label="pointerLabel"
          :target-name="target.name"
          :distance-text="distanceText"
          :landscape="landscape"
        />

        <div class="card direction">
          <h2 id="direction-title" class="visually-hidden">現在的方向</h2>
          <p ref="directionEl" class="direction__sentence" tabindex="-1">{{ directionSentence }}</p>
          <p v-if="walkText" class="muted">{{ walkText }}（以每分鐘 {{ WALK_METERS_PER_MINUTE }} 公尺、慢慢走估算）</p>
          <div class="actions">
            <button v-if="ttsSupported" type="button" class="btn btn--secondary" @click="speakDirection">
              <AppIcon :name="speaking ? 'stop' : 'speaker'" />
              {{ speaking ? '停止朗讀' : '念出方向' }}
            </button>
            <button v-if="origin" type="button" class="btn btn--secondary" @click="openWalkingDirections(origin, target)">
              <AppIcon name="map-pin" />
              看走路路線
            </button>
            <button type="button" class="btn btn--secondary" @click="toggleCamera">
              <AppIcon :name="wantCamera ? 'close' : 'camera'" />
              {{ wantCamera ? '關閉相機，只看箭頭' : '開啟相機' }}
            </button>
          </div>
        </div>
        <!-- 讀屏：方向改變時主動念出來 -->
        <p class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</p>
      </section>

      <ul class="notices">
        <li v-if="locationStatus === 'waiting'" class="notice-card">
          <AppIcon name="map-pin" />
          <span>正在取得你的位置。第一次使用時，請在手機跳出的詢問中允許定位。</span>
        </li>
        <li v-if="demo" class="notice-card notice-card--warn">
          <AppIcon name="info" />
          <span>
            <span class="badge badge--draft">示範位置</span>
            {{ forceDemo ? '' : '沒有取得你的位置，' }}先用{{ DEMO_ORIGIN.name }}當起點示範方向與距離。
          </span>
        </li>
        <li v-if="outsideTaipei" class="notice-card notice-card--warn">
          <AppIcon name="info" />
          <span class="notice-card__body">
            <span>你現在不在臺北市，距離會很遠。</span>
            <button type="button" class="btn btn--ghost btn--sm" @click="useDemoOrigin">改用示範位置（{{ DEMO_ORIGIN.name }}）</button>
          </span>
        </li>
        <li v-if="poorAccuracy" class="notice-card">
          <AppIcon name="info" />
          <span>定位誤差約 {{ Math.round(position?.accuracy ?? 0) }} 公尺，方向僅供參考。走到室外、離開高樓旁會比較準。</span>
        </li>
        <li v-if="needsCalibration" class="notice-card notice-card--warn">
          <AppIcon name="info" />
          <span>指南針不太準：請拿著手機在空中慢慢畫幾次 8 字形。</span>
        </li>
        <li v-if="compassStatus === 'denied'" class="notice-card notice-card--warn">
          <AppIcon name="info" />
          <span>沒有取得方向感測器的權限，改用東西南北說明。要重新允許，請關閉這一頁後再開一次。</span>
        </li>
        <li v-if="compassStatus === 'unavailable' && isInApp()" class="notice-card notice-card--warn">
          <AppIcon name="info" />
          <span>這台手機沒有偵測到指南針，改用東西南北說明。</span>
        </li>
        <li v-if="cameraError" class="notice-card notice-card--warn">
          <AppIcon name="camera" />
          <span>{{ CAMERA_ERROR_TEXT[cameraError] }}，改用箭頭顯示方向。要使用相機，可以到手機的「設定」開啟台北通的相機權限。</span>
        </li>
      </ul>

      <!-- 電腦預覽沒有指南針：用滑桿模擬手機面向，方便開發與展示 -->
      <div v-if="manualMode" class="card field">
        <label class="field__label" for="manual-heading">模擬手機面向（電腦預覽用）：{{ manualLabel }}</label>
        <input id="manual-heading" v-model.number="manualHeading" type="range" min="0" max="359" step="1" class="range" />
      </div>
    </template>

    <!-- ── 使用前：說明 ── -->
    <template v-else>
      <section class="card tab-card how" aria-labelledby="how-title">
        <h2 id="how-title" class="section-title">怎麼用</h2>
        <ol class="how__list">
          <li class="how__item">
            <span class="how__num" aria-hidden="true">1</span>
            <span>把手機直著拿在胸前，鏡頭朝向前方。</span>
          </li>
          <li class="how__item">
            <span class="how__num" aria-hidden="true">2</span>
            <span>慢慢轉身，直到箭頭變成綠色、寫著「就在前方」。</span>
          </li>
          <li class="how__item">
            <span class="how__num" aria-hidden="true">3</span>
            <span>箭頭指的是直線方向，不是走路路線。走路時請抬頭看路，過馬路依照號誌。</span>
          </li>
        </ol>
      </section>
    </template>

    <!-- ── 目的地（使用前、使用中都顯示） ── -->
    <section class="card tab-card target" aria-labelledby="target-title">
      <h2 id="target-title" class="section-title">要去的地方</h2>
      <div class="target__head">
        <p class="target__name">{{ target.name }}</p>
        <span v-for="reason in targetReason" :key="reason" class="badge badge--primary">{{ reason }}</span>
      </div>
      <p class="muted">{{ target.address }}</p>
      <p v-if="phase === 'intro' && !PREFER_OWN_DISTRICT[placeType]" class="muted">開始後會依你的位置，改成離你最近的{{ typeLabel }}。</p>
      <p v-if="isHospital" class="muted">各院區的科別不同，出發前請先打電話確認有你要看的科。</p>

      <div class="actions">
        <button v-if="target.phone" type="button" class="btn btn--secondary" @click="callPhone(target.phone)">
          <AppIcon name="phone" />
          撥打 {{ target.phone }}
        </button>
      </div>

      <div class="field">
        <label class="field__label" for="target-select">換一個地點</label>
        <select id="target-select" class="select" :value="target.id" @change="selectedId = ($event.target as HTMLSelectElement).value">
          <option v-for="{ place, distance: d } in candidates" :key="place.id" :value="place.id">
            {{ place.name }}{{ d === null ? '' : `（${formatDistance(d)}）` }}
          </option>
        </select>
      </div>

      <div v-if="ownMissing" class="notice-card notice-card--warn">
        <AppIcon name="info" />
        <span class="notice-card__body">
          <span>
            開放資料裡沒有{{ ownMissing.name }}的座標，所以先帶你去其他{{ typeLabel }}。{{
              ownMissing.address ? `${ownMissing.name}的地址是${ownMissing.address}。` : ''
            }}
          </span>
          <button type="button" class="btn btn--ghost btn--sm" @click="openMapSearch(ownMissing.address ?? `臺北市${ownMissing.name}`)">
            <AppIcon name="map-pin" />
            在地圖上搜尋{{ ownMissing.name }}
          </button>
        </span>
      </div>
    </section>

    <p class="notice muted">
      <AppIcon name="lock" />
      <span>相機畫面只在你的手機上顯示，不會錄影或上傳。位置只用來計算方向和距離，不會儲存。</span>
    </p>

    <section class="sources" aria-labelledby="sources-title">
      <h2 id="sources-title" class="sources__title">
        <AppIcon name="info" />
        資料來源：臺北資料大平台
      </h2>
      <ul class="sources__list">
        <li v-for="source in PLACE_SOURCES" :key="source.url">
          <button type="button" class="btn btn--ghost btn--sm sources__link" @click="openLink(source.url)">
            {{ source.title }}
            <AppIcon name="arrow-up-right" />
          </button>
        </li>
      </ul>
      <p class="muted">以機關所在建物的公廁登記座標代表機關位置。{{ PLACES_LICENSE }}，{{ PLACES_FETCHED_AT }} 擷取。</p>
    </section>

    <template #footer>
      <template v-if="phase === 'intro'">
        <button type="button" class="btn btn--primary btn--block" @click="start(true)">
          <AppIcon name="camera" />
          開啟相機找方向
        </button>
        <button type="button" class="btn btn--ghost btn--block btn--sm" @click="start(false)">不開相機，只看箭頭</button>
      </template>
      <button v-else type="button" class="btn btn--primary btn--block" @click="finish">結束，回到這一步</button>
    </template>
  </PageLayout>
</template>

<style scoped>
.ar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.direction {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.direction__sentence {
  outline: none;
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1.55;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.actions:empty {
  display: none;
}

.actions .btn {
  flex: 1 1 10rem;
}

.notices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notices:empty {
  display: none;
}

.notice-card {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  background: var(--c-primary-50);
  color: var(--c-gray-800);
  font-size: var(--fs-body);
}

.notice-card--warn {
  background: var(--c-secondary-50);
  border: 1px solid var(--c-secondary-200);
}

.notice-card > :deep(svg) {
  flex: none;
  margin-top: 0.2em;
}

.notice-card__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.notice-card__body .btn {
  padding-left: 0;
}

.range {
  width: 100%;
  min-height: var(--tap);
  accent-color: var(--c-primary-700);
}

.how {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.how__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.how__item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.how__num {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin-top: 0.1em;
  border-radius: 50%;
  background: var(--c-primary-100);
  color: var(--c-primary-800);
  font-size: var(--fs-body);
  font-weight: 600;
}

.target {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.target__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.5rem;
}

.target__name {
  font-size: var(--fs-title);
  font-weight: 600;
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

.sources {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sources__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--c-gray-700);
}

.sources__list {
  display: flex;
  flex-direction: column;
}

.sources__link {
  justify-content: flex-start;
  padding-left: 0;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>

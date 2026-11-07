<script setup lang="ts">
// 「去哪裡辦」的 AR 方向指引：打開後鏡頭，畫面上的箭頭指向要去的機關，並用文字與朗讀說出方向和距離。
// 箭頭是直線方向，不是路線規劃；要走的路線交給 OpenStreetMap。
// 地點座標來自臺北資料大平台（src/data/places.ts），相機畫面不錄影、不上傳。
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import ArViewport from '../components/ArViewport.vue'
import PageLayout from '../components/PageLayout.vue'
import { findEvent } from '../data/lifeEvents'
import {
  PLACE_TYPE_LABEL,
  PREFER_OWN_DISTRICT,
  byDistance,
  missingInDistrict,
  placeInDistrict,
  placesOf,
  type Place,
} from '../data/places'
import { CAMERA_ERROR_TEXT, closeCamera, openRearCamera, type CameraError, type CameraResult } from '../services/camera'
import { requestOrientationPermission, watchHeading, type HeadingReading } from '../services/compass'
import { stopSpeaking } from '../services/speech'
import {
  callPhone,
  getCurrentPosition,
  isInApp,
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
  if (!isInApp()) return manualHeading.value
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

// ── 啟動與關閉 ──
/**
 * 一進頁面就開始：步驟頁的「用 AR 找方向」在點擊當下已經要過方向感測器權限（iPhone 規定），
 * 這裡再問一次只會拿到剛才的結果；相機與定位不需要點擊就能要求。
 */
function start() {
  const orientation = requestOrientationPermission()
  const camera = openRearCamera(1)
  wantCamera.value = true
  if (locationStatus.value === 'off') void locate(true)
  void orientation.then(startCompass)
  void camera.then(attachCamera)
}

/** 相機剛關掉又打開、或被其他 App 占用時會暫時失敗，重開時多試兩次 */
function reopenCamera() {
  void openRearCamera(2).then(attachCamera)
}

function attachCamera(result: CameraResult) {
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
  // 連按兩次開啟時會拿到兩條串流，先換上新的再關掉舊的
  const previous = stream.value
  stream.value = result.stream
  closeCamera(previous)
  const opened = result.stream
  opened.getVideoTracks().forEach((track) => track.addEventListener('ended', () => onCameraEnded(opened)))
}

// 自己呼叫 stop() 不會觸發 ended；會觸發的是來電、其他 App 搶走相機或系統中斷。
// 這時畫面會停在最後一格，所以自動重開一次；10 秒內再斷就不重試，改用錶盤並說明
let lastAutoReopen = 0
function onCameraEnded(ended: MediaStream) {
  if (stream.value !== ended) return
  stream.value = null
  closeCamera(ended)
  if (!alive || !wantCamera.value || document.hidden) return
  if (Date.now() - lastAutoReopen < 10000) {
    wantCamera.value = false
    cameraError.value = 'failed'
    return
  }
  lastAutoReopen = Date.now()
  reopenCamera()
}

function stopCamera() {
  const current = stream.value
  stream.value = null
  closeCamera(current)
}

function toggleCamera() {
  if (wantCamera.value) {
    wantCamera.value = false
    stopCamera()
  } else {
    wantCamera.value = true
    reopenCamera()
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
  if (document.hidden) stopCamera()
  else if (wantCamera.value && !stream.value) reopenCamera()
}

const landscapeQuery = typeof window !== 'undefined' ? window.matchMedia('(orientation: landscape) and (pointer: coarse)') : null
const onLandscape = () => {
  landscape.value = Boolean(landscapeQuery?.matches)
}

onMounted(() => {
  start()
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
const manualMode = computed(() => !isInApp() && compassStatus.value !== 'ok')
const manualLabel = computed(() => `${cardinal(manualHeading.value)}（${Math.round(normalize360(manualHeading.value))} 度）`)
const isHospital = computed(() => placeType.value === 'hospital')
</script>

<template>
  <PageLayout title="用 AR 找方向" :fallback-back="stepPath" hide-city-link>
    <div class="stack">
      <p class="eyebrow">{{ event.title }}・{{ step.title }}</p>
      <h1 class="page-title"><span class="mark">用 AR 找方向</span></h1>
    </div>

    <!-- ── AR 畫面與方向文字 ── -->
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
          <p class="direction__sentence">{{ directionSentence }}</p>
          <p v-if="walkText" class="muted">{{ walkText }}（以每分鐘 {{ WALK_METERS_PER_MINUTE }} 公尺、慢慢走估算）</p>
          <p class="muted">箭頭指的是直線方向，不是走路路線。手機直著拿，走路時請抬頭看路，過馬路依照號誌。</p>
          <div class="actions">
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
    <!-- ── 目的地 ── -->
    <section class="card tab-card target" aria-labelledby="target-title">
      <h2 id="target-title" class="section-title">要去的地方</h2>
      <div class="target__head">
        <p class="target__name">{{ target.name }}</p>
        <span v-for="reason in targetReason" :key="reason" class="badge badge--primary">{{ reason }}</span>
      </div>
      <p class="muted">{{ target.address }}</p>
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
        </span>
      </div>
    </section>

    <p class="notice muted">
      <AppIcon name="lock" />
      <span>相機畫面只在你的手機上顯示，不會錄影或上傳。位置只用來計算方向和距離，不會儲存。</span>
    </p>

    <template #footer>
      <button type="button" class="btn btn--primary btn--block" @click="finish">結束，回到這一步</button>
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
</style>

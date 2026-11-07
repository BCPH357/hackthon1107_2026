<script setup lang="ts">
// AR 畫面：相機畫面上疊目的地標記與大箭頭；沒有相機時改成指南針錶盤。
// 畫面只是視覺輔助，所有資訊都另外用文字寫在下方並交給讀屏，所以這一層對讀屏隱藏。
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  stream: MediaStream | null
  /** 箭頭要轉幾度：知道手機面向時是相對角度（右正左負），不知道時是方位角（北方朝上） */
  rotation: number
  /** 手機面向的方位；不知道時為 null，錶盤固定北方朝上 */
  heading: number | null
  aligned: boolean
  arrived: boolean
  /** 箭頭下方的短句：「往右轉」「就在前方」 */
  label: string
  targetName: string
  distanceText: string
  /** 手機橫拿：iPhone 的指南針以直拿為準，橫拿時請使用者轉回來 */
  landscape: boolean
}>()

/** 後鏡頭直拿時，畫面左右大約涵蓋 50 度；目的地落在這個範圍內才在畫面上畫標記 */
const CAMERA_FOV = 50

const video = ref<HTMLVideoElement | null>(null)
const needsTap = ref(false)

async function play() {
  const el = video.value
  if (!el) return
  try {
    await el.play()
    needsTap.value = false
  } catch {
    // App 的 WebView 設定為播放需要使用者手勢時會被擋，改請使用者點一下
    needsTap.value = true
  }
}

watch(
  [video, () => props.stream],
  ([el, stream]) => {
    if (!el) return
    if (el.srcObject !== stream) el.srcObject = stream
    if (stream) void play()
    else needsTap.value = false
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (video.value) video.value.srcObject = null
})

const pinLeft = computed(() => {
  if (!props.stream || props.heading === null || props.arrived) return null
  if (Math.abs(props.rotation) > CAMERA_FOV / 2) return null
  return 50 + (props.rotation / CAMERA_FOV) * 100
})

/** 標記靠近畫面邊緣時，名稱往內側挪，不要被切掉 */
const labelShift = computed(() => (pinLeft.value === null ? 0 : (50 - pinLeft.value) * 0.9))
</script>

<template>
  <div class="viewport" :class="{ 'viewport--camera': stream }">
    <div class="viewport__visual" aria-hidden="true">
      <video ref="video" class="viewport__video" autoplay muted playsinline disablepictureinpicture />
      <div v-if="stream" class="viewport__scrim" />

      <!-- 沒有相機：指南針錶盤，北方標記跟著真實的北方轉 -->
      <div v-else class="dial" :style="{ '--ring': `${heading === null ? 0 : -heading}deg` }">
        <div class="dial__ring">
          <span class="dial__north">北</span>
        </div>
      </div>

      <p class="viewport__distance">
        <span class="chip">{{ distanceText }}</span>
      </p>

      <div v-if="pinLeft !== null" class="pin" :class="{ 'pin--aligned': aligned }" :style="{ left: `${pinLeft}%` }">
        <span class="pin__label" :style="{ transform: `translateX(${labelShift}%)` }">{{ targetName }}</span>
        <span class="pin__stem" />
        <span class="pin__dot" />
      </div>

      <div class="pointer" :class="{ 'pointer--center': !stream }">
        <span class="pointer__disc" :class="{ 'pointer__disc--aligned': aligned, 'pointer__disc--arrived': arrived }">
          <svg v-if="!arrived" class="pointer__arrow" viewBox="0 0 48 48" :style="{ transform: `rotate(${rotation}deg)` }">
            <path d="M24 4 40 40 24 31 8 40Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          </svg>
          <svg v-else class="pointer__arrow" viewBox="0 0 48 48">
            <path d="M12 25l8 8 16-17" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="chip chip--strong">{{ label }}</span>
      </div>

      <div v-if="landscape" class="viewport__rotate">
        <p>請把手機直著拿</p>
        <p class="viewport__rotate-hint">直拿時方向最準</p>
      </div>
    </div>

    <button v-if="needsTap && stream" type="button" class="viewport__tap btn btn--primary" @click="play">
      點這裡顯示相機畫面
    </button>
  </div>
</template>

<style scoped>
/*
 * 畫面與箭頭圓盤依螢幕大小決定，不跟著字級放大：字放到 200% 時，
 * 文字照樣變大，但畫面不會大到超出螢幕、圓盤不會蓋住目的地標記。
 */
.viewport {
  --ar-green: #1e7d4f;
  --disc: min(28vw, 112px);
  position: relative;
  height: clamp(280px, 56vh, 560px);
  border-radius: var(--radius);
  overflow: hidden;
  isolation: isolate;
  background: radial-gradient(circle at 50% 42%, #2f6470 0%, #1a3a41 60%, #11272c 100%);
  color: var(--c-white);
}

.viewport__visual {
  position: absolute;
  inset: 0;
}

.viewport__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 沒有畫面時不要露出黑色的 video 框 */
.viewport:not(.viewport--camera) .viewport__video {
  display: none;
}

/* 上下壓暗，白字在任何背景上都看得清楚 */
.viewport__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgb(0 0 0 / 40%), transparent 28%, transparent 58%, rgb(0 0 0 / 50%));
}

.viewport__distance {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  display: flex;
  justify-content: center;
}

.chip {
  display: inline-block;
  max-width: 100%;
  padding: 0.25rem 0.875rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 62%);
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.chip--strong {
  background: rgb(0 0 0 / 72%);
}

/* ── 目的地標記：落在鏡頭範圍內時，浮在畫面上對應的位置 ── */
.pin {
  position: absolute;
  top: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  max-width: min(14rem, 75%);
  transform: translateX(-50%);
}

.pin__label {
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--c-white);
  color: var(--c-gray-900);
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  box-shadow: 0 4px 14px rgb(0 0 0 / 30%);
}

.pin--aligned .pin__label {
  background: var(--ar-green);
  color: var(--c-white);
}

.pin__stem {
  width: 3px;
  height: 2.5rem;
  background: var(--c-white);
}

.pin__dot {
  width: 1rem;
  height: 1rem;
  border: 3px solid var(--c-white);
  border-radius: 50%;
  background: var(--c-secondary-500);
}

/* ── 大箭頭 ── */
.pointer {
  position: absolute;
  left: 50%;
  bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: calc(100% - 1.5rem);
  transform: translateX(-50%);
}

/* 錶盤模式：圓盤中心對準錶盤中心 */
.pointer--center {
  top: 50%;
  bottom: auto;
  transform: translate(-50%, calc(var(--disc) / -2));
}

.pointer__disc {
  display: grid;
  place-items: center;
  width: var(--disc);
  height: var(--disc);
  border-radius: 50%;
  background: rgb(255 255 255 / 94%);
  color: var(--c-primary-700);
  box-shadow: 0 6px 20px rgb(0 0 0 / 35%);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.pointer__disc--aligned,
.pointer__disc--arrived {
  background: var(--ar-green);
  color: var(--c-white);
}

.pointer__arrow {
  width: 65%;
  height: 65%;
}

/* ── 錶盤 ── */
.dial {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.dial__ring {
  position: relative;
  width: min(260px, 78%);
  aspect-ratio: 1;
  max-width: 100%;
  border: 2px solid rgb(255 255 255 / 55%);
  border-radius: 50%;
  transform: rotate(var(--ring));
}

.dial__north {
  position: absolute;
  top: -0.85rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0 0.375rem;
  border-radius: var(--radius-sm);
  background: #c2332f;
  font-size: var(--fs-body);
  font-weight: 600;
  line-height: 1.6;
}

.viewport__rotate {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  background: rgb(17 39 44 / 88%);
  font-size: var(--fs-h2);
  font-weight: 600;
  text-align: center;
}

.viewport__rotate-hint {
  font-size: var(--fs-h3);
  font-weight: 400;
}

.viewport__tap {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>

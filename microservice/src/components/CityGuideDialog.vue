<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { GUIDE_QUESTION, NO_GUIDE_MATCH, ROUTE_CHOICE, guideChoices, type GuideChoice } from '../city/guide'
import { askCityGuide, cityGuideStatus, listenToCityGuide } from '../services/cityGuide'
import { stopSpeaking } from '../services/speech'
import AppIcon from './AppIcon.vue'

defineProps<{ titleId: string }>()
const emit = defineEmits<{ close: []; guide: [choice: GuideChoice] }>()
const suggestions = [GUIDE_QUESTION, '出院後輪椅去哪裡借？', '長照要怎麼申請？']
const input = ref('')
const lastQuestion = ref('')
const answer = ref<GuideChoice | null>(null)
const model = ref<string | null>(null)
const usedModel = ref<string | null>(null)
const busy = ref(false)
const listening = ref(false)
const voiceAvailable = ref(false)
const voiceMessage = ref('')
let questionRequest: AbortController | null = null
let voiceRequest: AbortController | null = null
let disposed = false

onMounted(async () => {
  const status = await cityGuideStatus()
  if (disposed) return
  model.value = status?.model ?? null
  voiceAvailable.value = status?.voice === true
})

onBeforeUnmount(() => {
  disposed = true
  questionRequest?.abort()
  voiceRequest?.abort()
  stopSpeaking()
})

async function ask(question: string, preset = false): Promise<void> {
  const text = question.trim().slice(0, 240)
  if (!text || busy.value || listening.value) return
  stopSpeaking()
  input.value = ''
  lastQuestion.value = text
  answer.value = null
  usedModel.value = null
  const { options, fallback } = guideChoices(text, preset)
  if (options.length === 0) {
    answer.value = fallback
    return
  }
  const controller = new AbortController()
  questionRequest = controller
  busy.value = true
  try {
    const reply = await askCityGuide(text, options.map((option) => option.label.slice(0, 100)), controller.signal)
    if (controller.signal.aborted || disposed) return
    const choice = reply?.choice
    const selected = typeof choice === 'number' && Number.isInteger(choice)
      ? choice === 0 ? NO_GUIDE_MATCH : options[choice - 1]
      : undefined
    if (selected && reply?.model && (!preset || selected === ROUTE_CHOICE)) {
      usedModel.value = reply.model
      model.value = reply.model
      answer.value = selected
    } else {
      answer.value = fallback
    }
  } finally {
    if (!disposed) busy.value = false
    questionRequest = null
  }
}

async function listen(): Promise<void> {
  if (listening.value) {
    voiceRequest?.abort()
    listening.value = false
    voiceMessage.value = ''
    return
  }
  stopSpeaking()
  const controller = new AbortController()
  voiceRequest = controller
  listening.value = true
  voiceMessage.value = '正在聽，請說出想問的事。'
  try {
    const result = await listenToCityGuide(controller.signal)
    if (controller.signal.aborted || disposed) return
    if (result?.text) {
      input.value = result.text.slice(0, 240)
      voiceMessage.value = '確認文字後，按送出。'
    } else if (result?.error === 'permission') {
      voiceMessage.value = '請在 iPhone 設定允許麥克風與語音辨識，或直接輸入。'
    } else if (result?.error === 'offline_unavailable') {
      voiceMessage.value = '這支手機目前無法離線辨識繁中，可打字或點建議問題。'
    } else {
      voiceMessage.value = '沒有聽清楚，可以再試一次或直接輸入。'
    }
  } finally {
    if (voiceRequest === controller) {
      listening.value = false
      voiceRequest = null
    }
  }
}
</script>

<template>
  <div class="guide-dialog">
    <header class="guide-dialog__head">
      <h2 :id="titleId" tabindex="-1" data-autofocus>問問城市嚮導</h2>
      <button type="button" class="btn btn--ghost" aria-label="關閉城市嚮導" @click="emit('close')">
        <AppIcon name="close" />
      </button>
    </header>
    <div v-if="lastQuestion" class="guide-dialog__answer card" aria-live="polite">
      <p class="guide-dialog__question">{{ lastQuestion }}</p>
      <p v-if="busy" role="status">嚮導想一想⋯</p>
      <template v-else-if="answer">
        <small>{{ usedModel ? `手機端 AI · ${usedModel}` : '預設說明' }}</small>
        <p>{{ answer.text }}</p>
        <div class="guide-dialog__actions">
          <button v-if="answer.label" class="btn btn--primary" type="button" @click="emit('guide', answer)">帶我去</button>
        </div>
      </template>
    </div>
    <div class="guide-dialog__suggestions" aria-label="建議問題">
      <button
        v-for="(question, index) in suggestions"
        :key="question"
        class="btn btn--ghost btn--block"
        type="button"
        :disabled="busy || listening"
        @click="ask(question, index === 0)"
      >{{ question }}</button>
    </div>
    <form class="guide-dialog__form" @submit.prevent="ask(input)">
      <input v-model="input" aria-label="輸入想問的事" placeholder="輸入想問的事" maxlength="240" :disabled="busy || listening" />
      <button
        v-if="voiceAvailable"
        type="button"
        class="btn btn--ghost"
        :disabled="busy"
        @click="listen"
      >{{ listening ? '停止收音' : '🎙 語音' }}</button>
      <button type="submit" class="btn btn--primary" :disabled="!input.trim() || busy || listening">送出</button>
    </form>
    <p v-if="voiceMessage" class="muted" role="status">{{ voiceMessage }}</p>
    <p class="muted guide-dialog__note">
      {{ model ? 'AI 在手機上運行。' : '可用建議問題查看預設說明。' }} 內容是示範資料，請以機關公告為準。
    </p>
  </div>
</template>

<style scoped>
.guide-dialog { display: grid; gap: 0.75rem; }
.guide-dialog__head, .guide-dialog__actions { display: flex; align-items: center; gap: 0.5rem; }
.guide-dialog__head { justify-content: space-between; }
.guide-dialog__head h2 { font-size: var(--fs-title); font-weight: 700; }
.guide-dialog__answer { display: grid; gap: 0.5rem; padding: 0.85rem; }
.guide-dialog__question { font-weight: 600; }
.guide-dialog__answer small { color: var(--c-gray-700); }
.guide-dialog__suggestions { display: grid; gap: 0.25rem; }
.guide-dialog__form { display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem; }
.guide-dialog__form input {
  flex: 1 1 9rem; min-width: 0; min-height: var(--tap); border: 1px solid var(--c-gray-400);
  border-radius: 0.5rem; padding: 0.5rem; font-size: max(16px, 1rem); background: white; color: #172d37;
}
.guide-dialog__note { font-size: var(--fs-body); }
</style>

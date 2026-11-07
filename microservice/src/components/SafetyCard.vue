<script setup lang="ts">
// 隱私事件（家暴求助）頁面最上方的安全卡：先確認安全，再看步驟。
// 「快速離開」用 replace 換掉目前這一頁回到首頁，返回鍵不會直接回到這裡；
// WebView 的瀏覽紀錄網頁清不掉，所以也提醒可以按右上角的關閉鍵離開整個服務。
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { callPhone } from '../services/townpass'
import { stopSpeaking } from '../services/speech'

const router = useRouter()

function quickExit() {
  stopSpeaking()
  void router.replace('/')
}
</script>

<template>
  <section class="safety" aria-labelledby="safety-title">
    <h2 id="safety-title" class="safety__title">先確認你現在安全</h2>
    <p>有立即的危險，請馬上打 110。想找人談、問可以怎麼做，打 113 保護專線，24 小時都有人接。</p>
    <div class="safety__actions">
      <button type="button" class="btn btn--primary" @click="callPhone('110')">
        <AppIcon name="phone" />
        撥打 110
      </button>
      <button type="button" class="btn btn--secondary" @click="callPhone('113')">
        <AppIcon name="phone" />
        撥打 113
      </button>
    </div>
    <button type="button" class="btn btn--ghost btn--block safety__exit" @click="quickExit">
      <AppIcon name="close" />
      快速離開
    </button>
    <p class="muted">
      這件事不會留在手機上：不會出現在「繼續上次的事」，打勾的進度關掉服務就清除，也不能交給家人。用完可以按右上角的關閉鍵離開。
    </p>
  </section>
</template>

<style scoped>
.safety {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem;
  border: 2px solid var(--c-orange-700);
  border-radius: var(--radius);
  background: var(--c-orange-50);
}

.safety__title {
  font-size: var(--fs-title);
  font-weight: 600;
  color: var(--c-gray-900);
}

.safety__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.safety__actions .btn {
  flex: 1 1 8rem;
}

.safety__exit {
  color: var(--c-orange-700);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import PageLayout from '../components/PageLayout.vue'
import { APP_NAME } from '../config'
import { findEvent } from '../data/lifeEvents'
import { hasIdentity } from '../stores/identity'
import { doneCount, lastEventId } from '../stores/progress'

const lastEvent = computed(() => (lastEventId.value ? findEvent(lastEventId.value) : undefined))
const lastDone = computed(() => (lastEvent.value ? doneCount(lastEvent.value.id, lastEvent.value.steps) : 0))

const HOW_IT_WORKS = [
  { title: '告訴我們你的情況', text: '幫自己或幫家人辦，台北通的資料會自動帶入' },
  { title: '選要辦的事', text: '依你的情況推薦，例如申請長照、懷孕到生產' },
  { title: '照步驟完成', text: '每一步告訴你要帶什麼、去哪裡辦、誰能幫忙' },
]
</script>

<template>
  <PageLayout :title="APP_NAME">
    <section class="hero">
      <p class="eyebrow">人生大事，一步一步來</p>
      <h1 class="hero__title">告訴我們你的情況，我們幫你把要辦的事排好</h1>
      <p class="lead">照顧家人、懷孕生產、親人過世，常常要跑好幾個機關。回答兩個問題，就能拿到一份照順序排好的清單。</p>
    </section>

    <RouterLink v-if="lastEvent" :to="`/events/${lastEvent.id}`" class="continue card">
      <span class="continue__text">
        <span class="muted">繼續上次的事</span>
        <span class="continue__title">{{ lastEvent.title }}</span>
        <span v-if="lastEvent.steps" class="muted">已完成 {{ lastDone }}/{{ lastEvent.steps.length }} 步</span>
      </span>
      <AppIcon name="chevron-right" size="1.5rem" />
    </RouterLink>

    <section class="stack" aria-labelledby="how-title">
      <h2 id="how-title" class="section-title">怎麼使用</h2>
      <ol class="how">
        <li v-for="(item, index) in HOW_IT_WORKS" :key="item.title" class="how__item">
          <span class="how__number" aria-hidden="true">{{ index + 1 }}</span>
          <span class="how__text">
            <strong class="how__title">{{ item.title }}</strong>
            <span class="muted">{{ item.text }}</span>
          </span>
        </li>
      </ol>
    </section>

    <p class="privacy muted">
      <AppIcon name="lock" />
      你填的資料只存在這支手機上，不會上傳。
    </p>

    <template #footer>
      <template v-if="hasIdentity">
        <RouterLink to="/events" class="btn btn--primary btn--block">選要辦的事</RouterLink>
        <RouterLink to="/identity/summary" class="btn btn--ghost btn--block">修改我的情況</RouterLink>
      </template>
      <RouterLink v-else to="/identity/who" class="btn btn--primary btn--block">開始</RouterLink>
    </template>
  </PageLayout>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.hero__title {
  font-size: var(--fs-h2);
  font-weight: 600;
  line-height: 1.4;
}

.continue {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
  text-decoration: none;
  border: 1.5px solid var(--c-primary-200);
}

.continue__text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.continue__title {
  font-size: var(--fs-title);
  font-weight: 600;
}

.how {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.how__item {
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
}

.how__number {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--c-primary-100);
  color: var(--c-primary-800);
  font-weight: 600;
}

.how__text {
  display: flex;
  flex-direction: column;
}

.how__title {
  font-weight: 600;
}

.privacy {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

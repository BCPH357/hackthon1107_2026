<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DisplayButton from '../components/DisplayButton.vue'
import PageLayout from '../components/PageLayout.vue'
import { APP_NAME } from '../config'
import { findEvent } from '../data/lifeEvents'
import { display } from '../stores/display'
import { familyCases } from '../stores/cases'
import { hasIdentity } from '../stores/identity'
import { doneCount, lastEventId } from '../stores/progress'

// 計畫書：先問「要怎麼用」再問「你是誰」，看不清楚的人才填得完後面的表單
const startPath = computed(() => (display.chosen ? '/identity/basic' : '/display?first=1'))

const lastEvent = computed(() => (lastEventId.value ? findEvent(lastEventId.value) : undefined))
const lastDone = computed(() => (lastEvent.value ? doneCount(lastEvent.value.id, lastEvent.value.steps) : 0))

const HOW_IT_WORKS = [
  { title: '告訴我們你的情況', text: '只要第一次填，台北通的資料會自動帶入' },
  { title: '選要辦的事', text: '依你的情況推薦，例如申請長照、懷孕到生產' },
  { title: '照步驟完成', text: '每一步告訴你要帶什麼、去哪裡辦、誰能幫忙' },
]
</script>

<template>
  <PageLayout :title="APP_NAME" hide-display-button>
    <!-- 仿範本開場：整塊色底、大標題，三張分頁卡依序浮起；色底用 primary100，和上方 primary500 標題列同色系 -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__top">
        <p class="hero__eyebrow">人生大事，一步一步來</p>
        <DisplayButton />
      </div>
      <!-- 以詞組為單位換行，避免「我們」被拆成兩行；字放大時詞組內仍可換行 -->
      <h1 id="hero-title" class="hero__title">
        <span class="phrase">告訴我們你的情況，</span><span class="phrase">我們幫你把</span><span class="phrase"><span class="mark hero__mark">要辦的事排好</span></span>
      </h1>
      <p class="hero__lead">照顧家人、懷孕生產、親人過世，常常要跑好幾個機關。回答兩個問題，就能拿到一份照順序排好的清單。</p>

      <h2 class="hero__how-title">怎麼使用</h2>
      <ol class="how">
        <li
          v-for="(item, index) in HOW_IT_WORKS"
          :key="item.title"
          class="how__item card tab-card rise"
          :style="{ '--i': index }"
        >
          <span class="numeral how__numeral" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <strong class="how__title">{{ item.title }}</strong>
          <span class="how__text">{{ item.text }}</span>
        </li>
      </ol>
    </section>

    <RouterLink v-if="lastEvent" :to="`/events/${lastEvent.id}`" class="continue card tab-card">
      <span class="continue__text">
        <span class="muted">繼續上次的事</span>
        <span class="continue__title">{{ lastEvent.title }}</span>
        <span v-if="lastEvent.steps" class="muted">已辦好 {{ lastDone }}/{{ lastEvent.steps.length }} 步</span>
      </span>
      <AppIcon name="chevron-right" size="1.5rem" />
    </RouterLink>

    <!-- 被幫的人（例如長輩）用這裡把資料用藍牙傳給旁邊的家人。
         「你的情況」已拿掉「幫家人辦」，接收端跟著拿掉，所以先不顯示；ShareView 與 /share 路由保留，要恢復時把 v-if 拿掉 -->
    <RouterLink v-if="false" to="/share" class="continue card">
      <span class="share__icon"><AppIcon name="bluetooth" size="1.5rem" /></span>
      <span class="continue__text">
        <span class="continue__title">家人要幫你辦事？</span>
        <span class="muted">用藍牙把你的年齡、戶籍傳給他</span>
      </span>
      <AppIcon name="chevron-right" size="1.5rem" />
    </RouterLink>

    <!-- 子女：接收長輩的交棒，之後在「家人交給我的事」看進度 -->
    <RouterLink v-if="familyCases.length" to="/family" class="continue card">
      <span class="share__icon"><AppIcon name="users" size="1.5rem" /></span>
      <span class="continue__text">
        <span class="continue__title">家人交給我的事</span>
        <span class="muted">共 {{ familyCases.length }} 件，點進去打勾</span>
      </span>
      <AppIcon name="chevron-right" size="1.5rem" />
    </RouterLink>
    <RouterLink to="/handover/receive" class="continue card">
      <span class="share__icon"><AppIcon name="bluetooth" size="1.5rem" /></span>
      <span class="continue__text">
        <span class="continue__title">接收家人交棒</span>
        <span class="muted">家人有做不到的步驟，可以用藍牙交給你辦</span>
      </span>
      <AppIcon name="chevron-right" size="1.5rem" />
    </RouterLink>

    <p class="privacy muted">
      <AppIcon name="lock" />
      你填的資料只存在這支手機上，不會上傳。
    </p>

    <template #footer>
      <!-- 「你的情況」只在第一次（還沒有資料）時填寫，之後直接選要辦的事 -->
      <RouterLink v-if="hasIdentity" to="/events" class="btn btn--primary btn--block">選要辦的事</RouterLink>
      <RouterLink v-else :to="startPath" class="btn btn--primary btn--block">開始</RouterLink>
    </template>
  </PageLayout>
</template>

<style scoped>
/* 滿版色塊：抵銷 page__main 的上方與左右內距 */
.hero {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: -1.25rem calc(-1 * var(--gutter)) 0;
  padding: 2rem var(--gutter) 2.25rem;
  background: var(--c-primary-100);
  color: var(--c-gray-900);
}

.hero__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: -0.75rem;
}

.hero__eyebrow {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--c-primary-700);
}

/* primary100 底上的螢光筆改用 primary300，淡黃與白色在淺藍底上都看不出來 */
.hero__mark {
  --mark-color: var(--c-primary-300);
}

/* TPTextStyles h1 SemiBold（36・w600） */
.hero__title {
  font-size: var(--fs-h1);
  font-weight: 600;
  line-height: 1.25;
}

.phrase {
  display: inline-block;
}

.hero__lead {
  color: var(--c-gray-800);
}

.hero__how-title {
  margin-top: 0.75rem;
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
  flex-direction: column;
  gap: 0.25rem;
  padding: 1.25rem 1.25rem 1.375rem;
}

.how__numeral {
  margin-bottom: 0.75rem;
}

.how__title {
  font-size: var(--fs-title);
  font-weight: 600;
  line-height: 1.4;
}

.how__text {
  font-size: var(--fs-body);
  color: var(--c-gray-600);
}

/* 字放大到 200% 時排不下：圖示自己一行，文字和箭頭換到下一行，文字不會被擠成一行兩個字 */
.continue {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
  text-decoration: none;
}

.continue__text {
  flex: 1 1 6rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.continue__title {
  font-size: var(--fs-title);
  font-weight: 600;
}

.share__icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--c-primary-100);
  color: var(--c-primary-700);
}

.privacy {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

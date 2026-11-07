import { nextTick } from 'vue'
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { APP_NAME } from './config'
import { findEvent, isSensitiveEvent } from './data/lifeEvents'
import { findLink } from './stores/cases'
import { lastEventId } from './stores/progress'
import DisplaySettingsView from './views/DisplaySettingsView.vue'
import EventView from './views/EventView.vue'
import EventsView from './views/EventsView.vue'
import FamilyCasesView from './views/FamilyCasesView.vue'
import FamilyCaseView from './views/FamilyCaseView.vue'
import HandoverReceiveView from './views/HandoverReceiveView.vue'
import HandoverView from './views/HandoverView.vue'
import HomeView from './views/HomeView.vue'
import IdentityBasicView from './views/IdentityBasicView.vue'
import IdentityHealthView from './views/IdentityHealthView.vue'
import IdentityLifeView from './views/IdentityLifeView.vue'
import IdentitySummaryView from './views/IdentitySummaryView.vue'
import ShareView from './views/ShareView.vue'
import StepView from './views/StepView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomeView, meta: { title: APP_NAME } },
  { path: '/display', component: DisplaySettingsView, meta: { title: '字級與對比' } },
  // 「這次是幫誰辦事？」已拿掉，舊連結直接進基本資料
  { path: '/identity/who', redirect: '/identity/basic' },
  { path: '/identity/basic', component: IdentityBasicView, meta: { title: '你的情況' } },
  { path: '/identity/health', component: IdentityHealthView, meta: { title: '你的情況' } },
  { path: '/identity/life', component: IdentityLifeView, meta: { title: '你的情況' } },
  { path: '/identity/summary', component: IdentitySummaryView, meta: { title: '你的情況' } },
  { path: '/share', component: ShareView, meta: { title: '傳給家人' } },
  // 交棒：長輩把一件事裡做不到的步驟交給子女，子女在「家人交給我的事」看進度、打勾
  { path: '/handover/receive', component: HandoverReceiveView, meta: { title: '接收家人交棒' } },
  { path: '/family', component: FamilyCasesView, meta: { title: '家人交給我的事' } },
  {
    path: '/family/:caseId',
    component: FamilyCaseView,
    props: true,
    beforeEnter: (to) => (findLink('family', String(to.params.caseId)) ? true : '/family'),
  },
  { path: '/events', component: EventsView, meta: { title: '要辦的事' } },
  // 城市地圖用到 Three.js（壓縮後約 150 KB），獨立打包：沒打開地圖的人不必下載
  { path: '/city', component: () => import('./views/CityView.vue'), meta: { title: '城市地圖' } },
  {
    path: '/events/:eventId',
    component: EventView,
    props: true,
    beforeEnter: (to) => (findEvent(String(to.params.eventId)) ? true : '/events'),
  },
  {
    path: '/events/:eventId/handover',
    component: HandoverView,
    props: true,
    meta: { title: '交棒給家人' },
    beforeEnter: (to) => {
      const event = findEvent(String(to.params.eventId))
      if (!event?.steps?.length) return '/events'
      // 隱私事件（家暴求助）不能交給家人：同住的家人可能就是加害人
      return event.sensitive ? `/events/${event.id}` : true
    },
  },
  {
    path: '/events/:eventId/steps/:stepId',
    component: StepView,
    props: true,
    beforeEnter: (to) => {
      const event = findEvent(String(to.params.eventId))
      if (!event) return '/events'
      return event.steps?.some((step) => step.id === to.params.stepId) ? true : `/events/${event.id}`
    },
  },
  {
    // AR 方向指引要開相機與感測器，只有用到的人才下載
    path: '/events/:eventId/steps/:stepId/ar',
    component: () => import('./views/ArDirectionView.vue'),
    props: true,
    meta: { title: '用 AR 找方向' },
    beforeEnter: (to) => {
      const event = findEvent(String(to.params.eventId))
      if (!event) return '/events'
      const step = event.steps?.find((s) => s.id === to.params.stepId)
      if (!step) return `/events/${event.id}`
      return step.where.placeType ? true : `/events/${event.id}/steps/${step.id}`
    },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// hash 模式不需要伺服器設定 fallback，放在 Flask、Firebase 或 ngrok 都能直接開；
// 換頁會更新 WebView 的瀏覽紀錄，城市通標題列的返回鍵就能回上一頁
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
})

let isFirstNavigation = true

router.beforeEach((to) => {
  const first = isFirstNavigation
  isFirstNavigation = false

  // 再次從台北通進入時，直接回到上次的事件（計畫書「序幕」）
  if (first && to.path === '/' && lastEventId.value && findEvent(lastEventId.value) && !isSensitiveEvent(lastEventId.value)) {
    return `/events/${lastEventId.value}`
  }
  return true
})

router.afterEach((to, from) => {
  if (to.meta.title) document.title = to.meta.title

  // 單頁式網站換頁時，讀屏的焦點會停在上一頁的按鈕上，視障者不知道已經換頁。
  // 把焦點移到新頁面的大標題，VoiceOver／TalkBack 就會念出新頁面。第一次載入不需要。
  if (from.matched.length === 0) return
  void nextTick(() => {
    const heading = document.querySelector<HTMLElement>('main h1')
    if (!heading) return
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  })
})

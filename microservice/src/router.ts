import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { APP_NAME } from './config'
import { findEvent } from './data/lifeEvents'
import { identity } from './stores/identity'
import { lastEventId } from './stores/progress'
import EventView from './views/EventView.vue'
import EventsView from './views/EventsView.vue'
import HomeView from './views/HomeView.vue'
import IdentityBasicView from './views/IdentityBasicView.vue'
import IdentityHealthView from './views/IdentityHealthView.vue'
import IdentityLifeView from './views/IdentityLifeView.vue'
import IdentitySummaryView from './views/IdentitySummaryView.vue'
import IdentityWhoView from './views/IdentityWhoView.vue'
import StepView from './views/StepView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 需要先選「幫誰辦」 */
    needsForWhom?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomeView, meta: { title: APP_NAME } },
  { path: '/identity/who', component: IdentityWhoView, meta: { title: '你的情況' } },
  { path: '/identity/basic', component: IdentityBasicView, meta: { title: '你的情況', needsForWhom: true } },
  { path: '/identity/health', component: IdentityHealthView, meta: { title: '你的情況', needsForWhom: true } },
  { path: '/identity/life', component: IdentityLifeView, meta: { title: '你的情況', needsForWhom: true } },
  { path: '/identity/summary', component: IdentitySummaryView, meta: { title: '你的情況', needsForWhom: true } },
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
    path: '/events/:eventId/steps/:stepId',
    component: StepView,
    props: true,
    beforeEnter: (to) => {
      const event = findEvent(String(to.params.eventId))
      if (!event) return '/events'
      return event.steps?.some((step) => step.id === to.params.stepId) ? true : `/events/${event.id}`
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
  if (first && to.path === '/' && lastEventId.value && findEvent(lastEventId.value)) {
    return `/events/${lastEventId.value}`
  }
  if (to.meta.needsForWhom && !identity.forWhom) return '/identity/who'
  return true
})

router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title
})

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import EventIcon from '../components/EventIcon.vue'
import EventRow from '../components/EventRow.vue'
import HelpCard from '../components/HelpCard.vue'
import PageLayout from '../components/PageLayout.vue'
import { CATEGORIES, FEATURED_EVENTS, categoryOf, recommendEvents } from '../data/lifeEvents'
import { TOWNPASS_SERVICES } from '../data/townpassServices'
import { openTownPassService } from '../services/townpass'
import { hasIdentity, identityTags, profiles } from '../stores/identity'

const recommended = computed(() => recommendEvents(profiles.value))
const hasRecommendation = computed(() => recommended.value.length > 0)
const shownEvents = computed(() => (hasRecommendation.value ? recommended.value : FEATURED_EVENTS))

const PREVIEW_TAG_COUNT = 5
const previewTags = computed(() => identityTags.value.slice(0, PREVIEW_TAG_COUNT))
const moreTagCount = computed(() => Math.max(0, identityTags.value.length - PREVIEW_TAG_COUNT))
</script>

<template>
  <PageLayout title="要辦的事" fallback-back="/">
    <h1 class="page-title">要辦<span class="mark">什麼事</span>？</h1>

    <RouterLink v-if="hasIdentity" to="/identity/summary" class="identity card card--tint">
      <span class="identity__text">
        <span class="muted">依照你填的情況推薦</span>
        <span class="tag-list">
          <span v-for="tag in previewTags" :key="tag" class="tag">{{ tag }}</span>
          <span v-if="moreTagCount" class="tag">還有 {{ moreTagCount }} 項</span>
        </span>
      </span>
      <span class="identity__edit"><AppIcon name="edit" />修改</span>
    </RouterLink>
    <section v-else class="card card--tint stack" aria-label="填寫情況">
      <p>先告訴我們你的情況，推薦會更準確。</p>
      <RouterLink to="/identity/who" class="btn btn--secondary btn--block">告訴我們你的情況</RouterLink>
    </section>

    <section class="stack" aria-labelledby="recommended-title">
      <h2 id="recommended-title" class="section-title">{{ hasRecommendation ? '為你推薦' : '常見的事' }}</h2>
      <ul class="list card tab-card">
        <li v-for="(event, index) in shownEvents" :key="event.id" class="rise" :style="{ '--i': index }">
          <EventRow :event="event" :sub="event.summary ?? categoryOf(event.id)?.title" with-icon />
        </li>
      </ul>
    </section>

    <section class="stack" aria-labelledby="all-title">
      <h2 id="all-title" class="section-title">全部類別</h2>
      <div class="categories card">
        <details v-for="category in CATEGORIES" :key="category.id" class="category">
          <summary class="category__summary">
            <EventIcon :name="category.icon" />
            <span class="category__title">{{ category.title }}</span>
            <span class="muted category__count">{{ category.events.length }} 件事</span>
            <AppIcon name="chevron-down" class="category__chevron" />
          </summary>
          <ul class="category__list">
            <li v-for="event in category.events" :key="event.id">
              <EventRow :event="event" />
            </li>
          </ul>
        </details>
      </div>
    </section>

    <HelpCard title="我的狀況不在這裡" text="可以撥打 1999 請專人協助，或到「有話要說」告訴我們你遇到的困難。">
      <button type="button" class="btn btn--ghost btn--block" @click="openTownPassService(TOWNPASS_SERVICES.reportIssue)">
        到「有話要說」留言
      </button>
    </HelpCard>
  </PageLayout>
</template>

<style scoped>
.identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
  text-decoration: none;
}

.identity__text {
  flex: 1 1 12rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.identity__edit {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: var(--tap);
  color: var(--c-primary-700);
  font-weight: 600;
}

.list {
  padding: 0.25rem 0;
}

.list > li + li,
.category__list > li + li {
  border-top: 1px solid var(--c-gray-100);
}

.categories {
  padding: 0;
  overflow: hidden;
}

.category + .category {
  border-top: 1px solid var(--c-gray-100);
}

.category__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  min-height: 3.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  list-style: none;
}

.category__summary::-webkit-details-marker {
  display: none;
}

.category__title {
  flex: 1 1 7rem;
  font-size: var(--fs-h3);
  font-weight: 600;
}

.category__count {
  white-space: nowrap;
}

.category__chevron {
  flex: none;
  color: var(--c-gray-500);
  transition: transform 0.2s ease;
}

.category[open] .category__chevron {
  transform: rotate(180deg);
}

.category[open] .category__summary {
  background: var(--c-primary-50);
}

/* 展開時底色變淡藍，圖示底改白色，跟 TownPass 服務頁的白色圓底一致 */
.category[open] .category__summary .event-icon {
  background: var(--c-white);
}

/* 類別底下的事件不重複放圖示，文字對齊類別名稱：圖示 2.75rem + 間距 0.75rem */
.category__list {
  border-top: 1px solid var(--c-gray-100);
  padding-left: 3.5rem;
}
</style>

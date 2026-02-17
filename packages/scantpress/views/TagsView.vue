<script setup lang="ts">
import { useRoute } from '@app/router/router'
import TagList from '@app/components/TagList.vue'
import allPages from 'virtual:pages.json'
import { computed, onMounted, ref } from 'vue'
import PageListEntry from '@app/components/PageListEntry.vue'
import LoadingView from './LoadingView.vue'
import { pageEntryCompare } from '@app/utils'

const loading = ref(true)

const route = useRoute(() => undefined)
const url = new URL(route.hash, 'https://a.com')
const currentTag = ref(decodeURIComponent(url.hash.slice(1)) || '')

const allTags = Array.from(new Set(allPages.flatMap((page) => page.tags || [])))
const displayingPages = computed(() => {
  if (loading.value) return []
  return allPages
    .filter((page) => !page.hidden)
    .filter((page) => page.tags?.includes(currentTag.value))
    .sort(pageEntryCompare)
})

onMounted(() => {
  loading.value = false
})
</script>

<template>
  <div v-if="loading"><LoadingView /></div>
  <div v-else class="-m-t-2">
    <TagList :stateful="true" :tags="allTags" v-model="currentTag" class="text-sm" />
    <div v-if="displayingPages.length" flex="~ col" m-t-8>
      <TransitionGroup name="page-list">
        <PageListEntry
          v-for="activity in displayingPages"
          :page-entry="activity"
          :key="activity.title" />
      </TransitionGroup>
    </div>
    <div v-else-if="currentTag" text-subtle m-t-8>没有找到相关标签的页面。</div>
    <div v-else text-subtle m-t-8>请选择一个标签以查看相关页面。</div>
  </div>
</template>

<style lang="css" scoped>
.page-list-move, /* 对移动中的元素应用的过渡 */
.page-list-enter-active,
.page-list-leave-active {
  transition: all 0.5s ease;
}

.page-list-enter-from,
.page-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 确保将离开的元素从布局流中删除
  以便能够正确地计算移动的动画。 */
.page-list-leave-active {
  position: absolute;
}
</style>

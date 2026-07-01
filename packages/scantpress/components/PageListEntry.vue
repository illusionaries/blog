<script setup lang="ts">
import type { PageData } from '@scantpress/shared'
import { dateString } from '@app/utils'

defineProps<{
  pageEntry: PageData
}>()
</script>

<template>
  <div class="news-list-entry" p-y-4>
    <a :href="pageEntry.contentUrl" text-inherit no-underline
      ><h3 m-0 v-html="pageEntry.title"></h3
    ></a>
    <div flex="~ items-center gap-1" m-t-1 text-subtle>
      <span>{{ dateString(pageEntry.time) }}</span>
      <span flex="~ gap-1" v-for="key in Object.keys(pageEntry.data)" :key="key">
        <span>·</span>
        <span v-if="pageEntry.data[key]">{{ pageEntry.data[key] }}</span>
      </span>
    </div>
    <div
      m-t-2
      m-b-0
      class="excerpt-wrapper"
      v-if="pageEntry.excerpt"
      v-html="pageEntry.excerpt"></div>
    <a :href="pageEntry.contentUrl" underline-offset-4 m-b-2 m-t-2 inline-block w-auto
      >阅读全文...</a
    >
  </div>
</template>

<style scoped>
.news-list-entry:first-of-type {
  border-top: none;
}

.news-list-entry:last-of-type {
  padding-bottom: 0;
}

.excerpt-wrapper > *:first-child {
  --at-apply: m-t-0;
}

.excerpt-wrapper > *:last-child {
  --at-apply: m-b-0;
}

.excerpt-wrapper > :deep(p) {
  --at-apply: m-y-2;
}
</style>

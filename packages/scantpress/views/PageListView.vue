<script setup lang="ts">
import PageListEntry from '@app/components/PageListEntry.vue'
import { useRoute } from '@app/router/router'
import { groupByYearMonth, pageEntryCompare } from '@app/utils'
import allPages from 'virtual:pages.json'
import { isIndexPage } from '@app/utils'
import { computed } from 'vue'

const route = useRoute(() => undefined)
const base = computed(() => {
  const path = route.path
  const pathname = new URL(path, 'http://localhost').pathname
  const urlSlugs = pathname.split('/').filter((slug) => slug)
  let base: string | null = null
  if (isIndexPage(urlSlugs)) base = urlSlugs[0]!
  return base
})

const pageGroups = computed(() => {
  const pages = allPages
    .filter((page) => !page.hidden)
    .filter((page) => page.category === base.value)
    .sort(pageEntryCompare)
  return groupByYearMonth(pages)
})

const prevGroupLength = computed(() => {
  const lengths = [0]
  pageGroups.value
    .map((group) => group.items.length)
    .forEach((len) => {
      lengths.push(lengths[lengths.length - 1]! + len)
    })
  return lengths
})
</script>

<template>
  <div p-t-6 :key="base || 'EMPTY_BASE'">
    <main flex="~ col gap-10">
      <div
        relative
        v-for="(pageGroup, groupIndex) in pageGroups"
        :key="pageGroup.year + '-' + pageGroup.month">
        <h2
          m-0
          text-stroke-1
          text-5xl
          font-bold
          text-stroke-gray-300
          dark:text-stroke-truegray-600
          dark:text-stroke-1.5
          m-b-2
          text-right
          absolute
          right-0
          class="-top-12"
          text-transparent
          select-none
          tracking-wide>
          {{ pageGroup.year }}<br />
          {{ pageGroup.month.toString().padStart(2, '0') }}
        </h2>
        <PageListEntry
          class="slide-in"
          v-for="(page, pageIndex) in pageGroup.items"
          :style="{
            // 1-based
            '--slide-in-stage': pageIndex + prevGroupLength[groupIndex]! + 1,
          }"
          :page-entry="page"
          :key="page.title" />
      </div>
    </main>
  </div>
</template>

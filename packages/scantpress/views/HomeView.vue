<script setup lang="ts">
import allPages from 'virtual:pages.json'
import PageListEntry from '@app/components/PageListEntry.vue'
import AutoDarkImage from '@app/components/AutoDarkImage.vue'
import GithubMark from '../assets/github-mark.svg?no-inline'
import GithubMarkWhite from '../assets/github-mark-white.svg?no-inline'
import { ChevronRightIcon, EnvelopeIcon } from '@heroicons/vue/24/solid'
import { useTitle } from '@vueuse/core'
import { useRoute } from '@app/router/router'
import { onMounted, useTemplateRef } from 'vue'
import FooterComponent from '@app/components/FooterComponent.vue'
import context from 'virtual:context'
import type { PageData } from '@scantpress/shared'
import { pageEntryCompare } from '@app/utils'

const categories: { title: string; route: string; pages: PageData[] }[] = []

Object.keys(context.config.categories).forEach((category) => {
  categories.push({
    title: context.config.categories[category]!,
    route: `/${category}/`,
    pages: allPages
      .filter((page) => !page.hidden)
      .filter((page) => page.category === category)
      .sort(pageEntryCompare),
  })
})

const previousLengths: number[] = [0]
categories.forEach((category, index) => {
  previousLengths[index + 1] =
    previousLengths[index]! + Math.min(categories[index]!.pages.length, 3)
})

const scrollViewRef = useTemplateRef('scrollViewRef')
const mobileScrollViewRef = useTemplateRef('mobileScrollViewRef')
const route = useRoute(() =>
  Math.max(scrollViewRef.value?.scrollTop ?? 0, mobileScrollViewRef.value?.scrollTop ?? 0),
)
useTitle(context.config.name)

onMounted(() => {
  scrollViewRef.value?.scrollTo({ top: route.scrollTop, behavior: 'instant' })
  mobileScrollViewRef.value?.scrollTo({ top: route.scrollTop, behavior: 'instant' })
})
</script>

<template>
  <main p-l-6 lg:p-l-12>
    <div
      w-full
      h-screen
      box-border
      class="h-100dvh!"
      sm:grid
      sm:grid-cols-2
      lg:grid-cols-3
      max-w-1680px
      m-x-auto
      gap-6
      lg:gap-12
      overflow-auto
      ref="mobileScrollViewRef">
      <div
        flex="~ items-center justify-center col"
        m-t-24
        box-border
        sm:m-t-0
        p-r-6
        sm:p-r-0
        class="slide-in">
        <h1 m-t-8 m-b-0 text-center style="view-transition-name: site-title">
          {{ context.config.name }}
        </h1>
        <div flex="~ items-center gap-6" m-t-8>
          <a
            v-if="context.config.social?.github"
            :href="`https://github.com/${context.config.social.github}`"
            h-7>
            <AutoDarkImage :src="GithubMark" :src-dark="GithubMarkWhite" h-full alt="Github 标识" />
          </a>
          <a
            v-if="context.config.social?.email"
            :href="`mailto:${context.config.social.email}`"
            h-7
            dark:text-white
            text-black>
            <EnvelopeIcon class="h-7" />
          </a>
        </div>
      </div>
      <div lg:col-span-2 overflow-auto p-y-12 p-r-6 lg:p-r-12 ref="scrollViewRef">
        <div m-t-8 v-for="(category, categoryIndex) in categories" :key="category.title">
          <div
            flex="~ items-center"
            class="slide-in"
            :style="`--slide-in-stage: ${previousLengths[categoryIndex]! + categoryIndex + 1}`">
            <h2 m-0 flex-grow-1>{{ category.title }}</h2>
            <a
              class="text-unset! hover:bg-gray/10 p-l-2 p-y-1 rounded-md"
              decoration-none
              flex="~ items-center"
              :href="category.route">
              <span>所有{{ category.title }}</span>
              <ChevronRightIcon class="h-5" />
            </a>
          </div>

          <div m-t-4>
            <PageListEntry
              v-for="(page, pageIndex) in category.pages.slice(0, 3)"
              class="slide-in"
              :style="`--slide-in-stage: ${pageIndex + previousLengths[categoryIndex]! + categoryIndex + 1 + 1}`"
              :key="page.title"
              :page-entry="page" />
          </div>
        </div>
        <FooterComponent m-t-12 />
      </div>
    </div>
  </main>
</template>

<style lang="css" scoped>
.slide-in {
  --slide-in-interval: 50ms;
  --slide-in-stage: 0;
  animation: slide-in 400ms;
  animation-fill-mode: both;
  animation-delay: calc(calc(var(--slide-in-stage) - 1) * var(--slide-in-interval));
}
</style>

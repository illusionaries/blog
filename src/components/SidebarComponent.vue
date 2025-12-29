<script setup lang="ts">
import { ref, watch, onMounted, type ComponentPublicInstance, inject } from 'vue'
import allPages from 'virtual:pages.json'
import { groupByYearMonth, pageEntryCompare } from '@/utils'
import ExpanderComponent from './ExpanderComponent.vue'
import { SiteConfiguration, RouteTitleRecord } from '@/site'
import type { PageData } from '@/data/pagedata'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { ClientOnly } from './ClientOnly'

const showSearch = inject<() => void>('showSearch')

const categories: {
  title: string
  route: string
  pageGroups: { year: number; month: number; items: PageData[] }[]
}[] = []

Object.keys(RouteTitleRecord).forEach((category) => {
  categories.push({
    title: SiteConfiguration.getRouteCategoryTitle(category)!,
    route: `/${category}/`,
    pageGroups: groupByYearMonth(
      allPages.filter((page) => page.category === category).sort(pageEntryCompare),
    ),
  })
})
const sidebarCollapsed = ref(true)
const toggleSidebar = (collapse?: boolean) => {
  if (collapse === undefined) {
    sidebarCollapsed.value = !sidebarCollapsed.value
  } else {
    sidebarCollapsed.value = collapse
  }
}

const props = defineProps<{
  currentTitle: string | null | undefined
}>()

const entryElements = ref<Record<string, Element | null>>({})
watch(
  () => props.currentTitle,
  (newTitle) => {
    if (newTitle && entryElements.value[newTitle]) {
      scrollIntoViewIfNeeded(entryElements.value[newTitle])
    }
  },
)

onMounted(() => {
  if (!props.currentTitle) return
  if (!entryElements.value) return
  if (!entryElements.value[props.currentTitle]) return
  scrollIntoViewIfNeeded(entryElements.value[props.currentTitle]!)
})

defineExpose({ toggleSidebar })

const elementRefToElement = (ele: Element | ComponentPublicInstance | null) => {
  if (ele === null) return null
  if ('$el' in ele) {
    return ele.$el
  }
  return ele
}

const scrollIntoViewIfNeeded = (ele: Element) => {
  const rect = ele.getBoundingClientRect()
  if (!('scrollIntoView' in ele) || !rect) return
  if (rect.top < 0 || rect.bottom > window.innerHeight) {
    ele.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const applePlatform = ref(false)

onMounted(() => {
  applePlatform.value = /Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent)
})
</script>

<template>
  <div lg:w-92 h-full>
    <div
      w-screen
      h-screen
      lg:w-92
      fixed
      h-full
      z-999
      duration-300
      @click="toggleSidebar(true)"
      pointer-events-none
      lg:pointer-events-unset
      class="h-100dvh! lg:backdrop-brightness-100!"
      :class="{ 'backdrop-brightness-40 pointer-events-unset': !sidebarCollapsed }">
      <div
        @click.stop
        h-full
        box-border
        p-t-12
        bg-gray-100
        dark:bg-dark-800
        lg:bg-transparent
        duration-300
        overflow-auto
        overscroll-contain
        class="w-80% max-w-400px lg:w-unset lg:max-w-unset -translate-x-100% lg:translate-x-0"
        grid="~ rows-[auto_1fr]"
        :class="{ 'translate-x-0! shadow-xl': !sidebarCollapsed }"
        lg:shadow-none>
        <div flex="~ items-center" p-x-6 md:p-x-12>
          <a
            flex="~ items-center gap-2"
            href="/"
            class="text-unset! decoration-none"
            text-xl
            font-semibold
            style="view-transition-name: site-title"
            >彩笔的部落阁</a
          >
          <div flex-1></div>
          <ClientOnly>
            <div
              @click="showSearch?.()"
              p-2
              rounded-md
              class="bg-gray-200/40 dark:bg-truegray-700/40"
              cursor-pointer
              flex
              items-center
              color-gray-500
              dark:color-truegray-400
              text-sm
              font-200>
              <MagnifyingGlassIcon class="w-4 color-gray-500 dark:color-truegray-400" />
              <span m-l-1>搜索</span>
              <div rounded-sm m-l-4>
                <kbd font-inherit>{{ applePlatform ? '⌘' : 'Ctrl' }}</kbd>
                <kbd m-l-1 font-inherit>K</kbd>
              </div>
            </div>
          </ClientOnly>
        </div>
        <div overflow-y-scroll p-x-6 md:p-x-12 p-y-4 class="scroll-masked">
          <ExpanderComponent
            m-t-4
            v-for="category in categories"
            :key="category.title"
            header-wrapper-class="sticky top-4">
            <template #header>
              <h3 m-0>
                <a
                  :href="category.route"
                  class="text-unset!"
                  decoration-none
                  @click="toggleSidebar(true)"
                  >{{ category.title }}</a
                >
              </h3>
            </template>
            <div flex="~ col" box-border>
              <div
                v-for="pageGroup in category.pageGroups"
                :key="pageGroup.year + '-' + pageGroup.month"
                flex="~ col gap-2"
                class="group border-truegray-200/40 dark:border-dark-100/60"
                border-t-1
                border-t-solid
                p-y-3>
                <span text-xs text-subtle>{{ pageGroup.year }} 年 {{ pageGroup.month }} 月</span>
                <a
                  v-for="page in pageGroup.items"
                  @click="toggleSidebar(true)"
                  :href="page.contentUrl"
                  text-wrap
                  :key="page.title"
                  :ref="(el) => (entryElements[page.title] = elementRefToElement(el))"
                  class="text-subtle! hover:text-gray-800! dark:hover:text-[#e5e5e5]! decoration-none"
                  :class="{
                    'text-gray-800! dark:text-[#e5e5e5]! font-medium': currentTitle === page.title,
                  }"
                  v-html="page.title"></a>
              </div>
            </div>
          </ExpanderComponent>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group:first-of-type {
  --at-apply: border-t-0;
}

a {
  transition: color 0.2s;
}

.scroll-masked {
  mask-image: linear-gradient(
    to bottom,
    transparent,
    #000000ff 3rem,
    #000000ff calc(100% - 3rem),
    transparent
  );
}
</style>

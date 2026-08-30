<script setup lang="ts">
import { ref, watch, onMounted, type ComponentPublicInstance, inject } from 'vue'
import allPages from 'virtual:pages.json'
import { getImmediateScrollableYParent, groupByYearMonth, pageEntryCompare } from '@app/utils'
import ExpanderComponent from './ExpanderComponent.vue'
import context from 'virtual:context'
import type { PageData } from 'scantpress'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import scrollIntoView from 'scroll-into-view-if-needed'
import { ClientOnly } from './ClientOnly'

const showSearch = inject<() => void>('showSearch')

const categories: {
  title: string
  route: string
  pageGroups: { year: number; month: number; items: PageData[] }[]
}[] = []

Object.keys(context.config.categories).forEach((category) => {
  categories.push({
    title: context.config.categories[category]!,
    route: `/${category}/`,
    pageGroups: groupByYearMonth(
      allPages
        .filter((page) => !page.hidden)
        .filter((page) => page.category === category)
        .sort(pageEntryCompare),
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
      scrollIntoView(entryElements.value[newTitle], {
        scrollMode: 'if-needed',
        block: 'center',
        behavior: 'smooth',
        boundary: getImmediateScrollableYParent(entryElements.value[newTitle]!),
      })
    }
  },
)

onMounted(() => {
  if (!props.currentTitle) return
  if (!entryElements.value) return
  if (!entryElements.value[props.currentTitle]) return
  scrollIntoView(entryElements.value[props.currentTitle]!, {
    scrollMode: 'if-needed',
    block: 'center',
    behavior: 'smooth',
    boundary: getImmediateScrollableYParent(entryElements.value[props.currentTitle]!),
  })
})

defineExpose({ toggleSidebar })

const elementRefToElement = (ele: Element | ComponentPublicInstance | null) => {
  if (ele === null) return null
  if ('$el' in ele) {
    return ele.$el
  }
  return ele
}

const applePlatform = ref(false)

onMounted(() => {
  applePlatform.value = /Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent)
})
</script>

<template>
  <div lg:w-74 text-sm>
    <div
      fixed
      top-0
      w-screen
      h-screen
      z-1
      duration-300
      @click="toggleSidebar(true)"
      pointer-events-none
      class="lg:backdrop-brightness-100!"
      :class="{ 'backdrop-brightness-40 pointer-events-unset': !sidebarCollapsed }"></div>
    <div
      fixed
      top-0
      z-2
      @click.stop
      lg:sticky
      box-border
      bg-gray-100
      dark:bg-dark-800
      lg:bg-transparent
      duration-300
      class="w-80% max-w-400px lg:w-unset lg:max-w-unset -translate-x-100% lg:translate-x-0"
      grid="~ rows-[auto_1fr]"
      :class="{ 'translate-x-0! shadow-xl': !sidebarCollapsed }"
      lg:shadow-none>
      <div h-100dvh flex="~ col" p-t-16 lg:p-t-12 box-border>
        <div flex="~ items-center" p-x-6 lg:p-l-12 lg:p-r-0>
          <a
            flex="~ items-center gap-2"
            href="/"
            class="text-unset! decoration-none"
            text-xl
            font-semibold
            style="view-transition-name: site-title"
            >{{ context.config.name }}</a
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
        <div
          p-x-6
          lg:p-l-12
          lg:p-r-0
          p-y-4
          flex-shrink-1
          overflow-y-auto
          overscroll-contain
          lg:overscroll-unset
          class="scroll-masked">
          <ExpanderComponent
            v-for="(category, index) in categories"
            :class="{ 'm-t-2': index !== 0 }"
            :key="category.title">
            <template #header>
              <h3>
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

<script setup lang="ts">
import { useRoute } from '@app/router/router'
import {
  defineAsyncComponent,
  inject,
  onMounted,
  onUnmounted,
  ref,
  useSSRContext,
  useTemplateRef,
  watchEffect,
  watch,
  shallowRef,
  type Component,
  onServerPrefetch,
} from 'vue'
import Giscus from '@giscus/vue'
import NotFoundView from '@app/views/NotFoundView.vue'
import { useTitle } from '@vueuse/core'
import type { MarkdownItHeader } from '@mdit-vue/plugin-headers'
import { dateString, isIndexPage as testIndexPage, throttleAndDebounce } from '@app/utils'
import PageListView from './PageListView.vue'
import SidebarComponent from '@app/components/SidebarComponent.vue'
import TopbarComponent from '@app/components/TopbarComponent.vue'
import LoadingView from './LoadingView.vue'
import type { SSRContext } from 'vue/server-renderer'
import FooterComponent from '@app/components/FooterComponent.vue'
import context from 'virtual:context'
import PageOutline from '@app/components/PageOutline.vue'
import TagsView from './TagsView.vue'
import { ClientOnly } from '@app/components/ClientOnly'
import { PageModulesInjectionKey, PageSplashesInjectionKey } from '@app/injection'
import allPages from 'virtual:pages.json'
import type { PageData } from '@scantpress/shared'
import ErrorLoadingView from './ErrorLoadingView.vue'
import SplashSection from '@app/components/SplashSection.vue'
import ProgressBar from '@app/components/ProgressBar.vue'

let ssrContext: SSRContext | undefined
if (import.meta.env.SSR) ssrContext = useSSRContext()

const pageModules = inject(PageModulesInjectionKey)!
const pageSplashes = inject(PageSplashesInjectionKey)!
const route = useRoute(() => document.scrollingElement?.scrollTop)
const PAGE_MODULE_COMMON_PREFIX = '.'

const pageData = ref<Partial<PageData> | undefined>(undefined)
const isIndex = ref<boolean | undefined>(undefined)
const Content = shallowRef<Component | undefined>(undefined)
const outline = shallowRef<Promise<MarkdownItHeader[]> | undefined>(undefined)
const splash = shallowRef<Promise<{ default: string }> | undefined>(undefined)

const resolvedOutline = shallowRef<MarkdownItHeader[] | undefined>(undefined)
watchEffect(async (onCleanup) => {
  resolvedOutline.value = undefined
  let aborted = false
  onCleanup(() => {
    aborted = true
  })
  const resolvedValue = await outline.value
  if (aborted) return
  resolvedOutline.value = resolvedValue
})

const progressBar = useTemplateRef('progressbar')

watchEffect(() => {
  const path = decodeURIComponent(route.path)
  const pathWithoutTrailingSplash = path.replace(/\/$/, '')
  const slugs = path.split('/').filter((slug) => slug)
  const page = (allPages as PageData[]).find((p) => p.contentUrl === path)
  if (!import.meta.env.SSR) {
    document.documentElement.lang = page?.lang ?? context.config.defaultLang
  } else {
    ssrContext!.lang = page?.lang ?? context.config.defaultLang
  }
  const category = context.config.categories[slugs[0]!]
  const currentSplash =
    pageSplashes[
      Object.keys(pageSplashes).find((key) =>
        key.startsWith(`${PAGE_MODULE_COMMON_PREFIX}${pathWithoutTrailingSplash}/splash.`),
      ) ?? ''
    ]
  splash.value = currentSplash?.()
  outline.value = undefined
  pageData.value = undefined
  isIndex.value = undefined
  Content.value = undefined

  if (slugs[0] === 'tags') {
    pageData.value = {
      title: '标签',
    }
    isIndex.value = true
    Content.value = TagsView
    return
  }
  if (testIndexPage(slugs)) {
    pageData.value = {
      title: category,
      time: (() => {
        const allPagesInCategory = allPages
          .filter((p) => p.category === slugs[0])
          .sort((a, b) => {
            return new Date(a.time).getTime() - new Date(b.time).getTime()
          })
        if (allPagesInCategory.length === 0) return ''
        else if (allPagesInCategory.length === 1) return dateString(allPagesInCategory[0]!.time)
        else
          return (
            dateString(allPagesInCategory[0]!.time) +
            ' – ' +
            dateString(allPagesInCategory[allPagesInCategory.length - 1]!.time)
          )
      })(),
      category,
    }
    isIndex.value = true
    Content.value = PageListView
    return
  }
  const module = (() => {
    if (page?.sourceUrl) return pageModules[PAGE_MODULE_COMMON_PREFIX + page.sourceUrl]!()
    const pageModuleCandidates = [
      `${PAGE_MODULE_COMMON_PREFIX}${pathWithoutTrailingSplash}.md`,
      `${PAGE_MODULE_COMMON_PREFIX}${pathWithoutTrailingSplash}/index.md`,
      `${PAGE_MODULE_COMMON_PREFIX}${pathWithoutTrailingSplash}.vue`,
      `${PAGE_MODULE_COMMON_PREFIX}${pathWithoutTrailingSplash}/index.vue`,
    ]
    for (const candidate of pageModuleCandidates) {
      if (candidate in pageModules) {
        return pageModules[candidate]!()
      }
    }
    return undefined
  })()
  if (module) {
    outline.value = module.then((x) => x.__headers ?? [])
    pageData.value = {
      ...page,
      time: dateString(page?.time),
    }
    Content.value = defineAsyncComponent({
      loader: async () => {
        progressBar.value?.start()
        const loaded = await module
        progressBar.value?.end()
        return loaded
      },
      loadingComponent: LoadingView,
      errorComponent: ErrorLoadingView,
    })
    return
  }
  Content.value = NotFoundView
  isIndex.value = true
})

const title = useTitle(() => pageData.value?.textTitle ?? pageData.value?.title, {
  titleTemplate: `%s | ${context.config.name}`,
})

if (ssrContext) {
  const ctx: SSRContext = ssrContext
  // this only retrieves the raw title without template formatting
  ctx.titlePrefix = title.value
  const meta: { [key: string]: string } = pageData.value?.meta ?? {}
  meta.description = (meta.description ?? pageData.value?.textExcerpt ?? '').trim()
  ctx.meta = meta
  ctx.time = pageData.value?.time ?? ''
  ctx.sourceUrl = pageData.value?.sourceUrl ?? ''
}
const showTitle = ref(false)
const documentWrapper = useTemplateRef('document-wrapper')
const sidebarRef = useTemplateRef('sidebar-ref')
const highlightedSlug = ref<string | undefined>(undefined)
let headerElements: Element[] = []

onMounted(() => {
  window.scrollTo({ top: route.scrollTop, behavior: 'instant' })
  document.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('scroll', handleScroll)
  document.documentElement.lang = context.config.defaultLang
})

const handleScroll = throttleAndDebounce(() => {
  const scrollTop = document.scrollingElement?.scrollTop
  if (scrollTop == undefined) return
  if (scrollTop > 60) {
    showTitle.value = true
  } else {
    showTitle.value = false
  }
  if (!resolvedOutline.value?.length) return
  if (!documentWrapper.value) return
  const elements = headerElements
    .map((x) => {
      return {
        slug: x.id,
        top: x.getBoundingClientRect().top,
      }
    })
    .filter((x) => x.top < 80)
    .sort((a, b) => b.top - a.top)
  highlightedSlug.value = elements[0]?.slug ?? ''
  // if scrolled to bottom, highlight the last item
  if (Math.abs(scrollTop + window.innerHeight - documentWrapper.value.clientHeight) < 1) {
    highlightedSlug.value = resolvedOutline.value?.slice(-1)[0]!.slug
  }
}, 100)

watch(
  () => route.hash,
  (hash) => {
    const anchor = document.getElementById(hash.substring(1))
    if (anchor) window.scrollTo({ top: anchor.offsetTop - 40, behavior: 'smooth' })
  },
)

const handleDynamicComponentMounted = () => {
  const hash = route.hash
  const anchor = document.getElementById(hash.substring(1))
  if (anchor) window.scrollTo({ top: anchor.offsetTop - 40, behavior: 'smooth' })
  else window.scrollTo({ top: route.scrollTop, behavior: 'instant' })
  if (!documentWrapper.value) return
  headerElements = [
    ...(documentWrapper.value.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? []),
  ].filter((x) => resolvedOutline.value?.some((y) => y.slug == x.id))
}

const isDev = import.meta.env.DEV

onServerPrefetch(async () => {
  if (outline.value) resolvedOutline.value = await outline.value
})
</script>

<template>
  <div lg:grid class="lg:grid-cols-[auto_1fr_auto]" overflow-auto>
    <ProgressBar ref="progressbar" />
    <SidebarComponent ref="sidebar-ref" :current-title="pageData?.title" />
    <div overflow-auto box-border ref="document-wrapper">
      <div>
        <TopbarComponent
          :toggleSidebarFn="sidebarRef?.toggleSidebar"
          :title="pageData?.title ?? pageData?.category ?? ''"
          :show-title="showTitle" />
        <div m-b-8 m-x-auto relative>
          <SplashSection :page-data="pageData" :splash="splash" />
        </div>
        <div class="max-w-840px m-x-auto box-border p-x-6 lg:p-x-12 content-wrapper">
          <Transition mode="out-in" name="fade-in">
            <component :is="Content" @vue:mounted="handleDynamicComponentMounted" />
          </Transition>
          <ClientOnly>
            <div m-t-12 v-if="!isIndex && !isDev" id="comments">
              <Giscus
                :key="route.path"
                repo="illusionaries/blog"
                repo-id="R_kgDOJ-yiVw"
                category="General"
                category-id="DIC_kwDOJ-yiV84CzLiO"
                mapping="pathname"
                strict="0"
                reactions-enabled="1"
                emit-metadata="0"
                loading="lazy"
                input-position="bottom"
                theme="https://illusion.blog/assets/giscus.css"
                lang="zh-CN" />
            </div>
          </ClientOnly>
          <FooterComponent p-y-12 />
        </div>
      </div>
    </div>
    <PageOutline hidden xl:block :page-outline="outline" :highlighted-slug="highlightedSlug" />
  </div>
</template>

<style scoped>
.content-wrapper:deep(.rendered-content > *),
.content-wrapper:deep(.slide-in) {
  --slide-in-interval: 50ms;
  --slide-in-stage: 0;
  animation: slide-in 400ms;
  animation-fill-mode: both;
  animation-delay: calc(calc(var(--slide-in-stage) - 1) * var(--slide-in-interval));
}

.content-wrapper:deep(.rendered-content > *:nth-child(1)) {
  --slide-in-stage: 1;
}
.content-wrapper:deep(.rendered-content > *:nth-child(2)) {
  --slide-in-stage: 2;
}
.content-wrapper:deep(.rendered-content > *:nth-child(3)) {
  --slide-in-stage: 3;
}
.content-wrapper:deep(.rendered-content > *:nth-child(4)) {
  --slide-in-stage: 4;
}
.content-wrapper:deep(.rendered-content > *:nth-child(5)) {
  --slide-in-stage: 5;
}
.content-wrapper:deep(.rendered-content > *:nth-child(6)) {
  --slide-in-stage: 6;
}
.content-wrapper:deep(.rendered-content > *:nth-child(7)) {
  --slide-in-stage: 7;
}
.content-wrapper:deep(.rendered-content > *:nth-child(8)) {
  --slide-in-stage: 8;
}
.content-wrapper:deep(.rendered-content > *:nth-child(9)) {
  --slide-in-stage: 9;
}
.content-wrapper:deep(.rendered-content > *:nth-child(10)) {
  --slide-in-stage: 10;
}
.content-wrapper:deep(.rendered-content > *:nth-child(11)) {
  --slide-in-stage: 11;
}
.content-wrapper:deep(.rendered-content > *:nth-child(12)) {
  --slide-in-stage: 12;
}
.content-wrapper:deep(.rendered-content > *:nth-child(13)) {
  --slide-in-stage: 13;
}
.content-wrapper:deep(.rendered-content > *:nth-child(14)) {
  --slide-in-stage: 14;
}
.content-wrapper:deep(.rendered-content > *:nth-child(15)) {
  --slide-in-stage: 15;
}
.content-wrapper:deep(.rendered-content > *:nth-child(16)) {
  --slide-in-stage: 16;
}
.content-wrapper:deep(.rendered-content > *:nth-child(17)) {
  --slide-in-stage: 17;
}
.content-wrapper:deep(.rendered-content > *:nth-child(18)) {
  --slide-in-stage: 18;
}
.content-wrapper:deep(.rendered-content > *:nth-child(19)) {
  --slide-in-stage: 19;
}
.content-wrapper:deep(.rendered-content > *:nth-child(20)) {
  --slide-in-stage: 20;
}
</style>

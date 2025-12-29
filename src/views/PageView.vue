<script setup lang="ts">
import { useRoute } from '@/router/router'
import {
  computed,
  defineAsyncComponent,
  inject,
  onMounted,
  onUnmounted,
  ref,
  useSSRContext,
  useTemplateRef,
  watchEffect,
  watch,
} from 'vue'
import Giscus from '@giscus/vue'
import NotFoundView from '@/views/NotFoundView.vue'
import { useTitle } from '@vueuse/core'
import type { MarkdownItHeader } from '@mdit-vue/plugin-headers'
import {
  dateString,
  isIndexPage as testIndexPage,
  throttleAndDebounce,
  usePromiseResult,
} from '@/utils'
import PageListView from './PageListView.vue'
import SidebarComponent from '@/components/SidebarComponent.vue'
import TopbarComponent from '@/components/TopbarComponent.vue'
import LoadingView from './LoadingView.vue'
import type { SSRContext } from 'vue/server-renderer'
import FooterComponent from '@/components/FooterComponent.vue'
import { SiteConfiguration } from '@/site'
import PageOutline from '@/components/PageOutline.vue'
import TagsView from './TagsView.vue'
import { ClientOnly } from '@/components/ClientOnly'
import { PageModulesInjectionKey, PageSplashesInjectionKey } from '@/injection'
import allPages from 'virtual:pages.json'
import type { PageData } from '@/data/pagedata'
import ErrorLoadingView from './ErrorLoadingView.vue'
import SplashSection from '@/components/SplashSection.vue'
import ProgressBar from '@/components/ProgressBar.vue'

let ssrContext: SSRContext | undefined
if (import.meta.env.SSR) ssrContext = useSSRContext()

const pageModules = inject(PageModulesInjectionKey)!
const pageSplashes = inject(PageSplashesInjectionKey)!
const route = useRoute(() => document.scrollingElement?.scrollTop)

type PageState = {
  data?: Partial<PageData>
  isIndex?: boolean
  Content: unknown
  outline?: import('vue').Ref<MarkdownItHeader[]> | undefined
  splash?: (() => Promise<{ default: string }>) | null | undefined
}

const progressBar = useTemplateRef('progressbar')

const page = computed<PageState>(() => {
  progressBar.value?.start()
  const prefix = '../content'
  const path = decodeURIComponent(route.path)
  const pathWithoutTrailingSplash = path.replace(/\/$/, '')
  const slugs = path.split('/').filter((slug) => slug)
  const page = (allPages as PageData[]).find((p) => p.contentUrl === path)
  if (!import.meta.env.SSR) {
    document.documentElement.lang = page?.lang ?? SiteConfiguration.defaultLang
  } else {
    ssrContext!.lang = page?.lang ?? SiteConfiguration.defaultLang
  }
  const category = SiteConfiguration.getRouteCategoryTitle(slugs[0]!)
  const splash =
    pageSplashes[
      Object.keys(pageSplashes).find((key) =>
        key.startsWith(`${prefix}${pathWithoutTrailingSplash}/splash.`),
      ) ?? ''
    ]
  if (slugs[0] === 'tags') {
    progressBar.value?.end()
    return {
      data: {
        title: '标签',
      } as Partial<PageData>,
      isIndex: true,
      Content: TagsView,
      splash,
    }
  }
  if (testIndexPage(slugs)) {
    progressBar.value?.end()
    return {
      data: {
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
      } as Partial<PageData>,
      isIndex: true,
      Content: PageListView,
      splash,
    }
  }
  const module = (() => {
    if (page?.sourceUrl) return pageModules[prefix + page.sourceUrl]!()
    const pageModuleCandidates = [
      `${prefix}${pathWithoutTrailingSplash}.md`,
      `${prefix}${pathWithoutTrailingSplash}/index.md`,
      `${prefix}${pathWithoutTrailingSplash}.vue`,
      `${prefix}${pathWithoutTrailingSplash}/index.vue`,
    ]
    for (const candidate of pageModuleCandidates) {
      if (candidate in pageModules) {
        return pageModules[candidate]!()
      }
    }
    return undefined
  })()
  if (module) {
    // eslint-disable-next-line vue/no-async-in-computed-properties
    module.then(() => {
      progressBar.value?.end()
    })
    const outline = usePromiseResult<MarkdownItHeader[]>(
      // eslint-disable-next-line vue/no-async-in-computed-properties
      module.then((x) => x.__headers ?? []),
      [],
    )
    return {
      data: {
        ...page,
        time: dateString(page?.time),
      },
      Content: defineAsyncComponent({
        loader: () => module,
        loadingComponent: LoadingView,
        errorComponent: ErrorLoadingView,
        delay: 0,
      }),
      outline,
      splash,
    }
  }
  return {
    data: (page as Partial<PageData>) ?? undefined,
    Content: NotFoundView,
    outline: ref<MarkdownItHeader[]>([]),
    isIndex: false,
    splash,
  }
})

const pageSplash = ref('')
watchEffect(async () => {
  const loader = page.value.splash
  if (!loader) {
    pageSplash.value = ''
    return
  }
  try {
    pageSplash.value = ''
    const mod = await loader()
    pageSplash.value = mod.default
  } catch (e) {
    pageSplash.value = ''
  }
})

const title = useTitle(() => page.value.data?.textTitle, {
  titleTemplate: `%s | ${SiteConfiguration.titleSuffix}`,
})

if (ssrContext) {
  const ctx: any = ssrContext
  // this only retrieves the raw title without template formatting
  ctx.titlePrefix = title.value
  const meta: { [key: string]: string } = page.value.data?.meta ?? {}
  meta.description = (meta.description ?? page.value.data?.excerpt ?? '').trim()
  ctx.meta = meta
  ctx.time = page.value.data?.time ?? ''
  ctx.author = (page.value.data?.data as any)?.author ?? ''
  ctx.sourceUrl = page.value.data?.sourceUrl ?? ''
}
const showTitle = ref(false)
const documentWrapper = useTemplateRef('document-wrapper')
const sidebarRef = useTemplateRef('sidebar-ref')
const highlightedSlug = ref('')
let headerElements: Element[] = []

onMounted(() => {
  window.scrollTo({ top: route.scrollTop, behavior: 'instant' })
  document.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('scroll', handleScroll)
  document.documentElement.lang = SiteConfiguration.defaultLang
})

const handleScroll = throttleAndDebounce(() => {
  const scrollTop = document.scrollingElement?.scrollTop
  if (scrollTop == undefined) return
  if (scrollTop > 60) {
    showTitle.value = true
  } else {
    showTitle.value = false
  }
  if (!page.value.outline?.value?.length) return
  if (!documentWrapper.value) return
  if (!validateHeaderElements()) {
    headerElements = [
      ...(documentWrapper.value.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? []),
    ].filter((x) => page.value.outline?.value?.some((y) => y.slug == x.id))
  }
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
    highlightedSlug.value = page.value.outline.value.slice(-1)[0]!.slug
  }
}, 100)

function validateHeaderElements() {
  if (headerElements.length !== page.value.outline?.value?.length) return false
  for (let i = 0; i < headerElements.length; i++) {
    if (headerElements[i]!.id !== page.value.outline?.value?.[i]!.slug) return false
  }
  return true
}

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
}

const isDev = import.meta.env.DEV
</script>

<template>
  <div lg:grid class="lg:grid-cols-[auto_1fr_auto]" overflow-auto>
    <ProgressBar ref="progressbar" />
    <SidebarComponent ref="sidebar-ref" :current-title="page.data?.title" />
    <div overflow-auto box-border ref="document-wrapper">
      <div>
        <TopbarComponent
          :toggleSidebarFn="sidebarRef?.toggleSidebar"
          :title="page.data?.title ?? page.data?.category ?? ''"
          :show-title="showTitle" />
        <div m-b-8 m-x-auto relative>
          <SplashSection :page-data="page.data" :splash="page.splash" />
        </div>
        <div class="max-w-840px m-x-auto box-border p-x-6 lg:p-x-12 content-wrapper">
          <Transition mode="out-in" name="fade-in">
            <component :is="page.Content" @vue:mounted="handleDynamicComponentMounted" />
          </Transition>
          <ClientOnly>
            <div m-t-12 v-if="!page.isIndex && !isDev" id="comments">
              <Giscus
                :key="route.path"
                repo="illusionaryd/blog"
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
    <PageOutline
      hidden
      xl:block
      :page-outline="page.outline?.value"
      :highlighted-slug="highlightedSlug" />
  </div>
</template>

<style scoped>
.content-wrapper:deep(main > *) {
  --slide-in-interval: 50ms;
  --slide-in-stage: 0;
  animation: slide-in 400ms;
  animation-fill-mode: both;
  animation-delay: calc(calc(var(--slide-in-stage) - 1) * var(--slide-in-interval));
}

@keyframes slide-in {
  from {
    opacity: 0;
    filter: blur(12px);
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

.content-wrapper:deep(main > *:nth-child(1)) {
  --slide-in-stage: 1;
}
.content-wrapper:deep(main > *:nth-child(2)) {
  --slide-in-stage: 2;
}
.content-wrapper:deep(main > *:nth-child(3)) {
  --slide-in-stage: 3;
}
.content-wrapper:deep(main > *:nth-child(4)) {
  --slide-in-stage: 4;
}
.content-wrapper:deep(main > *:nth-child(5)) {
  --slide-in-stage: 5;
}
.content-wrapper:deep(main > *:nth-child(6)) {
  --slide-in-stage: 6;
}
.content-wrapper:deep(main > *:nth-child(7)) {
  --slide-in-stage: 7;
}
.content-wrapper:deep(main > *:nth-child(8)) {
  --slide-in-stage: 8;
}
.content-wrapper:deep(main > *:nth-child(9)) {
  --slide-in-stage: 9;
}
.content-wrapper:deep(main > *:nth-child(10)) {
  --slide-in-stage: 10;
}
.content-wrapper:deep(main > *:nth-child(11)) {
  --slide-in-stage: 11;
}
.content-wrapper:deep(main > *:nth-child(12)) {
  --slide-in-stage: 12;
}
.content-wrapper:deep(main > *:nth-child(13)) {
  --slide-in-stage: 13;
}
.content-wrapper:deep(main > *:nth-child(14)) {
  --slide-in-stage: 14;
}
.content-wrapper:deep(main > *:nth-child(15)) {
  --slide-in-stage: 15;
}
.content-wrapper:deep(main > *:nth-child(16)) {
  --slide-in-stage: 16;
}
.content-wrapper:deep(main > *:nth-child(17)) {
  --slide-in-stage: 17;
}
.content-wrapper:deep(main > *:nth-child(18)) {
  --slide-in-stage: 18;
}
.content-wrapper:deep(main > *:nth-child(19)) {
  --slide-in-stage: 19;
}
.content-wrapper:deep(main > *:nth-child(20)) {
  --slide-in-stage: 20;
}
</style>

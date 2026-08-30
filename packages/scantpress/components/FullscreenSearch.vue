<script setup lang="ts">
import { ArrowUpIcon, ArrowDownIcon, ArrowTurnDownLeftIcon } from '@heroicons/vue/16/solid'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { refDebounced } from '@vueuse/core'
import scrollIntoView from 'scroll-into-view-if-needed'
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pagefind: any = null
let langObserver: MutationObserver | null = null
const RESULT_LIMIT = 5

const currentHighlightedIndex = ref(-1)

const isShowing = ref(false)
const isLoadingBundle = ref(false)
const isSearching = ref(false)

const searchQueryRaw = ref('')
const searchQueryDebounced = refDebounced(searchQueryRaw, 300)

const result = ref<
  {
    url: string
    locations: number[]
    raw_url: string
    excerpt: string
    meta: {
      title: string
    }
  }[]
>([])

const resultEntryElements = useTemplateRef('result-entry-elements')

const pagefindBundleLoadError = ref<string | null>(null)
const inputRef = useTemplateRef('input-ref')

const show = async () => {
  isShowing.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
  if (!pagefind) {
    if (isLoadingBundle.value) return
    isLoadingBundle.value = true
    try {
      if (import.meta.env.DEV) throw 'Pagefind is not available in dev mode.'
      const pagefindBundle = '/pagefind' + '/pagefind.js'
      pagefind = await import(/* @vite-ignore */ pagefindBundle)
      isLoadingBundle.value = false
      pagefindBundleLoadError.value = null
    } catch (e) {
      isLoadingBundle.value = false
      pagefindBundleLoadError.value = `Failed to load Pagefind: ${e}`
      return
    }
  }
}
const hide = () => (isShowing.value = false)
const toggle = () => (isShowing.value ? hide() : show())

watch(searchQueryDebounced, async (newQuery, oldQuery) => {
  if (newQuery === oldQuery) return
  if (!pagefind) return
  isSearching.value = true
  const fullResult = await pagefind.search(newQuery)
  const firstFive = await Promise.all(
    fullResult.results.slice(0, RESULT_LIMIT).map((x: any) => x.data()),
  )
  result.value = firstFive
  currentHighlightedIndex.value = 0
  isSearching.value = false
})

function onArrowKey(key: 'up' | 'down') {
  if (key === 'up') currentHighlightedIndex.value--
  else currentHighlightedIndex.value++
  currentHighlightedIndex.value += RESULT_LIMIT
  currentHighlightedIndex.value %= RESULT_LIMIT
  nextTick(() => {
    const el = resultEntryElements.value?.find((x) => x.classList.contains('selected-search-entry'))
    if (!el) return
    scrollIntoView(el, {
      behavior: 'smooth',
      block: 'nearest',
    })
  })
}

function onEnterKey() {
  if (currentHighlightedIndex.value < 0 || currentHighlightedIndex.value >= result.value.length)
    return
  resultEntryElements.value?.find((x) => x.classList.contains('selected-search-entry'))?.click()
  hide()
}

onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isShowing.value) {
      hide()
    }
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      toggle()
    }
    if (e.key === 'ArrowUp' && isShowing.value) {
      e.preventDefault()
      onArrowKey('up')
    }
    if (e.key === 'ArrowDown' && isShowing.value) {
      e.preventDefault()
      onArrowKey('down')
    }
    if (e.key === 'Enter' && isShowing.value) {
      onEnterKey()
    }
  })
  langObserver = new MutationObserver((mutations) => {
    if (!pagefind) return
    for (const m of mutations) {
      if (m.type !== 'attributes') continue
      if (m.oldValue === document.documentElement.lang) continue
      pagefind.destroy()
      break
    }
  })

  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
    attributeOldValue: true,
  })
})

onUnmounted(() => {
  langObserver?.disconnect()
})

defineExpose({ show, hide, toggle })
</script>

<template>
  <Transition>
    <div
      h-100dvh
      w-100dvw
      fixed
      top-0
      left-0
      sm:backdrop-blur-xl
      z-100
      overscroll-contain
      @click="hide"
      v-if="isShowing">
      <div
        @click.stop
        w-full
        h-full
        sm:w-150
        sm:h-auto
        flex="~ col"
        class="sm:max-h-[min(32.5rem,_calc(100%_-_10rem))] search-main"
        sm:m-t-20
        sm:m-x-auto
        bg-white
        dark:bg-truegray-800
        p-2
        box-border
        sm:rounded-xl
        sm:shadow-xl>
        <div flex>
          <div
            @click="inputRef?.focus()"
            flex
            flex-1
            gap-2
            p-2
            border="gray-200 dark:truegray-700 has-focus:primary"
            rounded-md
            border-solid>
            <MagnifyingGlassIcon class="w-6 color-gray-400 dark:color-truegray-500" />
            <input
              ref="input-ref"
              flex-1
              w-full
              box-border
              v-model="searchQueryRaw"
              placeholder="搜索..."
              class="dark:text-[#e5e5e5]"
              placeholder-gray-400
              placeholder-font-400
              dark:placeholder-truegray-500
              text-lg
              outline-none
              bg-transparent
              transition-colors
              border-none />
          </div>
          <XMarkIcon
            class="w-6 color-gray-400 dark:color-truegray-500 sm:hidden cursor-pointer m-l-2"
            @click="hide" />
        </div>

        <div v-if="result.length" m-t-2 overflow-y-auto overflow-x-hidden>
          <a
            ref="result-entry-elements"
            p-2
            rounded-md
            block
            transition-all
            duration-100
            v-for="(entry, index) in result"
            :class="[
              { 'bg-primary shadow-lg selected-search-entry': index === currentHighlightedIndex },
            ]"
            :key="entry.url"
            :href="entry.url"
            text-unset
            decoration-none
            @click="hide">
            <div>
              <div>
                <span
                  transition-colors
                  duration-100
                  text-primary
                  text-lg
                  flex-1
                  block
                  text-ellipsis
                  >{{ entry.meta.title }}</span
                >
              </div>

              <span
                text-sm
                transition-colors
                text-ellipsis
                duration-100
                text-gray-500
                dark:text-truegray-400
                v-html="entry.excerpt"></span>
              <span block text-xs color-gray-500 dark:color-truegray-400
                >包含 {{ entry.locations.length }} 个结果</span
              >
            </div>
          </a>
        </div>
        <div text-sm text-center text-subtle>
          <div v-if="isLoadingBundle" m-t-2>正在加载搜索...</div>
          <div v-if="pagefindBundleLoadError" text-red m-t-2>{{ pagefindBundleLoadError }}</div>
          <div v-if="!result.length && searchQueryDebounced && !isSearching" m-t-2>
            展示空荡结果
          </div>
          <div v-if="isSearching" m-t-2>正在更新结果...</div>
        </div>
        <div flex-1 sm:hidden></div>
        <div flex="~ items-center" m-t-2 text-xs text-subtle>
          <kbd block h-1em><ArrowUpIcon class="h-1em" /></kbd>/<kbd h-1em
            ><ArrowDownIcon class="h-1em"
          /></kbd>
          <span m-l-0.5>Navigate</span>
          <kbd h-1em m-l-3><ArrowTurnDownLeftIcon class="h-1em" /></kbd>
          <span m-l-0.5>Go</span>
          <div flex-1></div>
          <span>搜索结果可能不完整</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="css" scoped>
.v-enter-active,
.v-leave-active {
  transition:
    opacity 200ms,
    transform 200ms;
}

.v-enter-active .search-main,
.v-leave-active .search-main {
  transition: transform 200ms;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-enter-from .search-main,
.v-leave-to .search-main {
  transform: scale(0.95) rotateX(-10deg);
}

.selected-search-entry * {
  --at-apply: '!text-white !dark:text-black transition-colors';
}
</style>

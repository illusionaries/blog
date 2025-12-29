<script setup lang="ts">
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  initialCollapsed?: boolean
  extendToggleArea?: boolean
  headerWrapperClass?: string
}>()

const contentWrapperRef = ref<HTMLDivElement>()
const contentDesiredSizeWrapperRef = ref<HTMLDivElement>()

const content = ref(0)
const collapsed = ref(props.initialCollapsed ?? false)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  if (collapsed.value) {
    contentWrapperRef.value!.style.height = '0'
  } else {
    contentWrapperRef.value!.style.height = `${content.value}px`
  }
}

let observer: ResizeObserver

onMounted(() => {
  if (!contentWrapperRef.value || !contentDesiredSizeWrapperRef.value) return
  if (collapsed.value) contentWrapperRef.value!.style.height = '0'
  watch(content, (newSize) => {
    if (!collapsed.value) contentWrapperRef.value!.style.height = `${newSize}px`
  })

  content.value = contentDesiredSizeWrapperRef.value!.scrollHeight

  observer = new ResizeObserver(() => {
    content.value = contentDesiredSizeWrapperRef.value!.scrollHeight
  })
  observer.observe(contentDesiredSizeWrapperRef.value)
})

onUnmounted(() => {
  observer.disconnect()
})
</script>

<template>
  <div overflow-clip>
    <div
      flex="~ items-center"
      @click="extendToggleArea ? toggleCollapsed() : null"
      :class="[{ 'cursor-pointer': extendToggleArea }, headerWrapperClass ?? '']">
      <slot name="header"></slot>
      <button
        title="切换折叠状态"
        @click.stop="toggleCollapsed"
        rounded-unset
        transition-all
        duration-200
        border-unset
        bg-transparent
        cursor-pointer
        flex="~ items-center justify-center">
        <ChevronRightIcon
          :class="['h-5 w-5 transition-all duration-300', collapsed ? 'rotate-0' : 'rotate-90']"
          class="color-black dark:color-white" />
      </button>
    </div>

    <div
      ref="contentWrapperRef"
      transition-all
      duration-300
      :class="{ 'expander-collapsed': collapsed }">
      <div ref="contentDesiredSizeWrapperRef" box-border p-b-4>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

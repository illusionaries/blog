<script setup lang="ts">
import { HomeIcon, Bars3BottomLeftIcon } from '@heroicons/vue/24/outline'

defineProps<{
  toggleSidebarFn: ((collapse?: boolean) => void) | undefined
  title: string
  showTitle: boolean
}>()
</script>

<template>
  <div
    lg:hidden
    fixed
    top-0
    left-0
    right-0
    h-14
    flex="~ items-center"
    z-500
    :class="[
      showTitle
        ? 'from-white dark:from-[#121212] via-white/90 dark:via-[#121212]/90 via-40% dark:via-30% bg-gradient-to-b to-transparent  '
        : 'bg-transparent',
    ]">
    <div
      flex="~ items-center"
      w-full
      class="max-w-[calc(800px+3rem)]"
      m-x-auto
      p-x-6
      gap-6
      box-border
      z-501>
      <button
        title="打开侧边栏"
        cursor-pointer
        @click="toggleSidebarFn?.()"
        p-0
        border-none
        bg-transparent>
        <Bars3BottomLeftIcon class="w-6 h-6 text-black dark:text-[#e5e5e5]" />
      </button>
      <a href="/" title="返回主页">
        <HomeIcon class="w-6 h-6 text-black dark:text-[#e5e5e5]" />
      </a>
      <span
        block
        text-lg
        text-ellipsis
        overflow-hidden
        text-nowrap
        font-bold
        transition-all
        duration-200
        translate-y-2
        opacity-0
        v-html="title"
        :class="{ 'opacity-100 translate-y-0!': showTitle }"></span>
    </div>
  </div>
</template>

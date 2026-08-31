<script setup lang="ts">
import { ClientOnly } from './ClientOnly'
import CodetimeStatus from './CodetimeStatus.vue'
import SteamStatus from './SteamStatus.vue'

const year = new Date().getFullYear()

defineProps<{
  mode: 'home' | 'page'
}>()
</script>

<template>
  <div
    opacity-70
    text-sm
    text-gray-600
    dark:text-truegray-400
    flex="~ gap-2 justify-center"
    lg:flex="~ gap-1 col"
    lg:w-74
    lg:text-right
    px-6
    lg:px-0
    box-border>
    <a href="/me/" text-inherit>About Me</a>
    <a
      href="https://github.com/illusionaries"
      target="_blank"
      rel="noopener noreferrer"
      text-inherit
      >GitHub</a
    >
    <a href="/friends/" text-inherit>Friends</a>
    <a href="/site/" text-inherit>ScantPress</a>
  </div>
  <div
    opacity-70
    text-xs
    lg:text-left
    lg:relative
    h-full
    text-gray-600
    dark:text-truegray-400
    px-6
    lg:px-0
    :class="{ 'lg:ml-6': mode === 'page' }">
    <div
      flex="~ col items-center lg:items-start gap-4 lg:gap-2"
      lg:absolute
      lg:top-0
      lg:bottom-0
      lg:left-0
      lg:right-0
      lg:overflow-hidden
      text-center
      lg:text-left
      :class="{ 'lg:max-w-840px lg:mx-auto lg:px-12 box-border': mode === 'page' }">
      <div lg:flex-1 h-8 lg:h-auto lg:min-h-0 order-last lg:order-first text-left>
        <ClientOnly>
          <div h-full flex="~ gap-4">
            <SteamStatus steam-id="76561199023601031" />
            <CodetimeStatus />
          </div>
        </ClientOnly>
      </div>
      <div mt-2 lg:mt-0>
        <div>© 2023 – {{ year }}</div>
        <div>
          若非另行说明，文本内容以
          <a
            text-inherit
            href="https://creativecommons.org/licenses/by-nc/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            >CC BY-NC 4.0</a
          >
          协议授权，代码片段以
          <a
            text-inherit
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            >MIT</a
          >
          协议授权。
        </div>
        <div>图像资源可能有不同的来源。</div>
      </div>
    </div>
  </div>
</template>

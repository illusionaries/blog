<script setup lang="ts">
import MainComponent from './components/MainComponent.vue'
import context from 'virtual:context'
import NewYearBg from './components/NewYearBg.vue'
import FullscreenSearch from './components/FullscreenSearch.vue'
import { ClientOnly } from './components/ClientOnly'
import { onMounted, provide, ref, useTemplateRef } from 'vue'
import HydrationIncomplete from './components/HydrationIncomplete.vue'
// import { useDark } from '@vueuse/core'
// useDark()
const searchComp = useTemplateRef('search-comp-ref')
provide('showSearch', () => {
  searchComp.value?.show()
})

if (context.config.theme === 'new-year' && import.meta.env.SSR === false) {
  const styleElement = document.createElement('style')
  styleElement.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Noto+Serif+SC:wght@200..900&display=swap');`
  document.head.appendChild(styleElement)
}

const hydrationIncomplete = ref(true)

onMounted(() => {
  hydrationIncomplete.value = false
})
</script>

<template>
  <NewYearBg v-if="context.config.theme === 'new-year'" />
  <div v-else class="bg"></div>
  <MainComponent z-1 relative :class="{ 'new-year': context.config.theme === 'new-year' }" />
  <ClientOnly>
    <FullscreenSearch ref="search-comp-ref" />
  </ClientOnly>
  <Transition name="fade-in">
    <HydrationIncomplete v-if="hydrationIncomplete" />
  </Transition>
</template>

<style lang="css">
.bg {
  background-image: radial-gradient(circle at top left, rgb(255, 246, 218), #fff 30%);
  background-color: #fff;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
}

@media (prefers-color-scheme: dark) {
  .bg {
    background-image: radial-gradient(circle at top left, rgb(52, 39, 1), #121212 30%);
    background-color: #121212;
  }
}
</style>

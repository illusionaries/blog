<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  C,
  CPlusplus,
  Dotnet,
  Javascript,
  Python,
  Rust,
  TypescriptIcon,
  _Vue,
  Json,
  Yaml,
  Toml,
} from '@dev.icons/vue'

import VSCode from './codetime-assets/VSCode.vue'
import TypstIcon from './codetime-assets/TypstIcon.vue'

interface CodetimeStatus {
  language: string
  project: string
  editor: string
  platform: string
  gitBranch: string
  gitOrigin: string
}

const codetimeStatus = ref<CodetimeStatus>()

const EditorMap = {
  'Visual Studio Code': VSCode,
}

const languageMap = {
  typescript: TypescriptIcon,
  javascript: Javascript,
  vue: _Vue,
  csharp: Dotnet,
  cpp: CPlusplus,
  c: C,
  'cuda-cpp': CPlusplus,
  python: Python,
  rust: Rust,
  json: Json,
  yaml: Yaml,
  toml: Toml,
  typst: TypstIcon,
}

const languageIcon = computed(() => {
  if (!codetimeStatus.value) return null
  const language = codetimeStatus.value.language
  if (language in languageMap) {
    return languageMap[language as keyof typeof languageMap]
  }
  return null
})

const editorIcon = computed(() => {
  if (!codetimeStatus.value) return null
  const editor = codetimeStatus.value.editor
  if (editor in EditorMap) {
    return EditorMap[editor as keyof typeof EditorMap]
  }
  return null
})

const update = async () => {
  const baseUrl = import.meta.env.DEV ? 'http://localhost:8787' : 'https://status.illusion.blog'
  codetimeStatus.value = await fetch(`${baseUrl}/codetime`).then((res) => res.json())
}

let interval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await update()
  interval = setInterval(update, 6000 * 3)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

<template>
  <div v-if="codetimeStatus" flex="~ gap-2 items-center" h-full text-blue-600 dark:text-blue-400>
    <div relative h-full>
      <component :is="editorIcon" class="min-h-0 h-full block object-cover w-auto" />
      <component :is="languageIcon" class="absolute right--2px bottom--2px outlined h-1em w-auto" />
    </div>
    <div>
      <span>正在捣鼓 </span>
      <a
        v-if="codetimeStatus.gitOrigin.length"
        :href="codetimeStatus.gitOrigin"
        color-inherit
        target="_blank"
        rel="noopener noreferrer">
        {{ codetimeStatus.project }}
        <span v-if="codetimeStatus.gitBranch"> ({{ codetimeStatus.gitBranch }})</span>
      </a>
      <span v-else>{{ codetimeStatus.project }}</span>
      <br />
      <span>{{ codetimeStatus.editor }} on {{ codetimeStatus.platform }}</span>
    </div>
  </div>
</template>

<style scoped>
.outlined {
  --color-bg: white;
  /* filter: drop-shadow(1px 0 0 var(--color-bg)) drop-shadow(0.7px 0.7px 0 var(--color-bg))
    drop-shadow(0px 1px 0 var(--color-bg)) drop-shadow(-0.7px 0.7px 0 var(--color-bg))
    drop-shadow(-1px 0 0 var(--color-bg)) drop-shadow(-0.7px -0.7px 0 var(--color-bg))
    drop-shadow(0px -1px 0 var(--color-bg)) drop-shadow(0.7px -0.7px 0 var(--color-bg)); */
  filter: drop-shadow(-2px 0 var(--color-bg)) drop-shadow(0 -2px var(--color-bg));
}

@media (prefers-color-scheme: dark) {
  .outlined {
    --color-bg: #121212;
  }
}
</style>

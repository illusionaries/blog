<script setup lang="ts">
import { dateStringLong } from '@app/utils'
import { ListBulletIcon, RocketLaunchIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import context from 'virtual:context'
const props = defineProps<{
  history: {
    hash: string
    fullhash: string
    time: string
    author: string
    message: string
    branch: string
  }[]
}>()
</script>

<template>
  <div class="git-history" data-pagefind-ignore>
    <div
      class="git-history-item"
      :class="[i === 0 ? 'rows-[auto_auto]' : 'rows-[.8rem_auto_auto]']"
      v-for="(item, i) in history"
      :key="item.hash"
      grid="~ cols-[auto_1fr]"
      gap-x-2>
      <div h-full m-x-auto v-if="i !== 0">
        <div class="side-line-upper" />
      </div>
      <div v-if="i !== 0"></div>
      <div
        flex="~ items-center justify-center"
        rounded-full
        class="bg-gray-200/40 dark:bg-truegray-700/40"
        w-6
        m-auto
        h-6>
        <component
          :is="
            i === 0
              ? SparklesIcon
              : i === props.history.length - 1
                ? RocketLaunchIcon
                : ListBulletIcon
          "
          class="w-3" />
      </div>
      <span m-y-auto>
        {{ item.message }}
        <a
          text-xs
          p-x-2
          p-y-1
          vertical-middle
          rounded-lg
          decoration-none
          class="bg-gray-200/40 dark:bg-truegray-700/40 monospace"
          :href="`https://github.com/${context.config.git?.repo}/commit/${item.fullhash}`"
          target="_blank"
          >{{ item.hash }}</a
        >
      </span>
      <div h-full m-x-auto>
        <div class="side-line-lower" />
      </div>
      <div text-sm text-subtle flex gap-x-2>
        <span>{{ dateStringLong(item.time) }}</span>
        <span>{{ item.author }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.git-history-item .side-line-upper,
.git-history-item .side-line-lower {
  --at-apply: h-full border-solid border-x-1 border-y-0 'border-gray-200/40'
    'dark:border-truegray-700/40';
}

.git-history-item:first-of-type .side-line-upper,
.git-history-item:last-of-type .side-line-lower {
  border: none !important;
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  steamId: string
}>()

interface SteamStatus {
  steamid: string
  personaname: string
  profileurl: string
  avatarmedium: string
  personastate: number
  lastlogoff: number
  gameid?: string
  gameextrainfo?: string
}

const steamStatus = ref<SteamStatus>()

const colorMapBg = {
  0: 'bg-gray-500 dark:bg-truegray-400', // offline
  1: 'bg-sky-500 dark:bg-sky-400', // online
  2: 'bg-yellow-500 dark:bg-yellow-400', // buzy
  3: 'bg-sky-500 dark:bg-sky-400', // away
  4: 'bg-purple-500 dark:bg-purple-400', // snooze
}

const colorMapText = {
  0: 'text-gray-600 dark:text-truegray-400', // offline
  1: 'text-sky-600 dark:text-sky-400', // online
  2: 'text-yellow-600 dark:text-yellow-400', // buzy
  3: 'text-sky-600 dark:text-sky-400', // away
  4: 'text-purple-600 dark:text-purple-400', // snooze
}

const statusMap = {
  0: '离线',
  1: '在线',
  2: '忙碌',
  3: '离开',
  4: 'zzz',
}

const statusColorBg = computed(() => {
  if (steamStatus.value === undefined) return colorMapBg[0]
  if (steamStatus.value.gameextrainfo) {
    return 'bg-emerald-500 dark:bg-emerald-400'
  }
  if (steamStatus.value?.personastate in colorMapBg) {
    return colorMapBg[steamStatus.value.personastate as keyof typeof colorMapBg]
  }
  return colorMapBg[0]
})

const statusColorText = computed(() => {
  if (steamStatus.value === undefined) return colorMapText[0]
  if (steamStatus.value.gameextrainfo) {
    return 'text-emerald-700 dark:text-emerald-200'
  }
  if (steamStatus.value?.personastate in colorMapText) {
    return colorMapText[steamStatus.value.personastate as keyof typeof colorMapText]
  }
  return colorMapText[0]
})

const statusText = computed(() => {
  if (steamStatus.value === undefined) return statusMap[0]
  if (steamStatus.value?.personastate in statusMap) {
    return statusMap[steamStatus.value.personastate as keyof typeof statusMap]
  }
  return statusMap[0]
})

let interval: null | ReturnType<typeof setInterval> = null

onMounted(async () => {
  steamStatus.value = await fetch(`https://status.illusion.blog/steam/${props.steamId}`).then(
    (res) => res.json(),
  )

  interval = setInterval(async () => {
    steamStatus.value = await fetch(`https://status.illusion.blog/steam/${props.steamId}`).then(
      (res) => res.json(),
    )
  }, 6000 * 3)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

<template>
  <div v-if="steamStatus" overflow-hidden text-ellipsis text-nowrap>
    <div flex="~ gap-2 items-center" h-full>
      <div relative h-full>
        <img
          :src="steamStatus.avatarmedium"
          min-h-0
          h-full
          object-cover
          block
          rounded-full
          overflow-clip />
        <div
          h-2
          w-2
          :class="statusColorBg"
          absolute
          bottom--2px
          right--2px
          rounded-full
          border="2 solid white dark:[#121212]"></div>
      </div>
      <div :class="statusColorText">
        <a :href="steamStatus.profileurl" target="_blank" rel="noopener noreferrer" color-inherit>
          {{ steamStatus.personaname }}
        </a>
        <br />
        <span v-if="steamStatus.gameextrainfo">正在玩 {{ steamStatus.gameextrainfo }}</span>
        <span v-else>Steam {{ statusText }}</span>
      </div>
    </div>
  </div>
</template>

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
  0: 'bg-truegray-500 dark:bg-truegray-400 ', // offline
  1: 'bg-green-500 dark:bg-green-400 ', // online
  2: 'bg-yellow-500 dark:bg-yellow-400 ', // buzy
  3: 'bg-blue-500 dark:bg-blue-400 ', // away
  4: 'bg-purple-500 dark:bg-purple-400 ', // snooze
}

const colorMapText = {
  0: 'text-truegray-800 dark:text-truegray-200 ', // offline
  1: 'text-green-800 dark:text-green-200 ', // online
  2: 'text-yellow-800 dark:text-yellow-200 ', // buzy
  3: 'text-blue-800 dark:text-blue-200 ', // away
  4: 'text-purple-800 dark:text-purple-200 ', // snooze
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
  if (steamStatus.value?.personastate in colorMapBg) {
    return colorMapBg[steamStatus.value.personastate as keyof typeof colorMapBg]
  }
  return colorMapBg[0]
})

const statusColorText = computed(() => {
  if (steamStatus.value === undefined) return colorMapText[0]
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
  steamStatus.value = await fetch(`https://steam-status.illusion.blog/${props.steamId}`).then(
    (res) => res.json(),
  )

  interval = setInterval(async () => {
    steamStatus.value = await fetch(`https://steam-status.illusion.blog/${props.steamId}`).then(
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
  <div v-if="steamStatus" h-full>
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

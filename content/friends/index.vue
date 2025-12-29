<script setup lang="ts">
defineOptions({
  name: 'FriendsPage',
})

type Friend = {
  name: string
  link: string
  avatar: string
  description?: string
}

const friends: Friend[] = [
  {
    name: 'JingXu’s site',
    link: 'https://iculizhi.github.io/',
    avatar: 'https://iculizhi.github.io/images/xj.png',
    description: '关注 xjgg 喵，关注 xjgg 谢谢喵',
  },
  {
    name: 'Wind Graham',
    link: 'http://windgraham.art/',
    avatar: 'http://www.windgraham.art/assets/images/avatar.jpg',
    description: '杏花疏影里，吹笛到天明',
  },
  {
    name: 'LWLAymh 的备忘录',
    link: 'https://lwlaymh.github.io/',
    avatar: 'https://lwlaymh.github.io/images/%E5%A4%B4%E5%83%8F1.jpg',
    description: '不过是白日梦里一瞬息',
  },
  {
    name: '超几何冰精',
    link: 'https://cirno-baka.github.io/',
    avatar: 'https://avatars.githubusercontent.com/u/53512550',
    description: '这个好像死掉惹',
  },
]
</script>

<template>
  <div flex="~ col">
    <div
      v-for="(friend, index) in friends"
      :key="friend.link"
      class="slide-in"
      :style="{ '--slide-in-stage': index }"
      p-y-4
      border-b="1 solid truegray-200/40 dark:dark-100/60 last-of-type:none">
      <a
        :href="friend.link"
        target="_blank"
        grid="~ cols-[auto_1fr] gap-2"
        text-unset
        decoration-none>
        <img :src="friend.avatar" :alt="friend.name" w-16 h-16 rounded-full />
        <div flex="~ col justify-center">
          <span block font-bold text-lg>{{ friend.name }}</span>
          <span block v-if="friend.description">
            {{ friend.description }}
          </span>
        </div>
      </a>
    </div>
  </div>
</template>

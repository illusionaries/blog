<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid'
</script>

<template>
  <div
    bg-light-200
    dark:bg-dark-700
    py-4
    px-8
    rounded-md
    overflow-x-scroll
    class="win"
    text-xs
    text-black>
    <div border-1 border-gray-300 border-solid shadow-xl mx-auto w-max min-w-60 max-w-100 bg-white>
      <div flex="~ justify-between items-stretch">
        <div px-2 py-1.5 overflow-clip text-ellipsis overflow-hidden text-nowrap>
          <span>按钮！</span>
        </div>
        <div
          w-10
          flex-0
          bg="hover:#c42b1c"
          flex="~ items-center justify-center"
          color-black
          transition-colors-150
          hover:color-white>
          <XMarkIcon class="h-1.2em" />
        </div>
      </div>
      <div p-2 bg="#f0f0f0">
        <p mb-1 mt-0>多好的按钮啊！</p>
        <p my-1>谁不喜欢呢？</p>
        <div flex="~ items-center justify-end gap-3" mt-2>
          <div
            w-20
            py-0.75
            bg="#E0E0E1"
            ring="[#B6B6B6] 1"
            flex="~ items-center justify-center"
            outline="[#0277D5] 2 solid"
            outline-offset--2>
            <span underline>O</span><span>K</span>
          </div>
          <div w-20 py-0.75 bg="#E0E0E1" ring="[#B6B6B6] 1" flex="~ items-center justify-center">
            <span underline>C</span><span>ancel</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.win {
  font-family: 'Segoe UI', 'Microsoft YaHei', 'Helvetica', 'Arial', sans-serif;
}
</style>

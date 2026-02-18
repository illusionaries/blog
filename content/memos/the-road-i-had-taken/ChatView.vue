<script setup lang="ts">
defineProps<{ messages: string[] }>()
</script>

<template>
  <div bg-light-200 dark:bg-dark-700 py-4 px-8 rounded-md text-3 class="chat">
    <div bg="#EDEDED dark:#191919" rounded-md shadow-lg w-full max-w-100 mx-auto>
      <div px-3 py-4 border-b="1px solid #D5D5D5 dark:#303030">某群 (某人数)</div>
      <div p-3 flex="~ col gap-4">
        <div v-for="message in messages" :key="message" flex="~ gap-2">
          <div bg-white w-6 h-6 rounded-sm />
          <div>
            <span block line-height-normal color="#9F9F9F" text-2>某群友</span>
            <div
              mt-0.5
              relative
              max-w-60
              py-1.75
              px-2.5
              bg="white dark:#2E2E2E"
              after:border-r="white dark:#2E2E2E"
              rounded-0.75
              class="bubble"
              text-2.75
              line-height-normal>
              {{ message }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.chat {
  font-family:
    InterVariable,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

.bubble::after {
  --size: 0.3em;
  content: '';
  position: absolute;
  border-width: var(--size) var(--size) var(--size) 0;
  border-style: solid;
  height: calc(var(--size) * 2);
  width: var(--size);
  top: 0.5em;
  left: calc(-1 * var(--size));
  box-sizing: border-box;
  border-color: transparent;
}
</style>

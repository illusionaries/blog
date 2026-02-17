<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer text-center flex="~ col items-center" text-sm text-gray-400 dark:text-truegray-600>
    <div flex="~ gap-2">
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
    <div m-t-4>© 2023 - {{ year }}</div>
    <div text-xs>
      <div>
        Unless otherwise stated, text contents are licensed under
        <a text-inherit href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>, and
        codes are licensed under <a text-inherit href="https://opensource.org/licenses/MIT">MIT</a>.
      </div>
      <div>
        Images may be subject to separate licenses, see the image captions for details if
        applicable.
      </div>
    </div>
  </footer>
</template>

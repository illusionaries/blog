---
title: $\ce{Me}$
time: 2026-01-01
lang: en
---

Who am I?

---

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { LanguageIcon } from '@heroicons/vue/24/solid'
const greetings = ref<string[]>(['Hello!', 'Good morning!', 'Good afternoon!', 'Good evening!', 'Good night!'])
const index = ref(0)
const loaded = ref(false);
onMounted(() => {
  loaded.value = true;
});
const interval = setInterval(() => {
  index.value = (index.value + 1) % greetings.value.length;
}, 2000);
onUnmounted(() => {
  clearInterval(interval);
});
</script>

<style scoped>
.tech-stack-icon {
  height: 1em;
  width: 1em;
  vertical-align: middle;
}

.tech-stack-subtitle {
  margin-bottom: .5em;
  font-weight: bold;
}

ul {
  margin-top: 0;
}
</style>

👋 <span inline-block class="slide-in" :key="greetings[index]">{{ greetings[index] }}</span>

My name is <ruby lang="zh">嘉<rp>(</rp><rt>jiā</rt><rp>)</rp></ruby>. I am currently a undergraduate student majoring in Applied Physics (Electronics Engineering) at Peking University.

I'm interested in programming and design, and I enjoy creating silly projects in my spare time. Creating projects that are both functional (or entertaining 🤔) and visually appealing is my passion.

Though I mainly practice frontend development, I'm also learning backend and mobile development.

<p class="tech-stack-subtitle">My current tech stack includes</p>

- <LanguageIcon class="tech-stack-icon" /> Mandarin Chinese & English (ah you say they're not programming languages? You are absolutely right)
- <img src="./typescript.svg" class="tech-stack-icon"> TypeScript / <img src="./javascript.svg" class="tech-stack-icon"> JavaScript
- <img src="./vue.svg" class="tech-stack-icon"> Vue.js
- <img src="./python.svg" class="tech-stack-icon"> Python

<p class="tech-stack-subtitle">I used to work with</p>

- <img src="./dotnet.svg" class="tech-stack-icon"> .NET (C#)
- <img src="./avalonia.svg" class="tech-stack-icon"> Avalonia

<p class="tech-stack-subtitle">I also have limited experience with</p>

- <img src="./rust.svg" class="tech-stack-icon"> Rust
- <img src="./cpp.svg" class="tech-stack-icon"> C++

<p class="tech-stack-subtitle">I'm planning to explore</p>

- <img src="./swift.svg" class="tech-stack-icon"> Swift / SwiftUI
- <img src="./kotlin.svg" class="tech-stack-icon"> Kotlin / Kotlin Multiplatform
- <img src="./go.svg" class="tech-stack-icon"> Go

Find me and my silly projects on [GitHub](https://github.com/illusionaryd)!

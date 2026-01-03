---
title: About This Site
time: 2026-01-03
noExcerpt: true
lang: en
---

<script>
import Context from 'virtual:context'
import { SiteConfiguration } from '@/site'
import CloudflareLocation from './CloudflareLocation.vue'
</script>

This site is built using ScantPress, a opinionated static site generator, originally designed for the home page of [Linux Club of Peking University](https://lcpu.dev).

ScantPress is heavily inspired by [VitePress](https://vitepress.dev/), with additional built-in support for features such as

- Automatic routing
- Tag support
- Pagefind search integration

ScantPress is based on [Vite](https://vitejs.dev/) and [Vue.js](https://vuejs.org/), and uses [Markdown-it](https://github.com/markdown-it/markdown-it) for Markdown rendering. [MathJax](https://www.mathjax.org/) is used for rendering mathematical formulas.

ScantPress is not planned to be published as a dedicated package for now, but you can find the source code on [GitHub](https://github.com/lcpu-club/lcpu-home). The modified version used for this site is available [here](https://github.com/illusionaryd/blog).

Refactoring and improvements are ongoing. New features such as search support will be backported to the original implementation when possible.

Current site is built and deployed with GitHub Actions, and the commit triggering the build is <a :href="`https://github.com/${SiteConfiguration.git.repo}/commit/${Context.githubSHA}`"><code>{{ Context.githubSHA }}</code></a>.

This site is deployed on GitHub Pages, served via Cloudflare CDN. <CloudflareLocation />

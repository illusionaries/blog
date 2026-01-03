import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'
import PagesGenerator from './generator/pages-generator'
import MarkdownContentGenerator from './generator/content-generator'
import { ContextPlugin } from './generator/context'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    MarkdownContentGenerator(),
    vue({
      include: [/\.vue$/, /\.md$/],
      template: {
        compilerOptions: {
          // mathjax containers
          isCustomElement: (tag) => tag.startsWith('mjx-'),
        },
      },
    }),
    vueDevTools(),
    UnoCSS(),
    PagesGenerator(),
    ContextPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    minify: 'oxc',
    cssMinify: true,
    rolldownOptions: {
      external: ['/pagefind/pagefind.js'],
    },
  },
  optimizeDeps: {
    exclude: ['/pagefind/pagefind.js'],
  },
})

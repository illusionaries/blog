import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import ScantPress from '@scantpress/vite'

const publicDir = fileURLToPath(new URL('../../public/', import.meta.url))
const root = fileURLToPath(new URL('./', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root,
  plugins: [
    // this includes unocss
    ScantPress(),
    vue({
      include: [/\.vue$/, /\.md$/, /\.typ$/],
      template: {
        compilerOptions: {
          // mathjax containers
          isCustomElement: (tag) => tag.startsWith('mjx-'),
        },
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@app': root,
    },
  },
  publicDir,
  build: {
    minify: 'oxc',
    cssMinify: true,
    reportCompressedSize: false,
    rolldownOptions: {
      external: ['/pagefind/pagefind.js'],
    },
  },
  optimizeDeps: {
    exclude: ['/pagefind/pagefind.js'],
  },
})

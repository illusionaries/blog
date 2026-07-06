import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import ScantPress, { loadConfig } from 'scantpress'
import GlobModulesProvider from './glob-modules-provider'
import path from 'node:path'

const scantpressConfig = await loadConfig()
if (!scantpressConfig.sources[0]) throw new Error('No valid ScantPress configuration found.')
const projectRoot = path.dirname(scantpressConfig.sources[0])

const publicDir = path.join(projectRoot, scantpressConfig.config.publicDir || 'public')
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
    GlobModulesProvider(),
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

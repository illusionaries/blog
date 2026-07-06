import { defineConfig } from 'tsdown'
import { builtinModules } from 'node:module'

export default defineConfig({
  entry: ['index.ts', 'cli/index.ts'],
  deps: {
    neverBundle: [
      ...builtinModules.map((m) => [`node:${m}`, m]).flat(),
      'vue',
      'vite',
      'fsevents',
      'mathjax',
      'jsdom',
      'jiti',
      'unocss',
      '@unocss/vite',
    ],
  },
  dts: {
    build: true,
  },
})

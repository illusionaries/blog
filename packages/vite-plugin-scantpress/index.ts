import contentRenderer from './content-renderer.js'
import indexGenerator from './index-generator.js'
import contextPlugin from './context-plugin.js'
import UnoCSS from '@unocss/vite'
import { presetAttributify, presetWind3, transformerDirectives } from 'unocss'
import { loadConfig } from '@scantpress/shared'
import { dirname } from 'path'
import type { PluginOption } from 'vite'

export default async function ScantPress(): Promise<PluginOption[]> {
  const { config, sources } = await loadConfig()

  const configWithPath = {
    ...config,
    root: dirname(sources[0]),
  }

  return [
    await contentRenderer(configWithPath),
    indexGenerator(configWithPath),
    contextPlugin(configWithPath),
    UnoCSS({
      mode: 'vue-scoped',
      presets: [
        presetWind3({
          dark: 'media',
        }),
        presetAttributify(),
      ],
      transformers: [transformerDirectives()],
      shortcuts: {
        'text-subtle': 'text-gray-500 dark:text-truegray-400',
        'ease-fast-in': 'ease-[cubic-bezier(0.160,_0.435,_0.000,_1.005)]!',
        ...(config.theme === 'normal'
          ? {
              'text-primary': 'text-amber-500 dark:text-amber-300',
              'border-primary': 'border-amber-500 dark:border-amber-300',
              'bg-primary': 'bg-amber-500 dark:bg-amber-300',
            }
          : {
              'text-primary': 'text-red-500 dark:text-red-300',
              'border-primary': 'border-red-500 dark:border-red-300',
              'bg-primary': 'bg-red-500 dark:bg-red-300',
            }),
      },
      safelist: [
        'bg-blue-200',
        'bg-red-200',
        'bg-green-200',
        'bg-yellow-200',
        'bg-blue-800',
        'bg-red-800',
        'bg-green-800',
        'bg-yellow-800',
        'text-blue-500',
        'text-red-500',
        'text-green-500',
        'text-yellow-500',
      ],
    }),
  ]
}

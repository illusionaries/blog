import { defineConfig, presetAttributify, presetUno, transformerDirectives } from 'unocss'
import { SiteConfiguration } from './src/site'

export default defineConfig({
  presets: [
    presetUno({
      dark: 'media',
    }),
    presetAttributify(),
  ],
  transformers: [transformerDirectives()],
  shortcuts: {
    'text-subtle': 'text-gray-500 dark:text-truegray-400',
    'ease-fast-in': 'ease-[cubic-bezier(0.160,_0.435,_0.000,_1.005)]!',
    ...(SiteConfiguration.theme === 'normal'
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
})

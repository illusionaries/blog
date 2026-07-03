import type { Plugin } from 'vite'
import path from 'node:path'
import { loadConfig } from 'scantpress'
import { fileURLToPath } from 'node:url'

export default async function GlobModulesProvider(): Promise<Plugin> {
  const virtualModuleId = 'virtual:modules'
  const resolvedVirtualModuleId = '\0' + virtualModuleId
  const loadResult = await loadConfig()
  if (!loadResult.sources[0]) throw new Error('No valid ScantPress configuration found.')

  // Project root is the directory containing the ScantPress configuration file
  // Content dir should be resolved against the project root
  const projectRoot = path.dirname(loadResult.sources[0])
  const contentDir = path.resolve(projectRoot, loadResult.config.contentDir || 'content')

  // Vite root is /packages/scantpress
  // We are returning a virtual module. import.meta.glob() will be relative to the Vite root,
  // so we need to calculate the relative path from the Vite root to the import base
  const viteRoot = fileURLToPath(new URL('./', import.meta.url))
  const contentDirRelative = path.relative(viteRoot, contentDir)

  return {
    name: 'scantpress-main:glob-modules-provider',
    resolveId(id, importer) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `
export const pageModules = import.meta.glob(['./**/*.md', './**/*.vue', './**/*.typ'], {
  base: ${JSON.stringify(contentDirRelative)},
})

export const pageSplashes = import.meta.glob(['./**/splash.*', './**/splash-dark.*'], {
  base: ${JSON.stringify(contentDirRelative)},
})
`
      }
    },
  }
}

import type { SiteConfiguration } from '@scantpress/shared'
import { env } from 'process'
import { Plugin } from 'vite'

export default function ContextPlugin(config: SiteConfiguration & { root: string }): Plugin {
  const virtualModuleId = 'virtual:context'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'scantpress:context',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export default ${JSON.stringify({ githubSHA: env.GITHUB_SHA || 'unknown', config })}`
      }
    },
  }
}

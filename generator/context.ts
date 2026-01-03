import { env } from 'process'
import { Plugin } from 'vite'

export function ContextPlugin(): Plugin {
  const virtualModuleId = 'virtual:context'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'context-plugin',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export default ${JSON.stringify({ githubSHA: env.GITHUB_SHA || 'unknown' })}`
      }
    },
  }
}

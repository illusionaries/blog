/// <reference types="vite/client" />

declare module 'virtual:pages.json' {
  import type { PageData } from 'scantpress'
  const pages: PageData[]
  export default pages
}

declare module 'virtual:context' {
  import type { SiteConfiguration } from 'scantpress'
  const context: {
    githubSHA: string
    config: SiteConfiguration & { root: string }
  }
  export default context
}

declare module 'virtual:modules' {
  import type { Module } from 'scantpress'

  export const pageModules: Record<string, () => Promise<Module<never>>>

  export const pageSplashes: Record<string, () => Promise<Module<string>>>
}

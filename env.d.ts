/// <reference types="vite/client" />

declare module 'virtual:pages.json' {
  import type { PageData } from '@/data/pagedata'
  const pages: PageData[]
  export default pages
}

declare module 'virtual:context' {
  const context: {
    githubSHA: string
  }
  export default context
}

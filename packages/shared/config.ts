export interface SiteConfiguration {
  markdown: {
    container: {
      warningLabel?: string
      errorLabel?: string
      infoLabel?: string
      expanderLabel?: string
    }
  }
  categories: Record<string, string>
  name: string
  theme: 'normal' | 'new-year'
  pureStatic?: boolean
  git: {
    repo: string
  }
  defaultLang: string
  social?: {
    github?: string
    email?: string
  }
  additionalHeads?: string[]
}

export function defineConfig(config: SiteConfiguration): SiteConfiguration {
  return config
}

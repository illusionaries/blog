import { Plugin } from 'vite'
import fg from 'fast-glob'
import matter from 'gray-matter'
import type { PageData, SiteConfiguration } from '@scantpress/shared'
import { existsSync, readFileSync } from 'fs'
import yaml from 'js-yaml'
import { MarkdownInstance } from './markdown/index.js'
import path from 'path'

async function generateIndex(config: SiteConfiguration & { root: string }): Promise<PageData[]> {
  const toProjectRoot = (p: string) => path.resolve(config.root, p)
  const md = new MarkdownInstance(config)
  await md.init()
  return (
    await Promise.all(
      fg
        .sync(toProjectRoot(`./content/**/*.(md|vue)`))
        .map((entry) => {
          if (entry.endsWith('.md')) {
            return { entry, frontmatter: matter.read(entry, { excerpt: true }) }
          }
          const yamlCandidates = [`${entry}.yaml`, `${entry}.yml`]
          for (const candidate of yamlCandidates) {
            if (existsSync(candidate)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const frontmatterData = yaml.load(readFileSync(candidate, 'utf8')) as any
              const excerpt = frontmatterData.excerpt as string | undefined
              delete frontmatterData.excerpt
              return { entry, frontmatter: { data: frontmatterData, excerpt } }
            }
          }
          return { entry, frontmatter: undefined }
        })
        .map(async ({ entry, frontmatter }): Promise<PageData | undefined> => {
          if (!frontmatter) return undefined
          if (frontmatter.data.isComponent) return undefined
          const entryToRoot = entry.replace(new RegExp(`^${toProjectRoot('./content')}`), '')
          const path = entryToRoot.replace(/index\.(?:md|vue)$/, '').replace(/\.(?:md|vue)/, '/')
          const slugs = path.split('/').filter((slug) => slug)
          const data = frontmatter.data
          const time = data.time
          const { result: title, textContent: textTitle } = await md.renderMarkdownInline(
            data.title,
          )
          const hidden = data.hidden ?? false
          const meta = data.meta
          const slug = data.slug ?? path
          const category = (slugs[0] in config.categories && slugs[0]) || undefined
          const tags = data.tags
          const noExerpt = data.noExcerpt ?? false
          const lang = data.lang ?? config.defaultLang
          const classes = data.classes ?? []
          delete data.time
          delete data.title
          delete data.hidden
          delete data.meta
          delete data.slug
          delete data.tags
          delete data.noExcerpt
          delete data.lang
          delete data.classes
          return {
            title,
            textTitle,
            time,
            data,
            hidden,
            meta,
            category,
            excerpt: noExerpt
              ? undefined
              : frontmatter.excerpt
                ? (await md.renderMarkdown(frontmatter.excerpt, {})).result
                : undefined,
            textExcerpt: noExerpt
              ? undefined
              : frontmatter.excerpt
                ? (await md.renderMarkdownInline(frontmatter.excerpt)).textContent
                : undefined,
            contentUrl: `${slug}`,
            sourceUrl: entryToRoot,
            tags,
            lang,
            classes,
          }
        }),
    )
  ).filter((x) => x !== undefined)
}

export default function indexGenerator(config: SiteConfiguration & { root: string }): Plugin {
  const virtualModuleId = 'virtual:pages.json'
  const resolvedVirtualModuleId = '\0' + virtualModuleId
  return {
    name: 'scantpress:index-generator',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        return JSON.stringify(await generateIndex(config))
      }
    },
    handleHotUpdate({ server, file }) {
      if (file.includes('content/')) {
        const thisModule = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
        if (thisModule) return [thisModule]
      }
    },
  }
}

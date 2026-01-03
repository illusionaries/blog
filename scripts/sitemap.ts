import { SitemapStream, streamToPromise } from 'sitemap'
import { Readable } from 'stream'
import fg from 'fast-glob'
import matter from 'gray-matter'
import fs from 'fs'
import { RouteTitleRecord } from '../src/site.ts'
import chalk from 'chalk'
import yaml from 'js-yaml'

const links = []

const pages = [
  ...fg
    .sync(`./content/**/*.md`)
    .map((entry) => {
      return { entry, frontmatter: matter.read(entry) }
    })
    .map((file) => {
      const { entry, frontmatter } = file
      if (frontmatter.data.hidden) return undefined
      const url = entry
        .replace(/\/index\.md$/, '/')
        .replace(/\.md$/, '/')
        .replace(/^\.\/content\//, '/')
      return {
        url: frontmatter.data.slug || url,
        lastmod: frontmatter.data.time,
        changefreq: 'monthly',
        priority: 0.5,
      }
    }),
  ...fg.sync(`./content/**/*.vue`).map((file) => {
    const url = file
      .replace(/\/index\.vue$/, '/')
      .replace(/\.vue$/, '/')
      .replace(/^\.\/content\//, '/')
    const frontmatterCandidates = [file + '.yaml', file + '.yml']
    for (const candidate of frontmatterCandidates) {
      if (fs.existsSync(candidate)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const frontmatter = yaml.load(fs.readFileSync(candidate, 'utf-8')) as any
        if (frontmatter.hidden || frontmatter.isComponent) return undefined
        if (!frontmatter.time) continue
        return {
          url: frontmatter.slug || url,
          lastmod: frontmatter.time,
          changefreq: 'monthly',
          priority: 0.5,
        }
      }
    }
    return undefined
  }),
]
  .filter((page) => page !== undefined)
  .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime())

links.push(...pages)

const categories: { [key: string]: Date } = {}
for (const category of Object.keys(RouteTitleRecord)) {
  categories[category] = fg
    .sync(`./content/${category}/**/index.md`)
    .map((entry) => {
      return matter.read(entry).data.time || new Date()
    })
    .filter((page) => page !== undefined)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
}

for (const category of Object.keys(RouteTitleRecord)) {
  links.push({
    url: `/${category}/`,
    changefreq: 'daily',
    priority: 0.8,
    lastmod: categories[category]!.toISOString(),
  })
}

console.log(chalk.bgYellow.greenBright('Sitemap:'))
console.log(links.map((x) => x.url).join('\n'))
const stream = new SitemapStream({ hostname: 'https://illusion.blog/' })
const buffer = await streamToPromise(Readable.from(links).pipe(stream))
const sitemap = buffer.toString()

fs.writeFileSync('./dist/static/sitemap.xml', sitemap)

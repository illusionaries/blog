// https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js

// Pre-render the app into static HTML.

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import fg from 'fast-glob'
import { SiteConfiguration, RouteTitleRecord } from '../src/site.js'
import gm from 'gray-matter'
import chalk from 'chalk'
import yaml from 'js-yaml'

console.log(chalk.bgYellow.greenBright('Prerender:'))

const PROJECT_ROOT = path.dirname('./')

const toAbsolute = (p: string) => path.resolve(PROJECT_ROOT, p)

const manifest = JSON.parse(
  fs.readFileSync(toAbsolute('dist/static/.vite/ssr-manifest.json'), 'utf-8'),
)
const template = fs.readFileSync(toAbsolute('dist/static/index.html'), 'utf-8')
const { render } = await import(toAbsolute('dist/server/entry-server.js'))

const routesToPrerender = ['/', '/404.html']

routesToPrerender.push(...Object.keys(RouteTitleRecord).map((category) => `/${category}/`))
routesToPrerender.push(
  ...fg.sync('./content/**/*.md').map((file) => {
    const target = file
      .replace(/\/index\.md$/, '/')
      .replace(/\.md$/, '/')
      .replace(/^\.\/content/, '')
    const frontmatter = gm(fs.readFileSync(file, 'utf-8')).data
    if (frontmatter.slug) {
      return `${frontmatter.slug}${frontmatter.slug.endsWith('/') ? '' : '/'}`
    }
    return target
  }),
  ...fg
    .sync('./content/**/*.vue')
    .map((file) => {
      const target = file
        .replace(/\/index\.vue$/, '/')
        .replace(/\.vue$/, '/')
        .replace(/^\.\/content/, '')
      const frontmatterCandidates = [file + '.yaml', file + '.yml']
      for (const candidate of frontmatterCandidates) {
        if (fs.existsSync(candidate)) {
          const frontmatter = yaml.load(fs.readFileSync(candidate, 'utf-8')) as {
            slug?: string
            isComponent?: boolean
          }
          if (frontmatter.isComponent) return undefined
          if (frontmatter.slug) {
            return `${frontmatter.slug}${frontmatter.slug.endsWith('/') ? '' : '/'}`
          }
        }
      }
      return target
    })
    .filter((x) => x !== undefined),
)

// pre-render each route...
for (const url of routesToPrerender) {
  const [appHtml, preloadLinks, titlePrefix, meta, lang] = await render(url, manifest)
  let html = template
  if (url === '/') {
    html = template.replace(`<!--title-prefix--> | <!--title-suffix-->`, `彩笔的部落阁`)
  }
  html = html
    .replace(`<!--preload-links-->`, preloadLinks)
    .replace(`<!--app-html-->`, appHtml)
    .replace(`<!--title-prefix-->`, titlePrefix)
    .replace(`<!--meta-->`, meta)
    .replace(`<!--title-suffix-->`, SiteConfiguration.titleSuffix)
    .replace(`data-prerender-inject-lang`, `lang="${lang || SiteConfiguration.defaultLang}"`)

  const filePath = `dist/static${url.endsWith('/') ? url + 'index.html' : url}`
  customWriteFileSync(toAbsolute(filePath), html)
  console.log(chalk.green('pre-rendered:'), filePath)
}

// done, delete .vite directory including ssr manifest
fs.rmSync(toAbsolute('dist/static/.vite'), { recursive: true })

function customWriteFileSync(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

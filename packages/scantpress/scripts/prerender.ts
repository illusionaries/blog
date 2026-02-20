// https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js

// Pre-render the app into static HTML.

import fs from 'node:fs'
import path from 'node:path'
import fg from 'fast-glob'
import gm from 'gray-matter'
import chalk from 'chalk'
import yaml from 'js-yaml'
import { SiteConfiguration } from '@/packages/shared'

export async function prerender(config: SiteConfiguration & { root: string }) {
  console.log(chalk.bgYellow.greenBright('Prerender:'))

  const toProjectRoot = (p: string) => path.resolve(config.root, p)

  const manifest = JSON.parse(
    fs.readFileSync(toProjectRoot('dist/static/.vite/ssr-manifest.json'), 'utf-8'),
  )
  const template = fs.readFileSync(toProjectRoot('dist/static/index.html'), 'utf-8')
  const { render } = await import(toProjectRoot('dist/server/entry-server.js'))

  const routesToPrerender = ['/', '/404.html']

  routesToPrerender.push(...Object.keys(config.categories).map((category) => `/${category}/`))
  routesToPrerender.push(
    ...fg.sync(toProjectRoot('./content/**/*.md')).map((file) => {
      const target = file
        .replace(/\/index\.md$/, '/')
        .replace(/\.md$/, '/')
        .replace(new RegExp(`^${toProjectRoot('./content')}`), '')
      const frontmatter = gm(fs.readFileSync(file, 'utf-8')).data
      if (frontmatter.slug) {
        return `${frontmatter.slug}${frontmatter.slug.endsWith('/') ? '' : '/'}`
      }
      return target
    }),
    ...fg
      .sync(toProjectRoot('./content/**/*.vue'))
      .map((file) => {
        const target = file
          .replace(/\/index\.vue$/, '/')
          .replace(/\.vue$/, '/')
          .replace(new RegExp(`^${toProjectRoot('./content')}`), '')
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
            return target
          }
        }
        return undefined
      })
      .filter((x) => x !== undefined),
  )

  // pre-render each route...
  for (const url of routesToPrerender) {
    const [appHtml, preloadLinks, titlePrefix, meta, lang] = await render(url, manifest)
    let html = template
    if (url === '/') {
      html = template.replace(`<!--title-prefix--> | <!--title-suffix-->`, config.name)
    }
    html = html
      .replace(`<!--preload-links-->`, preloadLinks)
      .replace(`<!--app-html-->`, appHtml)
      .replace(`<!--title-prefix-->`, titlePrefix)
      .replace(`<!--meta-->`, meta)
      .replace(`<!--title-suffix-->`, config.name)
      .replace(`data-prerender-inject-lang`, `lang="${lang || config.defaultLang}"`)

    const filePath = `dist/static${url.endsWith('/') ? url + 'index.html' : url}`
    customWriteFileSync(toProjectRoot(filePath), html)
    console.log(chalk.green('pre-rendered:'), filePath)
  }

  // done, delete .vite directory including ssr manifest
  fs.rmSync(toProjectRoot('dist/static/.vite'), { recursive: true })

  function customWriteFileSync(filePath: string, content: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content)
  }
}

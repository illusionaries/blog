import { PluginOption } from 'vite'
import { exec, spawn } from 'child_process'
import { load } from 'cheerio'
import { existsSync } from 'fs'
import * as fs from 'fs/promises'
import yaml from 'js-yaml'
import { dirname } from 'path'
import { MarkdownItHeader } from '@mdit-vue/plugin-headers'
import { slugify } from '@mdit-vue/shared'
import { SiteConfiguration } from '@scantpress/shared'

const preReplaceRe = /(<pre(?:(?!v-pre)[\s\S])*?)>/gm

const getGitBranch = async () => {
  return new Promise((resolve, reject) => {
    exec('git rev-parse --abbrev-ref HEAD', (error, stdout) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

const getGitHistory = async (filename: string): Promise<string> => {
  const branch = await getGitBranch()
  const process = exec(
    `git log --follow --pretty=format:'{<QUOTE>hash<QUOTE>:<QUOTE>%h<QUOTE>,<QUOTE>fullhash<QUOTE>:<QUOTE>%H<QUOTE>,<QUOTE>time<QUOTE>:<QUOTE>%cI<QUOTE>,<QUOTE>author<QUOTE>:<QUOTE>%an<QUOTE>,<QUOTE>message<QUOTE>:<QUOTE>%s<QUOTE>,<QUOTE>branch<QUOTE>:<QUOTE>${branch}<QUOTE>},' -- "${filename.replaceAll('"', '\\"')}"`,
  )
  let result = ''
  process.stdout?.on('data', (data) => {
    result += data
  })
  process.stderr?.on('data', (data) => {
    console.error(`Error: ${data}`)
  })
  await new Promise((resolve) => {
    process.on('close', resolve)
  })
  result = result.replaceAll('"', '\\"').replaceAll("'", "\\'").replaceAll('<QUOTE>', '"')
  return `[${result.trim().slice(0, -1)}]`
}

export default function typstHandler(config: SiteConfiguration): PluginOption {
  return {
    name: 'scantpress:typst-handler',
    enforce: 'pre',
    async transform(code, id) {
      if (id.endsWith('.typ')) {
        const frontmatterCandidates = [id + '.yml', id + '.yaml']
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let frontmatter: any = null
        for (const candidate of frontmatterCandidates) {
          if (!existsSync(candidate)) continue
          frontmatter = yaml.load(await fs.readFile(candidate, 'utf-8'))
        }

        const content = `
#let typst_align = align
#let align(alignment, body) = context {
  if target() == "html" {
    html.div(
      body,
      style: "display: flex; justify-content: "
        + if alignment == left { "flex-start" } else if alignment == center { "center" } else if alignment == right {
          "flex-end"
        } else { "flex-start" },
    )
  } else {
    typst_align(alignment, body)
  }
}

${code}
`
        const html = await new Promise<string>((resolve, reject) => {
          const process = spawn(
            `typst`,
            ['compile', '--features', 'html', '--format', 'html', '-', '-'],
            {
              cwd: dirname(id),
            },
          )
          process.stdin.write(content)
          process.stdin.end()
          let result = ''
          process.stdout?.on('data', (data) => {
            result += data
          })
          process.stderr?.on('data', (data) => {
            console.error(`Error: ${data}`)
          })
          process.on('close', () => resolve(result))
          process.on('error', (err) => reject(err))
        })

        const $ = load(html, {
          // @ts-expect-error: this is not present in types, but actually works.
          lowerCaseTags: false,
          _useHtmlParser2: true,
        })
        const slugs = {} as Record<string, number>
        const headers = Array.from($('h2, h3')).map<MarkdownItHeader>((el) => {
          const header = $(el)
          const text = header.text()
          let slug = encodeURIComponent(slugify(text))
          if (slug in slugs) {
            slugs[slug] += 1
            slug += `-${slugs[slug]}`
          } else {
            slugs[slug] = 0
          }
          header.attr('id', slug)
          return {
            level: parseInt(el.tagName[1]),
            title: text,
            slug,
            link: `#${slug}`,
            // do not actually need nesting, since we will be expanding all
            // headers later anyway.
            children: [],
          }
        })
        const body = $('body').html()
        const styles = $('style')
          .map((i, el) => `<style scoped>${$(el).html()}</style>`)
          .toArray()

        let templateContent = body?.replace(preReplaceRe, '$1 v-pre>')
        let scriptSetup = ''
        if (config.git?.history) {
          templateContent +=
            '\n\n<hr>\n' + `<h2>文件历史</h2><GitHistory :history='__gitHistory' />`
          const gitHistory = await getGitHistory(id)
          scriptSetup = `const __gitHistory = ${gitHistory}`
        }
        const script = `export const __headers = ${JSON.stringify(headers)}`
        return `<template><main ${frontmatter?.hidden ? '' : 'data-pagefind-body'} class="rendered-content typst-content ${encodeURIComponent(frontmatter?.title)} ${frontmatter?.classes?.join(' ') || ''}">${templateContent}</main></template>${scriptSetup ? `<script setup>${scriptSetup}</script>` : ''}<script>${script}</script>\n${styles.join('\n')}`
      }
    },
    handleHotUpdate({ server, file }) {
      if (file.includes('content/') && file.endsWith('.typ')) {
        const thisModule = server.moduleGraph.getModuleById(file)
        if (thisModule) {
          server.reloadModule(thisModule)
          return []
        }
      }
    },
  }
}

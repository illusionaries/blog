import MarkdownIt from 'markdown-it'
import Token from 'markdown-it/lib/token.mjs'
import Shiki from '@shikijs/markdown-it'
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerRemoveNotationEscape,
} from '@shikijs/transformers'
import { type MarkdownItTexOptions, tex } from '@mdit/plugin-tex'
// @ts-expect-error: MathJax typing issues
import MathJax from 'mathjax'
import MarkdownItContainer from 'markdown-it-container'
import { componentPlugin } from '@mdit-vue/plugin-component'
import { type MarkdownSfcBlocks, sfcPlugin } from '@mdit-vue/plugin-sfc'
import { headersPlugin, type MarkdownItHeader } from '@mdit-vue/plugin-headers'
import MarkdownItFootnote from 'markdown-it-footnote'
import ImageProcessor from './image-processor.js'
import anchor from 'markdown-it-anchor'
import { imgLazyload } from '@mdit/plugin-img-lazyload'
import heimu from './heimu.js'
import { randomUUID } from 'crypto'
import { JSDOM } from 'jsdom'
import type { SiteConfiguration } from '@scantpress/shared'
import path from 'path'

await MathJax.init({
  loader: { load: ['input/tex', 'input/asciimath', 'output/svg', 'a11y/assistive-mml'] },
  svg: { fontCache: 'local' },
  options: {
    enableAssistiveMml: true,
  },
})

type MarkdownRenderEnv = {
  mdRootPath?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  math?: { renderPromises: Record<string, Promise<any>>; mathjaxInstance: any }
  sfcBlocks?: MarkdownSfcBlocks
  headers?: MarkdownItHeader[]
}

export function injectHeaderData(headers: MarkdownItHeader[], sfcBlocks: MarkdownSfcBlocks) {
  const headerData = JSON.stringify(flattenHeaders(headers))
  const code = `export const __headers = ${headerData}`
  const useTypescript = sfcBlocks.scriptSetup
    ? sfcBlocks.scriptSetup.tagOpen.includes(`lang="ts"`)
    : false
  if (!sfcBlocks.script) {
    sfcBlocks.script = {
      type: 'script',
      content: `<script ${useTypescript ? 'lang="ts"' : ''}>${code}</script>`,
      contentStripped: code,
      tagOpen: `<script ${useTypescript ? 'lang="ts"' : ''}>`,
      tagClose: '</script>',
    }
  } else {
    sfcBlocks.script.contentStripped = code + sfcBlocks.script.contentStripped
    sfcBlocks.script.content =
      sfcBlocks.script.tagOpen + sfcBlocks.script.contentStripped + sfcBlocks.script.tagClose
  }
}

export function injectSetupCode(code: string, sfcBlocks: MarkdownSfcBlocks) {
  const useTypescript = sfcBlocks.scriptSetup
    ? sfcBlocks.scriptSetup.tagOpen.includes(`lang="ts"`)
    : false
  if (!sfcBlocks.scriptSetup) {
    sfcBlocks.scriptSetup = {
      type: 'scriptSetup',
      content: `<script setup ${useTypescript ? 'lang="ts"' : ''}>${code}</script>`,
      contentStripped: code,
      tagOpen: `<script setup ${useTypescript ? 'lang="ts"' : ''}>`,
      tagClose: '</script>',
    }
  } else {
    sfcBlocks.scriptSetup.contentStripped = code + '\n' + sfcBlocks.scriptSetup.contentStripped
    sfcBlocks.scriptSetup.content =
      sfcBlocks.scriptSetup.tagOpen +
      sfcBlocks.scriptSetup.contentStripped +
      sfcBlocks.scriptSetup.tagClose
  }
}

function flattenHeaders(headers: MarkdownItHeader[]): MarkdownItHeader[] {
  return headers.flatMap((header) => {
    if (header.children) {
      return [header, ...flattenHeaders(header.children)]
    } else {
      return [header]
    }
  })
}

function extractExpanderTitle(info: string) {
  const re = /^ *expander *(.*?)$/
  const result = info.replace(re, '$1').trim()
  if (result) return result
  return undefined
}

function extractContainerTitle(info: string, klass: string) {
  const re = new RegExp(`^ *${klass.trim()} *(.*?)$`)
  const result = info.replace(re, '$1').trim()
  return result
}

function createContainer(md: MarkdownIt, klass: string, title: string) {
  // @ts-expect-error: markdown-it-container typing issues
  MarkdownItContainer(md, klass, {
    render: (tokens: Token[], idx: number) => {
      return tokens[idx].nesting === 1
        ? `<div class="container ${klass}"><p class="container-title">${extractContainerTitle(tokens[idx].info, klass) || title}</p>\n`
        : '</div>\n'
    },
  })
}

export class MarkdownInstance {
  md: MarkdownIt | undefined
  // retrieve root path so we can resolve public directory
  config: SiteConfiguration & { root: string }
  constructor(config: SiteConfiguration & { root: string }) {
    this.config = config
  }
  public async init() {
    if (!this.md) {
      this.md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
      })
      this.md
        .use(MarkdownItFootnote)
        .use(ImageProcessor, path.resolve(this.config.root, 'public'))
        .use(tex, {
          render(content, displayMode, env: MarkdownRenderEnv) {
            if (!env.math) env.math = { renderPromises: {}, mathjaxInstance: MathJax }
            if (!env.math.renderPromises) {
              env.math.renderPromises = {}
            }
            const uuid = `<!-- math-${randomUUID()} -->`

            env.math.renderPromises[uuid] = MathJax.tex2svgPromise(content, {
              display: displayMode,
            })
            return uuid
          },
        } as MarkdownItTexOptions)
        .use(heimu)
        .use(anchor, {
          permalink: anchor.permalink.ariaHidden({
            placement: 'before',
            class: 'header-anchor',
          }),
        })
        .use(createContainer, 'warning', this.config.markdown.container.warningLabel || 'WARNING')
        .use(createContainer, 'error', this.config.markdown.container.errorLabel || 'ERROR')
        .use(createContainer, 'info', this.config.markdown.container.infoLabel || 'INFO')
        // @ts-expect-error: markdown-it-container typing issues
        .use(MarkdownItContainer, 'expander', {
          render: (tokens: Token[], idx: number) => {
            if (tokens[idx].nesting === 1) {
              return `
<ExpanderComponent class="expander" :initial-collapsed="true"
  :extend-toggle-area="true">
  <template #header>
    <span font-bold text-sm p-y-4>${extractExpanderTitle(tokens[idx].info) ?? this.config.markdown.container.expanderLabel ?? 'MORE'}</span>
  </template>\n`
            } else {
              return '</ExpanderComponent>\n'
            }
          },
        })
        .use(
          await Shiki({
            themes: {
              light: 'catppuccin-latte',
              dark: 'one-dark-pro',
            },
            transformers: [
              transformerNotationDiff(),
              transformerNotationFocus(),
              transformerNotationHighlight(),
              transformerRemoveNotationEscape(),
            ],
          }),
        )
        .use(componentPlugin)
        .use(sfcPlugin)
        .use(headersPlugin)
        .use(imgLazyload)
    }
    return this.md
  }
  async renderMarkdown(
    src: string,
    env: MarkdownRenderEnv,
  ): Promise<{
    result: string
    headers: MarkdownItHeader[]
    sfcBlocks: MarkdownSfcBlocks
    patchedTemplateContentStripped?: string
  }> {
    if (!this.md) {
      await this.init()
    }
    let result = this.md!.render(src, env)
    if (!env.math) {
      return {
        result,
        // headers and sfcBlocks will not be null after render
        headers: env.headers!,
        sfcBlocks: env.sfcBlocks!,
        patchedTemplateContentStripped: env.sfcBlocks?.template?.contentStripped,
      }
    }
    const { mathjaxInstance, renderPromises } = env.math
    const mathRenderResults = (
      await Promise.all(
        Object.keys(renderPromises).map((k) => {
          return renderPromises[k].then((v) => [k, v] as const)
        }),
      )
    ).map(([k, v]) => [k, mathjaxInstance.startup.adaptor.outerHTML(v) as string] as const)

    mathRenderResults.forEach(([k, v]) => {
      result = result.replace(k, v)
    })
    // vue compiler removes spaces in <mjx-break>...</mjx-break>, see https://github.com/vuejs/core/issues/7789
    // bypass the behavior here...
    result = result.replaceAll(/<mjx\-break.*?> <\/mjx-break>/g, (match) => {
      return match.replace(/> </, '>&nbsp;<')
    })
    let templateContentStripped = env.sfcBlocks?.template?.contentStripped
    if (templateContentStripped) {
      mathRenderResults.forEach(([k, v]) => {
        templateContentStripped = templateContentStripped!.replace(k, v)
      })
      templateContentStripped = templateContentStripped.replaceAll(
        /<mjx\-break.*?> <\/mjx-break>/g,
        (match) => {
          return match.replace(/> </, '>&nbsp;<')
        },
      )
    }
    const mathCss = mathjaxInstance.startup.adaptor.cssText(mathjaxInstance.svgStylesheet())
    // sfcBlocks will not be null after render
    env.sfcBlocks!.styles.push({
      content: `<style>${mathCss}</style>`,
      contentStripped: mathCss,
      tagOpen: '<style>',
      tagClose: '</style>',
      type: 'style',
    })
    return {
      result,
      headers: env.headers!,
      sfcBlocks: env.sfcBlocks!,
      patchedTemplateContentStripped: templateContentStripped,
    }
  }

  async renderMarkdownInline(src: string): Promise<{
    result: string
    textContent: string
  }> {
    if (!this.md) {
      await this.init()
    }
    const env = {} as MarkdownRenderEnv
    const rendered = this.md!.renderInline(src, env)
    if (!env.math) {
      return { result: rendered, textContent: new JSDOM(rendered).window.document.body.textContent }
    }
    const { mathjaxInstance, renderPromises } = env.math
    const mathRenderResults = (
      await Promise.all(
        Object.keys(renderPromises).map((k) => {
          return renderPromises[k].then((v) => [k, v] as const)
        }),
      )
    ).map(([k, v]) => [k, mathjaxInstance.startup.adaptor.outerHTML(v) as string] as const)

    let result = rendered
    mathRenderResults.forEach(([k, v]) => {
      result = result.replace(k, v)
    })

    return { result, textContent: new JSDOM(result).window.document.body.textContent }
  }
}

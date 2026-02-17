import type MarkdownIt from 'markdown-it'

export default function markdownItImageProcessor(md: MarkdownIt) {
  //   const defaultRender =
  //     md.renderer.rules.image ||
  //     function (tokens, idx, options, env, self) {
  //       return self.renderToken(tokens, idx, options)
  //     }
  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options)
    }
  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx]
    const href = token.attrGet('href')
    if (href) {
      const url = new URL(href, 'http://example.com')
      const isExternal =
        url.hostname !== 'example.com' ||
        url.protocol !== 'http:' ||
        href.startsWith('http://example.com')
      if (isExternal) {
        token.attrSet('target', '_blank')
        token.attrSet('rel', 'noopener noreferrer')
      }
    }
    return defaultRender.call(this, tokens, idx, options, env, self)
  }
}

import type MarkdownIt from 'markdown-it'
import { imageSize as sizeOf } from 'image-size'
import path from 'path'

export default function markdownItImageProcessor(md: MarkdownIt, publicDir: string) {
  const defaultRender =
    md.renderer.rules.image ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options)
    }

  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx]
    if (!token.attrs) return defaultRender(tokens, idx, options, env, self)
    const srcIndex = token.attrIndex('src')
    const src = token.attrs[srcIndex][1]

    const dimensions = resolveDimensions(src, env.mdRootPath, publicDir)

    if (dimensions) {
      const widthIndex = token.attrIndex('width')
      const heightIndex = token.attrIndex('height')

      if (widthIndex >= 0) {
        token.attrs[widthIndex][1] = dimensions.width
      } else {
        token.attrs.push(['width', dimensions.width])
      }

      if (heightIndex >= 0) {
        token.attrs[heightIndex][1] = dimensions.height
      } else {
        token.attrs.push(['height', dimensions.height])
      }
    }
    return defaultRender(tokens, idx, options, env, self)
  }
}

function resolveDimensions(src: string, mdRootPath: string, publicDir: string) {
  if (src.startsWith('./')) {
    const size = sizeOf(mdRootPath + src.slice(1))
    if (size.height && size.width)
      return {
        height: size.height.toString(),
        width: size.width.toString(),
      }
    return null
  } else if (src.startsWith('/')) {
    // TODO: fix public dir resolution
    const size = sizeOf(path.resolve(publicDir, '.' + src))
    if (size.height && size.width)
      return {
        height: size.height.toString(),
        width: size.width.toString(),
      }
    return null
  } else {
    return null
  }
}

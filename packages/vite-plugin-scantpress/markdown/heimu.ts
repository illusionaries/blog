import type MarkdownIt from 'markdown-it'

export default function heimu(md: MarkdownIt) {
  md.inline.ruler.after('text', 'renderHeimu', (state, silent) => {
    if (silent) return false
    const start = state.pos
    if (state.src[start] === '@' && state.src[start + 1] === '@') {
      const match = state.src.slice(start).match(/^@@(.*?)@@/)
      if (match) {
        const content = match[1]
        const token_open = state.push('heimu_open', '', 1)
        token_open.markup = '@@'
        const newState = new state.md.inline.State(content, state.md, state.env, [])
        newState.md.inline.parse(content, newState.md, state.env, newState.tokens)
        state.tokens.push(...newState.tokens)
        const token_close = state.push('heimu_close', '', -1)
        token_close.markup = '@@'
        state.pos += match[0].length
        return true
      }
    }
    return false
  })

  md.renderer.rules.heimu_open = () => '<span class="heimu">'
  md.renderer.rules.heimu_close = () => '</span>'
}

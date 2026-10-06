import { MODULES, PAIRED } from './syntax'

export interface TagToken {
  name: string
  closing: boolean
  start: number
}

// Regions whose content is never parsed as tags.
const RAW_BLOCKS = new Set(['code', 'html', 'embed', 'embedvideo', 'embedaudio'])
const BODY_MODULES = new Set(MODULES.filter((m) => m.body).map((m) => m.name.toLowerCase()))
const MODULE_NAME = /\s+(\w+)/y
const TOKEN = /\[!--|@@|@<|\[\[\[|\[\[(\/?)(==|[<>=]|[a-zA-Z][\w-]*)(?=[\s\]])/g

/** Finds paired block tags (`[[div]]`, `[[/div]]`, …), skipping comments and raw text. */
export function scanTags(text: string): TagToken[] {
  const tags: TagToken[] = []
  TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN.exec(text))) {
    const token = m[0]
    if (token === '[!--' || token === '@@' || token === '@<') {
      const end = text.indexOf(
        token === '[!--' ? '--]' : token === '@@' ? '@@' : '>@',
        TOKEN.lastIndex,
      )
      if (end < 0) break
      TOKEN.lastIndex = end + (token === '@@' ? 2 : 3)
      continue
    }
    if (token === '[[[') continue
    const closing = m[1] === '/'
    const name = m[2].replace(/_$/, '')
    if (!PAIRED.has(name)) continue
    if (name === 'module' && !closing) {
      // Most modules have no body; only those that need [[/module]] open a block.
      MODULE_NAME.lastIndex = TOKEN.lastIndex
      const module = MODULE_NAME.exec(text)?.[1]
      if (!module || !BODY_MODULES.has(module.toLowerCase())) continue
    }
    tags.push({ name, closing, start: m.index })
    if (!closing && RAW_BLOCKS.has(name)) {
      const end = text.indexOf(`[[/${name}]]`, TOKEN.lastIndex)
      if (end < 0) break
      TOKEN.lastIndex = end
    }
  }
  return tags
}

/** Names of tags still open at the end of `text`, innermost last. */
export function openTags(text: string): string[] {
  const stack: string[] = []
  for (const tag of scanTags(text)) {
    if (!tag.closing) {
      stack.push(tag.name)
    } else {
      const i = stack.lastIndexOf(tag.name)
      if (i >= 0) stack.length = i
    }
  }
  return stack
}

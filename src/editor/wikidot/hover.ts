// Hovers for wikidot markup: tag and module names, tag attributes and ListPages
// %%variables%%, documented from the same reference as completion. Inside [[module CSS]]
// and [[html]] blocks, Monaco's CSS/HTML hovers are shown instead.
import { tr, type Text } from '../../i18n'
import { monaco } from '../monaco'
import { provideEmbeddedHover } from './embedded'
import { LISTPAGES_VARS, MODULES, TAGS, type AttrSpec } from './syntax'

type Markdown = monaco.IMarkdownString

/** How far back to look for the `[[` of a tag spanning several lines. */
const MAX_TAG_LENGTH = 4000

// Names before symbols, so that `=image` is not read as `=`.
const TAG_HEAD = /^(\/?)(\*?(?:f[<>]|[<>=])?[a-zA-Z][\w-]*|==|[<>=$#])/
const MODULE_NAME = /^\s+(\w+)/
/** Attribute names, skipping quoted values that may contain `=`. */
const ATTR = /"[^"]*"|([\w-]+)\s*=/g
const VARIABLE = /%%([\w{}()]+)(?:\|[^%\n]*)?%%/g

const code = (s: string) => '`' + s + '`'

function docs(...parts: (Text | string | undefined)[]): Markdown[] {
  return parts
    .filter((p) => p !== undefined)
    .map((p) => ({ value: typeof p === 'string' ? p : tr(p) }))
}

const MAX_VALUES = 8

/** Null for attributes with nothing to say beyond their name (`class`, `style`). */
function attrHover(attr: AttrSpec) {
  if (!attr.doc && !attr.values) return null
  const shown = attr.values?.slice(0, MAX_VALUES).map(code)
  if (shown && attr.values!.length > MAX_VALUES) shown.push('…')
  return docs(code(attr.name), attr.doc, shown?.join(' | '))
}

/** `content{2}` → `content{}`, `preview(50)` → `preview()`, for matching LISTPAGES_VARS. */
const variableKey = (name: string) => name.replace(/\{[^}]*\}/, '{}').replace(/\(\d*\)/, '()')

function variableHover(text: string, offset: number, lineStart: number) {
  const lineEnd = text.indexOf('\n', offset)
  const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd)
  for (const m of line.matchAll(VARIABLE)) {
    const start = lineStart + m.index
    if (offset < start || offset >= start + m[0].length) continue
    const entry = LISTPAGES_VARS.find(([name]) => variableKey(name) === variableKey(m[1]))
    if (!entry) return null
    return { start, end: start + m[0].length, contents: docs(code(`%%${entry[0]}%%`), entry[1]) }
  }
  return null
}

function tagHover(text: string, offset: number) {
  const open = text.lastIndexOf('[[', offset)
  if (open < 0 || offset - open > MAX_TAG_LENGTH) return null
  if (text[open - 1] === '[' || text[open + 2] === '[') return null // [[[page link]]]
  const close = text.indexOf(']]', open)
  if (close >= 0 && close < offset) return null
  const insideStart = open + 2
  const inside = text.slice(insideStart, close < 0 ? text.length : close)
  const head = TAG_HEAD.exec(inside)
  if (!head) return null
  const [, slash, name] = head
  const nameEnd = insideStart + head[0].length

  if (offset < nameEnd) {
    const tag =
      TAGS.find((t) => t.name === name) ?? (slash ? TAGS.find((t) => t.closeName === name) : null)
    if (!tag) return null
    const shape = tag.close
      ? `[[${tag.name}]] … [[/${tag.closeName ?? tag.name}]]`
      : `[[${tag.name}]]`
    return { start: open, end: nameEnd, contents: docs(code(shape), tag.detail, tag.doc) }
  }
  if (slash) return null

  const rest = inside.slice(head[0].length)
  let attrs = TAGS.find((t) => t.name === name)?.attrs
  if (name === 'module') {
    const moduleName = MODULE_NAME.exec(rest)
    if (!moduleName) return null
    const module = MODULES.find((m) => m.name.toLowerCase() === moduleName[1].toLowerCase())
    const start = nameEnd + moduleName[0].length - moduleName[1].length
    const end = start + moduleName[1].length
    if (offset < end) {
      if (!module) return null
      const shape = module.body
        ? `[[module ${module.name}]] … [[/module]]`
        : `[[module ${module.name}]]`
      return { start, end, contents: docs(code(shape), module.detail) }
    }
    attrs = module?.attrs
  }
  if (!attrs) return null

  for (const m of rest.matchAll(ATTR)) {
    if (!m[1]) continue
    const start = nameEnd + m.index
    const end = start + m[1].length
    if (offset < start || offset >= end) continue
    const attr = attrs.find(
      (a) => a.name === m[1] || (a.name === 'data-' && m[1].startsWith('data-')),
    )
    const contents = attr && attrHover(attr)
    return contents ? { start, end, contents } : null
  }
  return null
}

export function registerHover(languageId: string) {
  monaco.languages.registerHoverProvider(languageId, {
    async provideHover(model, position, token) {
      const embedded = await provideEmbeddedHover(model, position, token)
      if (embedded) return embedded
      const text = model.getValue()
      const offset = model.getOffsetAt(position)
      const lineStart = model.getOffsetAt({ lineNumber: position.lineNumber, column: 1 })
      const found = variableHover(text, offset, lineStart) ?? tagHover(text, offset)
      if (!found) return null
      const from = model.getPositionAt(found.start)
      const to = model.getPositionAt(found.end)
      return {
        range: new monaco.Range(from.lineNumber, from.column, to.lineNumber, to.column),
        contents: found.contents,
      }
    },
  })
}

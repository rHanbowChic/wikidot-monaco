import { t, tr, type Text } from '../../i18n'
import type { CompletionMode } from '../../settings'
import { monaco } from '../monaco'
import { EMBEDDED_TRIGGER_CHARACTERS, provideEmbeddedCompletions } from './embedded'
import { openTags } from './scan'
import { LISTPAGES_VARS, MODULES, PAIRED, TAGS, type AttrSpec, type TagSpec } from './syntax'

type Item = monaco.languages.CompletionItem
const Kind = monaco.languages.CompletionItemKind
const AsSnippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet

export const completionOptions = { mode: 'auto' as CompletionMode, closeTags: true }

/** Shifts snippet tab stops by `by`, leaving `$0` alone. */
function shiftTabStops(snippet: string, by: number) {
  return snippet.replace(/\$(\{?)(\d+)/g, (all, brace, n) =>
    n === '0' ? all : `$${brace}${+n + by}`,
  )
}

function maxTabStop(snippet: string) {
  return Math.max(0, ...[...snippet.matchAll(/\$\{?(\d+)/g)].map((m) => +m[1]))
}

/** Snippet inserted after `[[` for a tag, including the closing `]]`. */
function tagSnippet(tag: TagSpec): string {
  if (tag.snippet) return tag.snippet
  let head = tag.name
  if (tag.arg) head += ' ' + text(tag.arg)
  // A free tab stop right after the head, for typing attributes.
  const slot = maxTabStop(head) + 1
  head += tag.attrs ? `\${${slot}}` : ''
  const next = tag.attrs ? slot : slot - 1
  if (!tag.close || !completionOptions.closeTags) return `${head}]]$0`
  const body = tag.body ? shiftTabStops(text(tag.body), next) : '$0'
  const close = `[[/${tag.closeName ?? tag.name}]]`
  return tag.close === 'block' ? `${head}]]\n${body}\n${close}` : `${head}]]${body}${close}`
}

const text = (s: string | Text) => (typeof s === 'string' ? s : tr(s))

function doc(text?: Text) {
  return text ? { value: tr(text) } : undefined
}

const CLOSES_OPEN_TAG = t('Closes an open tag', '闭合未结束的标签')

function attrItems(attrs: AttrSpec[], used: Set<string>, range: monaco.IRange): Item[] {
  return attrs
    .filter((a) => !used.has(a.name))
    .map((a, i) => ({
      label: a.name,
      sortText: String(i).padStart(3, '0'),
      kind: Kind.Property,
      documentation: doc(a.doc),
      insertText: a.name === 'data-' ? 'data-${1:name}="$2"' : `${a.name}="$1"`,
      insertTextRules: AsSnippet,
      range,
      command: a.values ? { id: 'editor.action.triggerSuggest', title: '' } : undefined,
    }))
}

function valueItems(values: string[], range: monaco.IRange): Item[] {
  return values.map((v, i) => ({
    label: v,
    kind: Kind.Value,
    insertText: v,
    sortText: String(i).padStart(3, '0'),
    range,
  }))
}

function findTag(name: string) {
  return TAGS.find((t) => t.name === name)
}

function findModule(name: string) {
  return MODULES.find((m) => m.name.toLowerCase() === name.toLowerCase())
}

function provide(model: monaco.editor.ITextModel, position: monaco.Position): Item[] {
  const line = model.getLineContent(position.lineNumber)
  const before = line.slice(0, position.column - 1)
  const after = line.slice(position.column - 1)
  const col = (index: number) => index + 1
  const rangeFrom = (startIndex: number, endIndex = before.length) =>
    new monaco.Range(position.lineNumber, col(startIndex), position.lineNumber, col(endIndex))
  // Text after the cursor that completion should absorb, e.g. a `]]` already typed.
  const absorb = (suffix: string) => (after.startsWith(suffix) ? suffix.length : 0)
  const closingBrackets = /^\]{0,2}/.exec(after)![0].length

  // %%variables%%
  const variable = /%%([\w{}()]*)$/.exec(before)
  if (variable) {
    const range = rangeFrom(variable.index + 2, before.length + absorb('%%'))
    return LISTPAGES_VARS.map(([name, detail]) => ({
      label: `%%${name}%%`,
      filterText: name,
      kind: Kind.Variable,
      detail: tr(detail),
      insertText: `${name}%%`,
      range,
    }))
  }

  const open = before.lastIndexOf('[[')
  if (open < 0 || before.indexOf(']]', open) >= 0) return []
  if (before[open - 1] === '[' || before[open + 2] === '[') return [] // [[[page link]]]
  const inside = before.slice(open + 2)
  const nameStart = open + 2

  // [[/ → closing tags, innermost open tag first
  const closing = /^\/([\w<>=]*)$/.exec(inside)
  if (closing) {
    const stack = openTags(
      model.getValueInRange(new monaco.Range(1, 1, position.lineNumber, col(open))),
    )
    const range = rangeFrom(nameStart + 1, before.length + closingBrackets)
    const names = [...new Set([...stack.reverse(), ...PAIRED])]
    return names.map((name, i) => ({
      label: `[[/${name}]]`,
      filterText: name,
      kind: Kind.Keyword,
      detail: i < stack.length ? tr(CLOSES_OPEN_TAG) : undefined,
      insertText: `${name}]]`,
      sortText: String(i).padStart(3, '0'),
      range,
      preselect: i === 0 && stack.length > 0,
    }))
  }

  // [[name → tags
  if (/^(?:\*?(?:f[<>]|[<>=])?[\w$#-]*|==)$/.test(inside)) {
    const range = rangeFrom(nameStart, before.length + closingBrackets)
    return TAGS.map((tag, i) => ({
      label: { label: tag.name, description: tr(tag.detail) },
      sortText: String(i).padStart(3, '0'),
      filterText: tag.name,
      kind: tag.close ? Kind.Struct : Kind.Keyword,
      detail: tr(tag.detail),
      documentation: doc(tag.doc),
      insertText: tagSnippet(tag),
      insertTextRules: AsSnippet,
      range,
    }))
  }

  const head = /^(\S+)\s+(.*)$/.exec(inside)
  if (!head) return []
  const [, name, rest] = head
  const restStart = before.length - rest.length

  if (name === 'module') {
    // [[module Na → module names
    const moduleName = /^(\w*)$/.exec(rest)
    if (moduleName) {
      const range = rangeFrom(restStart, before.length + closingBrackets)
      return MODULES.map((m, i) => ({
        label: { label: m.name, description: tr(m.detail) },
        sortText: String(i).padStart(3, '0'),
        kind: Kind.Module,
        detail: tr(m.detail),
        insertText:
          m.body && completionOptions.closeTags
            ? `${m.name}\${1}]]\n$0\n[[/module]]`
            : `${m.name}\${1}]]$0`,
        insertTextRules: AsSnippet,
        range,
      }))
    }
  }

  const module = name === 'module' ? findModule(rest.split(/\s/)[0]) : undefined
  const tag = findTag(name)
  const attrs = (name === 'module' ? module?.attrs : tag?.attrs) ?? []

  // attr="va → values
  const value = /([\w-]+)\s*=\s*"([^"]*)$/.exec(rest)
  if (value) {
    const values = attrs.find((a) => a.name === value[1])?.values
    if (!values) return []
    return valueItems(values, rangeFrom(before.length - value[2].length))
  }

  // Inside an unterminated quote of some other kind: nothing to offer.
  if ((rest.match(/"/g)?.length ?? 0) % 2 === 1) return []

  const word = /(?:^|\s)([\w-]*)$/.exec(rest)
  if (!word) return []
  const range = rangeFrom(before.length - word[1].length)
  const used = new Set([...rest.matchAll(/([\w-]+)\s*=/g)].map((m) => m[1]))
  const items = attrItems(attrs, used, range)
  // Positional values such as [[size |]] or [[button |]].
  if (tag?.argValues && rest.trim() === word[1]) items.unshift(...valueItems(tag.argValues, range))
  return items
}

export function registerCompletion(languageId: string) {
  monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters: [
      ...new Set(['[', '/', ' ', '"', '%', '<', '>', '*', '=', ...EMBEDDED_TRIGGER_CHARACTERS]),
    ],
    async provideCompletionItems(model, position, context, token) {
      const { mode } = completionOptions
      if (mode === 'off') return { suggestions: [] }
      if (
        mode === 'manual' &&
        context.triggerKind !== monaco.languages.CompletionTriggerKind.Invoke
      ) {
        return { suggestions: [] }
      }
      const suggestions = provide(model, position)
      // Inside [[module CSS]] / [[html]], add Monaco's CSS/HTML completions, except while a
      // wikidot tag is being typed: `[[` is never CSS/HTML, and CSS suggestions opened on
      // the first `[` would keep the list from being re-queried for wikidot tags.
      const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
      if (/\[(?:\[[^\]]*)?$/.test(before)) return { suggestions }
      const embedded = await provideEmbeddedCompletions(model, position, context, token)
      if (!embedded) return { suggestions }
      return {
        suggestions: [...suggestions, ...embedded.suggestions],
        incomplete: embedded.incomplete,
      }
    },
  })
}

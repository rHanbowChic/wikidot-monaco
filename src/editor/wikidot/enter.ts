// Enter inside or right after a `[[tag]]`, the way HTML editors handle Enter around tags.
import { monaco } from '../monaco'
import { scan, scanTags } from './scan'
import { MODULES, TAGS } from './syntax'

export interface EnterEdit {
  /** Offsets of the text to replace. */
  start: number
  end: number
  text: string
  /** Where the cursor goes, as an offset into `text`. */
  cursor: number
}

const NAME = /^(?:\*?(?:f[<>]|[<>=])?[a-zA-Z][\w-]*|==|[<>=])(?=\s|$)/

interface Pairing {
  /** Name in the closing tag. */
  close: string
  /** Closed on its own line; such tags get their closing tag on Enter. */
  block: boolean
  /** Its body is shown verbatim, so it must not be indented. */
  verbatim: boolean
}

function pairing(name: string, head: string): Pairing | undefined {
  if (name === 'module') {
    const moduleName = /^module\s+(\w+)/.exec(head)?.[1]?.toLowerCase()
    const module = MODULES.find((m) => m.name.toLowerCase() === moduleName)
    return module?.body ? { close: 'module', block: true, verbatim: false } : undefined
  }
  const tag = TAGS.find((t) => t.name === name)
  if (!tag?.close) return undefined
  const close = tag.closeName ?? tag.name
  return { close, block: tag.close === 'block', verbatim: close === 'code' }
}

/** Whether the opening tag at `open` has a matching closing tag in `text`. */
function isClosed(text: string, open: number) {
  const stack: { name: string; start: number }[] = []
  for (const tag of scanTags(text)) {
    if (!tag.closing) {
      stack.push(tag)
      continue
    }
    const i = stack.map((t) => t.name).lastIndexOf(tag.name)
    if (i < 0) continue
    if (stack[i].start === open) return true
    stack.length = i
  }
  return false
}

const indentOf = (line: string) => /^[ \t]*/.exec(line)![0]

/**
 * The edit for Enter at `offset`, or undefined to leave Enter to the editor:
 * - right after an opening block tag, adds its closing tag below and indents the line between;
 *   if the tag is already closed, only indents the new line;
 * - between an opening tag and its closing tag, puts them on their own lines;
 * - in an unfinished tag (`[[div class="x"`), finishes it with `]]` first;
 * - in the attributes of a module, which may span lines, starts an indented line.
 */
export function enterEdit(text: string, offset: number, unit: string): EnterEdit | undefined {
  const before = text.slice(0, offset)
  const open = before.lastIndexOf('[[')
  if (open < 0 || text[open - 1] === '[' || text[open + 2] === '[') return undefined
  let head = before.slice(open + 2)
  let start = offset
  let finished = false
  const brackets = head.indexOf(']]')
  if (brackets >= 0) {
    // Only a tag that ends right before the cursor.
    if (!/^\]\][ \t]*$/.test(head.slice(brackets))) return undefined
    start = open + 2 + brackets + 2
    head = head.slice(0, brackets)
    finished = true
  }
  // An unfinished closing tag is finished too.
  const closing = !finished && /^\/[\w<>=]+$/.test(head)
  const name = closing ? undefined : NAME.exec(head)?.[0]
  if (!name && !closing) return undefined
  if (head.includes('\n') && name !== 'module') return undefined
  if (scan(text.slice(0, open)).raw) return undefined

  const lineEnd = (text.indexOf('\n', offset) + 1 || text.length + 1) - 1
  const lineOf = (at: number) => text.slice(text.lastIndexOf('\n', at - 1) + 1, at)
  const indent = indentOf(lineOf(open))
  let end = offset
  let prefix = ''

  if (!finished) {
    const quoted = (head.match(/"/g)?.length ?? 0) % 2 === 1
    if (name === 'module') {
      // Module attributes may go on several lines.
      if (quoted || !/^module\s+\w/.test(head)) return undefined
      start = offset - /[ \t]*$/.exec(head)![0].length
      const insert = `\n${indent}${unit}`
      return { start, end, text: insert, cursor: insert.length }
    }
    if (quoted) {
      // In an attribute value: end the value, unless the cursor is in the middle of it.
      if (text[offset] === '"') end++
      else if (text.slice(offset, lineEnd).includes('"')) return undefined
      prefix = '"'
    } else start = offset - /[ \t]*$/.exec(head)![0].length
    const brackets = /^[ \t]*\]\]/.exec(text.slice(end, lineEnd))
    if (brackets) end += brackets[0].length
    prefix += ']]'
  }

  const after = text.slice(end, lineEnd)
  const pair = name ? pairing(name, head) : undefined
  if (!pair) {
    // A finished tag that has no closing tag: a plain new line.
    if (finished) return undefined
    const insert = `${prefix}\n${indentOf(lineOf(offset))}`
    return { start, end, text: insert, cursor: insert.length }
  }
  const body = `\n${pair.verbatim ? '' : indent + unit}`
  const closeTag = `[[/${pair.close}]]`
  const space = /^[ \t]*/.exec(after)![0].length
  if (after.slice(space).startsWith(closeTag)) {
    const insert = `${prefix}${body}`
    return { start, end: end + space, text: `${insert}\n${indent}`, cursor: insert.length }
  }
  if (!pair.block) {
    if (finished) return undefined
    const insert = `${prefix}\n${indentOf(lineOf(offset))}`
    return { start, end, text: insert, cursor: insert.length }
  }
  if (isClosed(text, open)) {
    const insert = `${prefix}${body}`
    // Finishing a completed tag's head moves into its empty body line instead of adding one.
    const blank = !finished && !after.trim() && /^\n[ \t]*(?=\n|$)/.exec(text.slice(lineEnd))
    if (blank) return { start, end: lineEnd + blank[0].length, text: insert, cursor: insert.length }
    return { start, end: end + space, text: insert, cursor: insert.length }
  }
  const insert = `${prefix}${body}`
  return {
    start,
    end: lineEnd,
    text: `${insert}${after.trim()}\n${indent}${closeTag}`,
    cursor: insert.length,
  }
}

/**
 * Applies `enterEdit` on Enter. Listens to `keypress`, which only fires when no keybinding
 * (such as accepting a suggestion) took the Enter keydown, and after wikidot's own editor
 * script, which continues lists on keypress, had the chance to cancel it.
 */
export function bindEnter(
  editor: monaco.editor.IStandaloneCodeEditor,
  wrapper: HTMLElement,
  enabled: () => boolean,
): monaco.IDisposable {
  const onKeyPress = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.shiftKey || e.ctrlKey || e.altKey) return
    if (
      !enabled() ||
      !editor.hasTextFocus() ||
      editor.getOption(monaco.editor.EditorOption.readOnly)
    )
      return
    const model = editor.getModel()
    const selections = editor.getSelections()
    if (!model || selections?.length !== 1 || !selections[0].isEmpty()) return
    const { insertSpaces, indentSize } = model.getOptions()
    const unit = insertSpaces ? ' '.repeat(indentSize) : '\t'
    const edit = enterEdit(model.getValue(), model.getOffsetAt(selections[0].getPosition()), unit)
    if (!edit) return
    e.preventDefault()
    const range = monaco.Range.fromPositions(
      model.getPositionAt(edit.start),
      model.getPositionAt(edit.end),
    )
    editor.pushUndoStop()
    editor.executeEdits('wikidot-monaco.enter', [{ range, text: edit.text }])
    editor.setPosition(model.getPositionAt(edit.start + edit.cursor))
    editor.pushUndoStop()
    editor.revealPosition(editor.getPosition()!)
  }
  wrapper.addEventListener('keypress', onKeyPress, true)
  return { dispose: () => wrapper.removeEventListener('keypress', onKeyPress, true) }
}

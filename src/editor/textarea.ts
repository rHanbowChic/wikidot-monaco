// Makes a hidden <textarea> behave as a live view of a Monaco editor, so page scripts
// and community plugins that read/write `value`, the selection, scroll position or
// listen for key/input events keep working unchanged.
import { monaco } from './monaco'

type Editor = monaco.editor.IStandaloneCodeEditor

const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!
const OVERRIDDEN = [
  'value',
  'textLength',
  'selectionStart',
  'selectionEnd',
  'selectionDirection',
  'scrollTop',
  'scrollLeft',
  'scrollHeight',
  'scrollWidth',
  'setSelectionRange',
  'setRangeText',
  'select',
  'focus',
  'blur',
] as const

const KEY_EVENTS = ['keydown', 'keypress', 'keyup'] as const

export interface TextareaBinding {
  /** Inserts text at every cursor as if typed (used by the execCommand shim). */
  insertText(text: string): void
  dispose(): void
}

export function bindTextarea(
  textarea: HTMLTextAreaElement,
  editor: Editor,
  wrapper: HTMLElement,
): TextareaBinding {
  const model = editor.getModel()!
  // Programmatic changes must not emit `input`, matching native textarea behavior.
  let programmatic = 0
  const silently = (fn: () => void) => {
    programmatic++
    try {
      fn()
    } finally {
      programmatic--
    }
  }

  const length = () => model.getValueLength()
  const clamp = (n: unknown) => Math.min(Math.max(0, Math.trunc(Number(n)) || 0), length())
  const offsetAt = (p: monaco.IPosition) => model.getOffsetAt(p)
  const positionAt = (offset: number) => model.getPositionAt(offset)
  const selection = () => editor.getSelection() ?? new monaco.Selection(1, 1, 1, 1)

  function replaceRange(start: number, end: number, text: string) {
    model.pushStackElement()
    model.pushEditOperations(
      editor.getSelections(),
      [{ range: monaco.Range.fromPositions(positionAt(start), positionAt(end)), text }],
      () => null,
    )
    model.pushStackElement()
  }

  function setValue(raw: unknown) {
    const next = String(raw ?? '').replace(/\r\n?/g, '\n')
    const current = model.getValue()
    if (next === current) return
    // Replace only the changed span so undo history, folding and scroll survive.
    const max = Math.min(current.length, next.length)
    let start = 0
    while (start < max && current.charCodeAt(start) === next.charCodeAt(start)) start++
    let tail = 0
    while (
      tail < max - start &&
      current.charCodeAt(current.length - 1 - tail) === next.charCodeAt(next.length - 1 - tail)
    ) {
      tail++
    }
    // Never split a surrogate pair.
    if (start > 0 && /[\uD800-\uDBFF]/.test(current[start - 1])) start--
    if (tail > 0 && /[\uDC00-\uDFFF]/.test(current[current.length - tail])) tail--
    silently(() =>
      replaceRange(start, current.length - tail, next.slice(start, next.length - tail)),
    )
  }

  function setSelectionRange(start: unknown, end: unknown, direction?: string) {
    let a = clamp(start)
    const b = clamp(end)
    if (a > b) a = b
    const from = positionAt(a)
    const to = positionAt(b)
    editor.setSelection(
      direction === 'backward'
        ? monaco.Selection.fromPositions(to, from)
        : monaco.Selection.fromPositions(from, to),
    )
    editor.revealPositionInCenterIfOutsideViewport(direction === 'backward' ? from : to)
  }

  const selectionStart = () => offsetAt(selection().getStartPosition())
  const selectionEnd = () => offsetAt(selection().getEndPosition())
  const selectionDirection = () =>
    selection().getDirection() === monaco.SelectionDirection.RTL ? 'backward' : 'forward'

  function setRangeText(this: unknown, replacement: string, ...rest: unknown[]) {
    const [startArg, endArg, mode = 'preserve'] = rest
    const oldStart = selectionStart()
    const oldEnd = selectionEnd()
    let start = rest.length >= 2 ? clamp(startArg) : oldStart
    let end = rest.length >= 2 ? clamp(endArg) : oldEnd
    if (rest.length >= 2 && Number(startArg) > Number(endArg)) {
      throw new DOMException('The start index is larger than the end index.', 'IndexSizeError')
    }
    const text = String(replacement).replace(/\r\n?/g, '\n')
    silently(() => replaceRange(start, end, text))
    const newEnd = start + text.length
    const delta = text.length - (end - start)
    let selStart = start
    let selEnd = newEnd
    if (mode === 'start') selEnd = start
    else if (mode === 'end') selStart = newEnd
    else if (mode !== 'select') {
      selStart = oldStart > end ? oldStart + delta : oldStart > start ? start : oldStart
      selEnd = oldEnd > end ? oldEnd + delta : oldEnd > start ? newEnd : oldEnd
    }
    setSelectionRange(selStart, selEnd)
  }

  const define = (props: PropertyDescriptorMap) => {
    for (const [name, desc] of Object.entries(props)) {
      Object.defineProperty(textarea, name, { configurable: true, enumerable: true, ...desc })
    }
  }

  define({
    value: { get: () => model.getValue(), set: setValue },
    textLength: { get: length },
    selectionStart: {
      get: selectionStart,
      set: (v) => setSelectionRange(v, Math.max(clamp(v), selectionEnd()), selectionDirection()),
    },
    selectionEnd: {
      get: selectionEnd,
      set: (v) => setSelectionRange(Math.min(selectionStart(), clamp(v)), v, selectionDirection()),
    },
    selectionDirection: {
      get: selectionDirection,
      set: (v) => setSelectionRange(selectionStart(), selectionEnd(), v),
    },
    scrollTop: {
      get: () => editor.getScrollTop(),
      set: (v) => editor.setScrollTop(Number(v) || 0, monaco.editor.ScrollType.Immediate),
    },
    scrollLeft: {
      get: () => editor.getScrollLeft(),
      set: (v) => editor.setScrollLeft(Number(v) || 0, monaco.editor.ScrollType.Immediate),
    },
    scrollHeight: { get: () => editor.getScrollHeight() },
    scrollWidth: { get: () => editor.getScrollWidth() },
    setSelectionRange: { value: setSelectionRange, writable: true },
    setRangeText: { value: setRangeText, writable: true },
    select: { value: () => setSelectionRange(0, length()), writable: true },
    focus: { value: () => editor.focus(), writable: true },
    blur: {
      value: () => {
        if (editor.hasTextFocus()) (document.activeElement as HTMLElement | null)?.blur()
      },
      writable: true,
    },
  })

  const disposables: monaco.IDisposable[] = []

  // Keep the real form value in sync (FormData, form submission) and report user edits.
  disposables.push(
    model.onDidChangeContent(() => {
      nativeValue.set!.call(textarea, model.getValue())
      if (!programmatic) textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }),
  )

  // focus/blur/change, as a native textarea would fire them.
  let valueOnFocus = ''
  disposables.push(
    editor.onDidFocusEditorText(() => {
      valueOnFocus = model.getValue()
      textarea.dispatchEvent(new FocusEvent('focus'))
      textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    }),
    editor.onDidBlurEditorText(() => {
      textarea.dispatchEvent(new FocusEvent('blur'))
      textarea.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      if (model.getValue() !== valueOnFocus)
        textarea.dispatchEvent(new Event('change', { bubbles: true }))
    }),
    editor.onDidChangeCursorSelection((e) => {
      if (e.source !== 'api' && !e.selection.isEmpty())
        textarea.dispatchEvent(new Event('select', { bubbles: true }))
    }),
  )

  // Key events: replay each one on the textarea before Monaco sees it. A listener that
  // cancels the replay cancels the key for Monaco too. The original is stopped at the
  // wrapper so ancestors only receive the replayed copy (whose target is the textarea).
  const onKeyCapture = (e: KeyboardEvent) => {
    if (!editor.hasTextFocus()) return
    const copy = new KeyboardEvent(e.type, {
      key: e.key,
      code: e.code,
      location: e.location,
      repeat: e.repeat,
      isComposing: e.isComposing,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      bubbles: true,
      cancelable: true,
      composed: true,
    })
    // Legacy fields read by older libraries (YUI, jQuery hotkeys).
    Object.defineProperties(copy, {
      keyCode: { value: e.keyCode },
      charCode: { value: e.charCode },
      which: { value: e.which },
    })
    textarea.dispatchEvent(copy)
    if (copy.defaultPrevented) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const onKeyBubble = (e: KeyboardEvent) => {
    if (editor.hasTextFocus()) e.stopPropagation()
  }
  for (const type of KEY_EVENTS) {
    wrapper.addEventListener(type, onKeyCapture, true)
    wrapper.addEventListener(type, onKeyBubble)
  }

  // Scripts that write the textarea's text content (e.g. jQuery's .text()) expect the value to follow.
  const contentObserver = new MutationObserver(() => setValue(textarea.defaultValue))
  contentObserver.observe(textarea, { childList: true, characterData: true, subtree: true })

  // Mirror disabled/readonly.
  const syncReadOnly = () =>
    editor.updateOptions({ readOnly: textarea.disabled || textarea.readOnly })
  const attrObserver = new MutationObserver(syncReadOnly)
  attrObserver.observe(textarea, { attributes: true, attributeFilter: ['disabled', 'readonly'] })
  syncReadOnly()

  return {
    insertText(text) {
      editor.executeEdits(
        'execCommand',
        editor.getSelections()!.map((range) => ({ range, text, forceMoveMarkers: true })),
      )
      editor.pushUndoStop()
    },
    dispose() {
      contentObserver.disconnect()
      attrObserver.disconnect()
      for (const type of KEY_EVENTS) {
        wrapper.removeEventListener(type, onKeyCapture, true)
        wrapper.removeEventListener(type, onKeyBubble)
      }
      disposables.forEach((d) => d.dispose())
      const value = model.getValue()
      for (const name of OVERRIDDEN) delete (textarea as any)[name]
      nativeValue.set!.call(textarea, value)
    },
  }
}

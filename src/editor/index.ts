// Lazily loaded into the page (MAIN world) when a wikidot editor textarea or a
// `div.page-source` appears.
import { setLocale, t, tr, type Locale } from '../i18n'
import { EVENT_OPEN_OPTIONS, type Settings } from '../settings'
import { monaco } from './monaco'
import './style.css'
import { FROM_REVISION, TO_REVISION } from '../content/revisions'
import { readPageSource } from './pageSource'
import { chainTouchScroll } from './scrollChain'
import { fetchRevisionSource } from './revisions'
import { bindTextarea, type TextareaBinding } from './textarea'
import { completionOptions } from './wikidot/completion'
import { bindEnter } from './wikidot/enter'
import { LANGUAGE_ID, registerWikidot } from './wikidot/language'

interface Instance {
  editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IStandaloneDiffEditor
  /** Set for editable textareas; read-only source viewers have none. */
  binding?: TextareaBinding
  /** Reapplies the current settings. */
  configure(): void
  dispose(): void
}

/** Keyed by the replaced element: a textarea or a div.page-source. */
const instances = new Map<HTMLElement, Instance>()
const darkQuery = matchMedia('(prefers-color-scheme: dark)')
let settings: Settings

function applyTheme() {
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && darkQuery.matches)
  monaco.editor.setTheme(dark ? 'wikidot-dark' : 'wikidot-light')
}
darkQuery.addEventListener('change', () => settings && applyTheme())

function editorOptions(): monaco.editor.IEditorOptions {
  const auto = settings.completion === 'auto'
  // Half a line of space above the first line and below the last.
  const padding = Math.round((settings.fontSize * settings.lineHeight) / 2)
  return {
    fontSize: settings.fontSize,
    // Monaco reads values below 8 as a multiple of the font size.
    lineHeight: settings.lineHeight,
    padding: { top: padding, bottom: padding },
    wordWrap: settings.wordWrap ? 'on' : 'off',
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers ? 'on' : 'off',
    quickSuggestions: auto ? { other: 'on', comments: 'off', strings: 'on' } : false,
    suggestOnTriggerCharacters: auto,
  }
}

const OPEN_SETTINGS = t('Wikidot Monaco Settings', 'Wikidot Monaco 设置')
let settingsAction: monaco.IDisposable | undefined

/** Context menu item of every editor that opens the extension's settings page. */
function registerSettingsAction() {
  // Re-registered so the label follows the UI language.
  settingsAction?.dispose()
  settingsAction = monaco.editor.addEditorAction({
    id: 'wikidot-monaco.openSettings',
    label: tr(OPEN_SETTINGS),
    contextMenuGroupId: 'z_settings',
    // The page cannot open extension pages; the content script relays to the background.
    run: () => void window.dispatchEvent(new CustomEvent(EVENT_OPEN_OPTIONS)),
  })
}

export function configure(next: Settings, locale: Locale) {
  settings = next
  setLocale(locale)
  completionOptions.mode = next.completion
  completionOptions.closeTags = next.closeTags
  registerWikidot()
  registerSettingsAction()
  applyTheme()
  for (const instance of instances.values()) instance.configure()
}

/** Options shared by the read-only viewers; they never suggest. */
const VIEWER_OPTIONS: monaco.editor.IEditorOptions = {
  readOnly: true,
  domReadOnly: true,
  renderLineHighlight: 'none',
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
}

function viewerOptions(): monaco.editor.IEditorOptions {
  return { ...editorOptions(), quickSuggestions: false, suggestOnTriggerCharacters: false }
}

const BASE_OPTIONS: monaco.editor.IEditorOptions = {
  automaticLayout: true,
  fixedOverflowWidgets: true,
  scrollBeyondLastLine: false,
  // Let the page scroll once the editor reaches its top or bottom.
  scrollbar: { alwaysConsumeMouseWheel: false },
  // Every tag starts with `[[`; rainbow brackets would drown out tag highlighting.
  bracketPairColorization: { enabled: false },
}

/**
 * The width for a border-box wrapper that takes `element`'s place, as its stylesheets set it.
 * Call while `element` is hidden: the computed width of an element that isn't rendered keeps
 * percentages, where a rendered one's is in pixels and wouldn't follow the page's width.
 * `extra` is the padding and border to add to a content-box width.
 */
function widthOf(element: HTMLElement, extra: number) {
  const style = getComputedStyle(element)
  const width = style.width
  // `auto`, `fit-content` and the like: fill the line, as before.
  if (!/\d/.test(width)) return '100%'
  return style.boxSizing === 'border-box' || !extra ? width : `calc(${width} + ${extra}px)`
}

/** Hides `element` and puts an empty wrapper for an editor in its place. */
function cover(element: HTMLElement, height: number) {
  const wrapper = document.createElement('div')
  wrapper.className = 'wikidot-monaco'
  wrapper.style.height = `${height}px`
  // Padding and border in pixels, while `element` is still rendered.
  const style = getComputedStyle(element)
  const extra = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
    .map((side) => parseFloat(style[side as keyof CSSStyleDeclaration] as string) || 0)
    .reduce((a, b) => a + b)
  const previousDisplay = element.style.display
  element.style.display = 'none'
  wrapper.style.width = widthOf(element, extra)
  element.after(wrapper)
  const uncover = () => {
    wrapper.remove()
    element.style.display = previousDisplay
    instances.delete(element)
  }
  return { wrapper, uncover }
}

function createModel(value: string) {
  const model = monaco.editor.createModel(value, LANGUAGE_ID)
  model.setEOL(monaco.editor.EndOfLineSequence.LF)
  model.updateOptions({ tabSize: 4 })
  return model
}

/** Hides `element` and mounts a Monaco editor in its place. */
function mount(
  element: HTMLElement,
  value: string,
  height: number,
  options: monaco.editor.IStandaloneEditorConstructionOptions,
) {
  const { wrapper, uncover } = cover(element, height)
  const model = createModel(value)
  const editor = monaco.editor.create(wrapper, {
    model,
    ...BASE_OPTIONS,
    ...options,
    ...editorOptions(),
  })
  const unchain = chainTouchScroll(wrapper, () => [editor])
  const unmount = () => {
    unchain()
    editor.dispose()
    model.dispose()
    uncover()
  }
  return { editor, wrapper, unmount }
}

/** Options of editable editors that follow the settings. */
function textareaOptions(): monaco.editor.IEditorOptions {
  // wikidot's own editor script handles list continuation on Enter; with tag Enter on, other
  // lines keep their indentation, as in the body of an indented tag.
  return { ...editorOptions(), autoIndent: settings.tagEnter ? 'keep' : 'none' }
}

const TO_TEXTAREA = t('Switch to Plain Textarea', '切换到纯文本框')
const TO_MONACO = t('Switch to the Monaco editor', '切换到 Monaco 编辑器')

/** Textareas switched back to plain, each with what removes its button to switch again. */
const plain = new Map<HTMLTextAreaElement, () => void>()

/**
 * Puts a link that switches back to Monaco next to wikidot's -/+ links under the textarea,
 * as one more `a` in their `div.change-textarea-size` so site styles for them apply.
 */
function addMonacoButton(textarea: HTMLTextAreaElement) {
  const form = textarea.closest('form')
  let sizes = form?.querySelector<HTMLElement>('.change-textarea-size')
  const created = !sizes
  if (!sizes) {
    sizes = document.createElement('div')
    sizes.className = 'change-textarea-size'
    // The textarea sits in a div of its own in wikidot's forms.
    const parent = textarea.parentElement
    ;(parent && parent !== form && parent.children.length === 1 ? parent : textarea).after(sizes)
  }
  // Spaced from the -/+ links like they are from each other.
  const space = document.createTextNode(created ? '' : ' ')
  const button = document.createElement('a')
  button.href = 'javascript:;'
  button.className = 'wikidot-monaco-switch'
  button.textContent = 'Monaco'
  button.title = tr(TO_MONACO)
  sizes.append(space, button)
  const remove = () => {
    plain.delete(textarea)
    if (created) sizes.remove()
    else (button.remove(), space.remove())
  }
  button.addEventListener('click', (e) => {
    e.preventDefault()
    const { selectionStart, selectionEnd } = textarea
    remove()
    attach(textarea)
    const editor = instances.get(textarea)?.editor as monaco.editor.IStandaloneCodeEditor
    const model = editor?.getModel()
    if (!model) return
    editor.setSelection(
      monaco.Range.fromPositions(
        model.getPositionAt(selectionStart),
        model.getPositionAt(selectionEnd),
      ),
    )
    editor.revealRangeInCenterIfOutsideViewport(editor.getSelection()!)
    editor.focus()
  })
  plain.set(textarea, remove)
}

/** Replaces the editor with the textarea it covers, keeping the selection. */
function switchToTextarea(textarea: HTMLTextAreaElement) {
  const instance = instances.get(textarea)
  const editor = instance?.editor as monaco.editor.IStandaloneCodeEditor | undefined
  const model = editor?.getModel()
  const selection = editor?.getSelection()
  const [start, end] =
    selection && model
      ? [
          model.getOffsetAt(selection.getStartPosition()),
          model.getOffsetAt(selection.getEndPosition()),
        ]
      : [0, 0]
  instance?.dispose()
  addMonacoButton(textarea)
  textarea.focus()
  textarea.setSelectionRange(start, end)
}

export function attach(textarea: HTMLTextAreaElement) {
  if (instances.has(textarea) || plain.has(textarea)) return
  const { editor, wrapper, unmount } = mount(
    textarea,
    textarea.value,
    Math.max(textarea.offsetHeight, 320),
    {
      ...textareaOptions(),
      insertSpaces: false,
      tabSize: 4,
      wordBasedSuggestions: 'off',
      // A real <textarea> as the input surface is what other scripts expect to see focused.
      editContext: false,
    },
  )
  const binding = bindTextarea(textarea, editor, wrapper)
  // After the binding, so wikidot's own Enter handling comes first.
  const enter = bindEnter(editor, wrapper, () => settings.tagEnter)
  const switchAction = editor.addAction({
    id: 'wikidot-monaco.switchToTextarea',
    label: tr(TO_TEXTAREA),
    contextMenuGroupId: 'z_settings',
    contextMenuOrder: 0,
    // Not while the action runs: it disposes the editor that runs it.
    run: () => void setTimeout(() => switchToTextarea(textarea)),
  })
  instances.set(textarea, {
    editor,
    binding,
    configure: () => editor.updateOptions(textareaOptions()),
    dispose() {
      switchAction.dispose()
      enter.dispose()
      binding.dispose()
      unmount()
    },
  })
}

const VIEWER_MIN_HEIGHT = 120

/** Sizes a viewer's wrapper to fit `contentHeight`, up to most of the viewport. */
function fitViewer(wrapper: HTMLElement, contentHeight: number) {
  const max = Math.max(VIEWER_MIN_HEIGHT, Math.round(window.innerHeight * 0.75))
  wrapper.style.height = `${Math.min(Math.max(contentHeight + 2, VIEWER_MIN_HEIGHT), max)}px`
}

/**
 * Shows a `div.page-source` in a read-only editor, or a revision diff (`div.inline-diff`)
 * in a diff editor; the div stays in the page, hidden.
 */
export function attachViewer(div: HTMLElement) {
  if (instances.has(div)) return
  if (div.classList.contains('inline-diff')) return attachDiff(div)
  const { editor, wrapper, unmount } = mount(
    div,
    readPageSource(div),
    VIEWER_MIN_HEIGHT,
    VIEWER_OPTIONS,
  )
  // The wrapper stays user-resizable.
  const fit = () => fitViewer(wrapper, editor.getContentHeight())
  fit()
  const sizeListener = editor.onDidContentSizeChange((e) => e.contentHeightChanged && fit())
  instances.set(div, {
    editor,
    configure: () => editor.updateOptions(viewerOptions()),
    dispose() {
      sizeListener.dispose()
      unmount()
    },
  })
}

function diffOptions(): monaco.editor.IDiffEditorOptions {
  return { ...viewerOptions(), renderSideBySide: settings.diffView === 'sideBySide' }
}

/** Replaces wikidot's inline diff of two revisions with a side-by-side or inline diff editor. */
function attachDiff(div: HTMLElement) {
  const { wrapper, uncover } = cover(div, VIEWER_MIN_HEIGHT)
  const editor = monaco.editor.createDiffEditor(wrapper, {
    ...BASE_OPTIONS,
    ...VIEWER_OPTIONS,
    originalEditable: false,
    // Fold the unchanged parts of long pages around the changes.
    hideUnchangedRegions: { enabled: true },
    // The view is a setting; don't switch to inline in wikidot's narrow content column.
    useInlineViewWhenSpaceIsLimited: false,
    ...diffOptions(),
  })
  const unchain = chainTouchScroll(wrapper, () => [
    editor.getOriginalEditor(),
    editor.getModifiedEditor(),
  ])
  let models: monaco.editor.ITextModel[] = []
  let disposed = false
  const show = (before: string, after: string) => {
    if (disposed) return
    models = [createModel(before), createModel(after)]
    editor.setModel({ original: models[0], modified: models[1] })
  }
  // wikidot's diff HTML loses line breaks around whole deleted or inserted lines; prefer the
  // exact sources of both revisions and fall back to the HTML.
  const fromHtml = () => show(readPageSource(div, 'INS'), readPageSource(div, 'DEL'))
  const from = div.getAttribute(FROM_REVISION)
  const to = div.getAttribute(TO_REVISION)
  if (from && to) {
    Promise.all([fetchRevisionSource(from), fetchRevisionSource(to)]).then(
      ([before, after]) => show(before, after),
      (error) => {
        console.warn('[wikidot-monaco] failed to load revisions', error)
        fromHtml()
      },
    )
  } else fromHtml()
  // In side-by-side view both sides are padded to the same height; inline, the modified
  // side also holds the deleted lines.
  const fit = () =>
    fitViewer(
      wrapper,
      Math.max(
        editor.getOriginalEditor().getContentHeight(),
        editor.getModifiedEditor().getContentHeight(),
      ),
    )
  fit()
  const sizeListeners = [editor.getOriginalEditor(), editor.getModifiedEditor()].map((side) =>
    side.onDidContentSizeChange((e) => e.contentHeightChanged && fit()),
  )
  instances.set(div, {
    editor,
    configure: () => editor.updateOptions(diffOptions()),
    dispose() {
      disposed = true
      for (const listener of sizeListeners) listener.dispose()
      unchain()
      editor.dispose()
      for (const model of models) model.dispose()
      uncover()
    },
  })
}

/** Drops editors whose element has left the document (wikidot removes forms and panels via AJAX). */
export function prune() {
  for (const [element, instance] of instances) if (!element.isConnected) instance.dispose()
  for (const [textarea, remove] of plain) if (!textarea.isConnected) remove()
}

export function detachAll() {
  for (const instance of [...instances.values()]) instance.dispose()
  for (const remove of [...plain.values()]) remove()
}

// Scripts often insert text with execCommand('insertText') after focusing the textarea;
// route that into the focused editor.
const nativeExecCommand = document.execCommand
document.execCommand = function (command: string, showUI?: boolean, value?: string) {
  if (command.toLowerCase() === 'inserttext') {
    for (const instance of instances.values()) {
      if (instance.binding && instance.editor.hasTextFocus()) {
        instance.binding.insertText(String(value ?? ''))
        return true
      }
    }
  }
  return nativeExecCommand.call(this, command, showUI, value)
}

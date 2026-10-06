// Lazily loaded into the page (MAIN world) when a wikidot editor textarea or a
// `div.page-source` appears.
import { setLocale, type Locale } from '../i18n'
import type { Settings } from '../settings'
import { monaco } from './monaco'
import './style.css'
import { readPageSource } from './pageSource'
import { bindTextarea, type TextareaBinding } from './textarea'
import { completionOptions } from './wikidot/completion'
import { LANGUAGE_ID, registerWikidot } from './wikidot/language'

interface Instance {
  editor: monaco.editor.IStandaloneCodeEditor
  /** Set for editable textareas; read-only source viewers have none. */
  binding?: TextareaBinding
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
  return {
    fontSize: settings.fontSize,
    wordWrap: settings.wordWrap ? 'on' : 'off',
    minimap: { enabled: settings.minimap },
    quickSuggestions: auto ? { other: 'on', comments: 'off', strings: 'on' } : false,
    suggestOnTriggerCharacters: auto,
  }
}

export function configure(next: Settings, locale: Locale) {
  settings = next
  setLocale(locale)
  completionOptions.mode = next.completion
  completionOptions.closeTags = next.closeTags
  registerWikidot()
  applyTheme()
  for (const { editor, binding } of instances.values()) {
    const options = editorOptions()
    // Viewers never suggest.
    editor.updateOptions(
      binding
        ? options
        : { ...options, quickSuggestions: false, suggestOnTriggerCharacters: false },
    )
  }
}

/** Hides `element` and mounts a Monaco editor in its place. */
function mount(
  element: HTMLElement,
  value: string,
  height: number,
  options: monaco.editor.IStandaloneEditorConstructionOptions,
) {
  const wrapper = document.createElement('div')
  wrapper.className = 'wikidot-monaco'
  wrapper.style.width = element.style.width || '100%'
  wrapper.style.height = `${height}px`
  element.after(wrapper)
  const previousDisplay = element.style.display
  element.style.display = 'none'

  const model = monaco.editor.createModel(value, LANGUAGE_ID)
  model.setEOL(monaco.editor.EndOfLineSequence.LF)
  const editor = monaco.editor.create(wrapper, {
    model,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    scrollBeyondLastLine: false,
    // Every tag starts with `[[`; rainbow brackets would drown out tag highlighting.
    bracketPairColorization: { enabled: false },
    ...options,
    ...editorOptions(),
  })
  const unmount = () => {
    editor.dispose()
    model.dispose()
    wrapper.remove()
    element.style.display = previousDisplay
    instances.delete(element)
  }
  return { editor, wrapper, unmount }
}

export function attach(textarea: HTMLTextAreaElement) {
  if (instances.has(textarea)) return
  const { editor, wrapper, unmount } = mount(
    textarea,
    textarea.value,
    Math.max(textarea.offsetHeight, 320),
    {
      // wikidot's own editor script handles list continuation on Enter.
      autoIndent: 'none',
      insertSpaces: false,
      tabSize: 4,
      wordBasedSuggestions: 'off',
      // A real <textarea> as the input surface is what other scripts expect to see focused.
      editContext: false,
    },
  )
  const binding = bindTextarea(textarea, editor, wrapper)
  instances.set(textarea, {
    editor,
    binding,
    dispose() {
      binding.dispose()
      unmount()
    },
  })
}

const VIEWER_MIN_HEIGHT = 120

/** Shows a `div.page-source` in a read-only editor; the div stays in the page, hidden. */
export function attachViewer(div: HTMLElement) {
  if (instances.has(div)) return
  const { editor, wrapper, unmount } = mount(div, readPageSource(div), VIEWER_MIN_HEIGHT, {
    readOnly: true,
    domReadOnly: true,
    tabSize: 4,
    renderLineHighlight: 'none',
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
  })
  // Fit the content, up to most of the viewport; the wrapper stays user-resizable.
  const fit = () => {
    const max = Math.max(VIEWER_MIN_HEIGHT, Math.round(window.innerHeight * 0.75))
    wrapper.style.height = `${Math.min(Math.max(editor.getContentHeight() + 2, VIEWER_MIN_HEIGHT), max)}px`
  }
  fit()
  const sizeListener = editor.onDidContentSizeChange((e) => e.contentHeightChanged && fit())
  instances.set(div, {
    editor,
    dispose() {
      sizeListener.dispose()
      unmount()
    },
  })
}

/** Drops editors whose element has left the document (wikidot removes forms and panels via AJAX). */
export function prune() {
  for (const [element, instance] of instances) if (!element.isConnected) instance.dispose()
}

export function detachAll() {
  for (const instance of [...instances.values()]) instance.dispose()
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

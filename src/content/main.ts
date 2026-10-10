// Runs in the page (MAIN) world so the textarea patches are visible to page scripts.
// Watches for wikidot editor textareas and source views, and loads Monaco only when one appears.
import { setLocale } from '../i18n'
import { DEFAULT_SETTINGS, EVENT_READY, EVENT_SETTINGS, type SettingsMessage } from '../settings'
import { installRevisionTagging } from './revisions'
import { installTimeout } from './timeout'

type EditorModule = typeof import('../editor')

const TEXTAREA_SELECTOR = ':is(#new-post-form, #edit-post-form) textarea#np-text, textarea#edit-page-textarea'
const SOURCE_SELECTOR = 'div.page-source'

let message: SettingsMessage | null = null
let editor: Promise<EditorModule> | null = null
let loaded: EditorModule | null = null

function loadStylesheet(href: string) {
  return new Promise<void>((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = link.onerror = () => resolve()
    document.head.append(link)
  })
}

function loadEditor({ editorUrl, cssUrl }: SettingsMessage) {
  editor ??= Promise.all([
    import(/* @vite-ignore */ editorUrl) as Promise<EditorModule>,
    loadStylesheet(cssUrl),
  ]).then(([module]) => {
    loaded = module
    module.configure(message!.settings, message!.locale)
    return module
  })
  return editor
}

let scanQueued = false

function scan() {
  scanQueued = false
  loaded?.prune()
  if (!message?.settings.enabled) return
  const textareas = document.querySelectorAll<HTMLTextAreaElement>(TEXTAREA_SELECTOR)
  const sources = document.querySelectorAll<HTMLElement>(SOURCE_SELECTOR)
  if (textareas.length === 0 && sources.length === 0) return
  loadEditor(message).then(
    (module) => {
      textareas.forEach((textarea) => textarea.isConnected && module.attach(textarea))
      sources.forEach((div) => div.isConnected && module.attachViewer(div))
    },
    (error) => console.error('[wikidot-monaco] failed to load editor', error),
  )
}

function queueScan() {
  if (scanQueued) return
  scanQueued = true
  setTimeout(scan, 50)
}

window.addEventListener(EVENT_SETTINGS, (event) => {
  message = JSON.parse((event as CustomEvent<string>).detail) as SettingsMessage
  setLocale(message.locale)
  if (loaded) {
    loaded.configure(message.settings, message.locale)
    if (!message.settings.enabled) loaded.detachAll()
  }
  queueScan()
})
window.dispatchEvent(new CustomEvent(EVENT_READY))

// init.combined.js is a blocking script in <head>, so YAHOO exists by DOMContentLoaded.
document.addEventListener('DOMContentLoaded', () => {
  installTimeout(() => (message?.settings ?? DEFAULT_SETTINGS).saveTimeout)
  installRevisionTagging()
})

new MutationObserver(queueScan).observe(document, { childList: true, subtree: true })

// Runs in the isolated world: reads extension settings and forwards them to the
// page world, where the editor lives (it must share the page's view of the textarea).
import { uiLocale } from '../i18n'
import {
  EVENT_READY,
  EVENT_SETTINGS,
  normalizeSettings,
  type Settings,
  type SettingsMessage,
} from '../settings'

const load = () =>
  new Promise<Settings>((resolve) =>
    chrome.storage.sync.get(null, (raw) => resolve(normalizeSettings(raw as Partial<Settings>))),
  )

let current = load()

function send(settings: Settings) {
  const message: SettingsMessage = {
    settings,
    locale: uiLocale(),
    editorUrl: chrome.runtime.getURL('editor/editor.js'),
    cssUrl: chrome.runtime.getURL('editor/editor.css'),
  }
  // Only primitives survive the world boundary, so the payload travels as JSON.
  window.dispatchEvent(new CustomEvent(EVENT_SETTINGS, { detail: JSON.stringify(message) }))
}

// Either side may load first: send once ready, and answer whenever the page side asks.
current.then(send)
window.addEventListener(EVENT_READY, () => current.then(send))

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area !== 'sync') return
  current = load()
  current.then(send)
})

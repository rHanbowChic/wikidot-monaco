// Runs in the isolated world: reads extension settings and forwards them to the
// page world, where the editor lives (it must share the page's view of the textarea).
import { uiLocale } from '../i18n'
import {
  EVENT_OPEN_OPTIONS,
  EVENT_READY,
  EVENT_SET_SITE_THEME,
  EVENT_SETTINGS,
  MESSAGE_OPEN_OPTIONS,
  readStorage,
  SITE_THEMES_KEY,
  THEME_MODES,
  type Settings,
  type SettingsMessage,
  type ThemeMode,
} from '../settings'

const site = location.hostname

const readAll = () =>
  new Promise<ReturnType<typeof readStorage>>((resolve) =>
    chrome.storage.sync.get(null, (raw) => resolve(readStorage(raw))),
  )

/** The settings, with this site's own theme in place of the default. */
const load = () =>
  readAll().then(({ settings, siteThemes }) => ({
    ...settings,
    theme: siteThemes[site] ?? settings.theme,
  }))

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

// The editor's "Settings" menu item; only the background may open the options page.
window.addEventListener(EVENT_OPEN_OPTIONS, () => chrome.runtime.sendMessage(MESSAGE_OPEN_OPTIONS))

// The editor's theme items in the context menu: remember the theme for this site only.
window.addEventListener(EVENT_SET_SITE_THEME, async (event) => {
  const theme = (event as CustomEvent<string>).detail as ThemeMode
  if (!THEME_MODES.includes(theme)) return
  const { siteThemes } = await readAll()
  chrome.storage.sync.set({ [SITE_THEMES_KEY]: { ...siteThemes, [site]: theme } })
})

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area !== 'sync') return
  current = load()
  current.then(send)
})

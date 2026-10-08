import { setLocale, tr, uiLocale } from '../i18n'
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../settings'
import './index.css'
import { MESSAGES, type MessageKey } from './messages'

const locale = uiLocale()
setLocale(locale)
document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
  // Odd parts sit between backticks and become <code>.
  const parts = tr(MESSAGES[element.dataset.i18n as MessageKey]).split('`')
  element.replaceChildren(
    ...parts.map((part, i) => {
      if (i % 2 === 0) return part
      const code = document.createElement('code')
      code.textContent = part
      return code
    }),
  )
}

const form = document.getElementById('settings') as HTMLFormElement
const status = document.getElementById('status')!
const reset = document.getElementById('reset')!

function render(settings: Settings) {
  for (const [key, value] of Object.entries(settings)) {
    const field = form.elements.namedItem(key)
    if (field instanceof HTMLInputElement && field.type === 'checkbox')
      field.checked = Boolean(value)
    else if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      field.value = String(value)
    }
  }
}

/** The field's value rounded to its step and clamped to its min/max, or the default when it is not a number. */
function number(field: HTMLInputElement, fallback: number) {
  const step = Number(field.step) || 1
  // toFixed drops the float error of e.g. 15 * 0.1.
  const value = Number((Math.round(Number(field.value) / step) * step).toFixed(2))
  if (field.value === '' || !Number.isFinite(value)) return fallback
  return Math.min(Math.max(value, Number(field.min)), Number(field.max))
}

function read(): Settings {
  const get = (name: string) => form.elements.namedItem(name) as HTMLInputElement
  return {
    enabled: get('enabled').checked,
    completion: get('completion').value as Settings['completion'],
    closeTags: get('closeTags').checked,
    theme: get('theme').value as Settings['theme'],
    fontSize: number(get('fontSize'), DEFAULT_SETTINGS.fontSize),
    lineHeight: number(get('lineHeight'), DEFAULT_SETTINGS.lineHeight),
    wordWrap: get('wordWrap').checked,
    minimap: get('minimap').checked,
    diffView: get('diffView').value as Settings['diffView'],
    saveTimeout: number(get('saveTimeout'), DEFAULT_SETTINGS.saveTimeout),
  }
}

let statusTimer: number | undefined

function save(settings: Settings) {
  chrome.storage.sync.set(settings, () => {
    status.textContent = tr(MESSAGES.saved)
    clearTimeout(statusTimer)
    statusTimer = window.setTimeout(() => (status.textContent = ''), 1500)
  })
}

chrome.storage.sync.get(null, (raw) => render(normalizeSettings(raw as Partial<Settings>)))
form.addEventListener('change', () => {
  const settings = read()
  render(settings) // show clamped numbers
  save(settings)
})
reset.addEventListener('click', () => {
  render(DEFAULT_SETTINGS)
  save(DEFAULT_SETTINGS)
})

import { setLocale, tr, uiLocale } from '../i18n'
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../settings'
import './index.css'
import { MESSAGES, type MessageKey } from './messages'

const locale = uiLocale()
setLocale(locale)
document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
  // `code` and **bold** become <code> and <strong>; the split keeps them as their own parts.
  const parts = tr(MESSAGES[element.dataset.i18n as MessageKey]).split(/(`[^`]*`|\*\*[^*]*\*\*)/)
  element.replaceChildren(
    ...parts.map((part) => {
      const tag = part.startsWith('`') ? 'code' : part.startsWith('**') ? 'strong' : null
      if (!tag) return part
      const node = document.createElement(tag)
      node.textContent = part.slice(tag === 'code' ? 1 : 2, tag === 'code' ? -1 : -2)
      return node
    }),
  )
}

for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
  element.setAttribute('aria-label', tr(MESSAGES[element.dataset.i18nLabel as MessageKey]))
}

// Categories: the menu shows one section at a time, chosen by the URL hash.
const nav = document.getElementById('nav')!
const navToggle = nav.querySelector<HTMLButtonElement>('.nav-toggle')!
const navCurrent = document.getElementById('nav-current')!
const sections = [...document.querySelectorAll<HTMLElement>('section[data-category]')]
const links = [...nav.querySelectorAll<HTMLAnchorElement>('#nav-list a')]

function setMenuOpen(open: boolean) {
  nav.classList.toggle('open', open)
  navToggle.setAttribute('aria-expanded', String(open))
}

function showCategory(name: string) {
  const current = sections.find((s) => s.dataset.category === name) ?? sections[0]
  for (const section of sections) section.hidden = section !== current
  for (const link of links) {
    const selected = link.hash === `#${current.dataset.category}`
    if (selected) {
      link.setAttribute('aria-current', 'page')
      navCurrent.textContent = link.textContent
    } else link.removeAttribute('aria-current')
  }
  setMenuOpen(false)
}

showCategory(location.hash.slice(1))
window.addEventListener('hashchange', () => showCategory(location.hash.slice(1)))
navToggle.addEventListener('click', () => setMenuOpen(!nav.classList.contains('open')))
// Choosing the current category changes no hash, so close the menu here too.
for (const link of links) link.addEventListener('click', () => setMenuOpen(false))
nav.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    setMenuOpen(false)
    navToggle.focus()
  }
})

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
    lineNumbers: get('lineNumbers').checked,
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
// Restoring defaults affects every category, including hidden ones, so ask first.
const resetConfirm = document.getElementById('reset-confirm')!
const resetYes = document.getElementById('reset-yes')!
const resetNo = document.getElementById('reset-no')!

function setConfirming(confirming: boolean) {
  resetConfirm.hidden = !confirming
  reset.hidden = confirming
  // Focus the safe choice, so a stray Enter does not reset.
  ;(confirming ? resetNo : reset).focus()
}

reset.addEventListener('click', () => setConfirming(true))
resetNo.addEventListener('click', () => setConfirming(false))
resetConfirm.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setConfirming(false)
})
resetYes.addEventListener('click', () => {
  setConfirming(false)
  render(DEFAULT_SETTINGS)
  save(DEFAULT_SETTINGS)
})

import type { Locale } from './i18n'

export type CompletionMode = 'auto' | 'manual' | 'off'
export type ThemeMode = 'auto' | 'light' | 'dark'
export type DiffView = 'sideBySide' | 'inline'

export interface Settings {
  /** Replace the wikidot textarea with Monaco. */
  enabled: boolean
  /** auto: suggest while typing; manual: only on Ctrl+Space; off: never. */
  completion: CompletionMode
  /** Insert the matching [[/tag]] when completing a block tag. */
  closeTags: boolean
  theme: ThemeMode
  fontSize: number
  /** Line height as a multiple of the font size. */
  lineHeight: number
  wordWrap: boolean
  minimap: boolean
  lineNumbers: boolean
  /** How revision diffs (page history) are shown. */
  diffView: DiffView
  /** Seconds before a hanging wikidot save (or other ajax action) is given up; 0: never. */
  saveTimeout: number
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  completion: 'auto',
  closeTags: true,
  theme: 'auto',
  fontSize: 14,
  lineHeight: 1.5,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
  diffView: 'sideBySide',
  saveTimeout: 30,
}

export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...raw }
}

/** Events used to pass settings from the isolated world to the page (MAIN) world. */
export const EVENT_SETTINGS = 'wikidot-monaco:settings'
export const EVENT_READY = 'wikidot-monaco:ready'

export interface SettingsMessage {
  settings: Settings
  /** UI language; the page world has no access to chrome.i18n. */
  locale: Locale
  /** URL of the lazily loaded editor module (ES module, web accessible). */
  editorUrl: string
  /** URL of the editor stylesheet. */
  cssUrl: string
}

import type { Locale } from './i18n'

export type CompletionMode = 'auto' | 'manual' | 'off'
export type ThemeMode = 'auto' | 'light' | 'dark'

export interface Settings {
  /** Replace the wikidot textarea with Monaco. */
  enabled: boolean
  /** auto: suggest while typing; manual: only on Ctrl+Space; off: never. */
  completion: CompletionMode
  /** Insert the matching [[/tag]] when completing a block tag. */
  closeTags: boolean
  theme: ThemeMode
  fontSize: number
  wordWrap: boolean
  minimap: boolean
  /** Seconds before a hanging wikidot save (or other ajax action) is given up; 0: never. */
  saveTimeout: number
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  completion: 'auto',
  closeTags: true,
  theme: 'auto',
  fontSize: 14,
  wordWrap: true,
  minimap: false,
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

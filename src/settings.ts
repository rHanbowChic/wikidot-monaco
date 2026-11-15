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
  /** Enter around `[[tags]]` adds closing tags and indents, and new lines keep their indentation. */
  tagEnter: boolean
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
  tagEnter: false,
  theme: 'auto',
  fontSize: 14,
  lineHeight: 1.5,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
  diffView: 'sideBySide',
  saveTimeout: 30,
}

/**
 * Themes chosen for single sites from the editor's context menu, by hostname. Stored under
 * their own key beside the settings: the options form only removes entries.
 */
export type SiteThemes = Record<string, ThemeMode>
export const SITE_THEMES_KEY = 'siteThemes'

export const THEME_MODES: readonly ThemeMode[] = ['auto', 'light', 'dark']

/** Splits what `chrome.storage.sync.get(null)` returned into the settings and the site themes. */
export function readStorage(raw: Record<string, unknown> | undefined) {
  const { [SITE_THEMES_KEY]: siteThemes, ...settings } = raw ?? {}
  return {
    settings: normalizeSettings(settings as Partial<Settings>),
    siteThemes: { ...(siteThemes as SiteThemes | undefined) },
  }
}

export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...raw }
}

/** Events used to pass settings from the isolated world to the page (MAIN) world. */
export const EVENT_SETTINGS = 'wikidot-monaco:settings'
export const EVENT_READY = 'wikidot-monaco:ready'
/** From the page world: open the settings page (only the background can). */
export const EVENT_OPEN_OPTIONS = 'wikidot-monaco:open-options'
/** From the page world: use this theme (detail: a ThemeMode) on the current site. */
export const EVENT_SET_SITE_THEME = 'wikidot-monaco:set-site-theme'
/** Runtime message from the content script to the background. */
export const MESSAGE_OPEN_OPTIONS = 'open-options'

export interface SettingsMessage {
  /** `theme` is the current site's own theme where it has one, else the default. */
  settings: Settings
  /** UI language; the page world has no access to chrome.i18n. */
  locale: Locale
  /** URL of the lazily loaded editor module (ES module, web accessible). */
  editorUrl: string
  /** URL of the editor stylesheet. */
  cssUrl: string
}

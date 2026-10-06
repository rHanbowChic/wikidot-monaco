// UI strings follow the browser's UI language: Chinese for zh-CN / zh-TW, English for
// everything else.

export type Locale = 'en' | 'zh'

/** A string in every supported locale. */
export interface Text {
  en: string
  zh: string
}

export const t = (en: string, zh: string): Text => ({ en, zh })

/**
 * The locale the browser picked from _locales for its UI language, so extension pages,
 * the manifest and the editor always agree. Only callable in extension contexts.
 */
export function uiLocale(): Locale {
  return chrome.i18n.getMessage('locale') === 'zh' ? 'zh' : 'en'
}

let current: Locale = 'en'

export function setLocale(locale: Locale) {
  current = locale
}

export function tr(text: Text): string {
  return text[current]
}

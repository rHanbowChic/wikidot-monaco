// Ctrl+click links for page names: `[[include page]]` / `[[include :site:page]]`,
// `[[[page|text]]]` and `[/path text]`. Local pages open on the current site; `:site:` opens
// site.wikidot.com.
// Plain URLs, including `[[[https://…|text]]]`, are already linked by Monaco.
import { t, tr } from '../../i18n'
import { monaco } from '../monaco'

const OPEN_PAGE = t('Open page', '打开页面')

const INCLUDE = /\[\[include\s+([^\s|\]]+)/gi
const PAGE_LINK = /\[\[\[([^\]|\n]+)(?:\|[^\]\n]*)?\]\]\]/g
// `[/path text]`, also with `*` before the path; not the `[/div]` inside `[[/div]]`.
const PATH_LINK = /(?<!\[)\[\*?(\/[^\s\]]*)[^\]\n]*\](?!\])/g
const CROSS_SITE = /^:([\w-]+):(.+)$/
const URL_SCHEME = /^[a-z][\w+.-]*:\/\//i

/** The page name wikidot derives from a link target, e.g. `Some Page` → `some-page`. */
export function toUnixName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '-')
    .replace(/^_/, ':_')
    .replace(/(?<!:)_/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/:{2,}/g, ':')
    .replace(/:-|-:/g, ':')
    .replace(/_-|-_/g, '_')
    .replace(/^:|:$/g, '')
}

/** URL of a page name, with an optional `#anchor`, on the current site. */
function pageUrl(target: string): string | null {
  const hash = target.indexOf('#')
  const name = toUnixName(hash < 0 ? target : target.slice(0, hash))
  if (!name) return null
  const anchor = hash < 0 ? '' : target.slice(hash)
  return new URL(`/${name}${anchor}`, location.href).href
}

function includeUrl(target: string): string | null {
  const crossSite = CROSS_SITE.exec(target)
  if (!crossSite) return pageUrl(target)
  const [, site, page] = crossSite
  const name = toUnixName(page)
  return name ? `https://${site.toLowerCase()}.wikidot.com/${name}` : null
}

function linkUrl(target: string): string | null {
  target = target.replace(/^\*/, '') // `*` opens in a new window
  if (URL_SCHEME.test(target)) return null
  if (target.startsWith('/')) return new URL(target.trim(), location.href).href
  return pageUrl(target)
}

export function registerLinks(languageId: string) {
  monaco.languages.registerLinkProvider(languageId, {
    provideLinks(model) {
      const text = model.getValue()
      const links: monaco.languages.ILink[] = []
      const add = (start: number, length: number, url: string | null) => {
        if (!url) return
        const from = model.getPositionAt(start)
        const to = model.getPositionAt(start + length)
        links.push({
          range: new monaco.Range(from.lineNumber, from.column, to.lineNumber, to.column),
          url,
          tooltip: tr(OPEN_PAGE),
        })
      }
      for (const m of text.matchAll(INCLUDE)) {
        add(m.index + m[0].length - m[1].length, m[1].length, includeUrl(m[1]))
      }
      for (const m of text.matchAll(PAGE_LINK)) add(m.index + 3, m[1].length, linkUrl(m[1]))
      for (const m of text.matchAll(PATH_LINK)) {
        add(m.index + m[0].indexOf('/'), m[1].length, new URL(m[1], location.href).href)
      }
      return { links }
    },
  })
}

import { monaco } from '../monaco'
import { registerCompletion } from './completion'
import { registerHover } from './hover'
import { registerLinks } from './links'
import { scanTags } from './scan'

export const LANGUAGE_ID = 'wikidot'

// Languages that can be highlighted inside [[code type="..."]].
const EMBEDDED = 'css|html|javascript'

/**
 * A pattern matching `word` in any case. Monarch ignores per-rule regex flags, and its
 * `ignoreCase` option would apply to every rule.
 */
const anyCase = (word: string) =>
  word.replace(/[a-z]/gi, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`)

function embeddedState(tag: string): Record<string, monaco.languages.IMonarchLanguageRule[]> {
  const end = new RegExp(`\\[\\[\\/${anyCase(tag)}\\s*\\]\\]`)
  return {
    [`embedded_${tag}`]: [
      [end, { token: '@rematch', switchTo: '@embeddedEnd', nextEmbedded: '@pop' }],
      [/[^[]+/, ''],
      [/\[/, ''],
    ],
  }
}

const tokenizer: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.wikidot',
  tokenizer: {
    root: [
      // Line-level syntax
      [/^\+{1,6}\*?\s.*$/, 'keyword.heading'],
      [/^\s*[*#](?=\s)/, 'keyword.list'],
      [/^>+(?=\s|$)/, 'keyword.quote'],
      [/^:\s/, 'keyword.list'],
      [/^-{4,}\s*$/, 'keyword.rule'],
      [/^~{4,}\s*$/, 'keyword.rule'],
      [/^=(?=\s)/, 'keyword.align'],
      [/\s_$/, 'keyword.break'],

      // Raw regions
      [/\[!--/, 'comment', '@comment'],
      // Monarch reads `@@` in a regex as one literal `@`.
      [/@@@@/, 'string.literal', '@literal'],
      [/@</, 'string.escape', '@escape'],
      [
        new RegExp(`(\\[\\[)(code)(\\s+type\\s*=\\s*")(${EMBEDDED})("\\s*)(\\]\\])`),
        [
          'delimiter.tag',
          'tag',
          'attribute.name',
          'attribute.value',
          'attribute.name',
          { token: 'delimiter.tag', next: '@embedded_code', nextEmbedded: '$4' },
        ],
      ],
      [/(\[\[)(code)(?=[\s\]])/, ['delimiter.tag', { token: 'tag', next: '@rawTag.code' }]],
      // Like module names, `html` is case-insensitive.
      [
        new RegExp(`(\\[\\[)(${anyCase('html')})(\\s*\\]\\])`),
        [
          'delimiter.tag',
          'tag',
          { token: 'delimiter.tag', next: '@embedded_html', nextEmbedded: 'html' },
        ],
      ],
      // Module names are case-insensitive.
      [
        new RegExp(`(\\[\\[)(module)(\\s+)(${anyCase('css')})(?=[\\s\\]])`),
        ['delimiter.tag', 'tag', '', { token: 'type', next: '@moduleCss' }],
      ],
      [
        /(\[\[)(embed|embedvideo|embedaudio)(\s*\]\])/,
        ['delimiter.tag', 'tag', { token: 'delimiter.tag', next: '@raw.$2' }],
      ],

      // Links
      [/\[\[\[[^\]]*\]\]\]/, 'string.link'],
      [
        /(\[)(\*?(?:https?:\/\/|ftp:\/\/|mailto:|\/|#)[^\s\]]*)([^\]]*)(\])/,
        ['delimiter.bracket', 'string.link', '', 'delimiter.bracket'],
      ],
      [
        /(\[)((?:wikipedia|google|dictionary)(?::[a-z]{2})?:[^\s\]]+)([^\]]*)(\])/,
        ['delimiter.bracket', 'string.link', '', 'delimiter.bracket'],
      ],
      [/\*?(?:https?|ftp):\/\/[^\s\]|"<>]+/, 'string.link'],
      [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/, 'string.link'],

      // Tags
      [/(\[\[)(\$)/, ['delimiter.tag', { token: 'tag', next: '@math' }]],
      [/\[\[\/?/, 'delimiter.tag', '@tagName'],
      [/\(\(bibcite\s+[^)]*\)\)/, 'tag'],

      // Inline formatting
      [/\*\*(?=\S)(?:[^*]|\*(?!\*))+?\*\*/, 'strong'],
      [/\/\/(?=\S)(?:[^/]|\/(?!\/))+?\/\//, 'emphasis'],
      [/__(?=\S)(?:[^_]|_(?!_))+?__/, 'underline'],
      [/--(?=\S)(?:[^-]|-(?!-))+?(?<=\S)--/, 'strikethrough'],
      [/\{\{.+?\}\}/, 'string.mono'],
      [/\^\^.+?\^\^/, 'string.script'],
      [/,,.+?,,/, 'string.script'],
      [/##[#\w]+\|/, 'keyword.color'],
      [/##/, 'keyword.color'],
      [/\|\|~?/, 'delimiter.table'],

      // Variables
      [/%%[^%\s]+%%/, 'variable'],
      [/\{\$[\w-]+\}/, 'variable'],
    ],

    comment: [
      [/--\]/, 'comment', '@pop'],
      [/[^-]+/, 'comment'],
      [/-/, 'comment'],
    ],
    literal: [
      [/@@@@/, 'string.literal', '@pop'],
      [/[^@]+/, 'string.literal'],
      [/@/, 'string.literal'],
    ],
    escape: [
      [/>@/, 'string.escape', '@pop'],
      [/[^>]+/, 'string.escape'],
      [/>/, 'string.escape'],
    ],
    math: [
      [/\$\]\]/, { token: 'delimiter.tag', next: '@pop' }],
      [/[^$]+/, 'string.math'],
      [/\$/, 'string.math'],
    ],

    tagName: [
      [/\*?(?:f[<>]|[<>=])?[a-zA-Z][\w-]*|==|[<>=#]/, { token: 'tag', switchTo: '@tagBody' }],
      [/\]\]/, 'delimiter.tag', '@pop'],
      [/./, { token: '@rematch', switchTo: '@tagBody' }],
    ],
    tagBody: [
      [/\]\]/, 'delimiter.tag', '@pop'],
      [/[\w-]+(?=\s*=)/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"[^"]*"/, 'attribute.value'],
      [/'[^']*'/, 'attribute.value'],
      [/%%[^%\s]+%%/, 'variable'],
      [/\|/, 'delimiter'],
      [/\s+/, ''],
      [/[^\s\]"'=|]+/, 'tag.argument'],
      [/./, ''],
    ],

    // [[code]] without a highlightable type: attributes, then plain text until [[/code]].
    rawTag: [[/\]\]/, { token: 'delimiter.tag', switchTo: '@raw.$S2' }], { include: '@tagBody' }],
    raw: [
      [
        /\[\[\/(\w+)\s*\]\]/,
        { cases: { '$1==$S2': { token: 'tag', next: '@pop' }, '@default': 'string.code' } },
      ],
      [/[^[]+/, 'string.code'],
      [/\[/, 'string.code'],
    ],
    // Highlighted blocks. The end pattern must be a literal regex for Monarch to find it.
    ...embeddedState('code'),
    ...embeddedState('html'),
    ...embeddedState('module'),
    embeddedEnd: [
      [
        /(\[\[\/)(\w+)(\s*\]\])/,
        ['delimiter.tag', 'tag', { token: 'delimiter.tag', next: '@pop' }],
      ],
    ],
    moduleCss: [
      [/\]\]/, { token: 'delimiter.tag', switchTo: '@embedded_module', nextEmbedded: 'css' }],
      { include: '@tagBody' },
    ],
  },
}

const configuration: monaco.languages.LanguageConfiguration = {
  comments: { blockComment: ['[!--', '--]'] },
  brackets: [
    ['[', ']'],
    ['{', '}'],
    ['(', ')'],
  ],
  // `[` is not auto-closed: Monaco skips it whenever it guesses the brackets are unbalanced,
  // which is common in wiki text and leaves lopsided `[[]`. Completion inserts `]]` instead.
  autoClosingPairs: [{ open: '"', close: '"', notIn: ['string', 'comment'] }],
  surroundingPairs: [
    { open: '[', close: ']' },
    { open: '{', close: '}' },
    { open: '"', close: '"' },
    { open: '*', close: '*' },
    { open: '/', close: '/' },
    { open: '_', close: '_' },
  ],
  // Tags may contain `<`, `>`, `=` and `*`, so they are not word separators.
  wordPattern: /[^\s[\]{}()"'|,.;:!?%]+/,
}

function defineThemes() {
  const shared = (
    heading: string,
    tag: string,
    attr: string,
    value: string,
    link: string,
    raw: string,
  ) => [
    { token: 'keyword.heading', foreground: heading, fontStyle: 'bold' },
    { token: 'keyword', foreground: heading },
    { token: 'tag', foreground: tag },
    { token: 'tag.argument', foreground: value },
    { token: 'delimiter.tag', foreground: tag },
    { token: 'attribute.name', foreground: attr },
    { token: 'attribute.value', foreground: value },
    { token: 'string.link', foreground: link, fontStyle: 'underline' },
    { token: 'string', foreground: raw },
    { token: 'strong', fontStyle: 'bold' },
    { token: 'emphasis', fontStyle: 'italic' },
    { token: 'underline', fontStyle: 'underline' },
    { token: 'strikethrough', fontStyle: 'strikethrough' },
  ]
  monaco.editor.defineTheme('wikidot-light', {
    base: 'vs',
    inherit: true,
    rules: [
      ...shared('0451a5', '800000', 'e50000', '0000ff', '006ab1', 'a31515'),
      { token: 'variable', foreground: '795e26' },
      { token: 'comment', foreground: '008000' },
    ],
    colors: {},
  })
  monaco.editor.defineTheme('wikidot-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      ...shared('569cd6', '569cd6', '9cdcfe', 'ce9178', '4fc1ff', 'ce9178'),
      { token: 'variable', foreground: 'dcdcaa' },
      { token: 'comment', foreground: '6a9955' },
    ],
    colors: {},
  })
}

const foldingProvider: monaco.languages.FoldingRangeProvider = {
  provideFoldingRanges(model) {
    const ranges: monaco.languages.FoldingRange[] = []
    const open: { name: string; line: number }[] = []
    for (const tag of scanTags(model.getValue())) {
      const line = model.getPositionAt(tag.start).lineNumber
      if (!tag.closing) {
        open.push({ name: tag.name, line })
        continue
      }
      const i = open.map((o) => o.name).lastIndexOf(tag.name)
      if (i < 0) continue
      const start = open[i].line
      open.length = i
      if (line - 1 > start) ranges.push({ start, end: line - 1 })
    }
    return ranges
  },
}

let registered = false

export function registerWikidot() {
  if (registered) return
  registered = true
  monaco.languages.register({ id: LANGUAGE_ID })
  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, tokenizer)
  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, configuration)
  monaco.languages.registerFoldingRangeProvider(LANGUAGE_ID, foldingProvider)
  registerCompletion(LANGUAGE_ID)
  registerHover(LANGUAGE_ID)
  registerLinks(LANGUAGE_ID)
  defineThemes()
}

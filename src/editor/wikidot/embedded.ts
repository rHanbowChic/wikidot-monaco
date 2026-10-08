// CSS and HTML completion and hovers inside [[module CSS]] and [[html]] blocks, using Monaco's own
// CSS/HTML language services.
//
// Monaco normally runs these services in web workers loaded from the extension origin,
// which the page cannot start, and only for whole css/html documents. Instead the worker
// classes run on the main thread against a hidden model that holds the block's content
// at its original line/column (everything outside the block is blanked to spaces), so
// completion and hover ranges need no translation.
import {
  CompletionAdapter,
  HoverAdapter,
} from 'monaco-editor/languages/features/common/lspLanguageFeatures'
import { CSSWorker } from 'monaco-editor/languages/features/css/cssWorker'
import { HTMLWorker } from 'monaco-editor/languages/features/html/htmlWorker'
import { monaco } from '../monaco'

type Language = 'css' | 'html'

const BLOCKS: { language: Language; open: RegExp; close: string }[] = [
  { language: 'css', open: /\[\[module\s+css(?:\s[^\]]*)?\]\]/gi, close: '[[/module]]' },
  { language: 'html', open: /\[\[html\s*\]\]/gi, close: '[[/html]]' },
]

/** Trigger characters of Monaco's CSS and HTML completion providers. */
export const EMBEDDED_TRIGGER_CHARACTERS = ['/', '-', ':', '.', '<', '"', '=']

interface Region {
  language: Language
  start: number
  end: number
}

/** The [[module CSS]] or [[html]] block content containing `offset`, if any. */
function regionAt(text: string, offset: number): Region | null {
  for (const { language, open, close } of BLOCKS) {
    open.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = open.exec(text)) && m.index < offset) {
      const start = m.index + m[0].length
      const closeAt = text.indexOf(close, start)
      const end = closeAt < 0 ? text.length : closeAt
      if (offset >= start && offset <= end) return { language, start, end }
      if (closeAt < 0) break
      open.lastIndex = end
    }
  }
  return null
}

const blank = (s: string) => s.replace(/[^\n]/g, ' ')

interface Service {
  model: monaco.editor.ITextModel
  completion: CompletionAdapter
  hover: HoverAdapter
}

const services = new Map<Language, Service>()

function service(language: Language): Service {
  let s = services.get(language)
  if (s) return s
  const model = monaco.editor.createModel(
    '',
    language,
    monaco.Uri.parse(`inmemory://wikidot-monaco/embedded.${language}`),
  )
  const ctx = {
    getMirrorModels: () => [
      { uri: model.uri, version: model.getVersionId(), getValue: () => model.getValue() },
    ],
  }
  const worker =
    language === 'css'
      ? new CSSWorker(ctx, {
          languageId: 'css',
          options: { data: { useDefaultDataProvider: true } },
        })
      : new HTMLWorker(ctx, {
          languageId: 'html',
          languageSettings: { suggest: {}, data: { useDefaultDataProvider: true } },
        })
  const getWorker = () => Promise.resolve(worker)
  s = {
    model,
    completion: new CompletionAdapter(getWorker, []),
    hover: new HoverAdapter(getWorker),
  }
  services.set(language, s)
  return s
}

/** The service for the block containing `position`, its model holding that block; or null. */
function serviceAt(model: monaco.editor.ITextModel, position: monaco.Position) {
  const text = model.getValue()
  const region = regionAt(text, model.getOffsetAt(position))
  if (!region) return null
  const s = service(region.language)
  s.model.setValue(
    blank(text.slice(0, region.start)) +
      text.slice(region.start, region.end) +
      blank(text.slice(region.end)),
  )
  return s
}

/** CSS/HTML suggestions when `position` is inside an embedded block, otherwise null. */
export async function provideEmbeddedCompletions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.CompletionContext,
  token: monaco.CancellationToken,
): Promise<monaco.languages.CompletionList | null> {
  const s = serviceAt(model, position)
  if (!s) return null
  return (await s.completion.provideCompletionItems(s.model, position, context, token)) ?? null
}

/** CSS/HTML hover when `position` is inside an embedded block, otherwise null. */
export async function provideEmbeddedHover(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
): Promise<monaco.languages.Hover | null> {
  const s = serviceAt(model, position)
  if (!s) return null
  return (await s.hover.provideHover(s.model, position, token)) ?? null
}

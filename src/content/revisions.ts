// Marks wikidot's revision diffs with the revisions they compare. The diff HTML loses line
// breaks around deleted or inserted lines, so the editor fetches both revisions' sources by
// these ids (see src/editor/revisions.ts) and computes the diff itself.

/** Attributes set on a `div.inline-diff`. */
export const FROM_REVISION = 'data-wikidot-monaco-from'
export const TO_REVISION = 'data-wikidot-monaco-to'

type ModuleCallback = (...args: unknown[]) => void

interface Wikidot {
  OZONE?: {
    ajax?: {
      requestModule(
        moduleName: string,
        parameters: Record<string, unknown> | null,
        callback: ModuleCallback,
        ...rest: unknown[]
      ): unknown
    }
  }
}

export function installRevisionTagging() {
  const ajax = (window as unknown as Wikidot).OZONE?.ajax
  if (!ajax) return
  const requestModule = ajax.requestModule
  ajax.requestModule = function (moduleName, parameters, callback, ...rest) {
    if (moduleName === 'history/PageDiffModule' && parameters && callback) {
      const from = String(parameters.from_revision_id)
      const to = String(parameters.to_revision_id)
      const original = callback
      // The callback puts the diff into the page; tag it before the editor scans for it.
      callback = function (this: unknown, ...args) {
        original.apply(this, args)
        for (const div of document.querySelectorAll(`div.inline-diff:not([${FROM_REVISION}])`)) {
          div.setAttribute(FROM_REVISION, from)
          div.setAttribute(TO_REVISION, to)
        }
      }
    }
    return requestModule.call(this, moduleName, parameters, callback, ...rest)
  }
}

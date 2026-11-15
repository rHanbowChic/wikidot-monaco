/// <reference types="vite/client" />

/** Version of the bundled monaco-editor package, defined by scripts/build.mjs. */
declare const __MONACO_VERSION__: string

// Monaco's CSS/HTML language services, used directly on the main thread (see
// src/editor/wikidot/embedded.ts). These internal modules ship without typings.
interface MonacoMirrorModel {
  uri: { toString(): string }
  version: number
  getValue(): string
}
interface MonacoWorkerContext {
  getMirrorModels(): MonacoMirrorModel[]
}

declare module 'monaco-editor/languages/features/css/cssWorker' {
  export class CSSWorker {
    constructor(ctx: MonacoWorkerContext, createData: { options: object; languageId: 'css' })
  }
}

declare module 'monaco-editor/languages/features/html/htmlWorker' {
  export class HTMLWorker {
    constructor(
      ctx: MonacoWorkerContext,
      createData: { languageSettings: object; languageId: 'html' },
    )
  }
}

// The context menu's Cut/Copy/Paste commands (see src/editor/clipboard.ts). Each is
// undefined where the browser doesn't support that clipboard command.
declare module 'monaco-editor/editor/contrib/clipboard/browser/clipboard' {
  interface MultiCommand {
    addImplementation(
      priority: number,
      name: string,
      implementation: (accessor: unknown, args: unknown) => boolean | Promise<void>,
    ): { dispose(): void }
  }
  export const CutAction: MultiCommand | undefined
  export const CopyAction: MultiCommand | undefined
  export const PasteAction: MultiCommand | undefined
}

declare module 'monaco-editor/languages/features/common/lspLanguageFeatures' {
  import type { languages } from 'monaco-editor/editor/editor.api'
  export class CompletionAdapter implements languages.CompletionItemProvider {
    constructor(worker: (...uris: unknown[]) => Promise<unknown>, triggerCharacters: string[])
    provideCompletionItems: languages.CompletionItemProvider['provideCompletionItems']
  }
  export class HoverAdapter implements languages.HoverProvider {
    constructor(worker: (...uris: unknown[]) => Promise<unknown>)
    provideHover: languages.HoverProvider['provideHover']
  }
}

// Firefox runs a context menu item on mouseup, before the menu hands focus back to the
// editor (Chrome runs it a tick later). Monaco's Cut/Copy/Paste only act on an editor with
// text focus, so from the context menu they did nothing in Firefox. Refocus the editor the
// menu was opened on before they run.
import {
  CopyAction,
  CutAction,
  PasteAction,
} from 'monaco-editor/editor/contrib/clipboard/browser/clipboard'
import { monaco } from './monaco'

let menuEditor: monaco.editor.ICodeEditor | null = null

monaco.editor.onDidCreateEditor((editor) => {
  editor.onContextMenu(() => (menuEditor = editor))
  editor.onDidDispose(() => menuEditor === editor && (menuEditor = null))
})

function refocus() {
  const editor = menuEditor
  menuEditor = null
  if (editor && !monaco.editor.getEditors().some((e) => e.hasTextFocus())) editor.focus()
  // Fall through to Monaco's own implementations.
  return false
}

for (const action of [CutAction, CopyAction, PasteAction]) {
  action?.addImplementation(20000, 'wikidot-monaco-refocus', refocus)
}

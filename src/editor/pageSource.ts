/**
 * Recovers the wiki source from a `div.page-source` (wikidot's "view source" output).
 *
 * Wikidot renders the source as HTML: each line break becomes `<br />` followed by a
 * formatting newline, runs of spaces become `&nbsp;`, and the block starts with "\n\t".
 * Raw newlines are therefore formatting only, and `<br>` marks the real ones.
 */
export function readPageSource(div: HTMLElement): string {
  let text = ''
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.nodeValue!.replace(/[\r\n]/g, '')
      else if (child.nodeName === 'BR') text += '\n'
      else walk(child)
    }
  }
  walk(div)
  if (div.firstChild?.nodeValue?.startsWith('\n\t')) text = text.slice(1)
  return text.replace(/ /g, ' ')
}

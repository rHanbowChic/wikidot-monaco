/**
 * Recovers the wiki source from a `div.page-source` (wikidot's "view source" output).
 *
 * Wikidot renders the source as HTML: each line break becomes `<br />` followed by a
 * formatting newline, runs of spaces become `&nbsp;`, and the block is indented by a
 * newline and tabs on both ends. Raw newlines are therefore formatting only, and `<br>`
 * marks the real ones.
 *
 * In an `inline-diff` the text removed by the change sits in `<del>` and the added text in
 * `<ins>`; `skip` drops one of them to recover the source before (`INS`) or after (`DEL`).
 * This is approximate: the diff does not mark line breaks removed or added with whole lines.
 */
export function readPageSource(div: HTMLElement, skip?: 'INS' | 'DEL'): string {
  let text = ''
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.nodeValue!.replace(/[\r\n]/g, '')
      else if (child.nodeName === 'BR') text += '\n'
      else if (child.nodeName !== skip) walk(child)
    }
  }
  walk(div)
  const first = div.firstChild?.nodeValue
  if (first?.startsWith('\n')) text = text.slice(first.match(/^\n(\t*)/)![1].length)
  const last = div.lastChild?.nodeValue
  if (last && /\n\t*$/.test(last)) text = text.slice(0, text.length - last.match(/\t*$/)![0].length)
  return text.replace(/\u00a0/g, ' ')
}

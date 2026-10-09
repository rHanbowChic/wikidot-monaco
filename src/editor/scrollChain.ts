import type { monaco } from './monaco'

/** The nearest ancestor of `element` that scrolls vertically, or the document's scroller. */
function scrollParent(element: HTMLElement): Element {
  for (
    let node = element.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const { overflowY } = getComputedStyle(node)
    if (/auto|scroll|overlay/.test(overflowY) && node.scrollHeight > node.clientHeight) return node
  }
  return document.scrollingElement ?? document.documentElement
}

/**
 * Monaco cancels every touch it receives, so a swipe that starts in an editor never scrolls the
 * page, even when the editor can't scroll any further. Hands the part of each vertical swipe the
 * editor can't take to the page instead. Monaco still scrolls itself as usual; this listener sees
 * each move first and only forwards what's left past the editor's top or bottom.
 */
export function chainTouchScroll(
  wrapper: HTMLElement,
  editors: () => monaco.editor.ICodeEditor[],
): () => void {
  let editor: monaco.editor.ICodeEditor | undefined
  let lastY = 0
  const start = (e: TouchEvent) => {
    const target = e.target as Node
    editor =
      e.touches.length === 1
        ? editors().find((candidate) => candidate.getDomNode()?.contains(target))
        : undefined
    lastY = e.touches[0].clientY
  }
  const move = (e: TouchEvent) => {
    if (!editor || e.touches.length !== 1) return
    const y = e.touches[0].clientY
    // Positive scrolls down, as Monaco applies it.
    const delta = lastY - y
    lastY = y
    const top = editor.getScrollTop()
    const max = Math.max(0, editor.getScrollHeight() - editor.getLayoutInfo().height)
    const overflow = delta > 0 ? delta - Math.max(0, max - top) : delta + top
    if (Math.sign(overflow) === Math.sign(delta) && overflow !== 0) {
      scrollParent(wrapper).scrollBy(0, overflow)
    }
  }
  const end = () => (editor = undefined)
  // Capture: Monaco's own handler (on the document) would scroll the editor first.
  const options = { capture: true, passive: true }
  wrapper.addEventListener('touchstart', start, options)
  wrapper.addEventListener('touchmove', move, options)
  wrapper.addEventListener('touchend', end, options)
  wrapper.addEventListener('touchcancel', end, options)
  return () => {
    wrapper.removeEventListener('touchstart', start, options)
    wrapper.removeEventListener('touchmove', move, options)
    wrapper.removeEventListener('touchend', end, options)
    wrapper.removeEventListener('touchcancel', end, options)
  }
}

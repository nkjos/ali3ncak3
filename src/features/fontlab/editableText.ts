// Click-to-edit text for the font lab, with lorem autocomplete.
//
// Every element inside the root that has its own visible text becomes
// contentEditable (plain text only). Edits change text nodes in place, so
// React's references stay valid; "Reset text" remounts the sections to bring
// the original copy back. Links and buttons are not followed while editing.
//
// Browsers force `white-space: pre-wrap` on plain-text editables, so Enter
// inserts a literal newline. Elements the user has edited are marked
// "touched" and keep preserving whitespace (fontlab.css) so typed line breaks
// survive turning editing off; untouched text renders as on the real page.

import { useCallback, useEffect, useState, type RefObject } from 'react'
import { findLoremBeforeCaret, loremText, type LoremMatch } from './lorem'

const EDITABLE_ATTR = 'data-fontlab-editable'
const TOUCHED_ATTR = 'data-fontlab-touched'
// Browsers can't place a caret inside buttons or form controls.
const NOT_EDITABLE = 'button, input, select, textarea, option, [aria-hidden="true"]'

function hasOwnText(el: Element): boolean {
  return Array.from(el.childNodes).some(
    (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '',
  )
}

function makeEditable(el: HTMLElement) {
  if (el.hasAttribute(EDITABLE_ATTR) || el.closest(NOT_EDITABLE) || !hasOwnText(el)) return
  try {
    el.contentEditable = 'plaintext-only'
  } catch {
    // Older browsers reject plaintext-only.
    el.contentEditable = 'true'
  }
  el.spellcheck = false
  el.setAttribute(EDITABLE_ATTR, '')
}

function markTouched(node: Node) {
  const el = node instanceof Element ? node : node.parentElement
  el?.closest(`[${EDITABLE_ATTR}]`)?.setAttribute(TOUCHED_ATTR, '')
}

function markAll(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('*').forEach(makeEditable)
}

function unmarkAll(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(`[${EDITABLE_ATTR}]`).forEach((el) => {
    el.removeAttribute('contenteditable')
    el.removeAttribute('spellcheck')
    el.removeAttribute(EDITABLE_ATTR)
  })
}

interface CaretLorem extends LoremMatch {
  node: Text
  caret: number
}

/** The lorem keyword immediately before the caret in editable text, if any. */
function loremAtCaret(root: HTMLElement): CaretLorem | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null

  let node = selection.anchorNode
  let caret = selection.anchorOffset
  // A caret at an element boundary points between children; use the text before it.
  if (node?.nodeType === Node.ELEMENT_NODE && caret > 0) {
    const previous = node.childNodes[caret - 1]
    if (previous?.nodeType === Node.TEXT_NODE) {
      node = previous
      caret = (previous as Text).length
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null
  if (!node.parentElement?.closest(`[${EDITABLE_ATTR}]`)) return null

  const match = findLoremBeforeCaret((node as Text).data, caret)
  return match ? { ...match, node: node as Text, caret } : null
}

function expandLorem(match: CaretLorem) {
  const text = loremText(match.repeats)
  markTouched(match.node)
  const selection = window.getSelection()
  const range = document.createRange()
  range.setStart(match.node, match.start)
  range.setEnd(match.node, match.caret)
  selection?.removeAllRanges()
  selection?.addRange(range)

  // insertText keeps the browser's undo history; fall back to editing the node.
  if (!document.execCommand('insertText', false, text)) {
    match.node.replaceData(match.start, match.caret - match.start, text)
    const after = document.createRange()
    after.setStart(match.node, match.start + text.length)
    after.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(after)
  }
}

export interface LoremSuggestion {
  keyword: string
  repeats: number
  /** Viewport position just below the end of the typed keyword. */
  left: number
  top: number
}

function suggestionAt(root: HTMLElement): LoremSuggestion | null {
  const match = loremAtCaret(root)
  if (!match) return null
  const range = document.createRange()
  range.setStart(match.node, match.start)
  range.setEnd(match.node, match.caret)
  const rects = range.getClientRects()
  const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect()
  return { keyword: match.keyword, repeats: match.repeats, left: rect.right, top: rect.bottom }
}

export function useEditableText(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [suggestion, setSuggestion] = useState<LoremSuggestion | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) return

    markAll(root)
    // Products load asynchronously and "Reset text" remounts the sections.
    const observer = new MutationObserver(() => markAll(root))
    observer.observe(root, { childList: true, subtree: true })

    const blockActivation = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('a, button')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
      const match = loremAtCaret(root)
      if (!match) return
      event.preventDefault()
      expandLorem(match)
    }
    const update = () => setSuggestion(suggestionAt(root))
    const onInput = (event: Event) => {
      if (event.target instanceof Node) markTouched(event.target)
    }

    root.addEventListener('click', blockActivation, true)
    root.addEventListener('keydown', onKeyDown, true)
    root.addEventListener('input', onInput)
    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      root.removeEventListener('click', blockActivation, true)
      root.removeEventListener('keydown', onKeyDown, true)
      root.removeEventListener('input', onInput)
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      unmarkAll(root)
      setSuggestion(null)
    }
  }, [rootRef, enabled])

  const acceptSuggestion = useCallback(() => {
    const root = rootRef.current
    const match = root && loremAtCaret(root)
    if (match) expandLorem(match)
  }, [rootRef])

  return { suggestion, acceptSuggestion }
}

// Lorem ipsum expansion for the font lab's editable text. Typing `lorem`,
// `lorem2`, `lorem3` (... up to `lorem9`) and pressing Tab replaces the
// keyword with placeholder text: `loremN` is the paragraph repeated N times
// with the first 5 × (N − 1) words dropped, so each variant starts somewhere
// different instead of always opening with "Lorem ipsum".

export const LOREM_PARAGRAPH =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim ' +
  'veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea ' +
  'commodo consequat. Duis aute irure dolor in reprehenderit in voluptate ' +
  'velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat ' +
  'cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id ' +
  'est laborum.'

const WORDS_DROPPED_PER_REPEAT = 5
const KEYWORD = /^lorem([1-9])?$/i

/** The repeat count for a lorem keyword (`lorem` → 1, `lorem3` → 3), or null. */
export function parseLoremKeyword(word: string): number | null {
  const match = KEYWORD.exec(word)
  if (!match) return null
  return match[1] ? Number(match[1]) : 1
}

/** The paragraph repeated `repeats` times, minus the first 5 × (repeats − 1) words. */
export function loremText(repeats: number): string {
  const words = Array.from({ length: repeats }, () => LOREM_PARAGRAPH)
    .join(' ')
    .split(' ')
    .slice(WORDS_DROPPED_PER_REPEAT * (repeats - 1))
  const text = words.join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export interface LoremMatch {
  /** Offset in the text where the keyword starts. */
  start: number
  keyword: string
  repeats: number
}

/** The lorem keyword that ends exactly at `caret` in `text`, if any. */
export function findLoremBeforeCaret(text: string, caret: number): LoremMatch | null {
  const before = text.slice(0, caret)
  const match = /(?:^|\s)(\S+)$/.exec(before)
  if (!match) return null
  const keyword = match[1]
  const repeats = parseLoremKeyword(keyword)
  if (repeats === null) return null
  return { start: caret - keyword.length, keyword, repeats }
}

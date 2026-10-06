import { describe, expect, it } from 'vitest'
import {
  LOREM_PARAGRAPH,
  findLoremBeforeCaret,
  loremText,
  parseLoremKeyword,
} from '../lorem'

const words = (text: string) => text.split(' ')
const PARAGRAPH_WORDS = words(LOREM_PARAGRAPH).length

describe('parseLoremKeyword', () => {
  it('reads the repeat count', () => {
    expect(parseLoremKeyword('lorem')).toBe(1)
    expect(parseLoremKeyword('lorem2')).toBe(2)
    expect(parseLoremKeyword('lorem3')).toBe(3)
    expect(parseLoremKeyword('LOREM2')).toBe(2)
  })

  it('rejects anything else', () => {
    for (const word of ['lore', 'loremx', 'lorem0', 'lorem10', 'xlorem', 'lorem 2', '']) {
      expect(parseLoremKeyword(word)).toBeNull()
    }
  })
})

describe('loremText', () => {
  it('lorem is the plain paragraph', () => {
    expect(loremText(1)).toBe(LOREM_PARAGRAPH)
    expect(PARAGRAPH_WORDS).toBe(69)
  })

  it('lorem2 is doubled with the first 5 words removed', () => {
    const text = loremText(2)
    expect(words(text)).toHaveLength(PARAGRAPH_WORDS * 2 - 5)
    expect(text.startsWith('Consectetur adipiscing elit,')).toBe(true)
    expect(text.endsWith('id est laborum.')).toBe(true)
  })

  it('lorem3 is tripled with the first 10 words removed', () => {
    const text = loremText(3)
    expect(words(text)).toHaveLength(PARAGRAPH_WORDS * 3 - 10)
    expect(text.startsWith('Eiusmod tempor incididunt')).toBe(true)
  })
})

describe('findLoremBeforeCaret', () => {
  it('finds a keyword right before the caret', () => {
    expect(findLoremBeforeCaret('lorem2', 6)).toEqual({ start: 0, keyword: 'lorem2', repeats: 2 })
    expect(findLoremBeforeCaret('Our story lorem3', 16)).toEqual({ start: 10, keyword: 'lorem3', repeats: 3 })
  })

  it('ignores keywords that are not directly before the caret', () => {
    expect(findLoremBeforeCaret('lorem2 ', 7)).toBeNull()
    expect(findLoremBeforeCaret('lorem2 more', 11)).toBeNull()
    expect(findLoremBeforeCaret('xlorem', 6)).toBeNull()
    expect(findLoremBeforeCaret('lor', 3)).toBeNull()
  })

  it('only looks at text before the caret', () => {
    expect(findLoremBeforeCaret('lorem tail', 5)).toEqual({ start: 0, keyword: 'lorem', repeats: 1 })
  })
})

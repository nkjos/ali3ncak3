import { describe, expect, it } from 'vitest'
import { CATEGORY_LABELS, LAB_FONTS, stylesheetUrl } from '../fonts'

describe('font lab catalog', () => {
  it('has 10 serif, 10 sans-serif and 10 strange & weird families', () => {
    const count = (c: string) => LAB_FONTS.filter((f) => f.category === c).length
    expect(count('serif')).toBe(10)
    expect(count('sans-serif')).toBe(10)
    expect(count('weird')).toBe(10)
    expect(LAB_FONTS).toHaveLength(30)
  })

  it('family names are unique (they are the remembered key)', () => {
    const names = LAB_FONTS.map((f) => f.family)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every font lists valid weights and a note', () => {
    for (const f of LAB_FONTS) {
      expect(f.weights.length, f.family).toBeGreaterThan(0)
      for (const w of f.weights) {
        expect(w % 100, f.family).toBe(0)
        expect(w, f.family).toBeGreaterThanOrEqual(100)
        expect(w, f.family).toBeLessThanOrEqual(900)
      }
      expect(new Set(f.weights).size, f.family).toBe(f.weights.length)
      expect(f.note.trim(), f.family).not.toBe('')
    }
  })

  it('every category has a display label', () => {
    for (const f of LAB_FONTS) expect(CATEGORY_LABELS[f.category]).toBeTruthy()
    expect(CATEGORY_LABELS.weird).toBe('strange & weird')
  })

  it('builds a CSS2 URL with plus-joined names and sorted weights', () => {
    const codystar = LAB_FONTS.find((f) => f.family === 'Codystar')!
    expect(stylesheetUrl(codystar)).toBe(
      'https://fonts.googleapis.com/css2?family=Codystar:wght@300;400&display=swap',
    )
    const mono = LAB_FONTS.find((f) => f.family === 'Major Mono Display')!
    expect(stylesheetUrl(mono)).toBe(
      'https://fonts.googleapis.com/css2?family=Major+Mono+Display:wght@400&display=swap',
    )
  })
})

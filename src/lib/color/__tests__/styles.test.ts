import { describe, expect, it } from 'vitest'
import { PALETTE_STYLES, generateHues, type Hsl, type PaletteStyle } from '../index'

const EXPECTED_COUNTS: Record<PaletteStyle, number> = {
  monochromatic: 2,
  analogous: 3,
  complementary: 2,
  'split-complementary': 3,
  triadic: 3,
  tetradic: 4,
  square: 4,
}

const ALL_STYLES = Object.keys(EXPECTED_COUNTS) as PaletteStyle[]

describe('PALETTE_STYLES', () => {
  it('covers every PaletteStyle exactly once', () => {
    const ids = PALETTE_STYLES.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.slice().sort()).toEqual(ALL_STYLES.slice().sort())
  })

  it('has the spec cycle counts', () => {
    for (const def of PALETTE_STYLES) {
      expect(def.count).toBe(EXPECTED_COUNTS[def.id])
    }
  })

  it('has a label and one-sentence description for the UI', () => {
    for (const def of PALETTE_STYLES) {
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.description.length).toBeGreaterThan(10)
    }
  })
})

describe('generateHues', () => {
  const base: Hsl = { h: 200, s: 60, l: 50 }

  const hues = (style: PaletteStyle, b: Hsl = base) =>
    generateHues(b, style).map((x) => x.h)

  it('matches the spec offsets from the base hue', () => {
    expect(hues('monochromatic')).toEqual([200, 200])
    expect(hues('analogous')).toEqual([200, 230, 170])
    expect(hues('complementary')).toEqual([200, 20])
    expect(hues('split-complementary')).toEqual([200, 350, 50])
    expect(hues('triadic')).toEqual([200, 320, 80])
    expect(hues('tetradic')).toEqual([200, 260, 20, 80])
    expect(hues('square')).toEqual([200, 290, 20, 110])
  })

  it('always puts the base hue first', () => {
    for (const style of ALL_STYLES) {
      for (const h of [0, 45, 137, 359]) {
        expect(generateHues({ h, s: 50, l: 50 }, style)[0].h).toBe(h)
      }
    }
  })

  it('wraps hues into [0, 360)', () => {
    expect(hues('analogous', { h: 350, s: 50, l: 50 })).toEqual([350, 20, 320])
    expect(hues('triadic', { h: 300, s: 50, l: 50 })).toEqual([300, 60, 180])
    expect(hues('square', { h: 10, s: 50, l: 50 })).toEqual([10, 100, 190, 280])
    for (const style of ALL_STYLES) {
      for (const entry of generateHues({ h: 355, s: 50, l: 50 }, style)) {
        expect(entry.h).toBeGreaterThanOrEqual(0)
        expect(entry.h).toBeLessThan(360)
      }
    }
  })

  it('preserves base saturation and lightness on every entry', () => {
    for (const style of ALL_STYLES) {
      for (const entry of generateHues({ h: 123, s: 77, l: 41 }, style)) {
        expect(entry.s).toBe(77)
        expect(entry.l).toBe(41)
      }
    }
  })

  it('entry count matches the style definition', () => {
    for (const def of PALETTE_STYLES) {
      expect(generateHues(base, def.id)).toHaveLength(def.count)
    }
  })
})

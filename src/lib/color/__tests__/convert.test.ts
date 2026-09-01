import { describe, expect, it } from 'vitest'
import { hexToHsl, hslToHex } from '../index'

const SAMPLE_HEXES = [
  '#000000',
  '#ffffff',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#00ffff',
  '#ff00ff',
  '#808080',
  '#4f46e5',
  '#312e81',
  '#713f12',
  '#c7d2fe',
  '#fde68a',
  '#101018',
  '#123456',
  '#abcdef',
  '#deadbe',
  '#0f9d58',
  '#f4b400',
  '#7f00ff',
  '#c7cad6',
  '#3f3f46',
  '#010203',
  '#fefefe',
]

describe('hexToHsl', () => {
  it('converts pure primaries to known HSL values', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 })
    expect(hexToHsl('#00ff00')).toEqual({ h: 120, s: 100, l: 50 })
    expect(hexToHsl('#0000ff')).toEqual({ h: 240, s: 100, l: 50 })
  })

  it('converts black, white, and grays as achromatic', () => {
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 })
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 100 })
    const gray = hexToHsl('#808080')
    expect(gray.s).toBe(0)
    expect(gray.l).toBeCloseTo(50.2, 1)
  })

  it('accepts 3-digit hex and a missing hash', () => {
    expect(hexToHsl('#abc')).toEqual(hexToHsl('#aabbcc'))
    expect(hexToHsl('ff0000')).toEqual(hexToHsl('#ff0000'))
    expect(hexToHsl('F00')).toEqual(hexToHsl('#ff0000'))
  })

  it('throws on invalid input', () => {
    expect(() => hexToHsl('')).toThrow()
    expect(() => hexToHsl('#12')).toThrow()
    expect(() => hexToHsl('#12345g')).toThrow()
    expect(() => hexToHsl('not-a-color')).toThrow()
  })
})

describe('hslToHex', () => {
  it('converts known HSL values', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe('#00ff00')
    expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe('#0000ff')
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000')
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff')
  })

  it('wraps hue and clamps saturation/lightness', () => {
    expect(hslToHex({ h: 360, s: 100, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 480, s: 100, l: 50 })).toBe('#00ff00')
    expect(hslToHex({ h: -120, s: 100, l: 50 })).toBe('#0000ff')
    expect(hslToHex({ h: 0, s: 150, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 0, s: 100, l: 120 })).toBe('#ffffff')
    expect(hslToHex({ h: 0, s: 100, l: -5 })).toBe('#000000')
  })
})

describe('round trips', () => {
  it('hex -> hsl -> hex is exact for assorted colors', () => {
    for (const hex of SAMPLE_HEXES) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex)
    }
  })

  it('hex -> hsl -> hex is exact across a broad sweep', () => {
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          const hex = `#${[r, g, b]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')}`
          expect(hslToHex(hexToHsl(hex))).toBe(hex)
        }
      }
    }
  })

  it('hsl -> hex -> hsl is close for assorted values', () => {
    for (let h = 0; h < 360; h += 30) {
      for (const s of [20, 55, 90]) {
        for (const l of [25, 50, 75]) {
          const back = hexToHsl(hslToHex({ h, s, l }))
          // 8-bit channel rounding wobbles the values slightly.
          const hueDelta = Math.min(Math.abs(back.h - h), 360 - Math.abs(back.h - h))
          expect(hueDelta).toBeLessThanOrEqual(4)
          expect(Math.abs(back.s - s)).toBeLessThanOrEqual(2)
          expect(Math.abs(back.l - l)).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})

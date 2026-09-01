import { describe, expect, it } from 'vitest'
import {
  bestTextOn,
  contrastRatio,
  detectModeForBase,
  relativeLuminance,
} from '../index'

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10)
  })

  it('matches known channel weights', () => {
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 4)
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 4)
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 4)
  })

  it('is monotonic across grays', () => {
    expect(relativeLuminance('#333333')).toBeLessThan(relativeLuminance('#777777'))
    expect(relativeLuminance('#777777')).toBeLessThan(relativeLuminance('#bbbbbb'))
  })
})

describe('contrastRatio', () => {
  it('black vs white is exactly 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10)
  })

  it('identical colors are 1', () => {
    expect(contrastRatio('#4f46e5', '#4f46e5')).toBe(1)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 10)
  })

  it('is order-independent', () => {
    expect(contrastRatio('#4f46e5', '#fde68a')).toBeCloseTo(
      contrastRatio('#fde68a', '#4f46e5'),
      10,
    )
  })

  it('red vs white is ~4.0 (known WCAG value)', () => {
    expect(contrastRatio('#ff0000', '#ffffff')).toBeCloseTo(3.998, 2)
  })

  it('stays within [1, 21]', () => {
    const samples = ['#000000', '#ffffff', '#ff0000', '#4f46e5', '#fde68a', '#808080']
    for (const a of samples) {
      for (const b of samples) {
        const ratio = contrastRatio(a, b)
        expect(ratio).toBeGreaterThanOrEqual(1)
        expect(ratio).toBeLessThanOrEqual(21)
      }
    }
  })
})

describe('bestTextOn', () => {
  it('prefers white on dark backgrounds', () => {
    expect(bestTextOn('#000000')).toBe('#ffffff')
    expect(bestTextOn('#101018')).toBe('#ffffff')
    expect(bestTextOn('#0000ff')).toBe('#ffffff')
    expect(bestTextOn('#312e81')).toBe('#ffffff')
  })

  it('prefers black on light backgrounds', () => {
    expect(bestTextOn('#ffffff')).toBe('#000000')
    expect(bestTextOn('#ffff00')).toBe('#000000')
    expect(bestTextOn('#fde68a')).toBe('#000000')
    expect(bestTextOn('#00ff00')).toBe('#000000')
  })

  it('always returns the higher-ratio neutral', () => {
    for (let h = 0; h < 360; h += 20) {
      for (const l of [15, 35, 55, 75, 90]) {
        const hex = `#${((1 << 24) | (h * 251) | l).toString(16).slice(-6)}`
        const white = contrastRatio(hex, '#ffffff')
        const black = contrastRatio(hex, '#000000')
        const winner = bestTextOn(hex)
        if (white > black) expect(winner).toBe('#ffffff')
        else if (black > white) expect(winner).toBe('#000000')
      }
    }
  })
})

describe('detectModeForBase', () => {
  it('dark when white text wins on the base', () => {
    expect(detectModeForBase('#000080')).toBe('dark')
    expect(detectModeForBase('#4f46e5')).toBe('dark')
    expect(detectModeForBase('#1a1a1a')).toBe('dark')
  })

  it('light when black text wins on the base', () => {
    expect(detectModeForBase('#ffff99')).toBe('light')
    expect(detectModeForBase('#c7d2fe')).toBe('light')
    expect(detectModeForBase('#ffffff')).toBe('light')
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildSiteTheme,
  contrastRatio,
  detectModeForBase,
  ensureContrast,
  hexToHsl,
  hslToHex,
  type Mode,
  type PaletteStyle,
} from '../index'

const ALL_STYLES: PaletteStyle[] = [
  'monochromatic',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'square',
]

// ~12 base hues sweeping the wheel at a mid saturation/lightness.
const SAMPLE_BASES = Array.from({ length: 12 }, (_, i) =>
  hslToHex({ h: i * 30, s: 85, l: 55 }),
)

const EXTRA_BASES = ['#4f46e5', '#ff0000', '#f5f5dc', '#111111', '#808080']

describe('ensureContrast', () => {
  it('reaches 4.5 against white for assorted hues', () => {
    for (let h = 0; h < 360; h += 30) {
      const hex = hslToHex({ h, s: 90, l: 60 })
      const tuned = ensureContrast(hex, '#ffffff')
      expect(contrastRatio(tuned, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('reaches 4.5 against black for assorted hues', () => {
    for (let h = 0; h < 360; h += 30) {
      const hex = hslToHex({ h, s: 90, l: 40 })
      const tuned = ensureContrast(hex, '#000000')
      expect(contrastRatio(tuned, '#000000')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('adjusts only lightness: hue and saturation survive', () => {
    for (let h = 15; h < 360; h += 60) {
      const original = { h, s: 80, l: 55 }
      const tuned = hexToHsl(ensureContrast(hslToHex(original), '#ffffff'))
      expect(Math.abs(tuned.h - h)).toBeLessThanOrEqual(3)
      expect(Math.abs(tuned.s - 80)).toBeLessThanOrEqual(5)
      expect(tuned.l).toBeLessThanOrEqual(original.l)
    }
  })

  it('moves darker for white text and lighter for black text', () => {
    const mid = hslToHex({ h: 210, s: 70, l: 50 })
    const forWhite = hexToHsl(ensureContrast(mid, '#ffffff'))
    const forBlack = hexToHsl(ensureContrast(mid, '#000000'))
    expect(forWhite.l).toBeLessThanOrEqual(50)
    expect(forBlack.l).toBeGreaterThanOrEqual(50)
  })

  it('returns the color unchanged when it already passes', () => {
    expect(ensureContrast('#101018', '#ffffff')).toBe('#101018')
    expect(ensureContrast('#fde68a', '#000000')).toBe('#fde68a')
  })

  it('honors a custom target', () => {
    const tuned = ensureContrast(hslToHex({ h: 30, s: 90, l: 50 }), '#ffffff', 7)
    expect(contrastRatio(tuned, '#ffffff')).toBeGreaterThanOrEqual(7)
  })

  it('is best-effort (terminates, valid hex) when the target is impossible', () => {
    const out = ensureContrast('#888888', '#777777', 21)
    expect(out).toMatch(/^#[0-9a-f]{6}$/)
    // Bound reached: black text direction is "lighten", so it lands on white.
    expect(out).toBe('#ffffff')
  })

  it('an achievable extreme target resolves at the lightness bound', () => {
    expect(ensureContrast(hslToHex({ h: 300, s: 100, l: 50 }), '#ffffff', 21)).toBe(
      '#000000',
    )
  })
})

describe('buildSiteTheme', () => {
  it('every style/mode combination hits >= 4.5 vs the mode text (12 hues)', () => {
    for (const base of [...SAMPLE_BASES, ...EXTRA_BASES]) {
      for (const style of ALL_STYLES) {
        const theme = buildSiteTheme(base, style, false)
        for (const color of theme.dark.colors) {
          expect(
            contrastRatio(color, '#ffffff'),
            `${style} dark ${color} (base ${base})`,
          ).toBeGreaterThanOrEqual(4.5)
        }
        for (const color of theme.light.colors) {
          expect(
            contrastRatio(color, '#000000'),
            `${style} light ${color} (base ${base})`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('defaultMode matches detectModeForBase', () => {
    for (const base of [...SAMPLE_BASES, ...EXTRA_BASES]) {
      const theme = buildSiteTheme(base, 'triadic', false)
      expect(theme.defaultMode).toBe(detectModeForBase(base))
    }
  })

  it('cycle length matches the style count and named keys mirror colors[0..3]', () => {
    const counts: Record<PaletteStyle, number> = {
      monochromatic: 2,
      analogous: 3,
      complementary: 2,
      'split-complementary': 3,
      triadic: 3,
      tetradic: 4,
      square: 4,
    }
    for (const style of ALL_STYLES) {
      const theme = buildSiteTheme('#4f46e5', style, false)
      for (const mode of ['dark', 'light'] as Mode[]) {
        const mc = theme[mode]
        expect(mc.colors).toHaveLength(counts[style])
        expect(mc.primary).toBe(mc.colors[0])
        expect(mc.secondary).toBe(mc.colors[1])
        if (counts[style] > 2) expect(mc.tertiary).toBe(mc.colors[2])
        else expect(mc.tertiary).toBeUndefined()
        if (counts[style] > 3) expect(mc.quaternary).toBe(mc.colors[3])
        else expect(mc.quaternary).toBeUndefined()
      }
    }
  })

  it('sets the fixed neutrals per mode', () => {
    const theme = buildSiteTheme('#4f46e5', 'complementary', false)
    expect(theme.dark.text).toBe('#ffffff')
    expect(theme.dark.text2).toBe('#c7cad6')
    expect(theme.dark.surface).toBe('#101018')
    expect(theme.dark.surfaceText).toBe('#ffffff')
    expect(theme.light.text).toBe('#000000')
    expect(theme.light.text2).toBe('#3f3f46')
    expect(theme.light.surface).toBe('#ffffff')
    expect(theme.light.surfaceText).toBe('#000000')
  })

  it('records baseHex, style, and neutralAccent', () => {
    const theme = buildSiteTheme('#4F46E5', 'square', true)
    expect(theme.baseHex).toBe('#4f46e5')
    expect(theme.style).toBe('square')
    expect(theme.neutralAccent).toBe(true)
  })

  it('keeps the base color recognizable in its native mode', () => {
    // #4f46e5 passes 4.5 vs white already -> dark.colors[0] is the pick itself.
    const darkNative = buildSiteTheme('#4f46e5', 'triadic', false)
    expect(darkNative.defaultMode).toBe('dark')
    expect(darkNative.dark.colors[0]).toBe('#4f46e5')

    // A light mint passes 4.5 vs black already -> light.colors[0] is the pick.
    const lightNative = buildSiteTheme('#a7f3d0', 'triadic', false)
    expect(lightNative.defaultMode).toBe('light')
    expect(lightNative.light.colors[0]).toBe('#a7f3d0')
  })

  it('native colors[0] keeps the base hue even when tuned for contrast', () => {
    // #ff0000 is native-light (black text wins) but passes vs black -> kept.
    const red = buildSiteTheme('#ff0000', 'complementary', false)
    expect(red.defaultMode).toBe('light')
    expect(red.light.colors[0]).toBe('#ff0000')
  })

  it('dark colors are deep but not near-black; light colors clearly light', () => {
    for (const base of SAMPLE_BASES) {
      for (const style of ALL_STYLES) {
        const theme = buildSiteTheme(base, style, false)
        theme.dark.colors.forEach((color, i) => {
          if (i === 0 && theme.defaultMode === 'dark') return // pick preserved
          if (style === 'monochromatic' && i === 1) return // lightness step
          const { l } = hexToHsl(color)
          expect(l, `dark ${style} ${color} (base ${base})`).toBeGreaterThanOrEqual(14)
          expect(l, `dark ${style} ${color} (base ${base})`).toBeLessThanOrEqual(40)
        })
        theme.light.colors.forEach((color, i) => {
          if (i === 0 && theme.defaultMode === 'light') return
          if (style === 'monochromatic' && i === 1) return
          const { l } = hexToHsl(color)
          expect(l, `light ${style} ${color} (base ${base})`).toBeGreaterThanOrEqual(70)
        })
      }
    }
  })

  it('monochromatic: both entries share the hue with distinct lightness', () => {
    for (const base of SAMPLE_BASES) {
      const theme = buildSiteTheme(base, 'monochromatic', false)
      for (const mode of ['dark', 'light'] as Mode[]) {
        const [a, b] = theme[mode].colors.map((c) => hexToHsl(c))
        // Same hue (rounding to hex can wobble a couple of degrees).
        const hueDelta = Math.min(
          Math.abs(a.h - b.h),
          360 - Math.abs(a.h - b.h),
        )
        expect(hueDelta, `${mode} hue (base ${base})`).toBeLessThanOrEqual(4)
        expect(
          Math.abs(a.l - b.l),
          `${mode} lightness gap (base ${base})`,
        ).toBeGreaterThanOrEqual(8)
      }
    }
  })

  it('monochromatic works at extreme picks too (still contrast-safe)', () => {
    for (const base of ['#111111', '#fefefe', '#03030a', '#ff0000']) {
      const theme = buildSiteTheme(base, 'monochromatic', false)
      for (const color of theme.dark.colors) {
        expect(contrastRatio(color, '#ffffff')).toBeGreaterThanOrEqual(4.5)
      }
      for (const color of theme.light.colors) {
        expect(contrastRatio(color, '#000000')).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

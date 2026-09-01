import { describe, expect, it } from 'vitest'
import {
  bestTextOn,
  buildSiteTheme,
  contrastRatio,
  hslToHex,
  pickAccent,
  sectionColorScheme,
  type Mode,
  type ModeColors,
  type SiteTheme,
} from '../index'

/** Hand-crafted theme with known, deterministic colors. */
function craftTheme(overrides: Partial<SiteTheme> = {}): SiteTheme {
  const dark: ModeColors = {
    // Deep navy vs mid orange: both pass 4.5 vs white, mutual ratio ~3.3.
    colors: ['#0b1d51', '#b9541b'],
    primary: '#0b1d51',
    secondary: '#b9541b',
    text: '#ffffff',
    text2: '#c7cad6',
    surface: '#101018',
    surfaceText: '#ffffff',
  }
  const light: ModeColors = {
    colors: ['#c7d2fe', '#fde68a'],
    primary: '#c7d2fe',
    secondary: '#fde68a',
    text: '#000000',
    text2: '#3f3f46',
    surface: '#ffffff',
    surfaceText: '#000000',
  }
  return {
    style: 'complementary',
    baseHex: '#0b1d51',
    neutralAccent: false,
    defaultMode: 'dark',
    dark,
    light,
    ...overrides,
  }
}

describe('pickAccent', () => {
  it('complementary non-neutral picks the OTHER cycle color', () => {
    const theme = craftTheme()
    // Sanity: the crafted pair really clears the 2.0 gate.
    expect(contrastRatio('#0b1d51', '#b9541b')).toBeGreaterThanOrEqual(2)

    const fromNavy = pickAccent('#0b1d51', theme, 'dark')
    expect(fromNavy.accent).toBe('#b9541b')
    expect(fromNavy.accentText).toBe(bestTextOn('#b9541b'))

    const fromOrange = pickAccent('#b9541b', theme, 'dark')
    expect(fromOrange.accent).toBe('#0b1d51')
    expect(fromOrange.accentText).toBe('#ffffff')
  })

  it('neutralAccent forces the mode neutral with the opposite label', () => {
    const theme = craftTheme({ neutralAccent: true })
    const dark = pickAccent('#0b1d51', theme, 'dark')
    expect(dark).toEqual({ accent: '#ffffff', accentText: '#000000' })
    const light = pickAccent('#c7d2fe', theme, 'light')
    expect(light).toEqual({ accent: '#000000', accentText: '#ffffff' })
  })

  it('monochromatic forces the neutral accent', () => {
    const theme = craftTheme({ style: 'monochromatic' })
    expect(pickAccent('#0b1d51', theme, 'dark')).toEqual({
      accent: '#ffffff',
      accentText: '#000000',
    })
    expect(pickAccent('#c7d2fe', theme, 'light')).toEqual({
      accent: '#000000',
      accentText: '#ffffff',
    })

    // A built mono theme behaves the same for every cycle color.
    const built = buildSiteTheme('#4f46e5', 'monochromatic', false)
    for (const bg of built.dark.colors) {
      expect(pickAccent(bg, built, 'dark').accent).toBe('#ffffff')
    }
  })

  it('falls back to neutral when the best candidate ratio is < 2.0', () => {
    // Default-theme-style pair: #312e81 vs #713f12 has ratio ~1.3.
    const dark: ModeColors = {
      colors: ['#312e81', '#713f12'],
      primary: '#312e81',
      secondary: '#713f12',
      text: '#ffffff',
      text2: '#c7cad6',
      surface: '#101018',
      surfaceText: '#ffffff',
    }
    const theme = craftTheme({ dark })
    expect(contrastRatio('#312e81', '#713f12')).toBeLessThan(2)
    expect(pickAccent('#312e81', theme, 'dark')).toEqual({
      accent: '#ffffff',
      accentText: '#000000',
    })
  })

  it('with 3+ colors picks the highest-contrast other color', () => {
    const dark: ModeColors = {
      colors: ['#101040', '#a34d10', '#2e6b2e'],
      primary: '#101040',
      secondary: '#a34d10',
      tertiary: '#2e6b2e',
      text: '#ffffff',
      text2: '#c7cad6',
      surface: '#101018',
      surfaceText: '#ffffff',
    }
    const theme = craftTheme({ style: 'triadic', dark })
    const bg = '#101040'
    const others = dark.colors.filter((c) => c !== bg)
    const expected = others.reduce((best, c) =>
      contrastRatio(c, bg) > contrastRatio(best, bg) ? c : best,
    )
    const pick = pickAccent(bg, theme, 'dark')
    expect(pick.accent).toBe(expected)
    expect(pick.accent).not.toBe(bg)
  })

  it('matches the spec rule on real built themes (property check)', () => {
    const bases = ['#1d1da8', '#0f766e', '#b91c1c', '#eab308', '#7c3aed', '#f472b6']
    const styles = ['analogous', 'complementary', 'triadic', 'square'] as const
    for (const base of bases) {
      for (const style of styles) {
        const theme = buildSiteTheme(base, style, false)
        for (const mode of ['dark', 'light'] as Mode[]) {
          const mc = theme[mode]
          for (const bg of mc.colors) {
            const others = mc.colors.filter((c) => c !== bg)
            const best = others.reduce((acc, c) =>
              contrastRatio(c, bg) > contrastRatio(acc, bg) ? c : acc,
            )
            const pick = pickAccent(bg, theme, mode)
            if (contrastRatio(best, bg) < 2) {
              expect(pick.accent).toBe(mc.text)
            } else {
              expect(pick.accent).toBe(best)
              expect(pick.accentText).toBe(bestTextOn(best))
            }
          }
        }
      }
    }
  })

  it('a built dark complementary theme can produce a non-neutral accent', () => {
    // Deep blue base keeps colors[0] very dark; the tuned complement sits much
    // lighter, clearing the 2.0 gate.
    const theme = buildSiteTheme('#1d1da8', 'complementary', false)
    const [c0, c1] = theme.dark.colors
    expect(contrastRatio(c0, c1)).toBeGreaterThanOrEqual(2)
    expect(pickAccent(c0, theme, 'dark').accent).toBe(c1)
  })
})

describe('sectionColorScheme cycle math', () => {
  const CASES: Array<{ style: SiteTheme['style']; k: number }> = [
    { style: 'complementary', k: 2 },
    { style: 'triadic', k: 3 },
    { style: 'square', k: 4 },
  ]

  it('sections i%k, nav (k-1)%k, footer n%k for k=2..4, n=0..6', () => {
    for (const { style, k } of CASES) {
      const theme = buildSiteTheme('#4f46e5', style, false)
      for (const mode of ['dark', 'light'] as Mode[]) {
        const colors = theme[mode].colors
        expect(colors).toHaveLength(k)
        for (let n = 0; n <= 6; n++) {
          const scheme = sectionColorScheme(n, theme, mode)
          expect(scheme.sections).toHaveLength(n)
          scheme.sections.forEach((section, i) => {
            expect(section.bg).toBe(colors[i % k])
          })
          expect(scheme.nav.bg).toBe(colors[(k - 1) % k])
          expect(scheme.footer.bg).toBe(colors[n % k])
        }
      }
    }
  })

  it('n=0 (e.g. /admin): nav gets colors[k-1], footer colors[0]', () => {
    const theme = buildSiteTheme('#4f46e5', 'triadic', false)
    const scheme = sectionColorScheme(0, theme, 'dark')
    expect(scheme.sections).toEqual([])
    expect(scheme.nav.bg).toBe(theme.dark.colors[2])
    expect(scheme.footer.bg).toBe(theme.dark.colors[0])
  })

  it('every entry carries mode text/text2 and its pickAccent result', () => {
    for (const neutralAccent of [false, true]) {
      const theme = buildSiteTheme('#0f766e', 'tetradic', neutralAccent)
      for (const mode of ['dark', 'light'] as Mode[]) {
        const mc = theme[mode]
        const scheme = sectionColorScheme(5, theme, mode)
        for (const entry of [scheme.nav, scheme.footer, ...scheme.sections]) {
          expect(entry.text).toBe(mc.text)
          expect(entry.text2).toBe(mc.text2)
          const expected = pickAccent(entry.bg, theme, mode)
          expect(entry.accent).toBe(expected.accent)
          expect(entry.accentText).toBe(expected.accentText)
        }
      }
    }
  })

  it('wraps correctly when n exceeds several full cycles', () => {
    const theme = buildSiteTheme(hslToHex({ h: 300, s: 70, l: 45 }), 'square', false)
    const colors = theme.light.colors
    const scheme = sectionColorScheme(11, theme, 'light')
    expect(scheme.sections[10].bg).toBe(colors[10 % 4])
    expect(scheme.footer.bg).toBe(colors[11 % 4])
  })
})

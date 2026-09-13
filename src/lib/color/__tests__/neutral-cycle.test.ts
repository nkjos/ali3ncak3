import { describe, expect, it } from 'vitest'
import {
  buildSiteTheme,
  contrastRatio,
  effectiveNeutralFrequency,
  isNeutralPosition,
  neutralSlotCount,
  paletteIndexAt,
  sectionColorScheme,
  type Mode,
  type NeutralCycle,
} from '../index'

const pattern = (k: number, cycle: NeutralCycle, positions = 12): string =>
  Array.from({ length: positions }, (_, q) =>
    isNeutralPosition(q, k, cycle) ? 'N' : String(paletteIndexAt(q, k, cycle)),
  ).join(' ')

describe('neutral cycle math', () => {
  it('frequency 0 reproduces the plain cycle (nav = k-1, sections i%k, footer n%k)', () => {
    const off = { frequency: 0, offset: 0 }
    for (const k of [2, 3, 4]) {
      expect(isNeutralPosition(0, k, off)).toBe(false)
      expect(paletteIndexAt(0, k, off)).toBe(k - 1) // navbar
      for (let i = 0; i < 9; i++) expect(paletteIndexAt(i + 1, k, off)).toBe(i % k)
    }
  })

  it("k=3, f=2, offset 0: neutral at 0 and 3 of each 5-slot cycle (the user's example)", () => {
    expect(pattern(3, { frequency: 2, offset: 0 }, 10)).toBe('N 0 1 N 2 N 0 1 N 2')
  })

  it('f=k is every other slot; f=1 is once per k+1 slots', () => {
    expect(pattern(3, { frequency: 3, offset: 0 }, 8)).toBe('N 0 N 1 N 2 N 0')
    expect(pattern(3, { frequency: 1, offset: 0 }, 9)).toBe('N 0 1 2 N 0 1 2 N')
    expect(pattern(2, { frequency: 2, offset: 0 }, 6)).toBe('N 0 N 1 N 0')
  })

  it('offset shifts where the first neutral lands without scrambling palette order', () => {
    expect(pattern(3, { frequency: 1, offset: 1 }, 9)).toBe('2 N 0 1 2 N 0 1 2')
    // Counting back from section 1 (index 0), the navbar is index k-1.
    expect(pattern(3, { frequency: 1, offset: 2 }, 9)).toBe('2 0 N 1 2 0 N 1 2')
    // Palette colors always advance 0,1,2,0,1,2 across non-neutral slots.
    for (let offset = 0; offset < 4; offset++) {
      const seq = pattern(3, { frequency: 2, offset }, 20).split(' ').filter((s) => s !== 'N')
      for (let i = 1; i < seq.length; i++) {
        expect(Number(seq[i])).toBe((Number(seq[i - 1]) + 1) % 3)
      }
    }
  })

  it('fractional frequencies are exact: 0.5 per cycle = once per two cycles', () => {
    // k=3, f=0.5: neutral density 0.5/3.5 -> one neutral, then 6 colors.
    expect(pattern(3, { frequency: 0.5, offset: 0 }, 8)).toBe('N 0 1 2 0 1 2 N')
    expect(neutralSlotCount(15, 3, { frequency: 0.5, offset: 0 })).toBe(3)
  })

  it('effective frequency clamps to k and snaps to quarters', () => {
    expect(effectiveNeutralFrequency(3, 9)).toBe(3)
    expect(effectiveNeutralFrequency(3, 1.1)).toBe(1)
    expect(effectiveNeutralFrequency(3, 1.13)).toBe(1.25)
    expect(effectiveNeutralFrequency(3, -1)).toBe(0)
    expect(effectiveNeutralFrequency(3, Number.NaN)).toBe(0)
  })

  it('neutralSlotCount matches the pattern', () => {
    for (const k of [2, 3, 4]) {
      for (const frequency of [0, 0.5, 1, 2, k]) {
        for (const offset of [0, 1, 3]) {
          const cycle = { frequency, offset }
          const expected = pattern(k, cycle, 9).split(' ').filter((s) => s === 'N').length
          expect(neutralSlotCount(9, k, cycle)).toBe(expected)
        }
      }
    }
  })
})

describe('sectionColorScheme with neutral slots', () => {
  it('paints the mode surface on neutral slots with contrast-safe text and accent', () => {
    const theme = buildSiteTheme('#5d3cef', 'triadic', false, { frequency: 1, offset: 0 })
    for (const mode of ['dark', 'light'] as Mode[]) {
      const mc = theme[mode]
      const scheme = sectionColorScheme(4, theme, mode) // positions 0..5
      // f=1,k=3 -> neutral at positions 0 (navbar) and 4 (section index 3).
      expect(scheme.nav.bg).toBe(mc.surface)
      expect(scheme.nav.text).toBe(mc.surfaceText)
      expect(scheme.sections[3].bg).toBe(mc.surface)
      expect(scheme.sections[0].bg).toBe(mc.colors[0])
      expect(scheme.sections[1].bg).toBe(mc.colors[1])
      expect(scheme.sections[2].bg).toBe(mc.colors[2])
      expect(scheme.footer.bg).toBe(mc.colors[0])
      for (const entry of [scheme.nav, scheme.footer, ...scheme.sections]) {
        expect(contrastRatio(entry.text, entry.bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(entry.text2, entry.bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(entry.accent, entry.bg)).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('a theme without cycle fields (stored before the feature) behaves as frequency 0', () => {
    const theme = buildSiteTheme('#5d3cef', 'complementary', false)
    delete theme.neutralFrequency
    delete theme.neutralOffset
    const scheme = sectionColorScheme(4, theme, 'dark')
    expect(scheme.nav.bg).toBe(theme.dark.colors[1])
    expect(scheme.sections.map((s) => s.bg)).toEqual([
      theme.dark.colors[0], theme.dark.colors[1], theme.dark.colors[0], theme.dark.colors[1],
    ])
    expect(scheme.footer.bg).toBe(theme.dark.colors[0])
  })
})

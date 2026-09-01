// Theme building: contrast tuning, SiteTheme construction, accent picking,
// and the section background cycle.

import type { Mode, ModeColors, PaletteStyle, SiteTheme } from '../../content/types'
import { clamp, hexToHsl, hslToHex, type Hsl } from './convert'
import { bestTextOn, contrastRatio, detectModeForBase, relativeLuminance } from './wcag'
import { generateHues } from './styles'
import { cuspLightness, hexToOklch, maxChroma, oklchToHex } from './oklch'

export const CONTRAST_TARGET = 4.5

// Pre-tuning lightness bands (SPEC suggests ~18-38 dark / ~70-88 light).
// Tuned for looks: deep-but-saturated darks, pastel-but-tinted lights.
const DARK_L_MIN = 26
const DARK_L_MAX = 38
const LIGHT_L_MIN = 74
const LIGHT_L_MAX = 86

// Lightness gap that keeps the two monochromatic steps clearly distinct.
const MONO_STEP = 14
const MONO_MIN_GAP = 8

const TUNE_STEP = 0.5

/**
 * Adjust ONLY lightness (hue/saturation preserved) until
 * contrastRatio(result, text) >= target. Moves darker for light text and
 * lighter for dark text; clamps at l=0/100 and returns best-effort there.
 */
export function ensureContrast(hex: string, text: string, target = CONTRAST_TARGET): string {
  if (contrastRatio(hex, text) >= target) return hslToHex(hexToHsl(hex))
  const { h, s, l: startL } = hexToHsl(hex)
  const darken = relativeLuminance(text) >= 0.5
  let l = startL
  let out = hslToHex({ h, s, l })
  while (contrastRatio(out, text) < target) {
    const bound = darken ? 0 : 100
    if (l === bound) break // best effort at the extreme
    l = darken ? Math.max(bound, l - TUNE_STEP) : Math.min(bound, l + TUNE_STEP)
    out = hslToHex({ h, s, l })
  }
  return out
}

/**
 * Second monochromatic entry: a clearly distinct lightness step of the same
 * hue as `first`, still guaranteed to pass contrast vs `text`.
 * Prefers stepping AWAY from the text color (darker in dark mode, lighter in
 * light mode) because that direction can never lose contrast.
 */
function monoSecond(first: string, mode: Mode, text: string): string {
  const { h, s, l } = hexToHsl(first)
  if (mode === 'dark') {
    const down = l - MONO_STEP
    if (down >= 6) return ensureContrast(hslToHex({ h, s, l: down }), text)
    // First color is already very deep: try a lighter step, tuned back down
    // if it fails contrast; fall back to whatever gap survives.
    const up = ensureContrast(hslToHex({ h, s, l: l + MONO_STEP + 2 }), text)
    if (Math.abs(hexToHsl(up).l - l) >= MONO_MIN_GAP) return up
    return ensureContrast(hslToHex({ h, s, l: Math.max(2, l - 10) }), text)
  }
  const up = l + MONO_STEP - 2
  if (up <= 96) return ensureContrast(hslToHex({ h, s, l: up }), text)
  const down = ensureContrast(hslToHex({ h, s, l: l - MONO_STEP - 2 }), text)
  if (Math.abs(hexToHsl(down).l - l) >= MONO_MIN_GAP) return down
  return ensureContrast(hslToHex({ h, s, l: Math.min(98, l + 8) }), text)
}

// Preferred muted secondary-text grays; tuneGray nudges them toward the
// given text pole until they pass CONTRAST_TARGET on every background.
const TEXT2_LIGHT_GRAY: Hsl = { h: 225, s: 14, l: 81 } // ≈ #c7cad6 (for white-text bgs)
const TEXT2_DARK_GRAY: Hsl = { h: 240, s: 5, l: 26 } // ≈ #3f3f46 (for black-text bgs)

/**
 * Secondary text color for backgrounds whose primary text is `pole`: starts
 * from the preferred gray on that side and moves its lightness toward the
 * pole until it reaches `target` contrast against EVERY given background.
 * Backgrounds are tuned to pass vs the pole itself, so the loop always
 * converges (worst case: text2 == the pole).
 */
function tuneGray(
  pole: '#ffffff' | '#000000',
  backgrounds: string[],
  target = CONTRAST_TARGET,
): string {
  const towardWhite = pole === '#ffffff'
  const { h, s, l: startL } = towardWhite ? TEXT2_LIGHT_GRAY : TEXT2_DARK_GRAY
  let l = startL
  let out = hslToHex({ h, s, l })
  const passes = (hex: string) => backgrounds.every((bg) => contrastRatio(hex, bg) >= target)
  while (!passes(out)) {
    const bound = towardWhite ? 100 : 0
    if (l === bound) return pole
    l = towardWhite ? Math.min(bound, l + 1) : Math.max(bound, l - 1)
    out = hslToHex({ h, s, l })
  }
  return out
}

/**
 * Primary text on a cycle background: the mode's canonical neutral (white in
 * dark, black in light) whenever it passes, flipping only when it cannot —
 * e.g. a vivid yellow section in adaptive dark mode takes black text.
 */
export function sectionTextOn(bg: string, mode: Mode): '#ffffff' | '#000000' {
  const preferred = mode === 'dark' ? '#ffffff' : '#000000'
  if (contrastRatio(bg, preferred) >= CONTRAST_TARGET) return preferred
  return preferred === '#ffffff' ? '#000000' : '#ffffff'
}

// --- Adaptive dark variants -------------------------------------------------
// Darkening is done in OKLCH so chroma survives (HSL darkening collapses it
// into gray-brown). Hues in the yellow→chartreuse band cannot be darkened
// enough for white text without turning olive — those REFUSE to darken and
// stay near their vivid cusp with black text instead.

const VIVID_HUE_MIN = 75
const VIVID_HUE_MAX = 145

function isVividHue(okHue: number): boolean {
  return okHue >= VIVID_HUE_MIN && okHue <= VIVID_HUE_MAX
}

/** Chroma below which a color is effectively achromatic — its OKLCH hue
 *  angle is numerical noise and must not drive any hue-based decision. */
const ACHROMATIC_C = 0.02

/** How saturated a color is relative to what its hue/lightness allows, so
 *  muted picks produce comparably muted variants. Chromatic colors get a
 *  0.35 floor; near-grays keep their (near-zero) ratio so no hue is
 *  invented for them. */
function relativeChroma(hex: string): number {
  const { L, C, h } = hexToOklch(hex)
  const max = maxChroma(L, h)
  if (max <= 1e-4) return 1
  const ratio = Math.min(1, C / max)
  return C < ACHROMATIC_C ? ratio : Math.max(0.35, ratio)
}

/** Deep jewel variant: same OKLCH hue, chroma near the gamut maximum,
 *  lightness lowered until white text passes. */
function jewelDark(hex: string, rel: number): string {
  const { h } = hexToOklch(hex)
  let L = 0.62
  let out = oklchToHex({ L, C: maxChroma(L, h) * 0.96 * rel, h })
  while (contrastRatio(out, '#ffffff') < CONTRAST_TARGET && L > 0.08) {
    L -= 0.01
    out = oklchToHex({ L, C: maxChroma(L, h) * 0.96 * rel, h })
  }
  return out
}

/** Vivid variant for hues that cannot darken: the hue near its chroma cusp,
 *  bright enough for black text. */
function vividBright(hex: string, rel: number): string {
  const { h } = hexToOklch(hex)
  let L = Math.max(cuspLightness(h).L, 0.75)
  let out = oklchToHex({ L, C: maxChroma(L, h) * 0.94 * rel, h })
  while (contrastRatio(out, '#000000') < CONTRAST_TARGET && L < 0.98) {
    L += 0.01
    out = oklchToHex({ L, C: maxChroma(L, h) * 0.94 * rel, h })
  }
  return out
}

function buildModeColors(
  mode: Mode,
  baseHsl: Hsl,
  hues: Hsl[],
  style: PaletteStyle,
  nativeMode: Mode,
): ModeColors {
  const text = mode === 'dark' ? '#ffffff' : '#000000'
  const [lo, hi] = mode === 'dark' ? [DARK_L_MIN, DARK_L_MAX] : [LIGHT_L_MIN, LIGHT_L_MAX]

  const hueCount = style === 'monochromatic' ? 1 : hues.length
  const colors: string[] = []
  for (let i = 0; i < hueCount; i++) {
    const hue = hues[i]
    if (i === 0 && mode === nativeMode) {
      // The base color stays recognizable in its native mode: colors[0] is
      // the pick itself (a native-dark pick always passes vs white, since
      // detectModeForBase chose dark because white was the better text).
      colors.push(ensureContrast(hslToHex({ h: hue.h, s: hue.s, l: baseHsl.l }), text))
      continue
    }
    const source = hslToHex({ h: hue.h, s: hue.s, l: hue.l })
    if (mode === 'dark') {
      // Adaptive dark: jewel-deep where the hue survives darkening, vivid
      // with black text where it would go olive (yellow→chartreuse band).
      // Achromatic sources never count as vivid — their hue is noise.
      const rel = relativeChroma(source)
      const ok = hexToOklch(source)
      const vivid = ok.C >= ACHROMATIC_C && isVividHue(ok.h)
      colors.push(vivid ? vividBright(source, rel) : jewelDark(source, rel))
    } else {
      colors.push(
        ensureContrast(hslToHex({ h: hue.h, s: hue.s, l: clamp(hue.l, lo, hi) }), text),
      )
    }
  }
  if (style === 'monochromatic') {
    // A bright (black-text) mono primary pairs with its own deep jewel;
    // otherwise use the classic distinct lightness step.
    if (mode === 'dark' && contrastRatio(colors[0], '#ffffff') < CONTRAST_TARGET) {
      colors.push(jewelDark(colors[0], relativeChroma(colors[0])))
    } else {
      colors.push(monoSecond(colors[0], mode, text))
    }
  }

  const surface = mode === 'dark' ? '#101018' : '#ffffff'
  // Mode-level text2 covers the surface plus every cycle color that keeps the
  // mode's canonical text; flipped (vivid black-text) entries get their own
  // per-entry gray in sectionColorScheme.
  const canonicalBgs = colors.filter((c) => sectionTextOn(c, mode) === text)
  const mc: ModeColors = {
    colors,
    primary: colors[0],
    secondary: colors[1],
    text,
    text2: tuneGray(text as '#ffffff' | '#000000', [...canonicalBgs, surface]),
    surface,
    surfaceText: text,
  }
  if (colors.length > 2) mc.tertiary = colors[2]
  if (colors.length > 3) mc.quaternary = colors[3]
  return mc
}

/**
 * Build the full SiteTheme for a picked base color + palette style.
 * - defaultMode = detectModeForBase(baseHex)
 * - dark colors: tuned so white text hits >= 4.5
 * - light colors: tuned so black text hits >= 4.5, kept clearly light
 * - colors[0] in the native mode starts from the picked color itself
 */
export function buildSiteTheme(
  baseHex: string,
  style: PaletteStyle,
  neutralAccent: boolean,
): SiteTheme {
  const baseHsl = hexToHsl(baseHex)
  const normalizedBase = hslToHex(baseHsl)
  const defaultMode = detectModeForBase(normalizedBase)
  const hues = generateHues(baseHsl, style)
  return {
    style,
    baseHex: normalizedBase,
    neutralAccent,
    defaultMode,
    dark: buildModeColors('dark', baseHsl, hues, style, defaultMode),
    light: buildModeColors('light', baseHsl, hues, style, defaultMode),
  }
}

export interface AccentPick {
  accent: string
  accentText: string
}

/** Minimum accent-vs-background contrast before falling back to neutral. */
const ACCENT_MIN_RATIO = 2.0

function neutralAccentPick(modeText: string): AccentPick {
  const accent = modeText
  const lower = accent.toLowerCase()
  const accentText =
    lower === '#ffffff' ? '#000000' : lower === '#000000' ? '#ffffff' : bestTextOn(accent)
  return { accent, accentText }
}

/**
 * CTA accent for a section background:
 * - neutralAccent themes, monochromatic themes, or a best candidate ratio
 *   below 2.0 => the section's own text color as accent, opposite label
 * - otherwise the highest-contrast OTHER-hue variant from EITHER mode's
 *   cycle ("the alternate mode color variant"): on a deep jewel section the
 *   pastel/vivid variants win; on a vivid yellow section a deep jewel wins.
 */
export function pickAccent(bg: string, theme: SiteTheme, mode: Mode): AccentPick {
  const mc = theme[mode]
  const neutral = () => neutralAccentPick(sectionTextOn(bg, mode))
  if (theme.neutralAccent || theme.style === 'monochromatic') {
    return neutral()
  }
  const bgLower = bg.toLowerCase()
  const bgIndex = mc.colors.findIndex((c) => c.toLowerCase() === bgLower)
  const candidates: string[] = []
  for (const side of [theme.light, theme.dark]) {
    side.colors.forEach((c, i) => {
      if (i !== bgIndex && c.toLowerCase() !== bgLower) candidates.push(c)
    })
  }
  if (candidates.length === 0) return neutral()
  let best = candidates[0]
  let bestRatio = contrastRatio(best, bg)
  for (let i = 1; i < candidates.length; i++) {
    const ratio = contrastRatio(candidates[i], bg)
    if (ratio > bestRatio) {
      best = candidates[i]
      bestRatio = ratio
    }
  }
  if (bestRatio < ACCENT_MIN_RATIO) return neutral()
  return { accent: best, accentText: bestTextOn(best) }
}

export interface SectionColors {
  bg: string
  text: string
  text2: string
  accent: string
  accentText: string
}

export interface SectionColorScheme {
  nav: SectionColors
  footer: SectionColors
  sections: SectionColors[]
}

/**
 * Section background cycling. k = cycle length:
 *   sections[i].bg = colors[i % k]
 *   nav.bg         = colors[(k - 1) % k]  (the color "before" section 0)
 *   footer.bg      = colors[n % k]        (continues after the last section)
 */
export function sectionColorScheme(
  visibleSectionCount: number,
  theme: SiteTheme,
  mode: Mode,
): SectionColorScheme {
  const mc = theme[mode]
  const k = mc.colors.length
  const n = Math.max(0, Math.floor(visibleSectionCount))
  const entry = (bg: string): SectionColors => {
    // Canonical mode text where it passes; vivid (flipped) sections get the
    // opposite neutral and a gray tuned against their own background.
    const text = sectionTextOn(bg, mode)
    const text2 = text === mc.text ? mc.text2 : tuneGray(text, [bg])
    const { accent, accentText } = pickAccent(bg, theme, mode)
    return { bg, text, text2, accent, accentText }
  }
  const sections: SectionColors[] = []
  for (let i = 0; i < n; i++) sections.push(entry(mc.colors[i % k]))
  return {
    nav: entry(mc.colors[(k - 1) % k]),
    footer: entry(mc.colors[n % k]),
    sections,
  }
}

// Theme building: contrast tuning, SiteTheme construction, accent picking,
// and the section background cycle.

import type { Mode, ModeColors, PaletteStyle, SiteTheme } from '../../content/types'
import { clamp, hexToHsl, hslToHex, type Hsl } from './convert'
import { bestTextOn, contrastRatio, detectModeForBase, relativeLuminance } from './wcag'
import { generateHues } from './styles'

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
    // In its native mode the base color stays recognizable: colors[0] starts
    // from the picked color itself. Everything else starts from the mode's
    // lightness band (deep variant in dark, pastel in light) before tuning.
    const startL = i === 0 && mode === nativeMode ? baseHsl.l : clamp(hue.l, lo, hi)
    colors.push(ensureContrast(hslToHex({ h: hue.h, s: hue.s, l: startL }), text))
  }
  if (style === 'monochromatic') {
    colors.push(monoSecond(colors[0], mode, text))
  }

  const mc: ModeColors = {
    colors,
    primary: colors[0],
    secondary: colors[1],
    text,
    text2: mode === 'dark' ? '#c7cad6' : '#3f3f46',
    surface: mode === 'dark' ? '#101018' : '#ffffff',
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
 *   below 2.0 => the mode neutral (text color) with the opposite neutral label
 * - otherwise the OTHER cycle color with the highest contrast vs bg.
 */
export function pickAccent(bg: string, theme: SiteTheme, mode: Mode): AccentPick {
  const mc = theme[mode]
  if (theme.neutralAccent || theme.style === 'monochromatic') {
    return neutralAccentPick(mc.text)
  }
  // Accents come from the OPPOSITE mode's variants of the other hues ("the
  // alternate mode color variant"): within one mode every cycle color sits in
  // the same lightness band (tuned for that mode's text), so same-mode colors
  // rarely contrast with each other. The opposite mode's variant of another
  // hue gives a vivid, guaranteed-contrast CTA — e.g. a pastel complement
  // button on a deep primary background in dark mode.
  const opposite = theme[mode === 'dark' ? 'light' : 'dark']
  const bgLower = bg.toLowerCase()
  const bgIndex = mc.colors.findIndex((c) => c.toLowerCase() === bgLower)
  const candidates = opposite.colors.filter(
    (c, i) => i !== bgIndex && c.toLowerCase() !== bgLower,
  )
  if (candidates.length === 0) return neutralAccentPick(mc.text)
  let best = candidates[0]
  let bestRatio = contrastRatio(best, bg)
  for (let i = 1; i < candidates.length; i++) {
    const ratio = contrastRatio(candidates[i], bg)
    if (ratio > bestRatio) {
      best = candidates[i]
      bestRatio = ratio
    }
  }
  if (bestRatio < ACCENT_MIN_RATIO) return neutralAccentPick(mc.text)
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
    const { accent, accentText } = pickAccent(bg, theme, mode)
    return { bg, text: mc.text, text2: mc.text2, accent, accentText }
  }
  const sections: SectionColors[] = []
  for (let i = 0; i < n; i++) sections.push(entry(mc.colors[i % k]))
  return {
    nav: entry(mc.colors[(k - 1) % k]),
    footer: entry(mc.colors[n % k]),
    sections,
  }
}

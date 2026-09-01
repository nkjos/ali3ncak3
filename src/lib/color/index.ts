// Color engine public API (SPEC.md "Color engine contract").
// Pure TypeScript — no React, no DOM.

export type { Hsl } from './convert'
export { hexToHsl, hslToHex } from './convert'

export {
  relativeLuminance,
  contrastRatio,
  bestTextOn,
  detectModeForBase,
} from './wcag'

export type { PaletteStyleDef } from './styles'
export { PALETTE_STYLES, generateHues } from './styles'

export type { AccentPick, SectionColors, SectionColorScheme } from './theme'
export {
  ensureContrast,
  buildSiteTheme,
  pickAccent,
  sectionColorScheme,
  sectionTextOn,
} from './theme'

export type { Oklch } from './oklch'
export { hexToOklch, oklchToHex, maxChroma, cuspLightness } from './oklch'

// Convenience re-exports of the shared model types used in signatures.
export type { Mode, ModeColors, PaletteStyle, SiteTheme } from '../../content/types'

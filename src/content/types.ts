// Shared data model for the Ali3nCak3 site.
// This file is a stable contract — coordinate before changing shapes.

export type Mode = 'light' | 'dark'

export type PaletteStyle =
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic'
  | 'square'

/**
 * Colors for one mode (light or dark). `colors` is the ordered background
 * cycle (2–4 entries depending on palette style); the named keys mirror it.
 * Dot-notation access per spec: theme.dark.primary, theme.light.text, etc.
 */
export interface ModeColors {
  colors: string[]
  primary: string
  secondary: string
  tertiary?: string
  quaternary?: string
  /** White in dark mode, black in light mode. */
  text: string
  /** Light gray in dark mode, dark gray in light mode. */
  text2: string
  /** Card / panel background matching the mode (near-black / near-white). */
  surface: string
  /** Text color used on `surface`. */
  surfaceText: string
}

export interface SiteTheme {
  style: PaletteStyle
  /** The single color the user picked on the wheel. */
  baseHex: string
  /** When true, CTAs use the mode neutral (white/black) instead of a palette color. */
  neutralAccent: boolean
  /** Mode determined from the picked color's contrast (white text wins ⇒ dark). */
  defaultMode: Mode
  light: ModeColors
  dark: ModeColors
}

export type PageId = 'home' | 'store'

export type SectionType =
  | 'hero'
  | 'about'
  | 'promoted'
  | 'misc'
  | 'storeBanner'
  | 'productGrid'

export interface SectionConfig {
  /** Unique per instance so the same type can appear twice. */
  uid: string
  type: SectionType
  enabled: boolean
}

export interface PageLayout {
  page: PageId
  /** Array order is display order. */
  sections: SectionConfig[]
}

export interface Product {
  id: string
  title: string
  description: string
  priceCents: number
  stock: number
  published: boolean
  promoted: boolean
}

export interface SiteSettings {
  coOwnerEmail: string | null
}

export interface PaletteWorkspace {
  /** Prefills the wheel when routing back to the palette screen. */
  lastPickHex: string | null
  /** Most-recent-first list of previously applied/picked primary colors. */
  history: string[]
}

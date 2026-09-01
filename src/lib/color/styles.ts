// Palette styles: metadata for the designer UI + hue-cycle generation.

import type { PaletteStyle } from '../../content/types'
import { clamp, normalizeHue, type Hsl } from './convert'

export interface PaletteStyleDef {
  id: PaletteStyle
  label: string
  /** Background cycle length (2-4). */
  count: number
  description: string
}

/** Hue offsets from the base hue H, per style. First entry is always H. */
const STYLE_OFFSETS: Record<PaletteStyle, number[]> = {
  monochromatic: [0, 0], // second entry differentiated by lightness later
  analogous: [0, 30, -30],
  complementary: [0, 180],
  'split-complementary': [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 60, 180, 240],
  square: [0, 90, 180, 270],
}

export const PALETTE_STYLES: PaletteStyleDef[] = [
  {
    id: 'monochromatic',
    label: 'Monochromatic',
    count: 2,
    description: 'Two lightness steps of a single hue for a calm, unified look.',
  },
  {
    id: 'analogous',
    label: 'Analogous',
    count: 3,
    description: 'The base hue plus its two wheel neighbors for an easy harmony.',
  },
  {
    id: 'complementary',
    label: 'Complementary',
    count: 2,
    description: 'The base hue paired with its opposite for the strongest pop.',
  },
  {
    id: 'split-complementary',
    label: 'Split complementary',
    count: 3,
    description: 'The base hue plus the two colors flanking its opposite.',
  },
  {
    id: 'triadic',
    label: 'Triadic',
    count: 3,
    description: 'Three hues evenly spaced around the wheel for lively balance.',
  },
  {
    id: 'tetradic',
    label: 'Tetradic',
    count: 4,
    description: 'Four hues in two complementary pairs arranged as a rectangle.',
  },
  {
    id: 'square',
    label: 'Square',
    count: 4,
    description: 'Four hues evenly spaced around the wheel for maximum variety.',
  },
]

/**
 * Generate the hue cycle for a style. Keeps the base saturation/lightness on
 * every entry; only the hue rotates. First entry is always the base hue.
 */
export function generateHues(base: Hsl, style: PaletteStyle): Hsl[] {
  const s = clamp(base.s, 0, 100)
  const l = clamp(base.l, 0, 100)
  return STYLE_OFFSETS[style].map((offset) => ({
    h: normalizeHue(base.h + offset),
    s,
    l,
  }))
}

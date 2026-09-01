// WCAG 2.x relative luminance / contrast helpers.

import type { Mode } from '../../content/types'
import { hexToRgb } from './convert'

function linearize(channel255: number): number {
  const c = channel255 / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** WCAG contrast ratio between two colors, 1 .. 21. Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Whichever of white/black text contrasts better on `bg` (ties go white). */
export function bestTextOn(bg: string): '#ffffff' | '#000000' {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000')
    ? '#ffffff'
    : '#000000'
}

/** White text wins on the base color => the site's native mode is dark. */
export function detectModeForBase(base: string): Mode {
  return bestTextOn(base) === '#ffffff' ? 'dark' : 'light'
}

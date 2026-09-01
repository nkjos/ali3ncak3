// Color space conversions: hex ('#rrggbb') <-> HSL (h 0-360, s/l 0-100).
// Pure functions, no DOM.

export interface Hsl {
  h: number
  s: number
  l: number
}

export interface Rgb {
  r: number
  g: number
  b: number
}

const HEX_RE = /^[0-9a-f]{6}$/

/** Parse '#rrggbb' (also tolerates '#rgb' and a missing '#') to 0-255 channels. */
export function hexToRgb(hex: string): Rgb {
  let raw = hex.trim().toLowerCase()
  if (raw.startsWith('#')) raw = raw.slice(1)
  if (raw.length === 3) {
    raw = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2]
  }
  if (!HEX_RE.test(raw)) {
    throw new Error(`Invalid hex color: "${hex}"`)
  }
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}

export function rgbToHex(rgb: Rgb): string {
  const to2 = (v: number) =>
    Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Normalize any hue (including negatives) into [0, 360). */
export function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) {
    return { h: 0, s: 0, l: l * 100 } // achromatic
  }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return { h: h * 60, s: s * 100, l: l * 100 }
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

export function hslToHex(hsl: Hsl): string {
  const h = normalizeHue(hsl.h) / 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return rgbToHex({ r: r * 255, g: g * 255, b: b * 255 })
}

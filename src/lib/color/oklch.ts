// Minimal OKLCH support (Björn Ottosson's OKLab, cylindrical form).
// Used for dark-variant generation: HSL darkening collapses chroma and turns
// yellows olive; OKLCH lets us darken while keeping the maximum chroma the
// sRGB gamut offers at each lightness, and detect hues that cannot survive
// darkening at all.

export interface Oklch {
  /** Perceptual lightness 0..1 */
  L: number
  /** Chroma (0 = gray; sRGB maxes out around 0.32 depending on hue) */
  C: number
  /** Hue angle in degrees [0, 360) */
  h: number
}

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055

export function hexToOklch(hex: string): Oklch {
  const clean = hex.replace('#', '')
  const r = srgbToLinear(parseInt(clean.slice(0, 2), 16) / 255)
  const g = srgbToLinear(parseInt(clean.slice(2, 4), 16) / 255)
  const b = srgbToLinear(parseInt(clean.slice(4, 6), 16) / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  return { L, C: Math.hypot(a, bb), h }
}

function oklchToLinearRgb(L: number, C: number, h: number): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const EPS = 1e-4

function inGamut(rgb: [number, number, number]): boolean {
  return rgb.every((c) => c >= -EPS && c <= 1 + EPS)
}

/** null when the color falls outside the sRGB gamut. */
export function oklchToHexExact(ok: Oklch): string | null {
  const rgb = oklchToLinearRgb(ok.L, ok.C, ok.h)
  if (!inGamut(rgb)) return null
  return (
    '#' +
    rgb
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, linearToSrgb(c))) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

/** Clamp into gamut by reducing chroma (hue and lightness preserved). */
export function oklchToHex(ok: Oklch): string {
  const exact = oklchToHexExact(ok)
  if (exact) return exact
  return oklchToHexExact({ ...ok, C: maxChroma(ok.L, ok.h) }) ?? '#000000'
}

// Memoized: the palette designer rebuilds seven themes per wheel-drag frame,
// and these searches dominate that cost. Keys quantize L/h slightly (below
// visual significance) to keep the caches small and hit rates high.
const chromaCache = new Map<string, number>()
const cuspCache = new Map<number, { L: number; C: number }>()

/** Highest chroma that stays inside sRGB at this lightness/hue. */
export function maxChroma(L: number, h: number): number {
  const key = `${L.toFixed(3)}|${h.toFixed(1)}`
  const cached = chromaCache.get(key)
  if (cached !== undefined) return cached
  let lo = 0
  let hi = 0.4
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (oklchToHexExact({ L, C: mid, h })) lo = mid
    else hi = mid
  }
  chromaCache.set(key, lo)
  return lo
}

/** The lightness where this hue is at its most vivid (chroma peak / cusp). */
export function cuspLightness(h: number): { L: number; C: number } {
  const key = Math.round(h * 2)
  const cached = cuspCache.get(key)
  if (cached) return cached
  let bestL = 0.5
  let bestC = 0
  for (let L = 0.3; L <= 0.95; L += 0.01) {
    const C = maxChroma(L, h)
    if (C > bestC) {
      bestC = C
      bestL = L
    }
  }
  const result = { L: bestL, C: bestC }
  cuspCache.set(key, result)
  return result
}

// Font lab text-size presets. Medium is the site as designed; each step up or
// down changes ALL text by 5% of its designed size (XX-Small 85% … XXXL 120%),
// so the proportions between headings, body copy and captions never change.
//
// Applied through the root font size: every site font size is in rem, so a
// percentage on <html> scales them all at once. The few headings sized with
// clamp(…vw…) multiply their viewport term by --text-scale (site.css) so they
// scale identically at every screen width. The lab's own panel undoes the
// scale (fontlab.css) so the tool stays the same size while previewing.

export type LabSizeId =
  | 'xxsmall'
  | 'xsmall'
  | 'small'
  | 'medium'
  | 'large'
  | 'xl'
  | 'xxl'
  | 'xxxl'

export interface LabSize {
  id: LabSizeId
  label: string
  /** Multiplier on every designed font size (medium = 1). */
  scale: number
}

export const SIZE_STEP = 0.05
export const DEFAULT_SIZE_ID: LabSizeId = 'medium'

const ORDER: [LabSizeId, string][] = [
  ['xxsmall', 'XX-Small'],
  ['xsmall', 'X-Small'],
  ['small', 'Small'],
  ['medium', 'Medium'],
  ['large', 'Large'],
  ['xl', 'XL'],
  ['xxl', 'XXL'],
  ['xxxl', 'XXXL'],
]
const MEDIUM_INDEX = ORDER.findIndex(([id]) => id === DEFAULT_SIZE_ID)

/** Smallest to largest. Scales are rounded so 5% steps stay exact (0.85, 0.9 …). */
export const LAB_SIZES: LabSize[] = ORDER.map(([id, label], i) => ({
  id,
  label,
  scale: Math.round((1 + (i - MEDIUM_INDEX) * SIZE_STEP) * 100) / 100,
}))

/** The preset for a saved or unknown value; anything unrecognized is Medium. */
export function labSize(id: unknown): LabSize {
  return LAB_SIZES.find((s) => s.id === id) ?? LAB_SIZES[MEDIUM_INDEX]
}

export function sizePercent(size: LabSize): number {
  return Math.round(size.scale * 100)
}

/** Scales every font size on the page; null (or Medium) restores the design. */
export function applyLabSize(size: LabSize | null) {
  const root = document.documentElement
  if (!size || size.scale === 1) {
    root.style.removeProperty('font-size')
    root.style.removeProperty('--text-scale')
    return
  }
  root.style.fontSize = `${sizePercent(size)}%`
  root.style.setProperty('--text-scale', String(size.scale))
}

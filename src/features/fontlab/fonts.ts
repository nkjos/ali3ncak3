// Font lab (/font): Google Fonts families offered by the picker, and the
// override that applies one of them to every element on the page.

export interface LabFont {
  family: string
  category: 'serif' | 'sans-serif' | 'weird'
  /** Weights verified to exist on Google Fonts (a missing one fails the request). */
  weights: number[]
  note: string
}

/** How each category reads in the panel's detail line. */
export const CATEGORY_LABELS: Record<LabFont['category'], string> = {
  serif: 'serif',
  'sans-serif': 'sans-serif',
  weird: 'strange & weird',
}

// 10 serif + 10 sans-serif, alternating so neighbouring dots look different,
// then 10 strange & weird display faces. Each family and weight was checked
// against the Google Fonts CSS2 API and covers the latin subset.
export const LAB_FONTS: LabFont[] = [
  { family: 'Newsreader', category: 'serif', weights: [300, 400, 500, 600, 700], note: 'optical-size editorial serif' },
  { family: 'Albert Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'restrained Scandinavian geometric' },
  { family: 'Literata', category: 'serif', weights: [300, 400, 500, 600, 700], note: 'warm modern book serif' },
  { family: 'Jost', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'Futura-like travel-poster geometric' },
  { family: 'Ibarra Real Nova', category: 'serif', weights: [400, 500, 600, 700], note: 'Spanish 18th-century classical' },
  { family: 'Red Hat Text', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'open, calm text sans' },
  { family: 'Spectral', category: 'serif', weights: [300, 400, 500, 600, 700], note: 'light, airy screen serif' },
  { family: 'Proza Libre', category: 'sans-serif', weights: [400, 500, 600, 700], note: 'warm bookish humanist sans' },
  { family: 'Crimson Pro', category: 'serif', weights: [300, 400, 500, 600, 700], note: 'literary old-style serif' },
  { family: 'Hanken Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'quiet neutral grotesk' },
  { family: 'Brygada 1918', category: 'serif', weights: [400, 500, 600, 700], note: 'hand-cut heritage warmth' },
  { family: 'Commissioner', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'subtly flared, carved feel' },
  { family: 'Petrona', category: 'serif', weights: [300, 400, 500, 600, 700], note: 'soft calligraphic text serif' },
  { family: 'Radio Canada', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'open, relaxed humanist sans' },
  { family: 'Gentium Book Plus', category: 'serif', weights: [400, 700], note: 'calm calligraphic book serif' },
  { family: 'Figtree', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'friendly soft geometric' },
  { family: 'Andada Pro', category: 'serif', weights: [400, 500, 600, 700], note: 'earthy humanist serif' },
  { family: 'Alegreya Sans', category: 'sans-serif', weights: [300, 400, 500, 700], note: 'calligraphic literary humanist' },
  { family: 'Libre Caslon Text', category: 'serif', weights: [400, 700], note: 'old-world letterpress Caslon' },
  { family: 'Onest', category: 'sans-serif', weights: [300, 400, 500, 600, 700], note: 'soft, even modern sans' },
  // Strange & weird: alien and otherworldly display faces, alternating
  // ancient-exotic (Papyrus territory), living/organic, and alien-tech.
  // Papyrus itself is a licensed Monotype font that Google Fonts doesn't carry.
  { family: 'Macondo', category: 'weird', weights: [400], note: 'Papyrus-like hand-cut exotic' },
  { family: 'Orbitron', category: 'weird', weights: [400, 500, 600, 700], note: 'geometric starship console' },
  { family: 'Moirai One', category: 'weird', weights: [400], note: 'melting, half-formed letters' },
  { family: 'Uncial Antiqua', category: 'weird', weights: [400], note: 'ancient mystic uncial script' },
  { family: 'Major Mono Display', category: 'weird', weights: [400], note: 'unsettling mixed-case alphabet' },
  { family: 'Rubik Microbe', category: 'weird', weights: [400], note: 'cellular alien specimen' },
  { family: 'Metamorphous', category: 'weird', weights: [400], note: 'runic fantasy gothic' },
  { family: 'Megrim', category: 'weird', weights: [400], note: 'wireframe alien signage' },
  { family: 'Kablammo', category: 'weird', weights: [400], note: 'wobbly letters that look alive' },
  { family: 'Codystar', category: 'weird', weights: [300, 400], note: 'dotted star-chart constellations' },
]

const OVERRIDE_STYLE_ID = 'fontlab-override'

export function stylesheetUrl(font: LabFont): string {
  const family = encodeURIComponent(font.family).replace(/%20/g, '+')
  const weights = [...font.weights].sort((a, b) => a - b).join(';')
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`
}

function loadStylesheet(font: LabFont) {
  const id = `fontlab-${font.family.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = stylesheetUrl(font)
  document.head.appendChild(link)
}

/** Applies a font to every element on the page; null restores the site font. */
export function applyLabFont(font: LabFont | null) {
  let style = document.getElementById(OVERRIDE_STYLE_ID)
  if (!font) {
    style?.remove()
    return
  }
  loadStylesheet(font)
  if (!style) {
    style = document.createElement('style')
    style.id = OVERRIDE_STYLE_ID
    document.head.appendChild(style)
  }
  // While a weird face loads, the generic `fantasy` family stands in (it is
  // Papyrus on macOS).
  const fallback =
    font.category === 'serif'
      ? "Georgia, 'Times New Roman', serif"
      : font.category === 'weird'
        ? "fantasy, system-ui, sans-serif"
        : "system-ui, -apple-system, 'Segoe UI', sans-serif"
  style.textContent = `body, body * { font-family: "${font.family}", ${fallback} !important; }`
}

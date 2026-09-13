// One card per palette style: name/description, swatch strips for both
// modes, two miniature site previews (dark + light) that honor the current
// Home layout order, and the Apply button.

import type { CSSProperties } from 'react'
import type {
  Mode,
  ModeColors,
  NeutralCycle,
  PaletteStyleDef,
  SectionColors,
  SiteTheme,
} from '../../lib/color'
import { neutralSlotCount, sectionColorScheme } from '../../lib/color'
import type { SectionType } from '../../content/types'

const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  about: 'About',
  promoted: 'Promoted items',
  misc: 'Misc',
  storeBanner: 'Store banner',
  productGrid: 'Product grid',
}

const NICE_FREQUENCIES = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]

function formatFrequency(f: number): string {
  const whole = Math.floor(f)
  const frac = f - whole
  const fracText = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : ''
  return whole === 0 ? fracText : `${whole}${fracText}`
}

/**
 * Frequency choices for a k-color palette on a page with `positions` slots
 * (navbar + sections + footer): "Off", then nice quarter steps from roughly
 * once-per-page up to k (= every other slot).
 */
export function frequencyOptions(k: number, positions: number): number[] {
  const oncePerPage = positions > 1 ? k / (positions - 1) : k
  const floorQuarter = Math.max(0.25, Math.floor(oncePerPage * 4) / 4)
  const vals = NICE_FREQUENCIES.filter((f) => f >= floorQuarter && f < k)
  vals.push(k)
  return [0, ...vals]
}

function NeutralCycleControls({
  k,
  cycle,
  sectionTypes,
  onChange,
}: {
  k: number
  cycle: NeutralCycle
  sectionTypes: SectionType[]
  onChange: (cycle: NeutralCycle) => void
}) {
  const positions = sectionTypes.length + 2
  const options = frequencyOptions(k, positions)
  const active = cycle.frequency > 0
  const slotLabels = ['Navbar', ...sectionTypes.map((t) => SECTION_LABELS[t]), 'Footer']
  const count = neutralSlotCount(positions, k, cycle)
  return (
    <div className="pd-cycle">
      <label className="pd-cycle-field">
        <span className="pd-cycle-label">Black/white slots</span>
        <select
          className="pd-select"
          value={String(cycle.frequency)}
          onChange={(e) => onChange({ ...cycle, frequency: Number(e.target.value) })}
          aria-label="How often the dark/light mode color appears in the section cycle"
        >
          {options.map((f) => (
            <option key={f} value={String(f)}>
              {f === 0
                ? 'Off'
                : f === k
                  ? 'Every other slot'
                  : `${formatFrequency(f)} per ${k}-color cycle`}
            </option>
          ))}
        </select>
      </label>
      <label className="pd-cycle-field">
        <span className="pd-cycle-label">Starts at</span>
        <select
          className="pd-select"
          value={String(Math.min(cycle.offset, slotLabels.length - 1))}
          disabled={!active}
          onChange={(e) => onChange({ ...cycle, offset: Number(e.target.value) })}
          aria-label="Page position of the first dark/light mode slot"
        >
          {slotLabels.map((label, q) => (
            <option key={q} value={String(q)}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <span className="pd-cycle-hint" aria-live="polite">
        {active
          ? `${count} of ${positions} Home slots use the mode color`
          : 'Palette colors only'}
      </span>
    </div>
  )
}

/** Section wrapper contract: expose the SectionColors as --section-* vars. */
function sectionVars(c: SectionColors): CSSProperties {
  return {
    '--section-bg': c.bg,
    '--section-text': c.text,
    '--section-text2': c.text2,
    '--section-accent': c.accent,
    '--section-accent-text': c.accentText,
  } as CSSProperties
}

function MiniNav({ colors }: { colors: SectionColors }) {
  return (
    <div className="pd-ms pd-ms-nav" style={sectionVars(colors)}>
      <span className="pd-ms-brand" />
      <span className="pd-ms-navlinks">
        <span className="pd-line" style={{ width: 10 }} />
        <span className="pd-line" style={{ width: 10 }} />
      </span>
      <span className="pd-ms-modedot" />
    </div>
  )
}

function MiniFooter({ colors }: { colors: SectionColors }) {
  return (
    <div className="pd-ms pd-ms-footer" style={sectionVars(colors)}>
      <span className="pd-line" style={{ width: 22 }} />
      <span className="pd-line pd-line-sub" style={{ width: 36 }} />
    </div>
  )
}

function MiniProductCard({
  mc,
  tint,
  withCta,
}: {
  mc: ModeColors
  tint: string
  withCta: boolean
}) {
  return (
    <span className="pd-ms-card" style={{ background: mc.surface }}>
      <span
        className="pd-line pd-ms-card-line"
        style={{ background: mc.surfaceText, width: '72%' }}
      />
      <span className="pd-ms-card-img" style={{ background: tint }} />
      <span
        className="pd-line pd-ms-card-line"
        style={{ background: mc.surfaceText, opacity: 0.85, width: '38%' }}
      />
      <span
        className="pd-line pd-ms-card-line"
        style={{ background: mc.surfaceText, opacity: 0.45, width: '88%' }}
      />
      {withCta && <span className="pd-ms-card-cta" />}
    </span>
  )
}

function MiniSection({
  type,
  colors,
  mc,
}: {
  type: SectionType
  colors: SectionColors
  mc: ModeColors
}) {
  const k = mc.colors.length
  switch (type) {
    case 'hero':
      return (
        <div className="pd-ms pd-ms-hero" style={sectionVars(colors)}>
          <span className="pd-line pd-line-title" style={{ width: '52%' }} />
          <span className="pd-line pd-line-sub" style={{ width: '38%' }} />
          <span className="pd-ms-cta" />
        </div>
      )
    case 'about':
    case 'misc':
      return (
        <div
          className={'pd-ms pd-ms-about' + (type === 'misc' ? ' is-mirrored' : '')}
          style={sectionVars(colors)}
        >
          <span className="pd-ms-square" />
          <span className="pd-ms-lines">
            <span className="pd-line pd-line-title" style={{ width: '68%' }} />
            <span className="pd-line pd-line-sub" style={{ width: '94%' }} />
            <span className="pd-line pd-line-sub" style={{ width: '78%' }} />
          </span>
        </div>
      )
    case 'promoted':
      return (
        <div className="pd-ms pd-ms-promoted" style={sectionVars(colors)}>
          <span className="pd-line pd-line-title" style={{ width: '34%' }} />
          <span className="pd-ms-cards">
            {[0, 1, 2].map((i) => (
              <MiniProductCard key={i} mc={mc} tint={mc.colors[i % k]} withCta />
            ))}
          </span>
        </div>
      )
    case 'storeBanner':
      return (
        <div className="pd-ms pd-ms-banner" style={sectionVars(colors)}>
          <span className="pd-line pd-line-title" style={{ width: '44%' }} />
        </div>
      )
    case 'productGrid':
      return (
        <div className="pd-ms pd-ms-grid" style={sectionVars(colors)}>
          <span className="pd-ms-cards">
            {[0, 1, 2].map((i) => (
              <MiniProductCard key={i} mc={mc} tint={mc.colors[i % k]} withCta={false} />
            ))}
          </span>
        </div>
      )
  }
}

export function MiniSitePreview({
  theme,
  mode,
  sectionTypes,
}: {
  theme: SiteTheme
  mode: Mode
  sectionTypes: SectionType[]
}) {
  const scheme = sectionColorScheme(sectionTypes.length, theme, mode)
  const mc = theme[mode]
  const isDefault = theme.defaultMode === mode
  return (
    <figure className="pd-preview">
      <div className="pd-preview-screen" style={{ background: mc.surface }}>
        <MiniNav colors={scheme.nav} />
        {sectionTypes.map((type, i) => (
          <MiniSection key={i} type={type} colors={scheme.sections[i]} mc={mc} />
        ))}
        {sectionTypes.length === 0 && (
          <span className="pd-ms-empty" style={{ color: mc.text2 }}>
            No sections enabled
          </span>
        )}
        <MiniFooter colors={scheme.footer} />
      </div>
      <figcaption className="pd-preview-caption">
        {mode === 'dark' ? 'Dark' : 'Light'}
        {isDefault && <span className="pd-preview-default">default</span>}
      </figcaption>
    </figure>
  )
}

function SwatchStrip({ label, colors }: { label: string; colors: string[] }) {
  return (
    <div className="pd-strip">
      <span className="pd-strip-label">{label}</span>
      <span className="pd-strip-swatches">
        {colors.map((c, i) => (
          <span key={`${c}-${i}`} className="pd-strip-swatch" title={c}>
            <span className="pd-strip-chip" style={{ background: c }} />
            <code>{c}</code>
          </span>
        ))}
      </span>
    </div>
  )
}

interface StyleCardProps {
  def: PaletteStyleDef
  theme: SiteTheme
  /** True when this exact style + base + accent + cycle setting is live on the site. */
  applied: boolean
  /** Enabled Home sections, in display order (live from the layout store). */
  sectionTypes: SectionType[]
  /** This card's neutral-slot settings (frequency per cycle + first position). */
  cycle: NeutralCycle
  onCycleChange: (cycle: NeutralCycle) => void
  onApply: () => void
}

export default function StyleCard({
  def,
  theme,
  applied,
  sectionTypes,
  cycle,
  onCycleChange,
  onApply,
}: StyleCardProps) {
  return (
    <article className={'pd-card' + (applied ? ' is-applied' : '')}>
      <header className="pd-card-head">
        <div className="pd-card-title">
          <h3>{def.label}</h3>
          <p>{def.description}</p>
        </div>
        <div className="pd-card-meta">
          {applied && <span className="pd-badge">Applied</span>}
          <span className="pd-card-count">{def.count} colors</span>
        </div>
      </header>

      <NeutralCycleControls
        k={def.count}
        cycle={cycle}
        sectionTypes={sectionTypes}
        onChange={onCycleChange}
      />

      <div className="pd-strips">
        <SwatchStrip label="Dark" colors={theme.dark.colors} />
        <SwatchStrip label="Light" colors={theme.light.colors} />
      </div>

      <div className="pd-previews">
        <MiniSitePreview theme={theme} mode="dark" sectionTypes={sectionTypes} />
        <MiniSitePreview theme={theme} mode="light" sectionTypes={sectionTypes} />
      </div>

      <button
        type="button"
        className={'pd-apply' + (applied ? ' is-applied' : '')}
        onClick={onApply}
        disabled={applied}
      >
        {applied ? 'Applied to site' : 'Apply palette'}
      </button>
    </article>
  )
}

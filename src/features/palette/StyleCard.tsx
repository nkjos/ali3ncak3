// One card per palette style: name/description, swatch strips for both
// modes, two miniature site previews (dark + light) that honor the current
// Home layout order, and the Apply button.

import type { CSSProperties } from 'react'
import type {
  Mode,
  ModeColors,
  PaletteStyleDef,
  SectionColors,
  SiteTheme,
} from '../../lib/color'
import { sectionColorScheme } from '../../lib/color'
import type { SectionType } from '../../content/types'

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
  /** True when this exact style + base + accent setting is live on the site. */
  applied: boolean
  /** Enabled Home sections, in display order (live from the layout store). */
  sectionTypes: SectionType[]
  onApply: () => void
}

export default function StyleCard({
  def,
  theme,
  applied,
  sectionTypes,
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

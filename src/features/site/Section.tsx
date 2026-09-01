// Section rendering contract (SPEC.md): a wrapper that applies its
// SectionColors as inline CSS vars on the section root. Everything inside a
// section styles itself with --section-bg / --section-text / --section-text2 /
// --section-accent / --section-accent-text.

import type { CSSProperties, ReactNode } from 'react'
import type { SectionColors } from '../../lib/color'

/** Inline style object carrying the per-section CSS custom properties. */
export function sectionVarStyle(colors: SectionColors): CSSProperties {
  return {
    '--section-bg': colors.bg,
    '--section-text': colors.text,
    '--section-text2': colors.text2,
    '--section-accent': colors.accent,
    '--section-accent-text': colors.accentText,
  } as CSSProperties
}

interface SectionProps {
  colors: SectionColors
  /** Section type used for a `section--<kind>` modifier class. */
  kind: string
  /** Extra class(es) for the inner container. */
  innerClassName?: string
  children: ReactNode
}

export function Section({ colors, kind, innerClassName, children }: SectionProps) {
  return (
    <section
      className={`section section--${kind}`}
      style={sectionVarStyle(colors)}
    >
      <div className={`section__inner${innerClassName ? ` ${innerClassName}` : ''}`}>
        {children}
      </div>
    </section>
  )
}

// Site footer. Colored as the cycle color AFTER the last visible section
// per the cycling contract — PageWrapper hands it the scheme's footer colors.

import type { SectionColors } from '../../lib/color'
import { sectionVarStyle } from './Section'

export function Footer({ colors }: { colors: SectionColors }) {
  return (
    <footer className="site-footer" style={sectionVarStyle(colors)}>
      <div className="site-footer__inner">
        <span className="site-footer__brand">Ali3nCak3</span>
        <span className="site-footer__copy">
          &copy; {new Date().getFullYear()} Ali3nCak3 · baked on Earth, inspired
          elsewhere
        </span>
        {/* Socials placeholder — real links land with the brand accounts. */}
        <span className="site-footer__socials" aria-label="Social links coming soon">
          <span>Instagram</span>
          <span>TikTok</span>
          <span>YouTube</span>
        </span>
      </div>
    </footer>
  )
}

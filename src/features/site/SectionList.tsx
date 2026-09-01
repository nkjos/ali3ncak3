// Renders a page's ENABLED sections in layout order, each colored by its
// position among enabled sections only (SPEC: disabling/reordering in admin
// automatically restyles following sections — this falls out of the cycle).

import { useLayout } from '../../content/store'
import type { PageId } from '../../content/types'
import { useTheme } from '../../theme/ThemeProvider'
import { sectionColorScheme } from '../../lib/color'
import { usePageColorScheme } from './PageWrapper'
import { SECTION_COMPONENTS } from './sections'

export function SectionList({ page }: { page: PageId }) {
  const layout = useLayout(page)
  const { theme, mode } = useTheme()
  const enabled = layout.sections.filter((s) => s.enabled)

  // Prefer the wrapper's scheme (same computation that colored nav/footer);
  // fall back to computing locally if rendered outside PageWrapper or the
  // counts ever disagree.
  const ctxScheme = usePageColorScheme()
  const scheme =
    ctxScheme && ctxScheme.sections.length === enabled.length
      ? ctxScheme
      : sectionColorScheme(enabled.length, theme, mode)

  return (
    <>
      {enabled.map((section, i) => {
        const SectionComponent = SECTION_COMPONENTS[section.type]
        return <SectionComponent key={section.uid} colors={scheme.sections[i]} />
      })}
    </>
  )
}

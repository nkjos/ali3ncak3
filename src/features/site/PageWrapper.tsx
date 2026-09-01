// Template wrapper used by ALL routes (react-router layout route).
// Renders NavBar, <main> with the nested route Outlet, and Footer, and
// computes the page's SectionColorScheme from the COMPLETE color engine:
//   - '/'        -> enabled sections of the home layout
//   - '/store'   -> enabled sections of the store layout
//   - any other route (e.g. /admin) -> 0 sections, so nav = colors[k-1]
//     and footer = colors[0] per the cycling contract.
// The scheme is shared via context so pages color their sections from the
// exact same computation that colored the nav and footer.

import { createContext, useContext, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import type { PageId } from '../../content/types'
import { useLayout } from '../../content/store'
import { useTheme } from '../../theme/ThemeProvider'
import { sectionColorScheme, type SectionColorScheme } from '../../lib/color'
import { NavBar } from './NavBar'
import { Footer } from './Footer'
import './site.css'

const SchemeContext = createContext<SectionColorScheme | null>(null)

/** The current route's SectionColorScheme (null outside PageWrapper). */
export function usePageColorScheme(): SectionColorScheme | null {
  return useContext(SchemeContext)
}

function routePageId(pathname: string): PageId | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return 'home'
  if (path === '/store') return 'store'
  return null // non-content routes (e.g. /admin) -> 0 sections
}

export function PageWrapper() {
  const { theme, mode } = useTheme()
  const { pathname } = useLocation()

  // Both layouts are subscribed unconditionally to keep hook order stable.
  const homeLayout = useLayout('home')
  const storeLayout = useLayout('store')

  const pageId = routePageId(pathname)
  const layout =
    pageId === 'home' ? homeLayout : pageId === 'store' ? storeLayout : null
  const visibleCount = layout
    ? layout.sections.filter((s) => s.enabled).length
    : 0

  const scheme = useMemo(
    () => sectionColorScheme(visibleCount, theme, mode),
    [visibleCount, theme, mode],
  )

  return (
    <SchemeContext.Provider value={scheme}>
      <NavBar colors={scheme.nav} />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer colors={scheme.footer} />
    </SchemeContext.Provider>
  )
}

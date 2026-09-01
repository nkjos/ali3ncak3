// Site navigation bar. Colored as "the color before section 0" per the
// cycling contract — PageWrapper hands it the scheme's nav SectionColors.
// Links: Home + Store only. NEVER a link to /admin (spec guard).

import { Link, NavLink } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeProvider'
import type { SectionColors } from '../../lib/color'
import { sectionVarStyle } from './Section'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `site-nav__link${isActive ? ' site-nav__link--active' : ''}`
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
      />
    </svg>
  )
}

export function NavBar({ colors }: { colors: SectionColors }) {
  const { mode, toggleMode } = useTheme()
  const next = mode === 'dark' ? 'light' : 'dark'
  return (
    <header className="site-nav" style={sectionVarStyle(colors)}>
      <div className="site-nav__inner">
        <Link to="/" className="site-nav__brand">
          Ali3nCak3
        </Link>
        <nav className="site-nav__links" aria-label="Main">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/store" className={navLinkClass}>
            Store
          </NavLink>
          <button
            type="button"
            className="mode-toggle"
            onClick={toggleMode}
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
          >
            {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </nav>
      </div>
    </header>
  )
}

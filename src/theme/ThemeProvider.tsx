// Site-wide theme context: resolves the active SiteTheme (applied palette or
// DEFAULT_THEME), the active mode (visitor toggle > theme default > system),
// and mirrors the active ModeColors onto CSS custom properties.
//
// CSS variables set on <html> (use these in stylesheets):
//   --c-primary --c-secondary --c-tertiary --c-quaternary
//   --c-text --c-text2 --c-surface --c-surface-text
// plus a data-mode="light|dark" attribute for mode-scoped CSS.

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react'
import type { Mode, ModeColors, SiteTheme } from '../content/types'
import {
  saveModePreference,
  useModePreference,
  useSiteThemeValue,
} from '../content/store'
import { DEFAULT_THEME } from './defaultTheme'

interface ThemeContextValue {
  theme: SiteTheme
  mode: Mode
  /** Colors for the active mode (theme[mode]). */
  modeColors: ModeColors
  setMode: (mode: Mode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemMode(): Mode {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
  ) {
    return 'light'
  }
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const applied = useSiteThemeValue()
  const theme = applied ?? DEFAULT_THEME
  const pref = useModePreference()
  const mode: Mode = pref ?? theme.defaultMode ?? systemMode()
  const modeColors = theme[mode]

  const setMode = useCallback((m: Mode) => saveModePreference(m), [])
  const toggleMode = useCallback(
    () => saveModePreference(mode === 'dark' ? 'light' : 'dark'),
    [mode],
  )

  // Layout effect: swap the variables before paint so mode/theme changes
  // (and the first mount after the index.html pre-paint script) never flash.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.mode = mode
    root.style.setProperty('--c-primary', modeColors.primary)
    root.style.setProperty('--c-secondary', modeColors.secondary)
    root.style.setProperty('--c-tertiary', modeColors.tertiary ?? modeColors.primary)
    root.style.setProperty(
      '--c-quaternary',
      modeColors.quaternary ?? modeColors.secondary,
    )
    root.style.setProperty('--c-text', modeColors.text)
    root.style.setProperty('--c-text2', modeColors.text2)
    root.style.setProperty('--c-surface', modeColors.surface)
    root.style.setProperty('--c-surface-text', modeColors.surfaceText)
  }, [mode, modeColors])

  const value = useMemo(
    () => ({ theme, mode, modeColors, setMode, toggleMode }),
    [theme, mode, modeColors, setMode, toggleMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

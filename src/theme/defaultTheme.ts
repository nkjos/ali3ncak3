import type { SiteTheme } from '../content/types'

// Hand-tuned starter palette used until an admin applies one from the
// palette designer. Complementary indigo/amber; dark is the native mode.
export const DEFAULT_THEME: SiteTheme = {
  style: 'complementary',
  baseHex: '#4f46e5',
  neutralAccent: false,
  defaultMode: 'dark',
  dark: {
    colors: ['#312e81', '#713f12'],
    primary: '#312e81',
    secondary: '#713f12',
    text: '#ffffff',
    text2: '#c7cad6',
    surface: '#101018',
    surfaceText: '#ffffff',
  },
  light: {
    colors: ['#c7d2fe', '#fde68a'],
    primary: '#c7d2fe',
    secondary: '#fde68a',
    text: '#000000',
    text2: '#3f3f46',
    surface: '#ffffff',
    surfaceText: '#000000',
  },
}

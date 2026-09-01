// LocalStorage-backed content store with live subscriptions.
//
// This is the single source of truth for site content (layouts, products,
// theme, settings). It is deliberately shaped like a remote store so a
// Firebase/Supabase implementation can replace the internals later without
// touching callers: every read goes through typed getters, every write
// through typed setters, and consumers react via subscribe()/hooks.
//
// NOTE: with no backend yet, "publish" means this browser only.

import { useSyncExternalStore } from 'react'
import type {
  Mode,
  PageId,
  PageLayout,
  PaletteWorkspace,
  Product,
  SiteSettings,
  SiteTheme,
} from './types'

export type StoreKey =
  | 'layout:home'
  | 'layout:store'
  | 'products'
  | 'theme'
  | 'settings'
  | 'palette'
  | 'modePref'
  | 'authEmail'

const PREFIX = 'ac3:'

// ---------------------------------------------------------------------------
// Defaults / seed content
// ---------------------------------------------------------------------------

export const DEFAULT_LAYOUTS: Record<PageId, PageLayout> = {
  home: {
    page: 'home',
    sections: [
      { uid: 'home-hero', type: 'hero', enabled: true },
      { uid: 'home-about', type: 'about', enabled: true },
      { uid: 'home-promoted', type: 'promoted', enabled: true },
      { uid: 'home-misc', type: 'misc', enabled: true },
    ],
  },
  store: {
    page: 'store',
    sections: [
      { uid: 'store-banner', type: 'storeBanner', enabled: true },
      { uid: 'store-grid', type: 'productGrid', enabled: true },
    ],
  },
}

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'p-classic',
    title: 'Cla55ic Ali3n Cak3',
    description: 'The original. Layers of cosmic sponge with nebula frosting.',
    priceCents: 3200,
    stock: 12,
    published: true,
    promoted: true,
  },
  {
    id: 'p-ufo',
    title: 'UF-Dough Rolls',
    description: 'A half dozen swirled rolls, abducted straight from the oven.',
    priceCents: 1400,
    stock: 30,
    published: true,
    promoted: true,
  },
  {
    id: 'p-moon',
    title: 'Mo0n Rock Brownies',
    description: 'Dense fudge brownies with crater-crackle tops.',
    priceCents: 1800,
    stock: 24,
    published: true,
    promoted: true,
  },
  {
    id: 'p-comet',
    title: 'C0met Tart',
    description: 'Citrus tart with a trailing sugar-dust finish. Seasonal.',
    priceCents: 2600,
    stock: 0,
    published: false,
    promoted: false,
  },
]

export const DEFAULT_SETTINGS: SiteSettings = { coOwnerEmail: null }

export const DEFAULT_PALETTE_WORKSPACE: PaletteWorkspace = {
  lastPickHex: null,
  history: [],
}

// ---------------------------------------------------------------------------
// Core cache + pub/sub
// ---------------------------------------------------------------------------

const cache = new Map<StoreKey, unknown>()
const listeners = new Map<StoreKey, Set<() => void>>()

function storageKey(key: StoreKey): string {
  return PREFIX + key
}

function emit(key: StoreKey): void {
  listeners.get(key)?.forEach((fn) => fn())
}

function read<T>(key: StoreKey, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value: T = fallback
  try {
    const raw = window.localStorage.getItem(storageKey(key))
    if (raw !== null) value = JSON.parse(raw) as T
  } catch {
    // Unavailable or corrupt storage — serve the fallback.
  }
  cache.set(key, value)
  return value
}

function write<T>(key: StoreKey, value: T): void {
  cache.set(key, value)
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value))
  } catch {
    // Storage full/blocked — in-memory value still works for this session.
  }
  emit(key)
}

function remove(key: StoreKey): void {
  cache.delete(key)
  try {
    window.localStorage.removeItem(storageKey(key))
  } catch {
    // ignore
  }
  emit(key)
}

// Cross-tab sync: another tab's write invalidates our cache and notifies.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(PREFIX)) return
    const key = e.key.slice(PREFIX.length) as StoreKey
    cache.delete(key)
    emit(key)
  })
}

export function subscribe(key: StoreKey, fn: () => void): () => void {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(fn)
  return () => set.delete(fn)
}

// ---------------------------------------------------------------------------
// Typed getters / setters
// ---------------------------------------------------------------------------

export function getLayout(page: PageId): PageLayout {
  return read(`layout:${page}` as StoreKey, DEFAULT_LAYOUTS[page])
}

export function saveLayout(layout: PageLayout): void {
  write(`layout:${layout.page}` as StoreKey, layout)
}

export function getProducts(): Product[] {
  return read('products', SEED_PRODUCTS)
}

export function saveProducts(products: Product[]): void {
  write('products', products)
}

/** Null means "no palette applied yet" — the app falls back to DEFAULT_THEME. */
export function getSiteTheme(): SiteTheme | null {
  return read<SiteTheme | null>('theme', null)
}

export function saveSiteTheme(theme: SiteTheme): void {
  write('theme', theme)
}

export function getSettings(): SiteSettings {
  return read('settings', DEFAULT_SETTINGS)
}

export function saveSettings(settings: SiteSettings): void {
  write('settings', settings)
}

export function getPaletteWorkspace(): PaletteWorkspace {
  return read('palette', DEFAULT_PALETTE_WORKSPACE)
}

export function savePaletteWorkspace(ws: PaletteWorkspace): void {
  write('palette', ws)
}

/** The visitor's explicit light/dark toggle choice; null = follow theme default. */
export function getModePreference(): Mode | null {
  return read<Mode | null>('modePref', null)
}

export function saveModePreference(mode: Mode | null): void {
  if (mode === null) remove('modePref')
  else write('modePref', mode)
}

/** Prototype auth: the "signed in" email (see features/admin/auth). */
export function getAuthEmail(): string | null {
  return read<string | null>('authEmail', null)
}

export function saveAuthEmail(email: string | null): void {
  if (email === null) remove('authEmail')
  else write('authEmail', email)
}

// ---------------------------------------------------------------------------
// React hooks (useSyncExternalStore — snapshots are reference-stable because
// reads are served from the cache until the next write)
// ---------------------------------------------------------------------------

function useStoreValue<T>(key: StoreKey, getSnapshot: () => T): T {
  return useSyncExternalStore(
    (fn) => subscribe(key, fn),
    getSnapshot,
    getSnapshot,
  )
}

export function useLayout(page: PageId): PageLayout {
  return useStoreValue(`layout:${page}` as StoreKey, () => getLayout(page))
}

export function useProducts(): Product[] {
  return useStoreValue('products', getProducts)
}

export function useSiteThemeValue(): SiteTheme | null {
  return useStoreValue('theme', getSiteTheme)
}

export function useSettings(): SiteSettings {
  return useStoreValue('settings', getSettings)
}

export function usePaletteWorkspace(): PaletteWorkspace {
  return useStoreValue('palette', getPaletteWorkspace)
}

export function useModePreference(): Mode | null {
  return useStoreValue('modePref', getModePreference)
}

export function useAuthEmail(): string | null {
  return useStoreValue('authEmail', getAuthEmail)
}

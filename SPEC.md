# Ali3nCak3 — Build Spec

Prototype storefront for **ali3ncak3.com**. Vite + React + TypeScript SPA,
deployed to GitHub Pages (main → ali3ncak3.com, dev → dev.ali3ncak3.com behind
a client-side password gate). No backend yet: all content lives in a
localStorage-backed store (`src/content/store.ts`) shaped like a remote store
so Firebase can replace it later.

## Non-negotiable constraints (all agents)

- **Only create/edit files inside your owned directory** (ownership map below).
  Never edit `src/content/*`, `src/theme/*`, `src/index.css`, `src/App.tsx`,
  `src/main.tsx`, `package.json`, `vite.config.ts`, or another agent's dir.
- **No new npm dependencies.** Installed: react, react-dom, react-router-dom,
  vitest (dev). Build UI with plain React + CSS (a co-located `.css` file per
  feature is fine — import it from your components).
- Verify your area typechecks: `npx tsc --noEmit -p tsconfig.app.json`
  (ignore errors coming from files outside your directory, e.g. the untouched
  Vite demo `App.tsx`; report your own errors fixed).
- Styling: use the CSS variables from `src/index.css` + ThemeProvider
  (`--c-primary`, `--c-secondary`, `--c-tertiary`, `--c-quaternary`,
  `--c-text`, `--c-text2`, `--c-surface`, `--c-surface-text`, spacing/radius
  tokens). Sections get per-section `--section-*` vars (see cycling contract).
- Mobile-friendly: nothing may cause horizontal page scroll; use flex/grid.

## Ownership map

| Area | Directory | Agent |
| --- | --- | --- |
| Shared model/store/theme | `src/content/`, `src/theme/` | ALREADY WRITTEN — read-only |
| Color engine | `src/lib/color/` | ENGINE |
| Palette designer UI | `src/features/palette/` | PALETTE |
| Admin portal | `src/features/admin/` | ADMIN |
| Public site | `src/features/site/` | SITE |
| Dev gate + CI/CD | `src/features/gate/`, `.github/`, `docs/` | DEPLOY |

Read `src/content/types.ts`, `src/content/store.ts`,
`src/theme/ThemeProvider.tsx`, `src/theme/defaultTheme.ts`, and
`src/index.css` before writing code.

## Color engine contract (`src/lib/color/index.ts`)

Pure TypeScript, no React. Everything below must be exported (implementation
files may be split; re-export from `index.ts`). Include vitest tests in
`src/lib/color/__tests__/` (run: `npx vitest run`).

```ts
// Conversions (hex like '#rrggbb'; h 0–360, s/l 0–100)
export interface Hsl { h: number; s: number; l: number }
export function hexToHsl(hex: string): Hsl
export function hslToHex(hsl: Hsl): string

// WCAG
export function relativeLuminance(hex: string): number        // 0..1
export function contrastRatio(a: string, b: string): number   // 1..21
export function bestTextOn(bg: string): '#ffffff' | '#000000' // higher ratio wins
export function detectModeForBase(base: string): Mode
//   bestTextOn(base) === '#ffffff' ? 'dark' : 'light'

// Palette styles
export interface PaletteStyleDef {
  id: PaletteStyle
  label: string       // e.g. 'Split complementary'
  count: number       // background cycle length: mono 2, complementary 2,
                      // analogous 3, split-complementary 3, triadic 3,
                      // tetradic 4, square 4
  description: string // one sentence for the UI
}
export const PALETTE_STYLES: PaletteStyleDef[]

// Hue generation. First entry is always the base hue. Offsets from base hue H:
//   monochromatic:        [H, H] (second entry differentiated by lightness later)
//   analogous:            [H, H+30, H-30]
//   complementary:        [H, H+180]
//   split-complementary:  [H, H+150, H+210]
//   triadic:              [H, H+120, H+240]
//   tetradic (rectangle): [H, H+60, H+180, H+240]
//   square:               [H, H+90, H+180, H+270]
export function generateHues(base: Hsl, style: PaletteStyle): Hsl[]

// Contrast tuning: adjust ONLY lightness (keep h/s) until
// contrastRatio(result, text) >= target (4.5). Move l darker for white text,
// lighter for black text; clamp and accept best-effort at extremes.
export function ensureContrast(hex: string, text: string, target?: number): string

// Theme building.
// - defaultMode = detectModeForBase(baseHex)
// - dark.colors[i]: ADAPTIVE (in OKLCH, so chroma survives darkening):
//   hues that darken gracefully become deep "jewel" variants (chroma near
//   the gamut max, lightness lowered until white text hits >= 4.5); hues in
//   the yellow→chartreuse band (OKLCH h ≈ 75–145, where any white-text-deep
//   variant is olive/brown) REFUSE to darken and stay near their vivid cusp
//   with black text instead. Achromatic sources never count as vivid.
//   Variant chroma scales with the source's relative chroma so muted picks
//   stay muted. sectionTextOn(bg, mode) resolves the per-section text:
//   the mode's canonical neutral when it passes, flipped otherwise.
// - light.colors[i]: hue i tuned so black text hits >= 4.5 (pastel variant,
//   l ~70–88 before tuning; black text passes easily — keep colors clearly
//   light so sections read as light mode).
// - The base color should remain recognizable: in its native mode
//   (defaultMode), colors[0] starts from the picked color itself, then tuned.
// - monochromatic: both entries share the hue; entry 1 primary, entry 2 a
//   clearly distinct lightness step of the same hue (still contrast-tuned).
// - text: '#ffffff' dark / '#000000' light. text2: light gray dark mode
//   (~#c7cad6) / dark gray light mode (~#3f3f46). surface: near-black
//   (~#101018) / white. surfaceText = text.
// - Named keys primary/secondary/tertiary/quaternary mirror colors[0..3].
export function buildSiteTheme(
  baseHex: string,
  style: PaletteStyle,
  neutralAccent: boolean,
): SiteTheme

// CTA accent for a given background:
// - If theme.neutralAccent OR theme.style === 'monochromatic' OR the best
//   candidate ratio < 2.0 → accent = sectionTextOn(bg, mode) (the section's
//   own text neutral), accentText = the opposite neutral.
// - Else candidates are BOTH modes' cycle colors excluding the bg's own
//   cycle index ("the alternate mode color variant", generalized): on a deep
//   jewel section the pastel/vivid variants win; on a vivid yellow section a
//   deep jewel wins. Pick the candidate with the highest contrastRatio vs
//   bg; accentText = bestTextOn(accent).
export interface AccentPick { accent: string; accentText: string }
export function pickAccent(bg: string, theme: SiteTheme, mode: Mode): AccentPick

// Section color cycling. k = modeColors.colors.length, n = visible sections.
//   sections[i].bg = colors[i % k]
//   nav.bg         = colors[(k - 1) % k]   // the color "before" section 0
//   footer.bg      = colors[n % k]          // continues after the last section
// text = modeColors.text, text2 = modeColors.text2 for every entry;
// accent/accentText from pickAccent(bg, ...).
export interface SectionColors {
  bg: string; text: string; text2: string; accent: string; accentText: string
}
export interface SectionColorScheme {
  nav: SectionColors
  footer: SectionColors
  sections: SectionColors[]
}
export function sectionColorScheme(
  visibleSectionCount: number,
  theme: SiteTheme,
  mode: Mode,
): SectionColorScheme
```

Test at least: conversion round-trips, contrast ratio known values (black vs
white = 21), ensureContrast reaches 4.5 for assorted hues, every style/mode
combination yields colors where mode text hits >= 4.5 (sample ~12 base hues),
cycle math for k=2..4 with n=0..6 including nav/footer, accent rules
(complementary non-neutral picks the other color; mono forces neutral).

## Section rendering contract (SITE + PALETTE agents)

A section wrapper applies its `SectionColors` as inline CSS vars on the
section root: `--section-bg`, `--section-text`, `--section-text2`,
`--section-accent`, `--section-accent-text`. Section internals style with
those vars. CTA buttons: background `--section-accent`, label
`--section-accent-text`. Cards inside sections use `--c-surface` /
`--c-surface-text`.

## PALETTE agent — `src/features/palette/`

Default-export component `PaletteDesigner` (screen content; admin mounts it
inside a tab — no page chrome). This is the flagship feature; make it feel
like Figma's palette tool.

1. **Color wheel picker**: an actual wheel (canvas or SVG), angle = hue,
   radius = saturation, plus a lightness slider and a hex input that stay in
   sync. Draggable selector knob with pointer events (mouse + touch). Show
   the current pick as a swatch with its hex.
2. **Determined facts row**: after picking, show computed best text color
   (white/black) and the determined default mode for the site.
3. **Neutral accent toggle**: "Use black/white for accent color" checkbox,
   applies to every palette style (see pickAccent).
4. **Style sections**: for EVERY entry in `PALETTE_STYLES`, render a card:
   - name + description + its swatch strip (the cycle colors for both modes),
   - **two demo previews side by side (or stacked on mobile): one dark mode,
     one light mode** — each preview renders miniature mock sections in the
     current home layout order using `sectionColorScheme` with that style's
     built theme: nav bar strip, hero (rect with one CTA pill bottom-center),
     about (header + subtext lines + a square on the LEFT representing an
     image — square uses the mode neutral white/black), promoted (three
     `--c-surface` cards, each with title line, nested square in the
     alternating color, price/description lines, and a small CTA), misc
     (about mirrored: square on the RIGHT), footer strip. Only enabled
     sections, live from `useLayout('home')`, so admin layout changes reorder
     the previews too.
   - an **Apply** button: builds the SiteTheme via `buildSiteTheme`, saves via
     `saveSiteTheme`, sets mode preference to the theme's defaultMode
     (`saveModePreference`), and records the base hex into palette history.
     Show which style is currently applied (compare store theme).
5. **Persistence & history** (via `getPaletteWorkspace`/`savePaletteWorkspace`):
   - selected color saved as you pick; routing back prefills wheel/slider/hex.
   - "Recent colors" list, most-recent-first, deduped, scrollable when long
     (fixed max height); click a swatch → select that color.
     **Shift+click** → confirm dialog "Are you sure you wish to delete this
     color from history?" → permanently remove.

## ADMIN agent — `src/features/admin/`

Default-export `AdminPage`, mounted at `/admin` inside the site wrapper.

- **Guard**: only reachable by typing the URL (no nav link anywhere). If the
  current auth email is not an admin → `<Navigate to="/" replace />`.
- **Auth** (`src/features/admin/auth.ts`): prototype stub, clearly marked.
  `ADMIN_EMAIL = 'nathankjoscode@gmail.com'` hardcoded; allowlist = admin +
  `getSettings().coOwnerEmail`. Sign-in screen at /admin when logged out:
  "Sign in with Google" button that (prototype) prompts for an email
  (form input, not window.prompt) and signs in only if allowlisted
  (`saveAuthEmail`). Sign-out button in the admin header. Keep a single
  `signIn(email)` / `signOut()` seam + a code comment where real Google
  auth will slot in.
- **Tabs**: Layout, Palette, Products, Settings.
  - **Layout**: page picker (Home / Store). For the chosen page list its
    sections in order: type label, enabled toggle, move up/down buttons
    (drag optional), remove button, and an "Add section" control offering the
    catalog (hero, about, promoted, misc, storeBanner, productGrid) —
    duplicates allowed (generate fresh uid). Edits are local until **Save**,
    which calls `saveLayout` (publishing live). Dirty indicator + discard.
  - **Palette**: render `<PaletteDesigner />` from `../palette`.
  - **Products**: full stock management table/cards: title, description,
    price (dollars input ↔ priceCents), stock count, published toggle,
    promoted toggle; add product; delete product (confirm). Save via
    `saveProducts`.
  - **Settings**: show hardcoded admin email; set/replace/clear co-owner
    email (`saveSettings`) — co-owner gains admin access.

## SITE agent — `src/features/site/`

Exports (named): `PageWrapper`, `HomePage`, `StorePage`.

- **PageWrapper**: template wrapper used by ALL routes (react-router
  `<Outlet />`). Renders NavBar, `<main>` with the outlet, Footer. Computes
  the page's `SectionColorScheme` and supplies nav/footer/section colors —
  use a small context so pages can register their visible-section count, or
  compute per-route from `useLayout` (home/store known; other routes e.g.
  /admin: 0 sections → nav = colors[k-1], footer = colors[0]).
- **NavBar**: brand "Ali3nCak3", links Home + Store (NO admin link), and the
  **light/dark toggle** (persists per browser via ThemeProvider.toggleMode;
  icon sun/moon). Colored as nav per cycling contract.
- **Footer**: brand, tiny copy, socials placeholder. Colored per contract.
- **Sections** (each fills width, generous padding, uses `--section-*` vars):
  - `hero`: big title + subtitle, ONE CTA button bottom-center ("Shop the
    drop" → /store).
  - `about`: header + paragraph, square image-placeholder (mode neutral
    white/black at low opacity) on the LEFT, text right; stacks on mobile.
  - `promoted`: heading + grid of published+promoted products from
    `useProducts()` as cards (surface bg): image-placeholder square (tinted
    with a cycle color), title, price ($ from cents), description, stock
    ("Out of stock" state), and an "Add to cart" button (accent colors; can
    be a no-op toast/alert for now).
  - `misc`: mirror of about (square on the RIGHT).
  - `storeBanner`: slim hero for the store page.
  - `productGrid`: all published products as cards (same card component).
- **HomePage / StorePage**: read `useLayout(page)`, render enabled sections
  in order with their `SectionColors` (from `sectionColorScheme` — index by
  position among ENABLED sections only). Disabling/reordering in admin must
  automatically restyle following sections (this falls out of the cycle).

## DEPLOY agent — `src/features/gate/`, `.github/`, `docs/`

- `src/features/gate/DevGate.tsx` (default export): wraps the app. If
  `import.meta.env.VITE_DEV_GATE === '1'`, show a full-screen lock: password
  input, SHA-256 (WebCrypto) compare against the embedded hash of the dev
  password `GubGubGub` (embed ONLY the hex hash + a comment; compute the hash
  yourself and hardcode it), unlock persists in localStorage `ac3:devgate`.
  Wrong password shakes/errors. When the env flag is absent, render children
  directly. Self-contained styling (this screen renders before ThemeProvider
  matters — dark, neutral, centered).
- `.github/workflows/deploy-main.yml`: on push to `main` → checkout, Node 20,
  `npm ci`, `npm run build`, `cp dist/index.html dist/404.html` (SPA
  fallback), `echo ali3ncak3.com > dist/CNAME`, deploy with
  `actions/upload-pages-artifact` + `actions/deploy-pages` (permissions:
  pages: write, id-token: write; concurrency group).
- `.github/workflows/deploy-dev.yml`: on push to `dev` → same build but with
  `VITE_DEV_GATE: '1'` env, 404 copy, `echo dev.ali3ncak3.com > dist/CNAME`,
  then publish `dist` to external repo `nkjos/ali3ncak3-dev` branch
  `gh-pages` using `peaceiris/actions-gh-pages@v4` with
  `deploy_key: ${{ secrets.DEV_DEPLOY_KEY }}` and
  `external_repository: nkjos/ali3ncak3-dev`.
- `docs/DEPLOY.md`: step-by-step one-time setup — creating both repos,
  Pages config (main repo: Source = GitHub Actions; dev repo: branch
  gh-pages), generating the deploy key + `gh` commands to add key/secret,
  and exact Wix DNS records: apex A 185.199.108.153 / 185.199.109.153 /
  185.199.110.153 / 185.199.111.153, `www` CNAME → `nkjos.github.io`,
  `dev` CNAME → `nkjos.github.io`, custom-domain + HTTPS enforcement steps,
  and the dev password note (client-side gate, not real security).

## Wiring (done after agents finish — not an agent task)

`src/App.tsx`: DevGate > ThemeProvider > BrowserRouter > Routes: PageWrapper
layout route containing `/` (HomePage), `/store` (StorePage), `/admin`
(AdminPage), `*` → Navigate to `/`.

## DESIGNER — `src/features/designer/` (added 2026-09-01)

Admin-only design overlay studio for composing product images, mounted as
the admin portal's **Designer** tab (`DesignerTab`, default export from
`src/features/designer/DesignerTab.tsx`). Pure client side — no new deps.

### Data model (local to the feature)

```ts
interface DesignLayer {
  id: string
  name: string           // "Overlay 1", "Drawing 2", editable not required
  src: string            // data URL (uploaded PNG or drawn canvas export)
  naturalW: number
  naturalH: number
  x: number; y: number   // layer CENTER, in base-image pixel coordinates
  scale: number          // uniform
  rotation: number       // degrees, INTEGER (1° increments)
  flipH: boolean
  flipV: boolean
  tint: string | null    // hex recolor, null = original colors
}
```

All layer coordinates live in the base image's natural pixel space; the
on-screen stage is that space scaled to fit its container, so export math
and interaction math share one source of truth.

### Stage

- Base image upload (file input, image/*). Until one is chosen, show an
  empty-state prompt. Replacing the base keeps existing layers.
- Stage renders the base scaled-to-fit with layers as absolutely positioned
  `<img>`s using CSS transforms:
  `translate(-50%,-50%) rotate(Rdeg) scale(±S, ±S)` at (x,y)·stageScale.
- Click a layer (or its list row) to select it. Selected layer shows a
  selection outline with 4 corner scale handles and a rotate handle above.
  Pointer-event interactions (mouse AND touch, setPointerCapture):
  - drag body → move; arrow keys nudge 1px in base space (Shift = 10px)
  - drag corner handle → uniform scale about the center
  - drag rotate handle → rotation snapped to whole degrees
- Clicking empty stage space deselects.

### Overlay sources

A select dropdown "Overlay source": `Upload PNG` | `Draw`.
- Upload PNG: file input (PNG with transparency expected; accept image/png,
  image/webp). New layer added centered at ~60% of base's smaller side.
- Draw: shows a drawing panel — a transparent-background canvas (fixed
  square working size, e.g. 512×512) with brush color picker, brush size
  slider, eraser toggle, undo (per stroke), clear, and an **Apply to base**
  button that exports the canvas (trimmed to the inked bounding box) as a
  data URL and adds it as a layer. The drawing canvas must work with mouse
  and touch (pointer events, no page scroll while drawing).

### Selected-layer controls

Rotation number input (integer degrees, ±1 step buttons), scale input or
slider, Flip horizontal / Flip vertical toggles, tint color input with an
enable checkbox or "clear tint" affordance, and Delete layer. Tinting
recolors the PNG while PRESERVING alpha and shading: offscreen canvas —
draw image; `globalCompositeOperation='color'`; fill tint;
`'destination-in'`; draw image again. Cache tinted data URLs per (src, tint).

### Layer list

Topmost layer first. Each row: small thumbnail, name, move up / move down
(z-order), delete. Clicking a row selects the layer on the stage. Stage
z-order always matches list order.

### Output

- **Save to device**: render base + layers (same transform math) onto an
  offscreen canvas at the base's natural size (cap the longest side at
  2400px, scaling everything down proportionally) and download as PNG
  (`a[download]` with an object URL, e.g. `ali3ncak3-design.png`).
- **Create product…**: render the composite downscaled (longest side
  ≤ 1024) to a WebP (fallback JPEG) data URL, then open a modal with the
  new-product form: title, price in dollars (→ priceCents), stock,
  description, Create + Cancel. Create appends a Product via
  `getProducts()`/`saveProducts()` with `published: false`,
  `promoted: false`, and `imageDataUrl` set, shows a success note (link the
  admin's Products tab conceptually — a simple "created" message is fine),
  and closes the modal. Warn in the modal that images are stored in the
  browser (localStorage) until a backend exists.

### Shared-model changes (wired outside the feature)

- `Product.imageDataUrl?: string` (optional, backwards compatible).
- `ProductCard` renders `imageDataUrl` as the card image (object-fit:
  cover, alt = product title) when present, else the existing tinted
  placeholder square.
- Admin Products tab shows a small thumbnail when a product has an image.
- AdminPage gains the Designer tab (Layout, Palette, Products, Designer,
  Settings).

Styling: co-located `designer.css`, admin-dashboard look via `--c-surface`
/ `--c-surface-text` (+ color-mix like admin.css), both modes, responsive
(stage stacks above controls on narrow screens, no horizontal page scroll).

## Neutral slots in the color cycle (added 2026-09-13)

`SiteTheme.neutralFrequency` (0 = off) and `SiteTheme.neutralOffset` weave
the mode neutral (the surface: near-black in dark, white in light, with the
mode text) into the section cycle. Page positions are 0 = navbar,
1..n = sections, n+1 = footer. With k palette colors and frequency f
(neutral slots per k-color cycle, quarters allowed, clamped to k):

- density d = f / (k + f); position q is neutral when
  floor((q − offset)·d) ≠ floor((q − offset − 1)·d) — an even Bresenham
  spread, so k=3, f=2, offset 0 gives `N c c N c | N c c N c …`, f=k is
  every other slot, f=1 is once per k+1 slots, f=0.5 once per two cycles.
- palette colors keep advancing in order across NON-neutral positions, so
  inserting neutrals never scrambles the palette sequence; with f=0 the
  mapping is exactly the original (nav = colors[k−1], sections i%k,
  footer n%k).
- `sectionTextOn(surface)` gives the neutral slot's text; accents still come
  from `pickAccent` (the brightest other-mode variant on black, deepest on
  white); product cards carry a faint border so they stay visible on
  surface-colored sections.

Palette designer: each style card has two selects under its description —
"Black/white slots" (Off, nice quarter steps from ~once-per-Home-page up to
"Every other slot" = k) and "Starts at" (Navbar / each enabled Home section
by name / Footer, disabled when Off) — plus a live "x of P Home slots" hint.
Choices are remembered per style in `PaletteWorkspace.cycleByStyle` and
saved into the theme on Apply; `ThemeProvider` passes the stored cycle
through `buildSiteTheme(base, style, neutralAccent, cycle)`.

## Mode default (changed 2026-09-13)

The site defaults to DARK mode for every visitor; only the visitor's own
navbar toggle (persisted per browser) overrides it. Applying a palette no
longer changes the mode preference; the palette designer's "Native mode"
readout is informational (which mode the picked color naturally suits).
Admin tab order: Palette, Products, Designer, Layout, Settings (opens on
Palette).

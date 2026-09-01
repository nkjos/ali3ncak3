# Ali3nCak3

Prototype storefront for **[ali3ncak3.com](https://ali3ncak3.com)** — small-batch
bakes from another galaxy.

Vite + React + TypeScript SPA, deployed to GitHub Pages:

| Branch | Site | Notes |
| --- | --- | --- |
| `main` | https://ali3ncak3.com | auto-deploys via GitHub Actions |
| `dev` | https://dev.ali3ncak3.com | auto-deploys, client-side password gate |

## Highlights

- **Palette designer** (`/admin` → Palette): Figma-style color wheel; pick one
  base color and every harmony (monochromatic → square) is generated with
  dark + light mode variants, WCAG-contrast-tuned backgrounds, live mini-site
  previews, and one-click apply. Recent-color history with Shift+click delete.
- **Section color cycling**: page sections alternate through the palette's
  cycle (`sections[i] = colors[i % k]`), the navbar takes the color before the
  first section and the footer continues after the last, so reordering or
  disabling sections in the admin Layout tab restyles everything automatically.
- **CTA accents**: buttons use the opposite mode's variant of another hue
  (guaranteed contrast), or black/white neutral via a per-palette toggle.
- **Admin portal** (`/admin`, no nav link): layout reordering, product/stock
  management, palette designer, co-owner management.

## Prototype constraints

No backend yet. Content (layout, products, theme) lives in a
localStorage-backed store (`src/content/store.ts`) shaped like a remote store
so Firebase/Supabase can replace it later — until then, admin "publish"
affects only the current browser, and the admin sign-in is a stub
(`src/features/admin/auth.ts`). The dev-site password gate is client-side
only and not real security.

## Develop

```bash
npm install
npm run dev        # site on :5173
npm run dev:gate   # gated variant on :5174 (dev password gate enabled)
npm test           # color engine test suite
npm run build      # production build to dist/
```

See [SPEC.md](SPEC.md) for the full product contract and
[docs/DEPLOY.md](docs/DEPLOY.md) for the deploy pipeline + DNS runbook.

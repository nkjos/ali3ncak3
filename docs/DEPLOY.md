# Ali3nCak3 — Deployment Runbook

Two GitHub Pages deployments, both driven by workflows in
`.github/workflows/`:

| Branch | Workflow          | Where it publishes                          | Domain             | Gate |
| ------ | ----------------- | ------------------------------------------- | ------------------ | ---- |
| `main` | `deploy-main.yml` | This repo's Pages (Source = GitHub Actions) | `ali3ncak3.com`    | none |
| `dev`  | `deploy-dev.yml`  | `nkjos/ali3ncak3-dev`, branch `gh-pages`    | `dev.ali3ncak3.com`| password (`VITE_DEV_GATE=1`) |

Both builds copy `dist/index.html` → `dist/404.html` (SPA fallback so deep
links like `/store` survive a hard refresh on Pages) and write the domain
into `dist/CNAME`.

Everything below is **one-time setup**. Commands assume the
[`gh` CLI](https://cli.github.com) is installed and authenticated
(`gh auth login`). Run them from the project root.

---

## 1. Create the repos and push the code

```sh
# Main repo (this codebase). Skip if it already exists on GitHub.
gh repo create nkjos/ali3ncak3 --public --source . --remote origin --push

# Dev publish target — an (almost) empty repo the dev workflow pushes
# built files into. Public, because GitHub Pages on a free account
# requires a public repo.
gh repo create nkjos/ali3ncak3-dev --public \
  --description "Built dev deployment of ali3ncak3.com (auto-published — do not edit)"

# The dev branch that triggers dev deploys:
git branch dev
git push -u origin dev
```

## 2. Deploy key for the dev repo

The dev workflow pushes to a *different* repo, so it needs its own
credential: an SSH deploy key with write access on `ali3ncak3-dev`, with the
private half stored as a secret on the main repo.

```sh
# Generate a fresh ed25519 keypair (no passphrase). Do NOT reuse a personal key.
ssh-keygen -t ed25519 -N "" -C "ali3ncak3-dev deploy" -f /tmp/ali3ncak3-dev-key

# Public half → deploy key on the DEV repo, with write access:
gh repo deploy-key add /tmp/ali3ncak3-dev-key.pub \
  --repo nkjos/ali3ncak3-dev \
  --title "ali3ncak3 CI deploy" \
  --allow-write

# Private half → Actions secret DEV_DEPLOY_KEY on the MAIN repo
# (the name the workflow reads):
gh secret set DEV_DEPLOY_KEY --repo nkjos/ali3ncak3 < /tmp/ali3ncak3-dev-key

# Shred the local copies — the key now lives only in GitHub:
rm /tmp/ali3ncak3-dev-key /tmp/ali3ncak3-dev-key.pub
```

## 3. Enable GitHub Pages

### Main repo — Source = GitHub Actions

```sh
gh api -X POST repos/nkjos/ali3ncak3/pages -f build_type=workflow
```

(If Pages was already enabled once, use `-X PUT` instead of `-X POST`.)
UI equivalent: repo → Settings → Pages → Build and deployment → Source =
**GitHub Actions**.

### Dev repo — serve branch `gh-pages`

First give the workflow something to serve: push any commit to `dev` (or run
**Deploy dev** manually via `gh workflow run deploy-dev.yml --ref dev`) and
wait for it to finish — that creates the `gh-pages` branch in
`ali3ncak3-dev`. Then:

```sh
gh api -X POST repos/nkjos/ali3ncak3-dev/pages \
  -f "source[branch]=gh-pages" -f "source[path]=/"
```

UI equivalent: `ali3ncak3-dev` → Settings → Pages → Source = **Deploy from a
branch**, branch `gh-pages`, folder `/ (root)`.

## 4. Custom domains

```sh
gh api -X PUT repos/nkjos/ali3ncak3/pages      -f cname=ali3ncak3.com
gh api -X PUT repos/nkjos/ali3ncak3-dev/pages  -f cname=dev.ali3ncak3.com
```

Notes:

- For the **main** repo (Actions-built Pages) the `dist/CNAME` file alone is
  not authoritative — the domain must be set in Pages settings as above.
- For the **dev** repo the `CNAME` file in `gh-pages` keeps the setting from
  being wiped on each publish; the API call registers it the first time.

## 5. DNS at Wix

Wix dashboard → **Domains** → `ali3ncak3.com` → **Manage DNS Records**.
Remove any existing `A`/`CNAME` records Wix points at its own hosting for
these hosts, then add:

| Host (name)   | Type  | Value             |
| ------------- | ----- | ----------------- |
| `@` (apex)    | A     | `185.199.108.153` |
| `@` (apex)    | A     | `185.199.109.153` |
| `@` (apex)    | A     | `185.199.110.153` |
| `@` (apex)    | A     | `185.199.111.153` |
| `www`         | CNAME | `nkjos.github.io` |
| `dev`         | CNAME | `nkjos.github.io` |

(All four A records — GitHub load-balances across them. The CNAMEs point at
the GitHub *user* Pages host `nkjos.github.io`; GitHub routes each hostname
to the right repo via the configured custom domains.)

## 6. Enforce HTTPS

DNS can take a while to propagate; GitHub then provisions Let's Encrypt
certificates automatically (watch repo → Settings → Pages until the domain
shows a green check). Once certificates exist:

```sh
gh api -X PUT repos/nkjos/ali3ncak3/pages     -F https_enforced=true
gh api -X PUT repos/nkjos/ali3ncak3-dev/pages -F https_enforced=true
```

UI equivalent: Settings → Pages → tick **Enforce HTTPS**.

## 7. Verify

- Push to `main` → Actions run **Deploy main** → https://ali3ncak3.com loads;
  a hard refresh on https://ali3ncak3.com/store still loads (404 fallback).
- Push to `dev` → Actions run **Deploy dev** → https://dev.ali3ncak3.com
  shows the password lock; the dev password unlocks it and the unlock
  sticks across reloads (localStorage `ac3:devgate`).

---

## Security caveat — the dev gate is NOT real security

The dev password gate (`src/features/gate/DevGate.tsx`) is **entirely
client-side**. The full site bundle is publicly downloadable from
`dev.ali3ncak3.com`; only a SHA-256 hash of the password ships in the JS,
but anyone can read the bundle, brute-force a weak password offline, or
simply bypass the gate in dev tools. It exists to keep casual visitors and
search engines from stumbling into work-in-progress — nothing more.

- Never ship secrets, keys, or private data to the dev site.
- Rotating the password = hash the new password (SHA-256 hex, e.g.
  `printf '%s' 'NewPassword' | shasum -a 256`), replace `PASSWORD_SHA256`
  in `DevGate.tsx`, and push to `dev`. Existing unlocks invalidate
  automatically (the stored localStorage value no longer matches).

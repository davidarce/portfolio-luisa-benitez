# Phase 1 — Remaining work to finish & merge

Status at handoff: **all code implemented on branch `chore/phase-1-foundation-fixes`** (12/14 tasks). Blocked only by the sandbox having **no JS toolchain** (no node/npm/pnpm). The steps below must run in a real environment (local machine or CI) to close the phase.

## What's DONE (code, on branch, uncommitted)
- T001 Footer IG link fix + accessible new-window hint
- T002 3 SnapInsta videos renamed to kebab-case (`git mv`)
- T003 `scripts/generate-assets.mjs` (favicon/PWA/OG generator)
- T004 `package.json`: added `@astrojs/sitemap`, `png-to-ico`, `generate:assets` script
- T007 `public/manifest.webmanifest`
- T008 `src/components/SEO.astro` (new, i18n-ready, emits og:image:alt)
- T009 `src/components/MainHead.astro` refactor (head shell + favicon/PWA links)
- T010 `src/layouts/BaseLayout.astro` adopts `<SEO/>`
- T011/T012 homepage + 6 `[...slug].astro` pass per-page title/description/path
- T013 `astro.config.mjs` sitemap integration
- T014 `public/robots.txt`

## What's PENDING (needs a JS runtime)
1. **Install deps + regenerate lockfile** (CRITICAL — package.json/lockfile currently out of sync):
   ```
   pnpm install
   ```
   If `png-to-ico` needs a native-build approval (like the prior esbuild/sharp approval in commit `ca1c172`), add it to the pnpm allow-list and re-run.

2. **T005 + T006 — generate binary assets** (batch E, could not run here):
   ```
   pnpm run generate:assets
   ```
   Produces: `public/favicon.ico`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/assets/og-default.png`.
   - Verify `og-default.png` is 1200×630 and its composited text reconciles with the `imageAlt` default `"Luisa Benítez — Estilista y Asesora de Imagen"` (review Minor #1: script currently renders it on two lines without the em-dash).

3. **Build + type-check gate** (never run here):
   ```
   pnpm build && pnpm astro check
   ```
   Confirm `dist/sitemap-index.xml` is emitted.

4. **Post-deploy verification** (DoD, not a build gate):
   - OG card on https://www.opengraph.xyz/
   - Lighthouse SEO ≥ 95 on homepage + one project page
   - Manual: footer IG link opens profile in new tab; favicon shows in tab.

## Commit scope note
Only stage Phase-1 files. **Do NOT commit** the pre-existing unrelated changes already in the tree: `.gitignore` (M), `CLAUDE.md`, `devrune.yaml`, `devrune.lock`, `docs/_ds/`, `docs/plan-rediseno-portfolio-luisa/` — these predate this workflow. (The `docs/plan-rediseno-portfolio-luisa/` triage + handoffs may be committed separately if desired.)

Suggested single PR title: `chore(phase-1): foundation fixes`.

## Review notes carried forward (non-blocking)
- Minor #2: `SEO.astro` fallback `description` default is English; never emitted in practice (all pages pass Spanish). Optional to localize.
- Out of scope (Phase 4): `<html lang="en">` vs Spanish content; dark-theme CSS base-path inconsistency.

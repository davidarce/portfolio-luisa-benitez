# Implementation Plan: Phase 1 — Foundation Fixes

**Feature ID**: phase-1-foundation-fixes
**Status**: ✅ Complete
**Created**: 2026-07-19
**Goal**: Eliminate broken links, canonicalize asset filenames, centralize SEO metadata, wire a full favicon/PWA set, and add sitemap + robots.txt — code/config only, no content or design changes. (P1-3 email is OUT OF SCOPE.)

---

## 1. Overview

Five independent technical concerns on the live Astro static site (`astro@5`, no React, `site` already set to `https://luisabenitez.es`):

- **P1-1** Fix the one broken footer Instagram link (`src/components/Footer.astro:12`); Nav and index already correct.
- **P1-2** Rename 3 SnapInsta-garbage `.mp4` files under `public/assets/publicity/**` to kebab-case. `gallery-loader.ts` auto-discovers videos by extension, so no source references need updating — but the rename must be verified against the loader's sort/first-match behavior.
- **P1-4** Generate a full favicon/PWA set (`favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest`) from the existing `public/favicon.svg` "LB" monogram, and wire the `<head>` links.
- **P1-5** Create `src/components/SEO.astro` (title, description, canonical, OG, Twitter) + one default 1200×630 OG image; adopt it across the layout/pages, stripping the SEO meta out of `MainHead.astro`. Structured so Phase 4 can add `hreflang` + `og:locale` without an API change.
- **P1-6** Add `@astrojs/sitemap`, create `public/robots.txt` pointing to the sitemap, verify `site`.

**Binary-asset strategy**: `sharp` is already a devDependency. All raster assets (favicons, PWA icons, OG image) are produced by a committed Node generation script (`scripts/generate-assets.mjs`) run once at author time; the generated files are committed to `public/`. This keeps the static build deterministic (no build-time asset generation, no external services like realfavicongenerator). `.ico` multi-resolution packaging needs `png-to-ico` (new devDependency).

Concerns are largely file-disjoint, so most batches run in parallel. The only hard ordering: the asset-generation script + deps must exist before assets are generated; `SEO.astro` must exist before `BaseLayout` adopts it; pages depend on the `BaseLayout` prop contract.

## 2. Architecture Analysis

### Data Model / Type Definitions

Only one new contract: the `SEO.astro` component `Props`. Designed for Phase-4 i18n extension (reserved optional props emit nothing when absent).

```ts
// src/components/SEO.astro
interface Props {
  title?: string;        // page <title> and og:title / twitter:title
  description?: string;  // meta description + og/twitter description
  image?: string;        // absolute-or-root-relative OG image; defaults to /assets/og-default.png
  imageAlt?: string;     // text alternative for og:image (WCAG 1.1.1 — default OG card is images-of-text)
  path?: string;         // canonical path override; defaults to Astro.url.pathname
  // --- reserved for Phase 4 (do NOT emit tags in Phase 1) ---
  locale?: string;                       // future og:locale
  alternates?: Record<string, string>;   // future hreflang map {es: url, en: url}
}
```

### Data Flow

```
src/pages/*.astro
  → BaseLayout(title, description, image?, imageAlt?, path?)
      → <head>
           <MainHead />        // charset, viewport, theme-color, fonts, favicon+PWA links, dark-mode script (NO title/desc/og)
           <SEO {title} {description} {image} {imageAlt} {path} />  // title, description, canonical, og:*, twitter:*
```

Canonical/OG URLs are built inside `SEO.astro` from `Astro.site` + (`path ?? Astro.url.pathname`), so pages pass at most a clean `path`. Absolute OG image URL = `new URL(image ?? '/assets/og-default.png', Astro.site)`. `imageAlt` defaults to the OG card's rendered text when omitted; a page that overrides `image` SHOULD also pass a matching `imageAlt`.

### Contract Specifications

**SEO.astro output tags** (exact set to emit):
```astro
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalURL} />
<meta property="og:type" content="website" />
<meta property="og:url" content={canonicalURL} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImageURL} />
<meta property="og:image:alt" content={imageAlt} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageURL} />
<meta name="twitter:image:alt" content={imageAlt} />
```
Defaults: `title = "Luisa Benítez — Estilista y Asesora de Imagen"`, `description` = existing site description. `og:image` width/height 1200×630. `imageAlt` default = `"Luisa Benítez — Estilista y Asesora de Imagen"` (WCAG 1.1.1: the default OG card is images-of-text, so the alt MUST verbalize the text composited into `og-default.png` — keep this string and the T006 overlay text identical so visual and alternative never drift).

**manifest.webmanifest** (`public/manifest.webmanifest`):
```json
{
  "name": "Luisa Benítez",
  "short_name": "Luisa B.",
  "lang": "es",
  "dir": "ltr",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#090b11",
  "theme_color": "#090b11",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
Manifest polish (a11y-adjacent, not WCAG failures): `short_name` "Luisa Benítez" (~13 chars) truncates on home screens → use "Luisa B." (≤12). `"lang": "es"` + `"dir": "ltr"` make screen readers pronounce "Benítez" correctly. One `purpose: "maskable"` icon (~10% safe-zone padding) covers Android adaptive contexts.

**astro.config.mjs integration**:
```js
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://luisabenitez.es', // verify (already present)
  integrations: [sitemap()],
  // ...existing vite/base/devToolbar unchanged
});
```

**scripts/generate-assets.mjs** (author-time, run via `pnpm run generate:assets`):
```
input:  public/favicon.svg (LB monogram), src/assets/portrait.webp (optional OG portrait)
output: public/favicon.ico (16/32/48 via png-to-ico), public/apple-touch-icon.png (180),
        public/icon-192.png, public/icon-512.png, public/icon-512-maskable.png (512, ~10% safe-zone pad),
        public/assets/og-default.png (1200x630)
libs:   sharp (rasterize SVG → PNG at sizes), png-to-ico (bundle PNGs → .ico)
OG:     sharp composite — dark #090b11 canvas 1200x630 + text SVG overlay
        ("Luisa Benítez" + role) + optional portrait on the right.
        The composited text MUST read exactly "Luisa Benítez — Estilista y Asesora de Imagen"
        so it matches the SEO `imageAlt` default (WCAG 1.1.1 images-of-text alternative).
```

### Before/After Analysis

**src/components/Footer.astro** (line 12):
- Before: `<a href="https://instagram.com/me"> Instagram</a>`
- After: `<a href="https://instagram.com/luisabeniteza/" target="_blank" rel="noopener noreferrer">Instagram</a>`
- Why: broken generic anchor → real profile URL with safe external-link attributes.

**src/components/MainHead.astro**:
- Before: emits `<title>`, `<meta name="description" property="og:description">` (lines 16, 19) — the only SEO tags, no canonical/OG/Twitter; single `<link rel="icon" ... favicon.svg>` (line 32).
- After: REMOVE `<title>` and the description meta (moved to `SEO.astro`); KEEP charset/viewport/generator/theme-color/fonts/dark-mode script; ADD favicon+PWA head block:
```astro
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```
- Why: separate SEO metadata (SEO.astro) from head-shell/browser-polish (MainHead); wire the new favicon set (P1-4).

**src/layouts/BaseLayout.astro**:
- Before: `interface Props { title?; description? }`; `<MainHead title={title} description={description} />`.
- After: extend `Props` with `image?: string; imageAlt?: string; path?: string`; render `<MainHead />` (no title/desc) then `<SEO title={title} description={description} image={image} imageAlt={imageAlt} path={path} />` inside `<head>`.
- Why: route metadata through SEO component while keeping MainHead as head shell.

**src/pages/index.astro** and category/detail pages:
- Before: `<BaseLayout>` called with no metadata props (index) → generic defaults everywhere.
- After: pass unique `title`, `description`, and `path` per page.

**astro.config.mjs**: add `integrations: [sitemap()]` (currently no `integrations` key); `site` already correct — verify only.

## Team Selection

| Skill | Reason for Selection |
|-------|---------------------|
| `web-accessibility-advisor` | The footer link change (T001) introduces `target="_blank"`, which per WCAG 2.1 (G201 / 3.2.5) warrants a new-window affordance; the OG default image and manifest also carry accessibility-adjacent concerns (image semantics, `name`/`short_name`). Its `description` — "Web accessibility patterns — WCAG 2.1 AA, ARIA, keyboard navigation, screen readers" — overlaps the external-link and link-text handling in T001/T009. Borderline overlap, included per the err-toward-inclusion rule. |

**Skipped advisers (with rationale referencing their `description` frontmatter):**
- `architect-advisor` ("Clean architecture patterns: hexagonal, DDD, ports and adapters, layered design") — this phase touches only the Astro presentation/head layer and static config; there is no domain layer, port, or adapter to design.
- `component-advisor` ("React component design patterns — composition, hooks, state management, performance") — the codebase is Astro `.astro` components with no React; `SEO.astro` is a stateless template with no hooks/state.
- `frontend-test-advisor` ("Frontend testing patterns — React Testing Library, Vitest/Jest, Cypress e2e") — no React and no test harness exists in the repo; Phase-1 verification is build + manual/Lighthouse checks, not RTL/Cypress suites.
- `unit-test-advisor` ("Domain unit test patterns: test structure, mocking strategies, test data builders, Given-When-Then") — no domain logic or units under test are introduced; changes are markup/config/asset renames.

## Advice Received

### web-accessibility-advisor (Round 1)

**Integrated:**
- **MAJOR — og:image:alt (WCAG 1.1.1):** the default OG card is images-of-text, so the social preview needs a text alternative. Added `imageAlt?: string` prop to `SEO.astro`, emitting `og:image:alt` + `twitter:image:alt` (Section 2 Contract Specs + T008). Default = `"Luisa Benítez — Estilista y Asesora de Imagen"`, wired through `BaseLayout` (T010) and pages (T011/T012), and kept identical to the text composited into `og-default.png` (T006) so visual and alternative stay in sync.
- **MINOR — T001 new-window hint:** the hint now lives INSIDE the `<a>` and uses Spanish: `Instagram <span class="sr-only">(se abre en una pestaña nueva)</span>`. Re-verified the utility: `BaseLayout.astro:88` opens `<style is:global>`, so the `.sr-only` clip-rect recipe (lines ~304–314) is ALREADY global and already consumed by Footer/Card/Nav/ThemeToggle — no new utility file is required. T001 simply reuses it; the earlier plan's claim that `.sr-only` was scoped-only (and the resulting new `global.css` task) was a grounding error and has been dropped.
- **MINOR — T007 manifest polish:** `short_name` → "Luisa B." (avoid home-screen truncation); added `"lang": "es"` + `"dir": "ltr"` for correct pronunciation of "Benítez"; added one `purpose: "maskable"` 512 icon (generated in T003/T005) for Android adaptive contexts.

**Reclassified (not integrated as gates):**
- The G201 / 3.2.5 new-window warning is **Level AAA, not AA** — kept as best-practice polish, NOT a DoD/AA blocker. The existing text label already satisfies 2.4.4 / 4.1.2 (accessible name is fine).

**Not needed:** external-link glyph (`aria-hidden`) is offered as optional polish only; left out to avoid design churn in a code-only phase.

## 3. Implementation Tasks

## Phase 1: Foundation Fixes (single delivery)

**Purpose**: All five concerns; grouped by file for batch execution.

- [X] T001 Fix broken footer Instagram link + add target/rel + new-window hint — src/components/Footer.astro

    **Details for T001**: Replace line 12 `<a href="https://instagram.com/me"> Instagram</a>` with:
    ```astro
    <a href="https://instagram.com/luisabeniteza/" target="_blank" rel="noopener noreferrer">Instagram <span class="sr-only">(se abre en una pestaña nueva)</span></a>
    ```
    Only occurrence in `src/` (verified by grep). Nav.astro and index.astro already correct — do not touch. The hint span MUST sit INSIDE the `<a>` so it joins the accessible name. Reuse the EXISTING global `.sr-only` utility — `BaseLayout.astro:88` opens `<style is:global>`, so the `.sr-only` clip-rect recipe defined there (lines ~304–314) is already global and already consumed by Footer/Card/Nav/ThemeToggle; no new utility is needed. The hint copy is Spanish; note that `<html lang>` is still `en` in Phase 1 (i18n deferred to Phase 4 — see Risks), so do not assert the hint "matches site language" yet. a11y note: the visible "Instagram" text label already satisfies 2.4.4 / 4.1.2; the new-window affordance is WCAG **AAA (G201 / 3.2.5) best-practice, NOT an AA gate** — do not treat it as a DoD blocker.

- [X] T002 Rename 3 SnapInsta videos to kebab-case — public/assets/publicity/{vogue-spain-maria-pombo,kerastase-lola-lolita,kerastase-nicole-wallace}/

    **Details for T002**: Use `git mv` for each so history is preserved:
    - `.../vogue-spain-maria-pombo/SnapInsta.to_AQPTZc3US9Lnvsj5OnOACveLfDSv5qxV9x-w_JJVapksX3TsVVDs0aIRgfEZvw8_8xsbhSMhjo4N9Ne886dVAbpIG9hokl5xBXULMI0 (1).mp4` → `vogue-spain-maria-pombo.mp4`
    - `.../kerastase-lola-lolita/SnapInsta.to_AQOazHGUTwAAYIxCQkiUKeOKJePbBBkTT3TCgLH0lw8pTbBK5RbIuQwslCHVrVfWTXRcy-Qv9gg5_qImFQnnmeo5I_Zcg21lKYVZdaE.mp4` → `kerastase-lola-lolita.mp4`
    - `.../kerastase-nicole-wallace/SnapInsta.to_AQP02YCB6yioIJE143LQHZ1p1xf0d3MYFHWo2ZIlLriarh1mOG_oq9STJWULNbUxLrpctykJ0FE_HdT-VBUHzGAFkhV8MtJAcfnENAU.mp4` → `kerastase-nicole-wallace.mp4`
    No source references to update (loader auto-discovers). Each target folder contains exactly one video, so `gallery-loader.ts`'s `allFiles.find(/\.(mp4|webm|mov)$/i)` still resolves the same single file; the sorted `images` array reorders alphabetically but each folder has one media file (verify no sibling `index.*` image is displaced). Confirm with `grep -rn "SnapInsta" src/ public/ src/content/` returns nothing afterward.

- [X] T003 Create asset-generation script (favicons + PWA icons + OG image) — scripts/generate-assets.mjs

    **Details for T003**: Node ESM script per the "scripts/generate-assets.mjs" contract in Section 2. Uses `sharp` to rasterize `public/favicon.svg` to PNG at 32/48/180/192/512, `png-to-ico` to bundle 16/32/48 PNGs into `public/favicon.ico`, and `sharp` composite to build `public/assets/og-default.png` (1200×630, `#090b11` background, text overlay reading exactly "Luisa Benítez — Estilista y Asesora de Imagen" so it matches the SEO `imageAlt` default; portrait from `src/assets/portrait.webp` optional/right-aligned). Also emit `public/icon-512-maskable.png` — the 512 monogram scaled to ~80% within a `#090b11` 512 canvas so the glyph stays inside the ~10% maskable safe zone (Android adaptive icons). Idempotent; writes only to `public/`. Do NOT hook into `astro build` — author runs it manually.

- [X] T004 Add png-to-ico + @astrojs/sitemap deps and generate:assets script — package.json

    **Details for T004**: `pnpm add -D png-to-ico` and `pnpm add @astrojs/sitemap` (repo uses pnpm — `pnpm-lock`/`devrune`). Add script `"generate:assets": "node scripts/generate-assets.mjs"`. `sharp` already present.

- [X] T005 Generate and commit favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png — public/

    **Details for T005**: Run `pnpm run generate:assets`; commit the produced `public/favicon.ico`, `public/apple-touch-icon.png` (180×180), `public/icon-192.png`, `public/icon-512.png`, and `public/icon-512-maskable.png` (maskable variant). Keep existing `public/favicon.svg`.

- [X] T006 Generate and commit default OG image (1200×630) — public/assets/og-default.png

    **Details for T006**: Produced by the same script run. Verify dimensions exactly 1200×630 and file loads. This is the Phase-1 single fallback OG image (per-project images deferred to Phase 5). The composited text MUST read exactly "Luisa Benítez — Estilista y Asesora de Imagen" — identical to the SEO `imageAlt` default (T008) so the images-of-text alternative (WCAG 1.1.1) stays accurate.

- [X] T007 Create web app manifest — public/manifest.webmanifest

    **Details for T007**: Exact JSON from the "manifest.webmanifest" contract in Section 2. `theme_color`/`background_color` `#090b11` to match dark theme-color meta. Include the a11y polish: `short_name: "Luisa B."`, `lang: "es"`, `dir: "ltr"`, and the third `purpose: "maskable"` icon entry (`/icon-512-maskable.png`, generated in T003/T005).

- [X] T008 Create SEO component — src/components/SEO.astro

    **Details for T008**: Implement the `Props` interface and output tag set from Section 2's Contract Specifications, including `og:image:alt` and `twitter:image:alt` fed by the `imageAlt` prop. Build `canonicalURL = new URL(path ?? Astro.url.pathname, Astro.site)` and `ogImageURL = new URL(image ?? '/assets/og-default.png', Astro.site)`. Default `imageAlt = "Luisa Benítez — Estilista y Asesora de Imagen"` (kept identical to the T006 OG overlay text — WCAG 1.1.1 images-of-text alternative). Reserved `locale`/`alternates` props accepted but emit NOTHING in Phase 1 (Phase-4 extension point — leave a `{/* Phase 4: hreflang + og:locale here */}` comment). No i18n now.

- [X] T009 Refactor MainHead: strip SEO meta, add favicon/PWA head links — src/components/MainHead.astro

    **Details for T009**: Remove `<title>` (line 19) and the `<meta name="description" property="og:description">` (line 16), and drop the `title`/`description` props (now unused). Keep charset, viewport, generator, both theme-color metas, font preconnect/stylesheet, and the dark-mode inline script. Add the favicon+PWA `<link>` block from Section 2 Before/After. Keep `favicon.svg` link.

- [X] T010 Adopt SEO in BaseLayout + add image/path props — src/layouts/BaseLayout.astro

    **Details for T010**: Extend `Props` with `image?: string; imageAlt?: string; path?: string`. Import `SEO`. In `<head>`, render `<MainHead />` (remove title/description args) then `<SEO title={title} description={description} image={image} imageAlt={imageAlt} path={path} />` (place before `<ClientRouter />`). Depends on T008.

- [X] T011 Pass per-page metadata on homepage — src/pages/index.astro

    **Details for T011**: `<BaseLayout title="Luisa Benítez — Estilista y Asesora de Imagen" description="..." path="/">`. Description ~150 chars summarizing her styling/fashion work. Uses the default OG `image`/`imageAlt` (no override needed — the default card and its alt already describe the homepage). Depends on T010.

- [X] T012 Pass per-page metadata on category and detail pages — src/pages/{editorials,celebrities,runway,films,publicity,work}/[...slug].astro

    **Details for T012**: For each `[...slug].astro`, derive `title`/`description`/`path` from the entry data already loaded (e.g. `title={`${entry.data.title} — Luisa Benítez`}`, `path={Astro.url.pathname}`). Ensure every page renders a UNIQUE `<title>` (acceptance criterion). These pages fall back to the default OG `image`, so leave `image`/`imageAlt` unset (the default `imageAlt` applies) — per-project OG images and their bespoke alts are deferred to Phase 5; do NOT set a per-project `image` here without also passing a matching `imageAlt`. Include any category index pages if present. Depends on T010.

- [X] T013 Add @astrojs/sitemap integration + verify site — astro.config.mjs

    **Details for T013**: Add `import sitemap from '@astrojs/sitemap';` and `integrations: [sitemap()]` to the existing `defineConfig`. Leave `site`, `base`, `devToolbar`, `vite` unchanged. Verify `site: 'https://luisabenitez.es'` present. Depends on T004.

- [X] T014 Create robots.txt pointing to the sitemap — public/robots.txt

    **Details for T014**:
    ```
    User-agent: *
    Allow: /

    Sitemap: https://luisabenitez.es/sitemap-index.xml
    ```

**Checkpoint**: Phase 1 complete
- [ ] `pnpm build` succeeds with zero errors.
- [ ] `grep -rn "instagram.com/me" src/ public/` returns nothing; footer link renders `https://instagram.com/luisabeniteza/` with `target="_blank" rel="noopener noreferrer"` in built HTML.
- [ ] `grep -rn "SnapInsta" src/ public/ src/content/` returns nothing; the 3 publicity pages still show their video. (Do NOT grep the repo root: `.sdd/` and `docs/` intentionally embed the original SnapInsta filenames as reference and would always match.)
- [ ] `dist/` contains `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `manifest.webmanifest`, `assets/og-default.png` (1200×630).
- [ ] `manifest.webmanifest` has `short_name: "Luisa B."`, `lang: "es"`, `dir: "ltr"`, and a `purpose: "maskable"` icon entry.
- [ ] Every built page has a unique `<title>`, a `<meta name="description">`, `<link rel="canonical">`, `og:*`/`twitter:*` tags, AND `og:image:alt` + `twitter:image:alt` whose content matches the text rendered in the OG card (spot-check homepage + one project page).
- [ ] Footer Instagram link contains an inner `<span class="sr-only">(se abre en una pestaña nueva)</span>` using the existing global `.sr-only` utility (defined in `BaseLayout.astro`'s `<style is:global>`); span is visually hidden but present in the accessible name.
- [ ] `dist/sitemap-index.xml` generated; `dist/robots.txt` present and references the sitemap.
- [ ] OG card validates on opengraph.xyz; Lighthouse SEO ≥ 95 on homepage + one project page.
- [ ] No favicon links reference removed props; MainHead no longer emits `<title>`.

---

## Dependencies & Execution Order

### Batch Assignments for Sub-Agents

| Batch | Tasks | File | Parallel | Depends on |
|-------|-------|------|----------|------------|
| A | T001 | src/components/Footer.astro | Yes | — (reuses existing global `.sr-only`) |
| B | T002 | public/assets/publicity/** (git mv) | Yes | — |
| C | T003 | scripts/generate-assets.mjs | Yes | — |
| D | T004 | package.json | Yes | — |
| E | T005, T006 | public/ (generated binaries), public/assets/og-default.png | No | C, D |
| F | T007 | public/manifest.webmanifest | Yes | — |
| G | T008 | src/components/SEO.astro | Yes | — |
| H | T009 | src/components/MainHead.astro | Yes | — |
| I | T010 | src/layouts/BaseLayout.astro | No | G, H |
| J | T011 | src/pages/index.astro | No | I |
| K | T012 | src/pages/*/[...slug].astro | No | I |
| L | T013 | astro.config.mjs | No | D |
| M | T014 | public/robots.txt | Yes | — |

Parallel-safe first wave: A, B, C, D, F, G, H, M. After D+C → E; after G+H → I; after I → J, K; after D → L.

---

## 4. Clarifications

### Session 2026-07-19

Deep Interview was required (change spans 12+ files across the presentation/head layer + static config). `AskUserQuestion` is unavailable in the planner sub-agent toolset, so the open decisions were locked as planner-resolved defaults with rationale below; all are low-risk and reversible, and are surfaced here for orchestrator/user override.

- **[Architecture] MainHead refactor strategy**: Q: Replace MainHead entirely with SEO, or split responsibilities? → A: SPLIT. `SEO.astro` owns metadata (title/description/canonical/og/twitter); `MainHead.astro` remains the head shell (charset, viewport, theme-color, fonts, favicon/PWA links, dark-mode script). Rationale: least churn, keeps the blocking dark-mode script and font-preload untouched, cleanest separation for Phase-4 i18n.
- **[Integration] Favicon source art**: Q: What source art for the favicon/PWA set? → A: Reuse the existing `public/favicon.svg` "LB" monogram (white LB on black circle) rasterized via sharp. Rationale: on-brand, already committed, avoids external tooling; no new design asset needed.
- **[Integration] Binary-asset generation approach**: Q: realfavicongenerator/manual vs. committed script? → A: Committed `scripts/generate-assets.mjs` using `sharp` + `png-to-ico`, run once at author time, outputs committed to `public/`. Rationale: `sharp` already present, deterministic, reproducible, no external service, keeps static build clean (no build-time generation).
- **[Data Model] OG default image content**: Q: Portrait-based or text-only OG card? → A: Dark `#090b11` 1200×630 canvas with "Luisa Benítez" + role text; portrait from `src/assets/portrait.webp` composited right-aligned if it crops cleanly, else text-only. Rationale: satisfies handoff spec (dark theme, name+role+portrait) with a graceful fallback so the implementer is never blocked.
- **[Edge Cases] favicon.ico multi-resolution**: Q: single-size vs multi-res .ico? → A: Multi-res (16/32/48) via `png-to-ico`. Rationale: broadest legacy-browser tab support; modern browsers still prefer the SVG/PNG icons.
- **[Edge Cases] Video rename safety**: Q: Any source references to update? → A: None — `gallery-loader.ts` auto-discovers by extension and each folder holds exactly one video; use `git mv` and re-verify no `SnapInsta` strings remain. Only the 3 publicity files need renaming (grep-confirmed).
- **[Integration] i18n readiness**: Q: Emit hreflang/og:locale now? → A: NO. Reserve `locale`/`alternates` props in the SEO signature but emit nothing in Phase 1; leave a marked extension point for Phase 4. Rationale: task scope explicitly excludes i18n.
- **[Edge Cases] Package manager**: Q: npm vs pnpm? → A: pnpm (repo has pnpm lock + devrune, esbuild/sharp native-build approvals). Install deps with `pnpm add`.

**Acceptance-criteria → task mapping** (code-handoff §Acceptance criteria; email criteria are OUT OF SCOPE):
- No broken `instagram.com/me` links + accessible new-window hint (reusing existing global `.sr-only`) → T001
- Clean kebab-case video filenames, old names removed → T002
- Unique `<title>` + meaningful description + full OG/Twitter (incl. `og:image:alt`/`twitter:image:alt`) per page → T008, T010, T011, T012
- Homepage shares a polished card (image/title/description + accessible image alt) → T006, T008, T011
- Favicon + PWA (incl. maskable icon, `lang`/`dir`/`short_name` polish) visible in all major browsers → T003, T004, T005, T007, T009
- `sitemap-index.xml` exists and valid → T013
- `robots.txt` exists and references sitemap → T014
- Lighthouse SEO ≥ 95 → cumulative (T008/T010/T011/T012 + T013/T014)

## 5. Risks & Considerations

- **OG portrait crop**: `src/assets/portrait.webp` aspect ratio may not composite cleanly into 1200×630. Mitigation: script falls back to a text-only dark card; verify visually before commit.
- **`.ico` generation dependency**: `png-to-ico` must install cleanly under pnpm's native-build approvals (like sharp/esbuild). If it needs approval, add it to the pnpm allow-list (mirrors prior `ca1c172` esbuild/sharp approval).
- **gallery-loader sort side-effect**: the sorted `images` array is alphabetical; renaming changes sort keys. Each of the 3 folders has a single media file, so display is unaffected — but the implementer must confirm no folder pairs a video with an `index.*` image that the rename would reorder.
- **`lang` attribute mismatch (Phase-4 follow-up, out of scope)**: `BaseLayout.astro:21` sets `<html lang="en">`, but the site content, the new Spanish new-window hint (T001), and the manifest `"lang": "es"` (T007) are all Spanish. Do NOT change `<html lang>` in Phase 1 (i18n is Phase 4). Consequence: the T001 hint copy does not currently match the declared document language — accepted for now, flagged for Phase 4 to set `lang="es"` (or per-route lang) alongside `hreflang`/`og:locale`.
- **Base-path inconsistency (pre-existing, out of scope)**: `BaseLayout.astro` dark-theme CSS references `/portfolio-luisa-benitez/assets/...` while `base` is `/`. Not touched in Phase 1; flag for a later phase. Ensure new favicon/OG paths use root-relative `/...` consistent with `base: '/'`.
- **MainHead prop removal**: after T009 removes `title`/`description` props, confirm no other caller passes them (only BaseLayout does — update in T010 same wave).
- **Sitemap output filename**: `@astrojs/sitemap` emits `sitemap-index.xml` + `sitemap-0.xml`; robots.txt and acceptance criteria reference `sitemap-index.xml` — keep consistent.
- **Deploy verification**: OG/Twitter cards and Lighthouse are only fully verifiable post-deploy; include the opengraph.xyz + Rich Results checks in the review/DoD, not the build gate.

---

## Notes

- Parallelism is defined ONLY in the Batch Assignment Table — never inline in task lines.
- Bundle all concerns into a single PR `chore(phase-1): foundation fixes` per the handoff.
- Document the (out-of-scope) email-routing steps only if touching README; email itself is deferred.

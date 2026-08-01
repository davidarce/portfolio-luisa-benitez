# Exploration: Phase 1 Foundation Fixes

**Feature ID**: phase-1-foundation-fixes  
**Status**: 🔄 Discovery Phase  
**Created**: 2026-07-19  
**Goal**: Fix technical foundation issues (broken links, asset filenames, SEO, favicon, repo hygiene) before design/content phases.

---

## Objective

Phase 1 addresses five technical foundation concerns that impede site professionalism and SEO. All changes are code/config only — no content rewrite or design changes. The goal is to eliminate broken links, canonicalize asset filenames, establish centralized SEO metadata, wire up favicon/PWA, and ensure repo hygiene (sitemap, robots.txt).

**Scope (in-code)**: P1-1, P1-2, P1-4, P1-5, P1-6  
**Out of scope (deferred)**: P1-3 (email setup — backend decision + DNS config, not code)

---

## User Requirements

### Task:

**P1-1: Fix broken footer Instagram link**
- **Current**: `<a href="https://instagram.com/me">Instagram</a>` in src/components/Footer.astro line 12
- **Desired**: `<a href="https://instagram.com/luisabeniteza/" target="_blank" rel="noopener noreferrer">Instagram</a>`
- **All references found**:
  - `src/components/Footer.astro` line 12: **BROKEN** — `https://instagram.com/me` (needs fix)
  - `src/pages/index.astro` line 36: **CORRECT** — already uses `https://instagram.com/luisabeniteza/` with target/rel ✓
  - `src/components/Nav.astro` line 18: **CORRECT** — already uses `https://instagram.com/luisabeniteza/` ✓
- **Action**: Update only Footer.astro; others already have correct URL/attributes

**P1-2: Rename video assets to kebab-case**
- **Current state**: Two SnapInsta-style filenames in public/assets/publicity/:
  - `public/assets/publicity/vogue-spain-maria-pombo/SnapInsta.to_AQPTZc3US9Lnvsj5OnOACveLfDSv5qxV9x-w_JJVapksX3TsVVDs0aIRgfEZvw8_8xsbhSMhjo4N9Ne886dVAbpIG9hokl5xBXULMI0 (1).mp4`
  - `public/assets/publicity/kerastase-lola-lolita/SnapInsta.to_AQOazHGUTwAAYIxCQkiUKeOKJePbBBkTT3TCgLH0lw8pTbBK5RbIuQwslCHVrVfWTXRcy-Qv9gg5_qImFQnnmeo5I_Zcg21lKYVZdaE.mp4`
  - `public/assets/publicity/kerastase-nicole-wallace/SnapInsta.to_AQP02YCB6yioIJE143LQHZ1p1xf0d3MYFHWo2ZIlLriarh1mOG_oq9STJWULNbUxLrpctykJ0FE_HdT-VBUHzGAFkhV8MtJAcfnENAU.mp4`
- **Desired**: Rename to kebab-case: `{client}-{talent}-{year-optional}.mp4`
  - `vogue-spain-maria-pombo.mp4`
  - `kerastase-lola-lolita.mp4`
  - `kerastase-nicole-wallace.mp4`
- **Impact**: No source code changes needed (gallery-loader.ts auto-discovers videos by extension in folders)

**P1-4: Favicon set**
- **Current state**: Only `public/favicon.svg` exists; MainHead.astro references it (line 32)
- **Desired**: Full favicon set in `public/`:
  - `favicon.ico` (multi-resolution)
  - `apple-touch-icon.png` (180×180)
  - `icon-192.png`, `icon-512.png` (PWA)
  - `manifest.webmanifest`
  - Updated `<head>` links in MainHead.astro for apple-touch-icon, PWA icons, manifest
- **Note**: favicon.svg can coexist or be removed based on preference

**P1-5: Centralized SEO component**
- **Current state**: 
  - MainHead.astro (src/components/MainHead.astro) accepts only `title` and `description` props
  - No Open Graph, Twitter Card, or canonical URL tags
  - No per-page metadata strategy (pages pass nothing or defaults apply)
  - index.astro does not pass title/description to BaseLayout
- **Desired**: 
  - New `src/components/SEO.astro` component that accepts: `title`, `description`, `image`, `path` props
  - Emits: `<title>`, `<meta name="description">`, `<meta property="og:*">` (og:title, og:description, og:image, og:type, og:url), `<meta name="twitter:*">` (twitter:card, twitter:title, twitter:description, twitter:image), `<link rel="canonical">`
  - One default OG image (1200×630px) for fallback; per-project OG images deferred to Phase 5
  - Designed with i18n extensibility in mind (Phase 4 will add hreflang, og:locale)
  - Used across all pages (homepage, project pages, category pages)
- **Note**: Refactor MainHead.astro or replace with SEO component integration in BaseLayout

**P1-6: Repo hygiene**
- **Verify astro.config.mjs**: Already has `site: 'https://luisabenitez.es'` ✓ (line 8)
- **Add @astrojs/sitemap**: Not in package.json (need to install)
- **Generate robots.txt**: Create `public/robots.txt` with crawler rules + sitemap reference
- **Verify sitemap generation**: After @astrojs/sitemap integration, sitemap should auto-generate at build time

### Architecture:

**Layout & Page Structure**:
- `src/layouts/BaseLayout.astro` — Root layout; passes title/description to MainHead
- `src/pages/*.astro` — All pages (index, project detail pages, category pages)
- `src/components/MainHead.astro` — Current SEO component (minimal); to be replaced or refactored
- `src/components/Footer.astro` — Contains broken Instagram link (P1-1)

**Content & Asset Discovery**:
- `src/content.config.ts` — Defines collections (work, celebrities, editorials, publicity, runway, films)
- `src/loaders/gallery-loader.ts` — Dynamically loads gallery entries from `public/assets/{collection}/{slug}/` folders
- Videos auto-discovered by extension (`.mp4`, `.webm`, `.mov`)
- Naming convention: folders already named `{client}-{talent-or-project}`, but video files inside need kebab-case

**Configuration**:
- `astro.config.mjs` — Site URL already configured ✓
- `package.json` — Missing @astrojs/sitemap integration
- `public/robots.txt` — Does not exist; needs creation

**Current SEO Gaps**:
- No canonical URLs
- No Open Graph (og:title, og:description, og:image, og:type, og:url)
- No Twitter Card
- No per-page title/description strategy (defaults used everywhere)
- No default OG image

### Selected Context:

- **src/layouts/BaseLayout.astro**: Root layout, currently passes title/description props to MainHead; will route to SEO component
- **src/components/MainHead.astro**: Current minimal SEO component (title, description only); needs refactoring into full SEO.astro
- **src/components/Footer.astro**: Contains broken Instagram link at line 12 (`href="https://instagram.com/me"`)
- **src/pages/index.astro**: Homepage; does not pass title/description to BaseLayout; needs SEO integration
- **src/pages/[category]/[...slug].astro**: Pattern for project detail pages (e.g., `editorials/[...slug].astro`, `publicity/[...slug].astro`)
- **src/content.config.ts**: Defines collections and uses gallery-loader for auto-discovery
- **src/loaders/gallery-loader.ts**: Discovers videos by file extension; no source code changes needed for video rename
- **src/content/{collection}/{collection}.json**: Metadata for highlighted items (no video filenames stored — auto-discovered)
- **astro.config.mjs**: Already has `site: 'https://luisabenitez.es'` configured (P1-6 verified ✓)
- **package.json**: Missing `@astrojs/sitemap` dependency
- **public/favicon.svg**: Existing favicon; can coexist with new .ico and PWA icons
- **public/robots.txt**: Does not exist; needs creation with sitemap reference

**Video Assets — SnapInsta Filenames to Rename**:
- `public/assets/publicity/vogue-spain-maria-pombo/SnapInsta.to_AQPTZc3US9Lnvsj5OnOACveLfDSv5qxV9x-w_JJVapksX3TsVVDs0aIRgfEZvw8_8xsbhSMhjo4N9Ne886dVAbpIG9hokl5xBXULMI0 (1).mp4` → `vogue-spain-maria-pombo.mp4`
- `public/assets/publicity/kerastase-lola-lolita/SnapInsta.to_AQOazHGUTwAAYIxCQkiUKeOKJePbBBkTT3TCgLH0lw8pTbBK5RbIuQwslCHVrVfWTXRcy-Qv9gg5_qImFQnnmeo5I_Zcg21lKYVZdaE.mp4` → `kerastase-lola-lolita.mp4`
- `public/assets/publicity/kerastase-nicole-wallace/SnapInsta.to_AQP02YCB6yioIJE143LQHZ1p1xf0d3MYFHWo2ZIlLriarh1mOG_oq9STJWULNbUxLrpctykJ0FE_HdT-VBUHzGAFkhV8MtJAcfnENAU.mp4` → `kerastase-nicole-wallace.mp4`

**Other Video Assets (Already Properly Named)**:
- `public/assets/publicity/{various}/video-1.mp4`, `video-2.mp4`, `video-3.mp4`, `video-4.mp4` — Already kebab-case ✓
- `public/assets/editorials/vogue/video-1.mp4` ✓
- `public/assets/runway/` — Mix of `.mov` and properly named video files ✓

### Relationships:

**Call Chain for SEO (P1-5)**:
- `src/pages/*.astro` (all pages) → `src/layouts/BaseLayout.astro` (passes title/description props)
- `BaseLayout.astro` → `src/components/MainHead.astro` (current minimal SEO component)
- **Phase 1 change**: Replace MainHead.astro logic with new SEO.astro component that handles: title, description, canonical, og:*, twitter:*
- **Future (Phase 4)**: SEO.astro extended with hreflang, og:locale, locale param

**Video Auto-Discovery (P1-2)**:
- File system: `public/assets/publicity/{slug}/{videofile}.{mp4|mov|webm}` → auto-discovered by extension
- `src/loaders/gallery-loader.ts` (lines 54-66): scans folder for media files, builds `images` array and `video` field
- `src/content.config.ts` (lines 55-64): publicity collection uses gallery-loader
- **Impact**: Rename SnapInsta files → loader auto-picks up renamed files; no source code changes
- Metadata (JSON) doesn't store video filenames, only folder IDs — safe to rename

**Favicon Integration (P1-4)**:
- Static files in `public/` → referenced in `src/components/MainHead.astro` (lines 18, 32)
- Current: single `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`
- Add: apple-touch-icon, PWA manifest link, favicon.ico reference

**Instagram Link (P1-1)**:
- Three references in codebase:
  - Footer.astro (line 12): **broken** → fix
  - Nav.astro (line 18): **correct** → no change
  - index.astro (line 36): **correct** → no change
- Footer is rendered on all pages (imported in BaseLayout line 8)

**Repo Hygiene (P1-6)**:
- `astro.config.mjs` line 8: `site: 'https://luisabenitez.es'` — already set ✓
- `package.json`: add `@astrojs/sitemap` to dependencies
- At build time: @astrojs/sitemap generates `dist/sitemap-index.xml`
- Create `public/robots.txt`: static file, includes sitemap URL

**P1-5 Design Note for i18n**: SEO component should accept optional `locale` and `hreflang` props, leave unused in Phase 1 but structured for Phase 4 extension (no API change needed)

### Ambiguities:

1. **Default OG Image Path & Design**: Handoff specifies "one default OG image (1200×630px), dark theme, Luisa's name + role + portrait"; exact image not provided.
   - **Current state**: No OG image exists.
   - **Assumption**: Image will be created and placed at `public/assets/og-image-default.png` (path TBD by planner/designer).
   - **Note**: Per-project OG images deferred to Phase 5.

2. **MainHead.astro Refactoring Strategy**: Should new SEO component replace MainHead entirely, or coexist?
   - **Current MainHead usage**: Minimal (title, description only, no OG/Twitter/canonical)
   - **Recommendation**: Replace MainHead logic in BaseLayout; fold its theme-color and font-preload into SEO component or keep separately in `<head>`. Theme-color and font-preload are not SEO-critical, can remain separate if complexity arises.
   - **Status**: Planner will decide implementation strategy.

3. **SEO Component Props Structure**: Individual props (title, description, image, path) vs. single metadata object?
   - **Recommendation**: Individual props for clarity and per-page customization. Props: `title`, `description`, `image` (optional, defaults to default OG image), `path` (page path for canonical), plus reserved Phase 4 props (`locale?: string`, `hreflang?: Record<string, string>`).
   - **Note**: No TypeScript interface shown; planner can define.

4. **Canonical URL Generation**: Construct from `site` config + normalized page path, or accept full URL from page?
   - **Recommendation**: Construct internally using `Astro.url.pathname` and astro.config.mjs `site` value; pages pass only `path` prop for clarity.
   - **Edge case**: Category pages (e.g., `/publicity/`, `/editorials/`) should use clean paths; detail pages use slug-based paths. Gallery-loader already handles slug generation.

5. **i18n Readiness in Phase 1**: SEO component should emit hreflang and og:locale by default (empty/unused), or add in Phase 4?
   - **Recommendation**: Reserve props in Phase 1 signature (e.g., `locale?: 'es' | 'en'`, `alternateHrefs?: {es: string; en: string}`) but do not emit tags unless props provided. Allows Phase 4 to extend without API change.
   - **Note**: Phase 4 task P4-7 explicitly "extends SEO component" — structure should allow this without prop changes.

6. **Video Filename Normalization**: Are the three SnapInsta files the only unprofessional names, or should other files be reviewed?
   - **Current finding**: Only publicity/ has SnapInsta names. Editorials, runway, films, celebrities folders have already-normalized names (numeric or client-centered).
   - **Status**: Only three files need renaming (confirmed by grep).

7. **Favicon Favicon SVG Coexistence**: Keep existing favicon.svg or replace with .ico?
   - **Recommendation**: Keep favicon.svg (it's lightweight and auto-scales); add favicon.ico for older browser compatibility; add apple-touch-icon.png for iOS; add PWA icons + manifest for PWA support.
   - **Note**: Astro can serve both; no conflict.

---

## Selected Code Structure

```text
- src/layouts/BaseLayout.astro
- src/components/MainHead.astro
- src/components/Footer.astro
- src/components/SEO.astro (NEW)
- src/pages/index.astro
- src/content.config.ts
- src/loaders/gallery-loader.ts
- astro.config.mjs
- package.json
- public/favicon.svg
- public/assets/publicity/vogue-spain-maria-pombo/SnapInsta.to_AQPTZc3US9Lnvsj5OnOACveLfDSv5qxV9x-w_JJVapksX3TsVVDs0aIRgfEZvw8_8xsbhSMhjo4N9Ne886dVAbpIG9hokl5xBXULMI0 (1).mp4
- public/assets/publicity/kerastase-lola-lolita/SnapInsta.to_AQOazHGUTwAAYIxCQkiUKeOKJePbBBkTT3TCgLH0lw8pTbBK5RbIuQwslCHVrVfWTXRcy-Qv9gg5_qImFQnnmeo5I_Zcg21lKYVZdaE.mp4
- public/assets/publicity/kerastase-nicole-wallace/SnapInsta.to_AQP02YCB6yioIJE143LQHZ1p1xf0d3MYFHWo2ZIlLriarh1mOG_oq9STJWULNbUxLrpctykJ0FE_HdT-VBUHzGAFkhV8MtJAcfnENAU.mp4
- public/robots.txt (NEW)
```

## Selected Files Tree

```text
/home/agent/Projects/portfolio-luisa-benitez/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── components/
│   │   ├── MainHead.astro
│   │   ├── Footer.astro
│   │   └── SEO.astro (NEW)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── editorials/[...slug].astro
│   │   ├── celebrities/[...slug].astro
│   │   ├── runway/[...slug].astro
│   │   ├── films/[...slug].astro
│   │   ├── publicity/[...slug].astro
│   │   └── work/[...slug].astro
│   ├── content.config.ts
│   └── loaders/
│       └── gallery-loader.ts
├── public/
│   ├── favicon.svg
│   ├── robots.txt (NEW)
│   └── assets/
│       ├── publicity/
│       │   ├── vogue-spain-maria-pombo/
│       │   │   └── SnapInsta.to_AQPTZc3US9Lnvsj5OnOACveLfDSv5qxV9x-w_JJVapksX3TsVVDs0aIRgfEZvw8_8xsbhSMhjo4N9Ne886dVAbpIG9hokl5xBXULMI0 (1).mp4 → vogue-spain-maria-pombo.mp4
│       │   ├── kerastase-lola-lolita/
│       │   │   └── SnapInsta.to_AQOazHGUTwAAYIxCQkiUKeOKJePbBBkTT3TCgLH0lw8pTbBK5RbIuQwslCHVrVfWTXRcy-Qv9gg5_qImFQnnmeo5I_Zcg21lKYVZdaE.mp4 → kerastase-lola-lolita.mp4
│       │   └── kerastase-nicole-wallace/
│       │       └── SnapInsta.to_AQP02YCB6yioIJE143LQHZ1p1xf0d3MYFHWo2ZIlLriarh1mOG_oq9STJWULNbUxLrpctykJ0FE_HdT-VBUHzGAFkhV8MtJAcfnENAU.mp4 → kerastase-nicole-wallace.mp4
│       └── (other publicty and category folders with already-clean video names)
├── astro.config.mjs
└── package.json
```

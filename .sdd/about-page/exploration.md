# SDD Exploration — `/about` Page (Fase 3)

## Objective

Build a professional About page for Luisa Benítez (fashion stylist portfolio) that establishes her editorial and commercial expertise, centered on approved Spanish copy, and ready for i18n handoff to Fase 4. The page must integrate with existing components and design system patterns from `/contact` while addressing navigation crowding (issue #53) and providing a comprehensive view of her role, services, and credentials.

## User Requirements

### Task:

Implement `/about` page as a feature-complete, polished single page (not a route collection) that:
1. Displays a portrait-dominant hero matching editorial scale (similar to `/contact` patterns)
2. Renders the approved 3-paragraph bio with proper typography hierarchy
3. Lists 5 updated services (updated copy addresses stale "lookbook" terminology from Fase v2)
4. Shows publication credits in wordmark/text format (Vogue Adria, Numéro, GQ México, Mode Magazine; excludes Fucking Young pending project confirmation per #12)
5. Includes data blocks: base city (A Coruña, Galicia), languages (Spanish native, English)
6. Provides CTAs: CV download (only if `profile.cvPath` exists; currently undefined per #10), Contact link, Instagram link
7. Does NOT depend on the unmerged `feat/i18n-foundation` branch (#57), but is structured so Fase 4 can inject bilingual strings

### Architecture:

**Page**: `src/pages/about.astro`

**Reusable components to create**:
- `<Portrait />` — editorial hero image (60–80vh scale, right-aligned or full width, mask-image fade)
- `<Bio />` — three-paragraph narrative with magazine-style leading and narrow column width
- `<ServicesList />` — ordered list of 5 services
- `<FeaturedInStrip />` — publication credits as wordmarks or plain text
- `<AboutFooter />` — languages, location, travel availability, CTAs

**Styling patterns**:
- Reuse `.page-shell`, eyebrow/headline typography (`--font-brand`), color tokens (`--gray-0/50/100`), `<Image>` with responsive widths/sizes
- Mask-image fade treatment (e.g., portrait bleed) from `/contact`
- Single responsive breakpoint at 50em (800px) per design guide
- Theme-aware light/dark mode support

**Data source**:
- `src/data/profile.ts` — must be updated: services array (5 items, updated wording; currently stale), featuredIn array (drop "Fucking Young" pending #12), cvPath (currently undefined), baseCity (currently "A Coruña" ✓), languages
- Bio paragraphs: inline in page or as `.md/.mdx` file (decision required; i18n integration point)

### Selected Context:

**Copy & requirements**:
- `plan/03-content-pages/about-copy-final-es.md` — Final approved copy (3 bio paragraphs, 5 services, publications, data, CTAs) with wording decisions and reasoning
- `plan/00-master-plan.md` §2 (role attribution), §6 (Campaigns/Brand Collaborations replace Lookbooks)
- `plan/02-information-architecture/REVISION-v2.md` — Lookbooks category eliminated; v1 design/code handoffs still valid except where noted
- `docs/plan-rediseno-portfolio-luisa/03-content-pages/design-handoff.md` — v1 design spec (hero portrait, bio structure, services, featured-in strip, footer CTAs)
- `docs/plan-rediseno-portfolio-luisa/03-content-pages/code-handoff.md` — v1 implementation spec (component structure, profile.ts update, acceptance criteria)

**Design system & patterns**:
- `docs/design-guide.md` — Color tokens (--gray-0/50/100/800/999), typography (Bebas Neue display, system sans body), spacing (grid gap utilities, .wrapper, .stack), shadows, transitions
- `docs/_ds/` — Design system reference (Miro board)
- `src/layouts/BaseLayout.astro` — Page shell, dark/light theme toggle, CSS custom properties
- `src/pages/contact.astro` — Existing pattern for eyebrow/headline typography, portrait hero with mask-image, channel/detail blocks, CTA styling
- `src/components/Footer.astro` — Existing footer using profile.ts for icons and links

**Current state**:
- `src/data/profile.ts` — Contains stale services (says "lookbook", "Personal shopping" as 5th item; needs sync with copy-final-es.md), stale featuredIn (includes "Fucking Young"), cvPath = undefined, baseCity = "A Coruña" (✓), languages array (✓), email, instagram, linkedin
- `src/pages/contact.astro` — Fully implemented; provides template for portrait hero, eyebrow/headline block, channels/details list, CTA patterns
- `src/layouts/BaseLayout.astro` — Provides `.page-shell`, color tokens, responsive breakpoint system, theme toggle
- `src/components/Nav.astro` — Current menu: Inicio, Editorial, Publicidad, Celebridades, Cine, Runway, Contacto (7 items; issue #53 flags crowding; About location TBD)
- `src/assets/portrait.webp` — Available portrait: 1365×2048px (2:3 aspect ratio, portrait-oriented); issue #13 notes this is lower-res than ideal but usable today

**Out of scope**:
- i18n routing/toggle (Fase 4, #39) — copy is Spanish-only, but component structure must not block bilingual handoff
- CV PDFs (#10) — `profile.cvPath` remains undefined; CTA must hide when undefined
- English translation (#39) — skipped until Luisa approves Spanish copy (already approved per plan/03-content-pages/)
- /press page (#33) — mentioned in handoffs but explicitly out of scope for this change
- Fase 2 work (role attribution in project credits) — About references services, not individual projects

**Nav implications**:
- Issue #53 flags nav is crowded (7 items already: Inicio + 5 categories + Contacto)
- About must be added; location TBD (suggest after Inicio or before Contacto; final decision in planning phase)
- Mobile nav must still render legibly with new entry

### Relationships:

**Dependency chain**:
1. `profile.ts` updates (services array from copy-final-es.md, featuredIn cleanup) feed into components
   - Services: update to 5-item array matching copy-final-es.md ("Estilismo editorial", "Estilismo de campaña y colaboraciones de marca", "Estilismo para celebridades y eventos", "Asesoría de imagen", "Personal shopper")
   - FeaturedIn: remove "Fucking Young" (no backing project; plan notes deletion in copy-final-es.md)
   - BaseCity, languages, email, instagram, cvPath: already correct or undefined as expected
2. Bio content (3 paragraphs from copy-final-es.md) → separate .md file (TBD: `src/content/bio.md` or `src/content/bio/es.md`) for i18n handoff
3. Components cascade: `<Portrait>` (hero) → `<Bio>` (narrative) → `<ServicesList>` (list) → `<FeaturedInStrip>` (wordmarks) → `<AboutFooter>` (metadata + CTAs)
4. `src/components/Nav.astro` textLinks array must add `{ label: 'About', href: '/about/' }` at position 1 (after Inicio)
5. `src/pages/about.astro` uses `BaseLayout` which provides `.page-shell`, color tokens, theme toggle, responsive breakpoints

**Data flow patterns** (reuse from /contact):
- Portrait: `src/assets/portrait.webp` → `<Image>` with widths/sizes/loading/fetchpriority, mask-image fade at bottom
- Eyebrow + headline: `.eyebrow` (Bebas Neue, text-sm, letter-spacing 0.3em) + `.headline` (clamp 3.5rem–8rem, line-height 0.9)
- Channels/details: `.channel-label` + `.channel-value` (underline on hover) pattern from contact.astro `.channels` and `.details` blocks
- CTA links: Bebas Neue uppercase with arrow, hover transform, matching CV link style
- Color palette: `--gray-0` (text), `--gray-50` (secondary), `--gray-100` (tertiary labels), `--gray-999` (background)

**Component responsibilities**:
- `<Portrait />`: Renders editorial-scale hero image with mask-image fade (props: src, alt)
- `<Bio />`: Three-paragraph narrative; either renders markdown content or accepts prose slots
- `<ServicesList />`: Renders 5 services from `profile.ts` as ordered list (no icons per design-handoff)
- `<FeaturedInStrip />`: Renders 4 publication names as plain text or wordmarks (Vogue Adria, Numéro, GQ México, Mode Magazine)
- `<AboutFooter />`: Renders location ("A Coruña, Galicia"), availability flag, languages, CV link (conditional), Contact + Instagram CTAs

**Parallel work**:
- Fase 2 (role attribution in project credits) happens in parallel but does not touch `/about`
- Fase 4 (i18n) will: import bio.md for both languages, inject strings via i18n routes, provide language toggle
- Fase 5 (Polish & Launch) may: update portrait if higher-res available (#13), add CV PDFs (#10), refine nav order if #53 blocks are addressed

### Ambiguities:

1. **Bio storage**: Should the 3 bio paragraphs live inline in `about.astro`, in a separate `src/content/bio.md`, or in `profile.ts`?  
   **Context**: Copy-final-es.md provides final text; `/contact` page uses inline copy. Fase 4 will inject bilingual strings via i18n system.  
   **Decision point**: Affects i18n handoff and editing workflow for Luisa.  
   **Recommendation**: Store bio as separate `.md` file in `src/content/bio/` with frontmatter for language metadata, allowing Fase 4 to inject translation variants without restructuring the component.

2. **Featured In — Fucking Young**: Currently in `profile.ts` but no backing project in `src/content/`. Plan notes it should be dropped pending confirmation (#12). Remove from profile.ts before implementing? Or keep and conditionally render?  
   **Context**: The copy-final-es.md document explicitly removed Fucking Young from the About copy listing ("Fuera de Publicaciones") because no project in the repo backs it. It remains in `profile.ts` as "stale" data.  
   **Decision point**: Affects `profile.ts` content list completeness and whether footprint/data accuracy is enforced at build time.  
   **Recommendation**: Remove "Fucking Young" from `profile.ts` `featuredIn` array now; if project is added later (#12), restore it atomically with the project data.

3. **Nav order for About**: After Inicio? Before Contacto? Suggestion in code-handoff unclear.  
   **Context**: Current nav has 7 items (Inicio, Editorial, Publicidad, Celebridades, Cine, Runway, Contacto). Issue #53 flags crowding. Desktop breakpoint is 78em.  
   **Decision point**: Consider mobile legibility and visual hierarchy.  
   **Recommendation**: Insert About after Inicio (early, establishes context) to create a natural flow: intro → about → work categories → contact.

4. **CV download visibility**: Code-handoff shows CTA link that renders only if `profile.cvPath` is defined. Currently it is undefined (#10). Should About page include placeholder styling / reserved space, or fully hide the CTA block?  
   **Context**: Contact page already implements this pattern (conditional render in AboutFooter template).  
   **Decision point**: Affects layout stability when PDF is added later.  
   **Recommendation**: Fully hide CTA block (no placeholder) when cvPath is undefined, matching /contact pattern. Layout shifts once PDF exists, but grid is stable.

5. **Portrait image resolution**: Issue #13 tracks that higher-res shots are pending. Current asset (1365×2048) is usable but not optimal.  
   **Context**: Current portrait.webp is 1365×2048px (2:3 aspect ratio); usable at @2x until ~2730px width (desktop max ~1200px, mobile ~100vw).  
   **Decision point**: Should About design for upscaling, or proceed with current dimensions?  
   **Recommendation**: Proceed with current asset (MVP acceptable per plan). Use widths/sizes for responsive loading and plan Fase 5 update when higher-res arrives (#13 tracks this).

---

## Selected Code Structure

```
src/
├── pages/
│   └── about.astro                   [new]
├── components/
│   ├── Portrait.astro                [new]
│   ├── Bio.astro                     [new]
│   ├── ServicesList.astro            [new]
│   ├── FeaturedInStrip.astro         [new]
│   └── AboutFooter.astro             [new]
├── data/
│   └── profile.ts                    [update: services array, featuredIn cleanup]
└── layouts/
    └── BaseLayout.astro              [no change; reused]
```

---

## Selected Files Tree

```
portfolio-luisa-benitez/
├── plan/
│   ├── 00-master-plan.md
│   ├── 02-information-architecture/
│   │   └── REVISION-v2.md
│   └── 03-content-pages/
│       └── about-copy-final-es.md
├── docs/
│   ├── design-guide.md
│   ├── _ds/
│   │   └── luisa-ben-tez-design-system-c044c1bc-9d1d-4943-937e-c0429579babf/
│   └── plan-rediseno-portfolio-luisa/
│       └── 03-content-pages/
│           ├── design-handoff.md
│           └── code-handoff.md
├── src/
│   ├── assets/
│   │   └── portrait.webp
│   ├── data/
│   │   └── profile.ts
│   ├── pages/
│   │   └── contact.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── components/
│   │   └── Nav.astro
│   │   └── Footer.astro
│   └── styles/
│       └── global.css
└── .claude/
    └── rules/
        ├── clean-architecture-rules.md
        └── 4-rules-of-simple-design-rules.md
```


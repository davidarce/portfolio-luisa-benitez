# Luisa Benítez — Design Guide

A style/token reference for the Luisa Benítez fashion-stylist portfolio (Astro + Tailwind v4).
This captures the brand's **colors, type, spacing, elevation, gradients, and core component
patterns** so the look can be reproduced or handed to a design tool. It is extracted from
`src/styles/global.css`, `src/layouts/BaseLayout.astro`, and the `.astro` components.

> **Note:** This is a design-system *reference*, not a runnable component library. The site's
> components are Astro (`.astro`) templates, not importable React components.

---

## Fonts

| Role | Family | Source | CSS |
|------|--------|--------|-----|
| Display / brand (default sans) | **Bebas Neue** | `@fontsource/bebas-neue` | `--font-sans: 'Bebas Neue', sans-serif;` |
| Accent / script | **Freehand** | `@fontsource/freehand` | `--font-freehand: 'Freehand', system-ui;` — apply with the `.font-freehand` utility |

Both are loaded in `BaseLayout.astro`. Bebas Neue is a tall, condensed all-caps display face —
it carries the editorial/fashion tone; Freehand is a handwritten script used for taglines
(e.g. the nav's "Fashion Stylist").

> ✅ **Resolved:** `global.css` styles headings with `var(--font-brand)` and body with
> `var(--font-body)`. These are now defined in the `@theme` block
> (`--font-brand: 'Bebas Neue', sans-serif;`, `--font-body: system-ui, sans-serif;`) so type
> renders intentionally instead of falling back to the browser default serif.

---

## Color

Colors are theme-aware: a 12-step neutral ramp plus an accent, redefined under `:root.theme-dark`.
The ramp **inverts** in dark mode (0 = darkest in light, lightest in dark), so always reference by
token, never by hex.

### Neutral ramp

| Token | Light | Dark |
|-------|-------|------|
| `--gray-0`   | `#090b11` | `#ffffff` |
| `--gray-50`  | `#141925` | `#f3f4f7` |
| `--gray-100` | `#283044` | `#e3e6ee` |
| `--gray-200` | `#3d4663` | `#c3cadb` |
| `--gray-300` | `#505d84` | `#a3acc8` |
| `--gray-400` | `#6474a2` | `#8490b5` |
| `--gray-500` | `#8490b5` | `#6474a2` |
| `--gray-600` | `#a3acc8` | `#505d84` |
| `--gray-700` | `#c3cadb` | `#3d4663` |
| `--gray-800` | `#e3e6ee` | `#283044` |
| `--gray-900` | `#f3f4f7` | `#141925` |
| `--gray-999` | `#ffffff` | `#090b11` |

`--gray-999-basis` (HSL parts) + `--gray-999_40` provide a 40%-alpha surface tint.

### Accent (purple/magenta)

| Token | Light | Dark |
|-------|-------|------|
| `--accent-light`   | `#c561f6` | `#1c0056` |
| `--accent-regular` | `#7611a6` | `#7611a6` |
| `--accent-dark`    | `#1c0056` | `#c561f6` |
| `--accent-overlay` | `hsla(280,89%,67%,0.33)` | same |
| `--accent-subtle-overlay` | = overlay | `hsla(281,81%,36%,0.33)` |
| `--accent-text-over` | `--gray-999` | `--gray-0` |
| `--link-color` | `--gray-50` | `--accent-dark` |

The accent is a vivid orchid/violet (`#c561f6` → `#7611a6` → `#1c0056`) — the single brand hue,
used for gradients, pills, links, and overlays.

---

## Gradients

| Token | Value |
|-------|-------|
| `--gradient-subtle` | `linear-gradient(150deg, var(--gray-900) 19%, var(--gray-999) 150%)` (card/surface fill) |
| `--gradient-accent` | `linear-gradient(150deg, accent-light, accent-regular, accent-dark)` |
| `--gradient-accent-orange` | `linear-gradient(150deg, #ca7879, accent-regular, accent-dark)` (warm variant) |
| `--gradient-stroke` | `linear-gradient(180deg, gray-900, gray-700)` (border/stroke fills) |

Stops are exposed individually as `--gradient-stop-1/2/3` for composition.

---

## Elevation (shadows)

Layered, low-alpha shadows tuned per theme (black in light, white in dark).

- `--shadow-sm` — resting cards
- `--shadow-md` — hover / raised
- `--shadow-lg` — modals / prominent

---

## Type scale

`rem`-based, referenced via `--text-*`:

| Token | Size | | Token | Size |
|-------|------|-|-------|------|
| `--text-sm` | 0.875rem | | `--text-xl` | 1.625rem |
| `--text-base` | 1rem | | `--text-2xl` | 2.125rem |
| `--text-md` | 1.125rem | | `--text-3xl` | 2.625rem |
| `--text-lg` | 1.25rem | | `--text-4xl` | 3.5rem |
| | | | `--text-5xl` | 4.5rem |

**Heading defaults:** `h1`→`--text-5xl`, `h2`→`--text-4xl`, `h3`→`--text-3xl`, `h4`→`--text-2xl`,
`h5`→`--text-xl`; line-height 1.1, color `--gray-50`.

---

## Spacing & layout

Gap utilities (`.gap-1` … `.gap-48`) map to a rem scale, with `lg:`-prefixed variants at the
`50em` (800px) breakpoint — the single responsive breakpoint used site-wide.

| Class | Gap | | Class | Gap |
|-------|-----|-|-------|-----|
| `.gap-1` | 0.25rem | | `.gap-10` | 2.5rem |
| `.gap-2` | 0.5rem | | `.gap-15` | 3.75rem |
| `.gap-4` | 1rem | | `.gap-20` | 5rem |
| `.gap-8` | 2rem | | `.gap-30` | 7.5rem |
| | | | `.gap-48` | 12rem |

**Primitives:**
- `.wrapper` — page container: `max-width: 83rem`, centered, `padding-inline: 1.5rem`.
- `.stack` — vertical flex column (default `gap: 1rem`); compose with `.gap-*`.
- `--theme-transition: 0.2s ease-in-out` — standard transition timing.

---

## Core component patterns

Reproduce these with the tokens above; class names are the site's own (scoped in each `.astro` file).

### Card
Surface tile for portfolio items. `background: var(--gradient-subtle)`, `1px solid var(--gray-800)`
border, `border-radius: 0.5rem`, `--shadow-sm` → `--shadow-md` on hover with `transform: scale(1.02)`.
A `.title` bar (`--gray-999` bg, `--gray-0` text, letter-spacing `0.05em`, centered) sits above a
cover image/video with configurable `--aspect-ratio` (default `3 / 4`) and `object-position`.
Sizes: `normal | tall | wide`.

### Hero
Centered stack (`align: start | center`). Title `--text-3xl` → `--text-5xl` at `lg`, color `--gray-0`;
optional tagline; `<slot />` for CTAs.

### Pill
Rounded tag: `border-radius: 999rem`, `0.5rem 1rem` padding, `1px solid var(--accent-regular)`,
`--gray-50` background, `--accent-text-over` text, `--text-md`.

### Links
`color: var(--link-color)` (neutral in light, accent in dark).

---

## Reproduction snippet

```css
/* Drop-in token base (light) */
:root {
  --font-sans: 'Bebas Neue', sans-serif;
  --font-brand: var(--font-sans);      /* fix the undefined-var gap */
  --font-body: system-ui, sans-serif;

  --gray-0: #090b11;  --gray-50: #141925;  --gray-999: #ffffff;  --gray-800: #e3e6ee;
  --accent-regular: #7611a6;  --accent-light: #c561f6;  --accent-dark: #1c0056;
  --gradient-subtle: linear-gradient(150deg, var(--gray-900,#f3f4f7) 19%, var(--gray-999) 150%);
  --shadow-sm: 0 6px 3px rgba(9,11,17,.01), 0 2px 2px rgba(9,11,17,.02), 0 0 1px rgba(9,11,17,.03);
  --text-3xl: 2.625rem;  --text-5xl: 4.5rem;
}
```

```html
<article class="card">
  <div class="title"><span class="text">Editorial · Vogue</span></div>
  <img src="…" alt="" style="aspect-ratio: 3 / 4; object-fit: cover;" />
</article>
```

# Verificación visual — 10 galerías nuevas (phase2-projects)

Medido con Chromium headless (`ms-playwright/chromium-1228`) vía `playwright-core`, contra el servidor de dev en `http://localhost:4321`. Rama: `feat/phase2-projects`.

## 1. Carga de imágenes por galería — PASS

Conteo de `<img>` dentro de `.gallery-item` en cada página de detalle (el layout de detalle solo renderiza `entry.data.images`, que excluye el fichero `index.*` usado como portada de la tarjeta; por eso el número esperado coincide 1:1 con las fotos numeradas de cada carpeta, sin sumar la portada).

| Galería | Esperado | Renderizado | Resultado |
|---|---|---|---|
| editorials/artego-color-pop-garden | 21 | 21 | PASS |
| editorials/pap-the-new-dandy | 18 | 18 | PASS |
| editorials/folie-always-love | 15 | 15 | PASS |
| editorials/folie-soft-tension | 10 | 10 | PASS |
| editorials/isabel-arbos-model-test | 28 | 28 | PASS |
| celebrities/maica-supervivientes | 13 | 13 | PASS |
| celebrities/tania-deniz-coachella | 10 | 10 | PASS |
| celebrities/ruth-basauri-coachella | 7 | 7 | PASS |
| celebrities/maica-premios-influencers | 4 | 4 | PASS |
| celebrities/alex-saint-malaga | 3 | 3 | PASS |

Las 10 galerías cargan el número exacto de imágenes esperado.

## 2. Imágenes rotas (`naturalWidth === 0`) — PASS

0 imágenes rotas de un total de 129 `<img>` comprobadas (una comprobación por galería, tras forzar `loading=eager` y `naturalWidth`/`complete` en cada una). Ninguna URL con `naturalWidth === 0`.

## 3. Orden natural (1, 2, …, N) — PASS

Se extrajo la parte numérica del `src` de cada `<img>` en orden del DOM y se verificó que fuera estrictamente ascendente:

- `editorials/artego-color-pop-garden` (21 fotos): `1,2,3,…,21` — ascendente. PASS
- `editorials/isabel-arbos-model-test` (28 fotos): `1,2,3,…,28` — ascendente. PASS
- `editorials/martina` (12 fotos, galería preexistente con el bug ya corregido): `1,2,3,…,12` — ascendente. PASS

El fix de `localeCompare(..., { numeric: true })` en `src/loaders/gallery-loader.ts` funciona correctamente en las 3 galerías comprobadas, incluida la que antes mostraba el orden lexicográfico roto.

## 4. Listados de categoría — PASS (comportamiento esperado, sin entrada de contenido todavía)

- `/editorials/`: 11 tarjetas (5 nuevas + 6 preexistentes). Las 5 nuevas muestran el slug en mayúsculas como título: `ARTEGO-COLOR-POP-GARDEN`, `FOLIE-ALWAYS-LOVE`, `FOLIE-SOFT-TENSION`, `ISABEL-ARBOS-MODEL-TEST`, `PAP-THE-NEW-DANDY`.
- `/celebrities/`: 9 tarjetas (5 nuevas + 4 preexistentes). Las 5 nuevas muestran el slug: `ALEX-SAINT-MALAGA`, `MAICA-PREMIOS-INFLUENCERS`, `MAICA-SUPERVIVIENTES`, `RUTH-BASAURI-COACHELLA`, `TANIA-DENIZ-COACHELLA`.

Confirmado: es el comportamiento esperado porque las 10 galerías nuevas todavía no tienen entrada en `src/content/editorials/editorials.json` / `src/content/celebrities/celebrities.json`; el loader cae al fallback `info?.title || slug`. No es un fallo.

## 5. Desbordes horizontales (390px / 1440px, tema claro) — PASS

Medido con `getBoundingClientRect().right` de **todos** los elementos de `body` contra `window.innerWidth` (no `scrollWidth`, dado que `body` tiene `overflow-x: hidden` y recortaría en silencio). Umbral de tolerancia 1px.

| Página | 390px | 1440px |
|---|---|---|
| `/editorials/` | 0 elementos desbordan | 0 elementos desbordan |
| `/celebrities/` | 0 elementos desbordan | 0 elementos desbordan |
| `/editorials/artego-color-pop-garden/` | 0 elementos desbordan | 0 elementos desbordan |
| `/editorials/isabel-arbos-model-test/` | 0 elementos desbordan | 0 elementos desbordan |

Sin desbordes horizontales en ninguna de las 4 páginas comprobadas, en ninguno de los 2 viewports.

## 6. Peso de página — `isabel-arbos-model-test` (28 fotos) — INFORMATIVO / posible mejora

- **Bytes de imagen transferidos al cargar**: 3,572,326 bytes (~3.57 MB / ~3.41 MiB) — suma de las 28 respuestas `image/*`.
- **Imágenes pedidas de entrada**: **28 de 28**, ya en el evento `load` (antes de cualquier scroll) y sin cambios tras hacer scroll hasta el final. Confirmado con dos mediciones independientes (conteo de `response` con `resourceType() === 'image'`, y conteo de `request` capturado hasta el evento `load`).
- El HTML sí marca cada `<img>` con `loading="lazy"` (visible en `src/pages/editorials/[...slug].astro`), y la página mide 6138px de alto frente a un viewport de 900px (6.8×), pero en la medición real el navegador se traga las 28 de golpe — el atributo `loading="lazy"` no está limitando la carga inicial en esta página, al menos bajo Chromium en estas condiciones (red local, sin throttling). No es una imagen rota ni un desborde, pero si el objetivo del lazy-loading era reducir la carga inicial en la galería más pesada, actualmente no se está consiguiendo: la página se traga las 28 imágenes (~3.57 MB) de golpe.

## Capturas

En `.sdd/phase2-projects/evidence/`:

- `editorials-listing-390-light.png`, `editorials-listing-1440-light.png`
- `celebrities-listing-390-light.png`, `celebrities-listing-1440-light.png`
- `artego-color-pop-garden-detail-390-light.png`, `artego-color-pop-garden-detail-1440-light.png`
- `isabel-arbos-model-test-detail-390-light.png`, `isabel-arbos-model-test-detail-1440-light.png`

## Resumen

| Check | Resultado |
|---|---|
| 1. Conteo de imágenes (10 galerías) | PASS |
| 2. Imágenes rotas | PASS (0/129) |
| 3. Orden natural | PASS (3/3 galerías) |
| 4. Listados de categoría | PASS (slug como título, esperado) |
| 5. Desbordes horizontales | PASS (0 en 4 páginas × 2 viewports) |
| 6. Peso de página / lazy-loading | INFORMATIVO — `isabel-arbos-model-test` transfiere 3.57 MB y pide las 28 imágenes de golpe pese a `loading="lazy"` |

No se modificó ningún fichero de `src/` ni de `public/`.

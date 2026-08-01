# Verificación final — Fase 2 (interacción entre cambios paralelos)

Medido con Chromium headless (`ms-playwright/chromium-1228`) vía `playwright-core` (instalado ad hoc en el scratchpad, no en el repo), contra el servidor de dev en `http://localhost:4321`. Rama: `feat/phase2-projects`. Build ejecutado con `pnpm build`.

No existía `plan.md`/`exploration.md` para este change en `.sdd/phase2-projects/`; se ejecutó directamente el encargo de verificación recibido (equivalente a un plan ad hoc), igual que el `gallery-check.md` previo de este mismo directorio.

## A. Renombrado vs. créditos/galerías — 36/36 PASS (arreglado)

Recorridas las 36 fichas (11 editorials, 11 publicity→/campaigns/, 9 celebrities→/celebrity-events/, 4 runway, 1 films) por script: rol visible (`.role-label` con el texto esperado según `role`), número de `.gallery-item` contra el nº de ficheros de la carpeta, y `aspect-ratio` computado en los primeros ítems. Los slugs se tomaron directamente de las carpetas en `public/assets/*` (no de los enlaces de la página de listado, que ocultan las fichas con `hasGallery: false` — un solo archivo, ej. `kerastase` — vía `disableLink`).

| Categoría | Fichas | Rol visible | Nº imágenes correcto | `aspect-ratio: 3 / 4` |
|---|---|---|---|---|
| editorials | 11 | 11/11 | 11/11 | 11/11 |
| campaigns (`/campaigns/`) | 11 | 11/11 | 11/11 | 11/11 |
| celebrity-events | 9 | 9/9 | 9/9 | 9/9 |
| runway | 4 | 4/4 | 4/4 | 4/4 |
| films | 1 | 1/1 | 1/1 | 1/1 |

**ARREGLADO — `/editorials/vogue/`**: la ficha tiene 11 elementos (10 fotos + `video-1.mp4`); el `.gallery-item` nº 11 se pintaba como `<img src="/assets/editorials/vogue/video-1.mp4">` en lugar de `<video>` (`naturalWidth: 0`, imagen rota). Causa: `src/pages/editorials/[...slug].astro` no tenía el check `isVideo` que sí tienen `src/pages/campaigns/[...slug].astro` y `src/pages/runway/[...slug].astro`. Se replicó ese mismo patrón (detección por extensión `/\.(mp4|webm|mov)$/i`, `<video autoplay loop muted playsinline controls>` vs. `<img loading="lazy">`, y `.gallery-item video` sumado a la regla `.gallery-item img` existente para que el `aspect-ratio: 3 / 4` y el `object-fit: cover` sigan aplicando) en `src/pages/editorials/[...slug].astro`, `src/pages/celebrity-events/[...slug].astro` y `src/pages/films/[...slug].astro` — estas dos últimas no tenían ningún vídeo hoy, pero el hueco era el mismo bug latente. `CreditsBlock` y `aspect-ratio: 3/4` en `.gallery-item` (los dos cambios recientes de esas plantillas) no se tocaron. Verificado: 0 `<img>` apuntando a `.mp4/.mov/.webm` en las 36 fichas, tras el arreglo.

Las cinco plantillas (`editorials`, `campaigns`, `celebrity-events`, `runway`, `films`) comparten ahora un bloque de galería idéntico salvo por detalles de indentación (tabs en `editorials`/`celebrity-events`, espacios en `campaigns`/`runway`/`films`). Es candidato claro a extraer un componente compartido (`GalleryItem`/`MediaGrid`), pero fuera de alcance de este arreglo puntual.

## B. Vídeos transcodificados reproducibles — PASS (campaigns, runway, editorials — arreglado)

`readyState`/`videoWidth` medidos tras `load` + scroll + 3s de margen, en una página por categoría con vídeo:

| Página | Vídeos `<video>` | readyState ≥ 2 | videoWidth > 0 |
|---|---|---|---|
| `/campaigns/gdh-jesus-de-paula/` | 4 | 4/4 (todos =4) | 4/4 |
| `/campaigns/bruno-magli/` | 4 | 4/4 | 4/4 |
| `/campaigns/kerastase/` | 1 | 1/1 | 1/1 |
| `/runway/claro-couture/` | 6 | 6/6 | 6/6 |
| `/runway/angel-schlesser-2025/` | 4 | 4/4 | 4/4 |
| `/editorials/vogue/` | **1** | 1/1 (`readyState: 4`) | 1/1 (`videoWidth: 640`) |

`/editorials/vogue/` ya renderiza su único vídeo como `<video>` y se reproduce de verdad (medido tras `load` + scroll al final de la galería + 3s de margen, viewport 1440×900).

## C. Ningún `poster` apuntando a vídeo — PASS

`poster=` extraído de todos los `<video>` en `/`, `/editorials/`, `/campaigns/`, `/celebrity-events/`, `/runway/`, `/films/`:

| Página | `<video poster>` encontrados |
|---|---|
| `/` | 0 |
| `/editorials/` | 0 |
| `/campaigns/` | 10 |
| `/celebrity-events/` | 0 |
| `/runway/` | 4 |
| `/films/` | 0 |

14 posters comprobados, **0** acaban en `.mp4`/`.mov`/`.webm`. Los 6 huecos de vídeo sin `index.webp` propio mencionados en el encargo (`kerastase`, `kerastase-lola-lolita`, `kerastase-nicole-wallace`, `redken-marina-reche`, `vogue-spain-maria-pombo`, `ysl-aitana`) tienen su `index.webp` generado y el `poster` de su card apunta a él.

## D. Rutas `/assets/` en JSON de `src/content/` — PASS, sin arreglos necesarios

Extraídas por grep las 30 rutas `"/assets/..."` explícitas en los 5 JSON (`editorials.json`, `publicity.json`, `celebrities.json`, `runway.json`, `films.json`) y comprobadas una a una con `curl` contra `localhost:4321`:

| JSON | Rutas `/assets/` | Existen en disco | HTTP 200 |
|---|---|---|---|
| editorials.json | 11 | 11/11 | 11/11 |
| publicity.json | 5 | 5/5 | 5/5 |
| celebrities.json | 8 | 8/8 | 8/8 |
| runway.json | 4 | 4/4 | 4/4 |
| films.json | 1 | 1/1 | 1/1 |
| **Total** | **30** | **30/30** | **30/30** |

Ninguna ruta rota. No hay referencias a `.mp4`/`.mov`/`.webm` en los JSON (el loader construye `img`/`video`/`images` a partir del filesystem, no de estos campos). **No se aplicó ningún arreglo del punto 6** porque no hizo falta.

## E. Lazy-loading tras el renombrado — mejor que la referencia

`/editorials/isabel-arbos-model-test/` (28 fotos), viewport 1440×900, medido en el evento `load`:

| Métrica | Referencia (post-fix, pre-renombrado) | Medido ahora |
|---|---|---|
| Imágenes pedidas al `load` | 15 / 28 | **9 / 28** |
| Bytes de imagen transferidos | 1.78 MB | **0.95 MB** (998,500 bytes) |

Resultado: **PASS, mejor que la referencia**, no una regresión. Probablemente porque `aspect-ratio: 3/4` en `.gallery-item` (punto 3 del encargo) reserva el hueco del grid sin necesitar cargar la imagen para conocer su tamaño, así que el lazy-loading nativo es aún más conservador que en la medición de referencia.

## F. Peso de páginas de listado

Medido con todas las respuestas hasta 500ms después de `load`, viewport 1440×900:

| Página | Bytes totales | Requests | Media (vídeo) | Imágenes |
|---|---|---|---|---|
| `/campaigns/` | 10.21 MB | 50 | 8.88 MB | 0.63 MB |
| `/runway/` | 4.56 MB | 39 | 3.02 MB | 0.91 MB |

No hay una medición "antes" guardada por página; usando la proporción global del vídeo (381 MB → 89 MB, ×4.28) como estimación aproximada, el peso de vídeo pre-transcodificación de estas dos páginas habría rondado ~38 MB (`/campaigns/`) y ~12.9 MB (`/runway/`) — una estimación gruesa, no una medida real. Nota aparte: los 10 vídeos de `/campaigns/` tienen `autoplay` sin `loading="lazy"` (ese atributo solo aplica a `<img>`), así que las 8.88 MB de vídeo se piden todas de golpe al cargar el listado — no es un fallo del renombrado, es el comportamiento ya existente de `Card.astro`.

## G. Sin desbordes horizontales — PASS (72/72)

`getBoundingClientRect().right` de todos los elementos de `body` contra `window.innerWidth` (no `scrollWidth`), en `/`, `/campaigns/`, `/celebrity-events/`, `/editorials/`, `/runway/`, `/about/`, `/contact/`, `/editorials/isabel-arbos-model-test/` y `/campaigns/bruno-magli/`, a 360/390/1344/1440px, en claro y oscuro (`colorScheme` de Playwright, tolerancia 1px):

**0 elementos desbordan en las 72 combinaciones** (9 páginas × 4 anchos × 2 temas).

## H. Nav con etiqueta larga — PASS

| Medida | Valor |
|---|---|
| `.menu-footer` borde derecho @ 1344px | 1301.4px (43px de margen, sin desborde) |
| `.menu-footer` borde derecho @ 1440px | 1392px (48px de margen, sin desborde) |
| Hamburguesa @ 390px, clic real | `aria-expanded`: `false` → `true`; `<nav>` visible tras el clic |

## I. `pnpm build` limpio — PASS

```
[build] 72 page(s) built in 5.29s
[build] Complete!
```

Desglose verificado en `dist/`: 71 `index.html` + 1 `404.html` = 72 `.html`. De esos, 22 contienen `<meta http-equiv="refresh">` (las redirecciones de las rutas viejas `/publicity/*` y `/celebrities/*`) y 50 son páginas reales (incluye `404.html`). **72 = 50 reales + 22 redirecciones**, coincide con la referencia.

Re-ejecutado tras el arreglo del punto A/B: `[build] 72 page(s) built in 5.11s` / `[build] Complete!` — mismo desglose, sin cambios.

## J. Arreglo del vídeo roto en `/editorials/vogue/` — PASS

Aplicado el mismo patrón `isVideo` de `campaigns`/`runway` a `editorials`, `celebrity-events` y `films` (ver punto A). Verificación dedicada tras el cambio:

- `/editorials/vogue/`: 1 `<video src="/assets/editorials/vogue/video-1.mp4">` en el DOM, `readyState: 4`, `videoWidth: 640` (medido tras `load` + scroll + 3s). 0 `<img>` con `src` acabado en `.mp4/.mov/.webm`.
- Recorridas las 36 fichas (slugs desde `public/assets/*`, no desde los enlaces de listado): 0 `<img>` apuntando a vídeo, 36/36 `.role-label` presente, 36/36 `aspect-ratio: 3 / 4` en los `.gallery-item` (incluidos los de vídeo en `campaigns` y `runway`, que ya tenían el check).
- `/editorials/vogue/` a 390px y 1440px: `getBoundingClientRect().right` vs. `window.innerWidth` en todos los elementos de `body` — **0 desbordes** en ambos anchos.
- `pnpm build`: 72 páginas, limpio.
- `CreditsBlock` (rol) y `aspect-ratio: 3/4` de `.gallery-item` — ambos cambios recientes de las plantillas — intactos; no se tocó ninguna otra regla de estilo ni de `CreditsBlock`.

Ficheros modificados: `src/pages/editorials/[...slug].astro`, `src/pages/celebrity-events/[...slug].astro`, `src/pages/films/[...slug].astro`. No se tocó `src/pages/campaigns/[...slug].astro` ni `src/pages/runway/[...slug].astro` (ya tenían el check) ni `src/pages/celebrities/[...slug].astro` (es solo una redirección estática a `/celebrity-events/`, no la plantilla real).

## Resumen

| Punto | Resultado |
|---|---|
| A. 36 fichas (rol, galería, aspect-ratio) | **36/36 PASS** (vídeo de `/editorials/vogue/` arreglado, ver J) |
| B. Vídeos reproducibles | **PASS** (campaigns, runway, editorials) |
| C. `poster` sin apuntar a vídeo | PASS (0/14 rotos) |
| D. Rutas `/assets/` en JSON | PASS (30/30), sin arreglos necesarios |
| E. Lazy-loading `isabel-arbos-model-test` | PASS — mejor que referencia (9/28, 0.95 MB vs. 15/28, 1.78 MB) |
| F. Peso `/campaigns/` y `/runway/` | Informativo — 10.21 MB y 4.56 MB actuales |
| G. Desbordes horizontales | PASS (0/72) |
| H. Nav con etiqueta larga | PASS |
| I. `pnpm build` | PASS (72 páginas, 50+22) |
| J. Arreglo vídeo roto `/editorials/vogue/` | **PASS** — 5 plantillas ahora se comportan igual |

## Fallo arreglado

**`/editorials/vogue/` tenía su único vídeo roto** (se pintaba como `<img>`, no como `<video>`): `src/pages/editorials/[...slug].astro` le faltaba el mismo check `isVideo` que ya existía en `src/pages/campaigns/[...slug].astro` y `src/pages/runway/[...slug].astro`. Mismo problema latente (sin caso real entonces) en `src/pages/celebrity-events/[...slug].astro` y `src/pages/films/[...slug].astro`. Arreglado replicando el patrón existente en las tres plantillas (ver punto J). No se extrajo un componente compartido de galería aunque las cinco plantillas ahora comparten ese bloque casi al carácter — queda fuera de alcance de este arreglo.

## Capturas

En `.sdd/phase2-projects/evidence/` (nuevas de esta verificación, sufijo por página-ancho-tema):

- `home-390-light.png`, `home-1440-light.png`, `home-390-dark.png`, `home-1440-dark.png`
- `campaigns-listing-390-light.png`, `campaigns-listing-1440-light.png`, `campaigns-listing-390-dark.png`, `campaigns-listing-1440-dark.png`
- `celebrity-events-listing-390-light.png`, `celebrity-events-listing-1440-light.png`, `celebrity-events-listing-390-dark.png`, `celebrity-events-listing-1440-dark.png`
- `campaigns-bruno-magli-detail-credits-390-light.png`, `campaigns-bruno-magli-detail-credits-1440-light.png`, `campaigns-bruno-magli-detail-credits-390-dark.png`, `campaigns-bruno-magli-detail-credits-1440-dark.png`
- `editorials-vogue-390.png`, `editorials-vogue-1440.png` (nuevas, tras el arreglo del punto J — `/editorials/vogue/` con el vídeo ya renderizado como `<video>`)

Ficheros modificados en esta pasada: `src/pages/editorials/[...slug].astro`, `src/pages/celebrity-events/[...slug].astro`, `src/pages/films/[...slug].astro`. Ningún otro fichero de `src/` ni de `public/` se tocó.

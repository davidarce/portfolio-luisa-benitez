# Plan v2 — Portada de rejilla, «sobre mí» sin retrato y `/contact` de vuelta

> Corrige el plan anterior tras validar las tres variantes de portada con David.
> Lo ya hecho (home unificada, nav a 6, redirecciones) está en `c25cfb5`.

## Qué pasó y por qué se cambia

La variante A fracasó **por su implementación, no por su concepto**: para garantizar contraste sobre la imagen se le puso un velo negro al 90% de opacidad cubriendo el 85% del alto, más un `scale(1.4)` para sacar de encuadre el logo de PAP. La medición daba 10,5:1 y el diseño estaba muerto — de una editorial espectacular quedaba un borrón negro. Es el error de optimizar la métrica y perder el objetivo.

Además, una portada de **una sola imagen** convierte esa foto en la declaración de marca del sitio. La de PAP es lo más conceptual del portfolio (menswear de vanguardia, monocromo rojo, cola de piel) y descompensa el posicionamiento acordado en `about-material.md`: *editorial de raíz que entiende y respeta el lenguaje comercial*. Una rejilla enseña **rango**, que es lo que ella dice de sí misma («estilista multifacética»), y es lo que hacen las webs de agencias.

Y el retrato actual (`src/assets/portrait.webp`) es una foto de calle con gafas de sol, sin mirada a cámara y con un seto de fondo. No da para portada — el issue #13 ya pide otra. Su sitio natural es contacto: una cara junto a «Hablemos».

## Objetivos

1. Portada con rejilla de trabajos, **sin velos sobre la imagen**. El texto no se superpone.
2. «Sobre mí» sin retrato: solo texto, columna estrecha, tratamiento editorial.
3. `/contact` vuelve como página propia, con el retrato y los canales.
4. El peso de la portada no se dispara.

## No-objetivos

- Reescribir copy. Sale de `t.about`, `t.profile` y `t.contact`, que ya existen.
- Rediseñar tarjetas, grid de categorías o fichas de detalle.
- Recortar el fondo del retrato. Descartado: el pelo ondulado deja halos.

## Tareas

- [X] **T001 — Portada de rejilla.** Varias imágenes de sesión en rejilla, elegidas **mirándolas**, buscando variedad de color y de tipo de trabajo. El nombre y el rol van en tipografía **aparte de las imágenes**, no encima: así la foto conserva su fuerza y el contraste sale gratis. Buenos candidatos: `editorials/artego-color-pop-garden`, `editorials/pap-the-new-dandy`, `editorials/isabel-arbos-model-test`, `celebrities/tania-deniz-coachella`.

	Implementado en `src/pages/index.astro` como rejilla 2×2 (móvil) / 4×1 (≥50em) sin velo: `.hero-panel` (eyebrow/h1/tagline/instagram) vive aparte de `.hero-grid`, nunca superpuesto. Se sustituyó `tania-deniz-coachella` por `celebrities/aitana` (evento YSL Beauty, fondo lila): al mirar las 11 fotos de esa sesión, todas —incluida su `index.webp`— llevan un icono de altavoz/mute quemado en la esquina (son fotogramas de vídeo), justo el problema que este documento pedía evitar. Set final: `pap-the-new-dandy` (rojo/burdeos), `artego-color-pop-garden` (verde pastel), `isabel-arbos-model-test` (gris neutro), `aitana` (lila, estilismo de evento) — dos editoriales, un model test, un evento. Al wordmark "PAP" que queda dentro de la celda alta y estrecha de escritorio se le aplicó `transform: scale(1.2)` (mismo mecanismo documentado en heroes.md para las variantes A/C) para sacarlo de encuadre sin necesitar velo, porque aquí el texto no vive sobre la imagen.

- [X] **T002 — Peso de la portada.** La variante C pesaba 632 KB frente a 44-48 KB de las otras, porque sus imágenes viven en `public/` y **se saltan el procesado de imágenes de Astro**. Hay que resolverlo: mover a `src/assets/` y usar `<Image>` con `widths`/`sizes`, o el mecanismo que corresponda. Objetivo: que la portada no supere de forma desproporcionada el peso anterior. **Dar el número final.**

	Las 4 fotos se copiaron a `src/assets/hero/` (no se importan desde `public/`) y se sirven con `<Image>` (`widths={[280,420,600,800]}`, `sizes="(min-width: 50em) 23vw, 50vw"`). Medido con Playwright contra `pnpm build` + `pnpm preview` (bytes reales de red, sumando las 4 imágenes del hero, no un promedio): **390px → 48 360 bytes (47,2 KB)**; **1440px → 93 166 bytes (91,0 KB)**. Muy por debajo de los 632 KB de la variante fallida y en línea con A/B (44-48 KB) pese a ser 4 fotos reales en vez de 1.

- [X] **T003 — «Sobre mí» sin retrato.** Quitar la foto de esa sección. Texto en columna estrecha con tratamiento editorial; debajo, servicios, publicaciones y datos.

	Se quitó `.about-portrait` y el `<Image>` de `portrait.webp` de `#sobre-mi`. `.about-content` pasa a columna única centrada (`max-width: 42rem; margin-inline: auto`) en vez del grid 5fr/7fr anterior. Servicios, publicaciones y datos quedan debajo, sin cambios de copy (sigue saliendo de `t.about`/`t.profile`).

- [X] **T004 — Recuperar `/contact`.** Vuelve a ser página propia con el retrato y los canales, recuperando el diseño que ya estaba validado (`git log` de `src/pages/contact.astro` antes de `c25cfb5`). La sección de contacto **sale de la home** para no duplicar.

	Recuperado literal de `eb7feb6:src/pages/contact.astro` (última versión previa a `c25cfb5`, cuando pasó a redirección): retrato a sangre con máscaras cruzadas (`mask-composite: intersect`), `object-position: 50% 22%`, `clamp()` en `.channel-value` y los dos `min-width: 0` documentados (grid item de `.contact` y de `.panel`). Sin cambios de diseño; solo se actualizó el comentario de cabecera para reflejar la recuperación. La sección `#contacto` se quitó de `src/pages/index.astro` (markup, los `const channels`/`contactDetails` del frontmatter, el import de `CvDownloadLink` y el bloque CSS `.contact`/`.channels`/`.channel-*` completo). No quedaba ningún `href="#contacto"` ni `/#contacto` en el código: el único texto que mencionaba el ancla era un comentario en `Nav.astro`, actualizado también.

- [X] **T005 — Nav a 7 enlaces.** Vuelve «Contacto». «Sobre mí» NO vuelve — sigue siendo ancla de la home.

	`textLinks` en `Nav.astro` gana `{ label: t.nav.contact, href: '/contact/' }` al final. `t.nav.about` sigue sin usarse en el menú (solo como título de la redirección en `about.astro`).

- [X] **T006 — Remedir el breakpoint.** Está en 80em, medido para 6 enlaces. Con 7 hay que volver a medir.

	Medido en Chromium con las 7 páginas de destino del nav (`/`, `/editorials/`, `/campaigns/`, `/celebrity-events/`, `/films/`, `/runway/`, `/contact/` — una por enlace, porque la etiqueta activa cambia de ancho en cada una) y con WCAG 1.4.12 forzado (letter-spacing 0.12em, word-spacing 0.16em, line-height 1.5). Peor caso: `/celebrity-events/` ("Celebridades y eventos" es la etiqueta activa más larga), que deja de desbordar a partir de ~1320px (82,5em). Se eligió **88em (1408px)**, no el borde exacto: ~88px de margen sobre ese cruce medido — la lección de 81.25em (plan.md T006) era justamente no clavar el ancho exacto. A 88em las 7 páginas están en estado estable sin desbordar (`.menu-footer` con 48px de margen real), con y sin WCAG 1.4.12 forzado. Verificado también que a 1408px (el propio breakpoint) y 1440px no hay desborde en ninguna de las 7 páginas, y que el botón hamburguesa se oculta exactamente en 1408px y sigue visible en 1407px. El comentario del historial en `Nav.astro` (el que documenta 78em → 81.25em → 84em → 80em) se actualizó a continuación con esta medición, y el `matchMedia('(min-width: 88em)')` del script se cambió a la vez que el `@media` de los estilos — ambos sitios verificados con `grep -n "88em" src/components/Nav.astro`.

	WCAG 1.4.12: con 7 enlaces **se mantiene** sin desbordar en ningún ancho ≥88em — el margen de 88px sobre el cruce medido (82,5em) es más que suficiente. La deuda de #53 sigue cerrada.

- [X] **T007 — Borrar las rutas temporales** `src/pages/hero-a/`, `hero-b/`, `hero-c/` y su exclusión del sitemap.

	Directorios borrados. `astro.config.mjs`: quitadas las tres líneas `!page.endsWith('/hero-*/')` del filtro del sitemap y también `!page.endsWith('/contact/')` (ya no es redirección, vuelve a ser indexable); comentario del filtro actualizado. `pnpm build` confirma que no se generan `/hero-a/`, `/hero-b/` ni `/hero-c/`.

## Correcciones tras revisión en navegador (post plan-v2)

David revisó el resultado de plan-v2 en el navegador (no solo en oscuro, que es donde se venía mirando el sitio) y pidió dos correcciones puntuales:

- [X] **Rejilla de la portada en escritorio.** A partir de 50em `.hero-grid` pasaba a `grid-template-columns: repeat(4, 1fr)` con `grid-template-rows: 1fr` dentro de un `flex: 5` junto a `.hero-panel` (`flex: 6`, altura fija por `align-items: stretch` implícito). Resultado: cada foto ocupaba ~11% del ancho del viewport pero el alto completo del panel de texto — lonchas verticales altísimas donde no se reconocía nada, con la primera imagen prácticamente perdida contra el borde izquierdo.

	Solución: se mantiene la rejilla 2×2 también en escritorio (`grid-template-columns`/`grid-template-rows: repeat(2, 1fr)`, igual que en móvil) y se sustituye la altura heredada del panel (`height: auto`) por `height: clamp(26rem, 58vw, 44rem)` — escala con el ancho del viewport para que la proporción de cada celda se mantenga estable entre breakpoints, con un tope en pantallas muy anchas. Medido en Chromium (`getBoundingClientRect` de `.hero-tile`):

	| Viewport | Celda (ancho×alto) | Proporción (ancho:alto) |
	|---|---|---|
	| 1024px | 206×296 | 0,70 (retrato) |
	| 1280px | 264×351 | 0,75 (retrato, ~3:4) |
	| 1440px | 301×351 | 0,86 (retrato) |
	| 1920px | 410×351 | 1,17 (ligeramente apaisada — el `clamp` toca su máximo de 44rem aquí) |

	Nada de "lonchas" (proporción mínima 0,70, lejos del ~0,21 del bug) ni "cuadrados aplastados" (máxima 1,17, apaisado leve solo en el extremo de 1920px). Ningún sujeto queda cortado contra el borde del viewport en ninguna de las capturas de `evidence/v3/`. El peso de la portada no cambió: sigue en 48 360 bytes a 390px y 93 166 bytes a 1440px (medido contra `pnpm build` + `pnpm preview`), porque el arreglo es solo CSS de layout — no toca `widths`/`sizes` ni las imágenes servidas.

- [X] **Difuminado del retrato en `/contact`.** El borde derecho/superior del retrato en escritorio llevaba dos máscaras cruzadas (`mask-composite: intersect`) para disolverse contra el fondo en vez de cortarse en seco. En tema oscuro fundía limpio con el negro; en tema claro los píxeles oscuros del retrato a media opacidad sobre blanco dejaban un halo gris sucio (parecía una sombra mal hecha). Se quitó el `mask-image`/`mask-composite` del bloque `@media (min-width: 50em)`, dejando un borde recto.

	Al revisar en claro se encontró el mismo defecto en el mask-image base (móvil, `<50em`), que solo difuminaba el borde inferior — visible como un manchurrón gris sobre el seto oscuro y la portada de la revista en la captura a 390px en claro. Se quitó también, aunque el encargo original solo señalaba las máscaras cruzadas de escritorio: es el mismo bug (mask a transparente revelando el fondo blanco) en el mismo elemento, y el criterio de aceptación pide comprobar ambos temas a 390/1024/1440.

	Verificado en Chromium que el borde recto se lee bien en ambos temas y en los tres anchos, sin necesidad de sustituir el difuminado por otra técnica (el corte seco no queda mal — es un patrón habitual en layouts de foto | texto a dos columnas). Capturas en `evidence/v3/`.

Verificación completa (ambas correcciones): sin desbordes horizontales en home ni `/contact` a 390/1024/1440, claro y oscuro (`getBoundingClientRect().right` vs `window.innerWidth`, 0 elementos desbordando de 12 combinaciones × 2 páginas). `pnpm build` limpio, 72 páginas. Contraste de texto en ambas páginas y temas: 13,15:1–19,67:1, muy por encima de 4.5:1.

## Criterios de aceptación

- [X] **Ningún texto sobre imagen con velo.** Verificado: `.hero-panel` vive aparte de `.hero-grid`, nunca superpuesto; el texto siempre cae sobre el fondo plano de la página (`--gray-999`), no sobre foto. Contraste medido con la fórmula WCAG relativa: headline 19,67:1, tagline/bio 17,57–17,89:1, eyebrow 13,15–15,75:1 en ambos temas — muy por encima de 4.5:1.
- [X] Peso de la portada: bytes de imagen al cargar, a 390 y a 1440. Con su número. Medido con Playwright contra `pnpm build` + `pnpm preview` (suma de las 4 imágenes del hero): **390px → 48 360 bytes (47,2 KB)**; **1440px → 93 166 bytes (91,0 KB)**. Sin cambio frente a la medición anterior (T002): la corrección de la rejilla (ver nota de corrección más abajo) es solo CSS de layout, no toca `widths`/`sizes` ni las imágenes servidas.
- [X] `/contact` responde 200 con retrato y canales, y la home ya no tiene sección de contacto duplicada. Verificado con `curl` (200) y confirmado en captura que la sección `#contacto` no existe ya en `index.astro`.
- [X] `/about/` sigue redirigiendo a `/#sobre-mi`. Verificado sin cambios: `curl` 200, meta-refresh a `/#sobre-mi`.
- [X] El nav con 7 enlaces **no se recorta en ningún ancho**, medido en varias páginas porque la etiqueta activa cambia de ancho. Medido en las 7 páginas de destino (ver T006) a 1408px (breakpoint) y 1440px, con y sin WCAG 1.4.12: `overflow` (rect.right - innerWidth) siempre negativo.
- [X] La hamburguesa abre con clic real justo por debajo del breakpoint y a 390px. Verificado: oculta en 1408px, visible en 1407px; clic real en 1024, 1200 y 390px pone `aria-expanded="true"` y `#menu-content` visible.
- [X] WCAG 1.4.12: con 7 enlaces se mantiene sin desbordar (ver detalle en T006) — la deuda de #53 sigue cerrada.
- [X] Sin desbordes horizontales en la home y `/contact` a 360, 390, 800, 1024, 1344 y 1440, claro y oscuro. Barrido completo (12 combinaciones × 2 páginas) sin ningún elemento con `getBoundingClientRect().right > innerWidth`.
- [X] Altura de la home en móvil, para comparar con los 6351px actuales. `document.body.scrollHeight` a 390px: **5443px** (baja 908px, −14%) tras quitar la sección `#contacto` de `index.astro` en T004.
- [X] Ningún enlace interno roto. Crawl completo desde `/` (42 páginas visitadas) sin enlaces rotos.
- [X] `pnpm build` limpio, con el número de páginas explicado. **72 páginas**: mismo total que antes de `hero-a/b/c` (esas 3 rutas temporales se borraron en T007) — `/contact/` no suma página nueva porque ya la contaba como redirección, solo cambió su contenido.

## Definición de hecho

Verificado **midiendo en Chromium**. Capturas de la home completa y de `/contact` a 390 y 1440, claro y oscuro, en `.sdd/home-unificada/evidence/v2/`.

## Batch Assignments for Sub-Agents

| Batch | Tasks | File | Parallel | Depends on |
|-------|-------|------|----------|------------|
| A | T001-T003 | `src/pages/index.astro` + assets | No | — |
| B | T004-T007 | `contact.astro`, `Nav.astro`, rutas temporales | No | A |

Secuencial: B quita la sección de contacto de la home que A deja tocada.

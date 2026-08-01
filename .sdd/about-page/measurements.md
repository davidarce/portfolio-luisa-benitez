# Verificación medida — /about y /contact (Fase 4, batch H: T010–T012)

Arnés: `{scratchpad}/measure-about.mjs` (Playwright-core + Chromium headless, no commiteado).
Servidor: `http://localhost:4321` (ya corriendo, no reiniciado). Criterio de fallo: **cualquier**
`getBoundingClientRect().right - window.innerWidth > 0`, nunca la presencia de barra de scroll
(`body { overflow-x: hidden }` recorta en silencio).

## Resumen

| Pasada | Resultado |
|---|---|
| T010 — arnés de medición | Construido y ejecutado correctamente sobre `/about/` y `/contact/`. |
| T011.1 — matriz base (7 anchos × 2 temas × 2 páginas) | **FAIL** — nav recorta a 1248px en ambas páginas (ver hallazgo 1). Resto PASS. |
| T011.1 — `/contact/` a 360px sin text-spacing | **FAIL** — 14px de desborde silencioso, preexistente (ver hallazgo 3). |
| T011.2 — WCAG 1.4.12 text-spacing | **FAIL** — nav peor a 1248px; `/contact/` además desborda a 360/390px (ver hallazgos 1 y 4). `/about/` pasa a 360/390/1440. |
| T011.3 — foco de los 8 enlaces del nav a 1248/1440 | **PASS** — ningún enlace enfocado empuja `.nav-items` más allá de su posición en reposo. |
| T012 — hamburguesa, tabulación, área táctil | **PASS** — 8 enlaces + Instagram + toggle de tema alcanzables sin desborde ni foco tapado a 390×844; los 2 CTAs visibles (`Contacto`, `Instagram`) miden 46px de alto. |
| Color de cuerpo /about vs /contact | **PASS** — coinciden exactamente en los dos temas. |
| Árbol de encabezados + `lang` | **PASS**. |

**Veredicto de batch**: el arnés y la medición están completos (T010, T011, T012 hechos), pero el
**Checkpoint Fase 4 no pasa** — hay desbordes reales medidos (hallazgos 1, 3 y 4). Por contrato de
esta tarea, no se toca ningún fichero de `src/`; se reporta al orquestador.

---

## Hallazgo 1 — el nav recorta a 1248px (R1 confirmado, ambas páginas)

`.menu-footer` (iconos sociales + toggle de tema) se sale del viewport entre 1248px y ~1300px, en
`/about/` y en `/contact/` (nav compartido), en ambos temas:

| Ancho | `navItemsRight` | `menuFooterRight` | Veredicto |
|---|---|---|---|
| 1248 (78em, el breakpoint actual) | −78 (about) / −76 (contact) | **+52 (about) / +54 (contact)** | FAIL |
| 1260 | −90 | +40 | FAIL |
| 1280 | −110 | +20 | FAIL |
| 1300 | −130 | **0** | límite |
| 1320 | −150 | −20 | PASS |
| 1350 | −178 | −48 | PASS |
| 1400 | −200 | −48 | PASS |
| 1440 | −240 | −48 | PASS |
| 1920 | −520 | −48 | PASS |

`.nav-items` en sí no se desborda (siempre negativo), pero `.menu-footer` sí, entre 1248 y 1300px.
El octavo enlace ("Sobre mí") reduce el espacio disponible para `.nav-items` en el `flex` del nav,
y eso empuja `.menu-footer` fuera del viewport en ese rango — exactamente el riesgo que R1
predecía ("recorte entre 1248 y ~1400px"). `body { overflow-x: hidden }` lo esconde: no hay barra
de scroll ni salto visual evidente salvo que se mire con precisión de píxel o se mida.

**No corregido aquí** (T009 ya está marcado hecho y no es mi fichero en este batch): el ajuste
correcto, según el propio T009, es subir la constante del breakpoint —en `@media (min-width: 78em)`
del `<style>` **y** `matchMedia('(min-width: 78em)')` del `<script>` de `Nav.astro`, línea ~152—
a un valor ≥ 1300px (≈81.25em), y volver a medir la matriz entera.

## Hallazgo 2 — foco de los 8 enlaces del nav: sin recorte adicional

A 1248 y 1440, en claro y oscuro, se enfocó (`el.focus()`) cada uno de los 8 enlaces y se midió
`right` de `.nav-items`. Máximo valor observado: **−78** (ningún foco produjo un valor > 0). El
riesgo que T009 buscaba prevenir (peso 800 en `:focus` ensanchando el ítem) no se materializa,
porque T009 ya quitó ese `font-weight: 800` del estado de foco. El hallazgo 1 es independiente del
foco: ocurre en reposo.

## Hallazgo 3 — `/contact/` a 360px: 14px de desborde silencioso, preexistente

Sin ninguna hoja de text-spacing, con la página en su estado normal, a **360px exactos** (no a
390px ni más ancho):

```
.portrait  → right 374px vs innerWidth 360px → desborde 14px
.portrait img → igual
.panel → igual
```

Causa medida: `.contact` es `display: grid; grid-template-columns: 1fr`, y en CSS Grid el
`min-width` por defecto de un elemento de grid es `auto` (no `0`), así que la pista no se encoge
por debajo del contenido mínimo del `<img>` cuando su ratio intrínseco compite con `width: 100%` en
un contenedor angosto. Confirmado con la cadena de ancestros: `.portrait` mide 374px de ancho pese
a que `<main class="contact">` (su contenedor directo) mide 360px, sin márgenes ni padding entre
ambos.

**Es preexistente y no de este batch**: `/about/` a 360px **no** presenta este desborde (usa
`overflow-x: hidden` en `.portrait img` de forma distinta y no es un grid), y T004 no tocó
`.contact`/`.portrait` — solo `<CvDownloadLink />` y `baseRegion`. Se reporta porque la tarea
pide explícitamente medir `/contact/` como regresión y este es un desborde real, silencioso, que
nadie ha medido hasta ahora.

## Hallazgo 4 — WCAG 1.4.12 (text-spacing): `/contact/` desborda a 360 y 390px; `/about/` no

Con `letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important`
inyectado:

| Página | 360px | 390px | 1248px | 1440px |
|---|---|---|---|---|
| `/about/` | PASS (0 desbordes) | PASS (0 desbordes) | FAIL (nav, ver hallazgo 1, agravado) | PASS |
| `/contact/` | **FAIL** (hasta 85px en `.portrait`, 61px en `.panel`/`.eyebrow`/`.headline`/`.channels`/`.details`) | **FAIL** (hasta 55px / 31px, mismos elementos) | FAIL (nav, agravado) | PASS |

En `/about/` la columna es más generosa (`max-width: 34rem` a partir de 50em, sin grid ajustado en
móvil) y absorbe el espaciado extra sin desbordar en los dos anchos móviles. En `/contact/`, el
mismo `.contact { grid-template-columns: 1fr }` del hallazgo 3 amplifica el problema: con más
letter/word-spacing el contenido de texto (headline, eyebrow, `.channels`, `.details`) empuja el
`min-content` del grid item más allá del viewport.

A 1248px, con text-spacing, el nav empeora: `.nav-items` pasa a **+26/+28** (ya no solo
`.menu-footer`) y `.menu-footer` a **+156/+158** — coherente con el hallazgo 1, agravado por el
espaciado forzado.

## Hallazgo 5 (informativo, sin fallo) — CTAs, hamburguesa, color, encabezados

- **Altura de CTAs en `/about/`** (390px): `Contacto → ` = 46px, `Instagram (se abre en pestaña
  nueva)` = 46px. Ambos ≥ 44px. El tercer CTA (`Descargar CV`) no está en el DOM porque
  `profile.cvPath` es `undefined` — se medirá con el stub en T013 (fuera de este batch).
- **Hamburguesa a 390×844**: los 8 enlaces + Instagram + toggle de tema son alcanzables por `Tab`
  sin desborde horizontal; ningún elemento enfocado queda fuera del viewport vertical
  (`bottom` máximo observado 601px de 844px) — no se reproduce el riesgo de foco tapado bajo el
  panel (R13) a este tamaño, aunque R13 sigue abierto para #53 en general.
- **Titular a 360px**: `.headline` no desborda (`right` −24px respecto al viewport).
  `.bio p` mide 312px de ancho, dentro del viewport.
- **Color del cuerpo**: `.bio p` (`/about/`) vs `.lead` (`/contact/`) — claro `rgb(20, 25, 37)`,
  oscuro `rgb(243, 244, 247)`. Idénticos en ambos temas.
- **Árbol de encabezados**:
  - `/about/`: `H1 Luisa Benítez`, `H2 Servicios`, `H2 Publicaciones` — un solo `h1`, sin saltos.
  - `/contact/`: `H1 Hablemos` — sin cambios, regresión limpia.
- **`document.documentElement.lang`**: `es` en `/about/` y en `/contact/` (T005/C5 verificado).
- **`grep -rn "data/about" src | grep -v "pages/about.astro"`**: vacío (regla de importador único, OK).
- **`grep -n "\.link:focus[^-]" src/components/Nav.astro`**: vacío (todo es `:focus-visible`, OK).

## Evidencia visual

`.sdd/about-page/evidence/`:

- `about-390-light.png`, `about-390-dark.png`, `about-1440-light.png`, `about-1440-dark.png`
- `contact-390-light.png`, `contact-390-dark.png`, `contact-1440-light.png`, `contact-1440-dark.png`
- `about-390-light-menu-open.png`, `about-390-dark-menu-open.png` (hamburguesa abierta, 8 enlaces)

Todas full-page PNG, Chromium headless, sin retoque.

## Qué faltaba (cerrado en la re-verificación de más abajo)

- **T013** (stub de `cvPath`) y la pasada 4 de T011 (`.panel > *` perdido en `/contact` tras la
  extracción de `CvDownloadLink`) — dependían del stub temporal, batch I. **Cerrado.**
- **T014** (capturas de foco por elemento, revisión de accesibilidad de teclado detallada) — batch J. **Cerrado.**
- **Corrección del breakpoint del nav** (hallazgo 1) y el `min-width: 0` de `/contact/`
  (hallazgos 3 y 4) — llegaron como fixes entre sesiones. **Re-verificados abajo.**

---

# Re-verificación post-fix (2026-07-28) — matriz completa + T013 + T014

Dos fixes llegaron desde la última medición:

1. `src/components/Nav.astro` — breakpoint de escritorio subido de `78em` a `81.25em` (1300px),
   en el `@media` del `<style>` **y** en el `matchMedia` del `<script>` (línea ~153).
2. `src/pages/contact.astro` — `min-width: 0` añadido a `.portrait` y `.panel` (líneas ~127, 176).

Arnés: se reutiliza `{scratchpad}/measure-about.mjs`, ampliando `WIDTHS`, `TEXT_SPACING_WIDTHS` y
`NAV_FOCUS_WIDTHS` con **1300px** (el nuevo borde del breakpoint, `81.25em`), y los cortes de
pantalla con capturas a 1300px. Dos arneses nuevos, escritos para T013/T014:
`{scratchpad}/measure-t013.mjs` (CTA de CV con el stub, pasada 4 de T011) y
`{scratchpad}/measure-t014.mjs` (orden de tabulación real vía `Tab` de teclado — no `.focus()` — y
volcado de anillo de foco).

## Resumen

| Pasada | Resultado |
|---|---|
| Matriz base (8 anchos × 2 temas × 2 páginas, incluye 1300px) | **FAIL parcial** — `/contact/` desborda 1–2px a 1300px exactos (hallazgo 6, nuevo). `/about/` pasa en todos los anchos. El desborde de 360px de la tabla anterior (hallazgo 3) está **resuelto**. |
| Nav: recorte a 1248px (hallazgo 1 anterior) | **RESUELTO** — a 1248px `.menu-footer` ahora da `menuFooterRight ≤ 0` en ambas páginas y temas; el breakpoint subido a 1300px lo cubre. |
| WCAG 1.4.12 text-spacing (360/390/1248/1300/1440) | **FAIL** — a 1300px exactos, con el espaciado forzado, `.menu-footer` desborda 104–106px en ambas páginas y temas (hallazgo 7, nuevo — agravamiento del hallazgo 6). El desborde de `/contact/` a 360/390px de la tabla anterior (hallazgo 4) está **resuelto**: 0 desbordes. |
| Foco de los 8 enlaces del nav (1248/1300/1440) | **PASS** — 48/48 mediciones, ningún enlace enfocado empuja `.nav-items` fuera del viewport. |
| T012 — hamburguesa, área táctil | **PASS** (repetido, sin cambios respecto a la tabla anterior). |
| T013 — CTA de CV con stub | **PASS** con una nota — ver detalle abajo. Stub revertido y confirmado fuera del diff. |
| T014 — teclado, encabezados, idioma | **PASS** — ver detalle abajo. |

**Veredicto**: los dos fixes cierran los hallazgos 1, 3 y 4 de la tabla anterior. Aparece un
hallazgo nuevo, no cubierto por el checkpoint literal de Fase 4 (que no incluye 1300px en su
lista de anchos, escrita antes de que 1300 fuera relevante): un desborde real y medido, exacto en
el borde nuevo del breakpoint (1300px), en `/contact/` únicamente, agravado por text-spacing. T013
y T014 pasan sus propios criterios y se marcan `[X]` en `plan.md`. El hallazgo 6/7 se reporta al
orquestador sin corregir, por contrato de esta tarea.

## Hallazgo 6 (nuevo) — `/contact/` desborda 1–2px exactos en 1300px, `/about/` no

Con la matriz base (sin text-spacing), a 1300px exactos:

| Página | `menuFooterRight` | `navItemsWidth` |
|---|---|---|
| `/about/` | 0px | 850.03px |
| `/contact/` | **+2px** (light y dark) | 852.14px |

Barrido fino de ancho en `/contact/` (`menuFooterRight`):

| 1298 | 1299 | 1300 | 1301 | 1302 | 1305 | 1310 |
|---|---|---|---|---|---|---|
| −1298 | −1299 | **+2** | **+1** | 0 | −3 | −8 |

Causa: `.nav-items` es 2.1px más ancho en `/contact/` que en `/about/` a igual viewport. El nav es
un componente compartido; la diferencia viene del ítem con `aria-current="page"` — en `/contact/`
es "Contacto" (peso 800), en `/about/` es "Sobre mí" (peso 800) — y el ancho renderizado de esas
dos etiquetas en Bebas Neue difiere en ~2px por el kerning de las letras, no por ningún estilo
distinto entre páginas. El breakpoint deja **0px de margen** en `/about/` a 1300px exactos (por
diseño: es el punto de corte medido), así que cualquier página cuyo ítem actual sea 2px más ancho
desborda en esa franja de 2px de ancho de viewport (1300–1301px). Por encima de 1301px, pasa en
ambas páginas.

**No corregido aquí** (fuera de mi fichero en este batch; instrucción explícita de no arreglar).
El ajuste, si se decide hacerlo, es el mismo patrón que ya usó T009: subir la constante un paso
más (p. ej. a 82em/1312px) para dejar margen real en vez de 0px exactos, en los dos sitios
(`@media` y `matchMedia`) — y volver a medir la matriz entera.

## Hallazgo 7 (nuevo, agrava el 6) — WCAG 1.4.12 en 1300px: desborde grande en ambas páginas

Con `letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important`
inyectado, a 1300px exactos (único ancho de escritorio de la pasada de text-spacing que activa el
nav de fila — a 1248px el nav sigue en hamburguesa y no desborda):

| Página | `menuFooterRight` (claro/oscuro) |
|---|---|
| `/about/` | **+104px** |
| `/contact/` | **+106px** |

A 360/390/1440px, con el mismo text-spacing, ambas páginas dan 0 desbordes — el problema es
exclusivo del ancho 1300px, donde el hallazgo 6 ya deja 0–2px de margen en condiciones normales y
el espaciado forzado de 1.4.12 lo agota por completo. `.nav-items` en sí también entra en positivo
(+26/+28px), no solo `.menu-footer`.

**No corregido aquí**, mismo motivo que el hallazgo 6. Si se sube el breakpoint con margen real
(no en el punto de corte exacto medido), este hallazgo debería cerrarse junto con el 6 — pero eso
requiere volver a medir, no se puede asumir.

## T013 — CTA de CV con `cvPath` stubado (revertido)

Stub aplicado: `cvPath: { es: '/cv/test.pdf', en: '/cv/test.pdf' }`. Confirmado que ambas páginas
renderizan `<a class="cv" href="/cv/test.pdf">Descargar CV →</a>` y que, tras revertir con `Edit`
(no `git checkout`), `md5sum src/data/profile.ts` coincide exactamente con el hash previo al stub
y `git diff src/data/profile.ts` es idéntico al diff de línea base (`baseRegion`, `services`,
`featuredIn` — sin rastro del stub).

| | `/about/` | `/contact/` |
|---|---|---|
| Altura | **46px** (con `.ctas > :global(a) { padding-block: .5rem }`) | **30px** (sin ese padding: `<CvDownloadLink />` cuelga directo de `.panel`, no de un contenedor `.ctas`) |
| Tipografía | Bebas Neue, 20px, `letter-spacing: 1.6px`, mayúsculas | idéntica |
| Color (claro / oscuro) | `rgb(9,11,17)` / `rgb(255,255,255)` | idéntico en ambos temas — **C4 confirmado: ninguna regla huérfana** |
| Anillo de foco | `2px solid`, color por tema (`rgb(9,11,17)` claro / `rgb(255,255,255)` oscuro), `outline-offset: 3px` | idéntico |

**Nota, no achacable a este cambio**: la altura de 30px en `/contact/` está por debajo de 44px,
pero es el patrón preexistente de *toda* la columna de `/contact/` — el email (25px) y el enlace
de Instagram (25px) del mismo `.panel` miden lo mismo, sin relación con la extracción de
`CvDownloadLink`. El checkpoint de Fase 4 exige ≥44px solo para "los tres CTAs de `/about`"
(cumplido: 46/46/46px); no lo exige para `/contact/`. Se deja constancia porque la instrucción de
este batch pedía medir explícitamente ambas páginas.

**Pasada 4 de T011 — `.panel > *` perdido en `/contact/`** (con el stub activo): el `<a class="cv">`
del componente hijo mide `max-width: none` / `width: 134.56px` (ancho intrínseco), **no** recibe
`.panel > * { width: 100%; max-width: 34rem }` de `contact.astro` — confirma R5 del plan. Impacto
visual nulo, tal como preveía el riesgo: `align-self: flex-start` ya fijaba el enlace al ancho de
su contenido, así que perder el `width: 100%` no cambia lo que se ve, solo reduce el área de clic
a la derecha del texto (de hasta 544px a 135px). Documentado, no corregido — coincide con la
mitigación que el propio plan daba por aceptable.

## T014 — teclado, encabezados, idioma (con `Tab` de teclado real, no `.focus()`)

**Orden de tabulación**: a ≥81.25em (1350px, para evitar el borde de 1300 del hallazgo 6), el
orden real de `Tab` coincide exactamente, elemento a elemento, con el orden del DOM/visual:
logo → 8 enlaces del nav → icono social del nav → toggle de tema → CTA "Contacto" → CTA
"Instagram" (ambos de `/about/`) → Email del footer → Instagram del footer. 15 elementos
tabulables, orden monótono de lectura (arriba→abajo, izquierda→derecha dentro de la misma fila).
Verificado en claro y oscuro.

**Sin trampa de foco**: tras el 15º elemento, el siguiente `Tab` sale del contenido rastreable
(`document.activeElement` no capturable — probablemente la barra de Chrome) y el siguiente vuelve
a ciclar al primero (`site-title`). 15 elementos únicos antes de repetir, coincide con el total de
focusables del DOM — ciclo normal, no bloqueo.

**Anillo de foco**: los `.link` del nav y los `.cv` de `/about/` muestran el anillo propio
tokenizado (`outline: 2px solid`, color invertido por tema — `rgb(9,11,17)` claro,
`rgb(255,255,255)` oscuro), confirmado con `getComputedStyle` durante el foco real de teclado.
`site-title`, los iconos sociales y el toggle de tema muestran el anillo **por defecto del
navegador** (`outline: 1px auto`) — son de `Nav.astro`/`Footer.astro` fuera del alcance de C4/B2
(que solo tocan `.link` y los `.cv` de `about.astro`); no es una regresión de este batch.

**Árbol de encabezados**: `H1 Luisa Benítez`, `H2 Servicios`, `H2 Publicaciones` — un solo `h1`,
sin saltos de nivel.

**Idioma**: `document.documentElement.lang === 'es'` en `/about/` y en `/contact/`.

**Nombre accesible del `h1`**: texto "Luisa Benítez", `hasAttribute('aria-label') === false` — el
nombre accesible coincide con el texto visible (C1 respetado).

**Aviso de pestaña nueva**: el CTA de Instagram de `/about/` renderiza el texto
"Instagram  (se abre en una pestaña nueva) →" (confirmado en el volcado del DOM).

**Alt del retrato**: `about.portraitAlt` — "Luisa Benítez al aire libre, leyendo una revista de
moda".

**Roles de lista**: `.services[role=list]` con 5 `<li>`; `.wordmarks[role=list]` con 4 `<li>`.

## Evidencia visual (actualizada)

`.sdd/about-page/evidence/` — capturas nuevas de esta pasada:

- `about-1300-light.png`, `about-1300-dark.png` (el nuevo borde del breakpoint, full-page)
- `contact-1300-light.png`, `contact-1300-dark.png`
- `about-1350-light-nav-focus-last.png`, `about-1350-dark-nav-focus-last.png` (último enlace del
  nav enfocado por `Tab`, con el anillo propio visible)
- `about-1350-light-cta-focus.png`, `about-1350-dark-cta-focus.png` (CTA "Contacto" enfocado por
  `Tab`, con el anillo propio visible)

Capturas de la pasada anterior (`about-390-*`, `about-1440-*`, `contact-390-*`, `contact-1440-*`,
`about-390-*-menu-open.png`) se conservan sin cambios: nada de lo medido ahí varió.

## Checkpoint Fase 4 — estado final

Todos los bullets del checkpoint (anchos 360/390/800/1024/1248/1440/1920, sin 1300 en su lista
original) pasan y quedan `[X]` en `plan.md`, incluidos T013 y T014. El hallazgo nuevo (6/7) vive
**fuera** de esa lista literal de anchos — es el resultado de ampliar la matriz con 1300px por
instrucción explícita de este batch, no un incumplimiento del checkpoint tal como está escrito.
Se reporta al orquestador para que decida si el checkpoint debe ampliarse con 1300px de forma
permanente.

---

# Re-verificación post-fix 2 (2026-07-28) — breakpoint subido de 81.25em a 84em (1344px)

El hallazgo 6/7 de la pasada anterior (desborde de 1–2px en `/contact/` a 1300px exactos, agravado
a +104/+106px con text-spacing) motivó subir el breakpoint del nav de escritorio, con margen real
en vez de un punto de corte exacto. Cambio aplicado en `src/components/Nav.astro`: `81.25em` →
`84em` (1344px), en las **dos** ubicaciones que deben coincidir — el `@media` del `<style>` y el
`window.matchMedia(...)` del `<script>`. Sin tocar ningún otro fichero.

Arnés: se reutiliza `{scratchpad}/measure-about.mjs` (sin reescribir), con `WIDTHS` ampliado a
`[360, 390, 800, 1024, 1248, 1330, 1344, 1440, 1920]` — se añade 1344 (el nuevo borde) y 1330
(justo por debajo, para confirmar que el rango sigue sirviéndose con hamburguesa), y una pasada
nueva de verificación de toggle real de hamburguesa (click + `aria-expanded` + `hidden` del panel,
no solo presencia del botón) a 390 y 1330px.

## Resumen

| Check | Resultado |
|---|---|
| Matriz base (9 anchos × 2 temas × 2 páginas) | **PASS** — 0 desbordes en los 36 casos, incluidos 1330 y 1344. |
| `.menu-footer` en reposo a 1344px | **PASS** — `about`: −44px de margen; `contact`: −42px de margen. Confirma la cifra de "~44px de headroom" del comentario en el código (peor caso `/contact/`: 42px). |
| No overflow /contact a 360px (regresión hallazgo 3) | **PASS** — `navItemsRight`/`menuFooterRight` = −360, sin overflow. |
| No clip .menu-footer a 1248px (regresión hallazgo 1) | **PASS** — a 1248px el nav sigue en hamburguesa (breakpoint 1344 > 1248), sin recorte posible en ese ancho. |
| Foco de los 8 enlaces a 1344 y 1440, claro/oscuro | **PASS** — 32/32 mediciones; `navItemsRight` siempre negativo (−174 a 1344, −240 a 1440), ningún enlace enfocado empuja `.nav-items` fuera del viewport. |
| Toggle de hamburguesa a 390px | **PASS** — botón visible, `aria-expanded` false→true, panel `hidden` true→false tras click. Verificado en claro y oscuro. |
| Toggle de hamburguesa a 1330px (justo bajo el nuevo borde) | **PASS** — mismo comportamiento que a 390px: botón visible (fila completa NO se activa todavía, como se espera por debajo de 1344px), click abre el panel. Verificado en claro y oscuro. Esto es exactamente lo que confirma que el `@media` y el `matchMedia` siguen sincronizados: si hubieran divergido, a 1330px uno de los dos motores (CSS o JS) habría tratado el ancho como "escritorio" y el otro como "móvil", dejando el botón visible pero inerte o el panel de fila oculto sin alternativa. |
| WCAG 1.4.12 text-spacing, 360/390/1248/1440px | **PASS** — 0 desbordes en los cuatro anchos, ambas páginas, ambos temas. |
| WCAG 1.4.12 text-spacing, **1344px** (el nuevo borde) | **FAIL, aceptado** — `menuFooterRight` = +60px (about) / +62px (contact) en ambos temas; `navItemsRight` también entra en positivo (−70/−68, es decir ya no hay margen suficiente). Ver nota de aceptación abajo. |
| `pnpm build` | **PASS** — 40 páginas, sin errores. |

## Detalle — WCAG 1.4.12 a 1344px (franja aceptada, issue #53)

Con `letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important`
inyectado sobre `*`, a 1344px exactos (el único ancho de escritorio de la pasada de text-spacing
que activa el nav de fila — a 1248px sigue en hamburguesa):

| Página | `navItemsRight` | `menuFooterRight` |
|---|---|---|
| `/about/` | −70 | **+60** |
| `/contact/` | −68 | **+62** |

Es la misma franja de fallo que ya existía en 81.25em (allí +104/+106px), solo que más estrecha
porque el breakpoint ahora tiene 44px de margen en el estado base en vez de 0. El espaciado de
texto forzado por 1.4.12 sigue consumiendo ese margen entero y desbordando. Subir el breakpoint
más no lo cierra de raíz — solo desplaza el punto exacto en el que el peor caso de espaciado de
texto vuelve a desbordar; cerrar el problema de fondo requiere una fila de navegación que
comprima o envuelva en vez de desbordar, que es precisamente lo que la issue #53 tiene por
alcance (rediseño del nav).

**Esto es un deviation aceptado por David, no un descuido**: la instrucción de esta tarea fija el
valor en 84em basándose en el margen medido en estado normal (headroom, no en el peor caso con
accesibilidad de espaciado de texto forzada), y documenta explícitamente que la banda estrecha de
fallo de 1.4.12 queda fuera de este cambio y vive bajo la issue #53, que es dueña del rediseño del
nav. No se amplía el checkpoint de Fase 4 con una obligación de "0 desbordes bajo text-spacing en
todos los anchos de escritorio" porque eso exigiría el rediseño, no un ajuste de constante.

## Evidencia visual (actualizada, reemplaza las capturas de 1300px)

`.sdd/about-page/evidence/` — capturas de esta pasada:

- `about-1344-light.png`, `about-1344-dark.png` (el nuevo borde del breakpoint, full-page)
- `contact-1344-light.png`, `contact-1344-dark.png`

Las capturas `about-1300-*.png` / `contact-1300-*.png` de la pasada anterior se **eliminaron**:
ya no representan el borde real del breakpoint. El resto de capturas (`about-390-*`,
`about-1440-*`, `contact-390-*`, `contact-1440-*`, `about-390-*-menu-open.png`,
`about-1350-*-nav-focus-last.png`, `about-1350-*-cta-focus.png`) se conserva sin cambios: nada de
lo medido ahí varía con este ajuste (1350px sigue estando por encima de 1344px, así que el estado
de fila completa que capturan sigue siendo representativo).

## Checkpoint — estado final

Todos los checks explícitos de esta tarea (matriz de 8 anchos con foco en 1344 y 1330, ambos
temas, ambas páginas; foco de los 8 enlaces a 1344/1440; toggle de hamburguesa a 390 y 1330;
regresiones de 360px y 1248px; `pnpm build`) pasan. La única excepción, medida y documentada
arriba, es el WCAG 1.4.12 en la franja estrecha alrededor de 1344px — deviation conocida y
aceptada por David, con seguimiento en issue #53 (dueña del rediseño del nav), no un fallo de
este cambio.

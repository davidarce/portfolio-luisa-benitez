# Plan de implementación: Visor de galería (modo carril)

**Feature ID**: visor-galeria
**Status**: ✅ Complete (revisión 2 — decisiones del usuario + asesoría ronda 1 integradas)
**Created**: 2026-07-31
**Goal**: Añadir un segundo modo de lectura a las fichas de proyecto — un visor a pantalla completa con carril horizontal entre fotos y vídeos — sin subir de escala ninguna imagen, sin dependencias nuevas y sin romper el ClientRouter ni los vídeos del grid.

---

## 1. Overview

Hoy la ficha de proyecto tiene un único modo: el grid. Cada ítem se recorta a `aspect-ratio: 3/4` con `object-fit: cover`, así que **el visitante nunca ve el encuadre completo de la foto**. Ese recorte es la razón de fondo por la que se pide el visor: no es sólo "más grande", es "sin recortar".

Se añade un segundo modo. Al pulsar cualquier ítem del grid se abre un `<dialog>` modal a pantalla completa con un **carril horizontal** que contiene todos los ítems del proyecto — fotos y vídeos — en el orden que ya produce `src/loaders/gallery-loader.ts` (orden natural por nombre de fichero, vídeos incluidos). El grid se queda exactamente como está.

Tres decisiones vertebran el diseño y conviene entenderlas antes de tocar código:

**1. El carril es un scroller nativo con `scroll-snap`, no un carrusel con JS de arrastre.** Un `overflow-x: auto` + `scroll-snap-type: x mandatory` da deslizamiento con inercia nativo en iOS, teclado gratis y — lo importante — **no pelea con el gesto de volver atrás de Safari**, porque no hay ningún `preventDefault` sobre `touchmove`. El JS no mueve el carril con los dedos: sólo lo posiciona al abrir y responde a las flechas.

**2. Nunca se escala hacia arriba, y se consigue sin JS.** Medido en este repo: 279 imágenes de galería, mediana 1179 px de ancho, **máximo 2048**, el 58 % por debajo de 1200 px. Los 34 vídeos son casi todos 608×1080. A 1440 px de escritorio, mostrar una foto de 1179 px a lo ancho de la pantalla es interpolar. La regla se implementa con CSS puro:

```css
max-width: 100%; max-height: 100%; width: auto; height: auto;
```

Un `<img>` con `width: auto` se pinta a su **tamaño intrínseco** y sólo encoge cuando no cabe. En móvil (390 px CSS) una foto de 1179 px se reduce — a DPR 3 pide 1170 px de dispositivo de una fuente de 1179: exacto. En escritorio se queda en 1179 px CSS y aparecen bandas laterales. Eso es lo correcto, no un defecto a corregir.

**3. El `<dialog>` nativo hace casi toda la accesibilidad.** `showModal()` da trampa de foco, Escape, `inert` sobre el fondo y capa superior (inmune a `z-index`) sin escribir una línea. Lo único que queda a mano es el bloqueo de scroll, el anuncio de posición y la limpieza en `astro:before-swap`.

**Coste en JS**: ~120 líneas sin minificar, sin dependencias. El sitio entero envía hoy 15,3 KB (sólo el ClientRouter); esto suma ~3 KB. `medium-zoom` (5–7 KB) haría zoom in-place sobre una imagen — no es un carril — y además haría exactamente lo que el punto 2 prohíbe: agrandar por encima del natural. Se descarta.

**4. Quitar `controls` del grid abre una deuda de conformidad que hay que pagar en el mismo cambio.** Los vídeos del grid autorreproducen por IntersectionObserver, van en `loop` y no paran nunca. Hoy `controls` es el **único** mecanismo de pausa, y es lo que hace que el sitio cumpla **WCAG 2.2.2 Pause, Stop, Hide (nivel A)**. Quitarlo sin más degradaría un criterio de nivel A que hoy se cumple. El usuario acepta la retirada **a condición** de que el cambio incluya la mitigación: un único control «Pausar los vídeos» en la cabecera de la galería que pausa todos los `.gallery-item video` y desconecta sus observadores (T020, ~8 líneas). Con eso el criterio se sigue cumpliendo con un control mejor que antes: uno solo para toda la galería en lugar de N barras nativas.

**No objetivo explícito — la lupa y el doble tap.** No se implementa zoom propio. En móvil la imagen ya se sirve a resolución de dispositivo exacta: ampliar más sólo enseñaría interpolación. La ganancia real de "ver los detalles" viene de quitar el recorte 3/4, no de ampliar píxeles que no existen.

**PROHIBICIÓN, y no es un detalle de estilo.** Dentro del visor está **terminantemente prohibido** usar `touch-action` restrictivo (`pan-x`, `none`) o `user-scalable=no`. Es el "arreglo" que alguien intentará el día que el arrastre vertical se sienta raro, y mata el pinch-zoom nativo del navegador — que es la única ampliación disponible para una persona con baja visión. Sin él se rompe **1.4.4 Resize Text (AA)**. Queda escrito aquí, en la tarea T006 y como comentario en el CSS.

## 2. Architecture Analysis

### Data Model / Type Definitions

<!--
Document new types, modified types, and their relationships.
For each type: name, fields with types, purpose, and which layer it belongs to.
Use code blocks in the project's language for type signatures.
-->

No hay modelo de dominio nuevo: la fuente de datos ya existe y no se toca. `src/loaders/gallery-loader.ts:65-71` genera `images: string[]` con **fotos y vídeos mezclados**, ordenados con `localeCompare(..., { numeric: true })`. Ese array es, literalmente, el orden del carril. No hay que reordenar, filtrar ni separar nada.

Se introduce un único tipo nuevo, de **tiempo de compilación** (nunca llega al cliente):

```ts
// src/lib/mediaDimensions.ts
export interface MediaSize {
	width: number;
	height: number;
}

/**
 * `publicPath` es la ruta tal cual viene del loader: "/assets/runway/…/1.webp".
 * Para vídeos se leen las dimensiones del PÓSTER (mismo encuadre, mismo ratio),
 * porque sacar metadatos de un .mp4 exigiría ffprobe en el build.
 * Devuelve null si el fichero no existe o no se puede leer: nunca rompe el build.
 */
export async function getMediaSize(publicPath: string): Promise<MediaSize | null>;
```

**Por qué hace falta.** Un `<video preload="none">` no tiene tamaño intrínseco hasta que carga metadatos: el navegador lo pinta a 300×150 y el póster sale deformado. Con los atributos `width`/`height` puestos en el HTML, el ratio se conoce desde el primer frame y la regla de no-upscale del punto 2 funciona igual para vídeo que para foto. Para las imágenes el atributo no es imprescindible (el navegador sabe el tamaño natural al cargar) pero evita que la diapositiva salte de 0 px a su tamaño final mientras carga.

**Coste**: `sharp` ya es `devDependency` y `metadata()` sólo lee cabeceras. Con una `Map` a nivel de módulo cada fichero se lee una vez por build (279 imágenes + 34 pósters ≈ 0,5 s sobre un build que ya genera 115 páginas).

### Data Flow

<!--
Show how data moves through the system for the key operations this feature introduces.
Use ASCII diagrams, numbered step lists, or both.
-->

```text
BUILD (Node)
  gallery-loader.ts → entry.data.images: string[]  (fotos + vídeos, orden natural)
        │
        ├─→ ProjectDetail.astro ── Grid ──→ <li><button class="gallery-item" data-viewer-index="i">
        │                                        <img|video>  (grid: SIN CAMBIOS de estilo)
        │
        └─→ GalleryViewer.astro ── por cada ítem ──→ getMediaSize(path) ──→ width/height
                                                 └─→ <dialog><ul class="viewer-rail" role="list">
                                                        <li class="viewer-slide"> × N

RUNTIME (navegador)
  click en .gallery-item
        │  index = Number(btn.dataset.viewerIndex)
        ├─ pausar todos los ".gallery-item video"      ← si no, siguen sonando/gastando detrás
        ├─ rail.scrollTo({ left: index * rail.clientWidth, behavior: "instant" })
        ├─ documentElement.classList.add("viewer-open")  ← bloqueo de scroll de fondo
        ├─ paint()                                       ← contador ANTES de showModal()
        └─ dialog.showModal()                            ← foco atrapado + Escape + top layer
                                                            (autofocus → el carril)

  scroll del carril (dedo, flechas, botones prev/next)
        │
        └─ IntersectionObserver(root: rail, threshold: 0.6)
                 ├─ slide activa  → counter.textContent = "3 de 12"   (visible, aria-hidden)
                 ├─ slide activa  → si es vídeo y !reducedMotion → video.play()
                 └─ slides salientes → video.pause()

  scrollend  (o 200 ms sin scroll, respaldo para iOS < 17.4)
        └─ announcer.textContent = counter.textContent    ← role="status": UN anuncio por gesto

  cerrar (Escape o botón ✕ — el clic en el fondo NO se implementa: el carril llena el diálogo)
        ├─ dialog.close()                    → el navegador devuelve el foco al botón que abrió
        ├─ documentElement.classList.remove("viewer-open")
        ├─ pausar los vídeos del visor
        └─ reanudar los vídeos del grid que estén en viewport (si !reducedMotion)

  astro:before-swap  (navegación con ClientRouter)
        └─ dialog.close() + quitar "viewer-open" de <html>
           ↑ CRÍTICO: <html> NO se reemplaza en el swap. Si la clase se queda,
             la página siguiente aparece sin poder hacer scroll.
```

**Los dos observadores no compiten.** El observador del grid (`ProjectDetail.astro:112`) selecciona `.gallery-item video`; el del visor selecciona `.viewer-slide video`. Son elementos `<video>` distintos, renderizados en servidor los dos, con selectores disjuntos. Se descartó **clonar** el nodo del grid (`cloneNode`) porque el clon pierde el estado de reproducción y obliga a reinsertar/retirar nodos en cada apertura; y se descartó **mover** el nodo original porque al volver al grid habría que restaurarlo en su posición exacta y el observador original quedaría apuntando a un elemento desconectado. Duplicar el markup cuesta ~120 bytes por ítem y elimina las dos clases de bug.

### Contract Specifications

<!--
MANDATORY for any plan that introduces or modifies types, interfaces, or data schemas.
List every new or changed contract the implementer needs to know about:
- New interfaces/ports with method signatures
- Modified function signatures (before → after)
- New data schemas (request/response DTOs, database entities, event payloads)
- Configuration shapes (YAML keys, env vars, JSON structures)

Use code blocks with exact signatures. The implementer will copy these directly.
-->

### C1 — `src/lib/mediaDimensions.ts` (nuevo, sólo build)

```ts
import sharp from "sharp";
import path from "node:path";

export interface MediaSize { width: number; height: number }

const VIDEO_RE = /\.(mp4|webm|mov)$/i;
const cache = new Map<string, MediaSize | null>();

export function posterPath(publicPath: string): string;   // "/a/b/v1.mp4" → "/a/b/posters/v1.webp"
export async function getMediaSize(publicPath: string): Promise<MediaSize | null>;
```

`posterPath` debe usar **exactamente** la misma sustitución que ya está en `ProjectDetail.astro:73-76`, `.replace(/\/([^/]+)\.(mp4|webm|mov)$/i, "/posters/$1.webp")`. Esa expresión pasa a vivir aquí y `ProjectDetail.astro` la importa: hoy la regla vive en un sitio, no en dos.

Resolución en disco: `path.join(process.cwd(), "public", publicPath)`.

### C2 — Props de `src/components/GalleryViewer.astro` (nuevo)

```ts
interface Props {
	images: string[];   // entry.data.images, tal cual, sin filtrar
	title: string;      // entry.data.title — base de los alt
	locale: Locale;
}
```

### C3 — Claves i18n nuevas (`src/i18n/es.ts`, luego `en.ts`)

`es.ts` es la fuente de la forma; el tipo `Translation` obliga a que `en.ts` tenga las mismas claves.

```ts
viewer: {
	/** Nombre accesible del <dialog>. */
	label: 'Visor de galería',
	/** Nombre accesible del carril. DEBE ser distinto de `label`: con el mismo
	    texto en los dos, VoiceOver lo lee dos veces seguidas al entrar. */
	rail: 'Fotos y vídeos del proyecto',
	close: 'Cerrar el visor',
	previous: 'Anterior',
	next: 'Siguiente',
	/** Se rellena en el cliente: {current} y {total}. */
	position: '{current} de {total}',
	/** Nombre accesible del botón del grid. {n} y {total} se sustituyen en servidor. */
	openImage: 'Ampliar la imagen {n} de {total}',
	openVideo: 'Ampliar el vídeo {n} de {total}',
	/** Texto alternativo por ítem. {n}, {total} y {title} se sustituyen en servidor.
	    Sustituye al alt repetido: doce imágenes con el mismo nombre son indistinguibles. */
	altImage: 'Imagen {n} de {total}: {title}',
	altVideo: 'Vídeo {n} de {total}: {title}',
	/** Mitigación de WCAG 2.2.2 tras quitar `controls` del grid. Dos estados. */
	pauseVideos: 'Pausar los vídeos',
	playVideos: 'Reanudar los vídeos',
},
```

`en.ts`: `'Gallery viewer'`, `'Project photos and videos'`, `'Close the viewer'`, `'Previous'`, `'Next'`, `'{current} of {total}'`, `'Expand image {n} of {total}'`, `'Expand video {n} of {total}'`, `'Image {n} of {total}: {title}'`, `'Video {n} of {total}: {title}'`, `'Pause the videos'`, `'Resume the videos'`.

**Por qué `altImage` / `altVideo` existen.** Hoy `ProjectDetail.astro:86` pone `alt={entry.data.title}` en las doce imágenes de la ficha: un lector de pantalla anuncia doce elementos con nombre idéntico y no hay forma de distinguirlos ni de referirse a uno (debilidad de **1.1.1**, heredada, no introducida por este cambio). Se corrige en el grid y en el visor a la vez, porque el bloque se está tocando de todas formas. La variante de vídeo se usa además como `aria-label` del `<video>`: un `<video controls>` sin nombre accesible se anuncia como «reproductor multimedia» (**4.1.2**), y como son clips **sin audio** hace falta una alternativa textual (**1.2.1**, nivel A).

### C4 — Contrato DOM entre markup y script

El `<script>` de Astro no ve el frontmatter. Las cadenas traducidas viajan por atributos `data-`:

| Atributo / clase | En | Consumido por |
|---|---|---|
| `data-viewer-index="0"` | `button.gallery-open` | apertura: índice de arranque |
| `data-gallery-viewer` | `dialog` | `querySelector` raíz |
| `data-position-template` | `dialog` | plantilla `'{current} de {total}'` |
| `.viewer-rail` | `ul[role="list"]` scroller | scroll, observador, foco inicial |
| `.viewer-slide` | `li` × N | observador de posición |
| `.viewer-counter` | `p[aria-hidden="true"]` | contador **visible**, se repinta en cada intersección |
| `.viewer-announcer` | `p.sr-only[role="status"]` | anuncio **sólo al detenerse** el scroll |
| `.viewer-prev` / `.viewer-next` / `.viewer-close` | `button` | navegación y cierre |
| `.viewer-open` | clase en `<html>` | bloqueo de scroll de fondo |
| `[data-pause-videos]` | `button` en la cabecera de la galería | pausa global de los vídeos del grid |
| `data-label-pause` / `data-label-play` | `button[data-pause-videos]` | las dos etiquetas traducidas del control |

**Contador visible ≠ anunciador.** Son dos elementos porque tienen dos frecuencias. El visible se actualiza en cada intersección (el usuario tiene que ver «5 de 12» mientras arrastra); el anunciador sólo escribe cuando el carril se para, para que un deslizamiento de seis diapositivas produzca **un** anuncio y no seis. `aria-atomic` no sirve para esto: controla *qué* se lee, no *cuántas veces*.

### Before/After Analysis

<!--
MANDATORY for any task that MODIFIES existing code/config (as opposed to creating new files).
For each modified component, show:
- **Before**: Current state (relevant code snippet, config block, or structure)
- **After**: Proposed state with changes highlighted
- **Why**: Rationale for the change

This prevents the implementer from having to reverse-engineer the current state.
-->

### B/A 1 — Ítem del grid: `ProjectDetail.astro:64-95`

**Antes** — el ítem no es interactivo; el vídeo lleva `controls`:

```astro
<li class="gallery-item">
  {isVideo ? (
    <video src={`${img}#t=1`} poster={…} loop muted playsinline controls preload="none" />
  ) : (
    <img src={img} alt={entry.data.title} loading={i===0?"eager":"lazy"} … />
  )}
</li>
```

**Después** — un `<button>` real envuelve el medio; el vídeo del grid **pierde `controls`**:

```astro
<li class="gallery-item">
  <button type="button" class="gallery-open" data-viewer-index={i}
          aria-label={fill(isVideo ? t.viewer.openVideo : t.viewer.openImage, i)}>
    {isVideo ? (
      <video src={`${img}#t=1`} poster={posterPath(img)}
             aria-label={fill(t.viewer.altVideo, i)}
             loop muted playsinline preload="none" />
    ) : (
      <img src={img} alt={fill(t.viewer.altImage, i)} loading={i===0?"eager":"lazy"} … />
    )}
  </button>
</li>
```

donde `fill` es un ayudante local del frontmatter, no un módulo nuevo:

```ts
const total = entry.data.images.length;
const fill = (tpl: string, i: number) =>
	tpl.replace("{n}", String(i + 1))
	   .replace("{total}", String(total))
	   .replace("{title}", entry.data.title);
```

**El `alt` también cambia aquí, no sólo en el visor.** `alt={entry.data.title}` repetido doce veces deja doce imágenes con nombre idéntico. Se arregla en el mismo bloque que ya se está reescribiendo.

**Por qué quitar `controls` del grid**: con `controls`, un toque sobre el vídeo lo consume la barra nativa y **el visor nunca se abriría** desde un vídeo — requisito 2 muerto. Los vídeos del grid son `muted loop` y se reproducen solos por el IntersectionObserver: los controles no aportaban nada ahí. En el visor sí los llevan, que es donde tiene sentido pausar o buscar.

**Riesgo asumido y aceptado**: renderizar el `<button>` en servidor significa que sin JS queda un control inerte. El sitio ya depende de JS para el tema y las transiciones; la alternativa (promocionar el `<li>` a `role="button"` desde JS) da peor accesibilidad para el 99,9 % que sí tiene JS.

El CSS del `.gallery-item` **no cambia**. Hay que neutralizar los estilos de UA del botón para que el aspecto del grid sea idéntico:

```css
.gallery-open { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
.gallery-open:focus-visible { outline: 2px solid var(--gray-0); outline-offset: 3px; }
```

### B/A 2 — Script de `ProjectDetail.astro:103-129`

**Antes**: `astro:page-load` → un `IntersectionObserver` por vídeo, creado dentro del `forEach` y sin referencia guardada. No hay forma de pararlos.

**Después**: mismo comportamiento, pero los observadores se acumulan en un array para que el control de pausa pueda desconectarlos. Sin esto, pulsar «Pausar» pausa los vídeos y el observador los vuelve a arrancar en el siguiente scroll — el control sería decorativo.

```ts
const observers: IntersectionObserver[] = [];
// … dentro del forEach: observers.push(observer);
```

El selector del observador del visor (`.viewer-slide video`) es disjunto del del grid (`.gallery-item video`): no compiten.

### B/A 5 — Control «Pausar los vídeos» (nuevo, cabecera de la galería)

**Antes**: no existe. Cada `<video controls>` del grid trae su propia barra nativa; ese es hoy el mecanismo de pausa que satisface **WCAG 2.2.2 (A)**.

**Después**: T017 quita `controls`, así que hace falta sustituto. Un único botón sobre el `<Grid>`, renderizado sólo si la ficha tiene al menos un vídeo:

```astro
{hasVideo && (
  <button type="button" data-pause-videos
          data-label-pause={t.viewer.pauseVideos}
          data-label-play={t.viewer.playVideos}>{t.viewer.pauseVideos}</button>
)}
```

```ts
pauseBtn?.addEventListener("click", () => {
	const paused = pauseBtn.dataset.state === "paused";
	if (paused) { rebuildObservers(); }
	else { observers.forEach(o => o.disconnect()); observers.length = 0; videos.forEach(v => v.pause()); }
	pauseBtn.dataset.state = paused ? "" : "paused";
	pauseBtn.textContent = paused ? pauseBtn.dataset.labelPause! : pauseBtn.dataset.labelPlay!;
});
```

**Por qué desconectar y no sólo pausar**: el observador vuelve a llamar a `play()` en cuanto el usuario mueve la página. Pausar sin desconectar da un control que "no funciona" a los tres segundos.

**Por qué un único control y no uno por vídeo**: 2.2.2 pide *un* mecanismo para detener el contenido en movimiento, no uno por elemento; y un botón por celda destrozaría el grid de portafolio.

### B/A 3 — Vídeos del visor vs. vídeos del grid

| | Grid (hoy y después) | Visor (nuevo) |
|---|---|---|
| `preload` | `none` | `none` (el póster ya se ve; el `<video>` tiene `width`/`height`) |
| `controls` | **se quita** | **sí** |
| `loop muted playsinline` | sí | sí (`playsinline` obligatorio: sin él iOS abre su reproductor a pantalla completa y se pierde el carril) |
| reproducción | IntersectionObserver del grid | IntersectionObserver del carril |

### B/A 4 — `<html>` y el bloqueo de scroll

**Antes**: `html, body { min-height: 100%; overflow-x: hidden; }` (`BaseLayout.astro:291-295`).
**Después**: igual, más una regla global nueva en `GalleryViewer.astro` (`<style is:global>`, porque la clase va en `<html>`, fuera del ámbito del componente):

```css
html.viewer-open { overflow: hidden; }
```

**Por qué global y por qué en `<html>`**: `body { overflow: hidden }` no siempre frena el scroll en iOS. Y precisamente porque `<html>` sobrevive al swap del ClientRouter, el `astro:before-swap` **tiene que** quitar la clase.

## Team Selection

<!--
Advisor skills identified during planning. These are NOT invoked by sdd-plan directly.
If guidance is needed, sdd-plan returns a guidance_requested envelope listing these skills.
The orchestrator then launches each advisor, collects guidance, and re-enters sdd-plan
with the recommendations. See SKILL.md steps 5, 7, and 8 for the full flow.
-->

| Skill | Motivo |
|-------|--------|
| `web-accessibility-advisor` | Es el núcleo del riesgo. El plan apoya la trampa de foco, Escape y la devolución del foco en el `<dialog>` nativo (T012), y añade a mano el anuncio de posición con `aria-live` (T015), el nombre accesible de los botones del grid (T018) y un scroller con `tabindex="0"`. Debía revisar la trampa de foco, el anuncio de posición, la semántica de las diapositivas y la inercia del fondo. **Consultado en la ronda 1; todas sus conclusiones están integradas** (ver *Advice Received*), incluida la que reabrió la decisión 2 del usuario: quitar `controls` degrada WCAG 2.2.2 y exige la mitigación de T020. |
| `frontend-test-advisor` | El requisito de evidencia (T021-T024) se cubre con un script de Chromium headless contra `dist/`. Debe revisar la Fase 6: qué asertar exactamente sobre el visor sin introducir un runner de tests (el proyecto no tiene ninguno y el plan prohíbe dependencias no justificadas), y si conviene dejar el script versionado en `scripts/` o desechable en el scratchpad. |

**Descartes justificados** (regla de cobertura de asesores):

- `architect-advisor` — su dominio declarado es *«Clean architecture patterns: hexagonal, DDD, ports and adapters, layered design»*. Este cambio no introduce dominio, casos de uso ni adaptadores: es un componente de presentación de un sitio estático más un ayudante de build que lee cabeceras de fichero. No hay capas que separar ni dependencias que invertir.
- `component-advisor` — su dominio declarado es *«React component design patterns — composition, hooks, state management, performance»*. No hay React en el proyecto: `package.json` no tiene ninguna dependencia de React y el visor es un `.astro` con un `<script>` de DOM plano. Los `hooks` y el `state management` que describe no tienen equivalente aquí.
- `unit-test-advisor` — su dominio declarado es *«Domain unit test patterns: test structure, mocking strategies, test data builders, Given-When-Then»*. La única función pura testeable sería `posterPath()`; el proyecto no tiene runner de tests unitarios y añadir uno para una expresión regular contradice la restricción A del encargo.

## Advice Received

<!--
Advisor recommendations integrated into the plan. This section is populated during
Guidance Integration re-entry (step 8) — after the orchestrator collects advisor
outputs and re-launches sdd-plan with a GUIDANCE block.
For each advisor: document what was integrated and what was skipped (with rationale).
-->

### Ronda 1 — `web-accessibility-advisor`

**Integrado (todo):**

| Recomendación | Dónde queda |
|---|---|
| Quitar `controls` del grid degrada **2.2.2 Pause, Stop, Hide (A)**, que hoy se cumple. Exige mitigación. | Overview punto 4, B/A 5, **T020** (nuevo), R5 reclasificado a riesgo de conformidad |
| `role="group"` sobre un `<figure>` es ARIA dañino (pisa `role="figure"`). Mejor un `<ul role="list">` con `<li>`. | **T005** — las diapositivas son `<li>`, sin `<figure>` y sin ARIA; `role="list"` explícito porque Safari lo pierde con `list-style: none` |
| `alt={title}` repetido en las doce imágenes (1.1.1); arreglarlo también en el grid; usar la variante de vídeo como `aria-label` del `<video>` (4.1.2 + 1.2.1). | C3 (`altImage`/`altVideo`), B/A 1, **T005**, **T016** |
| `aria-live` en el contador **sí** satura VoiceOver; `aria-atomic` y `threshold` no lo arreglan. Separar contador visible de anunciador `role="status"` disparado por `scrollend` con respaldo de ~200 ms. | C4, **T014** |
| Indicador de foco visible en el carril, con `outline-offset` **negativo** (el `overflow: hidden` del diálogo recorta uno positivo). | **T009** |
| El manejador de flechas choca con los controles nativos del `<video>`. Ignorar si `e.defaultPrevented` o si el objetivo está dentro de un `<video>`. Añadir `Home`/`End`. | **T012** |
| `disabled` en los extremos roba el foco. Usar `aria-disabled` + manejador inerte. | **T012** |
| `autofocus` en el carril en lugar de fiarse de los pasos de enfoque del diálogo (inconsistentes en Safari). | **T005**, **T011** |
| Rellenar el contador **antes** de `showModal()`. | **T011** |
| `overscroll-behavior: contain` en el `<dialog>` y en los dos ejes. | **T006** |
| Prohibición explícita de `touch-action` restrictivo y `user-scalable=no` (1.4.4 AA). | Overview, **T006** (comentario en el CSS) |
| Fondo sólido/degradado en `.viewer-bar` (1.4.3 / 1.4.11) y objetivos ≥ 44×44. | **T009** |
| Nombres accesibles **distintos** para el diálogo y el carril. | C3 (`label` vs `rail`) |
| `aria-hidden="true"` + `focusable="false"` en los iconos. | **T005** |
| El cierre por clic en el fondo es prácticamente inalcanzable (el carril llena el diálogo). | Retirado del checkpoint de la Fase 4 y de T013; Escape y ✕ ya cubren 2.1.1/2.1.2 |
| Cuatro puntos más en la checklist de iPhone (VoiceOver no alcanza el fondo, un anuncio por gesto, pinch-zoom vivo, foco visible con teclado Bluetooth). | **T027** |

**No integrado**: nada.

### Ronda 1 — `frontend-test-advisor`

**Integrado (todo):**

| Recomendación | Dónde queda |
|---|---|
| `css <= natural` es **vacua**: pasa a 390/768 por construcción, pasa por accidente a 1440 y pasa con `0 <= 0`. Sustituir por la predicción exacta del ajuste *contain* contra la **caja de contenido** de la diapositiva, con igualdad ±1 px, en **todas** las diapositivas y anchos. | **T023** |
| Bloque de precondiciones que **aborta** (200, `:modal`, recuento de diapositivas, `naturalWidth` distinto de cero). | **T022** |
| `process.exit(1)` ante cualquier fallo; el JSON es evidencia, el código de salida es la verificación. | **T022** |
| El barrido de desbordamiento debe limitarse a la diapositiva **activa** + la barra: las de fuera de pantalla están fuera del viewport por diseño. | **T023**, checkpoint Fase 6 corregido |
| Aserción de *letterbox* a 1440 como segundo testigo independiente. | **T023** |
| Automatizar lo que estaba como casillas manuales: apertura en índice, contador, extremos, foco al cerrar, 15×Tab, `history.length`. | **T024** |
| La regresión R1 (clase `viewer-open` tras `astro:after-swap`) como escenario automático. | **T024** |
| Dimensiones de vídeo asertadas (enteros, ratio ±1 %, explícitamente no 300×150) — única defensa automática de R7. | **T023** |
| Verificar que el tema **se aplicó** antes de cada captura, si no se envían 4 PNG duplicados en silencio. | **T026** |
| Sustituir esperas fijas por `waitForFunction` sobre `scrollLeft` estable en dos *frames*. | **T022** |
| Versionar como `scripts/verify-viewer.mjs` + `verify:viewer` en `package.json`, autoprotegido (`exit(2)`), slug por `argv[2]`. | **T022** |
| Sustituir el grep de «115 page(s) built» por `find dist -name '*.html' \| wc -l` contra una línea base. | **T025** |
| Medir a DPR 1, capturar a 390 con DPR 3, registrar el DPR usado. | **T022**, **T026** |

**No integrado**: nada.

## 3. Implementation Tasks


## Fase 1: Cadenas i18n

**Propósito**: dejar disponibles las cadenas antes de que ningún markup las use. `es.ts` define la forma; el tipo `Translation` hace que `en.ts` falle en compilación si falta una clave.

- [X] T001 Añadir el bloque `viewer` al diccionario español — src/i18n/es.ts

**Details for T001**: insertar la clave `viewer` **después de `common`** y antes de `collections`, con el contenido exacto del contrato C3 — trece claves, incluidas `rail` (distinta de `label`), `altImage`/`altVideo` y el par `pauseVideos`/`playVideos`. Nada de comentarios que expliquen qué es cada botón; sí los tres del contrato, porque ninguno es deducible leyendo la cadena: `rail` (por qué no repite `label`), `position` (se rellena en cliente) y `pauseVideos` (para qué existe).

- [X] T002 Replicar el bloque `viewer` en el diccionario inglés — src/i18n/en.ts

**Details for T002**: mismas claves, traducciones del contrato C3. Si `pnpm build` compila, la paridad de claves está probada por el tipo — no hace falta comprobarla a mano.

**Checkpoint Fase 1**:
- [ ] `pnpm build` termina con código 0 (prueba la paridad de claves ES/EN vía el tipo `Translation`).
- [ ] `grep -c "viewer" src/i18n/es.ts src/i18n/en.ts` devuelve el mismo recuento en los dos ficheros.

---

## Fase 2: Dimensiones de medios en build

**Propósito**: saber el ancho y alto natural de cada foto y de cada vídeo **antes** de renderizar, que es lo que permite (a) no escalar hacia arriba de forma determinista y (b) que un `<video preload="none">` no se pinte a 300×150.

- [X] T003 Crear el ayudante de dimensiones de medios — src/lib/mediaDimensions.ts

**Details for T003**: fichero nuevo, ejecutado **sólo en build** (lo importa el frontmatter de un `.astro`; nunca llega al cliente).

```ts
import path from "node:path";
import sharp from "sharp";

export interface MediaSize { width: number; height: number }

const cache = new Map<string, MediaSize | null>();

export function posterPath(publicPath: string): string {
	return publicPath.replace(/\/([^/]+)\.(mp4|webm|mov)$/i, "/posters/$1.webp");
}

export async function getMediaSize(publicPath: string): Promise<MediaSize | null> {
	// Un .mp4 no expone sus dimensiones sin ffprobe; el póster tiene el mismo
	// encuadre, así que se mide el póster y se hereda el ratio.
	const target = posterPath(publicPath);
	if (cache.has(target)) return cache.get(target)!;
	let size: MediaSize | null = null;
	try {
		const meta = await sharp(path.join(process.cwd(), "public", target)).metadata();
		if (meta.width && meta.height) size = { width: meta.width, height: meta.height };
	} catch {
		size = null;
	}
	cache.set(target, size);
	return size;
}
```

Requisitos no negociables: (1) **nunca lanza** — un póster que falte devuelve `null` y el visor sigue funcionando sin atributos `width`/`height`; (2) la `Map` es de módulo, así que las 279 imágenes se leen una vez por build aunque aparezcan en varias páginas; (3) `posterPath` es idéntico al `replace` que hoy está inline en `ProjectDetail.astro:73-76` — se mueve aquí y el componente lo importa, para que la convención de pósters viva en un solo sitio.

- [X] T004 Verificar el ayudante contra ficheros reales — src/lib/mediaDimensions.ts

**Details for T004**: comprobación puntual desde la terminal, sin runner de tests:

```bash
node --experimental-strip-types -e "
import('./src/lib/mediaDimensions.ts').then(async m => {
  console.log(await m.getMediaSize('/assets/runway/angel-schlesser-2025/1.webp'));
  console.log(await m.getMediaSize('/assets/runway/angel-schlesser-2025/video-1.mp4'));
  console.log(await m.getMediaSize('/assets/no/existe.webp')); // debe imprimir null
})"
```
Esperado: dos objetos `{width, height}` con valores plausibles (los vídeos de este repo son 608×1080) y un `null` limpio sin traza de excepción.

**Checkpoint Fase 2**:
- [ ] `getMediaSize` devuelve `{width, height}` para una foto existente.
- [ ] Devuelve `{width, height}` para un `.mp4` (leyendo su póster `.webp`).
- [ ] Devuelve `null` — sin excepción — para una ruta inexistente.
- [ ] `posterPath('/a/b/v1.mp4') === '/a/b/posters/v1.webp'`.

---

## Fase 3: El visor — markup y estilos

**Propósito**: dejar el `<dialog>` completo, correcto y estilado **antes** de escribir una línea de comportamiento. Al terminar la fase el visor existe en el HTML pero no se abre.

**Prueba independiente**: en DevTools, `document.querySelector('[data-gallery-viewer]').showModal()` debe mostrar el carril a pantalla completa, deslizable con el dedo/trackpad, con las fotos sin recortar y sin escalar hacia arriba.

- [X] T005 Crear el componente del visor con su markup — src/components/GalleryViewer.astro

**Details for T005**: componente nuevo. Props según el contrato C2. Importar `Icon.astro` (ya se usa en `ProjectDetail.astro`) para los tres botones. En el frontmatter, resolver dimensiones con `Promise.all` y construir el markup.

```astro
---
import { getMediaSize, posterPath } from "../lib/mediaDimensions";
import { getTranslation, type Locale } from "../i18n";
interface Props { images: string[]; title: string; locale: Locale }
const { images, title, locale } = Astro.props;
const t = getTranslation(locale);
const fill = (tpl: string, i: number) =>
	tpl.replace("{n}", String(i + 1)).replace("{total}", String(images.length)).replace("{title}", title);
const media = await Promise.all(images.map(async (src) => ({
	src,
	isVideo: /\.(mp4|webm|mov)$/i.test(src),
	size: await getMediaSize(src),
})));
---
<dialog
	data-gallery-viewer
	aria-label={t.viewer.label}
	data-position-template={t.viewer.position}
>
	<ul class="viewer-rail" role="list" tabindex="0" autofocus aria-label={t.viewer.rail}>
		{media.map((m, i) => (
			<li class="viewer-slide">
				{m.isVideo ? (
					<video src={`${m.src}#t=1`} poster={posterPath(m.src)}
						aria-label={fill(t.viewer.altVideo, i)}
						width={m.size?.width} height={m.size?.height}
						loop muted playsinline controls preload="none" />
				) : (
					<img src={m.src} alt={fill(t.viewer.altImage, i)} loading="lazy"
						width={m.size?.width} height={m.size?.height} />
				)}
			</li>
		))}
	</ul>
	<div class="viewer-bar">
		<p class="viewer-counter" aria-hidden="true"></p>
		<p class="viewer-announcer sr-only" role="status"></p>
		<button type="button" class="viewer-prev" aria-label={t.viewer.previous}>
			<Icon icon="arrow-left" aria-hidden="true" focusable="false" />
		</button>
		<button type="button" class="viewer-next" aria-label={t.viewer.next}>…</button>
		<button type="button" class="viewer-close" aria-label={t.viewer.close}>…</button>
	</div>
</dialog>
```

Decisiones de markup que **no** son estilo y no deben "simplificarse":

- **`<ul role="list">` + `<li>`, no `<div>` + `<figure>`.** La lista da a un lector de pantalla «lista, 12 elementos» y la posición de cada uno sin escribir una línea de ARIA. `role="list"` va explícito porque Safari **retira** la semántica de lista cuando hay `list-style: none`. Y **no** se pone `role="group"` sobre las diapositivas: `<figure>` ya expone `role="figure"` y `role="group"` lo pisaría — es ARIA que resta.
- **`aria-label` en cada `<video>`.** Un `<video controls>` sin nombre accesible se anuncia como «reproductor multimedia» (4.1.2); además son clips sin audio y 1.2.1 (A) pide alternativa textual.
- **`alt` por índice**, nunca `alt={title}` repetido.
- **`autofocus` en el carril.** Los pasos de enfoque de `<dialog>` han sido inconsistentes en Safari; con `autofocus` el punto de entrada es determinista y es el elemento que el usuario querrá usar.
- **Contador partido en dos** (ver C4): `.viewer-counter` visible con `aria-hidden`, `.viewer-announcer` con `role="status"` y la clase global `.sr-only` que ya define `BaseLayout.astro:352`.
- **`aria-hidden="true"` y `focusable="false"` en todos los iconos** de los botones (los botones ya llevan `aria-label`; el icono sólo añadiría ruido, y sin `focusable="false"` un SVG en línea entra en el orden de tabulación en IE/algunos motores antiguos).
- **`loading="lazy"` en todas las diapositivas**, incluida la primera: con el `<dialog>` cerrado nada se pinta, así que la ficha no paga ni un byte hasta que alguien abre el visor.

- [X] T006 Escribir los estilos del visor — src/components/GalleryViewer.astro

**Details for T006**: `<style>` con ámbito de componente. Las cuatro reglas que deciden el resultado:

```css
dialog[data-gallery-viewer] {
	/* El UA da width/height: fit-content, margin: auto, border y padding. Todo fuera. */
	inset: 0; margin: 0; padding: 0; border: 0; max-width: none; max-height: none;
	width: 100vw; height: 100vh; height: 100dvh;
	background: var(--gray-999); color: var(--gray-0); overflow: hidden;
	/* En los DOS ejes y en el diálogo, no sólo en el carril: un arrastre vertical
	   se encadena al fondo en iOS si sólo se contiene el eje x. */
	overscroll-behavior: contain;
}
dialog[data-gallery-viewer]::backdrop { background: #000; }

/* PROHIBIDO en todo este bloque: touch-action: pan-x | none, y user-scalable=no.
   Matan el pinch-zoom nativo, que es la única ampliación disponible para baja
   visión (WCAG 1.4.4 AA). Si el arrastre vertical se siente raro, NO es aquí. */
.viewer-rail {
	display: flex; height: 100%; margin: 0; padding: 0; list-style: none;
	overflow-x: auto; overflow-y: hidden;
	scroll-snap-type: x mandatory;
	scrollbar-width: none;
}
.viewer-rail::-webkit-scrollbar { display: none; }

.viewer-slide {
	flex: 0 0 100%; scroll-snap-align: center; scroll-snap-stop: always;
	display: grid; place-items: center; height: 100%; padding: 0.75rem;
}

/* La regla de no-upscale: `auto` deja el tamaño intrínseco y los `max-*` sólo lo encogen. */
.viewer-slide :is(img, video) {
	max-width: 100%; max-height: 100%; width: auto; height: auto;
	object-fit: contain; border-radius: 0.75rem;
}
```

`height: 100vh` seguido de `height: 100dvh` replica el patrón que ya usa `.page-shell` en `BaseLayout.astro:378-381` (`min-height: 100vh; min-height: 100svh`): el segundo valor gana donde se soporta y el primero es el respaldo. Se usa `dvh` y no `svh` porque el visor debe ocupar el alto real en cada momento, no el mínimo garantizado.

La barra (`.viewer-bar`) va `position: absolute` abajo, con `padding-bottom: max(1rem, env(safe-area-inset-bottom))` para no quedar bajo el indicador de inicio del iPhone. Los botones prev/next se ocultan por debajo de 50em (en móvil se pasa con el dedo) y aparecen en escritorio, alineados con el mismo breakpoint que ya usa el resto del proyecto. El fondo y los tamaños de la barra se tratan aparte, en T009, porque son requisitos de contraste y de tamaño de objetivo, no decoración.

El `.viewer-slide` es un `<li>` y el `list-style: none` va en el `<ul>`; por eso el markup lleva `role="list"` explícito (T005).

- [X] T007 Añadir la regla global de bloqueo de scroll — src/components/GalleryViewer.astro

**Details for T007**: bloque `<style is:global>` separado, con una sola regla:

```css
html.viewer-open { overflow: hidden; }
```

Va en `is:global` porque el ámbito de Astro no alcanza a `<html>`. Comentario obligatorio aquí (es un *por qué* no deducible): la clase la limpia `astro:before-swap` porque `<html>` sobrevive al swap.

- [X] T008 Respetar `prefers-reduced-motion` en el desplazamiento del carril — src/components/GalleryViewer.astro

**Details for T008**: por CSS, coherente con cómo el proyecto ya lo hace en `BaseLayout.astro:137-141`:

```css
.viewer-rail { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
	.viewer-rail { scroll-behavior: auto; }
}
```

Con esto, un `scrollBy()` sin `behavior` explícito hereda la preferencia del usuario y el JS no tiene que consultar el media query para navegar. El JS **sí** lo consulta, pero sólo para decidir si autorreproduce vídeos (T015).

- [X] T009 Foco visible en el carril y barra legible sobre cualquier foto — src/components/GalleryViewer.astro

**Details for T009**: tres reglas que son criterios de conformidad, no acabado visual.

```css
/* El offset NEGATIVO es obligatorio: el `overflow: hidden` del <dialog> recorta
   cualquier contorno dibujado por fuera y el foco quedaría invisible. */
.viewer-rail:focus-visible { outline: 3px solid var(--gray-0); outline-offset: -3px; }

.viewer-bar {
	background: linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0));
	color: #fff;
}
.viewer-bar button { min-width: 44px; min-height: 44px; display: grid; place-items: center; }
```

Por qué: (1) el carril es tabulable (`tabindex="0"`) y sin anillo de foco incumple **2.4.7 (AA)**; (2) la barra flota sobre fotografías arbitrarias — sin respaldo sólido o degradado, el contador puede caer por debajo de 4.5:1 (**1.4.3**) y los iconos por debajo de 3:1 (**1.4.11**) contra una foto clara; (3) 44×44 px es el mínimo cómodo para el pulgar y evita que los tres botones queden pegados en la barra del iPhone.

**Checkpoint Fase 3**:
- [ ] `pnpm build` compila el componente sin errores de tipos.
- [ ] Con `showModal()` a mano en el build servido desde `dist/`, el visor cubre el viewport completo y el carril desliza con snap.
- [ ] En 1440 px, una foto de 1179 px de ancho mide **1179 px CSS** — no 1440. Comprobado con `document.querySelector('.viewer-slide img').getBoundingClientRect().width`.
- [ ] En 390 px, esa misma foto mide **≤ 390 px** y no desborda: `rect.right <= window.innerWidth`.
- [ ] Un `<video>` con `preload="none"` muestra el póster con su ratio correcto, **no** una caja de 300×150.
- [ ] El árbol de accesibilidad muestra el carril como **lista con N elementos** (no como `group`), y las diapositivas sin `role="group"`.
- [ ] Con `Tab` sobre el carril, el anillo de foco es **visible y completo** — no recortado por el borde del diálogo.
- [ ] Ningún `touch-action` restrictivo ni `user-scalable=no` en el fichero: `grep -nE "touch-action|user-scalable" src/components/GalleryViewer.astro` no devuelve nada.
- [ ] Los tres botones de la barra miden ≥ 44×44 px (`getBoundingClientRect()`).

---

## Fase 4: El visor — comportamiento

**Propósito**: abrir, navegar, anunciar, reproducir y cerrar. Todo en el `<script>` del mismo componente.

**Prueba independiente**: pulsar un ítem del grid abre el visor en esa foto; flechas y dedo cambian de diapositiva; Escape cierra y el foco vuelve al ítem pulsado.

- [X] T010 Inicializar el visor en `astro:page-load` — src/components/GalleryViewer.astro

**Details for T010**: todo el script cuelga de `document.addEventListener("astro:page-load", …)`, igual que el observador de vídeos de `ProjectDetail.astro:104`. Salida temprana si no hay `[data-gallery-viewer]` en la página (el mismo bundle se carga en fichas sin galería).

```ts
const dialog = document.querySelector<HTMLDialogElement>("[data-gallery-viewer]");
if (!dialog) return;
const rail = dialog.querySelector<HTMLElement>(".viewer-rail")!;
const slides = [...dialog.querySelectorAll<HTMLElement>(".viewer-slide")];
const counter = dialog.querySelector<HTMLElement>(".viewer-counter")!;
const announcer = dialog.querySelector<HTMLElement>(".viewer-announcer")!;
const template = dialog.dataset.positionTemplate ?? "{current} / {total}";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let index = 0;
```

- [X] T011 Abrir el visor desde el grid — src/components/GalleryViewer.astro

**Details for T011**:

```ts
function open(startIndex: number) {
	index = startIndex;
	document.querySelectorAll<HTMLVideoElement>(".gallery-item video").forEach(v => v.pause());
	document.documentElement.classList.add("viewer-open");
	// El contador se rellena ANTES de showModal(): si se rellena después, la región
	// live dispara encima del anuncio del propio diálogo y se pisan.
	paint();
	dialog.showModal();
	// El scroll va DESPUÉS de showModal(): con el diálogo cerrado, clientWidth vale 0
	// y el carril se posicionaría siempre en la primera foto.
	rail.scrollTo({ left: startIndex * rail.clientWidth, behavior: "instant" });
}

document.querySelectorAll<HTMLButtonElement>(".gallery-open").forEach((btn) => {
	btn.addEventListener("click", () => open(Number(btn.dataset.viewerIndex)));
});
```

El `behavior: "instant"` es deliberado y no depende de `prefers-reduced-motion`: abrir el visor con una animación de scroll recorriendo diez fotos sería mareante para cualquiera.

- [X] T012 Navegar por teclado y por botones — src/components/GalleryViewer.astro

**Details for T012**: un `keydown` sobre el `dialog` para `ArrowLeft` / `ArrowRight` / `Home` / `End`; los botones `.viewer-prev` / `.viewer-next` llaman a la misma función. **Sin bucle** al llegar a los extremos (decisión: los límites deben notarse).

```ts
function goTo(target: number) {
	const next = Math.min(slides.length - 1, Math.max(0, target));
	rail.scrollTo({ left: next * rail.clientWidth });   // hereda scroll-behavior de T008
}

dialog.addEventListener("keydown", (e) => {
	// Con el foco dentro de un <video controls>, las flechas ya rebobinan y ajustan
	// volumen. Sin estas dos guardas, ArrowRight busca EN el vídeo y además pasa de
	// diapositiva: dos acciones con una tecla.
	if (e.defaultPrevented) return;
	if ((e.target as HTMLElement)?.closest("video")) return;
	if (e.key === "ArrowRight") goTo(index + 1);
	else if (e.key === "ArrowLeft") goTo(index - 1);
	else if (e.key === "Home") goTo(0);
	else if (e.key === "End") goTo(slides.length - 1);
	else return;
	e.preventDefault();
});
```

**`aria-disabled`, nunca `disabled`.** Un botón que pasa a `disabled` mientras lo tienes enfocado deja de ser enfocable: el foco cae al `<body>` y el usuario de teclado se queda sin punto de referencia dentro del diálogo. Se marca `aria-disabled="true"` en los extremos, el botón sigue enfocable y el manejador simplemente no hace nada (el `Math.min`/`Math.max` de `goTo` ya lo garantiza).

Escape **no se implementa**: `<dialog open>` modal lo trae de serie (dispara `cancel` y luego `close`). Las flechas arriba/abajo se dejan al navegador.

- [X] T013 Cerrar el visor y restaurar el estado — src/components/GalleryViewer.astro

**Details for T013**: escuchar el evento `close` del `<dialog>` — así una sola función cubre Escape, el botón ✕ y cualquier cierre futuro:

```ts
dialog.addEventListener("close", () => {
	document.documentElement.classList.remove("viewer-open");
	dialog.querySelectorAll("video").forEach(v => v.pause());
	if (reducedMotion) return;
	// Reanudar los vídeos del grid que siguen a la vista: su IntersectionObserver
	// no volverá a dispararse hasta que el usuario haga scroll.
	document.querySelectorAll<HTMLVideoElement>(".gallery-item video").forEach((v) => {
		const r = v.getBoundingClientRect();
		if (r.top < window.innerHeight && r.bottom > 0) v.play().catch(() => {});
	});
});
dialog.querySelector(".viewer-close")!.addEventListener("click", () => dialog.close());
```

**El foco no se gestiona a mano**: el navegador lo devuelve al elemento que tenía el foco al llamar a `showModal()`, que es exactamente el `.gallery-open` pulsado. Escribir código para eso sería duplicar y arriesgarse a hacerlo peor.

**Cerrar pulsando el fondo: se descarta.** La comprobación `event.target === dialog` es casi inalcanzable en la práctica porque el carril llena el diálogo entero: no hay área vacía que pulsar, y el `::backdrop` de un diálogo a pantalla completa no queda expuesto. Escape y el botón ✕ ya cubren **2.1.1** y **2.1.2**; añadir un camino que no funciona sólo produce un checkpoint que se marca sin comprobar.

- [X] T014 Seguir la posición, pintarla y anunciarla por separado — src/components/GalleryViewer.astro

**Details for T014**: mismo patrón que el observador de vídeos existente, pero con `root: rail`. **Dos funciones distintas, y esa separación es el punto de la tarea.**

```ts
function paint() {                        // en CADA intersección: el usuario mira
	counter.textContent = template
		.replace("{current}", String(index + 1))
		.replace("{total}", String(slides.length));
	prev.setAttribute("aria-disabled", String(index === 0));
	next.setAttribute("aria-disabled", String(index === slides.length - 1));
}

function announce() {                     // SÓLO al detenerse: el lector escucha
	announcer.textContent = counter.textContent;
}

// `scrollend` no existe en iOS < 17.4; el temporizador es el respaldo, no un extra.
let idle: number;
const settle = () => {
	clearTimeout(idle);
	idle = window.setTimeout(announce, 200);
};
rail.addEventListener("scrollend", announce);
rail.addEventListener("scroll", settle, { passive: true });

const observer = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		const i = slides.indexOf(entry.target as HTMLElement);
		const video = entry.target.querySelector("video");
		if (entry.isIntersecting) {
			index = i;
			paint();
			if (video && !reducedMotion) video.play().catch(() => {});
		} else {
			video?.pause();
		}
	}
}, { root: rail, threshold: 0.6 });
slides.forEach(s => observer.observe(s));
```

**Por qué no basta con `aria-live` sobre el contador visible.** Un deslizamiento con inercia atraviesa cinco o seis diapositivas y dispara una intersección por cada una: VoiceOver leería «2 de 12, 3 de 12, 4 de 12…» encima de sí mismo. `aria-atomic` controla *qué* se lee y `threshold` cuántas diapositivas están activas — ninguno de los dos controla la **frecuencia**. La única solución es no escribir en la región live hasta que el carril se pare: `scrollend` donde existe, temporizador de 200 ms donde no. Si los dos disparan, `announce()` escribe el mismo texto y el lector no repite.

`threshold: 0.6` (no 0.25 como el grid): con `scroll-snap` sólo puede haber una diapositiva por encima del 60 %, así que nunca hay dos "activas" a la vez ni dos vídeos reproduciéndose.

- [X] T015 Limpiar el visor en `astro:before-swap` — src/components/GalleryViewer.astro

**Details for T015**:

```ts
document.addEventListener("astro:before-swap", () => {
	// <html> NO se reemplaza en el swap: si la clase se queda, la página
	// siguiente carga sin poder hacer scroll.
	document.documentElement.classList.remove("viewer-open");
	document.querySelector<HTMLDialogElement>("[data-gallery-viewer]")?.close();
});
```

Registrarlo **fuera** del `astro:page-load` — si no, se acumula un listener por navegación. Los vídeos ya los pausa `BaseLayout.astro:91-95` en ese mismo evento; no hace falta repetirlo.

**Checkpoint Fase 4**:
- [ ] Pulsar el ítem nº 5 del grid abre el visor **en la foto 5**, no en la 1.
- [ ] El contador visible dice «5 de 12» **ya en el primer frame** tras abrir, y cambia al pasar de foto.
- [ ] `ArrowRight`/`ArrowLeft` mueven una diapositiva; `Home` va a la primera y `End` a la última.
- [ ] Con el foco dentro de un `<video>`, `ArrowRight` **sólo** actúa sobre el vídeo: el carril no se mueve.
- [ ] En la primera diapositiva, `.viewer-prev` tiene `aria-disabled="true"` y **sigue siendo enfocable**; ningún botón usa el atributo `disabled`.
- [ ] Escape cierra y `document.activeElement` es el `.gallery-open` que se pulsó.
- [ ] Con el visor abierto, `Tab` no alcanza ningún elemento del fondo.
- [ ] Con el visor abierto, la página de detrás no hace scroll.
- [ ] Al llegar a una diapositiva de vídeo, se reproduce; al pasar a la siguiente, se pausa. Sólo un vídeo reproduciéndose a la vez.
- [ ] Un desplazamiento rápido de 5-6 diapositivas escribe en `.viewer-announcer` **una sola vez**, con el valor final (comprobable con un `MutationObserver` sobre el anunciador: una mutación, no seis).
- [ ] Abrir el visor, cerrarlo, navegar a otra página con el ClientRouter: la página nueva hace scroll con normalidad (regresión de `viewer-open`).
- [ ] Abrir el visor y navegar con el botón «Volver» del navegador: no hay entradas de historial por diapositiva; una sola pulsación sale de la ficha.

---

## Fase 5: Integración en la ficha de proyecto

**Propósito**: conectar el grid con el visor. Es el único fichero existente que se modifica.

- [X] T016 Convertir los ítems del grid en botones y dar `alt` por índice — src/components/ProjectDetail.astro

**Details for T016**: aplicar el bloque «Después» de **B/A 1**, incluidos el ayudante `fill` del frontmatter, el `alt` por índice (`t.viewer.altImage`) y el `aria-label` del `<video>` (`t.viewer.altVideo`). El `<li class="gallery-item">` y todo su CSS se quedan igual; dentro va un `<button type="button" class="gallery-open" data-viewer-index={i}>`.

- [X] T017 Quitar `controls` de los vídeos del grid — src/components/ProjectDetail.astro

**Details for T017**: eliminar el atributo `controls` del `<video>` del grid (`ProjectDetail.astro:80`). Con `controls`, el toque lo consume la barra nativa y el visor no se abriría nunca desde un vídeo. Merece comentario (*por qué* no deducible), una línea, y debe apuntar a T020: **este atributo era el mecanismo de pausa de WCAG 2.2.2; el sustituto es `[data-pause-videos]`.** No se puede hacer T017 sin T020.

- [X] T018 Reutilizar `posterPath` en lugar del `replace` inline — src/components/ProjectDetail.astro

**Details for T018**: sustituir el `.replace(/\/([^/]+)\.(mp4|webm|mov)$/i, "/posters/$1.webp")` de las líneas 73-76 por `posterPath(img)` importado de `../lib/mediaDimensions`. La convención de pósters pasa a tener una sola representación.

- [X] T019 Montar el visor bajo el grid — src/components/ProjectDetail.astro

**Details for T019**: `<GalleryViewer images={entry.data.images} title={entry.data.title} locale={locale} />` justo después de `</Grid>`, dentro del mismo `<div class="stack gap-10">`. No importa dónde esté en el DOM: un `<dialog>` modal vive en la capa superior.

- [X] T020 Añadir el control «Pausar los vídeos» y hacer desconectables los observadores — src/components/ProjectDetail.astro

**Details for T020**: es la mitigación de **WCAG 2.2.2 Pause, Stop, Hide (nivel A)** que hace admisible T017. Sin ella, el cambio degrada un criterio de nivel A que el sitio cumple hoy. Dos partes, ambas en `ProjectDetail.astro`:

1. **Markup** — el botón de **B/A 5**, sobre el `<Grid>`, renderizado sólo si `hasVideo`:
   ```ts
   const hasVideo = entry.data.images.some((img) => /\.(mp4|webm|mov)$/i.test(img));
   ```
   Es un `<button>` con texto visible (no sólo icono): el control tiene que ser descubrible, y su etiqueta cambia entre las dos cadenas de `data-label-pause` / `data-label-play`.
2. **Script** — acumular los observadores en un array (**B/A 2**) para poder desconectarlos, y una función `rebuildObservers()` para el camino de vuelta. Pausar sin desconectar da un control que se deshace solo en el siguiente scroll.

Objetivo ≥ 44×44 px, y `:focus-visible` con el mismo tratamiento que `.gallery-open`.

- [X] T021 Añadir los estilos del botón del grid — src/components/ProjectDetail.astro

**Details for T021**: las reglas `.gallery-open` de **B/A 1**. El objetivo es que el grid se vea **idéntico** al de antes: sin borde, sin fondo, sin padding, ocupando el 100 % del ítem. `cursor: zoom-in` es la única señal visual nueva y sólo aparece en escritorio.

**Checkpoint Fase 5**:
- [ ] El grid se ve igual que antes del cambio, salvo el control de pausa nuevo (comparación de capturas contra `main`).
- [ ] Cada ítem del grid tiene nombre accesible: «Ampliar la imagen 3 de 12» / «Ampliar el vídeo 7 de 12».
- [ ] Las N imágenes del grid tienen N `alt` **distintos**: `[...document.querySelectorAll('.gallery-item img')].map(i => i.alt)` no tiene repetidos.
- [ ] `Tab` recorre los ítems del grid y `Enter`/`Espacio` abren el visor.
- [ ] Tocar un vídeo del grid abre el visor (ya no hay `controls` interceptando).
- [ ] Los vídeos del grid siguen reproduciéndose solos al entrar en viewport.
- [ ] **2.2.2**: pulsar «Pausar los vídeos» para todos los `.gallery-item video`, la etiqueta pasa a «Reanudar los vídeos», y **tras hacer scroll y volver ninguno se ha reanudado solo** (prueba de que los observadores están desconectados, no sólo los vídeos pausados).
- [ ] Volver a pulsar reanuda el comportamiento anterior.
- [ ] En una ficha **sin vídeos** el control no se renderiza.

---

## Fase 6: Verificación y evidencias

**Propósito**: el encargo lo pide con nombre y apellidos — «SDD pero recolectamos evidencias por fa porque esto se tiene que ver bien». Sin las capturas, la fase no está hecha.

**Regla de medición, no negociable** (viene del historial de este proyecto): medir contra el **build de producción servido desde `dist/`**, nunca contra el dev server. Y `body` lleva `overflow-x: hidden`, así que un desbordamiento **no** produce barra de scroll: se recorta en silencio. Comparar `getBoundingClientRect().right` contra `window.innerWidth`; **nunca** `scrollWidth`.

**Orden de trabajo dentro de la fase**: T022-T024 escriben el verificador, T025 construye y comprueba rutas, y después `pnpm verify:viewer <slug>` ejecuta lo escrito. T026 y T027 cierran con evidencias.

**El código de salida es la verificación, no el JSON.** `measurements.json` se escribe como evidencia para el humano, pero un JSON que alguien debe leer y juzgar es el artefacto arquetípico de falsa confianza. El script sale con **1** ante cualquier aserción fallida y con **2** si no puede verificar (falta `playwright-core`, falta `dist/`, `dist/` es más antiguo que `src/`). Un `verify:viewer` en verde es la única afirmación que cuenta.

- [X] T022 Crear el verificador versionado y autoprotegido — scripts/verify-viewer.mjs

**Details for T022**: fichero nuevo, con `"verify:viewer": "node scripts/verify-viewer.mjs"` en `package.json`. Va **versionado**, no en el scratchpad: la mitigación de R11 es ficción si vive en un directorio temporal que se evapora. Encaja con la convención `scripts/*.mjs` que ya usan `check-locale-links.mjs` y compañía, y no añade ninguna dependencia al proyecto (`playwright-core` se resuelve desde el entorno del agente).

Esqueleto, sin la lógica de aserción (T023-T024):

```js
// exit 2 = no se pudo verificar. exit 1 = se verificó y FALLA. exit 0 = correcto.
let chromium;
try { ({ chromium } = await import("playwright-core")); }
catch { fail(2, "falta playwright-core: pnpm dlx playwright-core@1 …"); }
if (!existsSync("dist")) fail(2, "no hay dist/: ejecuta pnpm build");
if (mtime("dist") < newestMtime("src")) fail(2, "dist/ es más antiguo que src/");
const slug = process.argv[2] ?? "runway/angel-schlesser-25-antonte";
```

**Precondiciones que ABORTAN** (nunca degradan a «pasa»), antes de medir nada, en cada ancho:

```js
assert(response.status() === 200);
assert(await page.evaluate(() => document.querySelector("[data-gallery-viewer]").matches(":modal")));
assert(slideCount === openButtonCount);       // el visor tiene tantas diapositivas como ítems el grid
assert(naturalWidth > 0 && rect.width > 0);   // por cada elemento medido
```

Sin ellas, un diálogo cerrado o una imagen no cargada da `0` en todo y las comparaciones pasan solas.

**Nada de esperas fijas.** El scroll suave hace que cualquier `waitForTimeout` sea una fuente de intermitencias:

```js
await page.waitForFunction(() => {
  const r = document.querySelector(".viewer-rail");
  return new Promise(res => requestAnimationFrame(() => {
    const a = r.scrollLeft;
    requestAnimationFrame(() => res(a === r.scrollLeft));
  }));
});
```

**DPR**: las mediciones se toman a **DPR 1** y las comparaciones se hacen en **píxeles CSS**, nunca de dispositivo. Las capturas de 390 px se toman a **DPR 3** (T026). El DPR usado se registra en cada entrada de `measurements.json`.

- [X] T023 Asertar el ajuste *contain* exacto, el letterbox y el tamaño de los vídeos — scripts/verify-viewer.mjs

**Details for T023**: **la aserción `css <= natural` del plan anterior queda anulada.** Era vacua y no podía cazar la regresión R11 que decía mitigar: a 390 y 768 px es trivialmente cierta (una fuente de 1179 px pintada al 100 % del ancho mide 366 px, y 366 ≤ 1179 pasa); a 1440 px pasa o falla según qué activo caiga primero (una fuente de 2048 px al 100 % mide 1416 px, que pasa **con la restricción rota**); y con el diálogo cerrado da `0 <= 0`, que también pasa.

Se sustituye por la **predicción exacta del ajuste contain**, con igualdad ±1 px, contra la **caja de contenido de la diapositiva** — no `innerWidth`, que ignora el `padding: 0.75rem` del `.viewer-slide` — y sobre **todas** las diapositivas, no la primera:

```js
// availW/availH = caja de CONTENIDO del .viewer-slide (descontados paddings)
const scale = Math.min(1, availW / naturalW, availH / naturalH);
assert(Math.abs(rect.width  - naturalW * scale) <= 1);
assert(Math.abs(rect.height - naturalH * scale) <= 1);
```

Recorrer cada diapositiva **llevándola al carril primero** y esperando `img.complete && img.naturalWidth > 0`: van todas `loading="lazy"` dentro de un `<dialog>` y no se descargan hasta ser visibles.

**Segundo testigo, independiente del primero — el letterbox a 1440 px.** Para un activo estrecho documentado por nombre y ancho natural en el JSON:

```js
assert(slideContentWidth - imgWidth > 2);   // hay banda lateral: NO se ha estirado
```
Dos aserciones que fallan por motivos distintos son mucho más difíciles de romper a la vez que una sola.

**Desbordamiento, con el alcance corregido**: sólo la **diapositiva activa** y `.viewer-bar`. El checkpoint anterior («cero elementos con `rect.right > innerWidth`») estaba **mal escrito**: las diapositivas fuera de pantalla del carril están fuera del viewport **por diseño** y harían fallar un build correcto. Sigue vigente comparar `getBoundingClientRect().right` contra `window.innerWidth` y **nunca** `scrollWidth` (`body` lleva `overflow-x: hidden` y se traga los desbordamientos).

**Tamaño de los vídeos — única defensa automática de R7** y la razón por la que `mediaDimensions.ts` existe:

```js
// atributos enteros presentes, y render con ese ratio ±1 %; explícitamente NO 300×150
assert(Number.isInteger(+v.getAttribute("width")) && +v.getAttribute("width") > 0);
assert(!(Math.round(rect.width) === 300 && Math.round(rect.height) === 150));
assert(Math.abs(rect.width / rect.height - attrW / attrH) / (attrW / attrH) <= 0.01);
```

- [X] T024 Asertar el comportamiento del visor y la regresión R1 — scripts/verify-viewer.mjs

**Details for T024**: todo esto estaba como casillas manuales; una casilla manual no impide una regresión dentro de tres meses.

- **Apertura en el índice correcto**, con dos testigos: `rail.scrollLeft ≈ i * rail.clientWidth` **y** `document.elementFromPoint(cx, cy).closest(".viewer-slide")` resuelve a la diapositiva *i*. El primero solo no distingue un carril mal dimensionado.
- **Contador**: `.viewer-counter` dice exactamente «5 de 12» tras abrir en el índice 4.
- **Anunciador**: un `MutationObserver` sobre `.viewer-announcer` durante un salto de 5 diapositivas registra **1** mutación, no 5.
- **Extremos**: `aria-disabled="true"` en `.viewer-prev` en el índice 0 y en `.viewer-next` en el último; y **ningún** botón con el atributo `disabled`.
- **Foco al cerrar**: tras Escape, `document.activeElement` es el `.gallery-open` de origen.
- **Trampa de foco**: 15 pulsaciones de `Tab` y `document.activeElement.closest("[data-gallery-viewer]")` sigue siendo distinto de `null` en todas.
- **Historial**: `history.length` idéntico antes de abrir y después de recorrer diez diapositivas.
- **Regresión R1, automatizada** (está en Alta · Alto y hasta ahora sólo tenía una casilla): abrir → cerrar → pulsar un enlace interno → esperar `astro:after-swap` → asertar que `documentElement.classList.contains("viewer-open")` es `false` **y** que `window.scrollBy(0, 400)` mueve de verdad `window.scrollY`. La clase sin el scroll real no prueba nada.

- [X] T025 Comprobar build, enlaces y paridad de URLs españolas — dist/

**Details for T025**:
```bash
pnpm build
# El recuento de páginas se comprueba contra el ÁRBOL, no contra el texto del log:
# la redacción de Astro («115 page(s) built») no es un contrato.
test "$(find dist -name '*.html' | wc -l)" -eq 115
pnpm check:links                              # código 0, cero hallazgos
# LA COMPROBACIÓN QUE IMPORTA: ninguna URL española se ha movido
diff .sdd/i18n-paginas-en/baseline-es-urls.txt \
     <(find dist -name '*.html' | sed 's|^dist||' | grep -v '^/en/' | sort)
# ↑ debe salir VACÍO. Si sale algo, parar: el cambio rompe URLs publicadas.
```
El visor no crea ni mueve rutas, así que cualquier diferencia aquí es un accidente.

**Entorno de ejecución del verificador** (aplica a T022-T024): servir `dist/` con `python3 -m http.server` y conducir Chromium con `playwright-core` resuelto desde el entorno del agente — **no** se añade dependencia al proyecto. Binario ya presente: `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`. Página de referencia por defecto: `/runway/angel-schlesser-25-antonte/`, que tiene fotos y 4 vídeos; se puede sustituir con `argv[2]`. Confirmar el slug real en `dist/` antes de empezar. Anchos: 390, 768 y 1440. Salida de evidencia: `.sdd/visor-galeria/measurements.json`.

- [X] T026 Capturar las evidencias visuales del visor — .sdd/visor-galeria/

**Details for T026**: mínimo **ocho** capturas, con estos nombres exactos:

| Fichero | Ancho | Tema | Diapositiva |
|---|---|---|---|
| `viewer-390-light-photo.png` | 390 | claro | foto |
| `viewer-390-dark-photo.png` | 390 | oscuro | foto |
| `viewer-390-light-video.png` | 390 | claro | vídeo |
| `viewer-390-dark-video.png` | 390 | oscuro | vídeo |
| `viewer-1440-light-photo.png` | 1440 | claro | foto |
| `viewer-1440-dark-photo.png` | 1440 | oscuro | foto |
| `viewer-1440-light-video.png` | 1440 | claro | vídeo |
| `viewer-1440-dark-video.png` | 1440 | oscuro | vídeo |

El tema se fuerza con `localStorage.setItem('theme', …)` + `documentElement.classList` antes de la carga, que es el mecanismo real del sitio (`BaseLayout.astro:52-68`). Las de 390 se toman a **DPR 3**; el DPR se registra junto a la captura.

**Antes de cada disparo hay que asertar que el tema se aplicó de verdad**, con dos comprobaciones: (a) `documentElement.classList.contains("theme-dark")` coincide con la intención, y (b) el `background-color` calculado del `<dialog>` **difiere** entre la pasada clara y la oscura. Sin esto se entregan ocho PNG de los que cuatro son duplicados silenciosos, y el criterio «los 8 ficheros existen» se cumple sin probar nada.

Las de 1440 deben **enseñar las bandas laterales**: son la prueba visual de que no se escala hacia arriba, no un defecto que ocultar.

- [X] T027 Capturar la no-regresión del grid y escribir la checklist de iPhone — .sdd/visor-galeria/iphone-checklist.md

**Details for T027**: dos entregables.

**(a) No-regresión del grid**: `grid-390-light.png` y `grid-1440-light.png` de la misma ficha, comparadas con las mismas capturas tomadas de `main`. El grid tiene que verse idéntico salvo el control de pausa nuevo (T020): T016 mete un `<button>` en cada ítem y esta es la prueba de que no ha movido nada.

**(b) Checklist de iPhone**: ninguna comprobación anterior cubre Safari de iOS ni VoiceOver, y en este proyecto el iPhone ya ha cazado dos bugs que las automáticas no vieron. Lista a rellenar por el usuario, con hueco para el resultado de cada punto:

1. El visor ocupa el alto real con la barra de Safari desplegada **y** replegada (esto valida `100dvh`; con `100vh` la barra inferior tapa parte del carril).
2. Deslizar horizontalmente **en el centro** de la pantalla pasa de foto con inercia nativa.
3. Deslizar **desde el borde izquierdo** hace el gesto de volver atrás del sistema. Es el comportamiento aceptado: no se pelea con Safari por ese gesto.
4. Con el visor abierto, la página de detrás no se mueve al arrastrar en vertical.
5. Un vídeo se reproduce **dentro** del carril, no en el reproductor a pantalla completa de iOS (valida `playsinline`).
6. El botón «Volver» del navegador sale de la ficha de una sola pulsación: no hay una entrada de historial por diapositiva.
7. La barra inferior del visor no queda bajo el indicador de inicio (valida `env(safe-area-inset-bottom)`).
8. **VoiceOver**: con el visor abierto, deslizar hacia delante con VoiceOver **no alcanza nunca** contenido del fondo (valida que `showModal()` deja el resto inerte de verdad).
9. **VoiceOver**: un gesto rápido que atraviesa 5-6 diapositivas produce **un** anuncio de posición, no una ristra encadenada (valida el anunciador de T014).
10. **El pinch-zoom funciona dentro del visor**: dos dedos amplían la foto. Si no amplía, alguien ha metido `touch-action` o `user-scalable=no` y hay que quitarlo, no ajustarlo.
11. **Teclado Bluetooth**: `Tab` alcanza el carril con un **anillo de foco visible** y completo, y en la primera y la última diapositiva el foco **no se pierde** al pulsar los botones de los extremos.

**Checkpoint Fase 6**:
- [ ] `pnpm build` en verde, `find dist -name '*.html' | wc -l` = 115 y `pnpm check:links` con código 0.
- [ ] El `diff` contra `baseline-es-urls.txt` sale **vacío**.
- [ ] `pnpm verify:viewer` sale con **código 0**. Cualquier otro código es un fallo de la fase, incluido el 2 (no se pudo verificar ≠ correcto).
- [ ] En los tres anchos y en **todas** las diapositivas: el tamaño renderizado coincide con la predicción *contain* dentro de ±1 px.
- [ ] A 1440 px, el activo estrecho documentado muestra banda lateral (`slideContentWidth - imgWidth > 2`).
- [ ] La **diapositiva activa** y `.viewer-bar` tienen `rect.right <= innerWidth`. (Las diapositivas fuera de pantalla del carril **no** se miden: están fuera del viewport por diseño.)
- [ ] Ningún `<video>` del visor se pinta a 300×150 y todos respetan su ratio ±1 %.
- [ ] Las 8 capturas del visor + las 2 del grid existen, y las de tema oscuro tienen un `background-color` distinto del de las claras.
- [ ] Las capturas de 1440 muestran bandas laterales (confirmación visual del no-upscale).
- [ ] `scripts/verify-viewer.mjs` está **versionado** y `verify:viewer` aparece en `package.json`.
- [ ] `iphone-checklist.md` está en el repo, con los **11** puntos, listo para que lo rellene el usuario.

---

## Dependencies & Execution Order

### Dependencias entre fases

- **Fase 1 (i18n)**: sin dependencias. Bloquea las fases 3 y 5, que consumen `t.viewer.*`.
- **Fase 2 (dimensiones)**: sin dependencias. Bloquea la 3 (`getMediaSize`) y la 5 (`posterPath`).
- **Fase 3 (markup + estilos)**: depende de 1 y 2. Bloquea la 4.
- **Fase 4 (comportamiento)**: depende de 3 — el script consulta selectores que sólo existen si el markup está.
- **Fase 5 (integración)**: depende de 1, 2 y 4. Es el único punto donde se toca código existente.
- **Fase 6 (verificación)**: depende de todo lo anterior.

### Nota sobre paralelismo — leer antes de lanzar nada

**Todos los lotes son secuenciales. `Parallel = No` sin excepción.** No es una omisión: este proyecto tiene historial documentado de lotes de implementación en paralelo destruyéndose el trabajo entre ellos vía `git stash`. Los lotes están dimensionados para ejecutarse en serie, y C y D comparten fichero (`GalleryViewer.astro`) a propósito — se separan por *tipo* de trabajo (estructura vs. comportamiento), no por concurrencia, para que cada uno cierre con un checkpoint comprobable.

### Batch Assignments for Sub-Agents

<!--
MANDATORY — this table is the SINGLE source of truth for parallelism and execution order.
sdd-implement reads this table to decide how to execute tasks.
Rules:
  - Group by target file: all tasks on the same file → same batch (sequential within)
  - Batches on different files with no cross-dependencies → Parallel=Yes
  - The table documents order even when all batches are sequential
  - DERIVE this table from the tasks above — scan file paths and group automatically
-->

| Batch | Tasks | File | Parallel | Depends on |
|-------|-------|------|----------|------------|
| A | T001-T002 | src/i18n/es.ts, src/i18n/en.ts | No | — |
| B | T003-T004 | src/lib/mediaDimensions.ts | No | — |
| C | T005-T009 | src/components/GalleryViewer.astro | No | A, B |
| D | T010-T015 | src/components/GalleryViewer.astro | No | C |
| E | T016-T021 | src/components/ProjectDetail.astro | No | A, B, D |
| F | T022-T027 | scripts/verify-viewer.mjs, package.json, .sdd/visor-galeria/ | No | E |

**T017 y T020 son inseparables.** Quitar `controls` sin el control de pausa degrada WCAG 2.2.2 (A). Si el lote E se interrumpiera entre las dos, el árbol queda en un estado **menos accesible** que `main`. Van juntas o no va ninguna.

---

## Implementation Strategy

### Punto de parada natural

Al cerrar el **lote E** el visor está completo y usable. El **lote F** no añade funcionalidad: convierte «funciona en mi máquina» en evidencia. El encargo lo exige explícitamente, así que no es opcional — pero si hubiera que partir el trabajo en dos sesiones, el corte va entre E y F.

### Entrega incremental

1. Lotes A + B → cimientos invisibles; el sitio se comporta exactamente igual que antes.
2. Lote C → el visor existe en el HTML pero no se abre. Verificable a mano con `showModal()`.
3. Lote D → el visor funciona, pero todavía no hay forma de abrirlo desde la interfaz.
4. Lote E → el grid abre el visor y aparece el control de pausa. **Aquí la funcionalidad está entregada, y no antes: T017 sin T020 dejaría el árbol menos accesible que `main`.**
5. Lote F → evidencias, medidas y checklist de iPhone.

### Estrategia de pruebas

No se añade runner de tests: el proyecto no tiene ninguno y meter uno para este cambio contradice la restricción de no añadir dependencias sin justificarlas. La verificación se apoya en tres patas, y cada una cubre lo que las otras no ven:

| Capa | Qué prueba | Por qué no basta sola | Tarea |
|---|---|---|---|
| Compilador (`pnpm build`) | Paridad de claves ES/EN por el tipo `Translation`; tipos del componente | No dice nada de cómo se ve | T001-T002, T025 |
| Comprobación puntual en Node | `getMediaSize` y `posterPath` contra ficheros reales, incluido el caso `null` | No cubre el navegador | T004 |
| `pnpm verify:viewer` (Chromium headless sobre `dist/`) | Ajuste *contain* exacto ±1 px en todas las diapositivas, letterbox, desbordamiento de la diapositiva activa, dimensiones de vídeo, apertura en índice, contador, extremos, foco, trampa de foco, historial y la regresión R1 | No cubre Safari de iOS ni el lector de pantalla | T022-T024 |
| Capturas verificadas | Evidencia visual con el tema **asertado**, no supuesto | Un humano tiene que mirarlas | T026, T027a |
| iPhone real + VoiceOver | `100dvh`, gesto de borde, `playsinline`, área segura, historial, inercia del anunciador, pinch-zoom, foco con teclado Bluetooth | Manual, lo rellena el usuario | T027b |

**Sobre el script versionado**: `scripts/verify-viewer.mjs` se queda en el repo precisamente porque R11 (alguien "arregla" el letterbox con `width: 100%`) es un riesgo del **futuro**, no de esta sesión. Una comprobación que vive en un directorio temporal no protege nada la semana que viene.

Lo que **conscientemente no se prueba de forma automática**: la reproducción de vídeo en headless (Chromium sin códecs propietarios no reproduce H.264 de forma fiable; se verifica que el elemento activo recibe `play()`, no que se vean fotogramas) y el lector de pantalla (queda para la revisión del `web-accessibility-advisor` y una pasada manual con VoiceOver).

---

## 4. Clarifications

<!--
This section records clarifications obtained via AskUserQuestion tool during planning.
Format: - **[Category]**: Q: <question> → A: <answer>
Categories: Architecture, Data Model, Integration, Security, Performance, Edge Cases, User Scenarios
-->

### Sesión 2026-07-31

**Nota sobre el método**: la entrevista profunda se planteó, pero este sub-agente **no tiene canal directo con el usuario** (`AskUserQuestion` no está disponible en su conjunto de herramientas). En lugar de dejar las decisiones abiertas y bloquear el plan, cada ambigüedad se ha resuelto con una decisión razonada y su alternativa descartada por escrito. **Las tres primeras deberían confirmarse con el usuario antes de implementar** — están marcadas con ⚠ y cada una es reversible en una sola tarea.

**Resolución de los tres puntos ⚠ (usuario, ronda 1)**:

- **1. Carril sin tira de miniaturas — CONFIRMADO** tal cual se propuso.
- **2. Quitar `controls` del grid — CONFIRMADO, con condición.** El `web-accessibility-advisor` estableció que la retirada degrada **WCAG 2.2.2 Pause, Stop, Hide (nivel A)**, criterio que el sitio cumple hoy: los vídeos del grid autorreproducen, van en `loop` y `controls` es su **único** mecanismo de pausa. El usuario acepta la retirada **siempre que** se añada la mitigación recomendada: un control único «Pausar los vídeos» en la cabecera de la galería (**T020**). R5 pasa de riesgo de usabilidad a **riesgo de conformidad**.
- **3. `sharp` en build para leer el póster — ACEPTADO**, sin objeciones.

- ⚠ **[Escenarios de usuario]** Q: «carril» ¿es sólo el deslizamiento horizontal de la foto principal, o además una tira de miniaturas abajo? → A: **sólo el carril principal.** Sus palabras fueron «tener como el mood carril para pasar de fotos»: describe el gesto de pasar, no un índice visual. Una tira de miniaturas obligaría a cargar N imágenes más nada más abrir y competiría por el alto en un iPhone, que es donde más escaso es. Si lo quiere, se añade después sin tocar nada de lo anterior. *Reversible en una tarea nueva.*

- ⚠ **[Casos límite]** Q: los vídeos del grid llevan `controls`; un toque lo consume la barra nativa y el visor no se abriría. ¿Qué cede? → A: **se quitan los `controls` del grid** (T016) y se ponen en el visor. Los vídeos del grid son `muted loop` y arrancan solos: los controles ahí no aportaban. Alternativa descartada: un botón de «ampliar» flotante sobre cada vídeo — añade ruido visual a un grid de portfolio y crea un patrón de interacción distinto para vídeos que para fotos. *Cambia comportamiento existente: es la decisión que más conviene confirmar.*

- ⚠ **[Arquitectura]** Q: para no escalar hacia arriba hacen falta las dimensiones naturales. ¿Se leen en build con `sharp` o se deja todo a CSS? → A: **CSS para las fotos, `sharp` para los vídeos, y se ponen `width`/`height` en ambos.** `width:auto;max-width:100%` ya impide el upscale de un `<img>` sin JS ni metadatos; pero un `<video preload="none">` no tiene tamaño intrínseco y el navegador lo pinta a 300×150. Como el póster ya existe y tiene el mismo encuadre, medirlo con `sharp` (ya es `devDependency`) resuelve el vídeo y de paso quita el salto de layout de las fotos mientras cargan. Alternativa descartada: `ffprobe` sobre los `.mp4` — más lento y sin ganancia sobre leer el póster. Segunda alternativa descartada: `preload="metadata"` en el visor — resuelve el ratio pero dispara N peticiones al abrir.

- **[Arquitectura]** Q: ¿carrusel con JS de arrastre o scroller nativo con `scroll-snap`? → A: **scroller nativo.** Un handler de `touchmove` con `preventDefault` es exactamente lo que pelea con el gesto de volver atrás de iOS. Con `overflow-x:auto` + `scroll-snap` se obtiene inercia nativa, teclado y accesibilidad sin escribir nada, y el JS se queda en posicionar y observar.

- **[Integración]** Q: ¿el visor muestra el mismo `<video>` del grid, un clon, o uno propio? → A: **uno propio, renderizado en servidor** dentro del `<dialog>`. Los dos IntersectionObserver quedan con selectores disjuntos (`.gallery-item video` vs `.viewer-slide video`) y no compiten. Clonar pierde el estado de reproducción; mover el original deja al observador del grid apuntando a un nodo desconectado. El coste es ~120 bytes de markup por ítem.

- **[Casos límite]** Q: ¿historial del navegador por diapositiva? → A: **no se toca el historial.** En iPhone, una entrada por foto convierte el botón «Volver» en una trampa: doce pulsaciones para salir de una galería de doce fotos. Cerrar el visor es cerrar el visor; volver atrás es volver atrás.

- **[Rendimiento]** Q: ¿cuánto pesa esto y compensa una librería? → A: **vanilla, ~3 KB.** El sitio envía hoy 15,3 KB de JS (sólo el ClientRouter). `medium-zoom` son 5–7 KB para hacer zoom in-place sobre una imagen: no es un carril, y agrandar por encima del natural es justo lo que este plan prohíbe. `fancybox` (25 KB) y `light-gallery` (30 KB) duplican o triplican el JS del sitio para un componente que aparece en una sola plantilla.

- **[Accesibilidad]** Q: ¿trampa de foco a mano o `<dialog>` nativo? → A: **`<dialog>` + `showModal()`.** Da trampa de foco, Escape, `inert` sobre el fondo, capa superior y devolución del foco al elemento que lo abrió. Escribir eso a mano son ~60 líneas propensas a fallar. Soportado en Safari de iOS desde 15.4. Sólo quedan a mano el bloqueo de scroll y el anuncio de posición.

- **[Casos límite]** Q: ¿el carrusel da la vuelta al llegar al final? → A: **no.** Los límites deben notarse; los botones prev/next se marcan `disabled` en los extremos, que además es la señal que un lector de pantalla necesita.

- **[Escenarios de usuario]** Q: ¿el visor se aplica también a las portadas de colección y a la home? → A: **no, sólo a las fichas de proyecto.** Ahí las imágenes son tarjetas de navegación: abrir un visor en lugar de navegar rompería el recorrido. El visor se monta en `ProjectDetail.astro` y en ningún otro sitio.

- **[Rendimiento]** Q: duplicar el markup significa duplicar `<img>`. ¿Se dispara el peso de la página? → A: **no, si todas las diapositivas van `loading="lazy"`,** incluida la primera. Mientras el `<dialog>` está cerrado no se pinta nada, así que no se descarga ni un byte hasta que alguien abre el visor. Lo único que crece es el HTML: ~120 bytes por ítem.

- **[Alcance]** Q: ¿pinch-zoom o lupa dentro del visor? → A: **no, y es una decisión, no un olvido.** A 390 px con DPR 3 el móvil ya pide 1170 px de dispositivo de una fuente de 1179: no queda detalle que revelar. Una lupa sólo enseñaría interpolación. La ganancia real de «ver los detalles» viene de quitar el recorte `3/4` del grid.

- **[Accesibilidad]** Q (asesor): ¿basta `aria-live="polite"` en el contador con `aria-atomic` y `threshold: 0.6`? → A: **no.** Ninguno de los dos controla la *frecuencia* de los anuncios; en un deslizamiento con inercia VoiceOver se satura. Contador visible y anunciador `role="status"` separados, este último disparado por `scrollend` con respaldo de temporizador (T014).

- **[Accesibilidad]** Q (asesor): ¿`role="group"` en cada `<figure>`? → A: **no, es ARIA dañino** — pisa el `role="figure"` implícito. Las diapositivas pasan a ser `<li>` de un `<ul role="list">`: la posición y el total los da la lista de forma nativa (T005).

- **[Accesibilidad]** Q (asesor): ¿`disabled` en los botones de los extremos? → A: **`aria-disabled`.** Un botón que se deshabilita bajo el foco tira el foco al `<body>` (T012).

- **[Casos límite]** Q (asesor): ¿cerrar pulsando el fondo? → A: **se retira.** El carril llena el diálogo entero: `event.target === dialog` es prácticamente inalcanzable. Escape y ✕ ya cubren 2.1.1/2.1.2.

- **[Verificación]** Q (asesor): ¿vale la aserción `css <= natural`? → A: **no, es vacua** — pasa por construcción a 390/768, por accidente del activo a 1440 y con `0 <= 0` si el diálogo está cerrado. Se sustituye por la predicción exacta del ajuste *contain* ±1 px contra la caja de contenido, en todas las diapositivas, más un segundo testigo de letterbox (T023).

- **[Verificación]** Q (asesor): ¿script desechable en el scratchpad o versionado? → A: **versionado**, `scripts/verify-viewer.mjs` + `verify:viewer`. R11 es un riesgo futuro; una comprobación que se evapora no lo mitiga. Sin dependencias nuevas: `playwright-core` se resuelve en `try/catch` y el script sale con 2 si falta (T022).

- **[Cobertura del PRD]** No existe `prd.md` para este cambio; el contrato son las cuatro decisiones bloqueadas del encargo. Trazabilidad: Decisión 1 (dos modos) → T005, T011, T016; Decisión 2 (fotos y vídeos en orden del proyecto) → T005, T014 (el orden ya lo produce `gallery-loader.ts`, no se toca); Decisión 3 (nunca escalar hacia arriba) → T003, T006, T023; Decisión 4 (evidencias visuales) → T026, T027. Requisitos duros: A (sin dependencias) → sección 1 y Fase 6 sin runner ni dependencia añadida; B (no romper lo existente) → T015, T017+T020, T024 (regresión R1 automatizada), T027a, y el análisis de observadores del *Data Flow*; C (iPhone) → T006 (`100dvh`, área segura, `overscroll-behavior`), T008/T012 (sin `preventDefault` sobre el gesto) y T027b; D (accesibilidad) → T005, T009, T012, T013, T014, T016, T020, T021; E (estilo de comentarios) → los comentarios prescritos en T006, T007, T011, T012, T014, T015, T017 son todos *por qué* no deducibles; F (verificación) → T022-T026.

## 5. Risks & Considerations

| # | Riesgo | Probabilidad · Impacto | Mitigación | Dónde se detecta |
|---|---|---|---|---|
| R1 | La clase `viewer-open` sobrevive al swap del ClientRouter y la página siguiente carga sin poder hacer scroll. `<html>` **no** se reemplaza en el swap. | Alta · Alto | `astro:before-swap` quita la clase y cierra el `<dialog>`; listener registrado **fuera** de `astro:page-load` para no acumular uno por navegación. **Automatizada en T024**, ya no es sólo una casilla manual. | T015, T024, checkpoint Fase 4 |
| R2 | `overflow: hidden` en `<html>` no frena el scroll en Safari de iOS. Es un fallo clásico y las comprobaciones headless no lo ven. | Media · Alto | Punto 4 de la checklist de iPhone. Si falla, el respaldo es `position: fixed` + guardar y restaurar `scrollY` — más código y con salto visual, por eso no es la primera opción. | T027b punto 4 |
| R3 | `100dvh` no se comporta como se espera con la barra dinámica de Safari y el carril queda cortado por abajo. | Media · Medio | `height: 100vh` como respaldo antes de `100dvh` (mismo patrón que `.page-shell`). Verificación con la barra desplegada **y** replegada. | T027b punto 1 |
| R4 | El gesto de deslizar desde el borde izquierdo se lo queda Safari y el usuario percibe que «el carril no responde». | Media · Bajo | Es comportamiento aceptado, no un bug: no se pelea con el sistema. `overscroll-behavior: contain` en el diálogo impide que el rebote se propague. Documentado en la checklist para que el usuario lo juzgue con criterio. | T027b punto 3 |
| R5 | **Riesgo de conformidad, no de usabilidad.** Quitar `controls` del grid elimina el único mecanismo de pausa de unos vídeos que autorreproducen en bucle indefinidamente: degrada **WCAG 2.2.2 Pause, Stop, Hide (nivel A)**, que el sitio **cumple hoy**. Sin mitigación, el cambio deja el sitio menos conforme que `main`. | Alta · **Alto** | **T020 es obligatoria, no opcional**: un control único «Pausar los vídeos» que pausa todos los `.gallery-item video` **y desconecta sus observadores** (pausar sin desconectar da un control que se deshace al primer scroll). T017 y T020 no pueden separarse. | Checkpoint Fase 5 (2.2.2) |
| R6 | `sharp` en el frontmatter alarga el build. | Baja · Bajo | `metadata()` sólo lee cabeceras y hay caché de módulo: 279 imágenes + 34 pósters se leen una vez. Si el build sube de forma perceptible, comparar tiempos antes/después y considerar prescindir de `width`/`height` en las fotos (los vídeos sí lo necesitan). | T025 |
| R7 | Un póster que falte deja el `<video>` sin dimensiones y vuelve la caja de 300×150. | Baja · Medio | `getMediaSize` devuelve `null` sin lanzar y el visor sigue funcionando. **Aserción automática en T023**: atributos `width`/`height` enteros, ratio renderizado ±1 % y comprobación explícita de que no es 300×150. Es la única defensa automatizada y la justificación de que `mediaDimensions.ts` exista. | T004, T023 |
| R8 | El contador dispara un anuncio por diapositiva durante un deslizamiento con inercia y satura al lector de pantalla. **Confirmado por el asesor**: `aria-atomic` y `threshold` no lo evitan, controlan *qué* se lee, no *cuántas veces*. | Media · Medio | Contador visible (`aria-hidden`) separado del anunciador (`role="status"`), que sólo escribe cuando el carril se detiene: `scrollend` donde existe, temporizador de 200 ms como respaldo para iOS antiguo. | T014, checkpoint Fase 4 (1 mutación, no 6), T027b punto 9 |
| R9 | El `<button>` renderizado en servidor queda inerte sin JS. | Baja · Bajo | El sitio ya depende de JS para tema y transiciones. Las imágenes siguen visibles y la página, navegable. Asumido conscientemente. | — |
| R10 | Fotos pequeñas (el mínimo medido es 360 px) aparecen como una estampilla rodeada de fondo en 1440 px. | Alta · Medio | **Es el comportamiento correcto**, no un defecto: alternativa sería interpolar. Se hace visible en T026 para que el usuario decida si algún activo concreto merece re-exportarse. | T026 (capturas 1440) |
| R11 | Alguien "arregla" el letterbox en el futuro poniendo `width: 100%` y se pierde la restricción central del encargo. | Media · Alto | **La aserción del plan anterior (`css <= natural`) no lo cazaba**: era vacua en los tres anchos. Ahora: predicción exacta del ajuste *contain* ±1 px sobre todas las diapositivas **más** un testigo independiente de letterbox a 1440, en un script **versionado** con salida distinta de 0. | T022-T023, `pnpm verify:viewer` |
| R12 | Alguien "arregla" un arrastre vertical que se siente raro con `touch-action: pan-x` o `user-scalable=no`, y mata el pinch-zoom nativo — **1.4.4 Resize Text (AA)** para baja visión. | Media · Alto | Prohibición escrita en tres sitios: Overview, T006 y un comentario en el propio CSS. Checkpoint de la Fase 3 con `grep`, y punto 10 de la checklist de iPhone. | Checkpoint Fase 3, T027b punto 10 |
| R13 | El foco del carril es invisible: el `overflow: hidden` del `<dialog>` recorta cualquier contorno con `outline-offset` positivo. Incumple **2.4.7 (AA)** sin que se note en una captura. | Media · Medio | `outline-offset: -3px` (inset) en `.viewer-rail:focus-visible`, comprobado con teclado Bluetooth en el iPhone, no sólo en escritorio. | T009, T027b punto 11 |
| R14 | Las flechas del teclado actúan dos veces con el foco dentro de un `<video controls>`: buscan en el vídeo **y** cambian de diapositiva. | Media · Medio | Guardas por `e.defaultPrevented` y por `target.closest("video")` antes de tocar el carril. | T012, checkpoint Fase 4 |
| R15 | Se entregan ocho capturas de las que cuatro son duplicados silenciosos porque el tema no llegó a aplicarse, y «los 8 ficheros existen» se cumple igualmente. | Media · Medio | Antes de cada disparo se aserta la clase de tema **y** que el `background-color` calculado difiere entre las pasadas clara y oscura. | T026 |

**Deuda reconocida, fuera de alcance**: 279 imágenes con mediana de 1179 px y máximo 2048. Re-obtener los originales se evaluó y se descartó — supondría rehacer las 239 fotos de galería. Este plan hace que la limitación sea *honesta* (nunca interpola) en lugar de *invisible* (recorta a `cover`). Si en el futuro se re-exportan activos a mayor resolución, el visor los aprovecha automáticamente sin tocar una línea: `width: auto` ya usa lo que haya.

---

## Notes

- Parallelism is defined ONLY in the Batch Assignment Table — never inline in task lines
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
# Implementation Plan: Página `/about`

**Feature ID**: about-page
**Status**: ✅ Complete
**Created**: 2026-07-27
**Goal**: Publicar `/about` con la copy final aprobada en español, hermana visual de `/contact`, verificada en navegador real.

---

## 1. Overview

Se construye `/about` como una única página estática que consume, **literalmente**, la copy
aprobada en `plan/03-content-pages/about-copy-final-es.md`. Nada de reescribir ni parafrasear:
el texto viaja verbatim desde un módulo de datos nuevo (`src/data/about.ts`) hasta el markup.

**Qué entra**

1. `src/data/about.ts` — nuevo. Los tres párrafos de bio + título de pestaña + etiquetas de
   sección + alt del retrato + meta description, todo en español, como strings planos. Es la
   costura de i18n de la Fase 4.
2. `src/data/profile.ts` — actualizado. `services` (5 ítems con la redacción nueva), `featuredIn`
   (fuera "Fucking Young", "Numéro" → "Numéro Netherlands") y `baseRegion: 'España'` nuevo.
3. `src/pages/about.astro` — nuevo. Página completa: retrato a sangre, eyebrow + titular, bio a
   medida estrecha, Servicios, Publicaciones, Datos, CTAs.
4. `src/components/CvDownloadLink.astro` — nuevo. La **condición** `profile.cvPath` y la
   selección de locale del PDF dejan de estar duplicadas: lo consumen `/about` y `/contact`.
5. `src/components/Nav.astro` — actualizado. Una entrada más (`Sobre mí → /about/`) y dos
   correcciones de foco que el octavo enlace vuelve peligrosas (ver B2).
6. `src/pages/contact.astro` — actualizado. Consume `<CvDownloadLink />` y `profile.baseRegion`.
7. `src/layouts/BaseLayout.astro` — actualizado. **`<html lang="en">` → `lang="es"`.**

⚠️ **Nota para David (fuera del alcance original, entra a propósito)**: el punto 7 arregla un
fallo WCAG 3.1.1 de **nivel A** que afecta a todo el sitio — el documento se declara en inglés y
todo el contenido está en español, así que un lector de pantalla lee la prosa con voz inglesa.
`/about` es justo la página que lo hace grave (tres párrafos de bio). Es un atributo, una línea,
cero riesgo de layout. Se implementa como tarea propia (T005) con su propia verificación.

**Qué NO entra** (y no debe aparecer en el diff): traducción EN (#39), PDFs de CV (#10), `/press`
(#33), créditos/rol de Fase 2, y cualquier rediseño del nav más allá de añadir la entrada y las
dos correcciones de foco (#53 sigue siendo dueño del rediseño). **Detectado y anotado para #53,
explícitamente fuera de alcance aquí**: skip link en `BaseLayout`, `aria-controls` en el botón
del hamburguesa, cierre con `Escape`, y foco que queda bajo el panel absoluto (WCAG 2.2 §2.4.11).

**Principio rector del diseño**: `/about` y `/contact` son hermanas. Comparten tokens, escala
tipográfica, tratamiento de máscara del retrato, el patrón etiqueta/valor y el CTA con flecha.
Lo que las diferencia es la geometría: `/contact` cabe en un viewport (dos columnas, `flex: 1`),
`/about` es una página que scrollea, con la bio como centro de gravedad en una columna estrecha.

**Verificación**: el criterio de aceptación no es "se ve bien". Es medición en Chromium headless
a 360 / 390 / 800 / 1248 / 1440px, en tema claro y oscuro, comparando `getBoundingClientRect()`
contra `window.innerWidth`. `body` lleva `overflow-x: hidden`: los desbordes se recortan en
silencio y no producen barra de scroll. Ya se ha roto CSS tres veces en este repo por estimar
a ojo en vez de medir.

## 2. Architecture Analysis

### Data Model / Type Definitions

**Decisión 1 — dónde vive la prosa de la bio: `src/data/about.ts` (módulo TS de strings).**

Se descartan las otras dos opciones con motivo:

| Opción | Por qué no |
|---|---|
| Inline en `about.astro` | Es lo que hace `/contact`, pero deja el texto mezclado con el markup. En Fase 4 el diff de i18n tocaría la plantilla en vez de cambiar la fuente de datos. |
| Content collection (`src/content/bio/es.md`) | Obliga a añadir una colección a `content.config.ts`, un loader glob y render de Markdown para tres párrafos sin formato. Maquinaria que no gana nada (Regla 4 de Beck). Peor aún: la base de i18n de la PR #57 —**abierta, sin mergear**: `src/i18n/` no existe en el árbol de trabajo— **no usa colecciones**, usa diccionarios TS (`src/i18n/es.ts` / `en.ts` con el tipo `Translation`). Un `.md` obligaría a una segunda migración en Fase 4. |

`src/data/about.ts` funciona **standalone en main** (no importa nada de `src/i18n/`, que hoy solo
existe en la rama sin mergear) y tiene exactamente la forma que `es.ts` espera: objeto anidado
`as const` de strings. La migración de Fase 4 es mover el objeto bajo la clave `about:` de
`es.ts`, traducirlo en `en.ts` y cambiar el import de la página. Cero reestructuración.

**Regla estructural que hace barata esa migración**: `about.astro` es el único fichero que
importa `about.ts`. Los bloques de la página leen variables locales, no el módulo. Cuando llegue
la Fase 4, cambiar `import { about } from '../data/about'` por
`const about = getTranslation(getLocaleFromUrl(Astro.url)).about` es una línea. **La regla deja
de ser prosa**: el checkpoint de Fase 1 la comprueba con `grep` (ver más abajo).

Asimetría deliberada frente a `profile.ts`: `profile.ts` son **datos** y lo consumen varios
componentes; `about.ts` es **copy de una página** y solo la consume esa página.

```ts
// src/data/about.ts — NUEVO
/**
 * Copy de /about, en español. Fuente: plan/03-content-pages/about-copy-final-es.md
 * (aprobada). No editar aquí sin actualizar ese documento: es el contrato de contenido.
 *
 * Nota i18n (#38/#39): este objeto tiene la forma de un diccionario de `src/i18n/es.ts`
 * (PR #57, aún sin mergear). Cuando entre la Fase 4 se mueve tal cual bajo la clave `about:`
 * y `en.ts` lo traduce.
 *
 * RESTRICCIÓN DE FORMA (para que esa migración sea mecánica):
 *   - solo objetos planos anidados, strings y arrays de strings;
 *   - nada de funciones, placeholders de interpolación, imports ni datos derivados;
 *   - `bio` es una tupla de 3 párrafos: `en.ts` deberá tener exactamente 3.
 *
 * IMPORTADOR ÚNICO: solo `src/pages/about.astro` puede importar este módulo. Verificado en CI
 * manual con `grep -rn "data/about" src | grep -v "pages/about.astro"` (debe salir vacío).
 */
export const about = {
	/** Título de la pestaña. Vive aquí, no en la plantilla: es copy traducible como el resto. */
	title: 'Sobre mí — Luisa Benítez',
	metaDescription: '…', // frase SEO redactada, ver Contract Specifications C1
	eyebrow: 'Sobre mí',
	/** Párrafos verbatim de la copy aprobada. El orden es el orden de lectura. */
	bio: [
		'Si no encuentro la prenda…',   // ¶1 completo, ver Contract Specifications
		'Vengo del diseño de modas…',   // ¶2
		'Cada encargo pide algo distinto…', // ¶3
	],
	sections: { services: 'Servicios', featuredIn: 'Publicaciones' },
	/** Etiquetas de la <dl>. `travelNote` es un VALOR, no una etiqueta — de ahí el nombre. */
	details: { base: 'Base', languages: 'Idiomas', availability: 'Disponibilidad' },
	travelNote: 'Disponible para viajar',
	cta: { contact: 'Contacto', instagram: 'Instagram' },
	portraitAlt: 'Luisa Benítez al aire libre, leyendo una revista de moda',
} as const;
```

No se introducen tipos nuevos: `typeof about` basta. Nada de `interface AboutCopy` — sería una
abstracción sin segundo implementador (Regla 4).

### Data Flow

```
src/data/about.ts   ──┐
src/data/profile.ts ──┼──► src/pages/about.astro ──► BaseLayout (nav, footer, tokens, tema)
src/assets/portrait.webp ─┘        │
                                   └──► CvDownloadLink.astro (lee profile.cvPath)
```

**Estructura de la página (mobile-first, orden del DOM = orden visual en todos los anchos)**

```
<main class="about">
  <div class="portrait">   <Image ... />            ← a sangre, máscara de fundido abajo
  <div class="panel">                               ← columna única, medida estrecha
      <p class="eyebrow">Sobre mí</p>
      <h1 class="headline">Luisa Benítez</h1>
      <div class="bio">    <p>×3</p>                ← centro de gravedad
      <section class="rule"><h2 class="section-label">Servicios</h2>
                            <ul class="services" role="list">
      <section class="rule"><h2 class="section-label">Publicaciones</h2>
                            <ul class="wordmarks" role="list">
      <dl class="details rule">  Base / Idiomas / Disponibilidad
      <div class="ctas">    [CV condicional] Contacto → Instagram →
```

Tres decisiones semánticas ya cerradas por la revisión de accesibilidad:

- **Sin `<hr>`.** El filete divisorio pasa a `border-top` sobre el bloque siguiente (clase
  `.rule`). Un `<hr>` tiene rol implícito `separator` y se anuncia, lo que con los `<h2>` ya
  presentes es ruido redundante; además a `--gray-800` daba 1.19:1 en claro (prácticamente
  invisible). Un elemento menos y un problema de contraste menos.
- **`role="list"` explícito** en `.services` y `.wordmarks`. Es la excepción documentada a "no
  ARIA redundante": Safari/VoiceOver retira el rol `list` cuando se aplica `list-style: none`,
  y ahí se pierde el "lista de 5 elementos".
- **La `<dl>` tiene tres entradas, no dos.** "Base" y "Disponibilidad" van separadas en vez de
  unidas con `·`: el punto medio no se anuncia de forma fiable (unos lectores lo omiten, otros
  dicen "punto medio") y son dos hechos distintos. Ver C3.

**Sin componentes nuevos por sección.** La exploración proponía `<Portrait>`, `<Bio>`,
`<ServicesList>`, `<FeaturedInStrip>` y `<AboutFooter>`. Se descartan: cada uno tendría **un solo
consumidor**, ninguno encapsula lógica, y `<Portrait>` compartido con `/contact` sería una
abstracción con un parámetro por llamada (las máscaras y la geometría difieren). Regla 4 de Beck
(`.claude/rules/4-rules-of-simple-design-rules.md`): fuera lo que no sirve a las reglas 1-3.
`about.astro` queda como fichero único con `<style>` local, igual que `contact.astro` (395
líneas) — que es justo lo que hace que se lean como hermanas.

**La única extracción justificada**: `CvDownloadLink.astro` — y por un motivo distinto al que
decía la versión anterior de este plan, que era **factualmente falso**. Cerrar #10 no obliga a
tocar ninguna página: basta rellenar `profile.cvPath`, y la condición duplicada nunca necesitaría
edición. El motivo que sí se sostiene es la **selección de locale del PDF**: `profile.cvPath.es`
fija el idioma en el punto de uso, y en la Fase 4 hay que elegir el fichero según el locale de la
ruta. Con dos puntos de uso, esa lógica se escribe dos veces; centralizada, la Fase 4 toca un
fichero. Eso es duplicación real de conocimiento (Regla 3).

**Lo que la extracción NO elimina es el CSS, y esto es una trampa que ya se coló una vez**: los
`<style>` de Astro tienen ámbito por componente y el hash de scope no cruza el límite. Si `.cv`
vive solo dentro de `CvDownloadLink.astro`, los CTAs "Contacto" e "Instagram" de `about.astro`
—que reutilizan `class="cv"`— se entregarían **sin estilos**, y el fallo no saltaría en revisión
porque `cvPath` es `undefined` y el componente no renderiza nada. Ver la matriz de propiedad de
CSS en C4: cada regla tiene dueño escrito.

Coste adicional contabilizado: `contact.astro` tiene `.panel > * { width: 100%; max-width: 34rem }`
a ≥50em. El `<a>` que ahora vive en el componente hijo lleva otro hash y **deja de recibir esa
regla**. Impacto visual previsiblemente nulo (`.cv` es `inline-flex` con `align-self: flex-start`),
pero es exactamente lo que T013 debe **medir**, no mirar.

Riesgo visual hoy: cero, porque `cvPath` es `undefined` y el bloque no se renderiza en ninguna de
las dos páginas — por eso T013 lo prueba con un stub temporal.

**Comportamiento móvil, bloque a bloque** (móvil es el viewport dominante):

| Bloque | < 50em (móvil) | ≥ 50em |
|---|---|---|
| Retrato | ancho completo, `height: 38svh`, `min 16rem / max 26rem`, `object-position: 50% 22%`, máscara de fundido inferior 70%→100% — **idéntico a `/contact` móvil** | `height: 60svh`, `max-height: 34rem`, misma máscara |
| Panel | `padding: .5rem 1.5rem 3rem`, columna única | `margin-inline: auto`, `max-width: 34rem`, `padding: 1rem 1.5rem 5rem` |
| Bio | `--text-md` / `line-height: 1.75`, `gap: 1.25rem` entre párrafos | `--text-lg` / `line-height: 1.7`, `max-width: 32rem` (≈51ch) |
| Servicios | lista vertical, sin viñetas, `gap: .5rem` | igual (la medida estrecha ya la contiene) |
| Publicaciones | **una columna**, wordmarks apilados, sin separadores | grid `repeat(2, minmax(0,1fr))` |
| Datos | `grid-template-columns: 1fr`, 3 entradas | `repeat(2, minmax(0,1fr))` — copiado de `.details` de `/contact` |
| CTAs | columna, `gap: 1rem`, área táctil ≥44px vía `.ctas > :global(a) { padding-block: .5rem }` — el `:global()` es obligatorio para que alcance al `<a>` de `CvDownloadLink` | fila, `flex-wrap: wrap`, `gap: 2rem` |
| Nav | hamburguesa (8 ítems en vertical), `aria-current` con cue no cromático | fila completa solo a partir del breakpoint medido (ver Decisión 3) |

### Contract Specifications

#### C1 — Copy verbatim (contrato de contenido, NO reescribir)

Fuente: `plan/03-content-pages/about-copy-final-es.md`. Los tres párrafos van como una sola
línea de string cada uno (los saltos del documento fuente son de maquetación del `.md`, no del
texto). Copiar y **quitar solo los saltos de línea**, respetando guiones largos y tildes:

```ts
bio: [
  'Si no encuentro la prenda que tengo en la cabeza, la fabrico. He hecho guantes cortando medias y he puesto prendas del revés porque el corte original no caía como yo lo veía. Lo que imagino lo quiero ver, y busco la forma.',
  'Vengo del diseño de modas —me formé en Colombia antes de especializarme en estilismo y asesoría de imagen en España— y eso me dejó una manera concreta de mirar la ropa: entiendo cómo está construida una prenda, no solo cómo se ve. Llevo cuatro años trabajando en moda, primero en cine, después como asistente en agencia, y hoy de forma independiente. He trabajado en editoriales para Numéro Netherlands, Vogue Adria, GQ México y Mode Magazine, en campañas para Bruno Magli, Alaniz, Agatha Paris e YSL, y en cuatro desfiles, tres de ellos en Mercedes-Benz Fashion Week Madrid.',
  'Cada encargo pide algo distinto y no los trato igual. Una editorial admite maximalismo, capas, accesorios que pesan; una campaña pide que el producto sea el protagonista y que el estilismo sepa apartarse. Disfruto más la libertad de lo editorial, pero respeto el oficio de lo comercial y sé cuándo callarme. En los dos casos busco lo mismo: que el look se vea llevado como propio y no como un disfraz.',
],
```

`metaDescription` — **redactada, no extraída** (decisión de David). Las dos primeras frases del
¶1 son buena prosa de página pero mala descripción SEO: 172 caracteres (se trunca en SERP), sin
nombre, sin oficio, sin ubicación y sin ninguna de las cabeceras que dan autoridad. Es copy de
**metadatos**, no copy de página, así que redactarla no invade el contrato de contenido:

```ts
metaDescription: 'Luisa Benítez, estilista de moda en A Coruña. Editoriales para Numéro Netherlands, Vogue Adria y GQ México, campañas de marca, celebridades y asesoría de imagen.',
```

157 caracteres. Todos los hechos salen de la copy aprobada; no se afirma nada nuevo.
**Pendiente de aprobación de David antes del merge** (ver R3). Es un string en `about.ts`:
cambiarlo no mueve estructura.

Título de la pestaña: `about.title` = `'Sobre mí — Luisa Benítez'`. **Vive en `about.ts`, no en
la plantilla** — la versión anterior lo hardcodeaba en `<BaseLayout title="…">`, lo que contradice
el argumento con el que la Decisión 1 descarta el inline: el título de pestaña es copy traducible
exactamente igual que la `metaDescription`. Ruta canónica: `path="/about/"`.

**Titular (`<h1>`)**: `profile.name` → **"Luisa Benítez"**, decidido por David. Se trata
tipográficamente igual que el "Hablemos" de `/contact`. El eyebrow "Sobre mí" da el contexto de
página; el `<title>` lo refuerza.

⛔ **Prohibido añadir `aria-label="Sobre mí"` (ni ningún `aria-label`) al `<h1>`**: rompería la
coincidencia entre nombre accesible y texto visible (WCAG 2.5.3 Label in Name) y dejaría a los
usuarios de dictado sin poder referirse al encabezado que ven. Bajo 2.4.6 el patrón actual —
`<title>` + eyebrow — es aceptable.

#### C2 — `src/components/CvDownloadLink.astro` (nuevo)

```astro
---
// Sin props. El enlace es el mismo en todas las páginas; lo que decide si existe es el dato.
//
// Por qué vive aquí y no inline en cada página: `cvPath.es` fija el LOCALE del PDF en el punto
// de uso. En la Fase 4 (#39) habrá que elegir el fichero según el idioma de la ruta; con la
// selección centralizada eso es un cambio en un solo fichero.
// (No es por #10: cerrar #10 es rellenar `profile.cvPath`, sin tocar ninguna página.)
import { profile } from '../data/profile';
---
{profile.cvPath && (
  <a class="cv" href={profile.cvPath.es}>
    Descargar CV <span class="arrow" aria-hidden="true">&rarr;</span>
  </a>
)}
```

Estilos: ver la matriz de propiedad en **C4**. El componente es autocontenido —se lleva `.cv`,
`.cv .arrow`, hover/`:focus-visible` y su propio bloque `prefers-reduced-motion`— pero **eso no
exime a `about.astro` de redeclarar `.cv`** para sus otros dos CTAs.

#### C3 — Datos derivados en `about.astro`

```ts
const baseValue = `${profile.baseCity}, ${profile.baseRegion}`; // "A Coruña, España"
const languagesValue = profile.languages.join(', ');            // mismo separador que /contact
```

y en el markup, la `<dl>` con tres pares (`Base`, `Idiomas`, y `Disponibilidad` solo si
`profile.availableForTravel`, con valor `about.travelNote`).

**Nada de "Galicia".** La versión anterior escribía `${profile.baseCity}, Galicia` mientras
`contact.astro:39` renderiza `${profile.baseCity}, España`: dos páginas hermanas mostrando
regiones distintas del mismo dato. Y ambas lo hardcodeaban en la plantilla pese a que `profile.ts`
se declara fuente única de verdad (Regla 3, con divergencia ya real). Solución: **`baseRegion`
entra en `profile.ts`** (T002) y las dos páginas lo consumen (T004 lo aplica a `/contact`). Una
línea en cada sitio.

**Disponibilidad como entrada propia de la `<dl>`, no concatenada con `·`.** `/contact` la omite
a propósito (ver su comentario: es un estado volátil en un sitio estático); aquí sí aparece
porque la copy aprobada la incluye. Pero comprimir "A Coruña, España · Disponible para viajar"
en un solo `<dd>` mete dos hechos en un valor y el `·` no se anuncia de forma fiable.

#### C4 — Propiedad del CSS de los CTAs (contrato explícito, no "se copia y ya")

Los tres CTAs de `/about` comparten `class="cv"` pero **no comparten hoja de estilos**: uno vive
en `CvDownloadLink.astro` y dos en `about.astro`, y el ámbito de Astro no cruza el límite del
componente en ninguna dirección.

| Regla | Dueño | Nota |
|---|---|---|
| `.cv`, `.cv .arrow`, `.cv:hover`, `.cv:focus-visible`, `@media (prefers-reduced-motion)` para `.cv` | **`CvDownloadLink.astro`** | Copia verbatim de `contact.astro`. Autocontenido. |
| Las mismas reglas, **redeclaradas** | **`about.astro`** | Para `<a class="cv" href="/contact/">` y el de Instagram. Mismo criterio con el que ya se copian la máscara del retrato y `.details`. |
| `.ctas > :global(a) { padding-block: .5rem }` (área táctil ≥44px) | **`about.astro`** | El `:global()` **no es opcional**: sin él el padding no alcanza al `<a>` del componente hijo y el único CTA con destino de descarga sería el de menor área táctil. |
| Anillo de foco (abajo) | ambos | Cada uno en su `<style>`. |
| `.cv*` en `contact.astro` | **nadie** — se borran | Quedarían huérfanas (T004). |

Si algún día aparece un tercer consumidor del enlace-con-flecha, entonces sí procede extraer un
`ArrowLink.astro` (`href` + `label` + `external`) que `CvDownloadLink` componga. Hoy no.

**Anillo de foco propio y tokenizado** (sustituye a confiar en el del navegador):

```css
a:focus-visible { outline: 2px solid var(--gray-0); outline-offset: 3px; border-radius: 2px; }
```

Motivo: el único cue de foco de `.cv` era `color: var(--link-color)`. En tema claro
`--link-color` = `--gray-50` (#141925) y el reposo es `--gray-0` (#090b11): **1,12:1** entre
ambos, es decir, indistinguible. Hoy se salva por el anillo por defecto del UA, lo cual es
suerte, no diseño — y T014 exige "anillo visible en ambos temas", que tal como estaba habría
verificado el anillo del navegador. `--gray-0` sobre `--gray-999` es el máximo contraste en los
dos temas (≈13:1 claro, ≈16:1 oscuro) y se invierte solo con el tema. **No se toca
`--link-color`**: el problema no es que el color esté mal, es que un cambio de color no es un
indicador de foco.

#### C5 — `src/layouts/BaseLayout.astro`: `lang="es"`

```diff
- <html lang="en">
+ <html lang="es">
```

WCAG 3.1.1 Language of Page, **nivel A**. Todo el contenido del sitio está en español. Sin esto,
un lector de pantalla aplica fonética inglesa a la prosa española: en `/contact` son cuatro
etiquetas, en `/about` son tres párrafos completos y el resultado es ininteligible. Cero riesgo
de layout, cero coste de medición, una línea. Verificación: `document.documentElement.lang === 'es'`
(T011). Cuando llegue la Fase 4, este atributo pasa a derivarse del locale de la ruta — pero
"pendiente de un refactor futuro" no es motivo para dejar un fallo de nivel A en producción.

### Before/After Analysis

#### B1 — `src/data/profile.ts`

**Antes**
```ts
baseCity: 'A Coruña',
// (no existe baseRegion — cada página hardcodea la suya: /contact dice "España")
services: ['Estilismo editorial', 'Estilismo de campaña y lookbook', 'Vestuario de celebridades',
           'Asesoría de imagen', 'Personal shopping'],
/** TODO(H-5 / #12): confirmar lista definitiva con Luisa. */
featuredIn: ['Vogue Adria', 'Numéro', 'GQ México', 'Mode Magazine', 'Fucking Young'],
```

**Después**
```ts
baseCity: 'A Coruña',
/** Región/país mostrado junto a `baseCity`. Vivía hardcodeado en contact.astro; las páginas
 *  deben componerlo como `${profile.baseCity}, ${profile.baseRegion}`. */
baseRegion: 'España',
/** Redacción cerrada en plan/03-content-pages/about-copy-final-es.md. */
services: ['Estilismo editorial', 'Estilismo de campaña y colaboraciones de marca',
           'Estilismo para celebridades y eventos', 'Asesoría de imagen', 'Personal shopper'],
/**
 * TODO(H-5 / #12): "Fucking Young" fuera — es el único de la lista sin proyecto que lo
 * respalde en src/content/. Si se confirma la colaboración y el rol, se restaura junto con
 * el proyecto, no antes.
 */
featuredIn: ['Numéro Netherlands', 'Vogue Adria', 'GQ México', 'Mode Magazine'],
```

**Por qué**: "lookbook" es una categoría eliminada en la IA v2 y "Personal shopping" no era la
redacción aprobada. El orden de `featuredIn` pasa a ser el de la copy aprobada, y "Numéro" se
precisa a "Numéro Netherlands" para coincidir con la bio. Ningún otro fichero del repo lee
`services` ni `featuredIn` (verificado por grep), así que el cambio no puede romper otra página.
`baseRegion` es nuevo: elimina el hardcode de la región y evita que `/about` y `/contact`
diverjan (ver C3). Único consumidor previo del dato: `contact.astro:39`, que T004 migra.

#### B2 — `src/components/Nav.astro`

**Decisión 3 — dónde va `/about` en el nav: penúltima, entre "Runway" y "Contacto".**
Etiqueta **"Sobre mí"**, no "About": el nav está en español (Inicio, Publicidad, Celebridades…) y
una palabra en inglés entre las otras siete canta.

Motivo de la posición: los seis primeros enlaces son el producto (inicio + las cinco categorías
de trabajo) y ya tienen memoria muscular; "Sobre mí" y "Contacto" forman la cola personal
—quién es y cómo llegar a ella—. Meterla en la posición 2 empujaría todas las categorías y es un
cambio de jerarquía que no toca a este trabajo. **Nada más se toca del nav: #53 es dueño del
rediseño.**

**Antes**: `textLinks` con 7 entradas; `@media (min-width: 78em)` + `matchMedia('(min-width: 78em)')`.
**Después**: 8 entradas, con `{ label: 'Sobre mí', href: '/about/' }` insertada antes de Contacto.

**Riesgo medido, no estimado**: el comentario del propio fichero dice que 78em (1248px) es el
ancho **medido** al que caben exactamente 7 enlaces, y que por debajo el nav recorta en silencio
(`body { overflow-x: hidden }`). Un octavo enlace consume ancho. T011 mide el `right` de
`.nav-items` y de `.menu-footer` contra `window.innerWidth` en el rango 1200–1920px; si recorta,
**se sube la constante del breakpoint al valor medido — en los dos sitios a la vez** (el `@media`
del `<style>` y el `matchMedia` del `<script>`, que el fichero exige mantener sincronizados). No
se reduce el tamaño de fuente ni el tracking: ya se probó y fue lo que reintrodujo el recorte.

**Dos correcciones de foco que el octavo enlace vuelve necesarias** (no son rediseño; #53 sigue
siendo dueño del resto):

```diff
  /* dentro de @media (min-width: 78em), líneas ~405-408 */
- .link:hover,
- .link:focus {
+ .link:hover,
+ .link:focus-visible {
    color: var(--gray-0);
-   font-weight: 800;
+   outline: 2px solid var(--gray-0);
+   outline-offset: 4px;
  }
```

Motivo doble. (a) `:focus` dispara con el ratón: quien hace clic se come el cambio de estado.
(b) `font-weight: 800` **ensancha el ítem**, y con 8 enlaces en `flex-wrap: nowrap` +
`overflow-x: hidden`, enfocar el último puede empujar el nav fuera del viewport justo en el ancho
crítico. R1 mide el nav en reposo; nadie medía el estado enfocado (T011 lo añade). Un `outline`
se pinta fuera del flujo y no provoca reflow. El `font-weight: 800` **se conserva** en
`.link[aria-current='page']`, que no cambia en runtime.

Tercera corrección, en el bloque móvil: `aria-current` con **cue no cromático**. Hoy
`.link[aria-current] { color: var(--gray-0) }` es exactamente el color de reposo — en escritorio
se distingue por el peso, pero en móvil (el viewport dominante, y donde caen los 8 ítems) la
página actual es visualmente indistinguible:

```css
.nav-items .link[aria-current='page'] {
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: .35em;
}
```

**No entra aquí** (detectado, anotado para #53): el botón del hamburguesa no tiene
`aria-controls`, no cierra con `Escape`, y el panel `position: absolute` puede dejar el foco
tapado al tabular más allá del último ítem (WCAG 2.2 §2.4.11 Focus Not Obscured, AA). Los `.link`
del panel miden ~24px de alto: pasan 2.5.8 (AA) pero no 2.5.5 (AAA).

#### B3 — `src/pages/contact.astro`

**Antes**: bloque `{profile.cvPath && (<a class="cv" …>)}` inline + reglas `.cv*` en su `<style>`;
línea 39: `{ label: "Base", value: \`${profile.baseCity}, España\` }`.
**Después**: `import CvDownloadLink from '../components/CvDownloadLink.astro'` y `<CvDownloadLink />`
en el mismo punto del markup; las reglas `.cv*` se borran de su `<style>` (quedarían huérfanas);
línea 39 pasa a `\`${profile.baseCity}, ${profile.baseRegion}\`` — mismo texto renderizado, sin
hardcode.
**Por qué**: ver la decisión de `CvDownloadLink` en Data Flow y C3. Sin impacto visual hoy
(`cvPath` es `undefined` y "España" no cambia), pero `/contact` está verificada y se vuelve a
medir igualmente (T011), con atención al `.panel > *` que el `<a>` del componente hijo pierde.

#### B4 — Decisión 2: cómo se renderiza la tira de "Publicaciones" → **wordmarks de texto**

Sin logos, y no como parche: #12 (H-5) sigue abierto porque Luisa no ha entregado ningún
SVG/logo. Además el propio design-handoff lo pide así — *"rendered as wordmarks in the site's
display font, evenly spaced — looks editorial, no logo zoo"*. Cuatro logos de cuatro cabeceras,
en rásters de calidades distintas y con permisos de marca sin resolver, se verían peor que cuatro
palabras en Bebas Neue.

Render: `<ul>` con un `<li>` por cabecera, `--font-brand`, mayúsculas, `letter-spacing: .08em`,
color `--gray-0`. **Sin separadores `·`**: el `·` del documento de copy es una pista de
maquetación, no texto. Un separador entre ítems que hacen wrap deja un punto colgando al
principio de la línea siguiente; medido a 360px la tira completa no cabe en una línea
(≈490px de texto contra 312px útiles). Por eso: una columna en móvil, dos a partir de 50em —
exactamente el mismo comportamiento que `.details` de `/contact`.

## Team Selection

| Skill | Reason for Selection |
|-------|---------------------|
| `web-accessibility-advisor` | Dominio directo ("WCAG 2.1 AA, ARIA, keyboard navigation, screen readers"). La página introduce jerarquía de encabezados nueva (`h1` + `h2` de sección), una `<dl>`, enlaces externos con aviso de pestaña nueva, un octavo ítem en el menú hamburguesa y contraste de tokens en dos temas. Foco pedido: T006 (estructura semántica y contraste de `--gray-100` sobre `--gray-999` en claro/oscuro), T007/T008 (CTAs: área táctil, `:focus-visible`, texto de enlace autoexplicativo), T009 (nav: 8 ítems, `aria-current`, orden de foco) y `prefers-reduced-motion` en T003/T007. **Consultado — ver `## Advice Received`.** |
| `architect-advisor` | Overlap parcial pero real con "layered design": la decisión central del plan es dónde se corta la costura entre contenido y presentación (`src/data/about.ts` vs. content collection vs. inline) y qué sobrevive a la migración de i18n de Fase 4. Foco pedido: validar la Decisión 1 (Data Model), la regla de que solo `about.astro` importa `about.ts`, y la decisión de no crear los cinco componentes que proponía la exploración frente a extraer solo `CvDownloadLink` (Reglas 3 y 4 de Beck). |

**Descartados, con motivo:**

- `component-advisor` — su descripción es "**React** component design patterns — composition,
  hooks, state management, performance". No hay React en el proyecto: `package.json` solo declara
  `astro`, `tailwindcss` y las fuentes; no hay hooks ni estado de cliente en este cambio.
- `frontend-test-advisor` — "React Testing Library, Vitest/Jest, Cypress e2e". El repo no tiene
  runner de tests ni ninguna de esas dependencias, y montar infraestructura de test no está en el
  alcance. La verificación equivalente aquí es medición en Chromium headless (Fase 4 de tareas).
- `unit-test-advisor` — "**Domain** unit test patterns: test structure, mocking strategies, test
  data builders, Given-When-Then". No hay lógica de dominio que testear: el cambio son strings
  estáticos, markup y CSS. No hay ramas de negocio, solo un condicional de render (`cvPath`) que
  se verifica en navegador (T013).

## Advice Received

### Ronda 1 — `architect-advisor` (engram #109)

| Recomendación | Estado |
|---|---|
| Decisión 1 (`about.ts`) y el rechazo de los 5 componentes están bien calibrados — no tocar | **Aceptado**: sin cambios en esas dos decisiones. |
| **Major** — los CTAs `class="cv"` de `about.astro` quedarían sin estilos (scope de Astro) | **Integrado**: contrato C4 con matriz de propiedad de CSS; T007 redeclara `.cv`. |
| **Major** — C3 decía "Galicia" contra el "España" de `contact.astro:39` | **Integrado (David)**: `baseRegion: 'España'` en `profile.ts` (T002), consumido por las dos páginas (T004, T006). |
| **Major** — `title` de pestaña hardcodeado en la plantilla | **Integrado**: `about.title` en `about.ts`; `<BaseLayout title={about.title}>`. |
| **Major** — la justificación de T003 era falsa (#10 no obliga a tocar páginas) | **Integrado**: reescrita en Data Flow y en la cabecera de C2; el motivo real es la selección de locale del PDF en Fase 4. Coste de la extracción (`.panel > *` perdido) anotado y medido en T013. |
| Minor — forma de `about.ts` frente al tipo `Translation` de PR #57 | **Integrado**: restricción de forma documentada en la cabecera del módulo, incluida la tupla de 3 párrafos. |
| Minor — la regla de importador único era prosa sin verificación | **Integrado**: checkpoint Fase 1 con `grep -rn "data/about" src \| grep -v "pages/about.astro"` vacío. |
| Minor — `details.travel` es un valor bajo un objeto de etiquetas | **Integrado**: renombrado a `about.travelNote`, fuera de `details`. |
| Minor — línea 53 afirmaba que la PR #57 está mergeada | **Corregido**: "en la PR #57, sin mergear"; verificado que `src/i18n/` no existe en el árbol. |
| Minor — duplicación de etiquetas UI ("Base"/"Idiomas"/"Sobre mí" en varios sitios) | **Aceptado como deuda consciente**: Regla 2 > Regla 3 a esta escala. Anotado en R11 para la Fase 4. |

### Ronda 1 — `web-accessibility-advisor` (engram #110)

| Recomendación | Estado |
|---|---|
| **Critical** — `<html lang="en">` con prosa en español (WCAG 3.1.1, nivel A) | **Integrado (David)**: entra en alcance como **T005**, tarea propia con verificación propia. Ya no es R10 "fuera de alcance". Contrato C5. |
| **Major** — foco de `.cv` a 1,12:1 en tema claro | **Integrado**: anillo propio tokenizado en C4 (`outline: 2px solid var(--gray-0); outline-offset: 3px`), aplicado en T007. |
| **Major** — scope de Astro y los tres CTAs; `padding-block` que no alcanza al hijo | **Integrado**: C4 fija dueño por regla; `.ctas > :global(a)` para el área táctil; T012 mide la altura de los tres. |
| **Major** — nav: `:focus` en vez de `:focus-visible`, y `font-weight: 800` que ensancha | **Integrado (David)**: B2 y T009; el peso se queda solo en `[aria-current='page']`. |
| **Major** — falta WCAG 1.4.12 Text Spacing en la matriz | **Integrado**: pasada de text-spacing en T011. |
| Minor — `role="list"` en `.services` y `.wordmarks` | **Integrado** (T006). |
| Minor — `<hr>` redundante y a 1,19:1 en claro | **Integrado, y mejor**: se elimina el `<hr>`; el filete pasa a `border-top` en el bloque siguiente. Un elemento menos. |
| Minor — el `<dd>` de "Base" comprime dos hechos con `·` | **Integrado**: la `<dl>` pasa a tres entradas (C3). |
| Minor — `aria-current` sin cue no cromático en el menú móvil | **Integrado** (T009, bloque móvil). |
| Minor — skip link, `aria-controls`, cierre con `Escape`, foco bajo el panel | **Rechazado aquí, anotado (David)**: son del nav, y #53 es su dueño. Quedan registrados en el Overview y en R10 como "detectado, fuera de alcance" — no omitidos en silencio. |
| No añadir `aria-label` al `<h1>` | **Aceptado**: prohibición explícita en C1. |
| Ampliar el guion de verificación (volcado de encabezados, capturas de foco, `lang`) | **Integrado**: T011, T012 y T014. |

## 3. Implementation Tasks

## Fase 1: Datos y piezas compartidas

**Objetivo**: dejar el contenido y el enlace de CV en su sitio antes de escribir la página.

- [X] T001 Crear el módulo de copy de /about — src/data/about.ts

**Details for T001**: Estructura exacta en Contract Specifications C1 + Data Model. Objeto
`export const about = { … } as const`. Los tres párrafos van **verbatim** desde
`plan/03-content-pages/about-copy-final-es.md` (cada uno como un único string sin saltos de
línea). Incluir la cabecera de comentario que señala el documento fuente como contrato y la nota
de i18n (#38/#39). Nada de tipos nuevos, nada de helpers.

- [X] T002 Actualizar servicios, publicaciones y añadir baseRegion — src/data/profile.ts

**Details for T002**: Ver Before/After B1. `services` → los 5 ítems con la redacción aprobada;
`featuredIn` → 4 ítems, sin "Fucking Young", "Numéro" → "Numéro Netherlands", en el orden de la
copy. Añadir `baseRegion: 'España'` justo debajo de `baseCity`, con el comentario que dice que
las páginas deben componer `${profile.baseCity}, ${profile.baseRegion}` en vez de hardcodear.
Actualizar el comentario `TODO(H-5 / #12)` para que explique la baja. No tocar `cvPath`,
`linkedin`, `email` ni `baseCity`.

- [X] T003 Crear el enlace de descarga de CV condicional — src/components/CvDownloadLink.astro

**Details for T003**: Markup y estilos en Contract Specifications C2 + matriz de propiedad C4.
Sin props. Los estilos que le tocan (`.cv`, `.cv .arrow`, hover/`:focus-visible` y el bloque
`prefers-reduced-motion`) se mueven **verbatim** desde `contact.astro`; no cambiar ni un valor ni
la duración de la transición, salvo añadir el anillo de foco tokenizado de C4. La cabecera de
comentario debe decir que el motivo de la extracción es la **selección de locale del PDF** de
cara a la Fase 4 — no "#10 obligaría a tocar dos sitios", que es falso.

- [X] T004 Consumir CvDownloadLink y baseRegion en Contacto — src/pages/contact.astro

**Details for T004**: Ver Before/After B3. (a) Sustituir el bloque
`{profile.cvPath && (<a class="cv"…)}` por `<CvDownloadLink />` en la misma posición del markup y
borrar las reglas `.cv*` del `<style>` (incluidas las de `@media (min-width: 50em)` en ~389-390 y
la mención a `.cv` dentro de `@media (prefers-reduced-motion: reduce)`, dejando ahí
`.channel-value`). (b) Línea 39: `value: \`${profile.baseCity}, España\`` →
`value: \`${profile.baseCity}, ${profile.baseRegion}\``. El texto renderizado es idéntico. Nada
más de `contact.astro` se toca.

- [X] T005 Declarar el idioma del documento — src/layouts/BaseLayout.astro

**Details for T005**: Contract Specifications C5. Línea 25: `<html lang="en">` → `<html lang="es">`.
Es **toda** la tarea: no se toca ninguna otra línea del layout. Va como tarea propia y no
escondida dentro de otra porque (a) es un arreglo WCAG de **nivel A** que afecta a todo el sitio,
no solo a `/about`, y (b) David debe verlo explícitamente al revisar el diff. Verificación en
T011 (`document.documentElement.lang === 'es'`) y regresión visual cero por construcción.

**Checkpoint Fase 1**
- [ ] `pnpm build` termina sin errores ni warnings de TypeScript.
- [ ] `grep -n "lookbook\|Personal shopping\|Fucking Young" src/data/profile.ts` no devuelve nada.
- [ ] Los tres párrafos de `about.ts` coinciden carácter a carácter con el documento de copy
      (comparación manual, incluidos guiones largos «—» y la «e» de "e YSL").
- [ ] `grep -rn "class=\"cv\"\|\.cv" src/pages/contact.astro` no devuelve nada.
- [ ] `grep -rn "Galicia\|, España" src/pages src/components` no devuelve ningún hardcode de
      región (solo el literal de `profile.ts`).
- [ ] **Regla de importador único**: `grep -rn "data/about" src | grep -v "pages/about.astro"`
      devuelve vacío. (En Fase 1 devuelve vacío porque la página aún no existe; se vuelve a
      ejecutar en el checkpoint de Fase 4, que es donde tiene valor.)
- [ ] `grep -n "<html lang" src/layouts/BaseLayout.astro` devuelve `lang="es"`.

---

## Fase 2: La página

**Objetivo**: `/about` renderiza la copy aprobada y se lee como hermana de `/contact`.

**Prueba independiente**: `http://localhost:4321/about/` muestra retrato, eyebrow, titular, tres
párrafos, servicios, publicaciones, datos y CTAs, en claro y en oscuro.

- [X] T006 Crear la página con su frontmatter y markup — src/pages/about.astro

**Details for T006**: Frontmatter: importar `Image` de `astro:assets`, `portrait` de
`../assets/portrait.webp`, `BaseLayout`, `CvDownloadLink`, `profile` y `about`; derivar
`baseValue` y `languagesValue` según Contract Specifications C3.
`<BaseLayout title={about.title} description={about.metaDescription} path="/about/">` — el título
sale de `about.ts`, **no se hardcodea en la plantilla**. Estructura del `<main>` en Data Flow.
Detalles que no son opcionales:
- `<Image src={portrait} alt={about.portraitAlt} widths={[600, 900, 1200]} sizes="(min-width: 50em) 34rem, 100vw" loading="eager" fetchpriority="high" />`.
- Encabezados reales: `<h1 class="headline">` para el nombre y `<h2 class="section-label">` para
  "Servicios" y "Publicaciones" (no `<span>`: la página tiene que ser navegable por encabezados).
  **Sin `aria-label` en el `<h1>`** (C1): el nombre accesible debe ser el texto visible.
- `<ul class="services" role="list">` y `<ul class="wordmarks" role="list">` — el `role` explícito
  es obligatorio porque ambas llevan `list-style: none` y VoiceOver retira el rol.
- `<dl class="details">` con **tres** pares: `Base` → `baseValue`; `Idiomas` → `languagesValue`;
  y, si `profile.availableForTravel`, `Disponibilidad` → `about.travelNote`. Nada de unir Base y
  disponibilidad con `·` en un solo `<dd>`.
- CTAs: `<CvDownloadLink />`, `<a class="cv" href="/contact/">`, y el de Instagram con
  `target="_blank" rel="noopener noreferrer"` + `<span class="sr-only"> (se abre en una pestaña nueva)</span>`,
  copiando el patrón de `contact.astro`.
- **Sin `<hr>`**: el divisor fino que pide el design-handoff se logra con `border-top` sobre el
  bloque siguiente (clase `.rule` en `<section>` y en la `<dl>`). Evita un rol `separator`
  redundante junto a los `<h2>`.

- [X] T007 Escribir los estilos base (móvil) — src/pages/about.astro

**Details for T007**: Mobile-first: todo fuera de media queries es el estado móvil. Valores de
la tabla de Data Flow. Tokens de color, sin excepciones —la rampa de grises del DS es azulada y
los pasos intermedios (`--gray-300`, `--gray-400`) se ven literalmente azules—:
`.headline` → `--gray-0`; `.eyebrow`, `.section-label`, `.detail-label` → `--gray-100`;
`.bio p`, `.services li`, `.detail-value` → `--gray-50`; `.wordmarks li` → `--gray-0`;
`.rule` → `border-top: 1px solid var(--gray-700); padding-block-start: 2rem; margin-block-start: 2rem`.
`--gray-700` en vez de `--gray-800`: este último da 1,19:1 sobre `--gray-999` en tema claro y es
prácticamente invisible. **Prohibido** usar `--gray-200`…`--gray-600` para texto o filetes.

**CSS de los CTAs — leer C4 antes de escribir nada.** Esta tarea es donde se cae el plan si se
despista: `about.astro` **redeclara** `.cv`, `.cv .arrow`, `.cv:hover`, `.cv:focus-visible` y su
`@media (prefers-reduced-motion: reduce)`, copia verbatim de `contact.astro`. Los `<style>` de
Astro tienen ámbito por componente: las reglas de `CvDownloadLink.astro` **no** alcanzan a los
enlaces de Contacto e Instagram de esta página. Y el área táctil va como
`.ctas > :global(a) { padding-block: .5rem }` — sin `:global()` no llega al `<a>` del componente
hijo. Anillo de foco tokenizado de C4 (`outline: 2px solid var(--gray-0); outline-offset: 3px;
border-radius: 2px`) sobre `a:focus-visible`, en esta página **y** en el componente.
Tipografía: `.eyebrow` y `.section-label` = `--font-brand`, `--text-sm`, `letter-spacing: .25em`,
mayúsculas (el `.eyebrow` a `--text-base` como en `/contact`); `.headline` = `--font-brand`,
`clamp(3.5rem, 15vw, 8rem)`, `line-height: .9`, `letter-spacing: .02em`, mayúsculas;
`.bio p` = fuente de cuerpo, `--text-md`, `line-height: 1.75`; `.wordmarks li` = `--font-brand`,
`--text-lg`, `letter-spacing: .08em`, mayúsculas.
La máscara del retrato se copia tal cual del `/contact` móvil (fundido inferior 70%→100%, con
prefijo `-webkit-mask-image` además de `mask-image`).

- [X] T008 Añadir el bloque responsive de escritorio — src/pages/about.astro

**Details for T008**: Un solo breakpoint, `@media (min-width: 50em)` (el del sistema de diseño).
Cambios: `.panel { margin-inline: auto; max-width: 34rem; padding: 1rem 1.5rem 5rem }`;
`.portrait img { height: 60svh; max-height: 34rem }`; `.bio p { font-size: var(--text-lg); line-height: 1.7; max-width: 32rem }`;
`.details`, `.wordmarks { grid-template-columns: repeat(2, minmax(0, 1fr)) }`;
`.ctas { flex-direction: row; flex-wrap: wrap; gap: 2rem }`;
`.eyebrow`, `.section-label`, `.detail-label { font-size: var(--text-base) }`;
`.detail-value { font-size: var(--text-md) }`.
Cerrar con `@media (prefers-reduced-motion: reduce)` anulando las transiciones de los enlaces.
**No** replicar el layout de dos columnas de `/contact`: aquella cabe en un viewport, esta
scrollea; la hermandad la dan tipografía y tokens, no la rejilla.

**Checkpoint Fase 2**
- [ ] `/about/` renderiza los 3 párrafos completos, 5 servicios, 4 publicaciones y 3 entradas
      en la `<dl>` (Base / Idiomas / Disponibilidad).
- [ ] El titular no desborda a 360px (medido, ver T012).
- [ ] Ningún `--gray-200`…`--gray-600` aparece en el `<style>` de la página.
- [ ] El bloque de CV no aparece (porque `profile.cvPath` es `undefined`) y no deja hueco.
- [ ] El `<style>` de `about.astro` contiene reglas `.cv` propias (si no, los CTAs de Contacto e
      Instagram están sin estilos — ver C4), y el área táctil usa `:global(a)`.
- [ ] `grep -n "<hr" src/pages/about.astro` no devuelve nada.
- [ ] `grep -n "aria-label" src/pages/about.astro` no devuelve nada en el `<h1>`.

---

## Fase 3: Navegación

- [X] T009 Añadir "Sobre mí" y corregir los estados de foco del menú — src/components/Nav.astro

**Details for T009**: Ver Before/After B2. Tres cambios, ninguno más (#53 es dueño del rediseño):

1. Insertar `{ label: 'Sobre mí', href: '/about/' }` en `textLinks` entre Runway y Contacto.
2. Dentro de `@media (min-width: 78em)` (líneas ~405-408): `.link:hover, .link:focus` →
   `.link:hover, .link:focus-visible`, y **quitar `font-weight: 800` del estado de foco**,
   sustituyéndolo por `outline: 2px solid var(--gray-0); outline-offset: 4px`. Motivo: `:focus`
   dispara con el ratón, y el cambio de peso ensancha el ítem — con 8 enlaces en `nowrap` +
   `overflow-x: hidden`, enfocar el último puede empujar el nav fuera del viewport. El `outline`
   se pinta fuera del flujo y no provoca reflow. El `font-weight: 800` se **conserva** en
   `.link[aria-current='page']` (líneas ~410-411 y ~443), que no cambia en runtime.
3. En el bloque móvil, cue no cromático para la página actual:
   `.nav-items .link[aria-current='page'] { font-weight: 800; text-decoration: underline; text-underline-offset: .35em }`.
   Hoy `.link[aria-current] { color: var(--gray-0) }` es el mismo color que el reposo, así que en
   móvil —donde caen los 8 ítems— la página actual es indistinguible.

Y lo que exija T011: si la medición muestra recorte, subir el valor del breakpoint **en los dos
sitios** (`@media (min-width: 78em)` del `<style>` y `window.matchMedia('(min-width: 78em)')` del
`<script>`, línea ~152) al ancho medido, redondeado hacia arriba a `em` enteros, y actualizar el
comentario de las líneas ~339-342 que documenta la medición con el nuevo número y el motivo
(8 enlaces). **Prohibido** reducir `font-size` o `letter-spacing`: ya se probó y reintrodujo el
recorte.

**Checkpoint Fase 3**
- [X] "Sobre mí" aparece en el menú de escritorio y en el hamburguesa.
- [X] Estando en `/about/`, ese enlace lleva `aria-current="page"` y el resto no; en móvil se
      distingue por subrayado + peso, no solo por color.
- [X] `grep -n "\.link:focus[^-]" src/components/Nav.astro` no devuelve nada (todo es
      `:focus-visible`).
- [X] Ningún estado de `:hover`/`:focus-visible` del nav cambia `font-weight`.
- [X] `@media` del `<style>` y `matchMedia` del `<script>` tienen el mismo valor.

---

## Fase 4: Verificación medida en navegador (bloqueante)

**Objetivo**: probar con números que no hay desbordes ni regresiones. Sin esto la tarea no está
hecha: `body { overflow-x: hidden }` recorta en silencio, y este proyecto ya ha entregado CSS
roto tres veces por estimar a ojo.

- [X] T010 Preparar el arnés de medición — {scratchpad}/measure-about.mjs

**Details for T010**: Servidor de desarrollo en `localhost:4321` (`pnpm dev`, dejarlo corriendo).
En el directorio de scratchpad: `npm i playwright-core` y lanzar con
`CHROME=~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome node measure-about.mjs`.
Patrón (probado en este repo):
```js
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: process.env.CHROME });
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto('http://localhost:4321/about/', { waitUntil: 'load' });
// tema: p.evaluate(() => document.documentElement.classList.add('theme-dark')) — o quitarla
const r = await p.evaluate(() => {
  const over = (sel) => [...document.querySelectorAll(sel)]
    .map(el => Math.round(el.getBoundingClientRect().right) - window.innerWidth)
    .filter(x => x > 0);
  return { overflow: over('main *, nav *'),
           hScroll: document.documentElement.scrollWidth - window.innerWidth,
           bioWidth: document.querySelector('.bio p').getBoundingClientRect().width,
           font: getComputedStyle(document.querySelector('.bio p')).fontSize };
});
```
Comparar contra `window.innerWidth`, **nunca** contra la presencia de barra de scroll.

- [X] T011 Medir la matriz completa: anchos, temas, text-spacing y foco del nav — {scratchpad}/measure-about.mjs

**Details for T011**: Cuatro pasadas. Criterio de fallo idéntico en todas: **cualquier** valor > 0
de desborde. Dejar la tabla de medidas en el reporte de la fase.

1. **Base**: anchos **360, 390** (móvil, el viewport dominante), 800, 1024, **1248**, 1440, 1920;
   temas claro y oscuro en cada ancho (alternando la clase `theme-dark` en `<html>`); rutas
   `/about/` y `/contact/` (regresión por T004). Registrar desbordes por elemento,
   `scrollWidth - innerWidth`, alto del nav y `right` de `.nav-items` y `.menu-footer`.
2. **Text Spacing (WCAG 1.4.12, AA)** — pasada nueva. Un nav `nowrap` con `letter-spacing` fijo y
   `overflow-x: hidden` es el caso de libro de este criterio: si el usuario fuerza su hoja de
   estilos, el contenido se recorta en silencio. Inyectar y volver a medir desbordes en 360, 390,
   1248 y 1440:
   ```js
   await p.addStyleTag({ content: `* { letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important }` });
   ```
3. **Nav con foco** — pasada nueva. A 1248 y 1440, en claro y oscuro, enfocar **cada uno** de los
   8 enlaces (`el.focus()`) y medir el `right` de `.nav-items` con el ítem enfocado. Es lo que
   T009 previene al quitar el `font-weight: 800` del foco; nadie lo estaba midiendo.
4. **`.panel > *` perdido en `/contact`** (coste contabilizado de la extracción de
   `CvDownloadLink`): a ≥50em, con el stub de T013 activo, comparar `getBoundingClientRect()` del
   `.cv` de `/contact` antes y después del cambio.

Si el nav recorta en cualquiera de las pasadas, aplicar el ajuste de breakpoint descrito en T009
y volver a medir **la matriz entera**, no solo el ancho que falló.

- [X] T012 Comprobar hamburguesa, legibilidad móvil y área táctil — {scratchpad}/measure-about.mjs

**Details for T012**: A 360×640 y 390×844: abrir el menú (click en `.menu-button`) y verificar
que los 8 enlaces son alcanzables sin desborde horizontal y que el panel no tapa contenido de
forma irrecuperable. Con el menú abierto, tabular hasta el final y comprobar que el foco no queda
bajo el panel absoluto (WCAG 2.2 §2.4.11 — si falla, se anota para #53, no se arregla aquí).
Medir además:
- ancho de línea de `.bio p` (debe caber en el viewport menos el padding);
- que `.headline` no desborda con "Luisa Benítez" a `15vw`;
- **`getBoundingClientRect().height >= 44` de los tres CTAs** (`Descargar CV` con el stub de T013,
  `Contacto`, `Instagram`). Medido, no deducido del `padding-block`: el del componente hijo solo
  lo recibe si el `:global()` de C4 está bien puesto.

- [X] T013 Verificar el CTA de CV con un stub temporal — src/data/profile.ts

**Details for T013**: `profile.cvPath` es `undefined`, así que el enlace no se renderiza nunca y
el camino quedaría sin probar — y con él, el fallo de estilos de C4, que es invisible mientras el
componente no pinte nada. **Localmente y sin commitear**: poner
`cvPath: { es: '/cv/x.pdf', en: '/cv/x.pdf' }`, comprobar **midiendo** (no mirando) que el enlace
aparece en `/about/` **y** en `/contact/` con la misma caja, tipografía y color en ambos temas, y
**revertir el fichero** (`git checkout -- src/data/profile.ts`) antes de continuar. El checkpoint
incluye confirmar que el diff final no contiene el stub.

- [X] T014 Repasar accesibilidad con teclado, encabezados e idioma — src/pages/about.astro

**Details for T014**: Guion, con volcados en vez de inspección a ojo:
- `Tab` recorre nav → enlaces de la página → footer en orden lógico; **capturar pantalla del
  estado enfocado** de los 3 CTAs y de los 8 enlaces del nav, en claro **y** en oscuro. El anillo
  que debe verse es el de C4 (`--gray-0`), no el del navegador.
- Volcar el árbol de encabezados:
  `[...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ' ' + h.textContent.trim())`
  → un solo `h1` (el nombre), `h2` para Servicios y Publicaciones, sin saltos de nivel.
- `document.documentElement.lang === 'es'` (verificación de T005 / C5), en `/about/` y en al menos
  otra página del sitio.
- El nombre accesible del `<h1>` coincide con su texto visible (sin `aria-label`).
- El enlace de Instagram anuncia la pestaña nueva y el `alt` del retrato es `about.portraitAlt`.
- `.services` y `.wordmarks` se exponen como listas de 5 y 4 elementos.

**Checkpoint Fase 4**
- [X] Cero desbordes (> 0px) en 360/390/800/1024/1248/1440/1920, en claro y en oscuro, en
      `/about/` y en `/contact/`.
- [X] `scrollWidth - innerWidth === 0` en todos esos anchos.
- [X] Cero desbordes también con la hoja de text-spacing de 1.4.12 aplicada.
- [X] Con cada uno de los 8 enlaces del nav enfocado, `right` de `.nav-items` ≤ `innerWidth` a
      1248 y 1440.
- [X] El nav no recorta a partir de su breakpoint y por debajo cae al hamburguesa con 8 ítems.
- [X] Con el stub de `cvPath`, el enlace aparece en las dos páginas con la misma caja medida;
      el stub no está en el diff.
- [X] Los tres CTAs de `/about` miden ≥44px de alto.
- [X] Orden de tabulación correcto y anillo de foco propio visible en ambos temas; `h1` → `h2`
      sin saltos; `document.documentElement.lang === 'es'`.
- [X] `grep -rn "data/about" src | grep -v "pages/about.astro"` devuelve vacío (regla de
      importador único, ahora que la página existe).
- [X] `pnpm build` limpio y `/about/` presente en el sitemap generado.

---

## Dependencies & Execution Order

### Dependencias entre fases

- **Fase 1 (datos y piezas compartidas)**: sin dependencias externas. Bloquea la Fase 2
  —`about.astro` importa `about.ts`, `profile.ts` y `CvDownloadLink.astro`. Dentro de la fase,
  T004 depende de T002 (`baseRegion`) y T003; T005 es independiente de todo.
- **Fase 2 (página)**: depende de la Fase 1 completa.
- **Fase 3 (nav)**: independiente de la 2 en el código, pero el enlace apunta a `/about/`, así
  que se verifica después. Puede escribirse en paralelo a la Fase 2.
- **Fase 4 (verificación)**: depende de que 2 y 3 estén cerradas. No es opcional.

### Batch Assignments for Sub-Agents

| Batch | Tasks | File | Parallel | Depends on |
|-------|-------|------|----------|------------|
| A | T001 | src/data/about.ts | Yes | — |
| B | T002 | src/data/profile.ts | Yes | — |
| C | T003 | src/components/CvDownloadLink.astro | Yes | — |
| D | T005 | src/layouts/BaseLayout.astro | Yes | — |
| E | T004 | src/pages/contact.astro | No | B, C |
| F | T006-T008 | src/pages/about.astro | No | A, B, C |
| G | T009 | src/components/Nav.astro | Yes | — |
| H | T010-T012 | {scratchpad}/measure-about.mjs | No | D, E, F, G |
| I | T013 | src/data/profile.ts | No | H |
| J | T014 | src/pages/about.astro | No | H |

Notas: A, B, C, D y G no comparten fichero ni dependencias y pueden ejecutarse a la vez. E
depende de B (necesita `profile.baseRegion`) además de C. F es secuencial dentro del batch
(markup → estilos móvil → responsive) sobre un único fichero. I vuelve a tocar
`src/data/profile.ts` (batch B) pero de forma temporal y revertida, por eso va en su propio batch
y al final. H, I y J no pueden empezar hasta que el sitio compila y sirve.

---

## Implementation Strategy

1. **Fase 1** → `pnpm build` limpio. Sin esto no hay página que escribir.
2. **Fase 2 + Fase 3** (pueden solaparse) → `/about/` visible en el dev server.
3. **PARAR Y MEDIR**: Fase 4 completa antes de dar nada por terminado. Si aparece un desborde,
   se corrige y se vuelve a medir la matriz entera, no solo el ancho que falló.
4. Entregar. El resto (traducción EN, PDFs de CV, `/press`, rediseño del nav) tiene su propio
   issue y no entra aquí.

---

## 4. Clarifications

### Sesión 2026-07-27

**Sobre la Deep Interview**: no se ejecutó como ronda de preguntas. El sub-agente de planificación
no dispone de `AskUserQuestion` en este entorno, y el encargo del orquestador ya traía resueltas
—o acotadas— las decisiones que la entrevista habría destapado: las tres ambigüedades abiertas
por la exploración, las restricciones de diseño no negociables, el alcance excluido y el criterio
de verificación. Se registran abajo como decisiones con su motivo. Las que siguen abiertas están
en Riesgos, marcadas para confirmación de David.

- **[Arquitectura]** Q: ¿Dónde vive la prosa de la bio, sabiendo que la Fase 4 necesitará una
  variante EN y que `src/i18n/` solo existe en la PR #57 sin mergear? → A: `src/data/about.ts`,
  módulo TS de strings con la misma forma que `src/i18n/es.ts`. Funciona standalone en main y la
  migración de Fase 4 es mover el objeto a `es.ts` + una línea de import. Descartadas: inline
  (deja el texto en la plantilla) y content collection (maquinaria de más y una segunda migración,
  porque la base de i18n usa diccionarios TS, no Markdown).
- **[Data Model]** Q: ¿Cómo se renderiza la tira de Publicaciones si Luisa no ha entregado logos
  (#12)? → A: wordmarks de texto en Bebas Neue, una columna en móvil y dos a partir de 50em, sin
  separadores `·`. Es lo que pide el design-handoff ("no logo zoo") y lo único que existe hoy.
- **[Integración]** Q: ¿Dónde va `/about` en un nav ya saturado (#53) con hamburguesa a 78em? →
  A: penúltima, entre Runway y Contacto, etiquetada "Sobre mí". Se mide el recorte del nav con 8
  enlaces (T011) y, si recorta, se sube el breakpoint en `<style>` y `<script>` a la vez. Ningún
  otro cambio de nav: #53 es dueño del rediseño.
- **[Casos límite]** Q: ¿Qué hace el CTA de CV mientras `profile.cvPath` sea `undefined` (#10)? →
  A: no se renderiza, sin reserva de espacio ni placeholder — mismo patrón que `/contact`. Y como
  esa rama nunca se ejecuta hoy, T013 la prueba con un stub temporal que se revierte.
- **[Arquitectura]** Q: ¿Los cinco componentes que proponía la exploración? → A: ninguno. Cada uno
  tendría un solo consumidor y cero lógica (Regla 4 de Beck). Se extrae solo `CvDownloadLink`,
  que sí resuelve conocimiento duplicado entre dos páginas (Regla 3).
- **[Escenarios de usuario]** Q: ¿Titular de la página, si la copy aprobada no incluye ninguno? →
  A: **decidido por David** — eyebrow "Sobre mí" + `<h1>` con "Luisa Benítez" (`profile.name`),
  tratado tipográficamente como el "Hablemos" de `/contact`. Es un dato existente, no copy
  inventada. Sin `aria-label` para inyectar "Sobre mí": rompería Label in Name.
- **[Rendimiento]** Q: ¿Se espera al retrato de más resolución (#13)? → A: no. Se usa
  `src/assets/portrait.webp` (1365×2048) con `widths`/`sizes`; el reemplazo de Fase 5 no cambia
  markup.

### Ronda de guidance — decisiones cerradas por David (2026-07-27)

- **[Contenido]** Q: ¿`metaDescription` verbatim de la bio o redactada? → A: **redactada** como
  frase SEO de ~155 caracteres. Es copy de metadatos, no copy de página, así que redactarla no
  invade el contrato de contenido. Queda **pendiente de su aprobación antes del merge** (R3).
- **[Accesibilidad]** Q: `<html lang="en">` con todo el contenido en español — ¿fuera de alcance
  como decía R10, o entra? → A: **entra**, como tarea propia (T005). Es una línea que arregla un
  fallo WCAG de nivel A en todo el sitio, y `/about` es justo la página que lo hace grave.
- **[Data Model]** Q: `/about` decía "Galicia" y `/contact` "España". → A: ni una ni otra
  hardcodeada — `baseRegion: 'España'` entra en `profile.ts` y lo consumen las dos páginas.
- **[Arquitectura]** Q: ¿Quién declara el CSS de los CTAs tras extraer `CvDownloadLink`? → A:
  contrato explícito en C4; `about.astro` **redeclara** lo que necesite. La extracción elimina la
  duplicación de la *condición* y de la selección de locale, no la del CSS.
- **[Accesibilidad]** Q: ¿Indicador de foco? → A: anillo propio tokenizado
  (`outline: 2px solid var(--gray-0)`), no confiar en el del navegador ni en `--link-color`.
- **[Integración]** Q: ¿Qué minors de accesibilidad del nav entran? → A: `:focus-visible`, fuera
  el `font-weight: 800` del foco, y cue no cromático para `aria-current`. **No** entran skip link,
  `aria-controls` ni cierre con `Escape`: son de #53 y quedan anotados como "detectado, fuera de
  alcance".

**Cobertura de PRD**: no aplica — no existe `prd.md` para este cambio; el contrato de contenido
es `plan/03-content-pages/about-copy-final-es.md`, cubierto por T001 (bio, meta), T002
(servicios, publicaciones) y T006 (datos y CTAs).

## 5. Risks & Considerations

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **El octavo enlace rompe el nav.** El comentario del propio `Nav.astro` dice que 78em es el ancho *medido* al que caben exactamente 7 enlaces. Con 8, lo previsible es que recorte entre 1248 y ~1400px, y `overflow-x: hidden` lo esconde. | Alto | T011 mide el rango 1200–1920 en reposo **y con cada enlace enfocado**. Si recorta, se sube el breakpoint en `<style>` **y** `matchMedia` al valor medido. Prohibido reducir fuente o tracking: ya se probó y reintrodujo el recorte. |
| R2 | ~~Título de página no aprobado.~~ **Cerrado**: David decide `<h1>` = "Luisa Benítez", tratado como el "Hablemos" de `/contact`. | — | Sin acción. |
| R3 | **La `metaDescription` es copy redactada por el plan**, no aprobada por Luisa. 157 caracteres, todos los hechos salen de la copy aprobada. | Bajo | **Requiere el visto bueno de David antes del merge.** Es un string en `about.ts`: sustituible en una línea sin tocar estructura. |
| R4 | **Separador de idiomas.** La copy escribe "español (nativo) · inglés"; se renderiza `profile.languages.join(', ')` para igualar `/contact`. Es una decisión de maquetación sobre un glifo, no un cambio de copy. | Bajo | Documentado aquí. Si David prefiere el `·`, es cambiar el `join`. |
| R5 | **Regresión en `/contact`** al extraer `CvDownloadLink`. Coste concreto identificado: el `<a>` del componente hijo lleva otro hash de scope y **pierde** la regla `.panel > * { width: 100%; max-width: 34rem }` de `contact.astro` (≥50em). | Medio | Impacto previsiblemente nulo (`.cv` es `inline-flex` con `align-self: flex-start`), pero se **mide**: pasada 4 de T011 compara la caja del `.cv` antes/después con el stub de T013 activo. |
| R11 | **Estilos con ámbito y los tres CTAs**: si `about.astro` no redeclara `.cv`, dos CTAs se entregan sin estilos — y el fallo **no salta en revisión** porque `cvPath` es `undefined` y el componente no pinta nada. | Alto | C4 fija dueño por regla; checkpoint de Fase 2 comprueba que `about.astro` tiene reglas `.cv` propias; T013 lo prueba con el stub. |
| R12 | **Duplicación consciente de etiquetas UI**: "Base"/"Idiomas" existen inline en `contact.astro` y ahora también en `about.details`; "Sobre mí" vive en tres sitios (nav, `about.eyebrow`, `about.title`). | Bajo | Aceptado: Regla 2 (revelar intención) > Regla 3 a esta escala, y unificarlas hoy crearía un diccionario prematuro. Anotado como deuda a resolver en la Fase 4, cuando `src/i18n/` sea el sitio natural. |
| R6 | **Deriva entre la copy aprobada y el código.** `about.ts` copia texto a mano; una tilde o un guion largo mal copiados pasan desapercibidos. | Medio | Checkpoint de Fase 1: comparación carácter a carácter contra el `.md` fuente, con atención a «—», «·» y "e YSL". |
| R7 | **Fase 4 (i18n) llega y hay que migrar.** | Bajo | La regla "solo `about.astro` importa `about.ts`" mantiene la migración en un import. Si algún componente futuro importa `about.ts` directamente, la ventaja se pierde. |
| R8 | **El retrato es de baja resolución** (1365×2048, #13) y aquí se muestra a escala editorial mayor que en `/contact`. | Medio | `widths`/`sizes` acotan la petición; `max-height: 34rem` en escritorio evita pedirle al asset más de lo que da. Reemplazo en Fase 5. |
| R9 | **La verificación depende del scratchpad**: `playwright-core` se instala ahí, no en el repo. | Bajo | T010 documenta la instalación y la ruta del binario. Nada de esto se commitea. |
| R10 | ~~`BaseLayout` declara `<html lang="en">`.~~ **Reclasificado a CRÍTICO y resuelto dentro de este cambio** (T005): era un fallo WCAG 3.1.1 de **nivel A**, no un "medio fuera de alcance". | — | Corregido a `lang="es"`; verificado en T014. ⚠️ Es el único cambio de este PR que afecta a todas las páginas del sitio: David debe verlo al revisar. |
| R13 | **Deuda de nav detectada y NO resuelta aquí** (es de #53): sin skip link en `BaseLayout`; el botón del hamburguesa sin `aria-controls`, sin cierre con `Escape` ni al perder el foco; el panel absoluto puede dejar el foco tapado (WCAG 2.2 §2.4.11, AA) y con 8 ítems el panel es más alto. | Medio | Anotado explícitamente aquí y en el Overview para que se traslade al issue #53. T012 comprueba el caso del foco tapado y **registra** el resultado sin arreglarlo. |

**Consideraciones adicionales**

- No se añade `og:image` propia a `/about`: `SEO.astro` cae al `og-default.png` del sitio. Cambiarlo
  implicaría generar un asset y eso no está pedido.
- El sitemap se genera solo (`@astrojs/sitemap`); basta comprobar que `/about/` aparece tras el build.
- `astro build` es el único type-check disponible: no hay `tsc` en scripts ni runner de tests.

---

## 6. Testing

El repo **no tiene runner de tests** (`package.json` no declara Vitest, Jest, Playwright-test ni
Cypress) y montar uno no está en el alcance. Lo que sustituye a los tests, con el mismo valor de
"pasa o no pasa":

| Nivel | Qué se prueba | Por qué | Dónde |
|---|---|---|---|
| Compilación / tipos | `pnpm build` sin errores | `astro build` es el único type-check disponible; captura imports rotos y `as const` mal formados | Checkpoints 1 y 4 |
| Contenido | Los 3 párrafos, 5 servicios y 4 publicaciones coinciden con el documento de copy | Es el contrato de este cambio; una tilde perdida es un defecto de producto | Checkpoint Fase 1 |
| Layout (medido) | Desbordes por elemento y `scrollWidth - innerWidth` en 360/390/800/1024/1248/1440/1920, claro y oscuro, en `/about/` y `/contact/` | `overflow-x: hidden` esconde los desbordes: sin medir, un fallo se entrega sin verse | T011, T012 |
| Regresión | El nav con 8 enlaces no recorta; `/contact` sigue igual tras extraer `CvDownloadLink` | Son los ficheros existentes que este cambio toca | T011 |
| Rama condicional | El CTA de CV aparece en ambas páginas cuando `cvPath` existe | Es la única rama lógica del cambio, hoy nunca se ejecuta, y es donde se vería el fallo de C4 | T013 |
| Accesibilidad | Orden de tabulación, anillo de foco propio en ambos temas, jerarquía `h1`→`h2` (volcada, no inspeccionada), aviso de pestaña nueva, roles de lista | La página introduce encabezados, listas sin marcador y enlaces externos nuevos | T014 |
| Accesibilidad (medida) | WCAG 1.4.12 Text Spacing: sin desbordes con `letter-spacing: .12em` forzado; nav sin recorte con cada enlace enfocado; altura ≥44px de los tres CTAs | Son tres fallos que solo se ven midiendo: `overflow-x: hidden` esconde los dos primeros y el tercero depende de un `:global()` fácil de olvidar | T011, T012 |
| Idioma del documento | `document.documentElement.lang === 'es'` en `/about/` y en otra página | WCAG 3.1.1 nivel A; es el único cambio del PR que afecta a todo el sitio | T014 |

Si en el futuro entra un runner, el primer caso que merece automatizarse es el de layout: la
matriz ancho × tema de T011 ya está escrita como script.

---

## Notes

- El paralelismo se define SOLO en la Batch Assignment Table, nunca en las líneas de tarea.
- No hay runner de tests en el repo: la verificación es `astro build` + medición en navegador real.
- Parar en cada Checkpoint y validar antes de seguir.

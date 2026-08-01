# Implementation Plan: Sitio en inglés navegable (templates parametrizados por idioma)

**Feature ID**: i18n-paginas-en
**Status**: ✅ Complete
**Created**: 2026-07-30
**Goal**: Emitir la variante EN de cada página desde una única plantilla parametrizada por idioma, sin mover ni una sola URL española.

---

## 1. Overview

Issue #40: hoy el diccionario inglés existe y está completo, pero **no hay ni una sola URL en inglés**. El objetivo es que `/en/…` sea un sitio navegable de verdad, generado desde las mismas plantillas que el español.

**Decisión cerrada (no se reabre)**: una plantilla por página que emite sus dos variantes vía `getStaticPaths`. NO se duplica `src/pages/en/`. Motivo: dos árboles de páginas se desincronizan en silencio en cada rediseño.

**Cómo se ejecuta esa decisión** — y esto es lo que el explorador dejaba abierto: en Astro un parámetro solo existe si aparece en la RUTA DEL FICHERO. No se puede añadir `locale` al `getStaticPaths` de `src/pages/campaigns/[...slug].astro` y esperar que cambie la URL. La pieza que lo hace posible es un **parámetro rest en la raíz**:

```
src/pages/[...lang]/campaigns/[...slug].astro
```

Con `lang: undefined` el segmento **desaparece** y la URL sale `/campaigns/bruno-magli/`; con `lang: 'en'` sale `/en/campaigns/bruno-magli/`. Un solo fichero, dos variantes, cero duplicación.

**Esto no es una hipótesis: está probado.** Se construyó un prototipo completo en el scratchpad (copia del repo, `astro build` real) con el resultado:

| Métrica | Baseline | Tras la parametrización |
|---|---|---|
| Páginas HTML | **72** | **115** (72 ES + 43 EN) |
| URLs en el sitemap | 43 | 86 (43 ES + 43 EN) |
| Conjunto de URLs ES | — | **`diff` vacío: idéntico, ruta por ruta** |

Las 43 páginas EN son: 1 home + 1 contact + 5 índices de colección + 36 fichas de detalle.

**Alcance**. Entra: home, contact, los 5 índices y las 36 fichas, en ambos idiomas; el helper de rutas; `lang` del `<html>`; hreflang; conmutador de idioma en el nav. **No entra**: traducir la copy de proyecto de Luisa (ver Decisión C), ni variantes EN de las páginas de redirección viejas (ver Decisión E).

**No-objetivos**: no se toca el diseño, ni el breakpoint del nav, ni el contenido de las colecciones más allá de añadir un campo opcional vacío al esquema.

## 2. Architecture Analysis

### Data Model / Type Definitions

No hay entidades nuevas. Los tipos que se tocan:

```ts
// src/i18n/index.ts — YA EXISTE, no se modifica
type Locale = 'es' | 'en';
const locales: Locale[] = ['es', 'en'];
const defaultLocale: Locale = 'es';
```

```ts
// src/content.config.ts — gallerySchema gana UN campo opcional (T004)
description: z.string().optional(),    // español, ya existe
descriptionEn: z.string().optional(),  // NUEVO — vacío en todos los JSON de hoy
```

`descriptionEn` no lleva dato en este cambio. Se añade ahora para que la futura traducción sea un cambio **solo de datos**, sin volver a tocar cinco plantillas.

### Data Flow

Estructura final de `src/pages/` (lo que se mueve y lo que NO):

```
src/pages/
├── [...lang]/                      ← NUEVO nivel: '' (ES) o 'en'
│   ├── index.astro                 ← movida desde src/pages/
│   ├── contact.astro               ← movida desde src/pages/
│   ├── campaigns/{index,[...slug]}.astro
│   ├── celebrity-events/{index,[...slug]}.astro
│   ├── editorials/{index,[...slug]}.astro
│   ├── films/{index,[...slug]}.astro
│   └── runway/{index,[...slug]}.astro
├── 404.astro                       ← SE QUEDA (GitHub Pages sirve /404.html)
├── about.astro                     ← SE QUEDA (stub de redirección, solo ES)
├── publicity/                      ← SE QUEDA (stub, solo ES)
├── celebrities/                    ← SE QUEDA (stub, solo ES)
└── work/                           ← SE QUEDA (stub, solo ES)
```

Flujo de una petición en build:

1. `getStaticPaths` devuelve `{ params: { lang: undefined | 'en' }, props: { locale } }`.
2. Astro compone la URL: `undefined` colapsa el segmento → `/campaigns/` ; `'en'` → `/en/campaigns/`.
3. En el render, `getLocaleFromUrl(Astro.url)` deduce el idioma de la URL real — **la plomería que ya existe sigue funcionando sin tocarla**, y por eso Nav, Card, Footer y CvDownloadLink NO necesitan que se les pase el idioma por props: lo deducen igual que hoy.
4. `getTranslation(locale)` → diccionario.
5. Todo `href` interno pasa por `localizedPath(locale, path)` → ES devuelve la ruta intacta, EN la prefija con `/en`.

### Contract Specifications

**Fichero nuevo: `src/i18n/routing.ts`** — es la ÚNICA pieza autorizada a construir rutas internas.

```ts
import { locales, defaultLocale, type Locale } from './index';

/**
 * Valor del parámetro [...lang] para un idioma.
 * ES → undefined: el segmento desaparece y la URL española NO cambia. Esta
 * línea es la que garantiza el requisito de compatibilidad de URLs.
 */
export function localeParam(locale: Locale): string | undefined {
	return locale === defaultLocale ? undefined : locale;
}

/** getStaticPaths de una página estática parametrizada por idioma. */
export function localeStaticPaths(): Array<{
	params: { lang: string | undefined };
	props: { locale: Locale };
}>;

/** getStaticPaths de una ruta de colección: entradas × idiomas. */
export function collectionLocalePaths<T extends { id: string }>(
	entries: T[],
): Array<{
	params: { slug: string; lang: string | undefined };
	props: { entry: T; locale: Locale };
}>;

/**
 * ÚNICO constructor de enlaces internos. `path` SIEMPRE es la ruta española
 * canónica (empieza por '/'). Idempotente: si ya viene prefijada, no la
 * vuelve a prefijar.
 */
export function localizedPath(locale: Locale, path: string): string;

/** Quita el prefijo de idioma: '/en/campaigns/' → '/campaigns/'. Para hreflang y conmutador. */
export function stripLocale(pathname: string): string;

/** Mapa hreflang de una ruta canónica: { es: '/contact/', en: '/en/contact/' }. */
export function alternatePaths(path: string): Record<Locale, string>;
```

Reglas que `localizedPath` **debe** cumplir (y que el implementador no puede relajar):

- `localizedPath('es', p) === p` siempre. Sin excepciones. Sin ramas.
- No acepta URLs externas, `mailto:`, ni anclas sueltas. Esas no pasan por aquí.
- Es idempotente: `localizedPath('en', '/en/x/') === '/en/x/'`.

### Before/After Analysis

**1. `src/components/Nav.astro` — hay un bug de `aria-current` escondido aquí.**

Antes (líneas 17-25 y 41-46):
```ts
const textLinks = [{ label: t.nav.home, href: '/' }, { label: t.nav.editorial, href: '/editorials/' }, …];
const isCurrentPage = (href) => pathname === href || (href !== '/' && pathname.startsWith(href));
```
Después:
```ts
const locale = getLocaleFromUrl(Astro.url);
const L = (p: string) => localizedPath(locale, p);
const textLinks = [{ label: t.nav.home, href: L('/') }, { label: t.nav.editorial, href: L('/editorials/') }, …];
const homeHref = L('/');
const isCurrentPage = (href) => pathname === href || (href !== homeHref && pathname.startsWith(href));
```
Por qué: si se localizan los hrefs pero se deja `href !== '/'`, en inglés el enlace de Home pasa a ser `/en/` y **`pathname.startsWith('/en/')` es cierto en TODAS las páginas inglesas** → «Inicio» sale marcado como página actual en todo el sitio EN. El literal `'/'` tiene que convertirse en `homeHref`. También `<a href="/" class="site-title">` (línea 53) pasa a `L('/')`.

**2. `src/components/Card.astro` (línea 37)** — el fallo que dejaría la función inútil.
```diff
- <a href={`/${page}/${id}`} class="card-link">
+ <a href={localizedPath(getLocaleFromUrl(Astro.url), `/${page}/${id}`)} class="card-link">
```
Card se usa en los 5 índices y en la home. Sin esto, el visitante inglés vuelve al español en el primer clic.

**3. Los 5 `[...slug].astro` (línea ~35)**
```diff
- <a class="back-link" href="/campaigns"><Icon icon="arrow-left" /> Volver</a>
+ <a class="back-link" href={localizedPath(locale, '/campaigns')}><Icon icon="arrow-left" /> {t.common.back}</a>
```

**4. `src/layouts/BaseLayout.astro` (línea 25)**
```diff
- <html lang="es">
+ <html lang={locale}>
```
con `const locale = getLocaleFromUrl(Astro.url);` en el frontmatter.

**5. `src/components/CvDownloadLink.astro` (línea 16)** — `href={profile.cvPath.es}` → `href={profile.cvPath[locale]}`. Hoy `profile.cvPath` es `undefined`, así que el enlace no se pinta: el cambio es invisible en pantalla y aun así hay que hacerlo (el comentario del propio fichero ya anticipaba esta fase).

**6. `astro.config.mjs`** — ver Decisión E: **el `filter` del sitemap no cambia de lógica** y `fallback` **sigue desactivado**. Solo se actualizan los comentarios, que hoy dicen «cuando existan páginas EN» y dejarían de ser ciertos.

### Bloques de decisión

#### DECISIÓN A — Compatibilidad de URLs españolas (cerrada, no se pregunta)

**Garantía**: `localeParam('es')` devuelve `undefined`, el segmento `[...lang]` colapsa y la URL sale idéntica. No es una promesa: se midió. `diff` entre el conjunto de URLs de `dist/` actual y el conjunto de URLs no-`/en/` del prototipo → **vacío**. Las 72 rutas españolas siguen ahí, con el mismo path.

Se verifica en cada batch con T027 (ver Fase 6), que vuelve a hacer ese mismo `diff` contra un listado congelado del baseline.

**Efecto colateral esperado y benigno**: mover un fichero de página cambia el hash de los estilos con ámbito de Astro (`data-astro-cid-xxxx`) y el nombre del chunk CSS en `dist/`. El HTML español sale **semánticamente idéntico** pero **no byte a byte**. Quien revise el diff de `dist/` verá ruido; hay que normalizar los hashes antes de comparar. Está confirmado en el prototipo: el único diff en las páginas ES era el identificador de ámbito.

#### DECISIÓN C — El hueco de contenido (REQUIERE RESPUESTA)

**Cuántos**: las **36 fichas tienen descripción, y las 36 están solo en español**. Desglose: campaigns 11, editorials 11, celebrity-events 9, runway 4, films 1. Los **títulos** en cambio son casi todos nombres propios («Bruno Magli», «Vogue», «Aitana») y no necesitan traducción.

Qué son esas descripciones, textualmente: `"Campaña Publicidad Bruno Magli"`, `"Editorial Numéro Netherlands - Miguel Herrán"`, `"Desfile Primavera/Verano 26 Rosé Noir - Claro Couture - Mercedes-Benz Fashion Week Madrid"`. Son fichas técnicas de una línea: marca, publicación, temporada. **No son prosa de autor** — la prosa de Luisa (la bio) ya está traducida y aprobada en `en.ts`.

| Opción | Qué implica | Coste |
|---|---|---|
| **(i) Mostrar el español con `lang="es"`** ✅ recomendada | El lector inglés ve «Campaña Publicidad Bruno Magli». El lector de pantalla cambia de voz al leer ese párrafo (WCAG 3.1.2). | Cero. Ninguna copy inventada. |
| (ii) Omitir en EN | Se pierde la atribución (marca, publicación, temporada) — que es justo el expediente profesional de Luisa. | La ficha EN queda muda. |
| (iii) Bloquear hasta traducir | Retrasa todo el sitio inglés por 36 cadenas de una línea. | Alto. |

**Recomendación: (i), más el campo `descriptionEn` opcional en el esquema (T004).** La plantilla renderiza `entry.data.descriptionEn ?? entry.data.description`, y pone `lang="es"` **solo** cuando cae al español. Así: no se inventa nada hoy, y cuando Luisa apruebe las traducciones es rellenar JSON — sin volver a tocar código. **No se traduce ni una palabra de su copy en este cambio.**

#### DECISIÓN D — El tagline sin aprobar (REQUIERE RESPUESTA)

`src/pages/index.astro` línea 157 tiene escrito a mano:

> «Estilista y asistente de moda, Diseñadora de Modas, Asesora de Imagen y Personal Shopper»

No está en `t.home` — y `en.ts` línea 27 ya marca el bloque `home` como **«PENDIENTE DE APROBACIÓN DE DAVID»**.

Hay dos cosas separadas aquí, y conviene no mezclarlas:

1. **Mover la cadena a i18n**: obligatorio pase lo que pase. Mientras esté escrita a mano en el `.astro`, la home inglesa la mostrará en español. Esto no es opcional ni discutible.
2. **Qué valor lleva la clave inglesa**: eso sí es una decisión de David.

| Opción | Resultado |
|---|---|
| (a) Clave EN = mismo texto español | La home EN muestra español bajo el nombre. Peor que no tenerlo. |
| **(b) Proponer traducción, marcada como pendiente** ✅ recomendada | Se propone («Fashion stylist and assistant, fashion designer, image consultant and personal shopper»), se marca en el comentario igual que el resto del bloque `home`, y **David la aprueba antes del merge**. No se publica copy suya en silencio. |
| (c) Omitir el tagline en EN | La home EN queda con nombre + `profile.role` («Fashion Stylist», ya neutro) y sin tagline. Honesto, pero más pobre. |

**Recomendación: (b), con aprobación explícita como condición de merge.** Si David no la aprueba a tiempo, se cae a (c) — que no bloquea nada, solo omite un párrafo.

#### DECISIÓN E — `astro.config.mjs` (cerrada, con evidencia)

**`fallback`: se queda DESACTIVADO.** El comentario actual dice que se dejaba para cuando existieran páginas EN. Ese razonamiento ya no aplica, pero la conclusión sigue siendo la misma por otro motivo: con `[...lang]`, **cada ruta EN es una página real**, no hay ningún 404 del que caer. El prototipo construyó las 43 páginas EN sin `fallback`. Activarlo solo podría añadir stubs de redirección para las rutas que deliberadamente dejamos sin variante EN. Se actualiza el comentario para que diga esto, no lo viejo.

**`filter` del sitemap: la lógica NO cambia.** Medido en el prototipo: el sitemap pasó de 43 a 86 URLs, con las 43 EN incluidas automáticamente. Y como los excluidos se comprueban con `includes('/publicity/')`, el filtro ya cubriría un hipotético `/en/publicity/` — red de seguridad gratis. Solo se añade un comentario.

**Variantes EN de las páginas de redirección: NO se crean.** `/publicity/*`, `/celebrities/*`, `/work/*` y `/about/` son compatibilidad hacia atrás de URLs **españolas** que estuvieron publicadas. `/en/publicity/bruno-magli/` nunca existió, luego nadie la tiene en un marcador ni indexada: sería inventar una URL para redirigirla. Se quedan fuera de `[...lang]`, sin tocar. (`404.astro` igual: GitHub Pages sirve un único `/404.html`.)

## Team Selection

| Skill | Reason for Selection |
|-------|---------------------|
| `web-accessibility-advisor` | Su dominio declarado es «WCAG 2.1 AA, ARIA, keyboard navigation, screen readers», y este cambio toca tres puntos exactamente ahí: (1) `<html lang>` pasa a ser dinámico y las descripciones españolas dentro de páginas inglesas llevarán `lang="es"` — WCAG 3.1.1 y 3.1.2 (T004, T020-T024); (2) el `aria-current="page"` del nav tiene un bug de regresión documentado en Before/After §1 (T008); (3) el conmutador de idioma nuevo necesita nombre accesible y orden de foco (T009). |

**Descartados, con motivo:**

- `architect-advisor` — su descripción cubre «hexagonal, DDD, ports and adapters, layered design». Aquí no hay capa de dominio: es enrutado de un sitio estático y un helper de 30 líneas.
- `component-advisor` — su descripción es explícitamente «React component design patterns — composition, hooks, state management». No hay React en el proyecto; los componentes son `.astro` sin estado de cliente salvo dos custom elements que no se tocan.
- `frontend-test-advisor` — «React Testing Library, Vitest/Jest, Cypress e2e». El repo no tiene runner de tests ni dependencia de ninguno de ellos; la verificación de esta fase es build + gates de grep + medición en navegador (Fase 6), no suite de tests.
- `unit-test-advisor` — «Domain unit test patterns… Given-When-Then». Mismo motivo: no hay capa de dominio ni infraestructura de tests unitarios que extender.

## Advice Received

_No advice received yet._

## 3. Implementation Tasks

> **SECUENCIACIÓN — LEER ANTES DE EMPEZAR.** El PR **#62 (perf: vídeos bajo demanda)** está ABIERTO y modifica los **cinco** `[...slug].astro` de detalle. La Fase 5 (T020-T024) toca esos mismos cinco ficheros. **#62 debe estar mergeado y esta rama rebasada sobre `main` antes de lanzar el batch M.** Las fases 1-4 no tocan esos ficheros y pueden avanzar en paralelo a #62.

> **Todos los movimientos de fichero se hacen con `git mv`**, nunca copiar+borrar: si no, se pierde el historial de unos ficheros que llevan comentarios de diseño muy densos.

## Fase 1: Cimientos

**Propósito**: el helper de rutas, las claves de i18n y la configuración. Nada visible todavía.

- [X] T001 Crear el helper de rutas por idioma — src/i18n/routing.ts

**Details for T001**: Firmas exactas en §2 «Contract Specifications». Implementación de referencia:
```ts
export function localizedPath(locale: Locale, path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (locale === defaultLocale) return clean;              // ES intacto, SIEMPRE
	if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return clean; // idempotente
	return `/${locale}${clean}`;
}
export function localeStaticPaths() {
	return locales.map((locale) => ({ params: { lang: localeParam(locale) }, props: { locale } }));
}
export function collectionLocalePaths(entries) {
	return entries.flatMap((entry) =>
		locales.map((locale) => ({
			params: { slug: entry.id, lang: localeParam(locale) },
			props: { entry, locale },
		})),
	);
}
```
Documentar en cabecera POR QUÉ `localeParam('es')` devuelve `undefined` (es la línea que conserva las URLs publicadas) y que este fichero es el único sitio del repo autorizado a concatenar prefijos de idioma.

- [X] T002 Añadir las claves de colecciones, «Volver» y tagline — src/i18n/es.ts

**Details for T002**: añadir al objeto `es` (es.ts define la FORMA; TypeScript exigirá el espejo en en.ts):
```ts
common: { …, back: 'Volver' },
home:   { …, tagline: 'Estilista y asistente de moda, Diseñadora de Modas, Asesora de Imagen y Personal Shopper' },
collections: {
	campaigns:        { title: 'Campañas | Luisa Benítez',                description: 'Campañas y colaboraciones de marca asistidas por Luisa Benítez' },
	celebrityEvents:  { title: '…', description: '…' },
	editorials:       { title: '…', description: '…' },
	films:            { title: '…', description: '…' },
	runway:           { title: '…', description: '…' },
},
```
Los valores ES se copian **literalmente** de los `title=`/`description=` que hoy están escritos a mano en cada `{coleccion}/index.astro` (campaigns/index.astro líneas 13-14, y los equivalentes). No se reescribe copy española existente. `home.tagline` se copia verbatim de index.astro línea 157 — ver Decisión D.

- [X] T003 Espejar las claves nuevas en inglés — src/i18n/en.ts

**Details for T003**: mismas claves, valores traducidos. `common.back: 'Back'`. Para `home.tagline`, **mantener el comentario `PENDIENTE DE APROBACIÓN` del bloque `home`** y añadir en él que el tagline concreto está pendiente de que David lo apruebe (Decisión D). Traducción propuesta: `'Fashion stylist and assistant, fashion designer, image consultant and personal shopper'` — inglés británico, coherente con el resto de en.ts.

- [X] T004 Añadir `descriptionEn` opcional al esquema de galería — src/content.config.ts

**Details for T004**: en `gallerySchema`, justo debajo de `description`:
```ts
description: z.string().optional(),
/**
 * Traducción inglesa de la descripción. Opcional y HOY VACÍA en todos los
 * JSON a propósito: la copy de proyecto es de Luisa y no se inventa. Las
 * plantillas hacen `descriptionEn ?? description` y marcan lang="es" cuando
 * caen al español, así que rellenar esto más adelante es un cambio de datos
 * sin tocar código.
 */
descriptionEn: z.string().optional(),
```
No se modifica ningún `.json` de `src/content/`.

- [X] T005 Actualizar los comentarios de i18n y sitemap — astro.config.mjs

**Details for T005**: **no cambia ni una línea de código**, solo comentarios (ver Decisión E). (1) El bloque de arriba dice «Mientras no existan páginas en src/pages/en/, esta config es inerte» — reescribirlo: las páginas EN existen y salen de `src/pages/[...lang]/`, no de `src/pages/en/`. (2) Explicar que `fallback` sigue fuera porque cada ruta EN es una página real, no porque falten páginas. (3) En el `filter`, anotar que las rutas `/en/*` entran solas en el sitemap (medido: 43→86 URLs) y que los `includes('/publicity/')` etc. cubrirían también un `/en/publicity/` si algún día existiera.

**Checkpoint Fase 1**:
- [ ] `pnpm build` sigue dando **72** páginas (nada visible ha cambiado todavía).
- [ ] `pnpm astro check` (o `tsc`) sin errores: si en.ts no espeja es.ts, falla aquí.
- [ ] `localizedPath('es', p) === p` para `/`, `/contact/`, `/campaigns/bruno-magli`.
- [ ] `localizedPath('en', '/en/x/') === '/en/x/'` (idempotencia).

---

## Fase 2: Componentes y layout — enlaces correctos por idioma

**Propósito**: que ningún componente compartido devuelva a un visitante inglés al español. Esta fase es la que decide si la función sirve para algo.

- [X] T006 Hacer dinámico el `lang` del documento y pasar el idioma a SEO — src/layouts/BaseLayout.astro

**Details for T006**: en el frontmatter, `const locale = getLocaleFromUrl(Astro.url);`. Línea 25: `<html lang="es">` → `<html lang={locale}>`. Pasar `locale={locale}` y `alternates={alternatePaths(stripLocale(path ?? Astro.url.pathname))}` a `<SEO …>`. La prop `locale` de SEO **ya existe** en su interfaz (reservada para esta fase); no hay que inventarla.

- [X] T007 Emitir hreflang y og:locale — src/components/SEO.astro

**Details for T007**: sustituir el marcador `{/* Phase 4: hreflang + og:locale here */}` (última línea) por las etiquetas reales:
```astro
<meta property="og:locale" content={locale === 'en' ? 'en_GB' : 'es_ES'} />
{alternates && Object.entries(alternates).map(([l, p]) => (
  <link rel="alternate" hreflang={l} href={new URL(p, Astro.site)} />
))}
{alternates && <link rel="alternate" hreflang="x-default" href={new URL(alternates.es, Astro.site)} />}
```
`x-default` apunta al español porque es el idioma por defecto del sitio. **El `canonical` NO cambia de lógica**: cada variante es canónica de sí misma (`Astro.url.pathname`), que es justo lo que hace que Google las trate como alternativas y no como duplicados. No emitir hreflang en las páginas que no tienen variante EN (los stubs de redirección usan `RedirectPage`, que no pasa por `SEO.astro`).

- [X] T008 Enrutar todos los enlaces del nav por `localizedPath` y arreglar `aria-current` — src/components/Nav.astro

**Details for T008**: ver Before/After §1, que incluye el bug de `aria-current`. Puntos concretos: `textLinks` (líneas 17-25), `site-title` (línea 53), y `isCurrentPage` (líneas 41-46) donde el literal `'/'` pasa a ser `homeHref`. Los `href` de `iconLinks` (Instagram) son externos y **no** pasan por el helper.
**TRAMPA (no tocar)**: el breakpoint `88em` está duplicado en `window.matchMedia` (línea 169) y en `@media` (línea 417). Esta tarea **no cambia ninguno de los dos**. Si por lo que sea hubiera que tocar uno, hay que tocar los dos — el menú hamburguesa se rompe en silencio si se desincronizan.

- [X] T009 Añadir el conmutador de idioma ES/EN al menú — src/components/Nav.astro

**Details for T009**: (condicionada a la pregunta 3 del interview). Va en `.menu-footer`, junto a `ThemeToggle`, en los dos sitios donde ese bloque aparece (`<noscript>` y `#menu-content`). Sin JavaScript: son dos enlaces normales, que además funcionan sin JS igual que el resto del menú.
```astro
const here = stripLocale(Astro.url.pathname);
<nav class="lang-switch" aria-label={t.common.languageLabel}>
  {locales.map((l) => (
    <a href={localizedPath(l, here)} lang={l} hreflang={l}
       aria-current={l === locale ? 'true' : null}>{l === 'es' ? 'ES' : 'EN'}</a>
  ))}
</nav>
```
Requiere claves nuevas en es.ts/en.ts (`common.languageLabel`) — añadirlas junto a T002/T003 si esta tarea se aprueba. **Ojo con el ámbito de estilos**: las reglas de `.lang-switch` tienen que vivir en el `<style>` de Nav.astro; los estilos con ámbito de Astro no cruzan el límite del componente.
**Caso límite**: en una ficha de detalle, `stripLocale` da `/campaigns/bruno-magli/`, que existe en los dos idiomas — correcto. No hay ninguna página con variante en un solo idioma dentro de `[...lang]`, así que el conmutador nunca puede apuntar a un 404.

- [X] T010 Construir el enlace de la tarjeta con el idioma correcto — src/components/Card.astro

**Details for T010**: ver Before/After §2. Línea 37. El idioma se deduce con `getLocaleFromUrl(Astro.url)` dentro del propio componente — **no** hace falta añadir una prop `locale` ni tocar los seis sitios que instancian Card. Solo se toca el `href` del `<a class="card-link">`; ni el marcado ni los estilos.

- [X] T011 Servir el CV del idioma de la página — src/components/CvDownloadLink.astro

**Details for T011**: línea 16, `profile.cvPath.es` → `profile.cvPath[locale]` (el `locale` ya se calcula en la línea 11 para `getTranslation`). Actualizar el comentario de cabecera, que dice «En la Fase 4 (#39) habrá que elegir el fichero según el idioma»: esa fase es esta.

- [X] T012 Auditar los componentes restantes que emiten `href` — src/components/Footer.astro

**Details for T012**: tarea de **verificación, con resultado esperado «sin cambios»**. Comprobar uno por uno y anotar en el commit:
- `Footer.astro` línea 30 — `href={href}` de `socials`: `mailto:` + externos. Sin cambios.
- `ContactCTA.astro` línea 9 — `mailto:`. Sin cambios.
- `CallToAction.astro` línea 9 — `href={href}`, pasarela; el que decide es quien lo llama. Sin cambios.
- `MainHead.astro` líneas 20-23 — favicon, apple-touch-icon, manifest: recursos en la raíz del sitio, no son navegación y **no** deben prefijarse. Sin cambios.
- `contact.astro` línea 86 — `href={href}` de `channels`: `mailto:` + externos. Sin cambios.
Si alguno resultara ser un enlace interno, se enruta por `localizedPath`. Este listado es exhaustivo: sale de `grep -rn 'href=' src/ --include='*.astro'`.

**Checkpoint Fase 2**:
- [ ] `pnpm build` sigue dando **72** páginas (aún no hay rutas EN).
- [ ] En `dist/campaigns/bruno-magli/index.html` el nav sigue apuntando a `/campaigns/`, `/contact/`… sin prefijo, y `<html lang="es">`.
- [ ] Ninguna página española lleva `aria-current="page"` en más de un enlace del nav.
- [ ] El HTML español es semánticamente idéntico al baseline (los hashes `data-astro-cid-*` NO deben haber cambiado todavía: en esta fase no se ha movido ningún fichero de página).

---

## Fase 3: Páginas estáticas bajo `[...lang]`

**Propósito**: primeras dos URLs inglesas reales. Al terminar esta fase `/en/` y `/en/contact/` existen y se ven.

> **Al mover un fichero un nivel hacia abajo, TODOS sus imports relativos ganan un `../`.** En el prototipo esto falló dos veces. `src/pages/[...lang]/index.astro` importa con `../../` (antes `../`); `src/pages/[...lang]/campaigns/index.astro` con `../../../` (antes `../../`).

- [X] T013 Mover la home y parametrizarla por idioma — src/pages/[...lang]/index.astro

**Details for T013**: `git mv src/pages/index.astro 'src/pages/[...lang]/index.astro'`. Después:
```astro
import { localeStaticPaths } from "../../i18n/routing";
export const getStaticPaths = localeStaticPaths;
const { locale } = Astro.props;
const t = getTranslation(locale);
```
(se puede seguir usando `getLocaleFromUrl(Astro.url)`; con la prop es más explícito y evita depender de la URL en la página que la define).
Además, **línea 157**: el tagline escrito a mano pasa a `{t.home.tagline}` (Decisión D). `profile.role` (línea 154, «Fashion Stylist») ya es neutro y no se toca. Ajustar los imports a `../../`. Los `<Card>` de los proyectos destacados ya salen bien gracias a T010: no hay que tocarlos.

- [X] T014 Mover la página de contacto y parametrizarla — src/pages/[...lang]/contact.astro

**Details for T014**: `git mv src/pages/contact.astro 'src/pages/[...lang]/contact.astro'`, mismo patrón de `getStaticPaths` que T013, imports a `../../`. **Ojo con la línea 56**: `path="/contact/"` está fijo y alimenta el `canonical`; pasa a `path={localizedPath(locale, '/contact/')}` o se elimina para que SEO caiga en `Astro.url.pathname` (que ya es correcto en ambos idiomas). Si se deja fijo, la página inglesa declarará como canónica la española — y Google dejará de indexar `/en/contact/`.

**Checkpoint Fase 3**:
- [X] `pnpm build` da **74** páginas (72 + `/en/` + `/en/contact/`).
- [X] Existen `dist/en/index.html` y `dist/en/contact/index.html`; siguen existiendo `dist/index.html` y `dist/contact/index.html`.
- [X] En `dist/en/index.html`: `<html lang="en">`, el nav apunta a `/en/…`, el `canonical` es `https://luisabenitez.es/en/` y hay `<link rel="alternate" hreflang="es">`.
- [X] Las tarjetas de la home EN apuntan a `/en/campaigns/…` (todavía darán 404 hasta la Fase 5 — es lo esperado en este punto).

---

## Fase 4: Índices de colección

**Propósito**: los cinco listados, en los dos idiomas. Cinco ficheros con la misma forma.

- [X] T015 Parametrizar el índice de campañas — src/pages/[...lang]/campaigns/index.astro
- [X] T016 Parametrizar el índice de celebridades y eventos — src/pages/[...lang]/celebrity-events/index.astro
- [X] T017 Parametrizar el índice de editoriales — src/pages/[...lang]/editorials/index.astro
- [X] T018 Parametrizar el índice de cine — src/pages/[...lang]/films/index.astro
- [X] T019 Parametrizar el índice de runway — src/pages/[...lang]/runway/index.astro

**Details for T015-T019**: idénticas salvo el nombre de la colección. Para cada una:
1. `git mv src/pages/{col} 'src/pages/[...lang]/{col}'` (mueve índice y detalle a la vez; el detalle se completa en la Fase 5).
2. Imports relativos de `../../` a `../../../`.
3. Añadir:
```astro
import { localeStaticPaths } from "../../../i18n/routing";
import { getTranslation } from "../../../i18n";
export const getStaticPaths = localeStaticPaths;
const { locale } = Astro.props;
const t = getTranslation(locale);
```
4. Los literales españoles de `<BaseLayout title="Campañas | Luisa Benítez" description="…">` (campaigns/index.astro líneas 13-14 y equivalentes) pasan a `title={t.collections.campaigns.title}` / `description={t.collections.campaigns.description}` — las claves creadas en T002/T003.
No se toca ni el `<Grid>` ni las props de `<Card>`: los enlaces ya los arregló T010.

**Checkpoint Fase 4**:
- [X] `pnpm build` da **79** páginas (74 + 5 índices EN).
- [X] `/en/campaigns/` existe y su `<title>` es «Campaigns | Luisa Benítez» (no «Campañas»).
- [X] `/campaigns/` conserva exactamente el mismo `<title>` y `<meta description>` que en el baseline.
- [X] Desde `/en/campaigns/`, el `href` de cada tarjeta empieza por `/en/`.

---

## Fase 5: Fichas de detalle (BLOQUEADA POR EL PR #62)

**Propósito**: las 36 fichas en inglés. **No empezar hasta que #62 esté mergeado y esta rama rebasada**: toca los mismos cinco ficheros.

- [X] T020 Parametrizar el detalle de campañas — src/pages/[...lang]/campaigns/[...slug].astro
- [X] T021 Parametrizar el detalle de celebridades y eventos — src/pages/[...lang]/celebrity-events/[...slug].astro
- [X] T022 Parametrizar el detalle de editoriales — src/pages/[...lang]/editorials/[...slug].astro
- [X] T023 Parametrizar el detalle de cine — src/pages/[...lang]/films/[...slug].astro
- [X] T024 Parametrizar el detalle de runway — src/pages/[...lang]/runway/[...slug].astro

**Details for T020-T024**: los ficheros ya están movidos (T015-T019). En cada uno:
```astro
import { collectionLocalePaths, localizedPath } from "../../../i18n/routing";
export async function getStaticPaths() {
	return collectionLocalePaths(await getCollection("campaigns"));
}
const { entry, locale } = Astro.props;
const t = getTranslation(locale);
```
Enlace de vuelta (línea ~35): `href="/campaigns"` → `href={localizedPath(locale, '/campaigns')}` y `Volver` → `{t.common.back}`.
Descripción (Decisión C) — este bloque es el único con lógica de verdad:
```astro
const description = entry.data.descriptionEn ?? entry.data.description;
const descriptionIsSpanish = locale === 'en' && !entry.data.descriptionEn;
…
<p class="description" lang={descriptionIsSpanish ? 'es' : undefined}>{description}</p>
```
`lang="es"` **solo** cuando se cae al español dentro de una página inglesa: así el lector de pantalla cambia de voz (WCAG 3.1.2) en vez de leer español con fonética inglesa. En las páginas españolas el atributo no se emite (sería redundante con `<html lang="es">`).
El `title` del `<BaseLayout>` usa `entry.data.title`, que son nombres propios: **no se traduce**. El `path={Astro.url.pathname}` que ya pasan es correcto en ambos idiomas, no se toca.
**No tocar** el marcado de galería ni los `<video>`: es justo lo que cambia el PR #62.

**Checkpoint Fase 5**:
- [X] `pnpm build` da **115** páginas. Ni una más ni una menos.
- [X] `dist/en/` contiene exactamente **43** ficheros HTML.
- [X] `/en/campaigns/bruno-magli/` existe; su enlace de vuelta apunta a `/en/campaigns` y dice «Back».
- [X] La descripción de esa ficha se pinta con `lang="es"`.
- [X] `/campaigns/bruno-magli/` sigue existiendo, con «Volver» y sin `lang` en el párrafo.

---

## Fase 6: Verificación (obligatoria — un enlace olvidado es una regresión muda)

**Propósito**: convertir «creo que están todos los enlaces» en un comando que falla si no lo están.

- [X] T025 Crear el gate de enlaces internos por idioma — scripts/check-locale-links.mjs

**Details for T025**: dos comprobaciones en un script, sobre el **build de producción** (nunca sobre el dev server).

**(a) Gate de fuente** — ningún literal de ruta interna fuera del helper:
```bash
grep -rnE 'href=("/|\{`/)' src/ --include='*.astro' \
  | grep -vE '^src/(components/MainHead\.astro|pages/(about\.astro|publicity/|celebrities/|work/))'
```
Debe devolver **cero líneas**. Las exclusiones son deliberadas y están justificadas: MainHead son recursos de la raíz del sitio (T012) y esos cuatro caminos son los stubs de redirección solo-ES (Decisión E). Cualquier otra línea es un enlace que se olvidó de pasar por `localizedPath`.

**(b) Gate de salida** — el que de verdad atrapa las regresiones, porque mira el HTML generado:
```js
// recorre dist/en/**/*.html y saca todos los href="/..."
// permitidos: /en/…, /_astro/…, /assets/…, /favicon.svg, /favicon.ico,
//             /apple-touch-icon.png, /manifest.webmanifest
// cualquier otro href absoluto en una página EN = fallo, se imprime fichero -> href
// exit code 1 si hay alguno
```
Este gate habría cazado los tres fallos que el explorador marcó como críticos (Nav, Card, enlaces de vuelta) sin necesidad de abrir el navegador.

- [X] T026 Exponer el gate como script de npm — package.json

**Details for T026**: `"check:links": "node scripts/check-locale-links.mjs"`. Se ejecuta **después** de `pnpm build`, sobre `dist/`.

- [X] T027 Verificar el recuento de páginas y la inmutabilidad de las URLs españolas — dist/

**Details for T027**: el listado del baseline ya está congelado en `.sdd/i18n-paginas-en/baseline-es-urls.txt` (72 líneas, generado con este mismo comando antes de empezar).
```bash
pnpm build                                    # debe decir: 115 page(s) built
find dist -name '*.html' | wc -l              # 115
find dist/en -name '*.html' | wc -l           # 43
# LA COMPROBACIÓN QUE IMPORTA: ninguna URL española se ha movido
diff .sdd/i18n-paginas-en/baseline-es-urls.txt \
     <(find dist -name '*.html' | sed 's|^dist||' | grep -v '^/en/' | sort)
# ↑ debe salir VACÍO. Si sale algo, el cambio rompe URLs publicadas: parar.
grep -c '<loc>' dist/sitemap-0.xml            # 86 (43 ES + 43 EN)
```
**Recordatorio para quien revise el diff de `dist/`**: los hashes `data-astro-cid-*` y los nombres de chunk CSS de las páginas ES **van a cambiar** porque los ficheros se han movido. Es esperado y benigno (Decisión A). Para comparar contenido de verdad, normalizar primero: `sed -E 's/data-astro-cid-[a-z0-9]+/CID/g; s/\.[A-Za-z0-9_-]{8}\.css/.HASH.css/g'`.

- [X] T028 Medir en Chromium headless sobre el build de producción — dist/

**Details for T028**: servir `dist/` (p. ej. `npx serve dist` o `python3 -m http.server` desde `dist/`) y conducir el navegador con `playwright-core` desde el scratchpad. Binario: `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`.
**REGLA DE MEDICIÓN, no negociable**: medir contra el **build de producción**, nunca contra el dev server (infla los scripts ~40×). Y `body` lleva `overflow-x: hidden`, así que un desbordamiento **no** produce barra de scroll: se recorta en silencio. **Comparar `getBoundingClientRect().right` contra `window.innerWidth`; NO usar `scrollWidth`.**
Páginas a medir, en 390px, 768px y 1440px: `/en/`, `/en/campaigns/`, `/en/campaigns/bruno-magli/`, `/en/contact/`, y sus equivalentes ES para comparar.
```js
// desbordamiento real, inmune a overflow-x: hidden
const bad = await page.evaluate(() => [...document.querySelectorAll('body *')]
  .filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
  .map(el => el.tagName + '.' + el.className));
```
Comprobar además: el nav inglés no desborda en 1440px (las etiquetas EN tienen longitudes distintas de las ES — «Celebrity & Events» vs «Celebridades y eventos»), el conmutador de idioma es alcanzable con teclado, y la hamburguesa sigue apareciendo/desapareciendo en el cruce de 88em (1408px) en los dos idiomas.

- [X] T029 Confirmar que los stubs solo-ES siguen intactos — dist/

**Details for T029**: comprobar que **NO** existen `dist/en/about/`, `dist/en/publicity/`, `dist/en/celebrities/`, `dist/en/work/` ni `dist/en/404.html` (Decisión E), y que sí siguen existiendo sus versiones españolas con su `meta refresh` y su `canonical` sin tocar. Comprobar también que el sitemap no lista ninguna de las rutas viejas, ni en ES ni en EN.

**Checkpoint Fase 6**:
- [X] `pnpm check:links` sale con código 0 y cero hallazgos en los dos gates.
- [X] El `diff` contra `baseline-es-urls.txt` está vacío.
- [X] 115 páginas, 43 en `dist/en/`, 86 URLs en el sitemap.
- [X] Cero elementos con `rect.right > innerWidth` en las cuatro páginas EN y los tres anchos.
- [X] Navegación EN completa a mano: `/en/` → tarjeta → ficha → volver → nav → contacto, **sin caer ni una vez en español**.

---

## Dependencies & Execution Order

### Batch Assignments for Sub-Agents

| Batch | Tasks | File | Parallel | Depends on |
|-------|-------|------|----------|------------|
| A | T001 | src/i18n/routing.ts | Yes | — |
| B | T002-T003 | src/i18n/es.ts, src/i18n/en.ts | Yes | — |
| C | T004 | src/content.config.ts | Yes | — |
| D | T005 | astro.config.mjs | Yes | — |
| E | T006-T007 | src/layouts/BaseLayout.astro, src/components/SEO.astro | Yes | A |
| F | T008-T009 | src/components/Nav.astro | Yes | A, B |
| G | T010-T011 | src/components/Card.astro, src/components/CvDownloadLink.astro | Yes | A |
| H | T012 | src/components/Footer.astro | Yes | A |
| I | T013 | src/pages/[...lang]/index.astro | Yes | A, B, E, F, G |
| J | T014 | src/pages/[...lang]/contact.astro | Yes | A, B, E |
| K | T015-T019 | src/pages/[...lang]/{campaigns,celebrity-events,editorials,films,runway}/index.astro | No | A, B, E, G |
| L | T020-T024 | src/pages/[...lang]/{campaigns,celebrity-events,editorials,films,runway}/[...slug].astro | No | K, **PR #62 mergeado** |
| M | T025-T026 | scripts/check-locale-links.mjs, package.json | Yes | — |
| N | T027-T029 | dist/ | No | Todos los anteriores |

**Notas sobre el paralelismo:**

- **Oleada 1**: A, B, C, D, M — sin dependencias entre sí, ficheros distintos.
- **Oleada 2**: E, F, G, H — cuatro batches de componentes, ficheros disjuntos.
- **Oleada 3**: I, J (páginas estáticas). K puede ir aquí también si E y G están cerrados.
- **Oleada 4**: L, en cuanto #62 esté mergeado.
- **Oleada 5**: N.
- **K y L no son paralelos entre sí** aunque toquen ficheros distintos: K hace el `git mv` de los cinco directorios y L trabaja sobre ficheros ya movidos. Si corrieran a la vez, L editaría rutas que K está moviendo.
- K y L son cinco ediciones mecánicas de la misma forma cada uno: caben de sobra en un solo sub-agente.

### Within Each Batch

- El helper (A) antes que cualquier consumidor.
- Las claves de i18n (B) antes de las páginas que las leen.
- Componentes antes que páginas: si Card se arregla después de mover las páginas, el batch de páginas no se puede verificar.
- La verificación (N) al final, siempre sobre el build de producción.

---

## Implementation Strategy

### Primero lo mínimo demostrable

1. Fases 1-2: cimientos y componentes. **Todavía 72 páginas** — el sitio español no se ha movido.
2. Fase 3: aparecen `/en/` y `/en/contact/`. **Aquí ya se puede enseñar a David algo real** aunque las colecciones aún den 404 en inglés.
3. **PARAR Y VALIDAR**: el español está intacto (T027 en corto), el inglés se ve bien.
4. Fase 4: los cinco índices.
5. Fase 5 (tras #62): las 36 fichas.
6. Fase 6: los gates.

### Entrega incremental

Cada fase deja el sitio publicable: las URLs españolas nunca cambian, y las inglesas aparecen por bloques. En el peor caso —quedarse en la Fase 4— el resultado es un sitio inglés con home, contacto y cinco listados; navegable, aunque las fichas sigan solo en español.

---

## 4. Clarifications

### Sesión 2026-07-30

**La herramienta `AskUserQuestion` no está disponible para este sub-agente**, así que el interview no se pudo ejecutar de forma interactiva. Las preguntas van en el envelope para que el orquestador las traslade a David. El plan lleva una recomendación razonada en cada una y **es ejecutable con las recomendaciones tal cual**; las respuestas solo pueden cambiar los puntos marcados abajo.

**Preguntas abiertas (bloquean el merge, no el arranque):**

- **[Contenido]** Q: Las 36 fichas tienen descripción solo en español. ¿Qué hacen las páginas `/en/`? → **A: PENDIENTE.** Recomendación: mostrar el español con `lang="es"` y añadir `descriptionEn` opcional al esquema para que la traducción futura sea solo datos. Afecta a T004 y T020-T024. Si David elige omitir, T020-T024 quitan el párrafo en EN y `descriptionEn` sobra.
- **[Copy]** Q: El tagline de la home (index.astro:157) está escrito a mano y `en.ts` ya marca el bloque `home` como PENDIENTE DE APROBACIÓN. ¿Se propone traducción o se omite en EN? → **A: PENDIENTE.** Recomendación: proponer la traducción, marcarla como pendiente y **que David la apruebe antes del merge**. Mover la cadena a i18n es obligatorio en cualquier caso (T002/T003/T013); lo único que decide David es el valor de la clave inglesa.
- **[UX]** Q: ¿Entra el conmutador de idioma ES/EN en este cambio? Sin él, `/en/` existe pero **no hay forma de llegar desde el sitio**: solo por URL directa o por Google. → **A: PENDIENTE.** Recomendación: sí, T009, dos enlaces en el pie del menú junto al conmutador de tema. Es lo que convierte «las páginas existen» en «el sitio inglés es navegable», que es el enunciado del issue #40.
- **[SEO]** Q: `SEO.astro` tiene props `locale`/`alternates` reservadas y un marcador «Phase 4: hreflang + og:locale here». ¿Se emiten ahora? → **A: PENDIENTE.** Recomendación: sí, T007. Con las dos variantes publicadas y sin hreflang, Google puede leerlas como contenido duplicado. Es el momento para el que se reservaron esas props.

**Decisiones tomadas dentro del plan, sin necesidad de preguntar** (con evidencia medida, ver §2):

- **[Arquitectura]** Parámetro rest `[...lang]` en la raíz de `src/pages/`, con `undefined` para el español. Es la única forma de que una sola plantilla emita las dos variantes **sin mover la URL española**. Probado con un build real: 115 páginas, conjunto de URLs ES idéntico al baseline.
- **[Configuración]** `fallback` sigue desactivado y el `filter` del sitemap no cambia de lógica (Decisión E, medido: 43→86 URLs, las EN entran solas).
- **[Alcance]** Las páginas de redirección viejas y el 404 no reciben variante EN: redirigen URLs españolas que estuvieron publicadas; su equivalente inglés nunca existió.
- **[Propagación de idioma]** Los componentes compartidos siguen deduciendo el idioma con `getLocaleFromUrl(Astro.url)`, como hoy. No se añade prop-drilling: la plomería existente ya funciona bajo el nuevo enrutado.

**Cobertura de PRD**: no existe `prd.md` para este cambio; la fuente de requisitos es `exploration.md` + el enunciado del issue #40. Correspondencia: URLs ES intactas → T001, T027 · enlaces correctos por idioma → T008, T010, T020-T024, T025 · hueco de contenido → T004, T020-T024 · tagline → T002, T003, T013 · astro.config → T005 · verificación → T025-T029.

## 5. Risks & Considerations

**R1 — Un `href` interno olvidado (probabilidad alta si no se automatiza, impacto alto).** Es el fallo que dejaría la función inútil: el visitante inglés vuelve al español en el primer clic y no se entera nadie, porque no hay error ni 404. Mitigación: T025, con un gate que mira el HTML generado en `dist/en/` y falla si aparece un `href` absoluto que no empiece por `/en/`. Los enlaces enumerados y cubiertos: nav (7 + logo), tarjetas, los 5 enlaces de vuelta, CV, y los pasarela auditados en T012.

**R2 — `aria-current` pegado en «Home» en todo el sitio inglés (probabilidad alta, impacto medio).** Documentado en Before/After §1: al localizar los hrefs, el `href !== '/'` de `isCurrentPage` deja de proteger y `pathname.startsWith('/en/')` se cumple siempre. No da error; simplemente el nav miente a los lectores de pantalla. Mitigación: T008 lo arregla explícitamente y el checkpoint de la Fase 2 lo comprueba.

**R3 — Conflicto con el PR #62 (probabilidad certera si no se ordena, impacto medio).** #62 modifica los cinco `[...slug].astro` que también toca la Fase 5, y además esos ficheros se **mueven** de sitio — un merge sobre ficheros movidos es especialmente feo. Mitigación: batch L bloqueado hasta que #62 esté mergeado y la rama rebasada. Fases 1-4 no lo tocan.

**R4 — Ruido en el diff de `dist/` (probabilidad certera, impacto bajo, potencial de susto alto).** Mover ficheros de página cambia los hashes `data-astro-cid-*` y los nombres de chunk CSS: **todas** las páginas ES saldrán como «modificadas» aunque sean semánticamente idénticas. Un revisor puede concluir que se ha roto el español. Mitigación: T027 documenta el `sed` de normalización y compara **conjuntos de URLs**, que es lo que de verdad importa.

**R5 — Profundidad de imports al mover ficheros (probabilidad alta, impacto bajo).** Cada nivel añade un `../`. En el prototipo falló dos veces seguidas, con un error de build claro (`Could not resolve …`), así que se detecta rápido — pero cuesta tiempo. Mitigación: T013/T015-T019 dicen la profundidad exacta.

**R6 — El `path` fijo de contact.astro (probabilidad media, impacto alto en SEO).** `path="/contact/"` está escrito a mano y alimenta el `canonical`. Si se olvida, `/en/contact/` declarará como canónica la página española y Google dejará de indexarla. Mitigación: T014 lo señala explícitamente. Es el único `path` fijo del repo; los `[...slug].astro` ya usan `Astro.url.pathname`.

**R7 — Estilos con ámbito en el conmutador de idioma (probabilidad media, impacto bajo).** Los `<style>` de Astro no cruzan el límite del componente: si las reglas de `.lang-switch` se escriben fuera de Nav.astro, el conmutador sale sin estilos y el fallo no da error. Mitigación: anotado en T009.

**R8 — El breakpoint 88em duplicado (probabilidad baja, impacto alto).** `window.matchMedia('(min-width: 88em)')` (Nav.astro:169) y `@media (min-width: 88em)` (Nav.astro:417) tienen que ir siempre juntos; si se desincronizan, la hamburguesa se rompe en cierto rango de anchos sin ningún error. Este cambio **no toca ninguno de los dos** — el riesgo es que alguien los toque «de paso» al editar Nav en T008/T009. Mitigación: aviso explícito en T008 y comprobación del cruce de 1408px en T028.

**R9 — El nav inglés desborda (probabilidad baja, impacto medio).** Las etiquetas EN no miden lo mismo que las ES y `body` lleva `overflow-x: hidden`, así que un recorte no se ve. Mitigación: T028 mide `rect.right` contra `window.innerWidth`, nunca `scrollWidth`.

**R10 — Descripciones españolas en páginas inglesas (probabilidad certera por diseño, impacto bajo).** Es una consecuencia aceptada de la Decisión C, no un descuido: 36 fichas técnicas de una línea, mayormente nombres propios. Mitigación: `lang="es"` para los lectores de pantalla, y `descriptionEn` en el esquema para que la traducción futura no vuelva a tocar código.

---

## Testing

No hay runner de tests en el repo y este cambio no lo introduce. La verificación es la Fase 6, y es ejecutable y repetible:

| Qué se comprueba | Por qué importa | Dónde |
|---|---|---|
| `localizedPath('es', p) === p` | Es la garantía de que ninguna URL publicada se mueve | Checkpoint Fase 1 |
| Paridad de claves es.ts/en.ts | Ya la fuerza el tipo `Translation`; falla en `astro check` | Checkpoint Fase 1 |
| Gate de fuente (grep) | Detecta rutas escritas a mano fuera del helper | T025 (a) |
| Gate de salida (`dist/en/`) | Detecta el fallo de verdad: enlaces que devuelven al español | T025 (b) |
| Recuento 115 / 43 EN | Detecta rutas que faltan o que sobran | T027 |
| `diff` contra `baseline-es-urls.txt` | **La comprobación crítica**: 72 URLs ES intactas | T027 |
| Desbordamiento en Chromium headless | `overflow-x: hidden` esconde los recortes | T028 |
| Ausencia de `/en/` para los stubs | Confirma la Decisión E | T029 |

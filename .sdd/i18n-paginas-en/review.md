# Review: i18n-paginas-en

**Fecha**: 2026-07-30
**Rama**: `feat/i18n-paginas-en` (árbol de trabajo sin commitear)
**Alcance**: issues #40 (páginas EN), #41 (conmutador de idioma), #42 (hreflang)
**Veredicto**: **warning** — ningún hallazgo crítico. Cuatro asuntos menores, ninguno bloqueante.

---

## Nota previa sobre el método

El encargo advertía de que durante la implementación varios sub-agentes se pisaron con
`git stash` y destruyeron trabajo que ya había reportado `status: ok`. Por eso **no se ha
dado por buena ninguna afirmación previa**, ni los `[X]` del plan, ni el fichero
`baseline-es-urls.txt`.

Concretamente, lo que se ha reconstruido desde cero en vez de leerse:

- Se ha construido `HEAD` limpio en un **worktree aparte** (`git worktree add --detach`)
  para generar un baseline real de las 72 URLs españolas, en vez de confiar en el listado
  congelado. Los dos coinciden exactamente (ver §1).
- Se ha comparado **página a página** el HTML español de antes y de después, normalizando
  hashes, no solo el conjunto de rutas.
- El gate de enlaces se ha sometido a **cinco mutaciones** sobre una copia del `dist`, para
  comprobar que falla cuando debe fallar (ver §2).
- Todas las mediciones de navegador se han rehecho sobre el build de producción servido
  por HTTP, no sobre el dev server.

---

## 1. Ninguna URL española se ha movido — CONFIRMADO de forma independiente

Esto era el requisito nº1 y se sostiene.

```
worktree limpio de HEAD  →  72 page(s) built
build actual             → 115 page(s) built  (72 ES + 43 EN)

diff  true-baseline(72)  vs  baseline-es-urls.txt   → VACÍO
diff  true-baseline(72)  vs  URLs no-/en/ actuales  → VACÍO
```

El fichero `baseline-es-urls.txt` que dejó el implementador **es correcto**: coincide línea
por línea con el listado regenerado desde `HEAD` limpio. No era necesario confiar en él,
pero resulta que se podía.

Recuentos verificados con el build actual:

| Comprobación | Esperado | Medido |
|---|---|---|
| Páginas HTML totales | 115 | **115** |
| Ficheros HTML en `dist/en/` | 43 | **43** |
| `<loc>` en `sitemap-0.xml` | 86 | **86** (43 de ellos `/en/`) |
| Rutas viejas en el sitemap | 0 | **0** |

### Contenido español: idéntico salvo lo previsto

El conjunto de rutas no basta — una plantilla mal movida puede conservar la URL y cambiar
lo que hay dentro. Se compararon las 72 páginas ES, extrayendo texto visible, `<title>`,
`<html lang>` y el conjunto de `href` (descontando el ruido de hashes de asset):

- **`<title>` y `<html lang>`**: cero cambios en las 72.
- **`href` eliminados**: **cero** en las 72. Solo hay altas.
- **Texto visible**: hay exactamente **un patrón de diff en todo el sitio español**, y es
  `['+ ES', '+ EN', '+ ES', '+ EN']` — las dos etiquetas del conmutador, emitidas dos veces
  (versión `<noscript>` y versión con JS). Nada más cambia.

Es la mejor evidencia posible de que las 44 páginas que salen «modificadas» en el diff de
`dist/` lo están solo por lo que se pretendía. El R4 del plan (susto por el ruido de
hashes) queda resuelto con datos.

---

## 2. Fugas de enlaces — el gate protege de verdad

`pnpm check:links` sale en **0**: 43 páginas revisadas, ningún enlace fuera de `/en/`.

La pregunta importante no era si pasa, sino si la excepción que lleva es lo bastante
estrecha. Se leyó el script y se comprobó que la excepción exige **dos** condiciones a la
vez (`scripts/check-locale-links.mjs:136`):

```js
if (isLangSwitchAnchor(match[0]) && insideLangSwitch(match.index)) continue;
```

es decir, `class="lang-link"` **y además** caer dentro del rango de bytes de un
`<nav class="lang-switch">…</nav>`. No basta con la clase. Para no quedarse en la lectura,
se mutó una copia del `dist` cinco veces:

| Mutación | Resultado |
|---|---|
| Enlace del nav con `href="/campaigns/"` en `/en/` | **detectado**, exit 1 |
| `class="lang-link"` puesta a un enlace **fuera** del `<nav class="lang-switch">` | **detectado**, exit 1 |
| Back-link de ficha con `href="/campaigns"` | **detectado**, exit 1 |
| `card-link` de un índice EN apuntando a `/campaigns/bruno-magli` | **detectado**, exit 1 |
| Fuga a una ruta hipotética `/encargos/` | **NO detectado**, exit 0 → ver Menor 2 |

Las cuatro clases de fuga que el plan identificaba como el riesgo real (R1: nav, tarjetas,
enlaces de vuelta) las caza. La excepción es genuinamente estrecha y falla en la dirección
segura: si alguien reordena los atributos del `<nav>`, el regex deja de casar y el gate
pasa a marcar el conmutador como violación — ruidoso, pero nunca ciego.

Gate (a) del T025 (grep de fuente) ejecutado a mano: **cero líneas**. Ver Menor 3 sobre su
automatización.

---

## 3. Contenido sin traducir: marcado, no inventado — CONFIRMADO

Esto era lo delicado: es el expediente profesional de Luisa.

- **36 de 36** fichas EN renderizan `<p class="description" lang="es">` sobre el texto
  español. Comprobado fichero a fichero en `dist/en/`, no por muestreo.
- **0 de 36** fichas ES llevan atributo `lang` en ese párrafo (sería redundante con
  `<html lang="es">`).
- El atributo cuelga **solo del elemento que contiene el texto español**, no de un
  contenedor mayor — el resto de la ficha sigue siendo `lang="en"` heredado. Es lo correcto
  para WCAG 3.1.2.
- `grep -rn descriptionEn src/content/` → **ningún resultado**. El campo está en el esquema
  (`src/content.config.ts:7-15`, `z.string().optional()`) y sin poblar en todos los JSON.
- La lógica es la del plan, sin desviaciones, en los cinco `[...slug].astro`:
  ```ts
  const description = entry.data.descriptionEn ?? entry.data.description;
  const descriptionIsSpanish = locale === "en" && !entry.data.descriptionEn;
  ```

**Nadie ha inventado traducciones de la copy de Luisa.** Ni una palabra. Los títulos siguen
siendo `entry.data.title` (nombres propios, sin traducir), y lo único que se tradujo son
cadenas de interfaz (`Back`, `Switch language`) y los títulos/descripciones de los cinco
índices, que son metadatos de página, no copy de proyecto.

Consecuencia asumida que conviene tener presente: la `<meta name="description">` y el
`og:description` de las 36 fichas EN también salen en español (mismo `?? description`). Es
coherente con la Decisión C y desaparece sola cuando se rellene `descriptionEn`, pero a
diferencia del párrafo, una meta-etiqueta no se puede marcar con `lang`.

---

## 4. El tagline pendiente — CONFIRMADO

**Español, copiado verbatim.** El literal que vivía a mano en `index.astro` era:

```
Estilista y asistente de moda, Diseñadora de
Modas, Asesora de Imagen y Personal Shopper
```

y en `src/i18n/es.ts` entra como una sola línea con exactamente las mismas palabras, mismas
mayúsculas, misma coma. Verificado además en el HTML renderizado: `dist/index.html` sigue
pintando el mismo texto que el baseline (recordemos: el diff de texto de la home es solo
`+ES +EN`). **No se ha reescrito.**

**Inglés, marcado como pendiente.** `src/i18n/en.ts` lleva un bloque de documentación propio
sobre la clave, además del `PENDIENTE DE APROBACIÓN DE DAVID` que ya tenía el bloque `home`:

> `PENDIENTE DE APROBACIÓN DE DAVID (Decisión D del plan). Traducción candidata del tagline
> español (…). No publicar como copy final sin que David la apruebe antes del merge.`

Es imposible que se cuele por descuido: está marcado en el sitio donde se lee el valor.

---

## 5. Accesibilidad — CONFIRMADO

- **`<html lang>` por idioma**: `en` en las 43 páginas inglesas, `es` en las 72 españolas.
  Cero excepciones.
- **`aria-current="page"`**: exactamente **2 por página** en las 86 páginas con nav (una en
  el bloque `<noscript>`, una en `#menu-content` — el navegador solo parsea una). **Cero
  páginas** con más de 2. Las 29 páginas restantes (28 stubs de redirección + `404.html`)
  tienen 0, que es lo correcto: no son destino de ningún enlace del nav.
  La regresión que el plan documentaba en Before/After §1 **está arreglada de verdad**:
  `isCurrentPage` compara contra `homeHref` (`Nav.astro:69`), no contra `'/'`, y en
  `/en/campaigns/` el único marcado es `/en/campaigns/`, no «Home».
- **Conmutador**: `<nav class="lang-switch" aria-label="Switch language">` en inglés,
  `aria-label="Cambiar de idioma"` en español. Tiene nombre accesible y marca el idioma
  activo (`aria-current` en el enlace del idioma de la página).
- **Medido en Chromium sobre el build de producción** (servido por HTTP, no dev server),
  `/en/campaigns/`:
  - 1440px: conmutador visible en `[1142, 20, 174×69]`, `right=1316 < 1440`. Los dos
    enlaces alcanzables con Tab.
  - 390px con el menú abierto: visible en `[141, 493, 78×29]`. Los dos enlaces alcanzables
    con Tab (12 pulsaciones).
  - Desbordes reales (`rect.right > innerWidth`, **no** `scrollWidth`): **cero** en ambos
    anchos.
- El cruce de la hamburguesa a 1408px se comporta igual en ES y EN (evidencia en
  `t028-measurements.json`, coherente con lo remedido aquí).

---

## 6. SEO — CONFIRMADO, ninguna canónica cruzada

Este era el fallo que habría costado la indexación entera del sitio inglés.

- **Las 43 páginas EN tienen su canónica bajo `/en/`.** Comprobadas una a una: cero
  apuntando a su equivalente español. El `path="/contact/"` fijo que el plan marcaba como R6
  se eliminó de `contact.astro` (igual que el `path="/"` de la home y los
  `path={Astro.url.pathname}` redundantes de las cinco fichas), de modo que `SEO.astro` cae
  en `Astro.url.pathname`, correcto en los dos idiomas.
- **hreflang con URLs absolutas**, las tres variantes, ejemplo real de
  `/en/campaigns/bruno-magli/`:
  ```html
  <link rel="canonical"  href="https://luisabenitez.es/en/campaigns/bruno-magli/">
  <link rel="alternate" hreflang="es"        href="https://luisabenitez.es/campaigns/bruno-magli/">
  <link rel="alternate" hreflang="en"        href="https://luisabenitez.es/en/campaigns/bruno-magli/">
  <link rel="alternate" hreflang="x-default" href="https://luisabenitez.es/campaigns/bruno-magli/">
  ```
  `x-default` al español, como marcaba el plan.
- **`og:locale`**: `en_GB` en las 43 EN, `es_ES` en las españolas.

Única excepción: `404.html` (ver Menor 1).

---

## 7. Código muerto y coherencia — CONFIRMADO

- `src/pages/` no tiene huérfanos ni plantillas duplicadas. Las 13 páginas parametrizadas
  viven bajo `[...lang]/`; fuera quedan exactamente `404.astro`, `about.astro` y los
  directorios `celebrities/`, `publicity/`, `work/` — los cuatro stubs solo-ES de la
  Decisión E.
- **Los 12 movimientos los detecta git como renombrados** (`RM`), así que el historial de
  ficheros con comentarios de diseño muy densos se conserva. Se usó `git mv`, no
  copiar+borrar.
- Imports actualizados a la profundidad correcta: `../../` en `index.astro` y
  `contact.astro`, `../../../` en los diez ficheros de colección. El build resuelve todo (R5
  cerrado).
- **Los stubs se quedaron fuera de `[...lang]` y siguen funcionando**: `dist/about/`,
  `dist/publicity/*`, `dist/celebrities/*`, `dist/work/*` salen **byte a byte idénticos al
  baseline** (28 de las 72 páginas ES no aparecen siquiera en la lista de modificadas), con
  su `meta refresh` y su `canonical` intactos. Y **no** existen `dist/en/about/`,
  `dist/en/publicity/`, `dist/en/celebrities/`, `dist/en/work/` ni `dist/en/404.html`.
- **`astro.config.mjs`**: los comentarios reescritos describen la realidad nueva. Dicen que
  las páginas EN salen de `src/pages/[...lang]/` y no de un `src/pages/en/` duplicado; que
  `fallback` sigue desactivado **pero por otro motivo** (cada ruta EN es una página real, no
  hay 404 del que caer) en vez del razonamiento viejo, que ya no era cierto; y que el
  `filter` del sitemap no cambia de lógica. Las tres afirmaciones son verificables y **las
  tres son ciertas** con este build. Ni una línea de código cambió en ese fichero.

---

## 8. Convenciones del proyecto — CONFIRMADO

- **Comentarios en español**, con la densidad y el tono del código de alrededor. Los nuevos
  no se limitan a describir lo que hace la línea: explican *por qué*, que es el registro del
  repo. `routing.ts:16-21` documenta que `localeParam('es')` devuelve `undefined` porque esa
  línea es la que conserva las 72 URLs publicadas; el bloque de `isCurrentPage`
  (`Nav.astro:56-65`) explica el bug de `aria-current` que evita. Encaja.
- **Estilos con ámbito**: `.lang-switch` y `.lang-link` están en el `<style>` de
  `Nav.astro`, que es donde vive su marcado. En el HTML generado los elementos llevan el
  `data-astro-cid-dmqpwcec` del propio Nav, incluso dentro del `<noscript>`. R7 cerrado.
  Ningún componente ha quedado con el marcado en un sitio y los estilos en otro: los cinco
  `[...slug].astro` y los cinco `index.astro` se movieron enteros, `<style>` incluido.
- **Breakpoint 88em duplicado**: sigue duplicado y sigue **de acuerdo**.
  `window.matchMedia('(min-width: 88em)')` en `Nav.astro:224` y `@media (min-width: 88em)`
  en `Nav.astro:510`. Ninguno de los dos se tocó, y los dos comentarios cruzados que se
  avisan mutuamente («Debe coincidir con el `@media` del nav en los estilos de abajo» /
  «IMPORTANTE: este valor debe coincidir con el `matchMedia` del script») siguen intactos.
  R8 respetado: la trampa se dejó como estaba.

---

## Hallazgos críticos

**Ninguno.** No hay nada que impida commitear.

---

## Mejoras menores (no bloquean)

### Menor 1 — `404.html` declara un `hreflang` a una página que no existe

**Fichero**: `src/layouts/BaseLayout.astro:26`

```ts
const alternates = alternatePaths(stripLocale(path ?? Astro.url.pathname));
```

`alternates` se calcula **incondicionalmente**, y `404.astro` usa `BaseLayout`. Resultado en
`dist/404.html`:

```html
<link rel="alternate" hreflang="en" href="https://luisabenitez.es/en/404/">
```

`/en/404/` no se genera — es una de las rutas que la Decisión E deja deliberadamente fuera.
El conmutador de idioma de esa misma página ofrece también `href="/en/404/"`.

Contradice dos afirmaciones explícitas del plan:
- T007: «No emitir hreflang en las páginas que no tienen variante EN». El razonamiento era
  que los stubs usan `RedirectPage` y no pasan por `SEO.astro` — cierto, y comprobado. Pero
  `404.astro` **sí** pasa por `BaseLayout`, y se quedó fuera de esa cuenta.
- T009: «No hay ninguna página con variante en un solo idioma dentro de `[...lang]`, así que
  el conmutador nunca puede apuntar a un 404». Cierto *dentro* de `[...lang]`; `404.astro`
  está fuera y tiene nav.

**Qué rompe en la práctica**: poco. `404.html` no está en el sitemap, y GitHub Pages sirve
`404.html` para cualquier ruta desconocida, así que quien pulse «EN» ahí acaba en la misma
página de error. Pero es una declaración falsa en HTML publicado, y si algún día el
alojamiento deja de ser GitHub Pages deja de ser inocua.

**Arreglo sugerido** (una prop, sin tocar el resto): que `BaseLayout` acepte algo tipo
`alternates={false}` y que `404.astro` lo use; o calcular `alternates` solo cuando la ruta
esté bajo `[...lang]`.

### Menor 2 — el allowlist del gate tiene `/en` como prefijo, no como valor exacto

**Fichero**: `scripts/check-locale-links.mjs:29-34`

```js
const ALLOWED_ABSOLUTE_PREFIXES = [
    "/en/",
    "/en", // /en (sin barra final) también es válido, …
```

`"/encargos/".startsWith("/en")` es `true`. Cualquier ruta española futura cuyo nombre
empiece por «en» pasaría el gate sin avisar. Verificado con la mutación 5: se inyectó
`href="/encargos/"` en `dist/en/index.html` y el gate salió con **exit 0** y mensaje «OK».

**Impacto hoy: cero.** Ninguna de las 72 rutas empieza por «en» (`/editorials`, `/campaigns`,
`/celebrity-events`, `/celebrities`, `/contact`, `/films`, `/publicity`, `/runway`, `/work`,
`/about`, `/404`). Es una mina para el futuro, no un fallo actual.

**Arreglo**: mover `"/en"` de `ALLOWED_ABSOLUTE_PREFIXES` a `ALLOWED_ABSOLUTE_EXACT`. Una
línea. La intención del comentario («`/en` sin barra final también es válido») se cumple
igual, y deja de casar con `/encargos/`.

### Menor 3 — `pnpm check:links` solo ejecuta la mitad del T025

El T025 especificaba «**dos** comprobaciones en un script»: el gate (a) de fuente (el grep
de literales `href="/…"` fuera del helper) y el gate (b) de salida sobre `dist/en/`. El
script implementa **solo el (b)**; el (a) no está ni en el `.mjs` ni en `package.json`.

Se ejecutó a mano y devuelve **cero líneas**, así que el estado actual es limpio. Pero un
gate que no está automatizado no protege de la siguiente página que alguien añada: el (a)
es justamente el que atrapa un `href="/contact/"` escrito a mano *antes* de que llegue a
producir HTML.

**Arreglo**: añadir el grep al script (o un segundo script encadenado en `check:links`).

### Menor 4 — comentarios que apuntan a rutas de fichero que ya no existen

Cuatro referencias a la estructura vieja de `src/pages/`:

| Fichero | Dice | Debería decir |
|---|---|---|
| `src/i18n/es.ts:35` | `src/pages/index.astro` | `src/pages/[...lang]/index.astro` |
| `src/i18n/es.ts:45` | `src/pages/index.astro (línea ~157)` | ídem |
| `src/pages/[...lang]/index.astro:94` | `src/pages/contact.astro` | `src/pages/[...lang]/contact.astro` |
| `src/pages/about.astro:4` | `src/pages/index.astro` | `src/pages/[...lang]/index.astro` |

La línea 45 de `es.ts` es **código nuevo de este cambio** y nace ya desactualizada. En un
repo cuyos comentarios son la documentación real, una ruta que no existe hace perder tiempo.
Las otras tres son preexistentes y arrastradas por el movimiento.

### Menor 5 — `aria-current="true"` en el conmutador, pudiendo ser `"page"`

**Fichero**: `src/components/Nav.astro:135` y `:176`

El enlace del idioma activo apunta a la página en la que ya estás, así que
`aria-current="page"` sería semánticamente más preciso que el genérico `"true"`. `"true"` es
válido y los lectores de pantalla lo anuncian igual («actual»), así que es cosmética
semántica. Lo apunto solo porque el resto del nav sí usa `"page"` y la mezcla puede
despistar a quien lo lea. El plan pedía literalmente `'true'`, así que la implementación
siguió la instrucción.

Relacionado, del mismo tamaño: el `<nav class="lang-switch">` queda **anidado** dentro del
`<nav>` raíz de `Nav.astro`. Es HTML válido, pero deja dos landmarks de navegación en la
página, y el exterior no tiene nombre accesible (eso último ya era así antes de este
cambio). Si algún día se etiqueta el nav principal, se resuelven los dos de una vez.

---

## Nota sobre las verificaciones del plan

El checkpoint de la Fase 1 pide `pnpm astro check` sin errores. **Ese comando no es
ejecutable en este repo**: `@astrojs/check` no está instalado y `astro check` responde
pidiendo instalarlo de forma interactiva. No es un fallo de esta implementación —
la dependencia nunca estuvo— pero conviene saber que ese checkpoint no se pudo cumplir tal
como está escrito.

Como sustituto se ejecutó `tsc --noEmit`: **cero errores en el código nuevo**. Los tres que
aparecen son preexistentes y de entorno (`astro:content` sin tipos fuera del pipeline de
Astro, `import.meta.env` en `src/i18n/index.ts`, y tipos duplicados de Vite en
`astro.config.mjs`), y salen igual en el worktree de `HEAD` limpio. En particular, `en.ts`
compila contra el tipo `Translation`, así que **la paridad de claves entre `es.ts` y `en.ts`
sí está verificada**, que era lo que ese checkpoint quería garantizar.

---

## Lo que está bien hecho

- **La garantía de compatibilidad de URLs no es una promesa, es una medición** — y aguanta
  una verificación independiente hecha desde cero, sin tocar el árbol de trabajo. Es
  exactamente lo que se necesitaba en un sitio ya indexado.
- **El gate de enlaces no es teatro.** Sobrevive a cuatro mutaciones distintas y su
  excepción exige dos condiciones simultáneas en vez de una clase suelta. Alguien pensó en
  cómo se rompería.
- **La honestidad con la copy de Luisa.** 36 descripciones sin traducir, 36 marcadas con
  `lang="es"`, cero inventadas, un campo opcional preparado para cuando ella apruebe las
  traducciones, y el único tagline propuesto marcado como pendiente en el punto donde se
  lee. Es la decisión difícil bien ejecutada.
- **La trampa del breakpoint 88em se respetó.** El plan avisaba de que el riesgo era que
  alguien lo tocara «de paso» al editar Nav. Se editó Nav bastante y no se tocó.
- **El `path` fijo de `contact.astro` (R6) no solo se arregló: se eliminó**, junto con los
  demás `path` redundantes. Es mejor que lo que pedía el plan — quita la clase entera de
  fallo en vez de corregir la instancia.
- **`git mv` de verdad**, con los 12 renombrados detectados por git. El historial de unos
  ficheros que llevan comentarios de diseño irreemplazables se conserva.
- Los comentarios de `astro.config.mjs` se reescribieron para decir la verdad nueva en vez
  de dejar en pie un razonamiento caducado. Es el tipo de mantenimiento que casi nadie hace.

---

## Próximos pasos

1. **Antes del merge, no antes del commit**: que David apruebe el tagline inglés
   (`src/i18n/en.ts`). Si no lo aprueba, la salida es la opción (c) del plan: omitir el
   párrafo en EN, que no bloquea nada.
2. Arreglar el Menor 2 (una línea, `"/en"` a `ALLOWED_ABSOLUTE_EXACT`) — es el que más
   barato sale y el que más silenciosamente falla.
3. Decidir sobre el Menor 1 (`hreflang` del 404). Si se considera aceptable, dejarlo
   anotado en el propio `404.astro` para que el siguiente que lo mire no lo tome por un
   descuido.
4. Menores 3 y 4 cuando toque; ninguno urge.
5. Commitear. El cambio está listo.

# Review — `about-page`

**Fase**: review · **Fecha**: 2026-07-28 · **Base**: `main` · **Plan**: `.sdd/about-page/plan.md`
**Estado**: ⚠️ `warning` — sin defectos críticos; dos observaciones menores, ninguna bloqueante.

---

## 1. Resumen

Se publica `/about` con la copy final aprobada en español, hermana visual de `/contact`: nueva
página (`src/pages/about.astro`), nuevo módulo de copy (`src/data/about.ts`), extracción del
enlace de CV (`src/components/CvDownloadLink.astro`), actualización de `profile.ts`
(`baseRegion`, `services`, `featuredIn`), entrada "Sobre mí" en el nav con el breakpoint subido a
`84em`, y `<html lang="es">` en `BaseLayout` (WCAG 3.1.1, nivel A, afecta a todo el sitio).

`pnpm build` limpio: 40 páginas, sin errores ni warnings; `/about/` presente en `sitemap-0.xml`.

---

## 2. Alineación con el plan

Las 14 tareas del plan están implementadas y verificadas. Repaso de los siete puntos de riesgo que
el encargo de revisión señalaba como los más probables de fallar:

### 2.1 Copy verbatim — ✅ **idéntica carácter a carácter**

Comparación programática (no visual) de `src/data/about.ts` contra
`plan/03-content-pages/about-copy-final-es.md`, normalizando únicamente los saltos de línea de
maquetación del `.md`:

| Párrafo | Longitud | Resultado |
|---|---|---|
| ¶1 | 222 chars | IDÉNTICO |
| ¶2 | 575 chars | IDÉNTICO |
| ¶3 | 401 chars | IDÉNTICO |

Incluye los puntos que R6 marcaba como frágiles: las rayas «—» de `—me formé en Colombia…España—`,
la «e» de `Agatha Paris e YSL`, y todas las tildes (`Numéro`, `México`, `revés`, `caía`).

`profile.services` coincide exactamente con los 5 ítems del bloque **Servicios** del documento, y
`profile.featuredIn` con los 4 de **Publicaciones** en su orden (`Numéro Netherlands` primero).
Fuera "Fucking Young" y "lookbook"/"Personal shopping", con el `TODO(H-5 / #12)` reescrito
explicando la baja.

### 2.2 Contrato de propiedad de CSS (C4) — ✅ **verificado en el CSS compilado, no en el fuente**

Este era el defecto invisible en runtime (hoy `cvPath` es `undefined`), así que se comprobó sobre
`dist/`, no leyendo el `<style>`:

```
.cv[data-astro-cid-4ljavl4u]{…}   ← CvDownloadLink.astro
.cv[data-astro-cid-kh7btl4r]{…}   ← about.astro (redeclarada)
.ctas[data-astro-cid-kh7btl4r]>a{padding-block:.5rem}   ← sin cid en el <a>: alcanza al hijo
```

Los dos bloques `.cv` existen con hashes distintos, y el selector del área táctil compila a
`> a` sin hash — es decir, el `:global()` está bien puesto y sí alcanza al `<a>` que vive dentro de
`<CvDownloadLink />`. Ambos ficheros declaran además su propio
`a:focus-visible { outline: 2px solid var(--gray-0); outline-offset: 3px }`, y ambos su propio
bloque `@media (prefers-reduced-motion: reduce)` para `.cv` y `.cv .arrow`.

`measurements.md` (T013, con el stub de `cvPath` activo) lo confirma midiendo: el enlace de CV
renderiza con tipografía, color y anillo de foco **idénticos** en `/about` y `/contact`, en ambos
temas — ninguna regla quedó huérfana. Los tres CTAs de `/about` miden 46px de alto (≥44px).

### 2.3 Regla de importador único — ✅

```
$ grep -rn "data/about" src | grep -v "pages/about.astro"
(vacío)
```

`about.astro` es el único importador. La forma del módulo respeta la restricción documentada
(objetos planos anidados, strings y arrays de strings, `as const`, `bio` como tupla de 3): la
migración de Fase 4 sigue siendo mover el objeto a `es.ts` + cambiar una línea de import.

### 2.4 Sincronía del breakpoint del nav — ✅

`src/components/Nav.astro:153` → `window.matchMedia('(min-width: 84em)')`
`src/components/Nav.astro:377` → `@media (min-width: 84em)`

Mismo valor, y no queda ningún `78em` funcional en `src/` (la única aparición es dentro del
comentario histórico). La medición de `measurements.md` además prueba la sincronía de forma
observable, no por inspección: a 1330px (justo bajo el borde) el botón del hamburguesa está
visible **y** responde al click abriendo el panel — si CSS y JS hubieran divergido, uno de los dos
motores habría tratado ese ancho como escritorio y el botón habría quedado visible pero inerte.

### 2.5 Regresión en `/contact` — ✅ **el diff está acotado**

El diff de `contact.astro` contiene exactamente cuatro cosas, y nada más:

1. `import CvDownloadLink` + sustitución del bloque `{profile.cvPath && (<a class="cv"…>)}` por
   `<CvDownloadLink />`, en la misma posición del markup.
2. `value: \`${profile.baseCity}, España\`` → `` `${profile.baseCity}, ${profile.baseRegion}` `` —
   texto renderizado idéntico (`A Coruña, España`, confirmado en el HTML generado).
3. `min-width: 0` en `.portrait` y `.panel` (fix de desborde de los hallazgos 3 y 4).
4. Borrado de las reglas `.cv*` huérfanas, y `@media (prefers-reduced-motion)` reducido a
   `.channel-value`.

**Ninguna regla visual se perdió**: las cuatro reglas `.cv*` borradas (`.cv`, `.cv .arrow`,
`.cv:hover/:focus-visible`, `.cv:hover .arrow`) están reproducidas verbatim en
`CvDownloadLink.astro`, valor a valor, incluidas las transiciones. La única pérdida real es la
prevista por R5 —el `<a>` hijo ya no recibe `.panel > * { width: 100%; max-width: 34rem }`— y está
**medida** en T013: impacto visual nulo (`align-self: flex-start` ya fijaba el ancho al contenido),
con el efecto lateral de reducir el área de clic a la derecha del texto de ~544px a ~135px.
Documentada en un comentario dentro del propio `contact.astro`, donde se encontrará.

Se añadió además un comentario que explica el porqué de cada `min-width: 0` con la medida concreta
(14px a 360px, 61px con text-spacing) — es el tipo de comentario que evita que alguien lo borre
por "parecer redundante".

### 2.6 Tokens de color — ✅

```
$ grep -n "gray-[2-6]00" src/pages/about.astro src/components/CvDownloadLink.astro
(vacío)
```

Solo `--gray-0` (headline, wordmarks, `.cv`, anillo de foco), `--gray-50` (bio, servicios, valores)
y `--gray-100` (eyebrow, etiquetas). El filete usa `--gray-700`, no `--gray-800`. Sin azules.

### 2.7 Fugas de alcance — ✅ en `src/`, ⚠️ en el árbol de trabajo

Dentro de `src/` no hay nada fuera de alcance: sin traducción EN, sin PDFs de CV, sin `/press`,
sin trabajo de rol/créditos de Fase 2, y el nav solo recibe la entrada nueva más las tres
correcciones de foco que B2 autorizaba. Ver el punto **M2** para lo que sí hay fuera de `src/`.

### 2.8 Verificaciones adicionales sobre el HTML generado

- `<html lang="es">` en `/about/` (y por construcción en las 40 páginas).
- Árbol de encabezados: un solo `<h1>` ("Luisa Benítez"), dos `<h2>` ("Servicios",
  "Publicaciones"), sin saltos de nivel. Sin `aria-label` en el `<h1>` (C1 respetado).
- `role="list"` presente en las dos listas con `list-style: none`.
- `<dl>` con **tres** pares reales (`Base` → "A Coruña, España", `Idiomas` → "Español (nativo),
  Inglés", `Disponibilidad` → "Disponible para viajar"), sin `·` comprimiendo dos hechos.
- Sin `<hr>` en la página; el filete es `border-top` vía `.rule`.
- `aria-current="page"` en el enlace `/about/` del nav (dos veces: lista de escritorio y panel
  móvil, que es lo esperado), con cue no cromático (`text-decoration: underline`).
- `cvPath` sigue siendo `undefined` en `profile.ts`: **el stub de T013 no está en el diff**, y no
  hay ninguna referencia a `/cv/test.pdf` en `src/`.

---

## 3. Problemas críticos

**Ninguno.** Nada bloquea el commit.

---

## 4. Mejoras menores (no bloqueantes)

### M1 — Comentario obsoleto en `Nav.astro:352`: dice "7 enlaces", ahora son 8

`src/components/Nav.astro`, líneas 351-354:

```
 * 84em, no 50em: con 7 enlaces la fila completa no cabe por debajo de eso.
 * A 50em la columna central de la rejilla (que no encoge) empujaba el
 * conmutador de tema fuera del viewport. Hasta 64em se usa el menú
 * hamburguesa.
```

El valor se actualizó de `78em` a `84em` pero el párrafo que lo justifica quedó con las cifras
antiguas. Dice **7 enlaces** (hoy hay 8) y **"Hasta 64em se usa el menú hamburguesa"** (el
hamburguesa llega ahora hasta 84em). Justo debajo, el bloque "Historial medido con 8 enlaces" sí
está correcto y completo, lo que hace la contradicción más visible: las cuatro primeras líneas
contradicen a las diez siguientes.

No afecta al runtime, pero este comentario es exactamente el que la próxima persona leerá antes de
tocar el breakpoint —el fichero mismo dice "este valor debe coincidir con el `matchMedia`"— y
partiría de dos premisas falsas. Arreglo: cambiar "7 enlaces" por "8 enlaces" y "Hasta 64em" por
"Por debajo de 84em".

### M2 — Dos ficheros modificados fuera del alcance del plan están en el árbol de trabajo

`git status` muestra, además de los siete ficheros del plan:

- `.github/workflows/deploy.yml` — `withastro/action@v5` → `@v6` (y el comentario de
  `node-version` de "Defaults to 22" a "Defaults to 24").
- `.gitignore` — bloque nuevo "devrune managed" que ignora `.devrune/`, `.claude/`, `.mcp.json`,
  `.sdd/`.

Ambos son **preexistentes**: ya estaban modificados en el árbol antes de que empezara este trabajo
(aparecen en el `git status` inicial de la sesión), así que no son fuga introducida por la
implementación. Pero el plan dice explícitamente que ciertas cosas "no deben aparecer en el diff",
y un `git commit -a` los arrastraría a este PR. El bump de `withastro/action` a v6 es un cambio
funcional de CI que merece su propio commit y su propia verificación de despliegue, no ir de
polizón en un PR de contenido.

Recomendación: `git add` selectivo de los siete ficheros del plan, o commit aparte para estos dos.

### M3 — Observación, no defecto: `.social:focus` conserva el patrón que B2 corrigió en `.link`

`src/components/Nav.astro:340-343`:

```css
.social:hover,
.social:focus {
	font-weight: 800;
}
```

Es preexistente y queda fuera de la letra de T009 (que nombra solo `.link`), y pasa el checkpoint
literal del plan (`grep "\.link:focus[^-]"` sigue vacío). Se anota porque el razonamiento de B2 —
`:focus` dispara con el ratón, y `font-weight: 800` ensancha el elemento provocando reflow — aplica
igual aquí, y `.social` vive dentro de `.menu-footer`, que es precisamente el elemento que
desbordaba en el hallazgo 1. Material para #53, no para este PR.

### M4 — Desviación menor y deliberada del literal del plan: `letter-spacing` del eyebrow

T007 especifica `letter-spacing: .25em` para `.eyebrow` y `.section-label`. La implementación usa
`0.25em` en `.section-label` y `.detail-label`, pero **`0.3em` en `.eyebrow`** — que es el valor
exacto de `.eyebrow` en `contact.astro:182`. Dado que el principio rector del plan es que las dos
páginas se lean como hermanas, copiar el valor de la hermana es la lectura correcta de la
intención por encima del literal. Se registra solo para que no parezca un descuido.

---

## 5. Lo que está bien hecho

- **El contrato de contenido se cumple al carácter**, que era el defecto más caro y menos visible
  posible. Verificado por comparación programática, no a ojo.
- **El fallo de C4 se atacó donde de verdad se ve**: los dos bloques `.cv` y el `:global()` están
  comprobados en el CSS compilado y medidos con el stub de `cvPath`, no deducidos del fuente. Es
  la única forma de detectar un defecto que hoy no renderiza nada.
- **El breakpoint del nav se resolvió midiendo, no estimando**, y con tres iteraciones honestas
  (78em → 81.25em → 84em) porque 81.25em dejaba 0px de margen y una etiqueta 2px más ancha en otra
  página lo rompía. Esa clase de análisis —que el ancho de `.nav-items` depende de qué enlace lleva
  `aria-current`— es exactamente lo que este repo necesitaba tras tres entregas de CSS roto.
- **Los comentarios explican el porqué con números**: `min-width: 0` en `contact.astro` documenta
  el desborde de 14px y el mecanismo (`min-width: auto` por defecto en grid items); el bloque C4
  aparece citado en los dos `<style>` que dependen de él. Son comentarios que sobreviven a la
  próxima refactorización porque justifican su existencia.
- **Se arreglaron dos fallos silenciosos preexistentes** que nadie había medido: el desborde de 14px
  de `/contact` a 360px y `<html lang="en">` (WCAG 3.1.1, nivel A, todo el sitio). El segundo va
  como tarea propia y visible en el diff, no escondido dentro de otra.
- **La disciplina de alcance dentro de `src/` es limpia**: la deuda del nav detectada (skip link,
  `aria-controls`, cierre con `Escape`, foco bajo el panel) queda registrada por escrito para #53
  en vez de arreglada a medias o silenciada.
- **Las desviaciones se documentan como tales**, con su medida y su dueño: la franja de WCAG 1.4.12
  alrededor de 1344px está medida (+60/+62px), explicada (subir la constante solo desplaza el
  punto de fallo) y asignada a #53.

---

## 6. Próximos pasos

1. **Antes del merge, obtener el visto bueno de David sobre `about.metaDescription`** (R3) — es
   copy redactada por el plan, no aprobada por Luisa. Un string en `about.ts`, sustituible sin
   tocar estructura.
2. **Corregir M1** (comentario "7 enlaces" → "8 enlaces", "Hasta 64em" → "Por debajo de 84em") —
   dos palabras, y evita que la próxima persona parta de premisas falsas.
3. **Excluir del commit `.github/workflows/deploy.yml` y `.gitignore`** (M2): `git add` selectivo
   de los siete ficheros del plan, o commit aparte con verificación de despliegue propia.
4. **Trasladar a la issue #53**: la deuda de nav del R13, la franja de WCAG 1.4.12 alrededor de
   84em, y la observación M3 (`.social:focus` con `font-weight`).
5. Commit y PR con los siete ficheros del plan.

**Consultas a advisors**: no se invocó ningún `*-advisor`. No hay problemas críticos que
diagnosticar, y `web-accessibility-advisor` y `architect-advisor` ya fueron consultados en la fase
de plan (rondas registradas en `## Advice Received`); sus recomendaciones se verificaron una a una
como implementadas en esta revisión.

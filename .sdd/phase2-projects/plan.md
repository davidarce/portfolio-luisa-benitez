# Plan — Fase 2, jerarquía invertida y retirada de la plantilla

> Cierra los dos últimos criterios de aceptación de `plan/02-information-architecture/REVISION-v2.md`.
> Lo anterior de la Fase 2 (assets, schema de rol, créditos, renombrado, vídeo) ya está en `ac79b2a`.

## Contexto

Dos problemas, entrelazados porque ambos viven en la home:

**1. El orden contradice el objetivo del rediseño.** Los listados ordenan solo por `order`. El objetivo estratégico nº2 del `00-master-plan.md` §3 es que el trabajo donde Luisa firma como principal vaya primero y la asistencia pase a respaldo. Hoy no ocurre.

**2. La home destaca los restos de la plantilla de Astro.** `src/pages/index.astro` saca 4 proyectos de la colección `work` (`src/content/work/*.md`): cuatro ficheros heredados de la plantilla, **con lorem ipsum en el cuerpo** y tags «Design/Branding/Film». Las rutas `/work/` y `/work/<slug>/` están vivas y sirven ese lorem ipsum. Además duplican proyectos que ya existen en las colecciones reales (`aitana`, `miguel-herran`, `zara-larsson`).

Resultado actual: lo primero que ve un reclutador son cuatro trabajos de asistencia que enlazan a fichas con texto de relleno en latín.

## Objetivos

1. Los listados y la home muestran primero los `lead-stylist`.
2. No queda lorem ipsum ni tags de plantilla en el sitio construido.
3. Las rutas retiradas no dejan 404 en URLs que pudieran estar indexadas.

## No-objetivos

- Migrar a i18n todo el texto de la home. Solo el titular que cambia.
- Tocar el diseño de las tarjetas o del grid.
- Rellenar `year` en los proyectos: es opcional y llegará con los créditos.

## Tareas

- [X] **T001 — Función de orden compartida.** Criterio de REVISION-v2 §3: `(role === 'lead-stylist' ? 0 : 1)`, luego `order`, luego año descendente. `year` es opcional y hoy está vacío en los 36, así que el desempate debe tolerar su ausencia y dejar un orden **estable**, no aleatorio. Una sola función bien nombrada, no copiada cinco veces; ubicarla donde encaje con la estructura actual.

- [X] **T002 — Aplicarla a los 5 listados**: `/editorials/`, `/campaigns/`, `/celebrity-events/`, `/runway/`, `/films/`.

- [X] **T003 — Retirar la colección `work`**: la colección en `src/content.config.ts`, los `.md` de `src/content/work/` y las páginas de `src/pages/work/`.

- [X] **T004 — Redirecciones desde `/work/`** y desde las 4 fichas `/work/<slug>/`, con el `RedirectPage.astro` que ya existe. Destino: la home para el listado; para cada ficha, el proyecto equivalente en la colección real si lo hay, y la home si no.

- [X] **T005 — La home destaca proyectos reales**, con el criterio de T001. Mantener 4 destacados salvo que el diseño pida otra cosa; si cambia el número, justificarlo.

- [X] **T006 — Titular de la sección.** Hoy dice «Alguno de mis trabajos como asistente», que deja de ser cierto cuando lo primero que se muestra es trabajo suyo como principal. Cambiar a algo neutro y honesto («Trabajos destacados»). Va por i18n en `es.ts` y `en.ts`. **Es copy: queda pendiente de aprobación de David.**

## Criterios de aceptación

- [X] Cero apariciones de «Lorem ipsum» y de los tags «Design»/«Branding» en `dist/`, comprobado por script.
- [X] En los 5 listados, ningún proyecto de asistencia aparece antes que uno de principal. Verificado extrayendo el orden real del DOM.
- [X] La home destaca proyectos reales y sus enlaces devuelven 200.
- [X] `/work/` y las 4 fichas `/work/<slug>/` redirigen a un destino que existe.
- [X] Ningún enlace interno roto en todo el sitio.
- [X] Sin desbordes horizontales en la home y dos listados, a 390 y 1440, claro y oscuro. Medir `getBoundingClientRect().right` contra `window.innerWidth`: `body` lleva `overflow-x: hidden` y el desborde recorta en silencio, sin barra de scroll.
- [X] `pnpm build` limpio. Se van 5 páginas de `work` y entran 5 de redirección, así que deberían seguir siendo 72: confirmarlo.

## Definición de hecho

Todo lo anterior verificado **midiendo en Chromium**, no a ojo. Capturas de la home y de dos listados en `.sdd/phase2-projects/evidence/`. Cualquier desviación, reportada con su medida en vez de corregida por cuenta propia.

## Batch Assignments for Sub-Agents

| Batch | Tasks | File | Parallel | Depends on |
|-------|-------|------|----------|------------|
| A | T001-T002 | orden compartido + 5 listados | No | — |
| B | T003-T004 | retirada de `work` + redirecciones | No | — |
| C | T005-T006 | `src/pages/index.astro` + i18n | No | A, B |

Secuencial: las tres tocan rutas o colecciones y pisarse sería fácil.

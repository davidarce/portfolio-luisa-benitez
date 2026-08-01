# Plan — Unificar Inicio, Sobre mí y Contacto en una sola home

## Contexto

La home no es una portada: su `<h1>` es literalmente **«Sobre Mí»**, con tagline y retrato. O sea que duplica `/about` y encima en peor versión. Un portfolio cuya primera pantalla es una biografía, y no imágenes, trabaja en contra de su propio objetivo.

David propone unificar las tres páginas en una. Se acepta, con una corrección de orden: **el trabajo va primero**. Para una candidatura a Inditex, lo primero que debe ver quien entra es lo que ella sabe hacer; la bio convence después, cuando la imagen ya ha enganchado.

## Objetivos

1. Una sola home: portada → trabajos destacados → sobre mí → contacto.
2. `/about/` y `/contact/` redirigen a los anclajes de la home; ningún enlace compartido se rompe.
3. El nav baja de 8 enlaces a 6.
4. Cero contenido duplicado entre home, about y contact.

## No-objetivos

- Reescribir la copy. La del About está aprobada (`plan/03-content-pages/about-copy-final-es.md`) y se **reutiliza literal**.
- Rediseñar las tarjetas, el grid o las páginas de categoría.
- Tocar la traducción al inglés más allá de mover claves ya existentes.

## Estructura acordada

| # | Sección | Contenido | Origen |
|---|---|---|---|
| 1 | Portada | Nombre, rol, imagen fuerte | nuevo |
| 2 | Trabajos destacados | Los 4 actuales, `lead-stylist` primero | home actual |
| 3 | Sobre mí | Dos columnas: retrato a la izquierda, bio a la derecha. Debajo, servicios, publicaciones y datos | `/about` |
| 4 | Contacto | Canales y datos | `/contact` |

Anclajes: `#sobre-mi` y `#contacto`.

## Tareas

- [X] **T001 — Portada.** Sustituye al bloque `<Hero title="Sobre Mí">`. El `<h1>` de la home pasa a ser el nombre, no «Sobre Mí». Reutiliza el lenguaje visual de `/contact` (eyebrow, titular en `--font-brand`, retrato a sangre con máscara) para que se lea como parte del mismo sitio.

- [X] **T002 — Sección «Sobre mí»** con `id="sobre-mi"`. Dos columnas a partir de 50em: retrato a la izquierda, los tres párrafos a la derecha. En móvil, una columna. Debajo: servicios, publicaciones y datos. Todo el texto sale de `t.about` y `t.profile`, que ya existen — **no se escribe copy nueva**.

- [X] **T003 — Sección «Contacto»** con `id="contacto"`. Canales y datos, reutilizando lo que hoy hace `src/pages/contact.astro`. `CvDownloadLink` incluido, que se oculta solo mientras `cvPath` sea `undefined`.

- [X] **T004 — `/about/` y `/contact/` pasan a redirección** hacia `/#sobre-mi` y `/#contacto`, con el `RedirectPage.astro` que ya existe.

- [X] **T005 — Nav a 6 enlaces**: fuera «Sobre mí» y «Contacto». Las claves de i18n `nav.about` y `nav.contact` dejan de usarse en el menú; decidir si se borran o se conservan para los anclajes, y justificarlo.

- [X] **T006 — Rebajar el breakpoint del nav.** Está en 84em porque con 8 enlaces `.menu-footer` se salía 52px a 1248px. Con 6 sobra ancho. **Medir** cuál es el mínimo con holgura razonable y bajarlo. Recordatorio: el valor vive en DOS sitios de `Nav.astro`, el `@media` y el `matchMedia`, y cambiarlo en uno solo rompe la hamburguesa en silencio. Esto ataca directamente la queja de #53.

- [X] **T007 — `ContactCTA`** («¿Interesado en trabajar juntos?») sobra en la home cuando la propia home ya tiene sección de contacto. Quitarlo de la home; se mantiene en las fichas de detalle.

## Criterios de aceptación

- [ ] El `<h1>` de la home es el nombre, no «Sobre Mí». Un solo `h1` y sin saltos de nivel.
- [ ] Las cuatro secciones aparecen en el orden acordado.
- [X] `/about/` y `/contact/` redirigen a su anclaje y el navegador acaba en la posición correcta de la home. (Ver nota en el envelope: `/contact/` no llega a alinear la sección al borde superior porque es la última de la página y no hay contenido debajo para seguir haciendo scroll — comportamiento normal del navegador con anclajes cerca del final, no un fallo de la redirección.)
- [X] El nav tiene 6 enlaces y **no se recorta** en ningún ancho. Medir el borde derecho de `.menu-footer` contra `window.innerWidth`: `body` lleva `overflow-x: hidden` y el desborde recorta en silencio, sin barra de scroll.
- [X] La hamburguesa sigue abriendo, comprobado con un clic real por debajo del breakpoint nuevo.
- [ ] Cero texto duplicado: la bio, los servicios y los canales aparecen **una sola vez** en el sitio.
- [ ] Sin desbordes horizontales en la home a 360, 390, 800, 1024, 1344 y 1440, en claro y oscuro.
- [ ] **Longitud en móvil medida**: altura total de la home a 390px y cuánto hay que bajar para llegar a cada sección. Móvil es el viewport dominante de este sitio; si sale desproporcionada, se reporta con el número.
- [ ] Peso de la home: bytes transferidos e imágenes pedidas al cargar.
- [ ] Contraste del texto en claro y oscuro. Solo `--gray-0`, `--gray-50` y `--gray-100`: la rampa del DS es azulada y los pasos intermedios se ven azules y desentonan.
- [X] `pnpm build` limpio, y explicar el número de páginas resultante. 72 páginas (sin cambio respecto a antes del batch B: `/about/` y `/contact/` seguían generando 1 página cada una, solo que ahora son redirección en vez de contenido propio).

## Definición de hecho

Verificado **midiendo en Chromium**, no a ojo. Capturas de la home completa a 390 y 1440, en claro y oscuro, en `.sdd/home-unificada/evidence/`.

## Batch Assignments for Sub-Agents

| Batch | Tasks | File | Parallel | Depends on |
|-------|-------|------|----------|------------|
| A | T001-T003, T007 | `src/pages/index.astro` | No | — |
| B | T004-T006 | rutas + `Nav.astro` | No | A |

Secuencial: B necesita que las secciones y sus anclajes existan para poder verificar las redirecciones.

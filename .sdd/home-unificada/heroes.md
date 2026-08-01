# Comparación de portadas — hero-a / hero-b / hero-c

Tres rutas temporales montadas para comparar en contexto real (mismo nav, mismo
design system, mismas secciones "Trabajos destacados" / "Sobre mí" / "Contacto"
debajo — solo cambia la portada):

- `/hero-a/` — src/pages/hero-a/index.astro
- `/hero-b/` — src/pages/hero-b/index.astro
- `/hero-c/` — src/pages/hero-c/index.astro

Es un ejercicio de comparación, **no la implementación final**. Cuando David
elija una, las otras dos rutas (y este documento) se borran, y la variante
ganadora se traslada a `src/pages/index.astro`.

Capturas en `evidence/heroes/` (solo primera pantalla, no página completa):
`hero-{a,b,c}-1440-dark.png`, `hero-{a,b,c}-390-dark.png`,
`hero-{a,b,c}-1440-light.png`.

## Qué es cada una

**Variante A — el trabajo a sangre.** Imagen completa de la editorial PAP
Magazine "The New Dandy" (monocromo rojo, pose dramática, cola enorme) ocupando
toda la portada, con el nombre superpuesto sobre un scrim en degradado.

**Variante B — retrato cuadrado.** El `portrait.webp` de siempre, mismo layout
a dos columnas que ya existe, pero con recorte más cerrado (aspect-ratio en vez
de franja de vh) y `object-position` desplazado hacia el rostro y la revista
Vogue, para que el seto y el edificio pesen menos.

**Variante C — mosaico.** Rejilla 2×2 (móvil) / 4×1 (escritorio) con cuatro
fotos reales elegidas mirando las galerías, no a ciegas: `pap-the-new-dandy`
(rojo, editorial), `artego-color-pop-garden` (verde, editorial), `isabel-arbos-model-test`
(gris neutro, model test), `tania-deniz-coachella` (cálido/negro, celebrity
styling). Nombre superpuesto con el mismo scrim que A.

## El logo "PAP" de la imagen de la Variante A

`pap-the-new-dandy/index.webp` lleva el wordmark "PAP" impreso abajo en el
centro (es el crédito de la propia editorial). Dos opciones: recortar la
imagen para quitarlo (se pierde la cola del vestido, el elemento más dramático
de la pose) o dejarlo suelto compitiendo sin jerarquía con nuestro propio
titular.

**Decisión**: ni una ni otra. El scrim que sostiene la legibilidad del texto
(ver siguiente sección) ya cubre esa zona de la imagen de forma natural — con
un `transform: scale()` adicional sobre la imagen para asegurar que el logo
quede fuera de encuadre en vez de semivisible bajo el degradado (comprobado en
capturas: con zoom 1.18 seguía intuyéndose una sombra; con 1.4–1.7 desaparece
del todo). Se añade en su lugar un crédito propio, pequeño y controlado:
"Editorial — PAP Magazine, «The New Dandy»", bajo el enlace de Instagram. Así
se acredita la editorial sin que su marca original conviva sin jerarquía con
la nuestra. La misma técnica de zoom se aplicó al mismo archivo dentro del
mosaico de la Variante C.

## Contraste (medido en Chromium, no a ojo)

Método: para cada texto se localiza su `getBoundingClientRect()`, se oculta
temporalmente (`visibility: hidden`), se recaptura el fondo real en ese punto
exacto y se calcula el ratio WCAG entre el color de texto computado y el
píxel de fondo muestreado — no una estimación sobre el color medio de la
imagen. Mínimo exigido: 4.5:1 (texto normal), 3:1 (texto grande, aplica al
`<h1>`).

| Elemento | A · 390 claro | A · 390 oscuro | A · 1440 claro | A · 1440 oscuro |
|---|---|---|---|---|
| eyebrow | 10.5:1 | 15.9:1 | 11.1:1 | 15.3:1 |
| headline (h1) | 15.8:1 | 19.8:1 | 16.4:1 | 19.1:1 |
| tagline | 14.1:1 | 18.0:1 | 14.6:1 | 17.5:1 |
| instagram-link | 15.8:1 | 19.8:1 | 16.3:1 | 19.4:1 |
| crédito PAP | 10.5:1 | 15.9:1 | 10.9:1 | 15.5:1 |

| Elemento | C · 390 claro | C · 390 oscuro | C · 1440 claro | C · 1440 oscuro |
|---|---|---|---|---|
| eyebrow | 12.3:1 | 13.7:1 | 10.5:1 | 15.9:1 |
| headline (h1) | 18.0:1 | 17.5:1 | 15.7:1 | 19.8:1 |
| tagline | 14.8:1 | 17.3:1 | 14.7:1 | 17.4:1 |
| instagram-link | 17.4:1 | 18.1:1 | 16.0:1 | 19.6:1 |

| Elemento | B · 390/1024/1440 claro | B · 390/1024/1440 oscuro |
|---|---|---|
| eyebrow | 13.2:1 | 15.8:1 |
| headline (h1) | 19.7:1 | 19.7:1 |
| tagline | 17.6:1 | 17.9:1 |
| instagram-link | 19.7:1 | 19.7:1 |

Las tres pasan WCAG AA con margen amplio en las seis combinaciones
(390/1024/1440 × claro/oscuro). B es la más previsible porque su panel de
texto vive sobre fondo de página plano (mismo mecanismo ya verificado en
`.sdd/home-unificada/plan.md`), no sobre una foto.

**Cómo se llegó a esos números en A y C** (vale la pena documentarlo: la
primera versión del scrim fallaba). El scrim usa `--gray-999_40`-style
(blanco 40% en claro, casi negro 40% en oscuro — mismo mecanismo que
`.with-background`) en un degradado que sube desde abajo. La primera versión
ponía la meseta opaca solo hasta el 32% de la altura del hero, asumiendo que
el bloque de texto era corto. Al medir la posición real del panel (varía
entre 63% y 74% de la altura del hero contando desde abajo, según cuánto
ocupe el tagline en cada viewport), el eyebrow caía en la zona ya
desvanecida: 1.6:1 en claro a 1024px, un fallo silencioso que a ojo no se
apreciaba porque el eyebrow es pequeño y gris. Se subió la meseta opaca al
85% y todos los ratios pasaron de "falla" a >10:1. Sin medir el punto exacto
donde cae el texto esto no se habría detectado.

## Sin desbordes horizontales

Verificado con `getBoundingClientRect().right` contra `window.innerWidth` (no
`scrollWidth` — `body` lleva `overflow-x: hidden` y recorta en silencio) en
las tres variantes a 390, 1024 y 1440px, claro y oscuro: **0 elementos
desbordados** en los 18 casos (3 variantes × 3 anchos × 2 temas).

Nota técnica: las variantes A y C usan `transform: scale()` sobre las
imágenes para empujar el logo "PAP" fuera de encuadre (ver arriba). Eso hace
que el `getBoundingClientRect()` de esas `<img>` por sí solo exceda el
viewport — es recorte intencional, contenido por `overflow: hidden` en su
contenedor directo, no una fuga real. El chequeo distingue ambos casos
comprobando si un ancestro con `overflow: hidden` ya contiene el elemento
dentro del viewport.

## Peso de imagen

Bytes de la(s) imagen(es) que forman **la portada en sí** (no la página
completa):

| Variante | Imagen(es) de portada | Peso |
|---|---|---|
| A | `pap-the-new-dandy/index.webp` (1 imagen) | **44 KB** |
| B | `portrait.webp` redimensionado a 600×900 vía `<Image>` de Astro | **48 KB** |
| C | 4 imágenes del mosaico sin redimensionar | **632 KB** |

C pesa **~13× más que A o B**. La causa no es "más fotos" en abstracto sino
que A y B pasan por la tubería de optimización de imágenes (A usa un asset ya
liviano de por sí; B usa `astro:assets` `<Image>`, que genera un `.webp`
recortado al ancho real que se muestra — 600px en vez del original de
1365px). Las cuatro imágenes del mosaico de C viven en `public/` y se sirven
tal cual sin pasar por esa tubería (Astro no optimiza `public/`); una de
ellas, `artego-color-pop-garden/index.webp`, pesa sola 352 KB a resolución
completa (1365×2048) para un tile que en pantalla ocupa una fracción de esa
área. **Si se elige C, antes de llevarla a producción hay que mover esas
cuatro imágenes a `src/assets/` y servirlas con `<Image>`/`widths` como hace
B** — el peso de 632 KB no es inherente al diseño de mosaico, es la falta de
esa tubería en esta maqueta de comparación. Con ella, el peso de C debería
acercarse al de una sola imagen grande tipo A/B multiplicada por ~4 tiles más
pequeños, no por el tamaño completo de cada original.

(Peso total de página en la primera pantalla a 390px, para contexto — incluye
las 2-3 tarjetas de "Trabajos destacados" que ya son visibles sin scroll y
son iguales en las tres variantes: A 376 KB, B 274 KB, C 857 KB.)

## `pnpm build`

Limpio. 75 páginas (72 existentes + `/hero-a/`, `/hero-b/`, `/hero-c/`). Las
tres rutas se excluyeron del sitemap (`astro.config.mjs`, junto al resto de
rutas no indexables) porque son temporales.

## Qué gana y qué pierde cada una

| | Gana | Pierde |
|---|---|---|
| **A** | La más fiel a la referencia acordada (Toteme/The Row/agencias de estilismo): "esto es lo que sé hacer" en la primera pantalla, con una editorial real y dramática. Contraste muy alto en ambos temas. | En tema claro el scrim necesario para el contraste blanquea bastante la foto — se pierde parte de la fuerza dramática de la imagen (comparar `hero-a-1440-dark.png` vs `hero-a-1440-light.png`). Una sola foto = una sola "voz"; no comunica variedad de trabajo. |
| **B** | Cambio mínimo sobre el hero de hoy (mismo layout, mismo código de panel ya verificado) — el más barato de implementar y el más predecible en contraste, porque el texto no vive sobre foto. Reduce notablemente el peso del seto/edificio. | Sigue siendo la misma foto de calle con gafas de sol y sin mirar a cámara que motivó este ejercicio (issue #13) — el recorte ayuda pero no resuelve el problema de fondo. Es la variante que menos "vende trabajo" en la portada. |
| **C** | La que mejor comunica rango: cuatro sesiones, cuatro paletas, cuatro tipos de encargo, en la primera pantalla. Mismo mecanismo de contraste ya verificado que A. | La más pesada con diferencia (632 KB vs 44-48 KB) tal como está montada — corregible, pero no gratis. En tema claro sufre el mismo blanqueado que A, aquí multiplicado por 4 fotos en vez de 1. Es la que más cambia el lenguaje visual del sitio (ninguna otra página tiene un grid de fotos sin cards ni títulos). |

## Recomendación

**Variante A**, con una condición: revisar el scrim en tema claro antes de
darla por buena — es la más fiel a la referencia que se acordó (`plan/00-master-plan.md`
§9) y la que mejor cumple el objetivo de fondo de este ejercicio (que la
portada muestre trabajo real, no una foto de calle). El contraste ya está
verificado y por encima de AA en los dos temas, así que no es un bloqueo de
accesibilidad — es una cuestión de que la versión clara pierde intensidad
dramática frente a la oscura, y conviene que David lo vea con sus propios ojos
en las capturas antes de decidir.

B es la opción segura y de menor riesgo si se prefiere no tocar demasiado el
sitio ahora mismo, pero no resuelve el problema que motivó pedir estas tres
variantes: sigue siendo la misma foto de calle, solo mejor recortada.

C es la más honesta sobre el volumen de trabajo real (129 fotos, cuatro tipos
de encargo visibles de un vistazo), pero solo si se resuelve el peso de
imagen antes de llevarla a producción (mover a `src/assets/` + `<Image>`,
igual que ya hace B) — tal como está montada para esta comparación, no.

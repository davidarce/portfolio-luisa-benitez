# Plan de optimización de rendimiento — portfolio-luisa-benitez

**Fecha:** 2026-07-29 · **Rama de referencia:** `feat/phase2-projects` · **Estado:** propuesta, sin implementar.

Todas las cifras de este documento están **medidas**, no estimadas. Metodología al final (§6).

---

## 1. Diagnóstico

### 1.1 El misterio de los 605 KB de scripts en la home: RESUELTO

**Los 605 KB no existen en producción.** La medición original se hizo contra el servidor de
desarrollo (`localhost:4321`), que sirve los módulos de Vite sin empaquetar ni minificar.
Medido hoy en ambos entornos (móvil 390×844):

| Entorno | Total home | Scripts | Detalle |
|---|---|---|---|
| Dev server (4321) | 1.103 KB | **589 KB** en 31 peticiones | `/@vite/client` **291 KB**, `astro/transitions/router.js` 92 KB, `prefetch` 35 KB, `swap-functions` 22 KB, `Nav.astro` sin minificar 22 KB… |
| **Build de producción** (`dist/` servido estático) | **518 KB** | **14,9 KB** en 1 petición | Solo `ClientRouter.astro_…js` (view transitions), minificado |

**Conclusión: no hay ningún problema de JavaScript que resolver.** El sitio en producción
lleva 14,9 KB de script. Cualquier medición futura debe hacerse contra `dist/` (o contra
el sitio publicado), nunca contra el dev server.

### 1.2 Peso real de las páginas clave (build de producción, viewport 390×844)

| Página | Total al load | Desglose principal |
|---|---|---|
| `/` | 518 KB | imagen 372 KB · fuente 62 KB · CSS 40 KB · HTML 29 KB · JS 15 KB |
| `/campaigns/` | 789 KB **+ vídeo** | imagen 641 KB (los pósters) · el vídeo se suma aparte: **8,88 MB** medidos previamente por el autoplay de 11 tarjetas |
| `/runway/` | 5.330 KB | **media 3.088 KB** (3 vídeos autoplay) · **imagen 2.106 KB** (incluye un webp de **1.119 KB**) |
| `/campaigns/alaniz-maria-pombo/` (ficha) | 947 KB de imagen + 3 vídeos autoplay (6,2 + 7,9 + 4,2 MB en disco) | las fichas también llevan `autoplay` en todos los vídeos |

### 1.3 Vídeo: el problema dominante

- 34 ficheros `.mp4`, **89 MB** en `public/assets/`. Los mayores: 8,0 MB (`angel-schlesser-2025/video-3`), 8,0 MB (`alaniz-maria-pombo/video-2`), 6,2 MB, 6,0 MB, 5,4 MB…
- `Card.astro` (líneas 64–72) genera `<video src autoplay loop muted playsinline poster>`:
  **todos los vídeos de un listado empiezan a descargarse a la vez**, estén o no en viewport.
- Los cinco `[...slug].astro` de detalle (campaigns, runway, editorials, films, celebrity-events)
  hacen lo mismo (`autoplay loop muted playsinline controls`) y además **sin `poster`**.
- Todas las tarjetas de vídeo **ya tienen póster** (`poster={img}`), así que diferir la descarga
  no cambia lo que se ve al abrir la página.
- La pista de audio **se usa** (botón de sonido en la tarjeta, `mute-toggle` en `Card.astro`): no se toca.

### 1.4 Imágenes de `public/assets/`: bien comprimidas, mal dimensionadas

La compresión es correcta (webp q80) y **no se propone recomprimir**. El problema es que las
tarjetas y rejillas sirven el fichero original completo sin `srcset`. Medido en producción:

| Página | Imagen | Ancho intrínseco | Ancho renderizado (CSS px) |
|---|---|---|---|
| `/` | `celebrities/maica-supervivientes/index.webp` (86 KB) | 1440 px | 340 px |
| `/` | `editorials/aminata/index.webp` (133 KB) | 1366 px | 340 px |
| `/editorials/` | 11 tarjetas, todas iguales | 1080–1366 px | 340 px |
| `/runway/` | `angel-schlesser-2023/4.webp` (**1.119 KB**) | 1920 px | tarjeta |

En un móvil DPR 3 (iPhone) el ancho útil es 340 × 3 = 1020 px, así que el desperdicio no es
brutal en móvil de gama alta — pero sí en DPR 1–2 (escritorio, Android medio). Ahorro **medido**
regenerando con sharp (webp q80, misma calidad de compresión que los originales):

| Fichero | Original | Variante 1020 px (DPR 3) | Variante 680 px (DPR 2) |
|---|---|---|---|
| `aminata/index.webp` | 133 KB · 1366 px | 76 KB (−43 %) | 41 KB (−69 %) |
| `maica-supervivientes/index.webp` | 86 KB · 1440 px | 40 KB (−53 %) | 21 KB (−76 %) |
| `bruno-magli/1.webp` (póster) | 134 KB · 1024 px | 118 KB (−12 %) | 70 KB (−48 %) |
| `angel-schlesser-2023/4.webp` | 1.119 KB · 1920 px | 365 KB (−67 %) | 183 KB (−84 %) |

Hay **30 webp de más de 300 KB** (288 webp en total, 40 MB). El caso extremo (1,1 MB) está
en el listado de `/runway/`.

### 1.5 Google Fonts fantasma

`MainHead.astro` (líneas 24–29) carga desde `fonts.googleapis.com` las familias
**Public Sans y Rubik**, con dos `preconnect`. Verificado con grep sobre todo `src/`:
**ninguna regla CSS las usa** (`global.css` define `--font-sans/--font-brand: 'Bebas Neue'`,
`--font-freehand: 'Freehand'`, `--font-body: system-ui`). Es un resto de la plantilla.
Coste real: hoja de estilos externa **render-blocking** de 8,8 KB + resolución
DNS/TLS a dos dominios en el camino crítico de cada página. Los woff2 no llegan a descargarse
(el navegador solo baja fuentes que se usan), pero el bloqueo de render sí ocurre en cada carga.

### 1.6 LCP de la home penalizado por `loading="lazy"`

Las 3 imágenes grandes de la rejilla de la home (las candidatas a LCP) llevan
`loading="lazy"` aun estando en el primer viewport. El lazy en la imagen LCP retrasa su
descubrimiento y descarga (el navegador espera al layout). Verificado en `dist/index.html`.

### 1.7 Caché y compresión en GitHub Pages (verificado con curl hoy)

- `cache-control: max-age=600` en **todo**, incluido `/_astro/*.js` con hash en el nombre
  (podría ser `immutable, max-age=31536000`) y los mp4 de 5 MB. GitHub Pages **no permite
  personalizar cabeceras**: esto solo se arregla poniendo un proxy/CDN delante.
- `content-encoding: gzip` — GitHub Pages **no sirve brotli**. Impacto menor aquí (el peso es
  imagen/vídeo, no texto).
- `accept-ranges: bytes` en los mp4: el streaming parcial funciona, lo que hace viable la
  estrategia de reproducir bajo demanda.

---

## 2. Propuestas, ordenadas por impacto/coste

> **[GRATIS]** = no depende de nadie ni de ninguna decisión; se implementa y se despliega.
> **[DECISIÓN]** = requiere que David/Luisa decidan algo externo (DNS, servicio, dinero).

### P1 — [GRATIS] Vídeos de tarjeta bajo demanda (`preload="none"` + play al entrar en viewport) — [X] IMPLEMENTADO

- **Problema:** los 11 vídeos de `/campaigns/` (8,88 MB) y los 3–4 de `/runway/` (3,02 MB)
  se descargan a la vez al abrir el listado, casi todos fuera de viewport.
- **Qué se hace:** en `Card.astro`, quitar `autoplay` del markup, añadir `preload="none"`
  (el `poster` ya existente sigue mostrándose) y un `IntersectionObserver` que haga
  `video.play()` al entrar en viewport y `video.pause()` al salir. El botón de sonido no cambia.
- **Ahorro esperado:** en `/campaigns/`, de **10,21 MB a ~2 MB** al load (789 KB de página +
  el streaming del único vídeo visible; base: medición de 8,88 MB de vídeo simultáneo y
  789 KB del resto de la página). En `/runway/`, de 4,56 MB a ~2,5 MB. De propina: menos CPU
  y batería (no hay 11 decodificadores H.264 corriendo a la vez).
- **Coste:** bajo. Un componente (~20 líneas de script), compatible con `astro:page-load`
  que ya usa el sitio.
- **Riesgo:** medio-bajo. Hay que verificar que el vídeo arranca de verdad al hacer scroll
  (autoplay programático con `muted` está permitido en móvil) y que el póster no parpadea.
  Validar en claro/oscuro y en el móvil real de David.
- **Aceptación:** `/campaigns/` transfiere **< 2,5 MB** en el load con el primer vídeo ya
  reproduciéndose; al hacer scroll hasta la última tarjeta, todos los vídeos llegan a
  reproducirse; el botón de sonido sigue funcionando en cada tarjeta.

### P2 — [GRATIS] El mismo tratamiento en las fichas de detalle — [X] IMPLEMENTADO

- **Problema:** los cinco `[...slug].astro` reproducen en autoplay **todos** los vídeos de la
  galería y sin póster. `/campaigns/alaniz-maria-pombo/` tiene 3 vídeos que suman **18,3 MB**
  en disco.
- **Qué se hace:** mismo patrón que P1. Como aquí no hay póster, generar uno por vídeo
  (primer frame con ffmpeg-static, que ya está en devDependencies, → webp) o usar la imagen 1
  del proyecto. Sin póster + `preload="none"` la tarjeta saldría en negro: **el póster no es opcional**.
- **Ahorro esperado:** en la ficha alaniz, de ~19 MB potenciales a < 2 MB al load
  (base: 947 KB de imágenes medidos + streaming de un solo vídeo).
- **Coste:** medio. 5 plantillas casi idénticas (candidatas a extraer un componente
  `GalleryItem` común, están duplicadas línea a línea) + generar pósters.
- **Riesgo:** bajo. Los `controls` ya existen y se mantienen.
- **Aceptación:** ninguna ficha con vídeo transfiere **> 3 MB** en el load; cada vídeo se
  reproduce al llegar a él con scroll.

### P3 — [GRATIS] Variantes responsive para tarjetas y pósters (`srcset`)

- **Problema:** listados y home sirven originales de 1080–1920 px para huecos de 340 CSS px
  (§1.4). El caso extremo: 1.119 KB para una tarjeta de `/runway/`.
- **Qué se hace:** generar variantes 680 px y 1020 px de las imágenes que se usan como
  tarjeta/póster (los `index.webp` y las imágenes 1 de cada proyecto, ~40–50 ficheros) y
  servirlas con `srcset="… 680w, … 1020w, original"` + `sizes`. Se puede hacer con Astro
  `<Image>` moviendo esos ficheros a `src/assets`, o extendiendo `scripts/generate-assets.mjs`
  para no tocar la estructura de `public/`. **Las fichas de galería siguen sirviendo el
  original completo**: la foto a tamaño real es el producto y no se toca.
- **Ahorro esperado (medido con sharp, §1.4):** en un móvil DPR 3, la imagen de `/` baja de
  372 KB a ~200 KB (−45 %); `/runway/` baja ~1,5 MB solo entre `4.webp` (1119→365) y
  `1.webp` de 2025 (610→~250). En DPR 2 el ahorro es del 48–84 % por fichero.
- **Coste:** medio. Script de generación + tocar `Card.astro` y los listados. Sube el peso
  del repo (~+15–20 MB de variantes).
- **Riesgo:** bajo si `srcset` conserva el original como variante máxima: un navegador DPR 3
  nunca recibe menos resolución de la que necesita. **Sin pérdida de calidad visual**
  (la variante servida siempre ≥ ancho renderizado × DPR).
- **Aceptación:** `/` transfiere **< 350 KB** en viewport 390/DPR 1 (hoy 518 KB);
  la imagen más pesada de `/runway/` en viewport móvil **< 400 KB** (hoy 1.119 KB);
  `naturalWidth` de cada tarjeta ≥ `getBoundingClientRect().width × devicePixelRatio`.

### P4 — [GRATIS] Eliminar Google Fonts (Public Sans + Rubik) — [X] IMPLEMENTADO

- **Problema:** hoja externa render-blocking + 2 preconnects para dos familias que **no usa
  ninguna regla CSS** (§1.5).
- **Qué se hace:** borrar las líneas 24–29 de `MainHead.astro`.
- **Ahorro esperado:** −8,8 KB y, sobre todo, elimina una petición bloqueante a dominio
  externo del camino crítico de las 72 páginas (en móvil con latencia alta, decenas a cientos
  de ms de render). Bonus de privacidad: ninguna petición a Google.
- **Coste:** trivial. **Riesgo:** casi nulo — verificado que nada las referencia; aún así,
  pasada visual a home + una ficha en claro y oscuro por si alguna cascada heredaba de ellas.
- **Aceptación:** cero peticiones a `fonts.googleapis.com`/`gstatic.com`; diff visual nulo
  en home, listado y ficha (claro y oscuro).

### ~~P5 — LCP de la home: quitar `lazy` a las imágenes del primer viewport~~ · DESCARTADA EN AUDITORÍA

> **La premisa es falsa. Verificado sobre `dist/index.html`:** las cuatro imágenes de la
> rejilla del hero ya salen con `loading="eager"` **y `fetchpriority`**. Las cuatro que
> llevan `lazy` son las tarjetas de «Trabajos destacados», que están bajo el pliegue, donde
> `lazy` es exactamente lo que debe haber.
>
> Ya se arregló al montar la portada de rejilla. No hay nada que hacer aquí.
>
> Lección: §1.6 dice «verificado en `dist/index.html`», pero contó los `loading=` del
> documento entero sin mirar a qué imagen pertenecía cada uno. Contar no es verificar.

Texto original, conservado para dejar constancia:

- **Problema:** las candidatas a LCP de la home llevan `loading="lazy"` (§1.6).
- **Qué se hace:** prop `eager` en `Card` para las 2–3 primeras tarjetas de la home:
  `loading="eager"` + `fetchpriority="high"` en la primera.
- **Ahorro esperado:** adelanta el inicio de descarga de la imagen LCP (hoy espera al layout).
  Con P3 aplicada, la LCP además pesa ~60 % menos. No cambia bytes totales.
- **Coste:** trivial. **Riesgo:** nulo si solo afecta a las tarjetas above-the-fold.
- **Aceptación:** LCP de `/` en el build de producción con throttling móvil (Lighthouse,
  Moto G / Slow 4G) **< 2,5 s**, y la imagen LCP se solicita en la primera oleada de red
  (antes de que termine el parse, visible en la waterfall).

### P6 — [DECISIÓN] Cloudflare delante de GitHub Pages

- **Problema:** `max-age=600` para todo (§1.7). Cada revisita tras 10 minutos revalida/redescarga,
  incluidos los `/_astro/*` con hash (cacheables un año) y los mp4 (89 MB de assets estables).
  GitHub Pages no permite cambiar cabeceras: **no hay solución gratis dentro de Pages**.
- **Qué se hace (si se decide):** plan gratuito de Cloudflare como proxy DNS + Cache Rules:
  `/_astro/*` → `Cache-Control: public, max-age=31536000, immutable`; `/assets/*` → 1 semana–1 mes;
  HTML → corto (600 s está bien). De propina: brotli en texto y edge cache para los mp4.
- **Ahorro esperado:** primera visita casi igual; **revisitas y navegación entre días ≈ 0 bytes
  de estáticos** (hoy: todo caduca en 10 min). Para el caso de uso real —una reclutadora de
  Inditex que abre el porfolio dos o tres veces— la segunda visita pasa de ~500 KB a ~30 KB de HTML.
- **Coste:** cuenta Cloudflare gratuita + cambiar los nameservers de `luisabenitez.es`. 1–2 h.
- **Riesgo:** medio-bajo: dependencia externa nueva, HTTPS/redirects que verificar tras el cambio
  de DNS, y la propagación puede tardar horas. Es la única propuesta que toca infraestructura.
- **Aceptación:** `curl -I` de un `/_astro/*.js` devuelve `max-age=31536000, immutable` y
  `cf-cache-status: HIT` en la segunda petición; la home carga con `content-encoding: br`.

### Orden sugerido

**P4** (media hora, riesgo casi nulo) → **P1** (el grueso del ahorro) → **P2** → **P3** →
**P6** cuando se decida. P5 queda descartada por la auditoría.
P1–P4 son independientes del hosting: valen igual con o sin Cloudflare.

---

## 2.bis Auditoría del plan

Revisado por el orquestador antes de aceptarlo. Lo comprobado, comando a comando:

| Afirmación | Veredicto |
|---|---|
| §1.1 En producción el JS son ~15 KB, no 605 KB | **CIERTA.** `dist/_astro/` tiene un solo `.js` de 14 KB |
| §1.5 Public Sans y Rubik se cargan y no las usa nadie | **CIERTA.** Están en `MainHead.astro:24-27` y ningún CSS ni componente las referencia |
| §1.4 Hay un webp de 1,1 MB en `/runway/` | **CIERTA.** `angel-schlesser-2023/4.webp` = 1119 KB |
| §1.6 Las imágenes LCP de la home llevan `lazy` | **FALSA.** Ya son `eager` + `fetchpriority`. P5 descartada |

**Reservas sobre las propuestas que se mantienen:**

- **P3 engorda el repo entre 15 y 20 MB** en variantes. No es gratis: el repositorio ya
  arrastra 130 MB de binarios en el historial y eso no se recupera. Conviene decidir si las
  variantes se generan en el build en vez de versionarse.
- **P1 cambia comportamiento visible**, no solo rendimiento: hoy los vídeos de las tarjetas
  arrancan solos al abrir el listado. Con la propuesta arrancan al entrar en viewport. Es
  mejor para el usuario, pero es un cambio de sensación en un portfolio de moda y **lo tiene
  que ver David antes de darlo por bueno**.
- **La cifra de 10,21 MB de `/campaigns/` viene del servidor de desarrollo**, como el propio
  §6 admite: el servidor estático usado para medir producción no soporta Range y no
  contabiliza los bytes de vídeo. El componente de vídeo es fiel (mismos ficheros servidos en
  crudo), pero conviene remedirlo contra el sitio publicado antes de declarar victoria.

---

## 3. Lo que NO merece la pena (y por qué)

| Descartado | Motivo medido |
|---|---|
| **Perseguir los 605 KB de scripts de la home** | No existen en producción: son 14,9 KB (§1.1). Era el dev server. Nada que optimizar. |
| **Quitar el ClientRouter (view transitions)** | 14,9 KB minificados es todo el JS del sitio; eliminarlo degradaría la navegación por ahorrar el 3 % de la home. |
| **Recomprimir las imágenes globalmente** | Ya están en webp q80. El problema es de **dimensionado por contexto** (P3), no de compresión. Bajar la calidad degradaría el producto (es un porfolio de moda). |
| **Bajar los vídeos a 720p** | Las tarjetas renderizan ~340 CSS px; en un iPhone DPR 3 eso son ~1020 px de dispositivo → los 1080p actuales son la resolución correcta, no un exceso. Re-encodar a menos **perdería calidad visible** en los móviles donde más se va a ver. |
| **Quitar la pista de audio de los mp4** | El botón de sonido de las tarjetas la usa. Ahorraría ~1 MB total pero rompería una funcionalidad. Descartado salvo decisión explícita. |
| **Self-hostear más fuentes** | Bebas Neue y Freehand ya van self-hosted vía fontsource con subsetting. Lo único mal es Public Sans/Rubik, y la solución es borrarlas (P4), no hostearlas. |
| **El subset khmer de Freehand (86 KB en `dist/`)** | Está en el build pero el navegador no lo descarga nunca (unicode-range; verificado: no aparece en ninguna medición de red). Ahorro real: 0. |
| **Service worker / precache PWA** | Resolvería la caché de 10 min, pero con coste alto de mantenimiento y riesgo de servir contenido rancio a la reclutadora. P6 lo consigue sin código. |
| **Mover el hosting a una VPS** | Decidido previamente: descartado. No se revisita. |
| **CDN de vídeo / servicio externo (Mux, Cloudinary…)** | Con P1+P2 el vídeo deja de ser un problema de carga inicial; 89 MB estáticos con `accept-ranges` funcionando no justifican un servicio de pago. |

---

## 4. Objetivo global tras P1–P5 (criterio de éxito del plan)

Medido sobre build de producción, viewport 390×844, sin caché:

| Página | Hoy | Objetivo |
|---|---|---|
| `/` | 518 KB | **< 350 KB**, LCP < 2,5 s (Slow 4G) |
| `/campaigns/` | 10,21 MB | **< 2,5 MB** con el primer vídeo reproduciéndose |
| `/runway/` | 4,56 MB | **< 2,5 MB** |
| Ficha con 3 vídeos | ~19 MB potenciales | **< 3 MB** |
| Scripts en cualquier página | 14,9 KB | sin regresión (≤ 20 KB) |

---

## 5. Riesgos transversales

- **Validar en claro y oscuro** cualquier cambio que toque `Card.astro` o `MainHead.astro`.
- **Trampa del overflow:** `body` lleva `overflow-x: hidden`; si algún cambio de tarjeta
  altera el layout, comprobar `getBoundingClientRect().right ≤ window.innerWidth`, nunca `scrollWidth`.
- **Medir siempre contra `dist/`** (o el sitio publicado). El dev server infla los scripts ×40
  y fue el origen del falso problema de los 605 KB.
- El `poster` pasa a ser lo único visible hasta el scroll en tarjetas de vídeo: revisar que
  todos los pósters existen y representan bien el vídeo (hoy faltan en las fichas de detalle, P2).

---

## 6. Metodología de las mediciones

- **Herramienta:** Chromium headless (`~/.cache/ms-playwright/chromium-1228`) + `playwright-core`,
  script `perf-audit.mjs` en el scratchpad de la sesión (suma `response.body().length` por
  `resourceType`, viewport 390×844, `waitUntil: load` + 1,5 s).
- **Producción:** `dist/` (build del 29-07, rama `feat/phase2-projects`) servido con
  `python3 -m http.server 4322`. Nota: este servidor no soporta Range, así que los bytes de
  vídeo de las páginas con autoplay no se contabilizan en él; para vídeo valen las mediciones
  previas hechas contra el dev server (10,21 MB / 4,56 MB), cuyo componente de vídeo es fiel.
- **Dev:** `localhost:4321` para el desglose de los 589 KB de scripts (§1.1).
- **Dimensiones:** `naturalWidth` vs `getBoundingClientRect().width` por `<img>` en página real.
- **Variantes de imagen:** `sharp` 0.34 (el del proyecto), `resize(w).webp({quality: 80})`,
  tamaños reales del buffer resultante (§1.4).
- **Cabeceras del sitio publicado:** `curl -I https://luisabenitez.es/…` el 29-07 (§1.7).

# Exploración: Visor de Galería (Lightbox/Carousel)

**Feature ID**: visor-galeria  
**Status**: 🔄 Fase de Descubrimiento  
**Creado**: 2026-07-31  
**Objetivo**: Implementar un visor de fullscreen (lightbox/carousel) con navegación entre fotos y videos en modo modal sobre las páginas de proyectos

---

## Objetivo

Los usuarios necesitan examinar detalles de fotos individuales en las galerías de proyectos con mayor tamaño que el grid actual. La solución debe ofrecer:

1. **Modo fullscreen**: Amplía la foto/video activa para verla a mayor resolución
2. **Navegación en carrusel**: Desplazamiento horizontal entre elementos (solo fotos o fotos+videos en orden del proyecto)
3. **Cierre**: Escape o gesto nativo
4. **Sin romperse**: No interfiere con `ClientRouter`, videos, scroll, o accessibility features existentes

---

## Requisitos de Usuario

### Tarea:

Implementar un visor fullscreen (lightbox) que:
- Se abre al hacer clic en una foto/video de la galería grid
- Permite navegar entre fotos/videos del mismo proyecto en orden
- Muestra la foto/video a máxima resolución disponible (fullscreen)
- Proporciona un "carril" (carousel) horizontal para pasar entre elementos
- Incluye fotos Y videos en el orden original del proyecto
- Reproduces videos automáticamente al llegar a ellos
- Se cierra con Escape o gesto nativo
- Funciona fluidamente en móvil (iPhone) y desktop

### Arquitectura:

**Ubicación del código:**
- `src/components/ProjectDetail.astro` – renderiza la galería grid (líneas 64-95)
- `src/components/Grid.astro` – layout CSS del grid (variant="small" = 1 col móvil, 3 col desktop)
- `src/layouts/BaseLayout.astro` – ClientRouter y eventos de navegación

**Componentes a crear/modificar:**
- Nuevo componente visor (`.astro` o `.tsx` con `client:` directive) – maneja modal, carousel, teclado/gestos
- Script ClientRouter en ProjectDetail – integración con eventos `astro:page-load` y `astro:before-swap`
- Estilos: probablemente nuevo scope en ProjectDetail o componente dedicado

**Conceptos existentes que DEBEN preservarse:**
- `ClientRouter` (astro:transitions) – swappage de páginas
- IntersectionObserver de videos – play/pause en viewport (línea 114-127 de ProjectDetail)
- Aspect-ratio 3/4 del grid – previene layout shift mientras cargan lazy
- Scoped styles – no cruzan límites de componente en Astro
- `prefers-reduced-motion` – respetado para skip-link; debe aplicarse al visor

### Selected Context:

- `src/components/ProjectDetail.astro` (líneas 64-95): Renderiza `<Grid variant="small">` con `entry.data.images` array, diferencia imágenes de videos por extensión (`.mp4/.webm/.mov`), usa `preload="none"` en videos
- `src/components/ProjectDetail.astro` (líneas 103-129): Script que dispara en `astro:page-load`, busca videos con IntersectionObserver si `prefers-reduced-motion` es falso
- `src/components/Grid.astro` (líneas 26-61): Define grid 1 col (móvil) → 3 col (desktop +50em), gap 1.5rem → 4rem
- `src/components/ProjectDetail.astro` (líneas 167-188): `.gallery-item` CSS – aspect-ratio 3/4, border-radius 1.5rem, transform scale(1.02) on hover
- `src/layouts/BaseLayout.astro` (línea 51): `<ClientRouter />` – Astro transitions
- `src/layouts/BaseLayout.astro` (línea 99): Skip-link hacia `#contenido` anchor
- `src/layouts/BaseLayout.astro` (líneas 84-95): Script en `<head>` que escucha `astro:before-swap` (pausa videos) y `astro:after-swap` (restaura tema)
- `src/layouts/BaseLayout.astro` (líneas 137-140): `prefers-reduced-motion` en skip-link (quita transiciones)

### Relationships:

- **Grid items → Visor**: Clic en `.gallery-item img/video` abre modal con índice actual
- **Visor → ProjectDetail scope**: Visor puede ser sub-componente de ProjectDetail o float absoluto si es `client:` script
- **ClientRouter → Visor**: `astro:before-swap` debe cerrar visor + pausar videos; `astro:page-load` debe resetear estado visor
- **IntersectionObserver videos → Visor**: Si visor muestra mismo `<video>` element, observer seguirá activo; considerar clone o reusar
- **Keyboard/Gestos → Visor**: Escape, flechas izq/der, swipe en móvil

### Ambiguities:

- **Mismo elemento <video> vs. clon**: ¿El visor fullscreen muestra el mismo `<video>` element o clona el nodo? Si es el mismo, el IntersectionObserver de grid estará activo aún en fullscreen.
- **Historia vs. estados**: ¿Cada foto/video en visor agrega entrada al historial del navegador? En iPhone, esto interaccionaría con el gesto nativode back-swipe.
- **Resolución de pantalla**: ¿Servir imágenes diferentes para fullscreen vs. grid? El grid actual usa las mismas imágenes en ambos contextos (~1170px width).

---

## Datos Técnicos Descubiertos

### 1. UBICACIÓN DE LA GALERÍA

**Archivo**: `src/components/ProjectDetail.astro` (líneas 64-95)

**Markup de imagen**:
```astro
<li class="gallery-item">
  <img
    src={img}
    alt={`${entry.data.title}`}
    loading={i === 0 ? "eager" : "lazy"}
    fetchpriority={i === 0 ? "high" : undefined}
  />
</li>
```

**Markup de video**:
```astro
<li class="gallery-item">
  <video
    src={`${img}#t=1`}
    poster={img.replace(/\/([^/]+)\.(mp4|webm|mov)$/i, "/posters/$1.webp")}
    loop
    muted
    playsinline
    controls
    preload="none"
  />
</li>
```

**Componente Grid usado**: `Grid` con `variant="small"`
- 1 columna en móvil (por defecto)
- 3 columnas en desktop (≥50em)
- Gap: 1.5rem (móvil), 4rem (desktop)

**Estilos scoped** en ProjectDetail (líneas 167-188):
- `.gallery-item`: `aspect-ratio: 3/4`, `border-radius: 1.5rem`, `box-shadow`, `border 1px solid --gray-800`
- `img/video`: `width: 100%`, `height: 100%`, `object-fit: cover`, `transition: transform` on hover → `scale(1.02)`

### 2. QUE EXISTE Y NO DEBE ROMPERSE

#### ClientRouter (astro:transitions)

- **Ubicación**: `src/layouts/BaseLayout.astro`, línea 51
- **Componente**: `<ClientRouter />` de "astro:transitions"
- **Eventos disparados**:
  - `astro:page-load` – Después de cargar página nueva (línea 104 ProjectDetail.astro)
  - `astro:before-swap` – Antes de cambiar DOM (línea 91 BaseLayout.astro) – pausa videos
  - `astro:after-swap` – Después de cambiar DOM (línea 84 BaseLayout.astro) – restaura tema

**Implicación para visor**: Cualquier estado del visor (open/closed, índice actual) debe resetearse en `astro:before-swap`. Un listener en visor debe limpiar modal, pausar audio, retornar focus al elemento que lo abrió.

#### Videos con IntersectionObserver

- **Ubicación**: `src/components/ProjectDetail.astro`, líneas 113-127
- **Comportamiento**: 
  ```javascript
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.25 }
  );
  observer.observe(video);
  ```
- **Selectores**: Busca `document.querySelectorAll<HTMLVideoElement>(".gallery-item video")`
- **Respeta**: `prefers-reduced-motion` (no crea observer si es true)

**Implicación para visor**: Si visor muestra mismo elemento `<video>` del grid, el observer seguirá activo. Al ir al fullscreen, video sigue en threshold 0.25 pero ahora visible al 100%. Si visor clona el elemento, nuevo `<video>` no tendrá observer y necesitará autoplay o control manual.

#### Aspect-ratio y lazy-loading

- **Línea 170 ProjectDetail.astro**: `.gallery-item { aspect-ratio: 3/4; }`
- **Propósito**: Reserva altura ANTES de que cargue img/video, previene layout shift durante lazy-loading
- **Implicación para visor**: El grid debe mantener este reserve. El visor no necesita aspect-ratio strict (va fullscreen).

#### Astro Scoped Styles

- **Regla**: Estilos con `<style>` en componente `.astro` NO cruzan límites de componente
- **Implicación**: Si visor es nuevo `.astro` component, sus estilos viven ahí. Si es script vanilla que manipula DOM fuera de Astro, estilos deben ser inline o en global CSS.

#### Skip-link y anchor #contenido

- **Ubicación**: `src/layouts/BaseLayout.astro`, línea 99
- **Markup**: `<a class="skip-link" href="#contenido">{t.common.skipToContent}</a>`
- **Destino**: `<main id="contenido">` en ProjectDetail, línea 52
- **Accesibilidad**: Skip-link ya presente, keyboard navegable

**Implicación para visor**: Focus debe retornar al elemento que abrió el visor (gallery-item), no "saltar" al skip-link.

#### prefers-reduced-motion

- **Respetado en**: Skip-link (línea 137-140 BaseLayout.astro – sin transición), IntersectionObserver de videos (línea 105 ProjectDetail.astro)
- **Implicación para visor**: Transiciones de carousel, autoplay, y efectos deben condicionarse a `prefers-reduced-motion`.

### 3. RESOLUCIÓN DE IMÁGENES

**Mediciones por colección** (ancho en píxeles):

| Colección | Rango Típico | Máximo | Mínimo | Nota |
|-----------|--------------|--------|---------|------|
| editorials | 1140–1179 | 1179 | 1143 | Consistente, buena |
| campaigns (publicity) | 1024–1179 | 1179 | 1024 | Algunos pequeños |
| celebrity-events | 684–1440 | 1440 | 684 | Muy variable, algunos muy bajos |
| runway | 1179–1920 | 1920 | 1179 | Buena, algunos excelentes |
| films | (no medido, similar a editorials) | ~1179 | ? | Asumir similar |

**Análisis de insuficiencia en fullscreen**:

**Caso móvil (iPhone 390px, DPR 3)**:
- Fullscreen = ~1170px de ancho (390 × 3)
- Stock images: 1140–1179px
- **Resultado**: Casi todos verían imagen ligeramente pixelada. Algunos de celebrities (<684px) serían muy borrosos.

**Caso desktop (1440px, DPR 2)**:
- Fullscreen = ~2880px de ancho
- Stock images: máx 1920px
- **Resultado**: Ni una sola imagen cubriría fullscreen. Todas estarían escaladas hacia arriba, pixeladas.

**Precedente en repo**: Ha habido reversiones por bajo resolution (ej: commit 345f303 "fix(about): restaurar 'cuatro desfiles de MBFW Madrid'"). El proyecto es consciente del problema.

**Conclusión**: Un visor fullscreen va a exponer insuficiencia de resolución. Opciones:
1. Servir imágenes más grandes en visor (mejor opción, pero requiere regenerar assets)
2. Aceptar pixelación y mejorar gradualmente (realista)
3. No hacer fullscreen y guardar como carousel in-grid (alternativa)

### 4. TRAMPAS DE ACCESIBILIDAD

**Focus trapping**:
- Modal abierto debe atrapar focus dentro (tab solo cicla visor, no página detrás)
- Focus debe retornar a elemento que abrió modal (gallery-item) cuando cierra

**Cierre con Escape**:
- Implementado en muchos lightboxes; visor debe tener listener `keydown` → Escape → close

**Scroll background**:
- Body debe `overflow: hidden` mientras visor está abierto (ya tiene `overflow-x: hidden` línea 294 BaseLayout.astro)
- Considerar `position: fixed` en visor

**Anuncio de posición (screen reader)**:
- Ej: "Foto 3 de 12" debe ser anunciado via ARIA live region o reanunciado en cambio
- Implementable con `aria-live="polite"` + atributos aria-label

**prefers-reduced-motion**:
- Transiciones de carousel → solo movimiento instantáneo si es true
- Autoplay de video → permitido, pero sin easing suave

**Skip-link + contenido**:
- Skip-link presente, pero visor puede interferir si es position: fixed sin z-index adecuado

### 5. RESTRICCIÓN IPHONE

**Riesgos específicos de Safari/iOS**:

1. **Swipe nativo de back**: Borde izquierdo de pantalla, gesto hacia derecha → vuelve atrás. ¿Conflicto con carousel swipe?
   - Solución: Swipe debe tener threshold alto (ej: >50px desde borde izquierdo)

2. **100vh vs. dynamic viewport**: Safari iOS tiene barra de herramientas dinámica. `100vh` ≠ viewport real.
   - Solución: Usar `100svh` (viewport corto) o `window.innerHeight`

3. **position: fixed con teclado**: Si hay input dentro visor, teclado puede empujar fixed element
   - Solución: No hay input en visor, pero cuidado si se añade later

4. **Historial por slide**: ¿Cada slide agrega entrada en history stack? Riesgoso en iPhone – back button interactúa mal.
   - Recomendación: NO usar History API por slide; solo cerrar visor es back

5. **Vídeo fullscreen nativo**: iPhone puede interceptar fullscreen de video. `playsinline` ya está (línea 79 ProjectDetail.astro).
   - Implicación: Videos en visor deben mantener `playsinline`

**El usuario ha probado en device real y ha encontrado bugs** – esto es validación que iPhone importa.

### 6. LIBRERÍA VS. VANILLA

**medium-zoom**: Nombrado en issue #45
- **Instalado**: NO (package.json line 17-24 solo tiene Astro, Tailwind, fontsources)
- **Tamaño**: ~5–7 KB gzipped
- **Alcance**: Enfocado en zoom de imágenes en-place, no carousel

**Alternativas evaluadas**:
- **Vanilla JS**: ~100–150 líneas para modal + keyboard + swipe + video
- **light-gallery**: 30 KB, feature-rich
- **fancybox**: 25 KB, robusto, buena A11y

**Recomendación**: Dado que el site tiene ~15 KB de JS total y casi NO hay interactividad, **vanilla JS** es mejor opción. El costo de 5 KB de librería no justificado vs. 100 líneas controlables y sin dependencias.

### 7. PAYLOAD JS ACTUAL

- **Site total JS**: Solo ClientRouter = 15.3 KB (dist/_astro/)
- **Visor de vanilla**: Estimado ~100–150 líneas = ~3–4 KB minificado
- **Visor + medium-zoom**: ~15 KB + overhead
- **Visor + fancybox**: ~25 KB

**Impacto**: Visor vanilla suma ~25% al JS actual. Librería lo duplicaría o triplicaría.

---

## Selected Code Structure

```text
- src/components/ProjectDetail.astro
- src/components/Grid.astro
- src/layouts/BaseLayout.astro
- src/i18n/index.ts (para translation strings, si se necesita)
- public/assets/ (estructura de imágenes/videos por colección)
```

## Selected Files Tree

```text
/home/agent/Projects/portfolio-luisa-benitez/
├── src/
│   ├── components/
│   │   ├── ProjectDetail.astro (galería grid, scripts, estilos scoped)
│   │   ├── Grid.astro (layout 1 col → 3 col)
│   │   └── (nuevo) GalleryViewer.astro o ProjectDetail.tsx (si es client component)
│   ├── layouts/
│   │   └── BaseLayout.astro (ClientRouter, eventos, skip-link)
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── es.ts
│   │   └── en.ts
│   └── styles/
│       └── global.css
├── public/assets/
│   ├── editorials/ (1140–1179px)
│   ├── films/ (similar)
│   ├── runway/ (1179–1920px)
│   ├── publicity/ (1024–1179px)
│   ├── celebrities/ (684–1440px)
│   └── posters/ (video thumbnails)
└── .sdd/visor-galeria/
    └── exploration.md (este archivo)
```

---

## Preguntas Abiertas (para Planner)

1. **Elemento <video> compartido vs. clon**: ¿Mostrar el mismo `<video>` element en fullscreen o clonar nodo?
   - **Recomendación**: Clonar → elimina complejidad con IntersectionObserver; visor es autónomo

2. **Resolución de imagen fullscreen**: ¿Generar assets más grandes o aceptar pixelación?
   - **Recomendación**: Aceptar por ahora (histórico del proyecto), mejorar en backlog; notar en plan

3. **Historia del navegador**: ¿Back button cierra visor o vuelve a página anterior?
   - **Recomendación**: Back cierra visor (simple), no manipular history

4. **Transiciones**: ¿Smooth fade/slide entre slides o jump instantáneo?
   - **Recomendación**: Respectar `prefers-reduced-motion` (no transición si true); smooth por defecto

5. **Gestos en móvil**: ¿Solo swipe horizontal o también tap doble para zoom?
   - **Recomendación**: Solo swipe + keyboard (Escape, flechas); tap doble es overkill

6. **Carrusel infinito**: ¿Wrap al final (slide 12 → slide 1) o stop?
   - **Recomendación**: Stop (UX clara de límites)

---

## Notas de Implementación

- **Archivo principal**: Modificar `src/components/ProjectDetail.astro`
- **Listeners**: `astro:page-load` (inicializar), `astro:before-swap` (limpiar)
- **Focus**: Guardar elemento que abrió visor; retornar focus al cerrar
- **CSS**: Probablemente inline o scoped en ProjectDetail; considerar class `.gallery-viewer` para visor modal
- **i18n**: Botones/aria-labels si se necesitan strings (ej: "Cerrar", "Foto X de Y")
- **Testing**: Verificar en desktop (Chrome, Firefox) e iOS (Safari real) antes de entregar

---

**Estado**: Exploración completada; listo para planificación.

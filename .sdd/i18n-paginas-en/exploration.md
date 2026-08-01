# Exploración: Parametrización de páginas por locale (EN/ES)

**Feature ID**: i18n-paginas-en  
**Status**: 🔄 Fase de Descubrimiento  
**Creado**: 2026-07-30  
**Objetivo**: Mapear la arquitectura e18n actual y los cambios necesarios para hacer el sitio inglés navegable mediante templates parametrizados por locale.

---

## Objetivo

Implementar soporte multiidioma (EN/ES) usando templates parametrizados por locale, evitando duplicación de src/pages/en/ y el riesgo silencioso de desincronización entre árboles de páginas.

**Enfoque decidido:** Templates parametrizados por locale (ej. /campaigns/[locale]/[...slug].astro emite ES e EN via getStaticPaths) en lugar de árbol duplicado src/pages/en/.

El sitio debe permanecer publicado en https://luisabenitez.es sin cambios de URL. Las rutas españolas /campaigns/proyecto-1 no deben cambiar. Rutas EN viven bajo /en/campaigns/proyecto-1.

---

## Hallazgos Clave

### 1. INVENTARIO DE PÁGINAS (Línea Baseline)

**Páginas estáticas (sin generación dinámica):**
- / (home, index.astro) — con i18n parcial, hardcoded tagline ES
- /contact/ (contact.astro) — con i18n completo
- /about/ (about.astro, redirige a /#sobre-mi) — usa i18n en título

**Índices de colecciones (listas, estatico templated):**
- /campaigns/ → campaigns/index.astro (hardcoded ES "Campañas")
- /celebrity-events/ → celebrity-events/index.astro (hardcoded ES)
- /editorials/ → editorials/index.astro (hardcoded ES)
- /films/ → films/index.astro (hardcoded ES)
- /runway/ → runway/index.astro (hardcoded ES)

**Rutas dinámicas de colecciones (detalles, via getStaticPaths):**
- /campaigns/{id} (campaigns/[...slug].astro) ~8 proyectos, hardcoded "Volver"
- /celebrity-events/{id} (celebrity-events/[...slug].astro) ~7 proyectos, hardcoded "Volver"
- /editorials/{id} (editorials/[...slug].astro) ~6 proyectos, hardcoded "Volver"
- /films/{id} (films/[...slug].astro) ~2 proyectos, hardcoded "Volver"
- /runway/{id} (runway/[...slug].astro) ~4 proyectos, hardcoded "Volver"
**Total dinámicos: ~27 slugs reales**

**Rutas de redirección (obsoletas, mantenidas por backward-compat):**
- /publicity/{id} → /campaigns/{id} (via RedirectPage meta-refresh + canonical)
- /celebrities/{id} → /celebrity-events/{id} (via RedirectPage)
- /work/{id} → colecciones varias (via RedirectPage)
- /about/ → /#sobre-mi (via RedirectPage)

**Baseline `pnpm build`:** 72 páginas HTML (todas ES). Desglose:
- 1 home
- 1 contact
- 3 redirects (about, varias en work)
- 5 colección indices
- ~27 detalles dinámicos
- ~5 redirect indices (publicity/, celebrities/, work/)
- 1 404.astro
- ~25 additional redirect slugs (publicity, celebrities, work)

### 2. PARAMETRIZACIÓN ESPERADA CON TEMPLATES PARAMETRIZADOS

Con templates que usan locale parameter en getStaticPaths, cada ruta puede generar **DOS variantes** (es + en):

**Ejemplo campaigns/[...slug].astro:**
- Hoy: getStaticPaths retorna campaigns.map(entry → { params: { slug }, props: { entry } })
- Futuro: getStaticPaths retorna campaigns.flatMap(entry → [ { params: { slug, locale: 'es' } }, { params: { slug, locale: 'en' } } ])
- Resultado: /campaigns/bruno-magli (ES) + /en/campaigns/bruno-magli (EN)

**Impacto en página count:** 72 × 2 = ~144 (teórico, si TODAS se parametrizan). Matizaciones:
- Redirecciones viejas (publicity/, celebrities/, work/) ¿necesitan /en/ versions? Probablemente NO (son cleanup de rutas viejas). Plan debe decidir.
- Las estáticas principales (/, /contact/) DEBEN tener /en/ versions para tener sitio inglés navegable.
- Los índices de colecciones (campaigns/, celebrity-events/, etc.) DEBEN tener /en/ versions.

### 3. CONTENIDO SIN TRADUCCIÓN EN (Limitación Importante)

Las 5 colecciones (campaigns, celebrity-events, editorials, films, runway) cargan su contenido desde JSON loaders (src/content.config.ts):
- `title`: Es español (ej. "Bruno Magli", "Aitana YSL", "PAP Magazine")
- `description`: Es español (ej. "Campaña Bruno Magli SS2024")
- Resto (year, credits, images, format, etc.): idioma-agnóstico

**No existe descripción EN en los JSONs de src/content/**

**Consecuencia:** Una ruta /en/campaigns/bruno-magli mostrará título + descripción EN ESPAÑOL porque el contenido colección no tiene traducciones. Es lógicamente correcto (fase incremental), pero visualmente confuso.

**Decisión de plan:** ¿Mostrar descripción ES en /en/ páginas, o dejar vacía, o mostrar stub "Traducción en camino"? Recomendación: mostrar descripción ES (ya existe), traducir cuando se haya aprobado el contenido en fases futuras (P4-3 o después).

### 4. HARDCODEADO EN ESPAÑOL — CRÍTICO (Debe parametrizarse)

**Navegación y construcción de rutas:**
- src/components/Nav.astro (líneas 17-25): textLinks array con 7 hrefs ['/', '/editorials/', '/campaigns/', '/celebrity-events/', '/films/', '/runway/', '/contact/']. SIN /en/ prefix. Result: clicko en EN nav → /campaigns/ (ruta ES). Trap de round-trip a español.
- src/components/Card.astro (línea 37): href={`/${page}/${id}`} construido sin locale. Mismo trap. Card reusado en index.astro home para featured projects.

**Back links ("Volver"):**
- campaigns/[...slug].astro (línea 36): <a href="/campaigns"> Volver
- celebrity-events/[...slug].astro: "Volver"
- editorials/[...slug].astro: "Volver"
- films/[...slug].astro: "Volver"
- runway/[...slug].astro: "Volver"

**Títulos y metadatos en índices:**
- campaigns/index.astro (línea 13-14): title="Campañas | Luisa Benítez", description="Campañas y colaboraciones..."
- Same en: celebrity-events/index.astro, editorials/index.astro, films/index.astro, runway/index.astro.

**Otros:**
- src/pages/index.astro (línea 157): tagline "Estilista y asistente de moda, Diseñadora de Modas, Asesoría de Imagen y Personal Shopper" — NO está en t.home, está hardcodeado. PENDIENTE DE APROBACIÓN según comment (línea 39 en en.ts).
- src/components/CvDownloadLink.astro (línea 16): href={profile.cvPath.es} — hardcoded .es aunque profile.ts declara cvPath: { es, en }. Debe usar profile.cvPath[locale].
- src/layouts/BaseLayout.astro (línea 25): <html lang="es"> — hardcoded a español. Debe ser <html lang={locale}>.

### 5. i18n PLOMERÍA LISTA (Reutilizable, Solo Falta Extensión)

**Ya existe y funciona:**
- getLocaleFromUrl(url: URL): Locale (src/i18n/index.ts línea 26-29) — deduce 'es' | 'en' desde URL. Lógica: exacto '/en' o startsWith '/en/' → 'en', else 'es'. Funciona porque Astro colloca URL.
- getTranslation(locale: Locale): Translation (línea 18-20) — retorna diccionario por locale.
- Diccionarios es.ts y en.ts en **paridad de keys** (TypeScript `type Translation` fuerza). Estructura idéntica, valores traducidos.
- Astro config i18n block (astro.config.mjs línea 19-25): locales: ['es', 'en'], prefixDefaultLocale: false (ES raíz, EN /en/). fallback NO habilitado (comentario: P4-5).

**Necesita añadirse:**
- Helper para construir hrefs con locale prefix (ej. getLocalizedHref(href: string, locale: Locale): string). NO EXISTE. Crítico para Nav, Card, back links.
- Lógica en getStaticPaths para pasar locale dimension en params (ej. { slug, locale }). Cada template debe generarla.
- Actualización de astro.config.mjs sitemap filter para incluir /en/* rutas (línea 45-49 solo excluye rutas viejas; no excluye /en/ en sí).

---

## Requisitos del Usuario

### Tarea: 

Explorar completamente la base de código para mapear:

1. **INVENTARIO DE PÁGINAS**: Todos los archivos bajo src/pages/, su ruta actual, si son estáticas o colecciones dinámicas, y si hardcodean español o usan ya el diccionario i18n.

2. **PLOMERÍA i18n ACTUAL**: Signatures de getLocaleFromUrl, getTranslation; cómo se deriva hoy la locale de la URL; si es.ts y en.ts están en paridad de claves.

3. **CONSTRUCCIÓN DE ENLACES INTERNOS (RIESGO CRÍTICO)**: Cada lugar donde se construye un href interno (Nav, Card, footer, breadcrumbs, home → colecciones, CvDownloadLink, cualquier href="/..." hardcodeado). Para cada uno: ¿producirá una URL locale-correcta bajo el nuevo esquema o enviará visitantes ingleses de vuelta a español?

4. **RUTAS DE COLECCIONES**: campaigns, celebrity-events, editorials, films, runway. Cómo enumera hoy getStaticPaths los slugs. Qué cambia con una dimensión locale. ¿Hay prosa traducible en content collections sin equivalente inglés? (títulos, descripciones, créditos).

5. **astro.config.mjs**: Bloque i18n actual, ausencia deliberada de `fallback`, cambios necesarios bajo el nuevo enfoque, qué debe hacer el `filter` del sitemap sobre las nuevas rutas /en/.

6. **CONSTRAINTS Y TRAPS**: Scoped styles no cruzan límites de componentes. Nav.astro tiene breakpoint 88em duplicado en @media y window.matchMedia. El sitio está publicado en GitHub Pages (sin 301s reales). Las URLs españolas existentes NO pueden cambiar. Baseline de página actual via `pnpm build`.

7. **PREGUNTAS ABIERTAS**: Cada una con recomendación y tradeoff.

### Arquitectura: 

- **Routing**: Astro pages (static .astro files, dynamic [...slug].astro collection routes)
- **i18n**: src/i18n/index.ts (getLocaleFromUrl, getTranslation), es.ts, en.ts (diccionarios)
- **Componentes**: Nav, Card, Footer, CvDownloadLink construyen enlaces; RedirectPage maneja redirects
- **Colecciones**: src/content.config.ts define campaigns, celebrities, editorials, films, publicity, runway
- **Config**: astro.config.mjs con bloque i18n, sitemap filter
- **Dato estático**: src/data/profile.ts (metadatos del sitio)

### Selected Context:

**PLOMERÍA i18n:**
- src/i18n/index.ts: getLocaleFromUrl(url: URL) → Locale; getTranslation(locale: Locale) → Translation. La locale se deduce verificando si el pathname es exactly '/en' o starts con '/en/', todo lo demás → ES. Los diccionarios es.ts y en.ts están en paridad de claves (TypeScript obliga via `type Translation`).
- src/i18n/es.ts: Diccionario español (type Translation); source of truth para la estructura.
- src/i18n/en.ts: Diccionario inglés con los mismos keys, valores traducidos.

**PÁGINAS ESTÁTICAS CON i18n:**
- src/pages/index.astro (home, línea 19): usa getLocaleFromUrl + getTranslation. Tiene hardcoded Spanish tagline línea 157.
- src/pages/contact.astro (línea 16): usa getLocaleFromUrl + getTranslation completamente.
- src/pages/about.astro (línea 14): redirige a /#sobre-mi, usa i18n para el título.
- src/pages/404.astro: no revisado (bajo prioridad).

**PÁGINAS DE COLECCIÓN + ÍNDICES:**
- Cinco colecciones (campaigns, celebrity-events, editorials, films, runway). Dos de redirect (celebrities → celebrity-events, publicity → campaigns).
- Patrón: src/pages/{collection}/index.astro (lista paginada) y src/pages/{collection}/[...slug].astro (detalle).
- campaigns/index.astro (línea 13-14): hardcoded "Campañas | Luisa Benítez" y descripción en español.
- campaigns/[...slug].astro (línea 36): hardcoded "Volver" (back link) en español.
- Mismo patrón en: celebrity-events/, editorials/, films/, runway/. Editorial de redirect (celebrities/) y campaigns de redirect (publicity/).

**CONSTRUCCIÓN DE ENLACES INTERNOS (CRÍTICO):**
- src/components/Nav.astro (líneas 17-25): hrefs hardcodeados ['/', '/editorials/', '/campaigns/', '/celebrity-events/', '/films/', '/runway/', '/contact/']. SIN prefijo de locale — solo funciona para ES.
- src/components/Card.astro (línea 37): href={`/${page}/${id}`} sin locale prefix. Enviará visitantes EN de vuelta a /campaigns/..., no /en/campaigns/...
- src/pages/index.astro (línea 82-86): Card page={collection} para cada proyecto destacado — usa Card.astro, heredahereda el problema.
- src/components/CvDownloadLink.astro (línea 16): href={profile.cvPath.es} hardcoded a .es. El profile.ts declara cvPath: { es: string; en: string }, pero se ignora .en.
- src/components/Footer.astro: NO revisado (necesita lectura).
- Breadcrumbs / Back links: campaigns/[...slug].astro línea 36, otros […slug].astro.

**CONTENT COLLECTIONS (no hay prosa traducible EN):**
- src/content.config.ts: Five loaders (campaigns, celebrity-events, editorials, films, runway). El schema gallerySchema NO tiene campo de descripción EN — todos los títulos/descripciones son en español. getStaticPaths de cada [..slug].astro enumera por ID en una sola dimensión. CON locale, la generación pasa de 1 a 2 variantes por slug (es y en).

**astro.config.mjs:**
- i18n block: defaultLocale: 'es', locales: ['es', 'en'], prefixDefaultLocale: false (es en raíz, en bajo /en/).
- Sitemap filter (línea 45-49): excluye /publicity/, /celebrities/, /work/, /about/.
- NO tiene fallback (comentario: P4-5, cuando existan páginas EN).

**DATOS ESTÁTICOS:**
- src/data/profile.ts: cvPath es { es: string; en: string } | undefined (ya preparado).

**COMPONENTES SIN i18n USADO:**
- src/components/Footer.astro: necesita lectura.
- src/components/Hero.astro: necesita lectura.
- src/components/CreditsBlock.astro: usa t.credits via props (revisar consumo).
- Todos los […slug].astro heredan el componente CreditsBlock.

**BASELINE DE PÁGINAS:**
- `pnpm build` genera 72 páginas. Con locale parametrizada EN: solo las rutas que cambian generarán duplicados. Las estáticas /, /contact/, etc. necesitan ser parametrizadas TAMBIÉN si queremos el sitio completo en EN.

### Relationships:

**FLUJO DE LOCALE EN PÁGINAS:**
1. Astro.url.pathname (constructor automático) → getLocaleFromUrl(Astro.url) → Locale ('es' | 'en')
2. Locale → getTranslation(locale) → Translation (diccionario de strings)
3. Componente usa t.nav.home, t.contact.title, etc.

**CONSTRUCCIÓN DE HREF EN COMPONENTES:**
- Nav.astro: define textLinks[] con hrefs. Cada href debería ser `getLocalePrefix() + href` si existe ruta EN.
- Card.astro (línea 37): recibe page + id → construye href = `/${page}/${id}`. CON i18n parametrizado debe ser `${localePrefix}/${page}/${id}`.
- CvDownloadLink.astro (línea 16): href = profile.cvPath.es. Debe ser `profile.cvPath[locale]`.
- index.astro → Card (línea 196-207): pasa page=collection → Card construye href sin locale. Cadena rota.

**GETSTATICPATHS Y LOCALE:**
- campaigns/[...slug].astro getStaticPaths (línea 15-21): retorna campaigns.map(entry → { params: { slug }, props: { entry } }).
- CON locale: debe retornar campaigns.map(entry → **AMBAS** { params: { slug, locale: 'es' } } y { params: { slug, locale: 'en' } }).
- Eso multiplica por 2 el total de páginas dinámicas. Baseline 72 → ~144 (si TODAS se parametrizan).

**ARCHIVOS ROUTE ACTUALES VS. PARAMETRIZADOS:**
- Ruta ACTUAL: /campaigns/bruno-magli
- Ruta NUEVA ES: /campaigns/bruno-magli (SIN cambio, compatibilidad)
- Ruta NUEVA EN: /en/campaigns/bruno-magli
- El template /src/pages/campaigns/[...slug].astro ahora genera AMBAS.

**DICCIONARIOS VS. PROSA DE CONTENIDO:**
- es.ts / en.ts: tienen el mismo shape. Todos los keys que la home/contact necesitan están ahí.
- Descripciones de proyectos (campaigns*.json, editorials*.json, etc.): SOLO EN ESPAÑOL. Una campaña tiene { title: "Bruno Magli", description: "..." }, ambos en español. NO HAY descripción EN. Una ruta /en/campaigns/bruno-magli mostraría título y descripción en español.

**RED DE HREFS ROTOS (CRÍTICO):**
1. Usuario EN visita /en/campaigns/ (index)
2. Ve tarjeta "Bruno Magli"
3. Card.astro genera href="/campaigns/bruno-magli" (sin /en/)
4. Click → /campaigns/bruno-magli (RUTA ES)
5. getLocaleFromUrl vuelve a ser 'es' porque NO comienza con /en/
6. Usuario EN termina leyendo español.

### Ambiguities:

1. **¿Qué hacer con proyectos sin descripción EN?** Una campaña solo tiene descripción en español. ¿Mostrar descripción EN en /en/campaigns/bruno-magli? Recomendación: SÍ, por consistencia (el sitio está en construcción multiidioma incremental). Las descripciones se traducirán en una siguiente fase.

2. **¿Mantener RedirectPage para rutas viejas?** Hoy RedirectPage es usada por about.astro (→ /#sobre-mi), celebrities/[..slug] (→ celebrity-events/), publicity/[..slug] (→ campaigns/). Con rutas parametrizadas EN, ¿necesitamos /en/about/? ¿/en/celebrities/? Recomendación: SÍ, crear RedirectPages EN que redirigen a /en/#sobre-mi, /en/celebrity-events/, etc. para mantener enlace coherencia si existen URLs públicas /en/*.

3. **Astro Scoped Styles en componentes parametrizados.** Nav.astro y Card.astro tienen <style scoped>. Los estilos se aplican solo a componentes de esa ruta. ¿Hay riesgo de CSS que no cruza? Recomendación: Verificar en plan. Bajo riesgo si los componentes se instancian igual en ambas rutas.

4. **breakpoint 88em duplicado en Nav.** Nav.astro línea 169 (window.matchMedia '(min-width: 88em)') debe coincidir con el @media de línea 417. ¿Risk de desincronización si se cambia uno solo? Recomendación: Documentar como CONSTRAINT en el plan — si se toca el @media, actualizar el matchMedia (y viceversa).

5. **Baseline URL del sitio: luisabenitez.es (raíz)** Astro config: site: 'https://luisabenitez.es'. ¿Cómo generar sitemap para /en/? El filtro actual (línea 45-49) excluye rutas viejas. ¿Debería incluir /en/* en el sitemap final? Recomendación: SÍ, modificar el filter en astro.config.mjs para incluir /en/ rutas pero seguir excluyendo las viejas (publicity/, celebrities/, etc.). Ver plan.

6. **¿Necesitamos fallback: { en: 'es' } en astro.config.mjs i18n?** Comentario en línea 15-18: "P4-5, las páginas espejo". ¿Cuándo habilitarlo? Recomendación: EN EL PLAN. Si usamos templates parametrizados, getStaticPaths retorna AMBOS slugs (es y en). El fallback no es necesario porque no hay 404s que caigan. Pero si fallback se deja disabled, Astro no redirige /en/* → / automáticamente — lo que queremos (cada /en/* es una página real, no un redirect).

7. **¿Qué locale por defecto en getLocaleFromUrl si la URL es malformada?** Línea 28: `path.startsWith('/en/') ? 'en' : 'es'`. ¿Qué pasaría si BASE_URL es no-estándar? Recomendación: El comentario ya lo prevé (línea 22-25). Bajo riesgo si BASE_URL sigue siendo '/'.

8. **NavLinks y atributo aria-current.** Nav.astro línea 41-46 usa isCurrentPage(href). Con rutas parametrizadas, ¿cómo se determina la página actual? ¿/en/campaigns/ activa 'Campañas' en el nav EN, o necesita logic extra? Recomendación: isCurrentPage compara pathname con href. Debe funcionar igual si hrefs incluyen /en/ (mantendrá paridad). Verificar en plan.

9. **Content del About y Contact sin traducción EN clara.** La bio tiene traducción EN (en.ts línea 77-80). La copy de contact también (en.ts línea 31-37). ¿Son finales o "PENDIENTE DE APROBACIÓN"? Recomendación: Revisar con David. Las de about y contact aparecen aprobadas; las de home tienen nota PENDIENTE (línea 27-29 en en.ts). Plan debe marcar la home como bloqueante si no se aprueba ese texto.

10. **¿Dónde está Footer.astro?** Ya revisado (línea 7 usa i18n, no construye hrefs internos).

---

## Constraints y Traps (Por Documentar en Plan)

### CONSTRAINT 1: Scoped Styles NO Cruzan Componentes

Astro aplica un hash de componente a cada `<style>` scoped. Si Card.astro define `.card { ... }`, esa regla SOLO se aplica al Card de esa ruta. Si otro componente intenta aplicar `.card`, fallará.

**Implicación:** Si parametrizamos templates y reutilizamos componentes, el CSS debe reclasarse en cada componente o moverse a global. Ver Card, Nav en plan.

**Trap:** Cambiar estilos en un componente pensando que se aplican everywhere, pero solo afectan rutas que instancian ese componente.

### CONSTRAINT 2: Nav.astro Breakpoint 88em Duplicado

Nav.astro línea 169: `window.matchMedia('(min-width: 88em)')`  
Nav.astro línea 417: `@media (min-width: 88em)`

Deben coincidir. Si uno cambia sin cambiar el otro, el menú hamburgesa falla en ciertos breakpoints.

**Trap:** Un cambio edita solo el @media o solo el matchMedia, invisible en revisión porque no hay error. El hamburguesa se rompe silenciosamente en mobile-desktop boundaries.

**Documentación:** Ambos valores viven en el comentario de línea 168 y 415. Ver. Actualizar juntos SIEMPRE.

### CONSTRAINT 3: Sitio Publicado en GitHub Pages sin 301 Real

El sitio está en https://luisabenitez.es bajo GitHub Pages (hosting estático). No hay servidor que devuelva 301s. Las rutas viejas (/publicity/, /celebrities/, /about/, /work/) se mantienen como RedirectPage (meta-refresh + canonical, ver src/components/RedirectPage.astro).

**Implicación:** Cualquier URL pública vieja que esté indexada o guardada en marcadores debe seguir funcionando. NO podemos cambiar /campaigns/bruno-magli (esa URL es la que se usa hoy).

**Trap:** Un agente futuro podría "limpiar" las rutas redirect, rompiéndolas. Están documentadas (línea 31-44 de RedirectPage.astro) pero es fácil ignorar.

**Cadencia:** Redirect de /about/ se puede quitar después de agosto 2027 (revisión en issue de GitHub). Otros redirects similar timeline.

### CONSTRAINT 4: Baseline de Páginas 72 (Verificar Tras Parametrización)

`pnpm build` hoy genera 72 páginas. Con parametrización de locale en getStaticPaths, doblará (mínimo). Plan debe:
1. Establecer baseline: "hoy 72 páginas"
2. Parametrizar rutas (fases por fase)
3. Verificar buildtime no se degrada (172 → 144+ páginas, puede crecer construcción)
4. Sitemap debe listar /en/* rutas

Cambio en astro.config.mjs sitemap filter (línea 45-49 hoy): solo excluye rutas viejas. ¿Incluye automáticamente /en/* o necesita lógica extra?

### CONSTRAINT 5: CSS overflow-x: hidden Oculta Desbordamientos

src/styles/global.css probablemente tiene `body { overflow-x: hidden; }`. Esta regla oculta desbordamientos sin scroll — lo que hace invisible un recorte accidental. Navs anchos (ej. 7 enlaces en desktop) pueden desbordar sin que se note (ver comentarios línea 377-390 de Nav.astro).

**Trap:** Cambiar tamaño de fuente, letter-spacing o padding en Nav, y nunca ver que se recorta porque overflow-x: hidden lo oculta.

**Mitigación:** Medir con `rect.right > window.innerWidth` (nunca `scrollWidth` que usa overflow-x). Ver comentario línea 395.

---

## Bloques de Decisión para el Plan

### Pregunta 1: ¿Traducir descripciones de proyectos ahora o después?

**Contexto:** Content collections NO tienen descripción EN. Rutas /en/campaigns/bruno-magli mostrarían descripción ES.

**Opciones:**
- A) Mostrar descripción ES en rutas /en/ (incremental, fase futura para traducir). ✓ Recomendado.
- B) Dejar descripción vacía en rutas /en/ (confuso). ✗
- C) Mostrar stub "Traducción en progreso" (UX clara). ✓ Alternativa.

**Decisión:** Plan elige A o C.

### Pregunta 2: ¿Parametrizar RedirectPages viejas?

**Contexto:** /publicity/{id}, /celebrities/{id}, /work/{id} redirigen a colecciones nuevas. ¿Necesitan /en/ versions?

**Opciones:**
- A) Sí, /en/publicity/{id} → /en/campaigns/{id}. (Completitud, pero bajo uso.) 
- B) No, solo ES redirect. (Simplificación, bajo riesgo si enlaces /en/ no existen.)

**Recomendación:** B. Las rutas viejas son cleanup interno; los enlaces públicos/externos a /en/* no existen aún. Decidir después si es necesario.

### Pregunta 3: ¿Localizar los textos de home tagline + back buttons ahora?

**Contexto:** index.astro tagline ES está hardcodeado (line 157). Todos los [...slug].astro tienen hardcoded "Volver".

**Opciones:**
- A) Mover a i18n (es.ts / en.ts) como parte de parametrización. ✓ Recomendado.
- B) Dejar hardcodeado, traducir después. (Deuda técnica.)

**Decisión:** Plan elige A. Estos son los cambios críticos.

### Pregunta 4: astro.config.mjs fallback?

**Contexto:** Línea 15-18 comentario: fallback se deja para P4-5 (cuando existan páginas EN). Hoy disabled.

**Implicación:** Con fallback: { en: 'es' } habilitado, Astro generaría 39 stubs que redirigen /en/* → / (porque getStaticPaths no genera ambas variantes yet). Sin fallback, rutas /en/* simplemente 404.

**Con parametrización:** getStaticPaths retorna ambas variantes, así que fallback NO necesario (no hay 404s EN).

**Decisión:** Plan deja fallback disabled (o decide explícitamente enabled para seguridad).

---

## Selected Code Structure

- src/i18n/index.ts: getLocaleFromUrl, getTranslation, defaultLocale
- src/i18n/es.ts: Diccionario español (type Translation source of truth)
- src/i18n/en.ts: Diccionario inglés (paridad de keys)
- src/pages/index.astro: Home con i18n parcial; hardcoded tagline EN línea 157
- src/pages/contact.astro: Contact page con i18n completo
- src/pages/about.astro: Redirect a /#sobre-mi con i18n en título
- src/pages/campaigns/index.astro: Campaigns list con hardcoded strings ES
- src/pages/campaigns/[...slug].astro: Campaign detail con hardcoded "Volver"
- src/pages/celebrity-events/index.astro: Celebrity-events list
- src/pages/celebrity-events/[...slug].astro: Celebrity-events detail
- src/pages/editorials/index.astro: Editorials list
- src/pages/editorials/[...slug].astro: Editorials detail
- src/pages/films/index.astro: Films list
- src/pages/films/[...slug].astro: Films detail
- src/pages/runway/index.astro: Runway list
- src/pages/runway/[...slug].astro: Runway detail
- src/pages/publicity/[...slug].astro: Redirect publicity → campaigns
- src/pages/celebrities/[...slug].astro: Redirect celebrities → celebrity-events
- src/pages/work/[...slug].astro: Redirect work (colección vieja)
- src/pages/404.astro: 404 page (bajo prioridad)
- src/components/Nav.astro: Navigation con hrefs hardcoded SIN locale prefix
- src/components/Card.astro: Card que construye href/{page}/{id} SIN locale
- src/components/CvDownloadLink.astro: CV link con hardcoded .es
- src/components/Footer.astro: [PENDIENTE LECTURA]
- src/components/RedirectPage.astro: Componente de redirect con meta-refresh + canonical
- src/components/CreditsBlock.astro: Bloques de crédito (consumidor de t.credits)
- src/components/BaseLayout.astro: Layout que contiene Nav, Footer, MainHead, SEO
- src/data/profile.ts: Datos estáticos con cvPath: { es, en }
- src/content.config.ts: Definición de colecciones (campaigns, celebrity-events, editorials, films, runway)
- astro.config.mjs: Configuración con i18n block, sitemap filter, base
- src/layouts/BaseLayout.astro: [VERIFICAR si usa i18n]

---

## Selected Files Tree

```
/home/agent/Projects/portfolio-luisa-benitez
├── src/
│   ├── i18n/                         # Plomería i18n
│   │   ├── index.ts                  # getLocaleFromUrl, getTranslation
│   │   ├── es.ts                     # Diccionario español (source of truth)
│   │   └── en.ts                     # Diccionario inglés
│   ├── pages/                        # Rutas de Astro
│   │   ├── index.astro               # Home (parcialmente i18n)
│   │   ├── contact.astro             # Contacto (con i18n)
│   │   ├── about.astro               # Redirect con i18n en título
│   │   ├── 404.astro                 # Error page
│   │   ├── campaigns/                # Colección campaigns
│   │   │   ├── index.astro           # Lista (hardcoded ES)
│   │   │   └── [...slug].astro       # Detalle (hardcoded "Volver")
│   │   ├── celebrity-events/         # Colección celebrity-events
│   │   │   ├── index.astro           # Lista
│   │   │   └── [...slug].astro       # Detalle
│   │   ├── editorials/               # Colección editorials
│   │   │   ├── index.astro           # Lista
│   │   │   └── [...slug].astro       # Detalle
│   │   ├── films/                    # Colección films
│   │   │   ├── index.astro           # Lista
│   │   │   └── [...slug].astro       # Detalle
│   │   ├── runway/                   # Colección runway
│   │   │   ├── index.astro           # Lista
│   │   │   └── [...slug].astro       # Detalle
│   │   ├── publicity/                # Redirect viejo → campaigns
│   │   │   └── [...slug].astro       # Redirige a /campaigns/
│   │   ├── celebrities/              # Redirect viejo → celebrity-events
│   │   │   └── [...slug].astro       # Redirige a /celebrity-events/
│   │   └── work/                     # Redirect colección vieja
│   │       └── [...slug].astro       # Redirige a colecciones reales
│   ├── components/                   # Componentes reutilizables
│   │   ├── Nav.astro                 # Navegación (hrefs hardcoded SIN locale)
│   │   ├── Card.astro                # Card de proyecto (href SIN locale)
│   │   ├── CvDownloadLink.astro      # Link CV (hardcoded .es)
│   │   ├── Footer.astro              # [PENDIENTE LECTURA]
│   │   ├── RedirectPage.astro        # Página de redirect (meta-refresh + canonical)
│   │   ├── CreditsBlock.astro        # Bloques de crédito
│   │   ├── BaseLayout.astro          # Layout principal
│   │   ├── MainHead.astro            # <head> metadata
│   │   ├── SEO.astro                 # SEO tags
│   │   ├── Hero.astro                # Hero section
│   │   ├── Icon.astro                # Icon component
│   │   ├── Grid.astro                # Grid layout
│   │   ├── ContactCTA.astro          # CTA de contacto
│   │   ├── CallToAction.astro        # CTA genérico
│   │   ├── ThemeToggle.astro         # Theme toggle
│   │   └── IconPaths.ts              # Icon definitions
│   ├── layouts/                      # Astro layouts
│   │   └── BaseLayout.astro          # Layout base
│   ├── data/                         # Datos estáticos
│   │   └── profile.ts                # Datos de Luisa (cvPath: { es, en })
│   ├── content.config.ts             # Definición de colecciones
│   ├── lib/
│   │   └── sort-projects.ts          # Ordenamiento de proyectos
│   └── loaders/
│       └── gallery-loader.ts         # Loader de galerías
├── astro.config.mjs                  # Config Astro (i18n block, sitemap filter)
└── [otras estructuras no críticas para i18n]
```

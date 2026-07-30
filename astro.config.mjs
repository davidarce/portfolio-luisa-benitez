// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://luisabenitez.es',
  base: '/',
  // Cimientos de i18n (P4-1, extendido en i18n-paginas-en). El español vive
  // en la raíz y el inglés vive bajo /en/. Las páginas EN salen de
  // src/pages/[...lang]/ (un parámetro rest en la raíz de src/pages/, NO de
  // un árbol duplicado src/pages/en/): un mismo fichero emite las dos
  // variantes vía getStaticPaths, así que esta config ya no es inerte.
  //
  // `fallback` SIGUE DESACTIVADO, pero ya no por falta de páginas EN (esa
  // razón dejó de ser cierta): con `[...lang]`, cada ruta EN es una página
  // real generada en build, no hay ningún 404 del que Astro tenga que "caer"
  // a español. Medido en el prototipo: 115 páginas (72 ES + 43 EN) sin
  // `fallback`. Activarlo solo añadiría stubs de redirect para las rutas que
  // deliberadamente se dejan sin variante EN (Decisión E del plan:
  // /publicity/, /celebrities/, /work/, /about/, 404).
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false, // ES en la raíz, EN en /en/
    },
  },
  integrations: [
    sitemap({
      // El sitemap es la lista que le damos a Google diciendo "estas son mis
      // páginas de verdad". Las rutas de aquí abajo siguen existiendo, pero
      // como páginas de redirección (meta-refresh + canonical, ver
      // src/components/RedirectPage.astro), no como contenido. Listarlas sería
      // pedirle a Google que indexe un cartel de "nos hemos mudado".
      //
      // Qué es cada una:
      //   /publicity/ y /celebrities/  rename de la Fase 2 (REVISION-v2 §4)
      //   /work/                       colección de la plantilla, retirada
      //   /about/                      fusionada en la home (/#sobre-mi)
      //
      // /contact/ NO está excluida: volvió a ser página propia y se indexa.
      //
      // Rutas /en/*: la lógica de este filtro NO cambia con i18n-paginas-en.
      // Medido en el prototipo: el sitemap pasó de 43 a 86 URLs (43 ES + 43
      // EN) sin tocar el filter — las rutas /en/* entran solas. Y como estos
      // `includes` comprueban el sufijo de ruta sin fijar el idioma,
      // cubrirían también un hipotético /en/publicity/ si algún día
      // existiera (Decisión E: hoy no existe, esos stubs se quedan solo-ES).
      //
      // CADUCIDAD: estas exclusiones desaparecen cuando se retiren las
      // redirecciones. Revisar a partir de agosto de 2027 — el porqué, el
      // plazo y cómo comprobar si ya sobran están documentados en la cabecera
      // de src/components/RedirectPage.astro.
      filter: (page) =>
        !page.includes('/publicity/') &&
        !page.includes('/celebrities/') &&
        !page.includes('/work/') &&
        !page.endsWith('/about/'),
    }),
  ],
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['582f9307325c.ngrok-free.app']
    }
  }
});
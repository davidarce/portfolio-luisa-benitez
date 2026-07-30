// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://luisabenitez.es',
  base: '/',
  // `fallback` sigue desactivado: cada ruta EN es una página real generada en
  // build (src/pages/[...lang]/), no hay ningún 404 del que Astro deba "caer"
  // a español. Activarlo solo añadiría stubs de redirect para rutas que se
  // dejan deliberadamente sin variante EN (Decisión E del plan).
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false, // ES en la raíz, EN en /en/
    },
  },
  integrations: [
    sitemap({
      // Excluye páginas de redirección (meta-refresh + canonical, ver
      // src/components/RedirectPage.astro) del sitemap: no son contenido.
      // /publicity/, /celebrities/, /work/ y /about/ — /contact/ NO está excluida.
      //
      // CADUCIDAD: estas exclusiones desaparecen cuando se retiren las
      // redirecciones. Revisar a partir de agosto de 2027 — ver la cabecera
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
// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://luisabenitez.es',
  base: '/',
  // Cimientos de i18n (P4-1). El español vive en la raíz y el inglés vivirá
  // bajo /en/. Mientras no existan páginas en src/pages/en/, esta config es
  // inerte: no genera ni cambia ninguna ruta.
  //
  // El `fallback: { en: 'es' }` del handoff se deja para MÁS ADELANTE (P4-5,
  // las páginas espejo): habilitarlo ahora, sin ninguna página EN, hace que
  // Astro genere 39 stubs de redirect /en/* → / que se indexarían sin aportar
  // nada. El fallback solo tiene sentido cuando ya hay páginas EN de las que caer.
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
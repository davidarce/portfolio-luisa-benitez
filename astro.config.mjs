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
      // Excluye las rutas viejas del rename de Fase 2 (§4), la colección
      // "work" retirada en Fase 2 (§3, ver .sdd/phase2-projects/plan.md
      // T003-T004) y /about/, que la home unificada (T004, ver
      // .sdd/home-unificada/plan.md) convirtió en redirección a /#sobre-mi:
      // página de redirección estática (meta-refresh + canonical, ver
      // src/components/RedirectPage.astro), no contenido indexable.
      // /contact/ vuelve a ser página propia (plan-v2.md T004) y ya no está
      // excluida: vuelve a indexarse.
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
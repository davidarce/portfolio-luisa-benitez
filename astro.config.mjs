// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://luisabenitez.es',
  base: '/',
  integrations: [sitemap()],
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
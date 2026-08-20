// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.ddcdevelopments.com',
  trailingSlash: 'ignore',

  // HTML-first: everything is prerendered at build time.
  output: 'static',

  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: {
      // `/` is English, `/es/...` is Spanish.
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en-US', es: 'es-ES' },
      },
    }),
    // `compat` aliases react/react-dom to preact/compat, so react-photo-view —
    // the viewer the React app used — runs on ~10 kB of runtime instead of ~45.
    // It powers a single island on the project detail pages; nothing else on
    // the site hydrates.
    preact({ compat: true }),
  ],

  image: {
    // Gallery photos are 1600px originals; two widths cover card + lightbox.
    responsiveStyles: false,
  },

  build: {
    inlineStylesheets: 'auto',
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
    },
  },
});
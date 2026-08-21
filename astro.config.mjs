// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

/**
 * One URL spelling for every page: no trailing slash, except the root, which
 * conventionally keeps its own. This has to agree with what `localizePath`
 * feeds the canonical link, or each page is submitted under a URL that
 * disagrees with its own `rel=canonical`.
 */
const canonicalUrl = (/** @type {string} */ url) => {
  const parsed = new URL(url);
  parsed.pathname = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
  return parsed.href;
};

// https://astro.build/config
export default defineConfig({
  // `www` 301-redirects to the bare host, so that is the canonical origin —
  // pointing canonicals, hreflang and the sitemap at `www` would aim every
  // one of them at a redirect.
  site: 'https://ddcdevelopments.com',
  trailingSlash: 'never',

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
        // Language-only, matching the `hreflang` in the document head. Mixing
        // `en` there with `en-US` here would leave Google reconciling two
        // different annotations for the same pair of pages.
        locales: { en: 'en', es: 'es' },
      },
      filter: (page) => !page.includes('/404'),
      // The integration emits directory-style URLs; the canonical link does
      // not. One form has to win or every page is submitted under a URL that
      // disagrees with its own canonical.
      serialize: (item) => {
        const links = item.links?.map((link) => ({ ...link, url: canonicalUrl(link.url) }));
        const english = links?.find((link) => link.lang === 'en');
        return {
          ...item,
          url: canonicalUrl(item.url),
          // The integration stops at the two languages; `x-default` is what
          // tells Google which one to serve a visitor it cannot place.
          links: links && english ? [...links, { lang: 'x-default', url: english.url }] : links,
        };
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
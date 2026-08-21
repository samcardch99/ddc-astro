# DDC Developments — Astro

HTML-first rebuild of [ddcdevelopments.com](https://www.ddcdevelopments.com), ported
from the React + Vite single-page app in `ddc-redesign`.

The design and the motion are meant to be indistinguishable from the original.
What changed is how the page gets to the browser: every route is prerendered as
real HTML at build time, and JavaScript is only used to *enhance* what is
already on screen.

## Why it is faster

| | React + Vite | Astro |
|---|---|---|
| First paint | after `react-dom` hydrates the whole tree | server-rendered HTML |
| Routes | 1 HTML shell, client-side router | 65 prerendered pages |
| JS shipped on the home page | react, react-dom, framer-motion, three.js, swiper, i18next, react-hook-form, zod, react-select, sonner, lottie, gsap, lenis, countup | gsap + lenis + a few KB of site code (swiper and countup load on demand) |
| Components that hydrate | the whole tree | one — the photo viewer, on project detail pages |
| Spanish | swapped in by i18next after hydration | prerendered under `/es/` with `hreflang` |
| Images | full-size JPEG straight from `public/` | WebP, responsive `srcset`, generated at build |
| Ambient background | Three.js scene per section | CSS gradients and keyframes |
| Hero backdrop | a 5508×3088 WebP, 2.3 MB | re-encoded to 3600px / 868 KB and preloaded per breakpoint |
| Content without JS | empty `<div id="root">` | the entire page |

Measured over the local production build, third-party tags blocked:

| Page | Transferred | of which JS |
|---|---|---|
| `/` (desktop) | 1.9 MB | 307 KB |
| `/` (mobile) | 1.3 MB | 307 KB |
| `/team` | 398 KB | 160 KB |
| `/projects` | 765 KB | 160 KB |
| `/projects/<villa>` | 664 KB | 201 KB |
| `/technologies` | 654 KB | 160 KB |
| `/investments` | 533 KB | 160 KB |

JS figures are uncompressed; over the wire the shared bundle is ~59 KB gzipped,
Swiper's two chunks (~43 KB gzipped) only load on pages with a carousel, and the
photo viewer island (~21 KB gzipped) only on project detail pages.

## Getting started

```sh
npm install
cp .env.example .env   # fill in the EmailJS keys
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve `dist/` (backgrounds itself; `astro preview stop` to end it) |
| `npm run preview:ci` | serve `dist/` in the foreground — used by Playwright and CI |
| `npm run check` | `astro check` — types across `.astro`, `.ts` and config |
| `npm run test:unit` | Vitest — i18n, form rules, project filtering |
| `npm run test:e2e` | Playwright — desktop + mobile, against a real build |
| `npm test` | both suites |

## How it is put together

```
src/
  pages/            one thin file per route; `es/` mirrors the English tree
  views/            the actual page composition, parameterised by `lang`
  layouts/          <head>, analytics, fonts, hreflang, shared chrome
  components/       sections, rendered entirely on the server
    interior/       the /technologies, /projects and /investments pages
  scripts/          progressive enhancement, one module per behaviour
  lib/              framework-free logic (validation, filters, image registry)
  i18n/             en.json / es.json + the lookup helpers
  data/             villas, team, accordion, testimonials (verbatim from the original)
  assets/           everything that goes through `astro:assets`
public/             files served as-is: SVG logos, the culture video, backgrounds
```

### Internationalisation

English lives at `/`, Spanish at `/es/`. Both are generated at build time from
`src/i18n/*.json` — the same dictionaries the React app fed to i18next, so the
copy is unchanged. `useTranslations(lang)` falls back to English for keys the
Spanish file is missing, then to the key itself so a gap is visible rather than
blank. The `EN | ES` control in the header is a plain link to the same page in
the other language, and every page declares `hreflang` for both.

### Animation

The GSAP work (hero parallax, the sliding "Build" outline, the SplitText
heading reveals, the header's colour states and auto-hide) is a direct
transcription of the React code — same durations, staggers, eases and
ScrollTrigger start values. framer-motion was replaced with CSS animations and
the Web Animations API using framer's own easing curves, and Swiper is
configured with the original's exact parameters.

Three toolchain differences needed explicit handling, each covered by a test in
`tests/e2e/animations.spec.ts`:

- **GSAP 3.15 `SplitText`** reverts a previous split when a second instance
  targets the same element, so the two-instance trick the React code used no
  longer produces the clipping wrapper. The supported `mask` option does, and
  its `overflow: clip` is forced back to `hidden` — `clip` does not make the box
  a scroll container, which would move the inline-block back onto its text
  baseline and shrink the heading by ~12px.
- **Tailwind v4** writes `scale-*` and `-translate-*` to the `scale` and
  `translate` properties instead of `transform`, so anything overriding them has
  to use the same property. `scripts/modules/techCards.ts` clears `scale` before
  handing the card reveal to GSAP. v4 also gives `<button>` `cursor: default`
  where v3 gave it `pointer`, which quietly changed the cursor on every button
  and gallery thumbnail; `global.css` restores it.
- **Tailwind v4 breakpoint ordering** places `px` breakpoints in a separate
  group from the `rem` defaults, which made `xl:` beat `2xl-prev:` at 1440px and
  shrank the root font size. The whole scale is redeclared in `rem`, in
  ascending order, in `src/styles/global.css`.

`prefers-reduced-motion: reduce` stands every scripted animation down; the
original had no such handling.

### Progressive enhancement

Everything readable is in the HTML. The accordions are `<details>`, the
carousels are static slide lists that Swiper picks up, the investor form uses
`<dialog>`, the country picker is a prerendered `<select>`, and the counters
render their final value before countup.js animates them.
`tests/e2e/html-first.spec.ts` runs a slice of the suite with JavaScript
disabled to keep it that way.

### The photo viewer

Project galleries open in `react-photo-view` — the same library the React app
used, for the same pinch zoom, drag-to-pan, rotate, swipe-to-close and the
opening animation that grows out of the thumbnail you clicked.

It is the only component on the site that hydrates, and it runs on
`preact/compat` rather than React: ~21 KB gzipped instead of ~62 KB, on the 52
project detail pages only. `PhotoSlider` is mounted `client:only` because it
renders into a portal and has no server output of its own — the gallery above
it stays server-rendered, and a three-line vanilla listener dispatches the
clicked photo's index at the island. The photos are in the HTML whether or not
the viewer ever loads.

## Metadata and SEO

Every page's head is assembled in `BaseLayout`, from `src/lib/seo.ts` (titles,
descriptions, breadcrumb labels) and `src/lib/schema.ts` (structured data).

**One spelling per URL.** `www.ddcdevelopments.com` 301-redirects to the bare
host, so `site` is the bare host — otherwise every canonical, every `hreflang`
and every sitemap entry would point at a redirect. `trailingSlash: 'never'`,
and the sitemap's `serialize` hook normalises its output to match, so a page is
never submitted under a URL that disagrees with its own `rel=canonical`.

**Two languages, reciprocally linked.** Each page declares `hreflang` for `en`,
`es` and `x-default`, in the head and in the sitemap alike — language-only codes
in both, since `en` in one place and `en-US` in the other leaves Google
reconciling two annotations for the same pair.

**Structured data** ships as one `@graph` per page:

| Node | Where | Why |
| --- | --- | --- |
| `GeneralContractor` | every page | Name, address, phone, geo and `sameAs`. A `LocalBusiness` subtype is what makes the company eligible for local results; a plain `Organization` is not. |
| `WebSite` | every page | Carries the page's language and ties both trees to one publisher. |
| `BreadcrumbList` | interior pages | The home page gets none — a one-item breadcrumb is noise. |
| `RealEstateListing` | project pages | Price, beds, baths, floor area, lot size and address, all out of `villas.json`. |
| `ItemList` | `/projects` | Names the twenty-six listings the index links to. |

Everything shares one `@id` per entity, so the company on a villa page is the
same node as the company on the home page.

**Share cards.** A project page uses a 1200×630 crop of the villa's own cover
shot rather than the site-wide card, with `og:image:alt`, dimensions and type.

**Snippets.** `truncate()` cuts a description at the last sentence or word that
fits inside ~155 characters, and drops a trailing article or preposition so a
snippet never ends on `…preserves the…`.

Three of the twenty-six addresses in `villas.json` are malformed — one reads
`Florida, USA`, one has no city, one uses an em dash where the comma belongs —
so `parseAddress` is forgiving and falls back to the `city` field. Worth fixing
at the source; the markup no longer depends on it.

## Deployment

`npm run build` emits a fully static `dist/`. The GitHub Actions workflow builds
on every push to `main` and publishes `dist/` to the `build` branch, matching
the deployment the React project used.

CI needs four repository secrets for the contact form's EmailJS delivery. Without
them the build still succeeds and the form still posts to the LeadConnector
webhook; only the EmailJS copy is skipped.

```
PUBLIC_EMAILJS_SERVICE_ID
PUBLIC_EMAILJS_TEMPLATE_ID
PUBLIC_EMAILJS_INVESTMENTS_TEMPLATE_ID
PUBLIC_EMAILJS_PUBLIC_KEY
```

## Deliberate differences from the original

A handful of things were changed because the original was demonstrably broken,
not as a redesign:

- `OurCultureMobile` requested `culture.features.0…5`, but the dictionary is
  keyed `1…6`, so the first slide printed the raw key and the last was missing.
  Now `1…6`.
- The desktop `/investments` page had no heading at all; the mobile one's is now
  shared and hidden with `lg:sr-only`, so the page has an `<h1>` without any
  visual change.
- The language toggle compared `t.language` (a function property, always
  `undefined`), so neither language was ever marked active. It now reflects the
  page's locale.
- The og:image pointed at `/assets/logo.jpg`, which does not exist. Replaced
  with a generated 1200×630 card.
- The `Technologies` mobile CTA had its label hardcoded in English.
- The contact form carried a duplicate set of empty hidden inputs that shadowed
  the real fields for EmailJS.
- `Testimonials`' newsletter button linked to `/`; it now jumps to the contact
  form.

Two upstream oddities were kept because they are what the site actually does:
the culture carousel advances on Swiper's default 3s (the computed
video-length delay was never passed), and the project cards show a fixed `2025`
rather than the randomised year in the data.

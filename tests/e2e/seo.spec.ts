import { expect, test } from '@playwright/test';

/**
 * These assert against the shipped HTML rather than the source, because every
 * one of them is something a crawler reads: the canonical URL, the hreflang
 * pair, the share card and the structured data.
 *
 * They run once per file — the metadata does not vary by viewport.
 */

const ORIGIN = 'https://ddcdevelopments.com';

const PAGES = [
  { path: '/', es: '/es' },
  { path: '/team', es: '/es/team' },
  { path: '/technologies', es: '/es/technologies' },
  { path: '/investments', es: '/es/investments' },
  { path: '/projects', es: '/es/projects' },
  { path: '/projects/Villa_Sunset', es: '/es/projects/Villa_Sunset' },
  { path: '/privacy-policy', es: '/es/privacy-policy' },
];

const content = (page: import('@playwright/test').Page, selector: string) =>
  page.locator(selector).first().getAttribute('content');

const jsonLd = async (page: import('@playwright/test').Page) => {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);
  return JSON.parse(blocks[0]);
};

const nodeOfType = (graph: any, type: string) =>
  graph['@graph'].find((node: any) =>
    Array.isArray(node['@type']) ? node['@type'].includes(type) : node['@type'] === type,
  );

test.describe('canonical URLs', () => {
  for (const { path, es } of PAGES) {
    test(`${path} points at one spelling of itself`, async ({ page }) => {
      await page.goto(path);

      const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
      // The bare host is canonical: `www` 301-redirects to it.
      expect(canonical).toBe(path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`);
      expect(canonical).not.toContain('www.');

      // No trailing slash anywhere but the root, so a URL is never submitted
      // under a spelling that disagrees with its own canonical.
      if (path !== '/') expect(canonical!.endsWith('/')).toBe(false);

      expect(await content(page, 'meta[property="og:url"]')).toBe(canonical);
    });

    test(`${path} declares both languages and a default`, async ({ page }) => {
      await page.goto(path);
      const links = await page.locator('link[rel=alternate]').evaluateAll((nodes) =>
        Object.fromEntries(nodes.map((node) => [node.getAttribute('hreflang'), node.getAttribute('href')])),
      );

      expect(links.en).toBe(path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`);
      expect(links.es).toBe(es === '/es' ? `${ORIGIN}/es` : `${ORIGIN}${es}`);
      // Without x-default, Google has nothing to serve a visitor it cannot place.
      expect(links['x-default']).toBe(links.en);
    });

    test(`${es} points back at ${path}`, async ({ page }) => {
      await page.goto(es);
      const links = await page.locator('link[rel=alternate]').evaluateAll((nodes) =>
        Object.fromEntries(nodes.map((node) => [node.getAttribute('hreflang'), node.getAttribute('href')])),
      );
      // hreflang has to be reciprocal or Google discards the whole cluster.
      expect(links.en).toBe(path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`);
      expect(await page.locator('html').getAttribute('lang')).toBe('es');
      expect(await content(page, 'meta[property="og:locale"]')).toBe('es_ES');
    });
  }
});

test.describe('titles and descriptions', () => {
  test('every page has a distinct, well-sized pair', async ({ page }) => {
    test.slow();
    const seen = new Map<string, string[]>();

    for (const { path, es } of PAGES) {
      for (const route of [path, es]) {
        await page.goto(route);
        const title = await page.title();
        const description = (await content(page, 'meta[name=description]'))!;

        expect(title.length, `title ${route}`).toBeGreaterThan(10);
        expect(title.length, `title ${route}`).toBeLessThanOrEqual(62);
        expect(description.length, `description ${route}`).toBeGreaterThan(30);

        // A description cut mid-word means the source copy was sliced blind.
        expect(description, `description ${route}`).not.toMatch(/\s\S{1,3}…$/);

        const key = `${title}|${description}`;
        seen.set(key, [...(seen.get(key) ?? []), route]);
      }
    }

    const duplicated = [...seen.entries()].filter(([, routes]) => routes.length > 1);
    expect(duplicated.map(([, routes]) => routes)).toEqual([]);
  });

  test('the share card names an image, its size and its alt text', async ({ page }) => {
    await page.goto('/');
    expect(await content(page, 'meta[property="og:image"]')).toBe(`${ORIGIN}/assets/og-image.jpg`);
    expect(await content(page, 'meta[property="og:image:width"]')).toBe('1200');
    expect(await content(page, 'meta[property="og:image:height"]')).toBe('630');
    expect(await content(page, 'meta[property="og:image:alt"]')).toBeTruthy();
    expect(await content(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(await content(page, 'meta[property="og:locale:alternate"]')).toBe('es_ES');
  });

  test('sharing a villa shows the villa, not the company logo', async ({ page }) => {
    await page.goto('/projects/Villa_Sunset');
    const image = (await content(page, 'meta[property="og:image"]'))!;
    expect(image).not.toContain('og-image.jpg');
    expect(image).toContain(ORIGIN);
    expect(await content(page, 'meta[property="og:type"]')).toBe('article');
    expect(await content(page, 'meta[property="og:image:alt"]')).toContain('Villa Sunset');

    const response = await page.request.get(new URL(image).pathname);
    expect(response.status()).toBe(200);
  });
});

test.describe('robots directives', () => {
  test('real pages invite full-size image previews', async ({ page }) => {
    await page.goto('/projects/Villa_Sunset');
    const robots = (await content(page, 'meta[name=robots]'))!;
    expect(robots).toContain('index');
    // Without this a property photo is a thumbnail in the results.
    expect(robots).toContain('max-image-preview:large');
  });

  test('the 404 stays out of the index', async ({ page }) => {
    await page.goto('/404');
    expect(await content(page, 'meta[name=robots]')).toContain('noindex');
  });

  test('robots.txt points at the sitemap on the canonical host', async ({ page }) => {
    const body = await (await page.request.get('/robots.txt')).text();
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap-index.xml`);
    expect(body).not.toContain('www.');
  });
});

test.describe('the sitemap agrees with the pages it lists', () => {
  test('every URL matches its own canonical, and the 404 is absent', async ({ page }) => {
    const xml = await (await page.request.get('/sitemap-0.xml')).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    expect(urls.length).toBeGreaterThan(60);
    expect(urls.filter((url) => url.includes('404'))).toEqual([]);
    expect(urls.filter((url) => url.includes('www.'))).toEqual([]);
    // The homepage's empty path and `/` are the same URL; nothing else may
    // carry a trailing slash, since no canonical does.
    expect(urls.filter((url) => url.endsWith('/') && new URL(url).pathname !== '/')).toEqual([]);
    expect(xml).toContain('x-default');

    for (const path of ['/team', '/projects/Villa_Sunset', '/es/investments']) {
      expect(urls, path).toContain(`${ORIGIN}${path}`);
      await page.goto(path);
      expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(`${ORIGIN}${path}`);
    }
  });
});

test.describe('structured data', () => {
  test('every page identifies the business the same way', async ({ page }) => {
    test.slow();
    for (const { path } of PAGES) {
      await page.goto(path);
      const graph = await jsonLd(page);
      expect(graph['@context']).toBe('https://schema.org');

      const org = nodeOfType(graph, 'GeneralContractor');
      expect(org, path).toBeTruthy();
      // A LocalBusiness needs a name, an address and a phone to be usable.
      expect(org.name).toBe('DDC Developments');
      expect(org.telephone).toBeTruthy();
      expect(org.address.addressLocality).toBe('Doral');
      expect(org.address.addressRegion).toBe('FL');
      expect(org.geo.latitude).toBeCloseTo(25.8, 1);
      expect(org.sameAs.length).toBeGreaterThan(1);
      // One `@id` for the company across every page and both languages.
      expect(org['@id']).toBe(`${ORIGIN}/#organization`);
    }
  });

  test('the site node carries the language of the page it is on', async ({ page }) => {
    await page.goto('/technologies');
    expect(nodeOfType(await jsonLd(page), 'WebSite').inLanguage).toBe('en');
    await page.goto('/es/technologies');
    expect(nodeOfType(await jsonLd(page), 'WebSite').inLanguage).toBe('es');
  });

  test('interior pages carry a breadcrumb and the home page does not', async ({ page }) => {
    await page.goto('/');
    expect(nodeOfType(await jsonLd(page), 'BreadcrumbList')).toBeFalsy();

    await page.goto('/es/projects/Villa_Sunset');
    const trail = nodeOfType(await jsonLd(page), 'BreadcrumbList');
    expect(trail.itemListElement.map((item: any) => item.name)).toEqual([
      'Inicio',
      'Proyectos',
      'Villa Sunset',
    ]);
    expect(trail.itemListElement[1].item).toBe(`${ORIGIN}/es/projects`);
    // The page you are already on is not a link.
    expect(trail.itemListElement[2].item).toBeUndefined();
  });

  test('a project is marked up as the listing it is', async ({ page }) => {
    await page.goto('/projects/Villa_Sunset');
    const listing = nodeOfType(await jsonLd(page), 'RealEstateListing');

    expect(listing.name).toBe('Villa Sunset');
    expect(listing.url).toBe(`${ORIGIN}/projects/Villa_Sunset`);
    expect(listing.image.length).toBeGreaterThanOrEqual(1);
    expect(listing.offers.price).toBe(3_600_000);
    expect(listing.offers.priceCurrency).toBe('USD');

    const residence = listing.about;
    expect(residence.numberOfBedrooms).toBe(5);
    expect(residence.numberOfBathroomsTotal).toBe(4);
    expect(residence.address.addressLocality).toBe('Miami');
    expect(residence.address.postalCode).toBe('33143');
    expect(residence.floorSize.unitCode).toBe('FTK');
  });

  test('the project index names the collection it links to', async ({ page }) => {
    await page.goto('/projects');
    const list = nodeOfType(await jsonLd(page), 'ItemList');
    expect(list.numberOfItems).toBeGreaterThan(20);
    expect(list.itemListElement[0].url).toContain(`${ORIGIN}/projects/`);
  });

  test('no node serialises a null', async ({ page }) => {
    test.slow();
    for (const { path, es } of PAGES) {
      for (const route of [path, es]) {
        await page.goto(route);
        const raw = await page.locator('script[type="application/ld+json"]').textContent();
        expect(raw, route).not.toContain('null');
        expect(() => JSON.parse(raw!), route).not.toThrow();
      }
    }
  });
});

test.describe('headings and image text', () => {
  test('the hero heading reads as three words, not one', async ({ page }) => {
    await page.goto('/');
    // `display: contents` on the h1 meant the spans ran together as
    // `FasterStrongerSmarter` in the text a crawler extracts.
    expect((await page.locator('h1').first().textContent())?.trim()).toBe('Faster Stronger Smarter');
  });

  test('every page has a heading with text in it', async ({ page }) => {
    for (const { path } of PAGES) {
      await page.goto(path);
      const headings = await page.locator('h1').allTextContents();
      expect(headings.length, path).toBeGreaterThan(0);
      expect(headings.some((text) => text.trim().length > 1), path).toBe(true);
    }
  });

  test('the technology photography carries alt text in the page language', async ({ page }) => {
    await page.goto('/technologies');
    const alts = await page.locator('.tech-card img').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('alt')),
    );
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.every((alt) => alt && alt.length > 10)).toBe(true);
    expect(alts[0]).toContain('DDC');

    await page.goto('/es/technologies');
    const spanish = await page.locator('.tech-card img').first().getAttribute('alt');
    expect(spanish).toContain('paneles');
  });

  test('no content image is left without alt text', async ({ page }) => {
    test.slow();
    for (const { path } of PAGES) {
      await page.goto(path);
      const missing = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
          .filter((img) => img.getAttribute('alt') === null)
          .map((img) => img.getAttribute('src')),
      );
      // `alt=""` is a decision; a missing attribute is an oversight.
      expect(missing, path).toEqual([]);
    }
  });
});

test.describe('internal links resolve', () => {
  test('no page links somewhere the build does not emit', async ({ page }) => {
    test.slow();
    const checked = new Map<string, number>();
    const broken: string[] = [];

    for (const { path, es } of [...PAGES, { path: '/404', es: '/es/404' }]) {
      for (const route of [path, es]) {
        await page.goto(route);
        const hrefs = await page.locator('a[href]').evaluateAll((nodes) =>
          nodes
            .map((node) => node.getAttribute('href')!)
            .filter((href) => href.startsWith('/') && !href.startsWith('//')),
        );

        for (const href of new Set(hrefs)) {
          const target = href.split('#')[0] || '/';
          if (!checked.has(target)) {
            checked.set(target, (await page.request.get(target)).status());
          }
          // The 404 page's own language toggle used to point at `/es/404`,
          // which the build did not emit.
          if (checked.get(target)! >= 400) broken.push(`${href} (from ${route})`);
        }
      }
    }

    expect(broken).toEqual([]);
    expect(checked.size).toBeGreaterThan(5);
  });

  test('the Spanish 404 exists and speaks Spanish', async ({ page }) => {
    await page.goto('/es/404');
    expect(await page.locator('html').getAttribute('lang')).toBe('es');
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
    expect(await content(page, 'meta[name=robots]')).toContain('noindex');
  });
});

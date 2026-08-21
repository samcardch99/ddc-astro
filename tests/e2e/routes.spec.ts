import { expect, test, type Page } from '@playwright/test';

// `www` 301-redirects to the bare host, so that is the origin every canonical,
// hreflang and sitemap entry has to use.
const ORIGIN = 'https://ddcdevelopments.com';

const routes = [
  { path: '/', title: 'DDC Developments: Modular construction company in Miami', lang: 'en' },
  { path: '/team', title: 'Team | DDC Developments', lang: 'en' },
  { path: '/technologies', title: 'Technologies | DDC Developments', lang: 'en' },
  { path: '/investments', title: 'Investments | DDC Developments', lang: 'en' },
  { path: '/projects', title: 'DDC Developments | Projects', lang: 'en' },
  { path: '/projects/Villa_Sunset', title: 'Villa Sunset — Miami, FL | DDC Developments', lang: 'en' },
  { path: '/privacy-policy', title: 'Privacy Policy | DDC Developments', lang: 'en' },
  { path: '/es', title: 'DDC Developments: Constructora modular en Miami', lang: 'es' },
  { path: '/es/team', title: 'Equipo | DDC Developments', lang: 'es' },
  { path: '/es/technologies', title: 'Tecnologías | DDC Developments', lang: 'es' },
  { path: '/es/investments', title: 'Inversiones | DDC Developments', lang: 'es' },
  { path: '/es/projects', title: 'DDC Developments | Proyectos', lang: 'es' },
  { path: '/es/projects/Villa_Sunset', title: 'Villa Sunset — Miami, FL | DDC Developments', lang: 'es' },
  { path: '/es/privacy-policy', title: 'Política de Privacidad | DDC Developments', lang: 'es' },
];

/**
 * Only our own errors should fail a page. Google Tag Manager, Google Maps and
 * the LeadConnector booking widget are loaded by the page but owned by third
 * parties, and "Failed to load resource" messages carry the offending host in
 * `location().url` rather than in their text.
 */
const THIRD_PARTY = /googletagmanager|google(apis|tagservices)?\.com|gstatic|doubleclick|leadconnectorhq|msgsndr|wa\.me|emailjs/i;

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const source = message.location()?.url ?? '';
    if (THIRD_PARTY.test(text) || THIRD_PARTY.test(source)) return;
    if (/ERR_BLOCKED|ERR_NAME_NOT_RESOLVED|net::/i.test(text)) return;
    errors.push(`${text} (${source})`);
  });

  return errors;
}

for (const route of routes) {
  test(`${route.path} renders`, async ({ page }) => {
    const errors = collectPageErrors(page);

    const response = await page.goto(route.path);
    expect(response?.status(), `${route.path} should be served`).toBeLessThan(400);

    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('html')).toHaveAttribute('lang', route.lang);

    // A meaningful description and a single canonical are required for SEO.
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThan(50);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    await page.waitForLoadState('load');
    expect(errors, `console errors on ${route.path}`).toEqual([]);
  });
}

test('every page links to its translated twin with hreflang', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route.path);
    const alternates = await page.locator('link[rel="alternate"]').evaluateAll((links) =>
      links.map((link) => ({
        hreflang: link.getAttribute('hreflang'),
        href: link.getAttribute('href'),
      })),
    );
    const hreflangs = alternates.map((a) => a.hreflang).sort();
    expect(hreflangs, route.path).toEqual(['en', 'es', 'x-default']);
    for (const alternate of alternates) {
      expect(alternate.href, route.path).toMatch(new RegExp(`^${ORIGIN}`));
    }
  }
});

test('sitemap and robots are published', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap:');

  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.ok()).toBe(true);

  const pages = await request.get('/sitemap-0.xml');
  const xml = await pages.text();
  for (const path of ['/team', '/technologies', '/investments', '/projects', '/es/team']) {
    expect(xml, `sitemap should list ${path}`).toContain(`<loc>${ORIGIN}${path}</loc>`);
  }
});

test('unknown paths render the 404 page', async ({ page }) => {
  await page.goto('/404');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('404');
});

import { expect, test } from '@playwright/test';

/**
 * Tablet-sized viewports fall between the design's phone and desktop layouts,
 * where two things used to go wrong: the project grids collapsed to a single
 * enormous column, and the technology card reveal ran on scroll *and* on hover
 * at the same time.
 *
 * These run once per file rather than per project, since they pin the viewport
 * themselves.
 */

const IPADS = [
  { name: 'iPad mini portrait', width: 744, height: 1133, columns: 2 },
  { name: 'iPad Air portrait', width: 820, height: 1180, columns: 2 },
  { name: 'iPad Pro 11" portrait', width: 834, height: 1194, columns: 2 },
  { name: 'iPad Pro 13" portrait', width: 1024, height: 1366, columns: 3 },
  { name: 'iPad Air landscape', width: 1180, height: 820, columns: 3 },
];

test.describe('project grids on tablets', () => {
  for (const device of IPADS) {
    for (const [label, path, gridSelector] of [
      ['project index', '/projects', '[data-projects-list]'],
      ['project detail', '/projects/Villa_Sunset', '.project-grid'],
    ] as const) {
      test(`${label} uses ${device.columns} columns on ${device.name}`, async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto(path);

        const columns = await page
          .locator(gridSelector)
          .first()
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        expect(columns).toBe(device.columns);
      });
    }
  }

  test('a gallery photo fills its card instead of floating in it', async ({ page }) => {
    await page.setViewportSize({ width: 744, height: 1133 });
    await page.goto('/projects/Villa_Sunset');

    const card = page.locator('.project-grid article').first();
    const image = card.locator('img').first();
    await expect(image).toBeVisible();

    const cardBox = (await card.boundingBox())!;
    const imageBox = (await image.boundingBox())!;

    // A single-column grid left a 680px card wrapped around a 300px letterbox.
    expect(cardBox.width).toBeLessThan(420);
    expect(imageBox.width / cardBox.width).toBeGreaterThan(0.8);
  });

  test('no page scrolls sideways at any tablet width', async ({ page }) => {
    for (const device of IPADS) {
      await page.setViewportSize({ width: device.width, height: device.height });
      for (const path of ['/projects', '/projects/Villa_Sunset', '/investments']) {
        await page.goto(path);
        const overflows = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        expect(overflows, `${path} at ${device.name}`).toBe(false);
      }
    }
  });
});

test.describe('technology card reveal on a touch tablet', () => {
  test.use({ viewport: { width: 744, height: 1133 }, hasTouch: true, isMobile: false });

  test('scroll drives the reveal when there is no pointer', async ({ page }) => {
    await page.goto('/technologies');
    await expect(page.evaluate(() => matchMedia('(hover: none)').matches)).resolves.toBe(true);

    const card = page.locator('.tech-card').nth(1);
    const number = card.locator('.tech-card-number');
    const image = card.locator('.tech-card-img');

    await page.evaluate(() => {
      const el = document.querySelectorAll('.tech-card')[1];
      const box = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + box.top - (window.innerHeight - box.height) / 2 });
    });

    await expect
      .poll(async () => Number(await number.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 6000 })
      .toBeGreaterThan(0.9);
    await expect
      .poll(async () => Number(await image.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 6000 })
      .toBeLessThan(0.1);
  });
});

test.describe('technology card reveal on a tablet with a pointer', () => {
  test.use({ viewport: { width: 744, height: 1133 }, hasTouch: false });

  test('scroll leaves the cards alone', async ({ page }) => {
    await page.goto('/technologies');
    await expect(page.evaluate(() => matchMedia('(hover: hover)').matches)).resolves.toBe(true);

    const number = page.locator('.tech-card').nth(1).locator('.tech-card-number');

    await page.evaluate(() => {
      const el = document.querySelectorAll('.tech-card')[1];
      const box = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + box.top - (window.innerHeight - box.height) / 2 });
    });
    await page.waitForTimeout(1500);

    // The React version ran both triggers below 1024px, so the cards flipped
    // as you scrolled and hovering did nothing.
    await expect(number).toHaveCSS('opacity', '0');
  });

  test('hover drives the reveal instead', async ({ page }) => {
    await page.goto('/technologies');
    const card = page.locator('.tech-card').nth(1);
    const number = card.locator('.tech-card-number');

    await card.scrollIntoViewIfNeeded();
    await card.hover();

    await expect
      .poll(async () => Number(await number.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 6000 })
      .toBeGreaterThan(0.9);
  });
});

test.describe('language switch', () => {
  test('the active language is emphasised in colour, not just weight', async ({ page }) => {
    await page.goto('/');

    const english = page.locator('#header a[hreflang="en"]').last();
    const spanish = page.locator('#header a[hreflang="es"]').last();

    await expect(english).toHaveCSS('opacity', '1');
    await expect(english).toHaveCSS('font-weight', '700');
    await expect(english).toHaveAttribute('aria-current', 'true');

    await expect(spanish).toHaveCSS('opacity', '0.5');
    await expect(spanish).not.toHaveAttribute('aria-current', 'true');
  });

  test('the emphasis follows the page locale', async ({ page }) => {
    await page.goto('/es');

    await expect(page.locator('#header a[hreflang="es"]').last()).toHaveCSS('opacity', '1');
    await expect(page.locator('#header a[hreflang="en"]').last()).toHaveCSS('opacity', '0.5');
  });

  test('both variants of the switch agree', async ({ page }) => {
    await page.goto('/es');
    const opacities = await page
      .locator('#header a[hreflang="es"]')
      .evaluateAll((links) => links.map((l) => getComputedStyle(l).opacity));
    expect(new Set(opacities).size).toBe(1);
  });
});

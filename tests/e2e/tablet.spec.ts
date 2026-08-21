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

test.describe('the page ends where the footer ends', () => {
  for (const device of IPADS) {
    test(`no dead scroll under the footer on ${device.name}`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const trailing = await page.evaluate(() => {
        const footer = document.querySelector('#contact')!;
        const bottom = footer.getBoundingClientRect().bottom + window.scrollY;
        return Math.round(document.documentElement.scrollHeight - bottom);
      });

      // The ambient layer used to be pinned to 100svh, so on any section
      // shorter than the viewport it hung below and extended the document —
      // 317px under the footer on an iPad Air, 598px on an iPad Pro.
      expect(trailing).toBeLessThanOrEqual(1);
    });
  }

  test('the ambient background never outgrows its section', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const overflows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.ddc-blobs'))
        .map((layer) => {
          const parent = layer.parentElement!;
          return Math.round(
            layer.getBoundingClientRect().bottom - parent.getBoundingClientRect().bottom,
          );
        })
        .filter((delta) => delta > 1),
    );
    expect(overflows).toEqual([]);
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
  const toggle = (page: import('@playwright/test').Page) =>
    page.locator('[data-language-toggle]:visible').first();

  test('it is a single control that flips the language', async ({ page }) => {
    await page.goto('/');

    // One control, like the React button — clicking anywhere on it switches.
    const control = toggle(page);
    await expect(control).toHaveAttribute('href', '/es');
    await expect(control).toHaveAttribute('hreflang', 'es');
    await expect(control).toHaveAttribute('aria-label', 'Cambiar a español');

    await control.click();
    await expect(page).toHaveURL(/\/es$/);

    const back = toggle(page);
    await expect(back).toHaveAttribute('href', '/');
    await expect(back).toHaveAttribute('aria-label', 'Switch to English');
    await back.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('clicking the label of the current language still switches', async ({ page }) => {
    await page.goto('/');
    // The point of a toggle: any part of it flips.
    await toggle(page).locator('[data-language="en"]').click();
    await expect(page).toHaveURL(/\/es$/);
  });

  test('the active language is emphasised in colour, not just weight', async ({ page }) => {
    await page.goto('/');
    const control = toggle(page);

    await expect(control.locator('[data-language="en"]')).toHaveCSS('opacity', '1');
    await expect(control.locator('[data-language="en"]')).toHaveCSS('font-weight', '700');
    await expect(control.locator('[data-language="es"]')).toHaveCSS('opacity', '0.5');
  });

  test('the emphasis follows the page locale', async ({ page }) => {
    await page.goto('/es');
    const control = toggle(page);
    await expect(control.locator('[data-language="es"]')).toHaveCSS('opacity', '1');
    await expect(control.locator('[data-language="en"]')).toHaveCSS('opacity', '0.5');
  });

  test('it keeps you on the same page across the site', async ({ page }) => {
    for (const [from, to] of [
      ['/team', '/es/team'],
      ['/technologies', '/es/technologies'],
      ['/projects', '/es/projects'],
      ['/projects/Villa_Sunset', '/es/projects/Villa_Sunset'],
      ['/investments', '/es/investments'],
    ]) {
      await page.goto(from);
      await toggle(page).click();
      await expect(page).toHaveURL(new RegExp(`${to.replace(/\//g, '\\/')}$`));
    }
  });

  test('the toggle works at tablet and phone widths too', async ({ page }) => {
    for (const width of [390, 744, 820, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await toggle(page).click();
      await expect(page, `width ${width}`).toHaveURL(/\/es$/);
    }
  });
});

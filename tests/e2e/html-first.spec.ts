import { expect, test } from '@playwright/test';

/**
 * The point of the rewrite: the content is in the HTML, not assembled by a
 * client-side framework. These run with JavaScript switched off.
 */
test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the home page still carries its copy', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Faster');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Stronger');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Smarter');

    await expect(page.locator('#about')).toContainText('The future is not waited, it is built');
    await expect(page.locator('#technologies')).toContainText('The evidence is in the numbers');
    await expect(page.locator('#investments')).toContainText('Why invest with DDC Developments?');
    await expect(page.locator('#our-process')).toContainText('Our Process');
    await expect(page.locator('#testimonials')).toContainText('Testimonials');
    await expect(page.locator('#contact')).toContainText('Get in Touch');
  });

  test('counters show their final value', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#technologies')).toContainText('200+');
    await expect(page.locator('#technologies')).toContainText('~30%');
  });

  test('the process accordion opens natively', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('[data-process-accordion] details').first();
    await expect(first).not.toHaveAttribute('open', '');
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await expect(first).toContainText('We validate demand');
  });

  test('the project list is fully rendered and navigable', async ({ page }) => {
    await page.goto('/projects');
    const cards = page.locator('[data-project-card]');
    await expect(cards).toHaveCount(26);
    await expect(cards.first()).toHaveAttribute('href', '/projects/Villa_Sunset');
  });

  test('a project gallery renders every photo as a real <img>', async ({ page }) => {
    await page.goto('/projects/Villa_Perez');
    const images = page.locator('[data-gallery="renders"] img');
    await expect(images).toHaveCount(20);
    await expect(images.first()).toHaveAttribute('srcset', /\.webp/);

    // The viewer is an island; the photos must not depend on it.
    await expect(page.locator('.PhotoView-Portal')).toHaveCount(0);
  });

  test('the team roster is readable', async ({ page }) => {
    await page.goto('/team');
    await expect(page.locator('body')).toContainText('Danilo Dominguez');
    await expect(page.locator('body')).toContainText('CEO and Founder');
  });

  test('the contact form still validates through the browser', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#contact_form input[name="username"]')).toHaveAttribute('required', '');
    await expect(page.locator('#contact_form input[name="email"]')).toHaveAttribute('type', 'email');
  });

  test('the investment country picker is prerendered', async ({ page }) => {
    await page.goto('/investments');
    const options = page.locator('#inv-country option');
    expect(await options.count()).toBeGreaterThan(200);
    await expect(page.locator('#inv-country')).toContainText('Spain');
  });

  test('Spanish pages carry Spanish copy', async ({ page }) => {
    await page.goto('/es');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Rápido');
    await expect(page.locator('#about')).toContainText('El futuro no se espera, se construye');
  });
});

test('the culture video is not downloaded on desktop', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'the culture section only renders below lg');

  const media: string[] = [];
  page.on('response', (response) => {
    if (/\.(mp4|webm)$/.test(response.url())) media.push(response.url());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Both responsive variants ship in the HTML; the 5.9 MB background video
  // belongs to the mobile one and must stay unfetched above lg.
  expect(media).toEqual([]);
});

test('the page ships far less JavaScript than the React build', async ({ page }) => {
  const scripts: number[] = [];
  page.on('response', async (response) => {
    if (!response.url().includes('/_astro/') || !response.url().endsWith('.js')) return;
    try {
      scripts.push((await response.body()).length);
    } catch {
      /* ignore */
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const total = scripts.reduce((sum, size) => sum + size, 0);
  // The React bundle was well over 1 MB uncompressed before Three.js was even
  // counted; this guards against a framework creeping back in.
  expect(total).toBeLessThan(400_000);
});

test('only the photo viewer hydrates, and only where it is used', async ({ page }) => {
  const islandsOn = async (path: string) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    return page.locator('astro-island').count();
  };

  expect(await islandsOn('/'), 'the home page ships no components').toBe(0);
  expect(await islandsOn('/team'), 'the team page ships no components').toBe(0);
  expect(await islandsOn('/projects'), 'the project index ships no components').toBe(0);
  expect(await islandsOn('/projects/Villa_Perez'), 'only the viewer').toBe(1);
});

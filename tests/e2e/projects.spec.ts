import { expect, test } from '@playwright/test';

test.describe('project index', () => {
  test('search narrows the grid', async ({ page }) => {
    await page.goto('/projects');
    const cards = page.locator('[data-project-card]:visible');
    await expect(cards).toHaveCount(26);

    await page.locator('[data-projects-search]').fill('ochoa');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Villa Ochoa');

    await page.locator('[data-projects-search]').fill('does-not-exist');
    await expect(cards).toHaveCount(0);
    await expect(page.locator('[data-projects-empty]')).toBeVisible();
  });

  test('the location filter and the All reset work', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('[data-projects-location]').selectOption('Miami');

    const cards = page.locator('[data-project-card]:visible');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(26);

    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute('data-location', 'Miami');
    }

    await page.locator('[data-projects-location]').selectOption('All');
    await expect(page.locator('[data-project-card]:visible')).toHaveCount(26);
  });

  test('the list/grid toggle changes the layout and survives a reload', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('[data-projects-view="list"]').click();
    await expect(page.locator('[data-projects-list]')).toHaveAttribute('data-view', 'list');
    await expect(page.locator('[data-project-card] .project-card-media').first()).toBeHidden();

    // sessionStorage-backed, exactly like the React page.
    await page.reload();
    await expect(page.locator('[data-projects-list]')).toHaveAttribute('data-view', 'list');
  });

  test('a card navigates to its detail page', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('[data-project-card]').first().click();
    await expect(page).toHaveURL(/\/projects\/Villa_Sunset$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Villa Sunset');
  });
});

test.describe('project detail', () => {
  test('shows the address, the spec line and the description', async ({ page }) => {
    await page.goto('/projects/Villa_Sunset');
    await expect(page.locator('#project-details')).toContainText('7765 SW 57th Ter, Miami, FL 33143');
    await expect(page.locator('#project-details')).toContainText('Bedrooms');
    await expect(page.locator('#project-details')).toContainText('Glenvar Heights');
  });

  test('the renders/real toggle switches galleries and is remembered', async ({ page }) => {
    await page.goto('/projects/Villa_JH_II');

    await expect(page.locator('[data-gallery="renders"]')).toBeVisible();
    await expect(page.locator('[data-gallery="reales"]')).toBeHidden();

    await page.locator('[data-photo-mode="reales"]').click();
    await expect(page.locator('[data-gallery="reales"]')).toBeVisible();
    await expect(page.locator('[data-gallery="renders"]')).toBeHidden();

    await page.reload();
    await expect(page.locator('[data-gallery="reales"]')).toBeVisible();
  });

  test('projects without real photos have no toggle', async ({ page }) => {
    await page.goto('/projects/Villa_Perez');
    await expect(page.locator('[data-photo-mode]')).toHaveCount(0);
  });

  test('the photo viewer opens and closes', async ({ page }) => {
    await page.goto('/projects/Villa_Perez');
    await expect(page.locator('.PhotoView-Portal')).toHaveCount(0);

    await page.locator('[data-lightbox-open]').first().click();

    await expect(page.locator('.PhotoView-Slider__Counter')).toHaveText('1 / 20', { timeout: 10_000 });
    // The React app opened the full-size original, not a card derivative.
    await expect(page.locator('.PhotoView__Photo').first()).toHaveAttribute('src', /\.webp$/);

    await page.keyboard.press('Escape');
    await expect(page.locator('.PhotoView-Portal')).toHaveCount(0, { timeout: 10_000 });
  });

  test('the arrows step through and wrap around', async ({ page, isMobile }) => {
    // react-photo-view only renders arrows on pointer devices; touch swipes.
    test.skip(!!isMobile, 'the viewer navigates by swipe on touch devices');

    await page.goto('/projects/Villa_Perez');
    await page.locator('[data-lightbox-open]').first().click();

    const counter = page.locator('.PhotoView-Slider__Counter');
    await expect(counter).toHaveText('1 / 20', { timeout: 10_000 });

    await page.locator('.PhotoView-Slider__ArrowRight').click();
    await expect(counter).toHaveText('2 / 20');

    // Looping is on by default past three photos, so going back twice wraps.
    await page.locator('.PhotoView-Slider__ArrowLeft').click();
    await page.locator('.PhotoView-Slider__ArrowLeft').click();
    await expect(counter).toHaveText('20 / 20');
  });

  test('the viewer opens the photo that was clicked', async ({ page }) => {
    await page.goto('/projects/Villa_Perez');
    await page.locator('[data-lightbox-open]').nth(4).click();
    await expect(page.locator('.PhotoView-Slider__Counter')).toHaveText('5 / 20', { timeout: 10_000 });
  });

  test('the viewer follows the renders/real toggle', async ({ page }) => {
    await page.goto('/projects/Villa_JH_II');
    await page.locator('[data-photo-mode="reales"]').click();
    await expect(page.locator('[data-gallery="reales"]')).toBeVisible();

    await page.locator('[data-gallery="reales"] [data-lightbox-open]').first().click();
    await expect(page.locator('.PhotoView-Slider__Counter')).toHaveText('1 / 44', { timeout: 10_000 });
  });

  test('tapping the photo does not close the viewer', async ({ page }) => {
    await page.goto('/projects/Villa_Perez');
    await page.locator('[data-lightbox-open]').first().click();

    const counter = page.locator('.PhotoView-Slider__Counter');
    await expect(counter).toHaveText('1 / 20', { timeout: 10_000 });

    // `photoClosable` is deliberately off, as in the original: with it on, a
    // tap closes the viewer instead of letting you pan or zoom. Clicking by
    // coordinate rather than by locator, since the neighbouring slides carry
    // the same class and are mid-transition.
    // Let the open animation finish; a click landing mid-zoom is treated as a
    // backdrop click.
    await page.waitForTimeout(900);
    const viewport = page.viewportSize()!;
    await page.mouse.click(viewport.width / 2, viewport.height / 2);
    await page.waitForTimeout(700);
    await expect(counter).toBeVisible();
  });

  test('the keyboard steps through on any device', async ({ page }) => {
    await page.goto('/projects/Villa_Perez');
    await page.locator('[data-lightbox-open]').nth(4).click();

    const counter = page.locator('.PhotoView-Slider__Counter');
    await expect(counter).toHaveText('5 / 20', { timeout: 10_000 });
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText('6 / 20');
  });

  test('the photo can be zoomed', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'zoom is pinch-driven on touch devices');

    await page.goto('/projects/Villa_Perez');
    await page.locator('[data-lightbox-open]').first().click();

    const photo = page.locator('.PhotoView__PhotoBox').first();
    await expect(photo).toBeVisible({ timeout: 10_000 });

    const before = await photo.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, -600);
    await expect
      .poll(async () => photo.evaluate((el) => getComputedStyle(el).transform), { timeout: 5000 })
      .not.toBe(before);
  });
});

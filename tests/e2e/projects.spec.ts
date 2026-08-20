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

  test('the lightbox opens, steps through and closes', async ({ page }) => {
    await page.goto('/projects/Villa_Perez');
    const dialog = page.locator('[data-lightbox]');
    await expect(dialog).toBeHidden();

    await page.locator('[data-lightbox-open]').first().click();
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-lightbox-counter]')).toHaveText('1 / 20');

    await page.locator('[data-lightbox-next]').click();
    await expect(page.locator('[data-lightbox-counter]')).toHaveText('2 / 20');

    await page.locator('[data-lightbox-prev]').click();
    await page.locator('[data-lightbox-prev]').click();
    await expect(page.locator('[data-lightbox-counter]')).toHaveText('20 / 20');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

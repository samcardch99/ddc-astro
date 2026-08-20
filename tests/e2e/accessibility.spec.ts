import { expect, test } from '@playwright/test';

const pages = ['/', '/team', '/technologies', '/investments', '/projects', '/projects/Villa_Sunset'];

for (const path of pages) {
  test(`${path} has exactly one h1 and no empty links`, async ({ page }) => {
    await page.goto(path);

    // Desktop and mobile variants of a section both ship in the HTML, so only
    // the one the viewport actually renders is counted.
    await expect(page.locator('h1:visible')).toHaveCount(1);

    const namelessLinks = await page.locator('a[href]').evaluateAll((links) =>
      links
        .filter((link) => {
          const text = (link.textContent ?? '').trim();
          const label = link.getAttribute('aria-label');
          const hasImage = link.querySelector('img, svg');
          return !text && !label && !hasImage;
        })
        .map((link) => link.getAttribute('href')),
    );
    expect(namelessLinks, `links without an accessible name on ${path}`).toEqual([]);
  });

  test(`${path} gives every content image alt text`, async ({ page }) => {
    await page.goto(path);
    const missing = await page
      .locator('img')
      .evaluateAll((images) => images.filter((img) => img.getAttribute('alt') === null).map((img) => img.getAttribute('src')));
    expect(missing, `images without an alt attribute on ${path}`).toEqual([]);
  });
}

test('the skip-to-content flow: the header menu is keyboard reachable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#open-menu').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-menu')).toBeVisible();
});

test('decorative plus signs are hidden from assistive tech', async ({ page }) => {
  await page.goto('/');
  const exposed = await page
    .locator('#about span')
    .evaluateAll((spans) =>
      spans.filter((s) => s.textContent?.trim() === '+' && s.getAttribute('aria-hidden') !== 'true').length,
    );
  expect(exposed).toBe(0);
});

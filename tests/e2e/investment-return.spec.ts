import { expect, test } from '@playwright/test';

for (const prefix of ['', '/es']) {
  test(`browser Back from ${prefix}/investments returns to the home investment section`, async ({ page }) => {
    await page.goto(`${prefix}/team`);
    await page.goto(prefix || '/');

    // Enter from the hero, away from the intended return position.
    await page.locator(`#home a[href="${prefix}/investments"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/investments$`));
    await expect(page.locator('[data-est-prev]')).toBeDisabled();

    const home = `${prefix || '/'}#investments`;
    const section = page.locator('[data-investments]');
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${home}$`));
    await expect.poll(async () => Math.abs((await section.boundingBox())?.y ?? Infinity)).toBeLessThan(5);

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${prefix}/investments$`));
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${home}$`));
    await expect.poll(async () => Math.abs((await section.boundingBox())?.y ?? Infinity)).toBeLessThan(5);

    // Returning to home must not insert another history entry.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${prefix}/team$`));
  });
}

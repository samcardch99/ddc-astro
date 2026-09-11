import { expect, test, type Page } from '@playwright/test';

/** Walks zone → profile → funding, stopping on the funding card. */
async function toFunding(page: Page, profile: 'resident' | 'foreign', path = '/investments') {
  await page.goto(path);
  await page.click('[data-zone-option="pinecrest"]');
  await page.click('[data-est-next]');
  await page.click(`[data-profile-option="${profile}"]`);
  await page.click('[data-est-next]');
}

async function toResults(page: Page, profile: 'resident' | 'foreign', path = '/investments') {
  await toFunding(page, profile, path);
  await page.click('[data-funding-option="financed"]');
  await page.click('[data-est-next]');
}

test.describe('loan-to-cost follows the investor profile', () => {
  test('the loan card quotes 83% for a U.S. resident', async ({ page }) => {
    await toFunding(page, 'resident');
    const sub = page.locator('[data-funding-sub="financed"]');
    await expect(sub).toContainText('83%');
    await expect(sub).toContainText('17%');
    await expect(sub).not.toContainText('80%');
  });

  test('the loan card quotes 80% for a foreign national', async ({ page }) => {
    await toFunding(page, 'foreign');
    const sub = page.locator('[data-funding-sub="financed"]');
    await expect(sub).toContainText('80%');
    await expect(sub).toContainText('20%');
    await expect(sub).not.toContainText('83%');
  });

  test('the results carry the resident rate through the summary and legend', async ({ page }) => {
    await toResults(page, 'resident');
    await expect(page.locator('[data-est-context]')).toContainText('83% financed');
    await expect(page.locator('[data-cap-legend]')).toContainText('83% LTC');
    await expect(page.locator('[data-cap="down"]')).toHaveText('17%');
    await expect(page.locator('[data-m-label="loan"]')).toHaveText('Loan · 83% LTC');
  });

  test('the results carry the foreign rate instead', async ({ page }) => {
    await toResults(page, 'foreign');
    await expect(page.locator('[data-est-context]')).toContainText('80% financed');
    await expect(page.locator('[data-cap-legend]')).toContainText('80% LTC');
    await expect(page.locator('[data-cap="down"]')).toHaveText('20%');
    await expect(page.locator('[data-m-label="loan"]')).toHaveText('Loan · 80% LTC');
  });

  test('a resident puts in less cash and earns more per dollar', async ({ page }) => {
    const read = async (profile: 'resident' | 'foreign') => {
      await toResults(page, profile);
      // The metrics count up, so wait for the value to settle.
      await page.waitForTimeout(1200);
      return {
        cash: await page.locator('[data-m="cash"]').textContent(),
        coc: await page.locator('[data-m="coc"]').textContent(),
      };
    };

    const resident = await read('resident');
    const foreign = await read('foreign');

    const num = (text: string | null) => Number((text ?? '').replace(/[^0-9.]/g, ''));
    expect(num(resident.cash)).toBeLessThan(num(foreign.cash));
    expect(num(resident.coc)).toBeGreaterThan(num(foreign.coc));
  });

  test('the Spanish card quotes the same rates', async ({ page }) => {
    await toFunding(page, 'resident', '/es/investments');
    await expect(page.locator('[data-funding-sub="financed"]')).toContainText('el 83%');
    await toFunding(page, 'foreign', '/es/investments');
    await expect(page.locator('[data-funding-sub="financed"]')).toContainText('el 80%');
  });

  test('the markup ships readable loan copy before any JavaScript runs', async ({ browser }) => {
    // HTML-first: the card is prose in the response, not filled in later.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/investments');
    await expect(page.locator('[data-funding-sub="financed"]')).toContainText('83%');
    await context.close();
  });
});

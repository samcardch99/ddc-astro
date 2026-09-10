import { expect, test, type Page } from '@playwright/test';

const EMAILJS = /emailjs\.com/;

const TOAST = '#ddc-toaster .ddc-toast';

/** Walks the wizard to the results step, where the lead form lives. */
async function openLeadForm(page: Page) {
  await page.goto('/investments');
  await page.click('[data-zone-option="pinecrest"]');
  await page.click('[data-est-next]');
  await page.click('[data-profile-option="resident"]');
  await page.click('[data-est-next]');
  await page.click('[data-funding-option="financed"]');
  await page.click('[data-est-next]');
  await expect(page.locator('[data-lead-form]')).toBeVisible();
}

async function fillLead(page: Page) {
  await page.fill('#est-name', 'Jane Smith');
  await page.fill('#est-email', 'jane@example.com');
  await page.fill('#est-phone', '+1 (305) 555-0100');
  await page.fill('#est-description', 'A four-bedroom spec build on a lot I own in Pinecrest.');
}

test.describe('estimate lead form validation', () => {
  test('raises one toast per invalid field, not a single generic one', async ({ page }) => {
    let sent = false;
    await page.route(EMAILJS, async (route) => {
      sent = true;
      await route.fulfill({ status: 200, body: 'OK' });
    });

    await openLeadForm(page);
    await page.click('[data-lead-form] button[type="submit"]');

    // Four empty fields, four toasts, each naming its own field.
    await expect(page.locator(TOAST)).toHaveCount(4);
    await expect(page.locator(`${TOAST} .ddc-toast__title`)).toHaveText([
      'Full name',
      'Email',
      'Phone / WhatsApp',
      'Project description',
    ]);
    expect(sent).toBe(false);
  });

  test('shades only the fields that failed', async ({ page }) => {
    await openLeadForm(page);
    await page.fill('#est-name', 'Jane Smith');
    await page.fill('#est-email', 'not-an-email');
    await page.click('[data-lead-form] button[type="submit"]');

    await expect(page.locator('#est-name')).not.toHaveAttribute('data-invalid', 'true');
    await expect(page.locator('#est-email')).toHaveAttribute('data-invalid', 'true');
    await expect(page.locator('#est-email')).toHaveAttribute('aria-invalid', 'true');

    // The red is a real colour change, not just an attribute.
    const border = await page
      .locator('#est-email')
      .evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(border).toBe('rgb(220, 38, 38)');
  });

  test('names the rule that rejected the field', async ({ page }) => {
    await openLeadForm(page);
    await fillLead(page);
    await page.fill('#est-phone', '12');
    await page.click('[data-lead-form] button[type="submit"]');

    await expect(page.locator(TOAST)).toHaveCount(1);
    await expect(page.locator(`${TOAST} .ddc-toast__title`)).toHaveText('Phone / WhatsApp');
    await expect(page.locator(`${TOAST} .ddc-toast__description`)).toHaveText(
      'Enter a phone or WhatsApp number we can reach you on, 7 to 20 digits.',
    );
  });

  test('clears the red as the field is corrected', async ({ page }) => {
    await openLeadForm(page);
    await page.click('[data-lead-form] button[type="submit"]');
    await expect(page.locator('#est-email')).toHaveAttribute('data-invalid', 'true');

    await page.fill('#est-email', 'jane@example.com');
    await expect(page.locator('#est-email')).not.toHaveAttribute('data-invalid', 'true');
    await expect(page.locator('#est-email')).not.toHaveAttribute('aria-invalid', 'true');
    // The fields still waiting on the visitor keep their state.
    await expect(page.locator('#est-name')).toHaveAttribute('data-invalid', 'true');
  });

  test('does not stack a second batch of toasts on a repeated submit', async ({ page }) => {
    await openLeadForm(page);
    await page.click('[data-lead-form] button[type="submit"]');
    await expect(page.locator(TOAST)).toHaveCount(4);
    await page.click('[data-lead-form] button[type="submit"]');
    await expect(page.locator(TOAST)).toHaveCount(4);
  });

  test('sends the lead once every field passes', async ({ page }) => {
    let payload: string | null = null;
    await page.route(EMAILJS, async (route) => {
      payload = route.request().postData();
      await route.fulfill({ status: 200, body: 'OK' });
    });

    await openLeadForm(page);
    await fillLead(page);
    await page.click('[data-lead-form] button[type="submit"]');

    await page.waitForURL('**/investments/success');
    expect(payload).toContain('jane@example.com');
    expect(payload).toContain('Pinecrest');
  });

  test('validates in Spanish on the Spanish route', async ({ page }) => {
    await page.goto('/es/investments');
    await page.click('[data-zone-option="pinecrest"]');
    await page.click('[data-est-next]');
    await page.click('[data-profile-option="resident"]');
    await page.click('[data-est-next]');
    await page.click('[data-funding-option="financed"]');
    await page.click('[data-est-next]');

    await page.fill('#est-description', 'Un lote en Pinecrest.');
    await page.click('[data-lead-form] button[type="submit"]');

    await expect(page.locator(`${TOAST} .ddc-toast__title`)).toHaveText([
      'Nombre completo',
      'Email',
      'Teléfono / WhatsApp',
    ]);
  });
});

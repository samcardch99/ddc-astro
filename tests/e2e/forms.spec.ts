import { expect, test } from '@playwright/test';

const WEBHOOK = /services\.leadconnectorhq\.com\/hooks/;

test.describe('contact form', () => {
  test('reports every invalid field instead of submitting', async ({ page }) => {
    let posted = false;
    await page.route(WEBHOOK, async (route) => {
      posted = true;
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/');
    await page.locator('#contact_form').scrollIntoViewIfNeeded();
    await page.locator('#contact_form button[type="submit"]').click();

    await expect(page.locator('[data-error-for="username"]')).toHaveText(
      'Username must be at least 2 characters.',
    );
    await expect(page.locator('[data-error-for="email"]')).toHaveText('Invalid email address.');
    await expect(page.locator('[data-error-for="message"]')).toHaveText('Please write a message.');
    await expect(page.locator('[data-error-for="terms"]')).toHaveText(
      'You must accept the terms and policies',
    );
    expect(posted).toBe(false);
  });

  test('posts the lead and confirms with a toast', async ({ page }) => {
    let payload: Record<string, unknown> | null = null;
    await page.route(WEBHOOK, async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, body: '{}' });
    });
    // EmailJS is a best-effort second delivery; keep it out of the test.
    await page.route(/emailjs\.com/, (route) => route.fulfill({ status: 200, body: 'OK' }));

    await page.goto('/');
    await page.locator('#contact_form').scrollIntoViewIfNeeded();

    await page.fill('#contact-username', 'Jane Smith');
    await page.fill('#contact-email', 'jane@example.com');
    await page.fill('#contact-phone', '305-555-1234');
    await page.fill('#contact-findus', 'Instagram');
    await page.selectOption('#investingWithUs', 'General inquiries');
    await page.fill('#contact-message', 'I would like more information about your modular homes.');
    await page.check('#contact-terms');

    await page.locator('#contact_form button[type="submit"]').click();

    await expect.poll(() => payload, { timeout: 10_000 }).not.toBeNull();
    expect(payload).toMatchObject({
      first_name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '305-555-1234',
      source: 'Instagram',
      investment_reason: 'General inquiries',
    });

    await expect(page.locator('.ddc-toast')).toContainText('Form send');
    await expect(page.locator('#contact-username')).toHaveValue('');
  });

  test('shows Spanish validation copy on the Spanish page', async ({ page }) => {
    await page.goto('/es');
    await page.locator('#contact_form').scrollIntoViewIfNeeded();
    await page.locator('#contact_form button[type="submit"]').click();
    await expect(page.locator('[data-error-for="username"]')).toHaveText(
      'El nombre de usuario debe tener al menos 2 caracteres.',
    );
  });
});

test.describe('investor dialog', () => {
  test('opens with the selected plan and validates', async ({ page }) => {
    await page.goto('/investments');
    const dialog = page.locator('[data-investment-dialog]');
    await expect(dialog).toBeHidden();

    await page.locator('[data-open-investment-dialog]:visible').first().click();
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-investment-title]')).not.toBeEmpty();

    await dialog.locator('button[type="submit"]').click();
    await expect(page.locator('[data-error-for="name"]')).not.toBeEmpty();
    await expect(page.locator('[data-error-for="country"]')).not.toBeEmpty();
    await expect(page.locator('[data-error-for="budget"]')).not.toBeEmpty();
  });

  test('posts the enquiry and hands off to WhatsApp', async ({ page, context }) => {
    let payload: Record<string, unknown> | null = null;
    await page.route(WEBHOOK, async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, body: '{}' });
    });
    // Stop the browser from actually leaving for wa.me.
    await context.route(/wa\.me/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>whatsapp</body></html>' }),
    );

    await page.goto('/investments');
    await page.locator('[data-open-investment-dialog]:visible').first().click();

    await page.fill('#inv-name', 'Jane Smith');
    await page.fill('#inv-email', 'jane@example.com');
    await page.selectOption('#inv-country', 'Spain');
    await page.fill('#inv-phone', '+1 786 566 1632');
    await page.locator('input[name="budget"]').first().check();
    await page.locator('input[name="funds"]').first().check();
    await page.locator('input[name="company"]').first().check();

    await page.locator('[data-investment-form] button[type="submit"]').click();

    await expect.poll(() => payload, { timeout: 10_000 }).not.toBeNull();
    expect(payload).toMatchObject({
      from_name: 'Jane Smith',
      email: 'jane@example.com',
      country: 'Spain',
    });
    expect(String((payload as any).investment_title)).toContain('Miami');
  });

  test('closes on Escape', async ({ page }) => {
    await page.goto('/investments');
    await page.locator('[data-open-investment-dialog]:visible').first().click();
    await expect(page.locator('[data-investment-dialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-investment-dialog]')).toBeHidden();
  });
});

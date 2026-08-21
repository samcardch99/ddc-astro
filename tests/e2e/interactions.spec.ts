import { expect, test } from '@playwright/test';

test.describe('header', () => {
  test('the overlay menu opens, links out and closes', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('#main-menu');
    await expect(menu).toBeHidden();

    await page.locator('#open-menu').click();
    await expect(menu).toBeVisible();
    await expect(page.locator('#open-menu')).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('link', { name: 'Technologies', exact: true })).toHaveAttribute(
      'href',
      '/technologies',
    );

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('the menu lists only the social links we keep', async ({ page }) => {
    await page.goto('/');
    await page.locator('#open-menu').click();
    const menu = page.locator('#main-menu');
    await expect(menu).toBeVisible();

    await expect(menu.getByRole('link', { name: 'Instagram' }).first()).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Youtube' }).first()).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Portfolio' })).toHaveCount(0);
  });

  test('the language switch keeps you on the same page', async ({ page }) => {
    // A single toggle, at every width — the label reads "English | Spanish"
    // above lg and "EN | ES" below it.
    await page.goto('/technologies');
    await page.locator('[data-language-toggle]:visible').first().click();
    await expect(page).toHaveURL(/\/es\/technologies$/);
    await expect(page).toHaveTitle('Tecnologías | DDC Developments');

    await page.locator('[data-language-toggle]:visible').first().click();
    await expect(page).toHaveURL(/\/technologies$/);
  });

  test('it hides on scroll down and comes back on scroll up', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('#header');

    await page.mouse.wheel(0, 2000);
    await expect
      .poll(async () => (await header.boundingBox())?.y ?? 0, { timeout: 8000 })
      .toBeLessThan(-10);

    await page.mouse.wheel(0, -600);
    await expect
      .poll(async () => (await header.boundingBox())?.y ?? -999, { timeout: 8000 })
      .toBeGreaterThanOrEqual(-1);
  });
});

test.describe('home page behaviour', () => {
  test('counters animate up to their final value', async ({ page }) => {
    await page.goto('/');
    const counter = page.locator('#technologies [data-countup]').first();
    await counter.scrollIntoViewIfNeeded();
    await expect(counter).toHaveText('200+', { timeout: 10_000 });
  });

  test('the process accordion keeps one row open and swaps the backdrop', async ({ page }) => {
    await page.goto('/');
    const rows = page.locator('[data-process-accordion] details');
    await rows.nth(1).locator('summary').click();
    await expect(rows.nth(1)).toHaveAttribute('open', '');
    await expect(page.locator('[data-backdrop-index="1"]')).toHaveClass(/opacity-100/);

    await rows.nth(3).locator('summary').click();
    await expect(rows.nth(1)).not.toHaveAttribute('open', '');
    await expect(rows.nth(3)).toHaveAttribute('open', '');
    await expect(page.locator('[data-backdrop-index="3"]')).toHaveClass(/opacity-100/);
  });

  test('the project carousel initialises and advances', async ({ page, isMobile }) => {
    await page.goto('/');
    const carousel = page.locator('[data-projects-swiper]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toHaveClass(/swiper-initialized/, { timeout: 10_000 });
    await expect(carousel).toHaveClass(/swiper-coverflow/);

    const title = page.locator('[data-projects-title]');
    const before = await title.textContent();
    expect(before).toBeTruthy();

    if (isMobile) {
      // The arrows are `hidden lg:block`; autoplay drives the carousel here.
      await expect.poll(async () => title.textContent(), { timeout: 12_000 }).not.toBe(before);
    } else {
      await page.locator('.projects-next').click();
      await expect.poll(async () => title.textContent(), { timeout: 8000 }).not.toBe(before);
    }
  });

  test('the testimonial carousel initialises with the cards effect', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-testimonials-swiper]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toHaveClass(/swiper-initialized/, { timeout: 10_000 });
    await expect(carousel).toHaveClass(/swiper-cards/);
  });

  test('the hero "Build" word is positioned and animating', async ({ page }) => {
    await page.goto('/');
    const build = page.locator('[data-cover-build]');
    await expect(build).toBeVisible();

    const first = await build.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(1500);
    const second = await build.evaluate((el) => getComputedStyle(el).transform);
    expect(second, 'the outlined word should keep moving').not.toBe(first);
  });

  test('headings are revealed word by word by SplitText', async ({ page }) => {
    await page.goto('/');
    const about = page.locator('[data-about-title]');
    await about.scrollIntoViewIfNeeded();
    await expect(about.locator('.wordWrapper').first()).toBeAttached({ timeout: 10_000 });
    await expect(about).toHaveText('About');
  });
});

test.describe('team section', () => {
  test.skip(({ isMobile }) => !!isMobile, 'the desktop roster only exists above lg');

  test('selecting a member swaps the panel', async ({ page }) => {
    await page.goto('/team');
    const rows = page.locator('[data-team-row]');
    await rows.nth(2).click();

    await expect(rows.nth(2)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-team-panel="2"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-team-panel="0"]')).toBeHidden();
  });

  test('the culture toggle swaps the list and the video', async ({ page }) => {
    await page.goto('/team');
    const section = page.locator('[data-team]');

    await page.locator('[data-team-toggle]').click();
    await expect(section).toHaveAttribute('data-mode', 'culture');
    await expect(page.locator('[data-team-culture]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-team-video]')).toBeVisible();
    await expect(section).toContainText('Safety is non–negotiable');

    await page.locator('[data-team-toggle]').click();
    await expect(section).toHaveAttribute('data-mode', 'team');
    await expect(page.locator('[data-team-video]')).toBeHidden({ timeout: 5000 });
  });
});

test.describe('team section on mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'the accordion only exists below lg');

  test('only one member stays expanded', async ({ page }) => {
    await page.goto('/team');
    const rows = page.locator('[data-team-accordion] details');
    await expect(rows.first()).toHaveAttribute('open', '');

    await rows.nth(2).locator('summary').click();
    await expect(rows.nth(2)).toHaveAttribute('open', '', { timeout: 5000 });
    await expect(rows.first()).not.toHaveAttribute('open', '', { timeout: 5000 });
  });
});

import { expect, test } from '@playwright/test';

/**
 * Regression tests for the animation details that differ between the React
 * original's toolchain (GSAP 3.13 + Tailwind 3 + framer-motion) and this port
 * (GSAP 3.15 + Tailwind 4 + CSS/WAAPI). Each one caught a real mismatch.
 */

test.describe('heading reveals', () => {
  test('SplitText wraps each word in a clipping mask', async ({ page }) => {
    await page.goto('/');
    const title = page.locator('[data-about-title]');
    await title.scrollIntoViewIfNeeded();

    const mask = title.locator('.wordWrapper-mask').first();
    await expect(mask).toBeAttached({ timeout: 10_000 });

    // `overflow: clip` would leave the inline-block on its text baseline and
    // shrink the heading by ~12px; the original relies on `hidden`.
    await expect(mask).toHaveCSS('overflow', 'hidden');
    await expect(mask).toHaveCSS('display', 'inline-block');
  });

  test('the words end fully visible and in place', async ({ page }) => {
    await page.goto('/');
    const title = page.locator('[data-about-title]');
    await title.scrollIntoViewIfNeeded();

    const word = title.locator('.wordWrapper').first();
    await expect(word).toBeAttached({ timeout: 10_000 });
    await expect
      .poll(async () => Number(await word.evaluate((el) => getComputedStyle(el).opacity)), {
        timeout: 8000,
      })
      .toBeGreaterThan(0.95);
  });

  test('the heading keeps an accessible name while split', async ({ page }) => {
    await page.goto('/');
    const title = page.locator('[data-about-title]');
    await title.scrollIntoViewIfNeeded();
    await expect(title).toHaveText('About');
  });
});

test.describe('technology card reveal', () => {
  test.skip(({ isMobile }) => !!isMobile, 'hover only exists on the desktop project');

  test('hovering scales the photo away and brings the copy in', async ({ page }) => {
    await page.goto('/technologies');
    const card = page.locator('.tech-card').nth(1);
    await card.scrollIntoViewIfNeeded();

    const image = card.locator('.tech-card-img');
    const number = card.locator('.tech-card-number');

    await expect(number).toHaveCSS('opacity', '0');

    await card.hover();

    // Tailwind v4 writes these to the `scale` property, so a `transform`-based
    // override would silently do nothing.
    await expect.poll(async () => number.evaluate((el) => getComputedStyle(el).scale), { timeout: 5000 }).toBe('1');
    await expect.poll(async () => Number(await number.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5000 }).toBeGreaterThan(0.95);
    await expect.poll(async () => image.evaluate((el) => getComputedStyle(el).scale), { timeout: 5000 }).toBe('10');
    await expect.poll(async () => Number(await image.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5000 }).toBeLessThan(0.05);
  });

  test('the reveal runs over 700ms with the original easing', async ({ page }) => {
    await page.goto('/technologies');
    const number = page.locator('.tech-card').first().locator('.tech-card-number');
    await expect(number).toHaveCSS('transition-duration', '0.7s');
    await expect(number).toHaveCSS('transition-timing-function', 'cubic-bezier(0.4, 0, 0.2, 1)');
  });
});

test.describe('our-process accordion', () => {
  const row = (page: import('@playwright/test').Page, index: number) =>
    page.locator('[data-process-accordion] details').nth(index);

  test('a closed row shows only its summary', async ({ page }) => {
    await page.goto('/');
    const first = row(page, 0);
    await first.scrollIntoViewIfNeeded();

    const summaryHeight = (await first.locator('summary').boundingBox())!.height;
    const rowHeight = (await first.boundingBox())!.height;
    // The row adds its 1px bottom rule on top of the summary.
    expect(rowHeight - summaryHeight).toBeLessThanOrEqual(2);
  });

  test('the arrow rotates 180 degrees when the row opens', async ({ page }) => {
    await page.goto('/');
    const target = row(page, 1);
    await target.scrollIntoViewIfNeeded();

    const arrow = target.locator('.process-arrow');
    // The arrow is rendered by <ArrowCircle>, so it carries that component's
    // scope id — a plain scoped rule here would silently never match.
    await expect(arrow).toHaveCSS('transition-duration', '0.3s');
    await expect(arrow).toHaveCSS('transform', 'none');

    await target.locator('summary').click();
    await expect
      .poll(async () => arrow.evaluate((el) => getComputedStyle(el).transform), { timeout: 4000 })
      .toBe('matrix(-1, 0, 0, -1, 0, 0)');
  });

  test('the step number lifts from 30% to full opacity', async ({ page }) => {
    await page.goto('/');
    const target = row(page, 1);
    await target.scrollIntoViewIfNeeded();

    const number = target.locator('.process-number');
    await expect(number).toHaveCSS('opacity', '0.3');
    await expect(number).toHaveCSS('transition-duration', '0.3s');

    await target.locator('summary').click();
    await expect(number).toHaveCSS('opacity', '1', { timeout: 4000 });
  });

  test('the panel fades in over 500ms and gains its bottom margin', async ({ page }) => {
    await page.goto('/');
    const target = row(page, 1);
    await target.scrollIntoViewIfNeeded();

    const panel = target.locator('.process-panel');
    await expect(panel).toHaveCSS('transition-duration', '0.5s, 0.5s');

    await target.locator('summary').click();
    await expect(panel).toHaveCSS('opacity', '1', { timeout: 4000 });
    await expect(panel).toHaveCSS('margin-bottom', '32px');
  });

  test('opening a row closes the one before it and swaps the backdrop', async ({ page }) => {
    await page.goto('/');
    const second = row(page, 1);
    const fourth = row(page, 3);
    await second.scrollIntoViewIfNeeded();

    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');

    await fourth.locator('summary').click();
    await expect(second).not.toHaveAttribute('open', '');
    await expect(fourth).toHaveAttribute('open', '');
    await expect(second.locator('.process-arrow')).toHaveCSS('transform', 'none');
    await expect(page.locator('[data-backdrop-index="3"]')).toHaveClass(/opacity-100/);
  });

  test('the backdrop cross-fades over 700ms', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-backdrop-index="0"]')).toHaveCSS('transition-duration', '0.7s');
  });
});

test.describe('transition timings match the original', () => {
  const cases = [
    { path: '/', selector: '#header', property: 'transition-duration', value: '0.5s' },
    { path: '/', selector: '#technologies .top-btn', property: 'transition-duration', value: '0.3s' },
    { path: '/', selector: '.projects-prev', property: 'transition-duration', value: '0.3s' },
    { path: '/', selector: '.my-next', property: 'transition-duration', value: '0.3s' },
    { path: '/', selector: '.process-arrow', property: 'transition-duration', value: '0.3s' },
    { path: '/', selector: '.process-number', property: 'transition-duration', value: '0.3s' },
    { path: '/', selector: '[data-backdrop-index="0"]', property: 'transition-duration', value: '0.7s' },
    { path: '/', selector: '.process-panel', property: 'transition-duration', value: '0.5s, 0.5s' },
    { path: '/projects', selector: '#our-projects img', property: 'transition-duration', value: '0.3s' },
    { path: '/investments', selector: 'article button', property: 'transition-duration', value: '0.2s' },
  ];

  for (const testCase of cases) {
    test(`${testCase.selector} on ${testCase.path}`, async ({ page }) => {
      await page.goto(testCase.path);
      await expect(page.locator(testCase.selector).first()).toHaveCSS(
        testCase.property,
        testCase.value,
      );
    });
  }
});

test.describe('hover effects', () => {
  test.skip(({ isMobile }) => !!isMobile, 'hover only exists on the desktop project');

  test('carousel arrows scale up', async ({ page }) => {
    await page.goto('/');
    const arrow = page.locator('.projects-prev');
    await arrow.scrollIntoViewIfNeeded();
    await expect(arrow).toHaveCSS('scale', 'none');
    await arrow.hover();
    await expect(arrow).toHaveCSS('scale', '1.1');
  });

  test('project cards zoom their photo', async ({ page }) => {
    await page.goto('/projects');
    const card = page.locator('[data-project-card]').first();
    const image = card.locator('img');
    await expect(image).toHaveCSS('scale', 'none');
    await card.hover();
    await expect(image).toHaveCSS('scale', '1.03');
  });

  test('animated links roll their label up', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('#home .hover-animated-link').first();
    const label = link.locator('span').first();
    await expect(label).toHaveCSS('transition-duration', '0.2s');

    // `-translate-y-full` lands on the `translate` property in Tailwind v4.
    await expect(label).toHaveCSS('translate', 'none');
    await link.hover();
    await expect(label).toHaveCSS('translate', '0px -100%');
  });
});

test.describe('carousel motion', () => {
  test('the coverflow carousel keeps the original depth settings', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-projects-swiper]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toHaveClass(/swiper-coverflow/, { timeout: 10_000 });

    const params = await carousel.evaluate((el: any) => {
      const s = el.swiper;
      return {
        effect: s.params.effect,
        depth: s.params.coverflowEffect.depth,
        rotate: s.params.coverflowEffect.rotate,
        stretch: s.params.coverflowEffect.stretch,
        autoplayDelay: s.params.autoplay?.delay,
        loop: s.params.loop,
      };
    });

    expect(params).toEqual({
      effect: 'coverflow',
      depth: 480,
      rotate: 0,
      stretch: '49%',
      autoplayDelay: 3500,
      loop: true,
    });
  });

  test('the testimonial carousel keeps its 650ms card speed', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('[data-testimonials-swiper]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toHaveClass(/swiper-initialized/, { timeout: 10_000 });

    const params = await carousel.evaluate((el: any) => ({
      effect: el.swiper.params.effect,
      speed: el.swiper.params.speed,
    }));
    expect(params).toEqual({ effect: 'cards', speed: 650 });
  });

  test('the culture carousel scrolls vertically three at a time', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the culture carousel only renders below lg');

    await page.goto('/team');
    const carousel = page.locator('[data-culture-swiper]');
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel).toHaveClass(/swiper-initialized/, { timeout: 10_000 });

    const params = await carousel.evaluate((el: any) => ({
      direction: el.swiper.params.direction,
      slidesPerView: el.swiper.params.slidesPerView,
      speed: el.swiper.params.speed,
    }));
    expect(params).toEqual({ direction: 'vertical', slidesPerView: 3, speed: 450 });
  });
});

test.describe('reduced motion', () => {
  test('scripted animations stand down', async ({ page }) => {
    // Set on the page rather than through `test.use`, so the project-level
    // `no-preference` in playwright.config.ts cannot win.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // The hero word is placed but never starts its loop.
    const build = page.locator('[data-cover-build]');
    await expect(build).toBeVisible();

    const first = await build.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(1200);
    expect(await build.evaluate((el) => getComputedStyle(el).transform)).toBe(first);

    // Content is still all there.
    await expect(page.locator('[data-about-title]')).toHaveText('About');
  });
});

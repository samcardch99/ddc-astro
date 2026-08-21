import { expect, test, type Page } from '@playwright/test';

/**
 * Details that only show up against the running site: control colours the
 * Tailwind upgrade changed underneath us, framing that came from a data file
 * that used to be invisible to the compiler, and space reserved for a widget
 * that loads late.
 */

/* ------------------------------------------------------------------ helpers */

const channels = (colour: string) => (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

function relativeLuminance([r, g, b]: number[]): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [relativeLuminance(channels(foreground)), relativeLuminance(channels(background))].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

/** Reads a colour as rendered, so `oklch()` and `color-mix()` come back as rgb. */
async function resolved(page: Page, selector: string, property: string, pseudo?: string) {
  return page.evaluate(
    ({ selector, property, pseudo }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const probe = document.createElement('div');
      probe.style.color = getComputedStyle(el, pseudo ?? undefined).getPropertyValue(property);
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    },
    { selector, property, pseudo },
  );
}

/* --------------------------------------------------------------- form fields */

test.describe('contact form fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#contact_form').scrollIntoViewIfNeeded();
  });

  test('text controls keep a solid field background', async ({ page }) => {
    // Tailwind v4's preflight makes every form control transparent; v3 only did
    // that for buttons. On this dark footer a transparent field would render
    // `text-secondary` navy on near-black.
    for (const selector of [
      '#contact_form input[name="username"]',
      '#contact_form input[name="email"]',
      '#contact_form select',
      '#contact_form textarea',
    ]) {
      await expect(page.locator(selector)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    }
  });

  test('typed text is readable against the field', async ({ page }) => {
    const colour = await resolved(page, '#contact_form input[name="username"]', 'color');
    const background = await resolved(page, '#contact_form input[name="username"]', 'background-color');
    expect(contrast(colour!, background!)).toBeGreaterThan(4.5);
  });

  test('placeholders meet WCAG AA', async ({ page }) => {
    const background = await resolved(page, '#contact_form input[name="username"]', 'background-color');

    const placeholder = await resolved(page, '#contact_form input[name="username"]', 'color', '::placeholder');
    expect(contrast(placeholder!, background!), 'input placeholder').toBeGreaterThanOrEqual(4.5);

    // The empty option is what a closed <select> shows, so it is the control's
    // value rather than a hint — the original rendered it at 2.6:1.
    const select = await resolved(page, '#contact_form select', 'color');
    expect(contrast(select!, background!), 'select placeholder').toBeGreaterThanOrEqual(4.5);
  });

  test('empty validation slots take up no space', async ({ page }) => {
    // They are server-rendered as empty placeholders and filled by script; an
    // empty flex item still gets its `gap`, which added 32px to the footer.
    const boxes = await page
      .locator('#contact_form [data-error-for]')
      .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height));
    expect(boxes.every((h) => h === 0)).toBe(true);
    await expect(page.locator('#contact_form [data-error-for]').first()).toHaveCSS('display', 'none');
  });

  test('a validation message reappears when it has something to say', async ({ page }) => {
    await page.locator('#contact_form button[type="submit"]').click();
    const error = page.locator('[data-error-for="username"]');
    await expect(error).not.toBeEmpty();
    await expect(error).toBeVisible();
  });

  test('choosing a reason switches the select to full contrast', async ({ page }) => {
    const before = await resolved(page, '#contact_form select', 'color');
    await page.selectOption('#investingWithUs', 'General inquiries');
    const after = await resolved(page, '#contact_form select', 'color');

    expect(after, 'a real answer should not look like a placeholder').not.toBe(before);
    expect(after).toBe('rgb(15, 25, 49)');
  });
});

test.describe('investor dialog fields', () => {
  test('placeholders meet WCAG AA on the grey panel', async ({ page }) => {
    await page.goto('/investments');
    await page.locator('[data-open-investment-dialog]:visible').first().click();
    await expect(page.locator('[data-investment-dialog]')).toBeVisible();

    const background = await resolved(page, '[data-investment-dialog] > div, [data-investment-dialog]', 'background-color');
    const placeholder = await resolved(page, '#inv-name', 'color', '::placeholder');
    expect(contrast(placeholder!, background!)).toBeGreaterThanOrEqual(4.5);

    const country = await resolved(page, '#inv-country', 'color');
    expect(contrast(country!, background!)).toBeGreaterThanOrEqual(4.5);
  });
});

/* ------------------------------------------------------------------- framing */

test.describe('team photos', () => {
  test('no transform leaks in from the data file', async ({ page }) => {
    await page.goto('/team');

    // team.json carries a `class` field that the v3 build never compiled, so
    // applying it would move headshots — Javi Ferrer's by 160px.
    const photos = page.locator('img[alt]:visible').filter({ hasNotText: '' });
    const offenders = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter((img) => img.offsetParent !== null && /employees|assets/.test(img.currentSrc || img.src))
        .map((img) => {
          const cs = getComputedStyle(img);
          return { src: img.src.split('/').pop(), scale: cs.scale, translate: cs.translate };
        })
        .filter((entry) => entry.scale !== 'none' || entry.translate !== 'none'),
    );
    expect(offenders).toEqual([]);
    await expect(photos.first()).toBeVisible();
  });

  test('Javi Ferrer sits in frame like every other member', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'the desktop panel only exists above lg');

    await page.goto('/team');
    const rows = page.locator('[data-team-row]');
    const javi = rows.filter({ hasText: 'Javi Ferrer' });
    await javi.click();

    const first = page.locator('[data-team-panel="0"] img');
    const target = page.locator('[data-team-panel] img:visible').first();
    await expect(target).toBeVisible();

    const box = await target.boundingBox();
    const reference = await first.boundingBox().catch(() => null);
    expect(box, 'the photo should be laid out').not.toBeNull();
    // Square, untransformed, and starting below the header — not shoved up.
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(4);
    expect(box!.y).toBeGreaterThan(0);
    if (reference) expect(Math.abs(box!.width - reference.width)).toBeLessThan(4);
  });
});

/* ------------------------------------------------------------ testimonials */

test.describe('testimonial cards', () => {
  for (const [name, width, height] of [
    ['iPad mini', 744, 1133],
    ['iPad Air', 820, 1180],
    ['iPad Pro 13"', 1024, 1366],
    ['desktop', 1440, 900],
  ] as const) {
    test(`the texture covers the whole card on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.locator('#testimonials').scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);

      // The texture is drawn at its intrinsic size and clipped by the card, so
      // a responsive srcset left the card partly bare wherever the browser
      // picked a variant smaller than it — a 307x397 image in a 431x622 card
      // at 1024px.
      const covered = await page.evaluate(() => {
        const card = document.querySelector('#testimonials article.slide-content')!;
        const img = card.querySelector('img')!;
        const c = card.getBoundingClientRect();
        const i = img.getBoundingClientRect();
        return { cardW: c.width, cardH: c.height, imgW: i.width, imgH: i.height };
      });

      expect(covered.imgW).toBeGreaterThanOrEqual(covered.cardW);
      expect(covered.imgH).toBeGreaterThanOrEqual(covered.cardH);
    });
  }

  test('the copy stays inside the card', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/');
    await page.locator('#testimonials').scrollIntoViewIfNeeded();

    const overflow = await page.evaluate(() => {
      const card = document.querySelector('#testimonials article.slide-content')!;
      const c = card.getBoundingClientRect();
      return Array.from(card.querySelectorAll('h3, p'))
        .map((el) => el.getBoundingClientRect())
        .filter((b) => b.bottom > c.bottom + 1 || b.top < c.top - 1).length;
    });
    expect(overflow).toBe(0);
  });
});

/* --------------------------------------------------------------- team layout */

test.describe('team columns', () => {
  for (const [name, width, height] of [
    ['iPad Pro 13" portrait', 1024, 1366],
    ['iPad Air landscape', 1180, 820],
    ['desktop', 1440, 900],
  ] as const) {
    test(`the split does not move between modes on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/team');

      const widths = () =>
        page.evaluate(() => ({
          left: Math.round(document.querySelector('.team-left')!.getBoundingClientRect().width),
          right: Math.round(document.querySelector('.team-right')!.getBoundingClientRect().width),
        }));

      const inTeamMode = await widths();
      await page.locator('[data-team-toggle]').click();
      await expect(page.locator('[data-team]')).toHaveAttribute('data-mode', 'culture');
      await page.waitForTimeout(800);

      // Both columns keep one width, so switching never reflows the layout.
      expect(await widths()).toEqual(inTeamMode);
    });
  }
});

/* -------------------------------------------------------------- roster wheel */

test.describe('team roster wheel', () => {
  test.skip(({ isMobile }) => !!isMobile, 'the desktop roster only exists above lg');

  const activeName = (page: Page) =>
    page.locator('[data-team-row][aria-current="true"] .team-row-name').first().textContent();

  test('one wheel gesture moves exactly one member', async ({ page }) => {
    await page.goto('/team');
    const roster = page.locator('[data-team-roster]');
    await expect(roster).toBeVisible();

    const box = (await roster.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);

    const seen = [(await activeName(page))?.trim()];
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(700);
      seen.push((await activeName(page))?.trim());
    }

    expect(seen).toEqual([
      'Danilo Dominguez',
      'Danilo Dominguez Catasus',
      'Alejandro Gomez',
      'Javi Ferrer',
    ]);
  });

  test('a hard flick still advances only one member', async ({ page }) => {
    await page.goto('/team');
    const roster = page.locator('[data-team-roster]');
    const box = (await roster.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);

    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(800);
    expect((await activeName(page))?.trim()).toBe('Danilo Dominguez Catasus');
  });

  test('the page underneath does not scroll', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-team-roster]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const box = (await page.locator('[data-team-roster]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);

    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('the selected member moves to the top of the column', async ({ page }) => {
    await page.goto('/team');
    const roster = page.locator('[data-team-roster]');
    const box = (await roster.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);

    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(900);

    const offset = await page.evaluate(() => {
      const list = document.querySelector('[data-team-roster]')!;
      const row = document.querySelector('[data-team-row][aria-current="true"]')!;
      return row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    });
    expect(Math.abs(offset)).toBeLessThan(6);
  });
});

/* ------------------------------------------------------------ booking widget */

test.describe('booking widget', () => {
  test('its height is reserved before the embed script replies', async ({ page }) => {
    await page.goto('/investments');

    const iframe = page.locator('#appointment iframe');
    await expect(iframe).toHaveCount(1);

    // Measured before LeadConnector's postMessage can have arrived.
    const reserved = await iframe.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(reserved, 'the frame must not start at the 150px default').toBeGreaterThan(600);

    // The floor stays in force; the calendar's own height moves with how many
    // slots it renders, so it is not pinned to one number.
    const floor = await iframe.evaluate((el) =>
      parseInt(getComputedStyle(el as HTMLElement).minHeight, 10),
    );
    expect(floor).toBeGreaterThan(600);

    await page.waitForTimeout(6000);
    const settled = await iframe.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(settled).toBeGreaterThanOrEqual(floor);
  });

  test('the resize script is on the page', async ({ page }) => {
    await page.goto('/investments');
    const scripts = await page.evaluate(() =>
      Array.from(document.scripts)
        .map((s) => s.src)
        .filter((src) => src.includes('msgsndr')),
    );
    expect(scripts.length, 'form_embed.js resizes the iframe to fit the calendar').toBe(1);
  });
});

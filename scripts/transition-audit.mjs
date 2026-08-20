/**
 * Compares computed transitions and hover deltas between the React original
 * and the Astro port.
 *
 *   node scripts/transition-audit.mjs <astroBase> <reactBase>
 */
import { chromium } from '@playwright/test';

const astroBase = process.argv[2] ?? 'http://127.0.0.1:4322';
const reactBase = process.argv[3] ?? 'http://127.0.0.1:5175';

const TRACKED = [
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
];

/** Properties whose hover delta we care about. */
const HOVER_PROPS = ['backgroundColor', 'color', 'transform', 'opacity', 'scale'];

const targets = [
  {
    page: { astro: '/es', react: '/' },
    checks: [
      {
        name: 'cover CTA',
        astro: '#home a[href="/es/investments#appointment"]',
        react: '#home a[href="/investments/#appointment"]',
      },
      { name: 'header', sel: '#header' },
      { name: 'technologies CTA', sel: '#technologies .top-btn' },
      { name: 'investments CTA', sel: '#investments .top-btn' },
      { name: 'projects prev arrow', sel: '.projects-prev' },
      { name: 'projects slide image', sel: '.swiper-projects .slide-content-img' },
      { name: 'testimonials next arrow', sel: '.my-next' },
      { name: 'process row number', astro: '.process-number', react: '#our-process button span' },
      { name: 'process arrow', astro: '.process-arrow', react: '#our-process button svg' },
    ],
  },
  {
    page: { astro: '/es/technologies', react: '/technologies' },
    checks: [
      { name: 'tech card image', sel: '.tech-card img' },
      { name: 'tech card number', sel: '.tech-card h2', hoverSel: '.tech-card' },
      { name: 'tech card text', sel: '.tech-card p', hoverSel: '.tech-card' },
      { name: 'tech CTA', sel: '.top-cta' },
    ],
  },
  {
    page: { astro: '/es/projects', react: '/projects' },
    checks: [
      { name: 'project card image', sel: '#our-projects img' },
      { name: 'view toggle', sel: '#our-projects button' },
    ],
  },
  {
    page: { astro: '/es/investments', react: '/investments' },
    checks: [{ name: 'plan CTA', sel: 'article button' }],
  },
];

const browser = await chromium.launch();

async function inspect(base, page, checks, side) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
    locale: 'es-ES',
  });
  await context.route(/googletagmanager|google\.com\/maps|leadconnectorhq|msgsndr/, (r) => r.abort());
  const tab = await context.newPage();
  await tab.goto(base + page, { waitUntil: 'load' });
  await tab.waitForTimeout(2500);

  const out = {};
  for (const check of checks) {
    const sel = check[side] ?? check.sel;
    const hoverSel = check.hoverSel ?? sel;
    const result = await tab.evaluate(
      ({ sel, tracked, hoverProps }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const base = Object.fromEntries(tracked.map((p) => [p, cs[p]]));
        const before = Object.fromEntries(hoverProps.map((p) => [p, cs[p]]));
        return { base, before };
      },
      { sel, tracked: TRACKED, hoverProps: HOVER_PROPS },
    );

    if (!result) {
      out[check.name] = 'MISSING';
      continue;
    }

    // Hover and re-read, so `hover:` utilities are reflected.
    let after = null;
    try {
      await tab.locator(hoverSel).first().hover({ timeout: 3000, force: true });
      await tab.waitForTimeout(700);
      after = await tab.evaluate(
        ({ sel, hoverProps }) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          return Object.fromEntries(hoverProps.map((p) => [p, cs[p]]));
        },
        { sel, hoverProps: HOVER_PROPS },
      );
    } catch {
      after = 'not-hoverable';
    }

    const delta =
      after && after !== 'not-hoverable'
        ? Object.fromEntries(
            Object.entries(after).filter(([k, v]) => v !== result.before[k]),
          )
        : after;

    out[check.name] = { ...result.base, hoverDelta: delta };
  }

  await context.close();
  return out;
}

for (const target of targets) {
  const astro = await inspect(astroBase, target.page.astro, target.checks, 'astro');
  const react = await inspect(reactBase, target.page.react, target.checks, 'react');

  console.log(`\n=== ${target.page.react} ===`);
  for (const check of target.checks) {
    const a = astro[check.name];
    const r = react[check.name];
    const same = JSON.stringify(a) === JSON.stringify(r);
    console.log(`${same ? 'OK  ' : 'DIFF'}  ${check.name}`);
    if (!same) {
      console.log('        react:', JSON.stringify(r));
      console.log('        astro:', JSON.stringify(a));
    }
  }
}

await browser.close();

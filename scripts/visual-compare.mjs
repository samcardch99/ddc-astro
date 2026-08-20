/**
 * Side-by-side capture of the React original and the Astro port.
 *
 *   node scripts/visual-compare.mjs <astroBase> <reactBase> <outDir>
 *
 * Both servers must already be running. Screenshots land in <outDir> as
 * `<name>--astro.jpg` / `<name>--react.jpg`.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const astroBase = process.argv[2] ?? 'http://127.0.0.1:4322';
const reactBase = process.argv[3] ?? 'http://127.0.0.1:5175';
const outDir = process.argv[4] ?? 'visual';

/** The Astro port serves Spanish under /es; the React app auto-detects it. */
const shots = [
  { name: 'home-hero', astro: '/es', react: '/', scroll: 0 },
  { name: 'home-about', astro: '/es', react: '/', anchor: '#about' },
  { name: 'home-technologies', astro: '/es', react: '/', anchor: '#technologies' },
  { name: 'home-projects', astro: '/es', react: '/', anchor: '#projects' },
  { name: 'home-investments', astro: '/es', react: '/', anchor: '#investments' },
  { name: 'home-process', astro: '/es', react: '/', anchor: '#our-process' },
  { name: 'home-testimonials', astro: '/es', react: '/', anchor: '#testimonials' },
  { name: 'home-contact', astro: '/es', react: '/', anchor: '#contact' },
  { name: 'team', astro: '/es/team', react: '/team', scroll: 0 },
  { name: 'technologies', astro: '/es/technologies', react: '/technologies', scroll: 0 },
  { name: 'investments', astro: '/es/investments', react: '/investments', scroll: 0 },
  { name: 'projects', astro: '/es/projects', react: '/projects', scroll: 0 },
  { name: 'project-detail', astro: '/es/projects/Villa_Sunset', react: '/projects/Villa_Sunset', scroll: 0 },
];

const viewport = { width: 1440, height: 900 };

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

async function capture(base, shot, suffix) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: 'no-preference',
    locale: 'es-ES',
  });
  // Third-party embeds are noise for a visual diff.
  await context.route(/googletagmanager|google\.com\/maps|leadconnectorhq|msgsndr/, (route) =>
    route.abort(),
  );

  const page = await context.newPage();
  const url = base + (suffix === 'astro' ? shot.astro : shot.react);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  if (shot.anchor) {
    await page.evaluate((anchor) => {
      const el = document.querySelector(anchor);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'auto' });
    }, shot.anchor);
  } else {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'auto' }), shot.scroll ?? 0);
  }

  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(outDir, `${shot.name}--${suffix}.jpg`),
    type: 'jpeg',
    quality: 78,
  });
  await context.close();
}

for (const shot of shots) {
  await capture(astroBase, shot, 'astro');
  await capture(reactBase, shot, 'react');
  console.log('captured', shot.name);
}

await browser.close();

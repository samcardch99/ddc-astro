import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { $, $$, prefersReducedMotion } from '../utils';

/**
 * Every timeline below is a direct transcription of the GSAP code that lived in
 * the React sections — same durations, staggers, eases, positions and
 * ScrollTrigger start values. Where a number looks arbitrary it is because the
 * original used that number.
 */

/**
 * The React code created two nested SplitText instances to get an
 * `overflow-hidden` wrapper around every word. GSAP 3.13+ reverts the first
 * split when a second one targets the same element, so the supported `mask`
 * option is used instead — it produces the same clipped wrapper
 * (`.wordWrapper-mask`, `overflow: clip`) around each animated word.
 */
function splitWords(el: HTMLElement) {
  return new SplitText(el, { type: 'words', wordsClass: 'wordWrapper', mask: 'words' });
}

function splitLines(el: HTMLElement) {
  return new SplitText(el, { type: 'lines', linesClass: 'lineWrapper', mask: 'lines' });
}

/* -------------------------------------------------------------------------
   About — About.jsx
   ------------------------------------------------------------------------- */
function initAbout(): void {
  const section = $<HTMLElement>('[data-about]');
  if (!section) return;

  const title = $<HTMLElement>('[data-about-title]', section);
  const subtitle = $<HTMLElement>('[data-about-subtitle]', section);
  const text = $<HTMLElement>('[data-about-text]', section);

  const body = document.body;
  const originalBg = getComputedStyle(body).backgroundColor;
  const darkBg = '#0f1931';

  const toDark = () =>
    gsap.to(body, { backgroundColor: darkBg, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  const toOriginal = () =>
    gsap.to(body, { backgroundColor: originalBg, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });

  const introTl = gsap.timeline({ paused: true });

  const titleWords = title ? splitWords(title) : null;
  const subtitleWords = subtitle ? splitWords(subtitle) : null;

  if (titleWords?.words.length) {
    introTl.from(
      titleWords.words,
      { yPercent: 100, opacity: 0, duration: 0.3, ease: 'power2.out', stagger: 0.04 },
      0,
    );
  }

  if (subtitleWords?.words.length) {
    introTl.from(
      subtitleWords.words,
      { yPercent: 100, opacity: 0, duration: 0.3, ease: 'power2.out', stagger: 0.04 },
      titleWords ? '+=0.05' : 0,
    );
  }

  if (text) {
    gsap.set(text, { y: 16, opacity: 0, willChange: 'transform,opacity' });
    introTl.to(text, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.10');
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    once: true,
    onEnter: () => {
      toDark();
      introTl.play();
    },
  });

  ScrollTrigger.create({ trigger: section, start: 'top 50%', onEnter: toDark, onEnterBack: toDark });
  ScrollTrigger.create({ trigger: section, start: 'top 40%', onLeaveBack: toOriginal });
}

/* -------------------------------------------------------------------------
   Technologies — Technologies.jsx
   ------------------------------------------------------------------------- */
function initTechnologies(): void {
  const section = $<HTMLElement>('[data-technologies]');
  if (!section) return;

  const title = $<HTMLElement>('[data-tech-title]', section);
  const topBtn = $<HTMLElement>('.top-btn', section);
  const metrics = $$('.metric-block', section);
  const mobileBtn = $<HTMLElement>('.mobile-btn', section);

  const tl = gsap.timeline({ paused: true });
  const titleWords = title ? splitWords(title) : null;

  if (titleWords?.words.length) {
    tl.from(
      titleWords.words,
      { yPercent: 100, opacity: 0, duration: 0.3, ease: 'power2.out', stagger: 0.05 },
      0,
    );
  }

  if (topBtn) tl.from(topBtn, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.2');
  if (metrics.length)
    tl.from(metrics, { y: 30, opacity: 0, duration: 0.3, ease: 'power2.out', stagger: 0.1 }, '+=0.1');
  if (mobileBtn) tl.from(mobileBtn, { y: 20, opacity: 0, duration: 0.3, ease: 'power2.out' }, '-=0.2');

  ScrollTrigger.create({ trigger: section, start: 'top 70%', once: true, onEnter: () => tl.play() });
}

/* -------------------------------------------------------------------------
   Investments — Investments.jsx (faster, more overlapped than Technologies)
   ------------------------------------------------------------------------- */
function initInvestments(): void {
  const section = $<HTMLElement>('[data-investments]');
  if (!section) return;

  const title = $<HTMLElement>('[data-inv-title]', section);
  const subtitle = $<HTMLElement>('[data-inv-subtitle]', section);
  const topBtn = $<HTMLElement>('.top-btn', section);
  const blocks = $$('.inv-block', section);
  const mobileBtn = $<HTMLElement>('.mobile-btn', section);

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

  const titleWords = title ? splitWords(title) : null;
  const subtitleWords = subtitle ? splitWords(subtitle) : null;

  if (titleWords?.words.length) {
    tl.from(
      titleWords.words,
      { yPercent: 100, opacity: 0, duration: 0.2, stagger: 0.03, force3D: true },
      0,
    );
  }

  if (subtitleWords?.words.length) {
    tl.from(
      subtitleWords.words,
      { yPercent: 100, opacity: 0, duration: 0.2, stagger: 0.025, force3D: true },
      titleWords ? '-=0.08' : 0,
    );
  }

  if (topBtn) tl.from(topBtn, { y: 16, opacity: 0, duration: 0.2, force3D: true }, '-=0.10');
  if (blocks.length)
    tl.from(blocks, { y: 20, opacity: 0, duration: 0.22, stagger: 0.08, force3D: true }, '-=0.05');
  if (mobileBtn) tl.from(mobileBtn, { y: 16, opacity: 0, duration: 0.2, force3D: true }, '-=0.12');

  ScrollTrigger.create({ trigger: section, start: 'top 85%', once: true, onEnter: () => tl.play() });
}

/* -------------------------------------------------------------------------
   Generic word split — Hooks/useSplitWords.jsx (the Projects heading)
   ------------------------------------------------------------------------- */
function initSplitWords(): void {
  $$('[data-split-words]').forEach((el) => {
    const inner = splitWords(el);
    if (!inner.words.length) return;

    gsap.set(inner.words, { yPercent: 100, opacity: 0, willChange: 'transform,opacity' });
    gsap.to(inner.words, {
      yPercent: 0,
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
      stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    });
  });
}

/* -------------------------------------------------------------------------
   Line split — Interior/TechnologiesInside.jsx
   ------------------------------------------------------------------------- */
function initRevealLines(): void {
  const targets = $$('[data-reveal-lines]');
  if (!targets.length) return;

  const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

  targets.forEach((el) => {
    const inner = splitLines(el);
    if (!inner.lines.length) return;
    timeline.from(inner.lines, { yPercent: 100, opacity: 0, duration: 0.4, stagger: 0.08 }, '<+=0.1');
  });

  const ctas = $$('.top-cta, .mobile-cta');
  if (ctas.length) timeline.from(ctas, { y: 20, opacity: 0, duration: 0.3, stagger: 0.1 }, '-=0.3');

  const section = targets[0].closest('section') ?? targets[0];
  ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    once: true,
    onEnter: () => timeline.play(),
  });
}

export function initReveals(): void {
  if (prefersReducedMotion()) return;

  initAbout();
  initTechnologies();
  initInvestments();
  initSplitWords();
  initRevealLines();

  requestAnimationFrame(() => ScrollTrigger.refresh());
}

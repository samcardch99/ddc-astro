import gsap from 'gsap';
import { $, prefersReducedMotion } from '../utils';

/**
 * The hero: a scrubbed parallax on the background layer plus the outlined
 * "Build" word sliding between the three headline anchors.
 */
export function initCover(): void {
  const section = $<HTMLElement>('[data-cover]');
  if (!section) return;

  const container = $<HTMLElement>('[data-cover-words]', section);
  const build = $<HTMLElement>('[data-cover-build]', section);
  const left = $<HTMLElement>('[data-cover-left]', section);
  const center = $<HTMLElement>('[data-cover-center]', section);
  const right = $<HTMLElement>('[data-cover-right]', section);
  if (!container || !build || !left || !center || !right) return;

  if (prefersReducedMotion()) {
    build.style.visibility = 'visible';
    return;
  }

  gsap.to(section, {
    duration: 1,
    ease: 'none',
    '--bg-y': '30vh',
    scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
  });

  let timeline: gsap.core.Timeline | null = null;

  const build_timeline = () => {
    timeline?.kill();

    const c = container.getBoundingClientRect();
    const b = build.getBoundingClientRect();
    const [l, m, r] = [left, center, right].map((el) => el.getBoundingClientRect());

    const yOffset = -(b.height + l.height) * 0.5;
    const xLeft = l.left - c.left;
    const xCenter = m.left + (m.width - b.width) / 2 - c.left;
    const xRight = r.right - b.width - c.left;

    gsap.set(build, { x: xLeft, y: yOffset, visibility: 'visible' });

    timeline = gsap
      .timeline({
        delay: 0.5,
        repeat: -1,
        yoyo: true,
        defaults: { duration: 1.6, ease: 'power2.inOut' },
      })
      .to(build, { x: xCenter }, '+=0.3')
      .to(build, { x: xRight }, '+=0.8')
      .to(build, { duration: 0.5 });
  };

  // Position immediately so the word is never invisible for long, then correct
  // it once the webfont has settled (metrics change the measurements).
  build_timeline();
  document.fonts?.ready.then(build_timeline);

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(build_timeline);
  });
}

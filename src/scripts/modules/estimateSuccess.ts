import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { $, $$, prefersReducedMotion } from '../utils';

/** Filled checkmark the send icon morphs into. */
const CHECK_PATH = 'M33.7 64.3 L42.2 55.8 L52.4 66 L77.9 37.1 L86.4 45.6 L52.4 83 Z';
const REDIRECT_AFTER_MS = 6000;

/**
 * /estimate/success — draws the ring, morphs the paper plane into a checkmark
 * (GSAP MorphSVG, bundled free since 3.13), reveals the copy, then sends the
 * visitor home.
 */
export function initEstimateSuccess(): void {
  const root = $<HTMLElement>('[data-estimate-success]');
  if (!root) return;

  const home = root.dataset.home ?? '/';
  window.setTimeout(() => {
    window.location.replace(home);
  }, REDIRECT_AFTER_MS);

  const ring = $<SVGCircleElement & Element>('[data-success-ring]', root);
  const icon = $<SVGPathElement & Element>('[data-success-icon]', root);
  const items = $$('[data-success-item]', root);

  if (prefersReducedMotion() || !ring || !icon) {
    if (icon) icon.setAttribute('d', CHECK_PATH);
    return;
  }

  gsap.registerPlugin(MorphSVGPlugin);

  const circumference = 2 * Math.PI * 52;
  gsap.set(ring, { strokeDasharray: circumference, strokeDashoffset: circumference });
  gsap.set(icon, { transformOrigin: '50% 50%', scale: 0.6, autoAlpha: 0 });
  gsap.set(items, { autoAlpha: 0, y: 16 });

  gsap
    .timeline({ defaults: { ease: 'power2.out' } })
    .to(ring, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' })
    .to(icon, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, '-=0.35')
    .to(icon, { morphSVG: CHECK_PATH, duration: 0.6, ease: 'power2.inOut' }, '+=0.35')
    .to(icon, { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '<0.45')
    .to(items, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.25');
}

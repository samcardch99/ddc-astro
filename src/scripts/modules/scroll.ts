import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../utils';

/** Smooth scrolling + the GSAP ticker wiring the React app set up in App.jsx. */
export function initSmoothScroll(): void {
  if (prefersReducedMotion()) return;

  const lenis = new Lenis({ duration: 0.9 });
  // `lenis` declares its own, narrower `window.lenis`; the instance is exposed
  // for debugging and for the Team roster's scroll handling.
  (window as unknown as { lenis?: Lenis }).lenis = lenis;

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

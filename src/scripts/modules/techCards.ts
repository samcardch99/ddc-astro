import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$, prefersReducedMotion } from '../utils';

/**
 * Below `lg` there is no hover, so TechnologiesInside replayed the hover as a
 * scroll-driven timeline: play when the card reaches the middle of the
 * viewport, reverse on the way out. Same 0.4s / `ease:none` / 0.05s + 0.1s
 * offsets as the React version.
 */
export function initTechCards(): void {
  const cards = $$<HTMLElement>('.tech-card');
  if (!cards.length || prefersReducedMotion()) return;

  const mm = gsap.matchMedia();

  mm.add('(max-width: 1023px)', () => {
    const triggers: ScrollTrigger[] = [];

    cards.forEach((card) => {
      const img = card.querySelector('.tech-card-img');
      const number = card.querySelector('.tech-card-number');
      const text = card.querySelector('.tech-card-text');
      if (!img || !number || !text) return;

      // Tailwind v4 writes `scale-0` / `scale-[1000%]` to the CSS `scale`
      // property, which composes with (rather than being replaced by) GSAP's
      // `transform`. Clearing it hands the scale entirely to the timeline;
      // the `transition` is dropped so GSAP is the only thing tweening.
      [img, number, text].forEach((el) => {
        (el as HTMLElement).style.scale = 'none';
        (el as HTMLElement).style.transition = 'none';
      });

      gsap.set(img, { opacity: 1, scale: 1, willChange: 'transform,opacity' });
      gsap.set([number, text], {
        opacity: 0,
        scale: 0,
        transformOrigin: '50% 50%',
        willChange: 'transform,opacity',
      });

      const tl = gsap.timeline({ paused: true, defaults: { duration: 0.4, ease: 'none' } });
      tl.to(img, { opacity: 0, scale: 10 }, 0)
        .to(number, { opacity: 1, scale: 1, ease: 'none' }, 0.05)
        .to(text, { opacity: 1, scale: 1, ease: 'none' }, 0.1);

      triggers.push(
        ScrollTrigger.create({
          trigger: card,
          start: 'top center+=5%',
          end: 'bottom center-=5%',
          onEnter: () => tl.play(),
          onEnterBack: () => tl.play(),
          onLeave: () => tl.reverse(),
          onLeaveBack: () => tl.reverse(),
        }),
      );
    });

    return () => triggers.forEach((trigger) => trigger.kill());
  });
}

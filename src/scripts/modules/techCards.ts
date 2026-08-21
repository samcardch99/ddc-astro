import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$, prefersReducedMotion } from '../utils';

/**
 * The card reveal has two triggers, and only ever one at a time.
 *
 * The React version chose between them by viewport width (`max-width: 1023px`),
 * which breaks down on a tablet or a narrow laptop window with a pointer: below
 * 1024px both the `group-hover` rules *and* this timeline were live, so the
 * cards flipped as you scrolled and hovering did nothing. Keying on the input
 * device instead means a touch screen gets the scroll reveal at any width and
 * anything with a pointer gets hover at any width — and `(hover: none)` is the
 * exact complement of the `@media (hover: hover)` Tailwind wraps `group-hover`
 * in, so they can never overlap.
 *
 * `gsap.matchMedia` reverts the timeline if the query stops matching, e.g. when
 * a keyboard case is attached to an iPad.
 *
 * The timeline itself is the React one: 0.4s, `ease: none`, offsets 0 / 0.05 / 0.1.
 */
export function initTechCards(): void {
  const cards = $$<HTMLElement>('.tech-card');
  if (!cards.length || prefersReducedMotion()) return;

  const mm = gsap.matchMedia();

  mm.add('(hover: none)', () => {
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

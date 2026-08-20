import { $$ } from '../utils';

/** countup.js on first view — loaded lazily, only when a counter exists. */
export function initCounters(): void {
  const elements = $$('[data-countup]');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);

        void import('countup.js').then(({ CountUp }) => {
          const counter = new CountUp(el, Number(el.dataset.end ?? 0), {
            startVal: Number(el.dataset.start ?? 0),
            duration: Number(el.dataset.duration ?? 2),
            prefix: el.dataset.prefix ?? '',
            suffix: el.dataset.suffix ?? '',
            useEasing: true,
          });
          if (!counter.error) counter.start();
        });
      });
    },
    { threshold: 0.8 },
  );

  elements.forEach((el) => observer.observe(el));
}

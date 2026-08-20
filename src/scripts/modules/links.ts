import { $$ } from '../utils';

/**
 * HoverAnimatedLink.jsx had a touch fallback: tapping the link ran the same
 * roll-up the hover state produces and reset itself after 1s.
 */
export function initHoverLinks(): void {
  if (!window.matchMedia('(hover: none)').matches) return;

  $$('.hover-animated-link').forEach((link) => {
    link.addEventListener(
      'click',
      () => {
        link.classList.add('is-active');
        window.setTimeout(() => link.classList.remove('is-active'), 1000);
      },
      { passive: true },
    );
  });
}

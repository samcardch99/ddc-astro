import type Lenis from 'lenis';
import { $, $$ } from '../utils';

/** Save the homepage's investment section as the browser's Back destination. */
export function initInvestmentReturn(): void {
  const section = $<HTMLElement>('[data-investments]');
  const destination = section?.dataset.investmentsUrl;
  if (!section || !destination) return;

  $$<HTMLAnchorElement>(`a[href="${destination}"], a[href^="${destination}#"]`).forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;

      // Replace the existing home entry, so Back/Forward keep their normal order.
      const returnUrl = new URL(window.location.href);
      returnUrl.hash = 'investments';
      window.history.replaceState(window.history.state, '', returnUrl);

      // Native history restores scroll position, including when using bfcache.
      const lenis = (window as unknown as { lenis?: Lenis }).lenis;
      if (lenis) lenis.scrollTo(section, { immediate: true });
      else section.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  });
}

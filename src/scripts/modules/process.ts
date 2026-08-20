import { $, $$ } from '../utils';

/**
 * Process accordion: `<details>` gives it keyboard + no-JS behaviour for free;
 * this only enforces "one open at a time" and cross-fades the blurred backdrop.
 */
export function initProcessAccordion(): void {
  const root = $<HTMLElement>('[data-process-accordion]');
  if (!root) return;

  const rows = $$<HTMLDetailsElement>('details', root);
  const backdrops = $$('[data-backdrop-index]');

  const showBackdrop = (index: number) => {
    backdrops.forEach((layer) => {
      const isActive = Number(layer.dataset.backdropIndex) === index;
      layer.classList.toggle('opacity-100', isActive);
      layer.classList.toggle('opacity-0', !isActive);
    });
  };

  rows.forEach((row) => {
    row.addEventListener('toggle', () => {
      if (!row.open) {
        // Falling back to the first backdrop mirrors `openIndex ?? 0`.
        if (!rows.some((other) => other.open)) showBackdrop(0);
        return;
      }
      rows.forEach((other) => {
        if (other !== row) other.open = false;
      });
      showBackdrop(Number(row.dataset.index ?? 0));
    });
  });
}

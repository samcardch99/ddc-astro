import { $, $$ } from '../utils';

/** Renders ⇄ real photos toggle, remembered per project like the React page. */
export function initProjectDetails(): void {
  const section = $<HTMLElement>('[data-project-details]');
  if (!section) return;

  const folder = section.dataset.folder ?? '';
  const grids = $$<HTMLElement>('[data-gallery]', section);
  const buttons = $$<HTMLButtonElement>('[data-photo-mode]', section);
  if (!buttons.length) return;

  const setMode = (mode: string) => {
    section.dataset.mode = mode;
    grids.forEach((grid) => {
      grid.hidden = grid.dataset.gallery !== mode;
    });
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.photoMode === mode ? 'true' : 'false');
    });
    try {
      localStorage.setItem(`photoMode_${folder}`, mode);
    } catch {
      /* ignore */
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.photoMode ?? 'renders'));
  });

  let saved = 'renders';
  try {
    saved = localStorage.getItem(`photoMode_${folder}`) || 'renders';
  } catch {
    /* ignore */
  }
  if (saved === 'reales' && grids.some((grid) => grid.dataset.gallery === 'reales')) setMode('reales');
  else setMode('renders');
}

/**
 * Hands clicks to the `react-photo-view` island (see PhotoLightbox.tsx). The
 * gallery markup stays server-rendered; this only tells the viewer which photo
 * to open, so the island can hydrate lazily without holding up the page.
 */
export function initLightboxTriggers(): void {
  document.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-lightbox-open]');
    if (!trigger) return;

    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent('ddc:lightbox', {
        detail: {
          mode: trigger.dataset.galleryMode ?? 'renders',
          index: Number(trigger.dataset.position ?? 0),
        },
      }),
    );
  });
}

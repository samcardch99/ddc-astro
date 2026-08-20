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

/** Full-screen image viewer (replaces react-photo-view). */
export function initLightbox(): void {
  const dialog = $<HTMLDialogElement>('[data-lightbox]');
  if (!dialog) return;

  const image = $<HTMLImageElement>('[data-lightbox-image]', dialog);
  const counter = $<HTMLElement>('[data-lightbox-counter]', dialog);
  const closeBtn = $<HTMLButtonElement>('[data-lightbox-close]', dialog);
  const prevBtn = $<HTMLButtonElement>('[data-lightbox-prev]', dialog);
  const nextBtn = $<HTMLButtonElement>('[data-lightbox-next]', dialog);
  if (!image) return;

  let group: HTMLElement[] = [];
  let position = 0;

  const render = () => {
    const trigger = group[position];
    if (!trigger) return;
    image.dataset.loaded = 'false';
    image.src = trigger.dataset.full ?? '';
    image.alt = trigger.querySelector('img')?.alt ?? '';
    if (counter) counter.textContent = `${position + 1} / ${group.length}`;
  };

  image.addEventListener('load', () => {
    image.dataset.loaded = 'true';
  });

  const step = (delta: number) => {
    if (!group.length) return;
    position = (position + delta + group.length) % group.length;
    render();
  };

  document.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-lightbox-open]');
    if (!trigger) return;
    event.preventDefault();

    const mode = trigger.dataset.galleryMode;
    group = $$<HTMLElement>(
      mode ? `[data-lightbox-open][data-gallery-mode="${mode}"]` : '[data-lightbox-open]',
    );
    position = group.indexOf(trigger);
    if (position < 0) position = 0;

    render();
    if (!dialog.open) dialog.showModal();
  });

  closeBtn?.addEventListener('click', () => dialog.close());
  prevBtn?.addEventListener('click', () => step(-1));
  nextBtn?.addEventListener('click', () => step(1));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
  });

  // Touch swipe
  let startX = 0;
  dialog.addEventListener(
    'touchstart',
    (event) => {
      startX = event.changedTouches[0]?.clientX ?? 0;
    },
    { passive: true },
  );
  dialog.addEventListener(
    'touchend',
    (event) => {
      const delta = (event.changedTouches[0]?.clientX ?? 0) - startX;
      if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1);
    },
    { passive: true },
  );
}

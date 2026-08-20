import { $, $$, prefersReducedMotion } from '../utils';

/** framer-motion easing curves used by the original Team section. */
const EASE_OUT = 'cubic-bezier(0, 0, 0.58, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.42, 0, 0.58, 1)';

type Frames = Keyframe[];

async function run(
  el: Element | null,
  frames: Frames,
  duration: number,
  easing = EASE_OUT,
): Promise<void> {
  if (!el || prefersReducedMotion()) return;
  try {
    await el.animate(frames, { duration, easing, fill: 'both' }).finished;
  } catch {
    /* the animation was cancelled by a newer one */
  }
}

/**
 * Desktop team section.
 *
 * Transitions mirror the framer-motion variants of Team.jsx:
 *   • member photo  — 0.25s easeOut, opacity/scale/y, AnimatePresence "wait"
 *   • name / bio    — 0.25s easeOut, opacity/y (+ blur on the name)
 *   • right column  — 0.45s easeOut, slides out to x:100% / video in from -100%
 *   • title + list  — 0.28s easeOut
 *
 * The roster itself is a native scroller (the React version used a vertical
 * Swiper) so the list is usable before JavaScript runs.
 */
export function initTeam(): void {
  const section = $<HTMLElement>('[data-team]');
  if (!section) return;

  const rows = $$<HTMLButtonElement>('[data-team-row]', section);
  const panels = $$<HTMLElement>('[data-team-panel]', section);
  const roster = $<HTMLElement>('[data-team-roster]', section);
  const culture = $<HTMLElement>('[data-team-culture]', section);
  const video = $<HTMLElement>('[data-team-video]', section);
  const panelStack = $<HTMLElement>('[data-team-panels]', section);
  const toggle = $<HTMLButtonElement>('[data-team-toggle]', section);
  const next = $<HTMLButtonElement>('[data-team-next]', section);

  let active = 0;
  let swapping = false;

  const parts = (panel: HTMLElement) => ({
    photo: panel.querySelector('[data-panel-photo]'),
    name: panel.querySelector('[data-panel-name]'),
    bio: panel.querySelector('[data-panel-bio]'),
  });

  const showPanel = (index: number) => {
    panels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.teamPanel) !== index;
    });
  };

  const enterPanel = (panel: HTMLElement) => {
    const { photo, name, bio } = parts(panel);
    void run(
      photo,
      [
        { opacity: 0, transform: 'scale(1.03) translateY(8px)' },
        { opacity: 1, transform: 'scale(1) translateY(0)' },
      ],
      250,
    );
    void run(
      name,
      [
        { opacity: 0, transform: 'translateY(10px)', filter: 'blur(2px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ],
      250,
    );
    void run(
      bio,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      250,
    );
  };

  const exitPanel = (panel: HTMLElement) => {
    const { photo, name, bio } = parts(panel);
    return Promise.all([
      run(photo, [{ opacity: 1, transform: 'scale(1) translateY(0)' }, { opacity: 0, transform: 'scale(0.98) translateY(-8px)' }], 250),
      run(name, [{ opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }, { opacity: 0, transform: 'translateY(-6px)', filter: 'blur(2px)' }], 250),
      run(bio, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }], 250),
    ]);
  };

  const setActive = async (index: number, scroll = false) => {
    if (index < 0 || index >= rows.length) return;

    rows.forEach((row, i) => row.setAttribute('aria-current', i === index ? 'true' : 'false'));
    if (scroll) rows[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    if (index === active || swapping) {
      active = index;
      return;
    }

    const outgoing = panels.find((panel) => Number(panel.dataset.teamPanel) === active);
    active = index;

    // AnimatePresence mode="wait": the old panel leaves before the new arrives.
    swapping = true;
    if (outgoing && !outgoing.hidden) await exitPanel(outgoing);
    showPanel(index);
    const incoming = panels.find((panel) => Number(panel.dataset.teamPanel) === index);
    if (incoming && section.dataset.mode === 'team') enterPanel(incoming);
    swapping = false;
  };

  rows.forEach((row, index) => row.addEventListener('click', () => void setActive(index)));
  next?.addEventListener('click', () => void setActive(Math.min(active + 1, rows.length - 1), true));

  // Scroll-spy stands in for Swiper's `onActiveIndexChange`.
  if (roster && rows.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.teamRow);
        if (!Number.isNaN(index)) void setActive(index);
      },
      { root: roster, rootMargin: '0px 0px -80% 0px', threshold: 0.1 },
    );
    rows.forEach((row) => observer.observe(row));
  }

  const videoEl = video?.querySelector('video') ?? null;

  const replayStagger = (items: HTMLElement[]) => {
    items.forEach((el) => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  };

  const setMode = async (mode: 'team' | 'culture') => {
    if (section.dataset.mode === mode) return;
    section.dataset.mode = mode;
    const isTeam = mode === 'team';

    // Title + button label crossfade (0.28s easeOut, AnimatePresence "wait").
    const labels = $$('[data-when]', section);
    await Promise.all(
      labels
        .filter((el) => !el.hidden)
        .map((el) => run(el, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }], 280)),
    );
    labels.forEach((el) => {
      el.hidden = el.getAttribute('data-when') !== mode;
    });
    labels
      .filter((el) => !el.hidden)
      .forEach((el) =>
        void run(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], 280),
      );

    if (isTeam) {
      // Video leaves to the left, the member column slides back to 0.
      void run(video, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-100%)', opacity: 0 }], 450).then(
        () => {
          if (video) video.hidden = true;
        },
      );
      if (panelStack) panelStack.hidden = false;
      showPanel(active);
      void run(panelStack, [{ transform: 'translateX(100%)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], 450);
      if (culture) {
        await run(culture, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }], 200, EASE_IN_OUT);
        culture.hidden = true;
      }
      videoEl?.pause();
      replayStagger(rows);
    } else {
      void run(panelStack, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(100%)', opacity: 0 }], 450).then(
        () => {
          if (panelStack) panelStack.hidden = true;
        },
      );
      if (video) video.hidden = false;
      void run(video, [{ transform: 'translateX(-100%)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], 450);
      if (culture) {
        culture.hidden = false;
        void run(culture, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], 280);
      }
      if (videoEl) {
        videoEl.muted = true;
        void videoEl.play().catch(() => {});
      }
      replayStagger($$('.team-culture-item', section));
    }
  };

  toggle?.addEventListener('click', () => {
    void setMode(section.dataset.mode === 'team' ? 'culture' : 'team');
  });

  showPanel(0);
}

/**
 * Mobile roster (TeamAccordion.jsx): one member open at a time, the panel
 * animates its height (0.32s cubic-bezier(.22,1,.36,1) open, 0.22s easeInOut
 * close) and each row reveals as it scrolls into view.
 */
export function initTeamAccordion(): void {
  const root = $<HTMLElement>('[data-team-accordion]');
  if (!root) return;

  const rows = $$<HTMLDetailsElement>('details', root);
  const reduce = prefersReducedMotion();

  const openRow = (row: HTMLDetailsElement) => {
    const panel = row.querySelector<HTMLElement>('.team-m-panel');
    row.open = true;
    if (!panel || reduce) return;
    const height = panel.scrollHeight;
    panel.animate([{ height: '0px' }, { height: `${height}px` }], {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  };

  const closeRow = (row: HTMLDetailsElement) => {
    const panel = row.querySelector<HTMLElement>('.team-m-panel');
    if (!panel || reduce) {
      row.open = false;
      return;
    }
    const height = panel.scrollHeight;
    const animation = panel.animate([{ height: `${height}px` }, { height: '0px' }], {
      duration: 220,
      easing: EASE_IN_OUT,
    });
    animation.finished
      .then(() => {
        row.open = false;
      })
      .catch(() => {
        row.open = false;
      });
  };

  rows.forEach((row) => {
    const summary = row.querySelector('summary');
    summary?.addEventListener('click', (event) => {
      event.preventDefault();
      if (row.open) {
        closeRow(row);
        return;
      }
      rows.forEach((other) => {
        if (other !== row && other.open) closeRow(other);
      });
      openRow(row);
    });
  });

  // `whileInView` with `viewport={{ once: true, amount: 0.35 }}`.
  const items = $$<HTMLElement>('.team-m-item', root);
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.visible = 'true';
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.35 },
  );
  items.forEach((item) => observer.observe(item));
}

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, prefersReducedMotion } from '../utils';

/** Full-screen menu: same GSAP timeline (and easing) as the React header. */
function initMenu(): void {
  const trigger = $<HTMLButtonElement>('#open-menu');
  const menu = $<HTMLElement>('#main-menu');
  if (!trigger || !menu) return;

  const timeline = gsap.timeline({
    paused: true,
    defaults: { duration: 0.5, ease: 'power2.out' },
  });

  timeline
    .fromTo(menu, { opacity: 0 }, { opacity: 1 })
    .fromTo(
      '.nav_left_items',
      { opacity: 0, translateY: '0.7rem' },
      { opacity: 1, translateY: '0' },
      '<0.01',
    )
    .fromTo('.nav_footer', { opacity: 0 }, { opacity: 1 }, '<0.3')
    .fromTo(
      '.nav_items',
      { translateY: '180%' },
      { translateY: '0%', stagger: 0.05, duration: 0.4, ease: 'power2.inOut' },
      '<',
    );

  let open = false;

  const openMenu = () => {
    if (open) return;
    open = true;
    menu.style.display = 'flex';
    menu.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    timeline.play();
  };

  const closeMenu = () => {
    if (!open) return;
    open = false;
    trigger.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    timeline.reverse();
  };

  timeline.eventCallback('onReverseComplete', () => {
    menu.style.display = 'none';
  });

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    openMenu();
  });

  $$('.close_menu', menu).forEach((el) => el.addEventListener('click', () => closeMenu()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

/** Hides the header while scrolling down past 600px, reveals it going back up. */
function initAutoHide(): void {
  const header = $<HTMLElement>('#header');
  if (!header || prefersReducedMotion()) return;

  let lastScrollY = window.scrollY;
  let hidden = false;

  const onScroll = () => {
    const current = window.scrollY;

    if (current > 600) {
      if (current > lastScrollY && !hidden) {
        // The React code passed `ease: "ease"`, which GSAP does not know — it
        // falls back to its default, power1.out.
        gsap.to(header, { y: '-100%', duration: 0.5, ease: 'power1.out' });
        hidden = true;
      } else if (current < lastScrollY && hidden) {
        gsap.to(header, { y: 0, duration: 0.5, ease: 'power1.out' });
        hidden = false;
      }
    } else if (hidden) {
      gsap.to(header, { y: 0, duration: 0.3, ease: 'power2.out' });
      hidden = false;
    }

    lastScrollY = current;
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

/**
 * Section-driven colour states. `#about` and the darker sections flip the
 * header to `is-dark`; `#technologies` flips it back to `is-clear`.
 */
function initColourStates(): void {
  const root = $<HTMLElement>('[data-header-scroll-states]');
  const header = $<HTMLElement>('#header');
  if (!root || !header) return;

  const states: Array<[string, string, string, string]> = [
    ['#about', 'is-dark', 'top top+=8%', 'bottom top+=8%'],
    ['#technologies', 'is-clear', 'top top+=18%', 'bottom'],
    ['#our-process', 'is-dark', 'top top+=18%', 'bottom'],
    ['#projects', 'is-dark', 'top top+=18%', 'bottom'],
    ['#testimonials', 'is-dark', 'top top+=18%', 'bottom'],
  ];

  states.forEach(([selector, className, start, end]) => {
    if (!document.querySelector(selector)) return;
    ScrollTrigger.create({
      trigger: selector,
      start,
      end,
      toggleClass: { targets: header, className },
    });
  });
}

export function initHeader(): void {
  initMenu();
  initAutoHide();
  initColourStates();
}

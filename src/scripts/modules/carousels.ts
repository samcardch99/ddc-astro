import { $, prefersReducedMotion } from '../utils';

/** framer-motion's `easeOut` — not the same curve as Tailwind's `ease-out`. */
const EASE_OUT = 'cubic-bezier(0, 0, 0.58, 1)';

/** Swiper is only fetched on pages that actually contain a carousel. */
export async function initCarousels(): Promise<void> {
  const projects = $<HTMLElement>('[data-projects-swiper]');
  const testimonials = $<HTMLElement>('[data-testimonials-swiper]');
  const culture = $<HTMLElement>('[data-culture-swiper]');

  if (!projects && !testimonials && !culture) return;

  const [{ default: Swiper }, modules] = await Promise.all([
    import('swiper'),
    import('swiper/modules'),
  ]);
  const { EffectCoverflow, EffectCards, Pagination, Autoplay, Navigation } = modules;

  if (projects) {
    const label = $<HTMLElement>('[data-projects-label]');
    const title = $<HTMLElement>('[data-projects-title]');

    /**
     * The React version wrapped this row in `<AnimatePresence mode="wait">`:
     * the old title leaves (opacity 0, y -8) before the new one enters
     * (opacity 0, y 8 → 0), each over 0.15s with framer's easeOut.
     */
    const swapTitle = (next: string) => {
      if (!title || title.textContent === next) return;
      if (!label || prefersReducedMotion()) {
        title.textContent = next;
        return;
      }

      const options: KeyframeAnimationOptions = {
        duration: 150,
        easing: EASE_OUT,
        fill: 'forwards',
      };

      label
        .animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }], options)
        .finished.then(() => {
          title.textContent = next;
          return label.animate(
            [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
            options,
          ).finished;
        })
        .catch(() => {
          title.textContent = next;
        });
    };

    const readTitle = (swiper: { realIndex: number; activeIndex: number; slides: HTMLElement[] }) => {
      const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex;
      const slide =
        swiper.slides.find((el) => Number(el.dataset.swiperSlideIndex) === index) ??
        swiper.slides[index];
      const next = slide?.dataset.projectTitle;
      if (next) swapTitle(next);
    };

    new Swiper(projects, {
      modules: [EffectCoverflow, Pagination, Autoplay, Navigation],
      centeredSlides: true,
      loop: true,
      loopAdditionalSlides: 1,
      effect: 'coverflow',
      grabCursor: true,
      slidesPerView: 'auto',
      navigation: { nextEl: '.projects-next', prevEl: '.projects-prev' },
      coverflowEffect: { rotate: 0, stretch: '49%', depth: 480, modifier: 1, slideShadows: false },
      autoplay: prefersReducedMotion() ? false : { delay: 3500, disableOnInteraction: true },
      pagination: {
        el: '.projects-pagination',
        clickable: true,
        renderBullet: (index: number, className: string) =>
          `<span class="${className}" aria-label="Go to slide ${index + 1}"></span>`,
      },
      on: { init: readTitle, slideChange: readTitle },
    });
  }

  if (testimonials) {
    new Swiper(testimonials, {
      modules: [EffectCards, Navigation],
      effect: 'cards',
      grabCursor: true,
      speed: 650,
      navigation: { nextEl: '.my-next', prevEl: '.my-prev' },
    });
  }

  if (culture) {
    const video = $<HTMLVideoElement>('[data-culture-video]');

    new Swiper(culture, {
      modules: [Autoplay],
      direction: 'vertical',
      slidesPerView: 3,
      loop: true,
      speed: 450,
      // The React component passed `autoplay` without a `delay`, so Swiper's
      // 3000 ms default is what the site actually shows.
      autoplay: prefersReducedMotion()
        ? false
        : { disableOnInteraction: false, pauseOnMouseEnter: false },
      allowTouchMove: true,
    });

    video?.play().catch(() => {});
  }
}

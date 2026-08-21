import { useEffect, useMemo, useRef, useState } from 'react';
import { PhotoSlider } from 'react-photo-view';

export type GalleryMode = 'renders' | 'reales';

export interface PhotoLightboxProps {
  /** Full-size sources per gallery, in the order they appear on the page. */
  galleries: Record<GalleryMode, string[]>;
}

interface OpenDetail {
  mode: GalleryMode;
  index: number;
}

export const LIGHTBOX_EVENT = 'ddc:lightbox';

/**
 * The photo viewer from the React app, kept as-is: `react-photo-view` gives
 * pinch zoom, drag-to-pan, rotate, swipe-to-close and the open animation that
 * grows out of the thumbnail you clicked.
 *
 * The gallery itself stays server-rendered — this island only mounts the
 * controlled `PhotoSlider` and waits for a click to be dispatched at it, so the
 * photos are in the HTML whether or not the island ever hydrates.
 */
export default function PhotoLightbox({ galleries }: PhotoLightboxProps) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<GalleryMode>('renders');
  const [index, setIndex] = useState(0);

  // `react-photo-view` reads this when opening and when closing, so it has to
  // track the thumbnail for whichever photo is currently on screen.
  const originRef = useRef<HTMLElement | null>(null);

  const pointOriginAt = (nextMode: GalleryMode, nextIndex: number) => {
    originRef.current = document.querySelector<HTMLElement>(
      `[data-lightbox-open][data-gallery-mode="${nextMode}"][data-position="${nextIndex}"] img`,
    );
  };

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenDetail>).detail;
      if (!detail) return;

      pointOriginAt(detail.mode, detail.index);
      setMode(detail.mode);
      setIndex(detail.index);
      setVisible(true);
    };

    window.addEventListener(LIGHTBOX_EVENT, onOpen);
    return () => window.removeEventListener(LIGHTBOX_EVENT, onOpen);
  }, []);

  const images = useMemo(
    () =>
      (galleries[mode] ?? []).map((src, i) => ({
        src,
        key: `${mode}-${i}`,
        originRef,
      })),
    [galleries, mode],
  );

  if (!images.length) return null;

  return (
    <PhotoSlider
      images={images}
      visible={visible}
      index={index}
      onIndexChange={(next) => {
        setIndex(next);
        pointOriginAt(mode, next);
      }}
      onClose={() => setVisible(false)}
      // <PhotoProvider>'s defaults, which is what the React app used: looping
      // past three photos (hence the left arrow on the first slide), a solid
      // backdrop, and pull-to-close. Notably `photoClosable` stays off — with
      // it on, tapping the photo closes the viewer instead of letting you pan
      // or zoom, which makes it almost unusable on a touch screen.
      maskOpacity={1}
      pullClosable
      bannerVisible
    />
  );
}

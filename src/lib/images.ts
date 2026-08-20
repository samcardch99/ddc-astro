import type { ImageMetadata } from 'astro';

/**
 * Every raster the site can show lives under `src/assets/`, so it goes through
 * `astro:assets` (WebP + responsive widths) instead of being served raw.
 *
 * `eager: true` only pulls in the image *metadata* at build time — sharp is
 * invoked lazily, and only for images actually handed to `<Image>`.
 */
const villaFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/**/*.{jpg,jpeg,JPG,JPEG,png,webp}',
  { eager: true },
);

const villaByKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(villaFiles)) {
  villaByKey.set(path.replace('../assets/images/', ''), mod.default);
}

/** Resolve `Villa_Sunset/1.jpeg` (relative to `src/assets/images`). */
export function villaAsset(key: string): ImageMetadata | undefined {
  return villaByKey.get(key);
}

/**
 * Resolve a legacy `/assets/images/Villa_Sunset/4.jpg` public path (the format
 * stored in villas.json) to its optimised counterpart.
 */
export function villaAssetFromPublicPath(publicPath: string): ImageMetadata | undefined {
  return villaAsset(publicPath.replace(/^\/?assets\/images\//, ''));
}

export type GalleryImage = { image: ImageMetadata; index: number };

/** The render gallery: `<folder>/1.jpeg … <folder>/<total>.jpeg`. */
export function renderGallery(folder: string, total: number): GalleryImage[] {
  const out: GalleryImage[] = [];
  for (let i = 1; i <= total; i += 1) {
    const image =
      villaAsset(`${folder}/${i}.jpeg`) ??
      villaAsset(`${folder}/${i}.jpg`) ??
      villaAsset(`${folder}/${i}.JPG`);
    if (image) out.push({ image, index: i });
  }
  return out;
}

/** The photographed gallery: `<folder>/Reales/1.jpg … `. */
export function realGallery(folder: string, total: number): GalleryImage[] {
  const out: GalleryImage[] = [];
  for (let i = 1; i <= total; i += 1) {
    const image =
      villaAsset(`${folder}/Reales/${i}.jpg`) ??
      villaAsset(`${folder}/Reales/${i}.jpeg`) ??
      villaAsset(`${folder}/Reales/${i}.JPG`);
    if (image) out.push({ image, index: i });
  }
  return out;
}

/* -------------------------------------------------------------------------
   Employee headshots, process accordion stills and technology imagery.
   ------------------------------------------------------------------------- */
const employeeFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/employees/*.{jpg,jpeg,png}',
  { eager: true },
);
const employeeByKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(employeeFiles)) {
  employeeByKey.set(path.replace('../assets/employees/', ''), mod.default);
}

/** Resolve a legacy `assets/employees/danilo.jpg` path from team.json. */
export function employeeAsset(publicPath: string): ImageMetadata | undefined {
  return employeeByKey.get(publicPath.replace(/^\/?assets\/employees\//, ''));
}

const accordionFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/accordion/*.{jpg,jpeg,webp,png}',
  { eager: true },
);
const accordionByKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(accordionFiles)) {
  accordionByKey.set(path.replace('../assets/accordion/', ''), mod.default);
}

/** Resolve a legacy `/assets/accordion/1.jpeg` path from accordion.json. */
export function accordionAsset(publicPath: string): ImageMetadata | undefined {
  return accordionByKey.get(publicPath.replace(/^\/?assets\/accordion\//, ''));
}

const technologyFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/technologies/*.{jpg,jpeg,webp,png,svg}',
  { eager: true },
);
const technologyByKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(technologyFiles)) {
  technologyByKey.set(path.replace('../assets/technologies/', ''), mod.default);
}

/** Resolve `cheap.svg` / `obra1.jpeg` from technologies.json. */
export function technologyAsset(name: string): ImageMetadata | undefined {
  return technologyByKey.get(name);
}

const projectCoverFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/projects/*.{jpg,jpeg,webp,png}',
  { eager: true },
);
const projectCoverByKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(projectCoverFiles)) {
  projectCoverByKey.set(path.replace('../assets/projects/', ''), mod.default);
}

/** Resolve `bg__1.jpeg` used by the home-page project carousel. */
export function projectCover(name: string): ImageMetadata | undefined {
  return projectCoverByKey.get(name);
}

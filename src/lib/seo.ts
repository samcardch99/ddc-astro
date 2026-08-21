import type { Lang } from '../i18n/ui';

type Meta = { title: string; description: string };

const descriptions: Record<Lang, string> = {
  es: 'La constructora de mejor reputación y mayor crecimiento del 2025. Con nuestro sistema modular DDC es capaz de construir más en menos tiempo. Liderado por el empresario cubano Danilo Dominguez.',
  en: 'The fastest-growing, best-reputed builder of 2025. DDC’s modular system builds more in less time. Led by Cuban entrepreneur Danilo Dominguez.',
};

const pages: Record<string, Record<Lang, Meta>> = {
  '/': {
    en: {
      title: 'DDC Developments: Modular construction company in Miami',
      description: descriptions.en,
    },
    es: {
      title: 'DDC Developments: Constructora modular en Miami',
      description: descriptions.es,
    },
  },
  '/team': {
    en: { title: 'Team | DDC Developments', description: 'The people behind DDC Developments — leadership, engineering, construction and sales.' },
    es: { title: 'Equipo | DDC Developments', description: 'El equipo de DDC Developments: dirección, ingeniería, construcción y ventas.' },
  },
  '/technologies': {
    en: {
      title: 'Technologies | DDC Developments',
      description: 'Inside the DDC panel system: steel-reinforced modular walls, roofs and floors built for speed, precision and durability.',
    },
    es: {
      title: 'Tecnologías | DDC Developments',
      description: 'El sistema de paneles DDC: muros, techos y suelos modulares reforzados con acero, diseñados para rapidez, precisión y durabilidad.',
    },
  },
  '/investments': {
    en: {
      title: 'Investments | DDC Developments',
      description: 'Invest with DDC Developments: an end-to-end platform from land acquisition to pre-sale, with construction-first modular delivery in Florida.',
    },
    es: {
      title: 'Inversiones | DDC Developments',
      description: 'Invierte con DDC Developments: plataforma integral desde la adquisición hasta la preventa, con construcción modular en Florida.',
    },
  },
  '/projects': {
    en: { title: 'DDC Developments | Projects', description: 'Villas and developments delivered by DDC Developments across Miami, Punta Gorda and Lehigh Acres.' },
    es: { title: 'DDC Developments | Proyectos', description: 'Villas y desarrollos entregados por DDC Developments en Miami, Punta Gorda y Lehigh Acres.' },
  },
  '/privacy-policy': {
    en: { title: 'Privacy Policy | DDC Developments', description: 'How DDC Developments collects, uses and protects your personal information.' },
    es: { title: 'Política de Privacidad | DDC Developments', description: 'Cómo DDC Developments recoge, usa y protege tu información personal.' },
  },
  '/404': {
    en: { title: 'Page not found | DDC Developments', description: 'The page you are looking for does not exist.' },
    es: { title: 'Página no encontrada | DDC Developments', description: 'La página que buscas no existe.' },
  },
};

/**
 * Breadcrumb labels live here rather than in the locale files, which are kept
 * byte-identical to the React app's so the two stay diffable.
 */
const crumbLabels: Record<string, Record<Lang, string>> = {
  '/': { en: 'Home', es: 'Inicio' },
  '/team': { en: 'Team', es: 'Equipo' },
  '/technologies': { en: 'Technologies', es: 'Tecnologías' },
  '/investments': { en: 'Investments', es: 'Inversiones' },
  '/projects': { en: 'Projects', es: 'Proyectos' },
  '/privacy-policy': { en: 'Privacy Policy', es: 'Política de Privacidad' },
};

export function crumbLabel(path: string, lang: Lang): string {
  return crumbLabels[path]?.[lang] ?? path;
}

/** `/technologies` -> Home > Technologies. The home page gets no trail. */
export function trailFor(path: string, lang: Lang) {
  if (path === '/') return [];
  return [
    { name: crumbLabel('/', lang), path: '/' },
    { name: crumbLabel(path, lang) },
  ];
}

/** `/projects/Villa_Sunset` -> Home > Projects > Villa Sunset. */
export function projectTrail(name: string, lang: Lang) {
  return [
    { name: crumbLabel('/', lang), path: '/' },
    { name: crumbLabel('/projects', lang), path: '/projects' },
    { name },
  ];
}

export function getMeta(path: string, lang: Lang): Meta {
  return pages[path]?.[lang] ?? pages['/'][lang];
}

/**
 * Words that leave a snippet dangling if it ends on them. Both languages, since
 * the same helper trims the Spanish copy.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'is', 'its', 'of', 'on', 'or', 'that',
  'the', 'their', 'this', 'to', 'was', 'were', 'with',
  'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'que',
  'se', 'su', 'sus', 'un', 'una', 'unos', 'unas', 'y',
]);

/** Google renders roughly 155 characters of a description before truncating. */
const DESCRIPTION_LIMIT = 155;

/**
 * Trims to the last sentence or word that fits, so the snippet never ends
 * mid-word. The source copy is a few paragraphs long; a hard `slice` cut it at
 * 300 characters in the middle of whatever word happened to be there.
 */
export function truncate(text: string, limit = DESCRIPTION_LIMIT): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;

  const window = clean.slice(0, limit + 1);
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
  if (sentence >= limit * 0.6) return window.slice(0, sentence + 1);

  let words = window.slice(0, window.lastIndexOf(' ') > 0 ? window.lastIndexOf(' ') : limit).split(' ');

  // `…preserves the…` is a complete word and still a bad place to stop, so a
  // trailing article or preposition goes with it.
  while (words.length > 1 && STOP_WORDS.has(words[words.length - 1].toLowerCase().replace(/[^\p{L}]/gu, ''))) {
    words = words.slice(0, -1);
  }

  return `${words.join(' ').replace(/[,;:—–-]$/, '')}…`;
}

/**
 * `Villa Sunset — Miami, FL | DDC Developments`. The city is the part someone
 * searching for a property actually types, and it comes straight out of
 * `villas.json`.
 */
export function projectMeta(name: string, description: string, city?: string): Meta {
  return {
    title: city ? `${name} — ${city}, FL | DDC Developments` : `${name} | DDC Developments`,
    description: truncate(description),
  };
}

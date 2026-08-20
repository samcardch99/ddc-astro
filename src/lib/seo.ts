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

export function getMeta(path: string, lang: Lang): Meta {
  return pages[path]?.[lang] ?? pages['/'][lang];
}

export function projectMeta(name: string, description: string): Meta {
  return {
    title: `${name} | DDC Developments`,
    description: description.trim().slice(0, 300),
  };
}

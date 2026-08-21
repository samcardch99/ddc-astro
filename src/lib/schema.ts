import { site } from './site';
import { localizePath, type Lang } from '../i18n/ui';

const abs = (path: string) => new URL(path, site.url).href;

/** Stable `@id`s so every node in every graph refers to the same entities. */
export const ids = {
  organization: `${site.url}/#organization`,
  website: `${site.url}/#website`,
  place: `${site.url}/#place`,
} as const;

/**
 * The company itself. `GeneralContractor` is a `LocalBusiness`, which is what
 * makes the name/address/phone eligible for the local results — a plain
 * `Organization` is not.
 */
export function organization() {
  return {
    '@type': ['GeneralContractor', 'HomeAndConstructionBusiness'],
    '@id': ids.organization,
    name: site.name,
    url: site.url,
    telephone: site.phoneHref.replace('tel:', ''),
    email: site.email,
    logo: {
      '@type': 'ImageObject',
      '@id': `${site.url}/#logo`,
      url: abs('/assets/svg/logo_letters.svg'),
      caption: site.name,
    },
    image: abs('/assets/og-image.jpg'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address,
      addressLocality: 'Doral',
      addressRegion: 'FL',
      postalCode: '33122',
      addressCountry: 'US',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 25.8069296, longitude: -80.3331930 },
    hasMap: site.mapsUrl,
    areaServed: [
      { '@type': 'State', name: 'Florida' },
      { '@type': 'City', name: 'Miami' },
    ],
    sameAs: [site.instagram, site.youtube],
    knowsLanguage: ['en', 'es'],
  };
}

/** Ties both language trees to one site entity. */
export function website(lang: Lang) {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    url: site.url,
    name: site.name,
    inLanguage: lang,
    publisher: { '@id': ids.organization },
  };
}

export interface Crumb {
  name: string;
  /** Locale-independent path, e.g. `/projects`. Omit on the final crumb. */
  path?: string;
}

/** Interior pages only — a breadcrumb whose single item is the home page is noise. */
export function breadcrumbs(trail: Crumb[], lang: Lang) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: abs(localizePath(crumb.path, lang)) } : {}),
    })),
  };
}

const squareFeet = (value: number | null | undefined) =>
  typeof value === 'number' && value > 0
    ? { '@type': 'QuantitativeValue', value: Math.round(value), unitCode: 'FTK' }
    : undefined;

/** `"$3.6 M"` -> `3600000`. Returns undefined for anything it cannot read. */
export function parsePrice(price: unknown): number | undefined {
  if (typeof price !== 'string') return undefined;
  const match = price.replace(/,/g, '').match(/([\d.]+)\s*([MK])?/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  const scale = match[2]?.toUpperCase() === 'M' ? 1e6 : match[2]?.toUpperCase() === 'K' ? 1e3 : 1;
  return amount * scale;
}

/**
 * `"7765 SW 57th Ter, Miami, FL 33143"` -> its parts.
 *
 * Three of the twenty-six addresses in `villas.json` are malformed — one is
 * just `"Florida, USA"`, one has no city, one has an em dash where the comma
 * should be — so the parse is forgiving and falls back to the `city` field,
 * which every project does have. An address-less listing loses the local
 * relevance that is the whole point of marking it up.
 */
export function parseAddress(address: unknown, city?: string) {
  const parts =
    typeof address === 'string'
      ? address.split(/[,]/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean)
      : [];

  let region: string | undefined;
  let postalCode: string | undefined;
  let locality: string | undefined;
  const street: string[] = [];

  for (const part of parts) {
    const stateZip = part.match(/^([A-Z]{2})(?:\s+(\d{5}))?$/);
    if (stateZip) {
      region = stateZip[1];
      postalCode = stateZip[2];
      continue;
    }
    // `Palmetto Bay, FL` and `Miami, FL 33143` both arrive as one part when the
    // separator upstream was something other than a comma.
    const trailing = part.match(/^(.*?)\s+([A-Z]{2})(?:\s+(\d{5}))?$/);
    if (trailing && parts.indexOf(part) > 0) {
      locality = trailing[1].replace(/\s*[—–-]\s*/, ' ').trim() || locality;
      region = trailing[2];
      postalCode = trailing[3];
      continue;
    }
    // `8151 SW — Palmetto Bay` uses a dash where the comma should be.
    const dashed = part.split(/\s+[—–]\s+/);
    if (dashed.length === 2 && /^\d/.test(dashed[0])) {
      street.push(dashed[0]);
      locality = dashed[1];
      continue;
    }
    if (/^\d/.test(part) || street.length === 0) street.push(part);
    else locality = part;
  }

  // `Florida, USA` names neither a street nor a city.
  const junk = /^(florida|fl|usa|us|united states)$/i;
  const streetAddress = street.filter((part) => !junk.test(part)).join(', ');
  const resolvedLocality = locality && !junk.test(locality) ? locality : city;
  if (!resolvedLocality) return undefined;

  return prune({
    '@type': 'PostalAddress' as const,
    streetAddress: streetAddress || undefined,
    addressLocality: resolvedLocality,
    addressRegion: region ?? 'FL',
    postalCode,
    addressCountry: 'US',
  });
}

export interface ProjectSchemaInput {
  project: Record<string, any>;
  description: string;
  url: string;
  images: string[];
  lang: Lang;
}

/**
 * A listing, not a plain `WebPage`: beds, baths, floor area and price are the
 * fields that make a property eligible for a rich result, and the data file
 * already carries every one of them.
 */
export function realEstateListing({ project, description, url, images, lang }: ProjectSchemaInput) {
  const price = parsePrice(project.price);
  const address = parseAddress(project.address, project.city);

  return prune({
    '@type': 'RealEstateListing',
    '@id': `${url}#listing`,
    url,
    name: project.name,
    description: description.replace(/\s+/g, ' ').trim(),
    inLanguage: lang,
    image: images,
    provider: { '@id': ids.organization },
    ...(price ? { offers: { '@type': 'Offer', price, priceCurrency: 'USD', availability: 'https://schema.org/InStock', seller: { '@id': ids.organization } } } : {}),
    about: prune({
      '@type': 'SingleFamilyResidence',
      name: project.name,
      address,
      numberOfBedrooms: project.bedrooms || undefined,
      numberOfBathroomsTotal: project.bathrooms || undefined,
      floorSize: squareFeet(project.living_area_sq_ft),
      lotSize: squareFeet(project.lot_area_sq_ft),
      amenityFeature: [
        project.pool === 'YES' ? { '@type': 'LocationFeatureSpecification', name: 'Pool', value: true } : undefined,
        project.garage ? { '@type': 'LocationFeatureSpecification', name: 'Garage', value: project.garage } : undefined,
      ].filter(Boolean),
    }),
  });
}

/** Drops undefined values and empty arrays so the emitted JSON stays clean. */
export function prune<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined).map(prune) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined || item === null || item === '') continue;
      if (Array.isArray(item) && item.length === 0) continue;
      out[key] = prune(item);
    }
    return out as T;
  }
  return value;
}

/** Wraps the page's nodes in one `@graph`, which is what Google prefers to see. */
export function graph(nodes: unknown[]) {
  return JSON.stringify(prune({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) }));
}

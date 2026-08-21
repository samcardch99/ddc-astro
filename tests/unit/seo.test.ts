import { describe, expect, it } from 'vitest';
import villas from '../../src/data/villas.json';
import { crumbLabel, getMeta, projectMeta, projectTrail, trailFor, truncate } from '../../src/lib/seo';
import { breadcrumbs, parseAddress, parsePrice, prune, realEstateListing } from '../../src/lib/schema';
import { locales } from '../../src/i18n/ui';

describe('meta descriptions', () => {
  it('never exceeds what a result page will show', () => {
    const long = 'A '.repeat(200);
    expect(truncate(long).length).toBeLessThanOrEqual(156);
  });

  it('stops at a word rather than mid-word', () => {
    const text = 'Architecturally distinctive residence renovated in twentytwentysix and located in the heart of Glenvar Heights where contemporary design preserves the original character';
    const result = truncate(text);
    expect(result.endsWith('…')).toBe(true);
    expect(text).toContain(result.slice(0, -1));
    expect(result.slice(0, -1).trim().split(' ').pop()).not.toBe('charact');
  });

  it('prefers a sentence boundary when one is close enough to the limit', () => {
    const sentence = 'Villa Tropical Oasis extends its warm minimalism outdoors into a lush tropical setting that frames every room.';
    const text = `${sentence} It then carries on for a good while longer than any snippet could hope to show a reader in a single line.`;
    // Ends on the full stop, with no ellipsis — the reader gets a whole thought.
    expect(truncate(text)).toBe(sentence);
  });

  it('does not leave the snippet dangling on an article or a preposition', () => {
    const text = `Architecturally distinctive residence renovated in 2026 and located in the very heart of Glenvar Heights, where contemporary design preserves the ${'x'.repeat(40)}`;
    const result = truncate(text);
    expect(result.endsWith('…')).toBe(true);
    expect(result.slice(0, -1).trim().split(' ').pop()).not.toBe('the');
  });

  it('trims the Spanish function words too', () => {
    const text = `Residencia de arquitectura distintiva renovada en 2026 y ubicada en el corazon de Glenvar Heights donde el diseno contemporaneo preserva el ${'x'.repeat(40)}`;
    expect(truncate(text).slice(0, -1).trim().split(' ').pop()).not.toBe('el');
  });

  it('falls back to a word boundary when the nearest sentence ends too early', () => {
    const text = `Short one. ${'word '.repeat(60)}`;
    expect(truncate(text)).not.toBe('Short one.');
    expect(truncate(text).endsWith('…')).toBe(true);
  });

  it('leaves short copy exactly as it was written', () => {
    expect(truncate('Short and finished.')).toBe('Short and finished.');
  });

  it('collapses the runs of whitespace the source copy is full of', () => {
    expect(truncate('a  b\n\nc')).toBe('a b c');
  });

  it('gives every page in every language a title and a description', () => {
    for (const path of ['/', '/team', '/technologies', '/investments', '/projects', '/privacy-policy', '/404']) {
      for (const lang of locales) {
        const meta = getMeta(path, lang);
        expect(meta.title.length, `${path} ${lang}`).toBeGreaterThan(10);
        expect(meta.title.length, `${path} ${lang}`).toBeLessThanOrEqual(62);
        expect(meta.description.length, `${path} ${lang}`).toBeGreaterThan(30);
      }
    }
  });

  it('names the city in a project title, which is what a buyer searches for', () => {
    const meta = projectMeta('Villa Sunset', 'A house.', 'Miami');
    expect(meta.title).toBe('Villa Sunset — Miami, FL | DDC Developments');
  });

  it('keeps every real project title inside the width a result page renders', () => {
    for (const project of villas) {
      const meta = projectMeta(project.name, project.description ?? 'x', project.city);
      expect(meta.title.length, project.name).toBeLessThanOrEqual(62);
    }
  });
});

describe('breadcrumbs', () => {
  it('gives the home page no trail — a one-item breadcrumb is noise', () => {
    expect(trailFor('/', 'en')).toEqual([]);
  });

  it('translates the labels', () => {
    expect(crumbLabel('/technologies', 'es')).toBe('Tecnologías');
    expect(trailFor('/team', 'es').map((crumb) => crumb.name)).toEqual(['Inicio', 'Equipo']);
  });

  it('numbers the items from one and leaves the last one without a link', () => {
    const list = breadcrumbs(projectTrail('Villa Sunset', 'en'), 'en') as any;
    expect(list.itemListElement.map((item: any) => item.position)).toEqual([1, 2, 3]);
    expect(list.itemListElement.at(-1)).not.toHaveProperty('item');
    expect(list.itemListElement[1].item).toContain('/projects');
  });

  it('points a Spanish trail at Spanish URLs', () => {
    const list = breadcrumbs(projectTrail('Villa Sunset', 'es'), 'es') as any;
    expect(list.itemListElement[1].item).toContain('/es/projects');
  });
});

describe('listing data', () => {
  it('reads the price formats the data file actually uses', () => {
    expect(parsePrice('$3.6 M')).toBe(3_600_000);
    expect(parsePrice('$650 K')).toBe(650_000);
    expect(parsePrice('$2 M')).toBe(2_000_000);
    expect(parsePrice(undefined)).toBeUndefined();
    expect(parsePrice('Ask')).toBeUndefined();
  });

  it('splits a well-formed address', () => {
    expect(parseAddress('7765 SW 57th Ter, Miami, FL 33143')).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '7765 SW 57th Ter',
      addressLocality: 'Miami',
      addressRegion: 'FL',
      postalCode: '33143',
      addressCountry: 'US',
    });
  });

  it('falls back to the city when the address names no locality', () => {
    const parsed = parseAddress('6525 SW 133rd Dr', 'Miami') as any;
    expect(parsed.addressLocality).toBe('Miami');
    expect(parsed.streetAddress).toBe('6525 SW 133rd Dr');
  });

  it('does not mistake a country for a city', () => {
    const parsed = parseAddress('Florida, USA', 'Miami') as any;
    expect(parsed.addressLocality).toBe('Miami');
    expect(parsed).not.toHaveProperty('streetAddress');
  });

  it('reads a dash used where the comma should be', () => {
    const parsed = parseAddress('8151 SW — Palmetto Bay, FL', 'Miami') as any;
    expect(parsed.addressLocality).toBe('Palmetto Bay');
    expect(parsed.streetAddress).toBe('8151 SW');
  });

  it('marks up every project in the data file with an address and a name', () => {
    for (const project of villas) {
      const listing = realEstateListing({
        project,
        description: 'x',
        url: 'https://ddcdevelopments.com/projects/x',
        images: ['https://ddcdevelopments.com/a.jpg'],
        lang: 'en',
      }) as any;
      expect(listing.name, project.name).toBeTruthy();
      expect(listing.about.address, project.name).toBeTruthy();
      expect(listing.about.address.addressLocality, project.name).toBeTruthy();
    }
  });

  it('omits an offer rather than inventing a price', () => {
    const listing = realEstateListing({
      project: { name: 'X', address: 'A St, Miami, FL 33143', price: null },
      description: 'x',
      url: 'https://ddcdevelopments.com/projects/x',
      images: [],
      lang: 'en',
    }) as any;
    expect(listing).not.toHaveProperty('offers');
  });
});

describe('prune', () => {
  it('drops the keys that would otherwise serialise as null', () => {
    expect(prune({ a: 1, b: undefined, c: null, d: '', e: [], f: [1] })).toEqual({ a: 1, f: [1] });
  });

  it('reaches into nested objects', () => {
    expect(prune({ a: { b: undefined, c: 2 } })).toEqual({ a: { c: 2 } });
  });
});

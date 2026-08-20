import { describe, expect, it } from 'vitest';
import {
  alternateLanguage,
  defaultLang,
  getLangFromUrl,
  localizePath,
  locales,
  stripLangFromPath,
  useTransHtml,
  useTranslations,
} from '../../src/i18n/ui';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';

describe('getLangFromUrl', () => {
  it('treats an unprefixed path as the default locale', () => {
    expect(getLangFromUrl(new URL('https://example.com/'))).toBe('en');
    expect(getLangFromUrl(new URL('https://example.com/projects/Villa_Sunset'))).toBe('en');
  });

  it('reads the locale out of a prefixed path', () => {
    expect(getLangFromUrl(new URL('https://example.com/es'))).toBe('es');
    expect(getLangFromUrl(new URL('https://example.com/es/team'))).toBe('es');
  });

  it('ignores a first segment that is not a known locale', () => {
    expect(getLangFromUrl('/esoteric/team')).toBe('en');
    expect(getLangFromUrl('/fr/team')).toBe('en');
  });
});

describe('localizePath', () => {
  it('leaves default-locale paths untouched', () => {
    expect(localizePath('/', 'en')).toBe('/');
    expect(localizePath('/team', 'en')).toBe('/team');
  });

  it('prefixes non-default locales', () => {
    expect(localizePath('/', 'es')).toBe('/es');
    expect(localizePath('/team', 'es')).toBe('/es/team');
    expect(localizePath('/projects/Villa_Sunset', 'es')).toBe('/es/projects/Villa_Sunset');
  });

  it('normalises paths that are missing a leading slash', () => {
    expect(localizePath('team', 'es')).toBe('/es/team');
  });

  it('round-trips with stripLangFromPath', () => {
    for (const lang of locales) {
      for (const path of ['/', '/team', '/projects/Villa_Ochoa']) {
        expect(stripLangFromPath(localizePath(path, lang))).toBe(path);
      }
    }
  });
});

describe('useTranslations', () => {
  it('resolves nested keys', () => {
    expect(useTranslations('en')('cover.faster')).toBe('Faster');
    expect(useTranslations('es')('cover.faster')).toBe(en.cover.faster === es.cover.faster ? 'Faster' : es.cover.faster);
  });

  it('falls back to the default locale for missing keys', () => {
    const t = useTranslations('es');
    // Present in en.json only.
    expect(t('technology_inside.images_title')).toBe(
      (es as Record<string, any>).technology_inside?.images_title ?? en.technology_inside.images_title,
    );
  });

  it('returns the key itself when nothing matches, so gaps are visible', () => {
    expect(useTranslations('en')('does.not.exist')).toBe('does.not.exist');
    expect(useTranslations('en')('does.not.exist', 'fallback')).toBe('fallback');
  });

  it('never returns an object for a partial key path', () => {
    expect(useTranslations('en')('cover')).toBe('cover');
  });
});

describe('useTransHtml', () => {
  it('replaces the i18next <0/> placeholder with a line break', () => {
    const transHtml = useTransHtml('en');
    expect(transHtml('investments.grid.1.title')).toBe(
      'End to end <br class="hidden lg:block" /> Platform',
    );
  });

  it('accepts a custom replacement', () => {
    expect(useTransHtml('en')('investments.grid.1.title', '<br />')).toBe(
      'End to end <br /> Platform',
    );
  });

  it('leaves strings without a placeholder alone', () => {
    expect(useTransHtml('en')('cover.faster')).toBe('Faster');
  });
});

describe('alternateLanguage', () => {
  it('flips between the two locales', () => {
    expect(alternateLanguage('en')).toBe('es');
    expect(alternateLanguage('es')).toBe('en');
  });
});

describe('locale configuration', () => {
  it('exposes exactly the locales the router builds', () => {
    expect(locales).toEqual(['en', 'es']);
    expect(defaultLang).toBe('en');
  });
});

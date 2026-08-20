import en from './en.json';
import es from './es.json';

export const languages = { en: 'English', es: 'Spanish' } as const;
export const languageLabels = { en: 'English', es: 'Español' } as const;
export const htmlLang = { en: 'en', es: 'es' } as const;
export const ogLocale = { en: 'en_US', es: 'es_ES' } as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'en';
export const locales: Lang[] = ['en', 'es'];

const dictionaries: Record<Lang, unknown> = { en, es };

function lookup(dict: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Reads the active language out of a URL. `/es/...` is Spanish, everything
 * else is the default locale.
 */
export function getLangFromUrl(url: URL | string): Lang {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const [, maybeLang] = pathname.split('/');
  return (locales as string[]).includes(maybeLang) ? (maybeLang as Lang) : defaultLang;
}

/**
 * Translation lookup with fallback to the default locale, then to the key
 * itself so a missing string is obvious rather than silently blank.
 */
export function useTranslations(lang: Lang) {
  return function t(key: string, fallback?: string): string {
    return (
      lookup(dictionaries[lang], key) ??
      lookup(dictionaries[defaultLang], key) ??
      fallback ??
      key
    );
  };
}

/**
 * i18next's `<Trans>` embedded `<0/>` placeholder for a `<br />`. Kept so the
 * translated copy breaks exactly where the original design breaks it.
 */
export function useTransHtml(lang: Lang) {
  const t = useTranslations(lang);
  return function transHtml(key: string, replacement = '<br class="hidden lg:block" />'): string {
    return t(key).replace(/<0\s*\/>/g, replacement);
  };
}

/** Strips the locale prefix from a pathname, returning a canonical `/foo` path. */
export function stripLangFromPath(pathname: string): string {
  const [, maybeLang, ...rest] = pathname.split('/');
  if ((locales as string[]).includes(maybeLang)) {
    const remainder = rest.join('/');
    return remainder ? `/${remainder}` : '/';
  }
  return pathname || '/';
}

/** Builds a locale-aware href: `/team` for `en`, `/es/team` for `es`. */
export function localizePath(path: string, lang: Lang): string {
  const canonical = path.startsWith('/') ? path : `/${path}`;
  if (lang === defaultLang) return canonical;
  return canonical === '/' ? `/${lang}` : `/${lang}${canonical}`;
}

/** The same page in the other language — used by the EN | ES toggle. */
export function alternateLanguage(lang: Lang): Lang {
  return lang === 'en' ? 'es' : 'en';
}

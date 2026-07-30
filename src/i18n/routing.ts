import { locales, defaultLocale, type Locale } from './index';

/** ÚNICO fichero autorizado a construir/concatenar prefijos de idioma en rutas internas. */

/**
 * ES → `undefined`: si algún día devuelve otra cosa para `defaultLocale`,
 * las 72 rutas españolas publicadas se mueven de sitio.
 */
export function localeParam(locale: Locale): string | undefined {
	return locale === defaultLocale ? undefined : locale;
}

export function localeStaticPaths(): Array<{
	params: { lang: string | undefined };
	props: { locale: Locale };
}> {
	return locales.map((locale) => ({
		params: { lang: localeParam(locale) },
		props: { locale },
	}));
}

export function collectionLocalePaths<T extends { id: string }>(
	entries: T[],
): Array<{
	params: { slug: string; lang: string | undefined };
	props: { entry: T; locale: Locale };
}> {
	return entries.flatMap((entry) =>
		locales.map((locale) => ({
			params: { slug: entry.id, lang: localeParam(locale) },
			props: { entry, locale },
		})),
	);
}

/**
 * ÚNICO constructor de enlaces internos del sitio. No acepta URLs externas,
 * `mailto:` ni anclas sueltas (`/#sobre-mi`) — quien las use debe dejarlas literales.
 */
export function localizedPath(locale: Locale, path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (locale === defaultLocale) return clean;
	if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return clean;
	return `/${locale}${clean}`;
}

/** Inversa de `localizedPath`. Se usa para hreflang y el conmutador de idioma del menú. */
export function stripLocale(pathname: string): string {
	for (const locale of locales) {
		if (locale === defaultLocale) continue;
		if (pathname === `/${locale}`) return '/';
		if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
	}
	return pathname;
}

export function alternatePaths(path: string): Record<Locale, string> {
	const canonical = stripLocale(path);
	return locales.reduce(
		(acc, locale) => {
			acc[locale] = localizedPath(locale, canonical);
			return acc;
		},
		{} as Record<Locale, string>,
	);
}

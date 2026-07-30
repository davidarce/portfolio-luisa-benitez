import { locales, defaultLocale, type Locale } from './index';

/**
 * ÚNICO fichero del repo autorizado a construir/concatenar prefijos de
 * idioma en rutas internas. Nada fuera de aquí debe escribir `/en/` a mano.
 *
 * Todas las páginas viven bajo `src/pages/[...lang]/...`: un parámetro rest
 * en la RAÍZ de `src/pages/`. En Astro un segmento de ruta solo existe si
 * aparece en `getStaticPaths` con un valor definido, así que `lang` es el
 * único punto donde se decide si la URL lleva o no el prefijo `/en`.
 */

/**
 * Valor del parámetro [...lang] para un idioma dado.
 *
 * ES → `undefined`: el segmento del rest param desaparece y la URL española
 * sale exactamente igual que hoy (sin `/es/`, sin cambios). Esta línea es la
 * que garantiza el requisito de compatibilidad de URLs publicadas: si algún
 * día devuelve otra cosa para `defaultLocale`, las 72 rutas españolas se
 * mueven de sitio.
 */
export function localeParam(locale: Locale): string | undefined {
	return locale === defaultLocale ? undefined : locale;
}

/** `getStaticPaths` de una página estática parametrizada por idioma (home, contact, índices). */
export function localeStaticPaths(): Array<{
	params: { lang: string | undefined };
	props: { locale: Locale };
}> {
	return locales.map((locale) => ({
		params: { lang: localeParam(locale) },
		props: { locale },
	}));
}

/** `getStaticPaths` de una ruta de colección: producto cartesiano de entradas × idiomas. */
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
 * ÚNICO constructor de enlaces internos del sitio. `path` SIEMPRE es la ruta
 * española canónica (empieza por '/'), la misma que se usaría hoy sin i18n.
 *
 * Reglas que este helper debe cumplir siempre, sin excepciones:
 * - `localizedPath('es', p) === p` siempre: el español no se toca jamás.
 * - No acepta URLs externas, `mailto:`, ni anclas sueltas (`/#sobre-mi`
 *   incluida) — esas rutas no representan una página propia bajo `[...lang]`
 *   y no deben pasar por aquí; quien las use debe dejarlas literales.
 * - Es idempotente: si `path` ya viene prefijada con el idioma pedido
 *   (p.ej. `/en/x/`), no se vuelve a prefijar.
 */
export function localizedPath(locale: Locale, path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (locale === defaultLocale) return clean;
	if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return clean;
	return `/${locale}${clean}`;
}

/**
 * Inversa de `localizedPath`: quita el prefijo de idioma si lo hay.
 * `/en/campaigns/` → `/campaigns/`; `/campaigns/` → `/campaigns/` (sin cambio).
 * Se usa para hreflang y para el conmutador de idioma del menú.
 */
export function stripLocale(pathname: string): string {
	for (const locale of locales) {
		if (locale === defaultLocale) continue;
		if (pathname === `/${locale}`) return '/';
		if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
	}
	return pathname;
}

/**
 * Mapa hreflang de una ruta canónica (ya sin prefijo de idioma):
 * `alternatePaths('/contact/')` → `{ es: '/contact/', en: '/en/contact/' }`.
 */
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

import { es, type Translation } from './es';
import { en } from './en';

export type Locale = 'es' | 'en';
export type { Translation };

const translations: Record<Locale, Translation> = { es, en };

/** Idiomas soportados, en orden. Útil para generar rutas o el toggle. */
export const locales: Locale[] = ['es', 'en'];

export const defaultLocale: Locale = 'es';

/**
 * Devuelve el diccionario del idioma pedido. Si llegara un valor imposible,
 * cae al español en vez de romper el render.
 */
export function getTranslation(locale: Locale): Translation {
	return translations[locale] ?? translations[defaultLocale];
}

/**
 * Deduce el idioma a partir de la URL. El inglés vive bajo /en/; todo lo demás
 * es español. Contempla el `base` del sitio por si algún día deja de ser '/'.
 */
export function getLocaleFromUrl(url: URL): Locale {
	const path = url.pathname.replace(import.meta.env.BASE_URL, '/').replace(/\/{2,}/g, '/');
	return path === '/en' || path.startsWith('/en/') ? 'en' : 'es';
}

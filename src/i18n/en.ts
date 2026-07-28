import type { Translation } from './es';

/**
 * Strings en inglés. El tipo `Translation` obliga a tener EXACTAMENTE las
 * mismas claves que es.ts: si falta una, o sobra, TypeScript falla. Los
 * valores son libres (es una traducción). La prosa larga y las categorías de
 * la Fase 2 se traducirán cuando el contenido en español esté cerrado.
 */
export const en: Translation = {
	meta: {
		siteTitle: 'Luisa Benítez — Fashion Stylist & Image Consultant',
		siteDescription:
			'Portfolio of Luisa Benítez — fashion stylist, image consultant and personal shopper. Editorial, campaigns, celebrity dressing, runway and film work.',
	},
	nav: {
		home: 'Home',
		editorial: 'Editorial',
		publicity: 'Campaigns',
		celebrities: 'Celebrities',
		films: 'Film & TV',
		runway: 'Runway',
		contact: 'Contact',
	},
	contact: {
		eyebrow: 'Contact',
		title: "Let's talk",
		lead: 'For editorial, campaign, or celebrity styling enquiries.',
		metaDescription:
			'Get in touch with Luisa Benítez, fashion stylist and image consultant, for editorial, campaign or celebrity styling enquiries.',
	},
	channels: {
		email: 'Email',
		instagram: 'Instagram',
		linkedin: 'LinkedIn',
	},
	details: {
		base: 'Based in',
		languages: 'Languages',
	},
	common: {
		downloadCv: 'Download CV',
		newWindowHint: '(opens in a new tab)',
	},
};

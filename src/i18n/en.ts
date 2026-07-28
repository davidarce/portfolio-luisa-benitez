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
		about: 'About',
		contact: 'Contact',
	},
	contact: {
		pageTitle: 'Contact — Luisa Benítez',
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
		linkedinValue: 'Professional profile',
	},
	details: {
		base: 'Based in',
		languages: 'Languages',
		availability: 'Availability',
	},
	profile: {
		country: 'Spain',
		languages: ['Spanish (native)', 'English'],
		services: [
			'Editorial styling',
			'Campaign styling and brand collaborations',
			'Celebrity and event styling',
			'Image consulting',
			'Personal shopping',
		],
		travelNote: 'Available to travel',
	},
	/**
	 * Traducción de la bio, no calco. Se conserva la voz: frases cortas y
	 * afirmativas en el ¶1, y el cierre «not as a costume» que en español es
	 * «no como un disfraz».
	 *
	 * REGLA DE ATRIBUCIÓN, innegociable: «he trabajado en» se traduce
	 * «I've worked on», nunca «I styled» ni «my editorial for». Casi todos esos
	 * proyectos fueron de asistencia y el rol lo declara la ficha de cada uno.
	 * Inglés británico, como el resto de en.ts («enquiries», «specialising»).
	 */
	about: {
		title: 'About — Luisa Benítez',
		metaDescription:
			'Luisa Benítez, fashion stylist based in A Coruña. Editorials for Numéro Netherlands, Vogue Adria and GQ México, brand campaigns and image consulting.',
		eyebrow: 'About',
		bio: [
			"If I can't find the piece I have in my head, I make it. I've cut up tights to make gloves and turned garments inside out because the original cut didn't fall the way I saw it. What I imagine, I want to see — and I find a way.",
			"I come from fashion design — I trained in Colombia before specialising in styling and image consulting in Spain — and it left me with a particular way of looking at clothes: I understand how a garment is built, not just how it looks. I've spent four years working in fashion, first in film, then as an agency assistant, and now independently. I've worked on editorials for Numéro Netherlands, Vogue Adria, GQ México and Mode Magazine, on campaigns for Bruno Magli, Alaniz, Agatha Paris and YSL, and on four Mercedes-Benz Fashion Week Madrid shows.",
			"Every brief asks for something different, and I don't treat them the same. An editorial can take maximalism — layers, texture, accessories with weight; a campaign asks for the product to lead and for the styling to step back. I enjoy the freedom of editorial more, but I respect the craft of commercial work and I know when to keep quiet. In both cases I'm after the same thing: that the look reads as the wearer's own, not as a costume.",
		],
		sections: { services: 'Services', featuredIn: 'Featured in' },
		cta: { contact: 'Contact', instagram: 'Instagram' },
	},
	common: {
		downloadCv: 'Download CV',
		newWindowHint: '(opens in a new tab)',
		portraitAlt: 'Luisa Benítez outdoors, reading a fashion magazine',
	},
};

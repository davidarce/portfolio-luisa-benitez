/**
 * Fuente única de verdad para los datos personales de Luisa.
 *
 * Cualquier dato de contacto, redes, servicios o medios debe vivir aquí y
 * consumirse desde los componentes/páginas — nunca hardcodearse en el markup.
 *
 * Nota i18n: los textos de cara al usuario (`role`, `languages`, `services`)
 * están en español. Cuando entre la Fase 4 (#38) se moverán a `src/i18n/`.
 */
export const profile = {
	name: 'Luisa Benítez',
	role: 'Fashion Stylist',
	baseCity: 'A Coruña',
	/**
	 * Región/país mostrado junto a `baseCity`. Antes vivía hardcodeado en
	 * contact.astro; las páginas deben componerlo como
	 * `${profile.baseCity}, ${profile.baseRegion}`.
	 */
	baseRegion: 'España',
	availableForTravel: true,
	languages: ['Español (nativo)', 'Inglés'],

	/** TODO(#17): cambiar a hello@luisabenitez.es cuando H-7 (#14) resuelva el backend de email. */
	email: 'luisafernandabenitezariza@gmail.com',

	instagram: {
		handle: '@luisabeniteza',
		url: 'https://instagram.com/luisabeniteza/',
	},

	/** TODO(H-2 / #9): rellenar si Luisa confirma perfil de LinkedIn. */
	linkedin: undefined as string | undefined,

	/**
	 * TODO(H-3 / #10): los PDFs aún no existen en public/cv/. Se deja a
	 * `undefined` a propósito para que las páginas oculten el enlace en vez de
	 * prometer una descarga que daría 404. Al añadir los ficheros, rellenar:
	 *   { es: '/cv/luisa-benitez-cv-es.pdf', en: '/cv/luisa-benitez-cv-en.pdf' }
	 */
	cvPath: undefined as { es: string; en: string } | undefined,

	/** Redacción cerrada en plan/03-content-pages/about-copy-final-es.md. */
	services: [
		'Estilismo editorial',
		'Estilismo de campaña y colaboraciones de marca',
		'Estilismo para celebridades y eventos',
		'Asesoría de imagen',
		'Personal shopper',
	],

	/**
	 * TODO(H-5 / #12): "Fucking Young" fuera — es el único de la lista sin
	 * proyecto que lo respalde en src/content/. Si se confirma la
	 * colaboración y el rol, se restaura junto con el proyecto, no antes.
	 */
	featuredIn: [
		'Numéro Netherlands',
		'Vogue Adria',
		'GQ México',
		'Mode Magazine',
	],
} as const;

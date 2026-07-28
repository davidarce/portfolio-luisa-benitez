/**
 * Fuente única de verdad para los datos personales de Luisa.
 *
 * Cualquier dato de contacto, redes o medios debe vivir aquí y consumirse desde
 * los componentes/páginas — nunca hardcodearse en el markup.
 *
 * REPARTO CON i18n (cerrado en la Fase 4): aquí solo van los datos que NO
 * cambian con el idioma. Todo lo que sea prosa traducible vive en
 * `src/i18n/es.ts` bajo la clave `profile`. Por eso `baseCity` ('A Coruña') está
 * aquí y el país ('España' / 'Spain') no; y por eso `featuredIn` está aquí —son
 * nombres propios de publicaciones— pero `services` no.
 *
 * Las páginas componen la base como `${profile.baseCity}, ${t.profile.country}`.
 */
export const profile = {
	name: 'Luisa Benítez',
	role: 'Fashion Stylist',
	baseCity: 'A Coruña',
	availableForTravel: true,

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

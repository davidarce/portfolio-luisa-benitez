/**
 * Strings en español — el idioma por defecto del sitio.
 *
 * `es.ts` es la fuente de la verdad: define la FORMA del diccionario. El tipo
 * `Translation` (derivado de aquí) obliga a que en.ts tenga exactamente las
 * mismas claves, así que al añadir una aquí TypeScript la exige también en
 * inglés. Los VALORES pueden diferir (para eso es una traducción); lo que se
 * comparte es la estructura.
 *
 * Alcance de P4-2: solo los strings de UI que ya existen en el sitio hoy. La
 * prosa larga (About, descripciones de proyecto) y las categorías renombradas
 * de la Fase 2 llegan cuando ese contenido esté cerrado (P4-3, P4-4).
 */
export const es = {
	meta: {
		siteTitle: 'Luisa Benítez — Estilista y Asesora de Imagen',
		siteDescription:
			'Portfolio de Luisa Benítez, estilista y asistente de moda, diseñadora de modas, asesora de imagen y personal shopper. Descubre sus trabajos en editoriales, publicidad, pasarela y cine.',
	},
	nav: {
		home: 'Inicio',
		editorial: 'Editorial',
		publicity: 'Publicidad',
		celebrities: 'Celebridades',
		films: 'Cine',
		runway: 'Runway',
		contact: 'Contacto',
	},
	contact: {
		eyebrow: 'Contacto',
		title: 'Hablemos',
		lead: 'Para encargos editoriales, campañas o vestuario de celebridades.',
		metaDescription:
			'Contacta con Luisa Benítez, estilista y asesora de imagen, para encargos editoriales, campañas o vestuario de celebridades.',
	},
	channels: {
		email: 'Email',
		instagram: 'Instagram',
		linkedin: 'LinkedIn',
	},
	details: {
		base: 'Base',
		languages: 'Idiomas',
	},
	common: {
		downloadCv: 'Descargar CV',
		newWindowHint: '(se abre en una pestaña nueva)',
	},
} as const;

/**
 * Ensancha los literales a su primitivo, de forma recursiva. Así el tipo del
 * diccionario describe la estructura ("cada hoja es un string") sin clavar el
 * valor español. es.ts (con `as const`) encaja porque un literal es asignable
 * a su primitivo; en.ts debe tener las mismas claves con valores string.
 */
type Widen<T> = T extends string
	? string
	: T extends number
		? number
		: T extends boolean
			? boolean
			: { [K in keyof T]: Widen<T[K]> };

/** Forma que deben cumplir todos los diccionarios de idioma. */
export type Translation = Widen<typeof es>;

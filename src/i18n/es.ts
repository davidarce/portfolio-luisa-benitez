/**
 * Strings en español — el idioma por defecto del sitio.
 *
 * `es.ts` es la fuente de la verdad: define la FORMA del diccionario. El tipo
 * `Translation` (derivado de aquí) obliga a que en.ts tenga exactamente las
 * mismas claves, así que al añadir una aquí TypeScript la exige también en
 * inglés. Los VALORES pueden diferir (para eso es una traducción); lo que se
 * comparte es la estructura.
 *
 * Alcance actual (P4-2 + P4-3 + P4-4): los strings de UI, la parte traducible
 * del perfil y la prosa del About. Quedan fuera las descripciones de proyecto y
 * las categorías renombradas de la Fase 2, que llegan cuando ese contenido esté
 * cerrado.
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
		about: 'Sobre mí',
		contact: 'Contacto',
	},
	contact: {
		/** Título de la pestaña. Distinto de `title`, que es el titular de la página. */
		pageTitle: 'Contacto — Luisa Benítez',
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
		/** Valor del canal de LinkedIn: la URL no se enseña, se enseña esto. */
		linkedinValue: 'Perfil profesional',
	},
	details: {
		base: 'Base',
		languages: 'Idiomas',
		availability: 'Disponibilidad',
	},
	/**
	 * La parte traducible de `src/data/profile.ts`. El reparto: profile.ts guarda
	 * los datos que NO cambian con el idioma (nombre, ciudad, email, redes) y aquí
	 * viven los que sí. Por eso el país está aquí y la ciudad no: «A Coruña» se
	 * escribe igual en inglés, «España» no.
	 */
	profile: {
		country: 'España',
		languages: ['Español (nativo)', 'Inglés'],
		services: [
			'Estilismo editorial',
			'Estilismo de campaña y colaboraciones de marca',
			'Estilismo para celebridades y eventos',
			'Asesoría de imagen',
			'Personal shopper',
		],
		travelNote: 'Disponible para viajar',
	},
	/**
	 * Copy de /about. Fuente: plan/03-content-pages/about-copy-final-es.md (aprobada).
	 * No editar aquí sin actualizar ese documento: es el contrato de contenido.
	 *
	 * `bio` es una tupla de 3: el tipo `Translation` obliga a que en.ts tenga
	 * exactamente 3 párrafos, ni uno más ni uno menos.
	 */
	about: {
		title: 'Sobre mí — Luisa Benítez',
		metaDescription:
			'Luisa Benítez, estilista de moda en A Coruña. Editoriales para Numéro Netherlands, Vogue Adria y GQ México, campañas de marca, celebridades y asesoría de imagen.',
		eyebrow: 'Sobre mí',
		bio: [
			'Si no encuentro la prenda que tengo en la cabeza, la fabrico. He hecho guantes cortando medias y he puesto prendas del revés porque el corte original no caía como yo lo veía. Lo que imagino lo quiero ver, y busco la forma.',
			'Vengo del diseño de modas —me formé en Colombia antes de especializarme en estilismo y asesoría de imagen en España— y eso me dejó una manera concreta de mirar la ropa: entiendo cómo está construida una prenda, no solo cómo se ve. Llevo cuatro años trabajando en moda, primero en cine, después como asistente en agencia, y hoy de forma independiente. He trabajado en editoriales para Numéro Netherlands, Vogue Adria, GQ México y Mode Magazine, en campañas para Bruno Magli, Alaniz, Agatha Paris e YSL, y en cuatro desfiles de Mercedes-Benz Fashion Week Madrid.',
			'Cada encargo pide algo distinto y no los trato igual. Una editorial admite maximalismo, capas, accesorios que pesan; una campaña pide que el producto sea el protagonista y que el estilismo sepa apartarse. Disfruto más la libertad de lo editorial, pero respeto el oficio de lo comercial y sé cuándo callarme. En los dos casos busco lo mismo: que el look se vea llevado como propio y no como un disfraz.',
		],
		sections: { services: 'Servicios', featuredIn: 'Publicaciones' },
		cta: { contact: 'Contacto', instagram: 'Instagram' },
	},
	common: {
		downloadCv: 'Descargar CV',
		newWindowHint: '(se abre en una pestaña nueva)',
		/** /about y /contact usan la MISMA foto: un solo alt, en un solo sitio. */
		portraitAlt: 'Luisa Benítez al aire libre, leyendo una revista de moda',
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

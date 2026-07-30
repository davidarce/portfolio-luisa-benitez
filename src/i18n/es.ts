/**
 * `es.ts` es la fuente de la verdad: define la FORMA del diccionario. El tipo
 * `Translation` (derivado de aquí) obliga a que en.ts tenga exactamente las mismas claves.
 */
export const es = {
	meta: {
		siteTitle: 'Luisa Benítez, estilista y asesora de imagen',
		siteDescription:
			'Portfolio de Luisa Benítez, estilista y asistente de moda, diseñadora de modas, asesora de imagen y personal shopper. Descubre sus trabajos en editoriales, publicidad, pasarela y cine.',
	},
	nav: {
		home: 'Inicio',
		editorial: 'Editorial',
		campaigns: 'Campañas',
		celebrityEvents: 'Celebridades y eventos',
		films: 'Cine',
		runway: 'Runway',
		about: 'Sobre mí',
		contact: 'Contacto',
	},
	home: {
		featuredWorkTitle: 'Trabajos destacados',
		tagline: 'Estilista y asistente de moda, Diseñadora de Modas, Asesora de Imagen y Personal Shopper',
	},
	contact: {
		/** Título de la pestaña, distinto de `title` (el titular de la página). */
		pageTitle: 'Contacto | Luisa Benítez',
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
	/** Parte traducible de `src/data/profile.ts`. Por eso el país está aquí y la ciudad no: «A Coruña» se escribe igual en inglés, «España» no. */
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
	/** Copy de /about. Fuente: plan/03-content-pages/about-copy-final-es.md (aprobada) — no editar aquí sin actualizar ese documento. */
	about: {
		title: 'Sobre mí | Luisa Benítez',
		metaDescription:
			'Luisa Benítez, estilista de moda en A Coruña. Editoriales para Numéro Netherlands, Vogue Adria y GQ México, campañas de marca, celebridades y asesoría de imagen.',
		eyebrow: 'Sobre mí',
		bio: [
			'Si no encuentro la prenda que tengo en la cabeza, la fabrico. He hecho guantes cortando medias y he puesto prendas del revés porque el corte original no caía como yo lo veía. Lo que imagino lo quiero ver, y busco la forma.',
			'Vengo del diseño de modas. Me formé en Colombia antes de especializarme en estilismo y asesoría de imagen en España, y eso me dejó una manera concreta de mirar la ropa: entiendo cómo está construida una prenda, no solo cómo se ve. Llevo cuatro años trabajando en moda, primero en cine, después como asistente en agencia, y hoy de forma independiente. He trabajado en editoriales para Numéro Netherlands, Vogue Adria, GQ México y Mode Magazine, en campañas para Bruno Magli, Alaniz, Agatha Paris e YSL, y en cuatro desfiles de Mercedes-Benz Fashion Week Madrid.',
			'Cada encargo pide algo distinto y no los trato igual. Una editorial admite maximalismo, capas, accesorios que pesan; una campaña pide que el producto sea el protagonista y que el estilismo sepa apartarse. Disfruto más la libertad de lo editorial, pero respeto el oficio de lo comercial y sé cuándo callarme. En los dos casos busco lo mismo: que el look se vea llevado como propio y no como un disfraz.',
		],
		sections: { services: 'Servicios', featuredIn: 'Publicaciones' },
	},
	common: {
		downloadCv: 'Descargar CV',
		newWindowHint: '(se abre en una pestaña nueva)',
		/** /about y /contact usan la MISMA foto: un solo alt, en un solo sitio. */
		portraitAlt: 'Luisa Benítez al aire libre, leyendo una revista de moda',
		back: 'Volver',
		languageLabel: 'Cambiar de idioma',
	},
	collections: {
		campaigns: {
			title: 'Campañas | Luisa Benítez',
			description: 'Campañas y colaboraciones de marca en las que ha trabajado Luisa Benítez',
		},
		celebrityEvents: {
			title: 'Celebridades y eventos | Luisa Benítez',
			description: 'Celebridades y eventos en los que ha trabajado Luisa Benítez',
		},
		editorials: {
			title: 'Editoriales | Luisa Benítez',
			description: 'Editoriales en las que ha trabajado Luisa Benítez',
		},
		films: {
			title: 'Cine | Luisa Benítez',
			description: 'Cine en el que ha trabajado Luisa Benítez',
		},
		runway: {
			title: 'Runway | Luisa Benítez',
			description: 'Desfiles en los que ha trabajado Luisa Benítez',
		},
	},
	/** `role` cubre los 4 valores del enum `gallerySchema` en src/content.config.ts. */
	credits: {
		role: {
			'lead-stylist': 'Estilista principal',
			'assistant-stylist': 'Asistente de estilismo',
			'wardrobe-assistant': 'Asistente de vestuario',
			'co-stylist': 'Co-estilista',
		},
		leadStylistLabel: 'Estilista principal:',
		labels: {
			photographer: 'Fotografía',
			director: 'Dirección',
			muah: 'Maquillaje y peluquería',
			talent: 'Talento',
			talentAgency: 'Agencia',
			artDirection: 'Dirección de arte',
			production: 'Producción',
			location: 'Localización',
		},
		format: {
			'model-test': 'Model test',
		},
	},
} as const;

/** Ensancha los literales a su primitivo para que el tipo describa la estructura sin clavar el valor español. */
type Widen<T> = T extends string
	? string
	: T extends number
		? number
		: T extends boolean
			? boolean
			: { [K in keyof T]: Widen<T[K]> };

export type Translation = Widen<typeof es>;

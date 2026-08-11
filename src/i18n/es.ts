/**
 * `es.ts` es la fuente de la verdad: define la FORMA del diccionario. El tipo
 * `Translation` (derivado de aquí) obliga a que en.ts tenga exactamente las mismas claves.
 */
export const es = {
	meta: {
		siteTitle: 'Luisa Benítez, estilista y asesora de imagen',
		siteDescription:
			'Portfolio de Luisa Benítez, estilista y asistente de moda, diseñadora de modas, asesora de imagen y personal shopper. Descubre sus trabajos en editoriales, campañas, celebridades, pasarela y cine.',
	},
	nav: {
		home: 'Inicio',
		editorial: 'Editorial',
		campaigns: 'Campañas',
		celebrityEvents: 'Celebridades',
		films: 'Cine',
		runway: 'Runway',
		about: 'Sobre mí',
		contact: 'Contacto',
	},
	home: {
		heroAlt:
			'Luisa Benítez ajustando la cola de un vestido de tul en una sesión de estudio',
		featuredWorkTitle: 'Trabajos destacados',
		tagline: 'Estilista y asistente de moda, diseñadora de modas, asesora de imagen y personal shopper',
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
			'Vengo del diseño de modas. Me formé en Colombia antes de especializarme en estilismo y asesoría de imagen en España, y eso me dejó una manera concreta de mirar la ropa: entiendo cómo está construida una prenda, no solo cómo se ve. Llevo cinco años trabajando en moda, primero en diseño de moda en Colombia, luego en pasarela y cine, después como asistente en agencia, y hoy de forma independiente. He trabajado en editoriales para Vogue Adria, GQ México, Numéro Netherlands y Pap Magazine, en campañas para Bruno Magli, Alaniz, Agatha Paris e YSL, en desfiles de Mercedes-Benz Fashion Week Madrid, y con celebridades como Zara Larsson, Aitana o Miguel Herrán en eventos y presentaciones.',
			'Si no encuentro la prenda que tengo en la cabeza, la fabrico. He hecho guantes cortando medias y he puesto prendas del revés porque el corte original no caía como yo lo veía. Lo que imagino lo quiero ver, y busco la forma.',
			'Cada encargo pide algo distinto y no los trato igual. Una editorial admite maximalismo, capas, accesorios que pesan; una campaña pide que el producto sea el protagonista y que el estilismo sepa apartarse. Disfruto más la libertad de lo editorial, pero respeto el oficio de lo comercial y sé cuándo callarme. En los dos casos busco lo mismo: que el look se vea llevado como propio y no como un disfraz.',
			'Me muevo con la misma soltura en moda femenina y masculina. Cuido el detalle, en el set trabajo sin tensión, y cada encargo acaba llevándose algo que no estaba en el guion.',
		],
		sections: { services: 'Servicios', featuredIn: 'Publicaciones' },
	},
	/**
	 * Plantilla de impresión /cv (#35): de aquí salen los PDF vía
	 * scripts/generate-cv.mjs. Los «[PENDIENTE: …]» son datos que debe confirmar
	 * Luisa (#10) — el PDF no se publica mientras quede alguno. Los recuentos
	 * se inyectan en `{n}` desde las colecciones para que el CV no pueda
	 * contradecir a la web.
	 */
	cv: {
		title: 'CV | Luisa Benítez',
		role: 'Estilista y asesora de imagen',
		headings: {
			profile: 'Perfil',
			experience: 'Experiencia',
			education: 'Formación',
			languages: 'Idiomas',
			portfolio: 'Portfolio',
			skills: 'Competencias',
		},
		/**
		 * Sustituyen a «Servicios» en el CV: la web ya vende servicios a clientes,
		 * pero un empleador quiere saber qué sabe hacer dentro de un equipo. Sin
		 * «lookbook» a propósito: no tiene experiencia y es verificable.
		 */
		skills: [
			'Composición de looks',
			'Creación de moodboards',
			'Fichas técnicas de producto',
			'Fitting',
			'Preparación de shooting',
			'Showroom y alquiler de vestuario',
			'Coordinación con fotografía y dirección de arte',
		],
		profileText:
			'Vengo del diseño de modas: me formé en Colombia antes de especializarme en estilismo y asesoría de imagen en España. Llevo cinco años trabajando en moda: primero en diseño de moda en Colombia, luego en pasarela y cine, después como asistente en agencia y hoy de forma independiente. He trabajado en editoriales para Vogue Adria, GQ México, Numéro Netherlands y Pap Magazine, en campañas para Bruno Magli, Alaniz, Agatha Paris e YSL, y en desfiles de Mercedes-Benz Fashion Week Madrid.',
		experience: {
			freelance: {
				role: 'Estilista independiente',
				org: 'Madrid',
				dates: 'Desde febrero de 2026',
				summary:
					'{n} proyectos como estilista principal: editoriales para Artego Magazine, Pap Magazine, Folie Magazine y Mode Magazine, y estilismo de celebridades para eventos, festivales y televisión.',
			},
			agency: {
				role: 'Asistente de estilismo',
				org: 'Agencias Saik Spain y Stella Creatives London',
				dates: 'Marzo – agosto de 2025 (por proyectos)',
				summary:
					'{n} proyectos asistiendo a la estilista Caterina Ospina: editoriales para Numéro Netherlands, Vogue Adria y GQ México; campañas para YSL, Bruno Magli, Kérastase, Agatha Paris, Alaniz, Redken, GHD, Prime Video y Vogue España; y vestuario de celebridades en eventos.',
			},
			runway: {
				role: 'Estilista y asistente de vestuario',
				org: 'Mercedes-Benz Fashion Week Madrid · Premios Nacionales a la Moda ANDE',
				dates: 'Febrero de 2023 – septiembre de 2025',
				summary:
					'5 desfiles: estilista en Claro Couture, y asistente de vestuario en los Premios Nacionales a la Moda ANDE y en Ángel Schlesser (3 temporadas).',
			},
			/**
			 * «Auxiliar de vestuario» y «prácticas» son el cargo y la modalidad
			 * reales del historial de Luisa — la web acredita el proyecto como
			 * asistencia de estilismo, pero en el CV no se infla el título.
			 * Elástica Films produjo «La mitad de Ana»: son el mismo trabajo.
			 */
			film: {
				role: 'Auxiliar de vestuario (prácticas)',
				org: 'Elástica Films — Cine, «La Mitad de Ana» · Madrid',
				dates: 'Mayo – julio de 2023',
				summary:
					'Pruebas de vestuario, vestir a actores y figuración, y ruta de tiendas, showrooms y alquiler.',
			},
			/**
			 * El cargo del historial era «editora de fotografía de moda», pero
			 * describe mal el trabajo: no editaba imagen para publicar, montaba
			 * las propuestas de estampado y color que el equipo de diseño usaba
			 * para decidir qué se fabricaba. De ahí el título y el resumen.
			 */
			crystal: {
				role: 'Diseñadora de moda — estampados y color (freelance)',
				org: 'Grupo Crystal S.A.S — Medellín, Colombia',
				dates: 'Marzo de 2021 – marzo de 2022',
				summary:
					'Fichas técnicas y visualización digital de estampados y color sobre fotografía de producto, para decidir qué se fabricaba sin muestra física. Marcas: Gef, Punto Blanco, Baby Fresh y Galax.',
			},
		},
		/**
		 * Nomenclatura verificada, no «corregir»: Davante (con a) es la marca
		 * actual de MasterD tras fusionarse con MEDAC en 2025: Luisa estudió
		 * cuando aún era MasterD, así que se nombran las dos.
		 */
		education: [
			{
				degree: 'Asesoría de Imagen Personal y Corporativa',
				org: 'MasterD, Escuela Profesional CreaDiseño (hoy Davante) — Madrid, España',
				dates: 'Enero de 2024 – noviembre de 2025',
			},
			{
				degree: 'Estilismo y Personal Shopper',
				org: 'MasterD, Escuela Profesional CreaDiseño — Madrid, España',
				dates: 'Mayo de 2022 – noviembre de 2023',
			},
			{
				degree: 'Diseño de Modas',
				org: 'Cesde, Centro de Estudios Especializados — Medellín, Colombia',
				dates: 'Enero de 2019 – diciembre de 2020',
			},
		],
		languages: ['Español (nativo)', 'Inglés — B1 (intermedio)'],
	},
	common: {
		downloadCv: 'Descargar CV',
		newWindowHint: '(se abre en una pestaña nueva)',
		/** /about y /contact usan la MISMA foto: un solo alt, en un solo sitio. */
		portraitAlt: 'Luisa Benítez agachada en una calle al anochecer, con camisa blanca y peto negro',
		back: 'Volver',
		skipToContent: 'Saltar al contenido',
		languageLabel: 'Cambiar de idioma',
	},
	viewer: {
		label: 'Visor de galería',
		/** Distinta de `label`: con el mismo texto en las dos, VoiceOver lo lee dos veces seguidas al entrar. */
		sound: 'Activar o silenciar el sonido',
		rail: 'Fotos y vídeos del proyecto',
		close: 'Cerrar el visor',
		previous: 'Anterior',
		next: 'Siguiente',
		/** Se rellena en el cliente: {current} y {total}. */
		position: '{current} de {total}',
		openImage: 'Ampliar la imagen {n} de {total}',
		openVideo: 'Ampliar el vídeo {n} de {total}',
		altImage: 'Imagen {n} de {total}: {title}',
		altVideo: 'Vídeo {n} de {total}: {title}',
		/** Mitigación de WCAG 2.2.2 tras quitar `controls` del grid. */
	},
	collections: {
		campaigns: {
			heading: 'Campañas',
			title: 'Campañas | Luisa Benítez',
			description: 'Campañas y colaboraciones de marca en las que ha trabajado Luisa Benítez',
		},
		celebrityEvents: {
			heading: 'Celebridades',
			title: 'Celebridades y eventos | Luisa Benítez',
			description: 'Celebridades y eventos en los que ha trabajado Luisa Benítez',
		},
		editorials: {
			heading: 'Editoriales',
			title: 'Editoriales | Luisa Benítez',
			description: 'Editoriales en las que ha trabajado Luisa Benítez',
		},
		films: {
			heading: 'Cine',
			title: 'Cine | Luisa Benítez',
			description: 'Cine en el que ha trabajado Luisa Benítez',
		},
		runway: {
			heading: 'Runway',
			title: 'Runway | Luisa Benítez',
			description: 'Desfiles en los que ha trabajado Luisa Benítez',
		},
	},
	/** `role` cubre los 4 valores del enum `gallerySchema` en src/content.config.ts. */
	credits: {
		heading: 'Créditos',
		role: {
			'lead-stylist': 'Estilista',
			'assistant-stylist': 'Asistente Estilismo',
			'wardrobe-assistant': 'Asistente de Vestuario',
			'co-stylist': 'Coestilista',
		},
		labels: {
			photographer: 'Fotografía',
			director: 'Dirección',
			muah: 'Maquillaje y peluquería',
			makeup: 'Maquillaje',
			hair: 'Peluquería',
			setDesign: 'Escenografía',
			stylingTeam: 'Equipo de estilismo',
			video: 'Vídeo',
			talent: 'Talento',
			talentAgency: 'Agencia',
			artDirection: 'Dirección de arte',
			production: 'Producción',
			location: 'Localización',
		},
		format: {
			'model-test': 'Model test',
		},
		onInstagram: 'en Instagram',
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

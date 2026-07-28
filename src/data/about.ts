/**
 * Copy de /about, en español. Fuente: plan/03-content-pages/about-copy-final-es.md
 * (aprobada). No editar aquí sin actualizar ese documento: es el contrato de contenido.
 *
 * Nota i18n (#38/#39): este objeto tiene la forma de un diccionario de `src/i18n/es.ts`
 * (PR #57, aún sin mergear). Cuando entre la Fase 4 se mueve tal cual bajo la clave `about:`
 * y `en.ts` lo traduce.
 *
 * RESTRICCIÓN DE FORMA (para que esa migración sea mecánica):
 *   - solo objetos planos anidados, strings y arrays de strings;
 *   - nada de funciones, placeholders de interpolación, imports ni datos derivados;
 *   - `bio` es una tupla de 3 párrafos: `en.ts` deberá tener exactamente 3.
 *
 * IMPORTADOR ÚNICO: solo `src/pages/about.astro` puede importar este módulo. Verificado con
 * `grep -rn "data/about" src | grep -v "pages/about.astro"` (debe salir vacío).
 */
export const about = {
	/** Título de la pestaña. Vive aquí, no en la plantilla: es copy traducible como el resto. */
	title: 'Sobre mí — Luisa Benítez',
	/**
	 * Redactada, no extraída de la bio (decisión de David): las dos primeras frases del ¶1
	 * son buena prosa de página pero mala descripción SEO. Pendiente de aprobación de David
	 * antes del merge.
	 */
	metaDescription:
		'Luisa Benítez, estilista de moda en A Coruña. Editoriales para Numéro Netherlands, Vogue Adria y GQ México, campañas de marca, celebridades y asesoría de imagen.',
	eyebrow: 'Sobre mí',
	/** Párrafos verbatim de la copy aprobada. El orden es el orden de lectura. */
	bio: [
		'Si no encuentro la prenda que tengo en la cabeza, la fabrico. He hecho guantes cortando medias y he puesto prendas del revés porque el corte original no caía como yo lo veía. Lo que imagino lo quiero ver, y busco la forma.',
		'Vengo del diseño de modas —me formé en Colombia antes de especializarme en estilismo y asesoría de imagen en España— y eso me dejó una manera concreta de mirar la ropa: entiendo cómo está construida una prenda, no solo cómo se ve. Llevo cuatro años trabajando en moda, primero en cine, después como asistente en agencia, y hoy de forma independiente. He trabajado en editoriales para Numéro Netherlands, Vogue Adria, GQ México y Mode Magazine, en campañas para Bruno Magli, Alaniz, Agatha Paris e YSL, y en cuatro desfiles, tres de ellos en Mercedes-Benz Fashion Week Madrid.',
		'Cada encargo pide algo distinto y no los trato igual. Una editorial admite maximalismo, capas, accesorios que pesan; una campaña pide que el producto sea el protagonista y que el estilismo sepa apartarse. Disfruto más la libertad de lo editorial, pero respeto el oficio de lo comercial y sé cuándo callarme. En los dos casos busco lo mismo: que el look se vea llevado como propio y no como un disfraz.',
	],
	sections: { services: 'Servicios', featuredIn: 'Publicaciones' },
	/** Etiquetas de la <dl>. `travelNote` es un VALOR, no una etiqueta — de ahí el nombre. */
	details: { base: 'Base', languages: 'Idiomas', availability: 'Disponibilidad' },
	travelNote: 'Disponible para viajar',
	cta: { contact: 'Contacto', instagram: 'Instagram' },
	portraitAlt: 'Luisa Benítez al aire libre, leyendo una revista de moda',
} as const;

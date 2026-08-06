import { defineCollection, z } from 'astro:content';
import { createGalleryLoader } from './loaders/gallery-loader';

// El widget "Sin fijar" del CMS (y cualquier otro select/texto que la usuaria
// vacíe) escribe `""` en vez de omitir el campo. Zod trata `""` como un
// string válido, no como "ausente", así que un `.optional()` a secas no basta:
// hay que normalizar `""` a `undefined` antes de validar. Se aplica a todo
// campo opcional del esquema, no solo a `pin`, porque el CMS puede vaciar
// cualquiera de ellos de la misma forma.
const optional = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const gallerySchema = z.object({
	title: z.string(),
	description: optional(z.string()),
	/** Vacía a propósito hoy: la copy de proyecto es de Luisa y no se inventa. Las plantillas hacen `descriptionEn ?? description`. */
	descriptionEn: optional(z.string()),
	img: z.string(),
	img_alt: optional(z.string()),
	cardSize: z.enum(['normal', 'tall', 'wide']).default('normal'),
	aspectRatio: z.string().default('3 / 4'),
	objectPosition: optional(z.string()),
	images: z.array(z.string()),
	// Fuente del orden y la visibilidad de `images`: el CMS edita este campo,
	// no el sistema de ficheros. Ocultar una foto no la borra del disco.
	gallery: z
		.array(
			z.object({
				// Ruta pública completa (p. ej. "/assets/editorials/slug/1.webp"), la
				// misma que acaba en el HTML. Así el CMS resuelve la miniatura sin
				// conocer baseDir/slug/basePath del loader.
				file: z.string(),
				hidden: z.boolean().optional(),
				// Portada elegida a mano. Como mucho una entrada por proyecto la trae;
				// el loader decide qué hacer si no hay ninguna marcada.
				cover: z.boolean().optional(),
			}),
		)
		.optional(),
	hasGallery: z.boolean().default(true),
	order: z.number().default(0),

	// Curaduría manual de la home: sube un proyecto a «Trabajos destacados»
	// aunque el orden por rol no lo colocaría ahí. No altera los listados.
	featured: z.boolean().optional(),

	// Ancla un proyecto al principio o al final de SU listado, por encima del
	// orden por rol. Decisión editorial explícita, no automatismo. `optional()`
	// (no `.optional()` a secas) para tragar el "Sin fijar" del CMS, que
	// escribe `pin: ""` en vez de omitir el campo.
	pin: optional(z.enum(['first', 'last'])),

	role: z.enum(['lead-stylist', 'assistant-stylist', 'wardrobe-assistant', 'co-stylist']),
	roleDetail: optional(z.string()),
	leadStylist: optional(z.string()),

	year: optional(z.number()),
	season: optional(z.string()),
	client: optional(z.string()),
	publication: optional(z.string()),
	format: optional(z.enum(['editorial', 'campaign', 'social', 'runway', 'event', 'film', 'model-test'])),

	// Sin placeholders: si el dato no existe todavía, el campo se omite y no se pinta.
	credits: z
		.object({
			photographer: optional(z.string()),
			director: optional(z.string()),
			muah: optional(z.string()),
			makeup: optional(z.string()),
			hair: optional(z.string()),
			setDesign: optional(z.string()),
			stylingTeam: optional(z.string()),
			video: optional(z.string()),
			talent: optional(z.string()),
			talentAgency: optional(z.string()),
			artDirection: optional(z.string()),
			production: optional(z.string()),
			location: optional(z.string()),
		})
		.optional(),
});

export const collections = {
	// Renombrada de "celebrities"; el directorio ("celebrities") se queda como está
	// a propósito para no chocar con otro agente trabajando en paralelo en esos ficheros.
	'celebrity-events': defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/celebrities',
			jsonPath: './src/content/celebrities/celebrities.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
			basePath: '',
		}),
		schema: gallerySchema,
	}),
	editorials: defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/editorials',
			jsonPath: './src/content/editorials/editorials.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
			basePath: '',
		}),
		schema: gallerySchema,
	}),
	// Renombrada de "publicity"; misma asimetría que "celebrity-events" arriba.
	campaigns: defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/publicity',
			jsonPath: './src/content/publicity/publicity.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
			basePath: '',
		}),
		schema: gallerySchema,
	}),
	runway: defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/runway',
			jsonPath: './src/content/runway/runway.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
			basePath: '',
		}),
		schema: gallerySchema,
	}),
	films: defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/films',
			jsonPath: './src/content/films/films.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
			basePath: '',
		}),
		schema: gallerySchema,
	}),
};
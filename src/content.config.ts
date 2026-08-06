import { defineCollection, z } from 'astro:content';
import { createGalleryLoader } from './loaders/gallery-loader';

const gallerySchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	/** Vacía a propósito hoy: la copy de proyecto es de Luisa y no se inventa. Las plantillas hacen `descriptionEn ?? description`. */
	descriptionEn: z.string().optional(),
	img: z.string(),
	img_alt: z.string().optional(),
	video: z.string().optional(),
	cardSize: z.enum(['normal', 'tall', 'wide']).default('normal'),
	aspectRatio: z.string().default('3 / 4'),
	objectPosition: z.string().optional(),
	images: z.array(z.string()),
	hasGallery: z.boolean().default(true),
	order: z.number().default(0),

	// Curaduría manual de la home: sube un proyecto a «Trabajos destacados»
	// aunque el orden por rol no lo colocaría ahí. No altera los listados.
	featured: z.boolean().optional(),

	// Ancla un proyecto al principio o al final de SU listado, por encima del
	// orden por rol. Decisión editorial explícita, no automatismo.
	pin: z.enum(['first', 'last']).optional(),

	role: z.enum(['lead-stylist', 'assistant-stylist', 'wardrobe-assistant', 'co-stylist']),
	roleDetail: z.string().optional(),
	leadStylist: z.string().optional(),

	year: z.number().optional(),
	season: z.string().optional(),
	client: z.string().optional(),
	publication: z.string().optional(),
	format: z.enum(['editorial', 'campaign', 'social', 'runway', 'event', 'film', 'model-test']).optional(),

	// Sin placeholders: si el dato no existe todavía, el campo se omite y no se pinta.
	credits: z
		.object({
			photographer: z.string().optional(),
			director: z.string().optional(),
			muah: z.string().optional(),
			makeup: z.string().optional(),
			hair: z.string().optional(),
			setDesign: z.string().optional(),
			stylingTeam: z.string().optional(),
			video: z.string().optional(),
			talent: z.string().optional(),
			talentAgency: z.string().optional(),
			artDirection: z.string().optional(),
			production: z.string().optional(),
			location: z.string().optional(),
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
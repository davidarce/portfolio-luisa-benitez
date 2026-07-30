import { defineCollection, z } from 'astro:content';
import { createGalleryLoader } from './loaders/gallery-loader';

const gallerySchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	/**
	 * Traducción inglesa de `description`. Opcional y HOY VACÍA a propósito en
	 * las 36 fichas: la copy de proyecto es de Luisa y no se inventa. Las
	 * plantillas hacen `descriptionEn ?? description` y marcan `lang="es"`
	 * cuando caen al español, así que rellenar esto más adelante es un cambio
	 * de datos, no de código.
	 */
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

	// Atribución (requisito nº1 de la Fase 2, ver plan/02-information-architecture/REVISION-v2.md)
	role: z.enum(['lead-stylist', 'assistant-stylist', 'wardrobe-assistant', 'co-stylist']),
	roleDetail: z.string().optional(),
	leadStylist: z.string().optional(),

	// Metadatos
	year: z.number().optional(),
	season: z.string().optional(),
	client: z.string().optional(),
	publication: z.string().optional(),
	format: z.enum(['editorial', 'campaign', 'social', 'runway', 'event', 'film', 'model-test']).optional(),

	// Créditos — sin placeholders: si el dato no existe todavía, el campo se omite y no se pinta.
	credits: z
		.object({
			photographer: z.string().optional(),
			director: z.string().optional(),
			muah: z.string().optional(),
			talent: z.string().optional(),
			talentAgency: z.string().optional(),
			artDirection: z.string().optional(),
			production: z.string().optional(),
			location: z.string().optional(),
		})
		.optional(),
});

export const collections = {
	// Colección renombrada: "celebrities" → "celebrity-events" (ruta pública
	// /celebrity-events/, ver plan/02-information-architecture/REVISION-v2.md
	// §4). El directorio de datos y de assets se queda con el nombre viejo
	// ("celebrities") a propósito: otro agente está trabajando en paralelo en
	// `public/assets/celebrities/` y `src/content/celebrities/*.json`, y
	// moverlos ahora provocaría un conflicto. `baseDir`/`jsonPath` ya apuntan
	// explícitamente al directorio, así que basta con cambiar la clave de la
	// colección — no hace falta que coincida con el nombre de carpeta.
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
	// Colección renombrada: "publicity" → "campaigns" (ruta pública
	// /campaigns/). Misma asimetría que "celebrity-events" arriba: el
	// directorio de datos/assets se queda como "publicity" para no chocar con
	// el otro agente que está trabajando en esos ficheros.
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
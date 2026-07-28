import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { createGalleryLoader } from './loaders/gallery-loader';

const gallerySchema = z.object({
	title: z.string(),
	description: z.string().optional(),
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
	work: defineCollection({
		loader: glob({ base: './src/content/work', pattern: '**/*.md' }),
		schema: z.object({
			title: z.string(),
			description: z.string(),
			publishDate: z.coerce.date(),
			tags: z.array(z.string()),
			img: z.string(),
			img_alt: z.string().optional(),
			cardSize: z.enum(['normal', 'tall', 'wide']).default('normal'),
			aspectRatio: z.string().default('3 / 4'),
			objectPosition: z.string().optional(),
			order: z.number().default(0),
		}),
	}),
	celebrities: defineCollection({
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
	publicity: defineCollection({
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
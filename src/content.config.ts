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
		}),
		schema: gallerySchema,
	}),
	editorials: defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/editorials',
			jsonPath: './src/content/editorials/editorials.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
		}),
		schema: gallerySchema,
	}),
	publicity: defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/publicity',
			jsonPath: './src/content/publicity/publicity.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
		}),
		schema: gallerySchema,
	}),
	runway: defineCollection({
		loader: createGalleryLoader({
			baseDir: './public/assets/runway',
			jsonPath: './src/content/runway/runway.json',
			jsonKey: 'highlighted',
			hasSubfolders: true,
		}),
		schema: gallerySchema,
	}),
};
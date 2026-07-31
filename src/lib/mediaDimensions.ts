import path from "node:path";
import sharp from "sharp";

export interface MediaSize {
	width: number;
	height: number;
}

const cache = new Map<string, MediaSize | null>();

export function posterPath(publicPath: string): string {
	return publicPath.replace(/\/([^/]+)\.(mp4|webm|mov)$/i, "/posters/$1.webp");
}

export async function getMediaSize(publicPath: string): Promise<MediaSize | null> {
	// Un .mp4 no expone sus dimensiones sin ffprobe; el póster tiene el mismo
	// encuadre, así que se mide el póster y se hereda el ratio.
	const target = posterPath(publicPath);
	if (cache.has(target)) return cache.get(target)!;
	let size: MediaSize | null = null;
	try {
		const meta = await sharp(path.join(process.cwd(), "public", target)).metadata();
		if (meta.width && meta.height) size = { width: meta.width, height: meta.height };
	} catch {
		size = null;
	}
	cache.set(target, size);
	return size;
}

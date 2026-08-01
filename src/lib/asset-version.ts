import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const cache = new Map<string, string>();

// Los ficheros de /assets/ tienen nombre fijo (index.webp, video-1.mp4), así que
// al cambiar una foto la URL no cambia y la caché sigue sirviendo la vieja. La
// huella del contenido convierte cada cambio en una URL nueva, como ya hace Astro
// con /_astro/. Sin esto hay que purgar Cloudflare a mano cada vez.
export function conHuella(ruta: string): string {
	if (!ruta.startsWith('/assets/')) return ruta;
	if (cache.has(ruta)) return cache.get(ruta)!;

	const fichero = join('public', ruta);
	let valor = ruta;
	if (existsSync(fichero)) {
		const huella = createHash('sha1').update(readFileSync(fichero)).digest('hex').slice(0, 8);
		valor = `${ruta}?v=${huella}`;
	}

	cache.set(ruta, valor);
	return valor;
}

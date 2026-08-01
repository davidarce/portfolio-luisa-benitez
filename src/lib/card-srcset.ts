import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// Medido en el build, no estimado: la tarjeta ocupa el 94% de la pantalla hasta
// 800px, el 27% por encima, y se topa en 382px a partir de ~1400.
export const CARD_SIZES = '(max-width: 799px) 94vw, (max-width: 1399px) 30vw, 400px';

const cache = new Map<string, string | undefined>();

export async function cardSrcset(img: string): Promise<string | undefined> {
	if (cache.has(img)) return cache.get(img);

	const dir = img.slice(0, img.lastIndexOf('/'));
	const variantes = join('public', dir, 'srcset');

	let valor: string | undefined;
	if (existsSync(variantes)) {
		const anchos = readdirSync(variantes)
			.map((f) => Number(f.replace('.webp', '')))
			.filter((n) => Number.isFinite(n))
			.sort((a, b) => a - b);
		if (anchos.length) {
			// El original entra en la lista: cuando la fuente es más estrecha que
			// la mayor variante posible, es la única candidata que llega.
			const natural = (await sharp(join('public', img)).metadata()).width ?? 0;
			const entradas = anchos.map((w) => `${dir}/srcset/${w}.webp ${w}w`);
			if (natural && !anchos.includes(natural)) entradas.push(`${img} ${natural}w`);
			valor = entradas.join(', ');
		}
	}

	cache.set(img, valor);
	return valor;
}

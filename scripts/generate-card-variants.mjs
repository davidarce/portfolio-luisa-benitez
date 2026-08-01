import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// Medidos en el build con Chromium, no estimados: hasta 800px la tarjeta ocupa
// el 94% de la pantalla y por encima el 27%, topando en 382px. El ancho mayor
// que llega a pedir es ~1500px (tablet de 798px a DPR2).
const WIDTHS = [400, 600, 800, 1100, 1500];

const COLLECTIONS = ['editorials', 'publicity', 'celebrities', 'films', 'runway'];

const force = process.argv.includes('--force');

let escritas = 0;
let saltadas = 0;
const sinOrigen = [];

for (const col of COLLECTIONS) {
	const base = join('public/assets', col);
	if (!existsSync(base)) continue;

	for (const slug of readdirSync(base, { withFileTypes: true })) {
		if (!slug.isDirectory()) continue;

		const dir = join(base, slug.name);
		const origen = readdirSync(dir).find((f) => /^index\.(webp|jpe?g|png)$/i.test(f));
		if (!origen) {
			sinOrigen.push(`${col}/${slug.name}`);
			continue;
		}

		const src = join(dir, origen);
		const natural = (await sharp(src).metadata()).width ?? 0;
		// Subdirectorio propio: gallery-loader.ts no recurre, y un
		// `index-400.webp` suelto en la carpeta lo recogería como foto de galería.
		const destDir = join(dir, 'srcset');

		for (const w of WIDTHS) {
			if (w > natural) continue;
			const destino = join(destDir, `${w}.webp`);
			if (!force && existsSync(destino) && statSync(destino).mtimeMs >= statSync(src).mtimeMs) {
				saltadas++;
				continue;
			}
			mkdirSync(destDir, { recursive: true });
			await sharp(src).resize(w).webp({ quality: 78, effort: 6 }).toFile(destino);
			escritas++;
		}
	}
}

console.log(`[variantes] ${escritas} generada(s), ${saltadas} sin cambios.`);
if (sinOrigen.length) {
	console.error(`[variantes] ${sinOrigen.length} sin index.*:`);
	sinOrigen.forEach((s) => console.error(`     ${s}`));
	process.exit(1);
}

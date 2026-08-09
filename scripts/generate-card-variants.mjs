import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

// Medidos en el build con Chromium, no estimados: hasta 800px la tarjeta ocupa
// el 94% de la pantalla y por encima el 27%, topando en 382px. El ancho mayor
// que llega a pedir es ~1500px (tablet de 798px a DPR2).
const WIDTHS = [400, 600, 800, 1100, 1500];

const COLLECTIONS = ['editorials', 'publicity', 'celebrities', 'films', 'runway'];

// La portada la declara el JSON, no el disco. Buscar un fichero `index.*` era lo
// de antes, y desde que la portada es un dato producía variantes de una foto
// distinta de la que pinta la tarjeta: el navegador elegía una variante y
// enseñaba la portada vieja en la mayoría de tamaños.
const JSON_POR_COLECCION = {
	editorials: 'src/content/editorials/editorials.json',
	publicity: 'src/content/publicity/publicity.json',
	celebrities: 'src/content/celebrities/celebrities.json',
	films: 'src/content/films/films.json',
	runway: 'src/content/runway/runway.json',
};

const PORTADAS = Object.fromEntries(
	Object.entries(JSON_POR_COLECCION).map(([col, ruta]) => [
		col,
		Object.fromEntries(
			JSON.parse(readFileSync(ruta, 'utf8')).highlighted.map((p) => [
				p.id,
				p.gallery?.find((g) => g.cover)?.file,
			]),
		),
	]),
);

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
		const declarada = PORTADAS[col]?.[slug.name];
		const origen = declarada ? basename(declarada) : undefined;
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
			// Como en generate-og-images.mjs: al cambiar la portada desde el CMS el
			// fichero de origen es otro pero su fecha es antigua, así que mirando
			// solo las imágenes esto se daba por hecho y la tarjeta se quedaba con
			// las miniaturas de la portada anterior.
			const fuenteMs = Math.max(
				statSync(src).mtimeMs,
				statSync(JSON_POR_COLECCION[col]).mtimeMs,
			);
			if (!force && existsSync(destino) && statSync(destino).mtimeMs >= fuenteMs) {
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

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const BACKGROUND = '#090b11';

// `assets` es la carpeta real y `out` la ruta pública: la Fase 2 renombró las
// categorías sin mover los datos.
const COLLECTIONS = [
	{ assets: 'editorials', out: 'editorials', json: 'src/content/editorials/editorials.json' },
	{ assets: 'publicity', out: 'campaigns', json: 'src/content/publicity/publicity.json' },
	{ assets: 'celebrities', out: 'celebrity-events', json: 'src/content/celebrities/celebrities.json' },
	{ assets: 'films', out: 'films', json: 'src/content/films/films.json' },
	{ assets: 'runway', out: 'runway', json: 'src/content/runway/runway.json' },
];

const JSON_POR_COLECCION = Object.fromEntries(
	COLLECTIONS.map(({ assets, json }) => [
		assets,
		JSON.parse(readFileSync(json, 'utf8')).highlighted ?? [],
	]),
);

// La portada la decide el JSON, no el disco: es la entrada marcada `cover` en
// `gallery`. Antes se buscaba un fichero `index.*`, y desde que la portada es
// un dato eso divergía en cuanto alguien la cambiaba desde el CMS: la tarjeta
// mostraba una foto y al compartir el enlace salía otra.
function portadaDeclarada(coleccion, slug) {
	const proyecto = (JSON_POR_COLECCION[coleccion] ?? []).find((p) => p.id === slug);
	const marcada = proyecto?.gallery?.find((g) => g.cover);
	if (!marcada) return null;
	const fichero = join('public', marcada.file.replace(/^\//, ''));
	return existsSync(fichero) ? fichero : null;
}

const force = process.argv.includes('--force');

let escritas = 0;
let saltadas = 0;
const problemas = [];

for (const { assets, out } of COLLECTIONS) {
	const base = join('public/assets', assets);
	if (!existsSync(base)) {
		problemas.push(`${assets}: no existe ${base}`);
		continue;
	}

	const slugs = readdirSync(base, { withFileTypes: true })
		.filter((d) => d.isDirectory() && d.name !== 'posters')
		.map((d) => d.name);

	for (const slug of slugs) {
		const origen = portadaDeclarada(assets, slug);
		const destino = join('public/assets/og', out, `${slug}.jpg`);

		if (!origen) {
			problemas.push(`${out}/${slug}: sin imagen de origen`);
			continue;
		}

		if (!force && existsSync(destino) && statSync(destino).mtimeMs >= statSync(origen).mtimeMs) {
			saltadas++;
			continue;
		}

		mkdirSync(dirname(destino), { recursive: true });
		await sharp(origen)
			.resize(WIDTH, HEIGHT, { fit: 'contain', background: BACKGROUND })
			.flatten({ background: BACKGROUND })
			.jpeg({ quality: 82, mozjpeg: true })
			.toFile(destino);
		escritas++;
	}
}

console.log(`[og] ${escritas} generada(s), ${saltadas} sin cambios.`);
if (problemas.length) {
	console.error(`[og] ${problemas.length} con problemas:`);
	problemas.forEach((p) => console.error(`     ${p}`));
	process.exit(1);
}

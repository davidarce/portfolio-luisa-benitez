import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const BACKGROUND = '#090b11';

// `assets` es la carpeta real y `out` la ruta pública: la Fase 2 renombró las
// categorías sin mover los datos.
const COLLECTIONS = [
	{ assets: 'editorials', out: 'editorials' },
	{ assets: 'publicity', out: 'campaigns' },
	{ assets: 'celebrities', out: 'celebrity-events' },
	{ assets: 'films', out: 'films' },
	{ assets: 'runway', out: 'runway' },
];

// El slug de la URL es el nombre de la carpeta, no el `id` del JSON, y en
// editoriales no coinciden. Misma elección de imagen que gallery-loader.ts:
// index.* manda y si no, la primera; si divergieran, al compartir saldría una
// foto distinta de la que se ve al entrar.
function imagenDeOrigen(carpeta) {
	const ficheros = readdirSync(carpeta);
	const index = ficheros.find((f) => /^index\.(jpe?g|png|webp)$/i.test(f));
	if (index) return join(carpeta, index);

	const primera = ficheros
		.filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('index.'))
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
	return primera ? join(carpeta, primera) : null;
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
		const origen = imagenDeOrigen(join(base, slug));
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

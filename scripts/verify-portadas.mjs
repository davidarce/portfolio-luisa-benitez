// Comprueba que todo lo que se deriva de la portada coincide con la portada que
// declara el JSON. Existe porque ese desajuste no da ningún error: la tarjeta
// sigue pintando algo, solo que la foto equivocada, y se descubrió tarde y por
// casualidad. Salidas: 0 todo bien, 1 hay desajustes, 2 error de entorno.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const COLECCIONES = [
	{ assets: 'editorials', og: 'editorials', json: 'src/content/editorials/editorials.json' },
	{ assets: 'publicity', og: 'campaigns', json: 'src/content/publicity/publicity.json' },
	{ assets: 'celebrities', og: 'celebrity-events', json: 'src/content/celebrities/celebrities.json' },
	{ assets: 'runway', og: 'runway', json: 'src/content/runway/runway.json' },
	{ assets: 'films', og: 'films', json: 'src/content/films/films.json' },
];

const UMBRAL = 12;

async function huella(ruta) {
	return sharp(ruta).resize(64, 64, { fit: 'fill' }).greyscale().raw().toBuffer();
}

// La imagen para compartir no es la portada recortada: es la portada centrada
// sobre fondo oscuro en 1200x630. Para compararlas hay que reproducir esa misma
// transformación, o la diferencia la marcan las bandas y no la foto.
async function huellaSocial(ruta) {
	const compuesta = await sharp(ruta)
		.resize(1200, 630, { fit: 'contain', background: '#090b11' })
		.flatten({ background: '#090b11' })
		.toBuffer();
	return huella(compuesta);
}

function distancia(a, b) {
	let suma = 0;
	for (let i = 0; i < a.length; i++) suma += Math.abs(a[i] - b[i]);
	return suma / a.length;
}

const fallos = [];
let comprobadas = 0;

for (const { assets, og, json } of COLECCIONES) {
	if (!existsSync(json)) {
		console.error(`✖ falta ${json}`);
		process.exit(2);
	}
	for (const proyecto of JSON.parse(readFileSync(json, 'utf8')).highlighted) {
		const portada = proyecto.gallery?.find((g) => g.cover)?.file;
		if (!portada) {
			fallos.push(`${assets}/${proyecto.id}: sin portada declarada`);
			continue;
		}
		const origen = join('public', portada.replace(/^\//, ''));
		if (!existsSync(origen)) {
			fallos.push(`${assets}/${proyecto.id}: la portada declarada no existe en disco`);
			continue;
		}
		const referencia = await huella(origen);

		// TODAS las variantes, no solo la de 400: la de 1100 se quedó apuntando a
		// otra foto porque no se podía regenerar (más ancha que el original) y
		// nadie la borraba. Comprobando solo una, este verificador daba luz verde
		// mientras un móvil en vertical enseñaba la portada anterior.
		const dirVariantes = join('public/assets', assets, proyecto.id, 'srcset');
		if (existsSync(dirVariantes)) {
			for (const fichero of readdirSync(dirVariantes)) {
				comprobadas++;
				const d = distancia(referencia, await huella(join(dirVariantes, fichero)));
				if (d > UMBRAL) {
					fallos.push(
						`${assets}/${proyecto.id}: la miniatura ${fichero} no es la portada (${d.toFixed(1)})`,
					);
				}
			}
		}

		const social = join('public/assets/og', og, `${proyecto.id}.jpg`);
		if (existsSync(social)) {
			comprobadas++;
			const d = distancia(await huellaSocial(origen), await huella(social));
			if (d > UMBRAL) {
				fallos.push(
					`${assets}/${proyecto.id}: la imagen para compartir no es la portada (${d.toFixed(1)})`,
				);
			}
		}
	}
}

if (fallos.length) {
	console.error(`✖ ${fallos.length} desajuste(s) con la portada declarada:\n`);
	for (const f of fallos) console.error(`  - ${f}`);
	console.error('\nRegenera con: pnpm variants && pnpm og');
	process.exit(1);
}

console.log(`[portadas] ${comprobadas} derivadas comprobadas, todas coinciden con su portada.`);

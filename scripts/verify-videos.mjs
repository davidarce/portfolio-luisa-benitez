// Comprueba que todos los vídeos se pueden reproducir mientras se descargan.
//
// Un .mp4 lleva su índice (el átomo `moov`) al principio o al final. Si va al
// final, el navegador tiene que descargar el fichero entero antes de pintar el
// primer fotograma: con 14 MB eso se ve como "el vídeo no carga", sin ningún
// error. `optimize-video.mjs` lo pone al principio con `-movflags +faststart`,
// pero cualquier recompresión hecha a mano se lo salta y no avisa.
//
// Salidas: 0 todo bien, 1 hay vídeos que no se pueden transmitir.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'public/assets';
const CABECERA = 300_000;

function buscarVideos(dir) {
	const salida = [];
	for (const entrada of readdirSync(dir, { withFileTypes: true })) {
		const ruta = join(dir, entrada.name);
		if (entrada.isDirectory()) salida.push(...buscarVideos(ruta));
		else if (/\.(mp4|mov|m4v)$/i.test(entrada.name)) salida.push(ruta);
	}
	return salida;
}

const videos = buscarVideos(RAIZ);
const fallos = [];

for (const ruta of videos) {
	const trozo = readFileSync(ruta).subarray(0, CABECERA);
	const moov = trozo.indexOf('moov');
	const mdat = trozo.indexOf('mdat');
	const alPrincipio = moov >= 0 && (mdat < 0 || moov < mdat);
	if (!alPrincipio) {
		const mb = (statSync(ruta).size / 1024 / 1024).toFixed(1);
		fallos.push(`${ruta.replace(RAIZ + '/', '')} (${mb} MB)`);
	}
}

if (fallos.length) {
	console.error(`✖ ${fallos.length} vídeo(s) sin faststart: hay que descargarlos enteros antes de verlos\n`);
	for (const f of fallos) console.error(`  - ${f}`);
	console.error('\nArréglalos con:');
	console.error('  node_modules/ffmpeg-static/ffmpeg -i <video> -c copy -movflags +faststart <salida>');
	process.exit(1);
}

console.log(`[videos] ${videos.length} vídeos comprobados, todos empiezan a verse mientras se descargan.`);

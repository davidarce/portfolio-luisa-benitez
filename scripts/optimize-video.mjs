// Herramienta de autor para el vídeo de las galerías. NO forma parte del build:
// se ejecuta a mano cuando entra material nuevo, igual que `optimize-gallery.mjs`.
//
// Existe porque el vídeo original de las sesiones llega tal cual sale de cámara.
// La primera tanda ocupaba 381 MB en 33 ficheros —uno de ellos de 90 MB— en un
// sitio estático servido por GitHub Pages, donde cada mega lo paga el visitante.
// Tras pasar por aquí quedaron en 89 MB sin diferencia visible a tamaño de tarjeta.
//
// Dos modos:
//   transcode <dir>   Recomprime los vídeos del directorio (recursivo) y
//                     normaliza la extensión a .mp4 en minúsculas.
//   poster <video> <destino.webp>
//                     Extrae un fotograma de portada. Hace falta para las
//                     galerías que solo tienen vídeo: el loader toma `index.*`
//                     como imagen de portada, y sin ella `Card.astro` acaba
//                     poniendo la URL del .mp4 en el atributo `poster`, que el
//                     navegador no puede pintar y deja la tarjeta en negro.
//
// El audio se CONSERVA a propósito: las tarjetas arrancan en mudo pero tienen
// botón para activar el sonido, así que quitar la pista rompería esa función.
//
// Sobre ffmpeg: `ffmpeg-static` está en devDependencies, pero en
// `pnpm-workspace.yaml` figura como `ffmpeg-static: false` dentro de
// `allowBuilds`, así que en una instalación limpia el paquete se instala pero el
// binario NO se descarga. Es deliberado —CI no necesita ffmpeg y son ~80 MB por
// instalación— y por eso este script lo busca en varios sitios y, si no lo
// encuentra, explica cómo conseguirlo en vez de reventar con un error críptico.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const VIDEO_RE = /\.(mov|mp4|webm|m4v)$/i;
const MAX_LONG_SIDE = 1080;
const CRF = 27;
const POSTER_MAX_DIMENSION = 2048;
const POSTER_QUALITY = 80;
/** Media de canal (0-255) por debajo de la cual el fotograma se considera negro. */
const BRIGHTNESS_THRESHOLD = 15;
/**
 * Un vídeo ya pasado por aquí no se vuelve a comprimir. Sin esta guarda, una
 * segunda pasada recomprime lo ya comprimido y degrada la imagen sin ahorrar
 * nada — el clásico daño acumulativo del transcode generacional.
 */
const ALREADY_OPTIMIZED_BITRATE = 2_500_000;

const require = (await import('node:module')).createRequire(import.meta.url);

function resolveFfmpeg() {
	// 1. ffmpeg-static, si su binario llegó a descargarse.
	try {
		const mod = require('ffmpeg-static');
		const bin = typeof mod === 'string' ? mod : mod?.default;
		if (bin && existsSync(bin)) return bin;
	} catch {
		// no instalado; se prueba el del sistema
	}
	// 2. ffmpeg del sistema.
	try {
		execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
		return 'ffmpeg';
	} catch {
		// ninguno
	}
	console.error(`
No se ha encontrado ffmpeg, que es lo que hace el trabajo aquí.

El paquete "ffmpeg-static" está declarado en devDependencies, pero su script de
instalación está DESHABILITADO a propósito en pnpm-workspace.yaml
(allowBuilds: ffmpeg-static: false), para no descargar ~80 MB en cada
instalación de CI, donde no hace ninguna falta. Por eso el binario no está.

Para ejecutar este script, una de estas dos:

  node node_modules/ffmpeg-static/install.js     (descarga el binario)
  sudo apt install ffmpeg                        (ffmpeg del sistema)
`);
	process.exit(1);
}

export const POSTER_SECOND = 1;

const FFMPEG = resolveFfmpeg();

const mb = (bytes) => (bytes / 1e6).toFixed(1) + ' MB';

function findVideos(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) findVideos(full, out);
		else if (VIDEO_RE.test(entry.name)) out.push(full);
	}
	return out;
}

/**
 * Bitrate global en bits/s, o null si no se puede determinar.
 *
 * No se usa ffprobe: `ffmpeg-static` distribuye ÚNICAMENTE el binario de ffmpeg,
 * sin ffprobe. Llamarlo fallaba en silencio, `videoBitrate` devolvía null y la
 * guarda de idempotencia se saltaba entera — recomprimiendo vídeo ya comprimido
 * y degradándolo una generación. Por eso se lee de la cabecera que el propio
 * ffmpeg escribe en stderr ("Duration: ..., bitrate: 1234 kb/s"), que está
 * disponible siempre.
 */
function videoBitrate(file) {
	try {
		// Sin fichero de salida ffmpeg termina con error tras volcar la cabecera;
		// ese error es lo esperado y por eso se lee stderr desde el catch.
		execFileSync(FFMPEG, ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
		return null;
	} catch (err) {
		const stderr = err.stderr?.toString() ?? '';
		const match = stderr.match(/bitrate:\s*(\d+)\s*kb\/s/i);
		return match ? Number.parseInt(match[1], 10) * 1000 : null;
	}
}

function transcodeDir(dir) {
	if (!existsSync(dir)) {
		console.error(`No existe el directorio: ${dir}`);
		process.exit(1);
	}
	const videos = findVideos(dir).sort();
	console.log(`${videos.length} vídeo(s) en ${dir}\n`);

	let before = 0;
	let after = 0;
	let skipped = 0;

	for (const input of videos) {
		const sizeBefore = statSync(input).size;
		before += sizeBefore;

		const bitrate = videoBitrate(input);
		if (bitrate !== null && bitrate < ALREADY_OPTIMIZED_BITRATE) {
			console.log(`  = ${input} (${mb(sizeBefore)}, ${Math.round(bitrate / 1000)} kbps) ya optimizado, se salta`);
			after += sizeBefore;
			skipped++;
			continue;
		}

		const dirname = path.dirname(input);
		const stem = path.basename(input).replace(/\.[^.]+$/, '');
		const finalPath = path.join(dirname, `${stem}.mp4`);
		const tmpPath = path.join(dirname, `.${stem}.tmp.mp4`);

		// Se escribe primero a un temporal: si ffmpeg falla a medias, el
		// original sigue intacto.
		execFileSync(
			FFMPEG,
			[
				'-y', '-loglevel', 'error',
				'-i', input,
				'-map', '0:v:0',
				'-map', '0:a:0?',
				'-vf', `scale='if(gt(iw,ih),min(${MAX_LONG_SIDE},iw),-2)':'if(gt(iw,ih),-2,min(${MAX_LONG_SIDE},ih))'`,
				'-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p',
				'-c:a', 'aac', '-b:a', '128k',
				// Mueve el índice al principio para que empiece a reproducirse
				// sin descargar el fichero entero.
				'-movflags', '+faststart',
				tmpPath,
			],
			{ stdio: ['ignore', 'ignore', 'inherit'] },
		);

		const sizeAfter = statSync(tmpPath).size;
		unlinkSync(input);
		renameSync(tmpPath, finalPath);
		after += sizeAfter;
		console.log(`  ✓ ${input} ${mb(sizeBefore)} -> ${finalPath} ${mb(sizeAfter)}`);
	}

	console.log(`\nAntes:   ${mb(before)}`);
	console.log(`Después: ${mb(after)}`);
	if (before > 0) console.log(`Ahorro:  ${(100 * (1 - after / before)).toFixed(1)}%`);
	if (skipped) console.log(`Saltados por estar ya optimizados: ${skipped}`);
}

async function extractPoster(videoPath, destPath) {
	// Siempre en POSTER_SECOND, nunca en el 0: el primer fotograma suele ser
	// negro o un fundido. El <video> arranca en ese mismo instante (#t= en el
	// src), así que al reproducirse no salta a otra imagen.
	const tmpPng = `${destPath}.tmp.png`;
	try {
		execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(POSTER_SECOND), '-i', videoPath, '-frames:v', '1', tmpPng], {
			stdio: ['ignore', 'ignore', 'pipe'],
		});
	} catch {
		execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', videoPath, '-frames:v', '1', tmpPng], {
			stdio: ['ignore', 'ignore', 'pipe'],
		});
	}
	await sharp(tmpPng).webp({ quality: 80 }).toFile(destPath);
	unlinkSync(tmpPng);
	return destPath;
}

const [mode, a, b] = process.argv.slice(2);

if (mode === 'transcode' && a) {
	transcodeDir(a);
} else if (mode === 'poster' && a && b) {
	await extractPoster(a, b);
} else {
	console.log(`
Uso:
  node scripts/optimize-video.mjs transcode <directorio>
      Recomprime los vídeos del directorio (recursivo) a H.264, máximo
      ${MAX_LONG_SIDE}px de lado largo, CRF ${CRF}, con faststart y conservando el audio.
      Normaliza la extensión a .mp4. Salta los que ya estén optimizados.

  node scripts/optimize-video.mjs poster <video> <destino.webp>
      Extrae un fotograma de portada, evitando los negros del principio.

Ejemplos:
  node scripts/optimize-video.mjs transcode public/assets/runway
  node scripts/optimize-video.mjs poster public/assets/publicity/kerastase/video-1.mp4 \\
      public/assets/publicity/kerastase/index.webp
`);
	process.exit(a || mode ? 1 : 0);
}

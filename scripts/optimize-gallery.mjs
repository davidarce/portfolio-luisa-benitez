// Author-time conversor de galerías: toma un directorio de fotos originales
// (jpg/png a resolución de cámara, ~4000x6000 y varios MB cada una) y produce
// el paquete .webp que consume src/loaders/gallery-loader.ts.
//
// Uso:
//   node scripts/optimize-gallery.mjs "<directorio origen>" public/assets/<categoria>/<slug>
//
// Salida (en el directorio destino):
//   1.webp, 2.webp, ... - fotos numeradas en orden natural por nombre original
//   index.webp          - copia de la primera foto (portada por defecto; se
//                          puede sustituir a mano más adelante)
//
// Modo «in situ» (mismo origen y destino, sustituye ficheros sin renombrar):
//   node scripts/optimize-gallery.mjs --in-place <directorio>
//
// Recorre <directorio> (sin recursión) y reconvierte cada imagen jpg/png/webp
// que encuentre, conservando el nombre base exacto (solo cambia la extensión
// a .webp si hacía falta) y el orden de los ficheros ya existentes. Los
// vídeos (.mp4/.mov/.webm) se ignoran: sharp no los toca. Pensado para
// galerías que ya tienen la convención de nombres correcta (1.webp, 2.webp,
// index.webp, ...) pero nunca pasaron por la conversión/redimensionado.
//
// Convención de tamaño (igual que scripts/generate-assets.mjs y las galerías
// ya existentes en public/assets/): máximo 2048px en el lado largo, sin
// agrandar imágenes menores, calidad webp 80. Idempotente: se puede volver a
// ejecutar y sobrescribe el mismo destino sin duplicar ficheros.

import { mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MAX_DIMENSION = 2048;
const WEBP_QUALITY = 80;
const SOURCE_EXTENSIONS = /\.(jpe?g|png)$/i;
const IN_PLACE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes;
	let unitIndex = -1;
	do {
		value /= 1024;
		unitIndex += 1;
	} while (value >= 1024 && unitIndex < units.length - 1);
	return `${value.toFixed(1)} ${units[unitIndex]}`;
}

async function convertOne(sourcePath, destPath) {
	await sharp(sourcePath)
		.resize(MAX_DIMENSION, MAX_DIMENSION, {
			fit: "inside",
			withoutEnlargement: true,
		})
		.webp({ quality: WEBP_QUALITY })
		.toFile(destPath);
}

async function runInPlace(dirArg) {
	const dir = path.resolve(dirArg);

	const entries = await readdir(dir, { withFileTypes: true });
	const files = entries
		.filter((e) => e.isFile() && IN_PLACE_EXTENSIONS.test(e.name))
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

	if (files.length === 0) {
		console.error(`No se encontraron imágenes jpg/png/webp en ${dir}`);
		process.exit(1);
	}

	let totalBefore = 0;
	let totalAfter = 0;

	for (const fileName of files) {
		const sourcePath = path.join(dir, fileName);
		const sourceStat = await stat(sourcePath);
		totalBefore += sourceStat.size;

		const baseName = fileName.replace(/\.[^.]+$/, "");
		const outName = `${baseName}.webp`;
		const outPath = path.join(dir, outName);
		// Fichero temporal: convertir a un nombre distinto y luego renombrar,
		// para poder sustituir un .webp por sí mismo sin que sharp intente
		// leer y escribir el mismo fichero a la vez.
		const tmpPath = path.join(dir, `.${outName}.tmp`);

		await convertOne(sourcePath, tmpPath);

		if (outPath !== sourcePath) {
			await unlink(sourcePath);
		}
		await rename(tmpPath, outPath);

		const outStat = await stat(outPath);
		totalAfter += outStat.size;
		console.log(`${fileName} -> ${outName} (${formatBytes(outStat.size)})`);
	}

	console.log("");
	console.log(`Ficheros convertidos: ${files.length}`);
	console.log(`Peso total origen:   ${formatBytes(totalBefore)}`);
	console.log(`Peso total destino:  ${formatBytes(totalAfter)}`);
}

async function main() {
	const [, , first, second] = process.argv;

	if (first === "--in-place") {
		if (!second) {
			console.error("Uso: node scripts/optimize-gallery.mjs --in-place <directorio>");
			process.exit(1);
		}
		await runInPlace(second);
		return;
	}

	const sourceDirArg = first;
	const destDirArg = second;

	if (!sourceDirArg || !destDirArg) {
		console.error(
			'Uso: node scripts/optimize-gallery.mjs "<origen>" "<destino>"',
		);
		process.exit(1);
	}

	const sourceDir = path.resolve(sourceDirArg);
	const destDir = path.resolve(destDirArg);

	const entries = await readdir(sourceDir, { withFileTypes: true });
	// Sin recursión: solo ficheros directos del directorio de origen.
	const files = entries
		.filter((e) => e.isFile() && SOURCE_EXTENSIONS.test(e.name))
		// Orden natural por nombre original, igual que el gallery-loader, para
		// que "foto2.jpg" salga antes que "foto10.jpg".
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

	if (files.length === 0) {
		console.error(`No se encontraron imágenes jpg/png en ${sourceDir}`);
		process.exit(1);
	}

	await mkdir(destDir, { recursive: true });

	let totalBefore = 0;
	let totalAfter = 0;

	for (const [index, fileName] of files.entries()) {
		const sourcePath = path.join(sourceDir, fileName);
		const sourceStat = await stat(sourcePath);
		totalBefore += sourceStat.size;

		const outName = `${index + 1}.webp`;
		const outPath = path.join(destDir, outName);
		await convertOne(sourcePath, outPath);

		if (index === 0) {
			// Portada por defecto: copia de la primera foto en orden natural.
			await convertOne(sourcePath, path.join(destDir, "index.webp"));
		}

		const outStat = await stat(outPath);
		totalAfter += outStat.size;
		console.log(`${fileName} -> ${outName} (${formatBytes(outStat.size)})`);
	}

	// index.webp pesa lo mismo que 1.webp; se cuenta aparte para el resumen.
	const indexStat = await stat(path.join(destDir, "index.webp"));
	totalAfter += indexStat.size;

	console.log("");
	console.log(`Ficheros convertidos: ${files.length} (+ index.webp)`);
	console.log(`Peso total origen:   ${formatBytes(totalBefore)}`);
	console.log(`Peso total destino:  ${formatBytes(totalAfter)}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

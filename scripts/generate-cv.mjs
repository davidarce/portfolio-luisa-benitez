#!/usr/bin/env node
// Genera public/cv/luisa-benitez-cv-{es,en}.pdf desde las páginas /cv/ del
// BUILD de producción (dist/), nunca del dev server. Uso: pnpm cv (tras pnpm build).
//
// Códigos de salida, mismo contrato que verify-viewer.mjs:
//   0 = PDFs generados, de UNA página A4 y con el texto bien separado.
//   1 = se generó pero algo no cumple (más de una página, o alguna fecha queda
//       pegada al título en el texto extraído — ver la aserción anti-pegado).
//   2 = no se pudo generar (falta playwright-core, falta dist/ o está desactualizado).
//
// Aviso, no error: si la página contiene «[PENDIENTE: …]» se listan los huecos.
// El PDF resultante sirve para revisar el diseño, no para publicar (#10).

import { existsSync, statSync, readdirSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "public", "cv");
const EVIDENCE_DIR = path.join(ROOT, ".sdd", "cv-pdf");
const PORT = 4174;
const URL_BASE = `http://127.0.0.1:${PORT}`;

// Mismos nombres que espera `cvPath` en src/data/profile.ts (#35).
const TARGETS = [
	{ locale: "es", pagePath: "/cv/", pdf: "luisa-benitez-cv-es.pdf" },
	{ locale: "en", pagePath: "/en/cv/", pdf: "luisa-benitez-cv-en.pdf" },
];

function fail(code, msg) {
	console.error(`\n✖ ${msg}\n`);
	process.exit(code);
}

function newestMtime(dir) {
	let newest = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (!entry.isFile()) continue;
		const base = entry.parentPath ?? entry.path ?? dir;
		try {
			const t = statSync(path.join(base, entry.name)).mtimeMs;
			if (t > newest) newest = t;
		} catch {
			// fichero desaparecido entre listado y stat: irrelevante
		}
	}
	return newest;
}

let chromium;
try {
	({ chromium } = await import("playwright-core"));
} catch {
	fail(
		2,
		"falta playwright-core en este entorno. Enlázalo en node_modules o instala:\n" +
			"  ln -s /ruta/con/playwright-core node_modules/playwright-core",
	);
}

if (!existsSync(DIST)) fail(2, "no hay dist/: ejecuta pnpm build");
if (newestMtime(DIST) < newestMtime(SRC)) {
	fail(2, "dist/ es más antiguo que src/: ejecuta pnpm build antes de generar");
}

const CHROME_PATH =
	process.env.CHROME_PATH ??
	path.join(process.env.HOME ?? "", ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome");
if (!existsSync(CHROME_PATH)) {
	fail(2, `no se encuentra Chromium en ${CHROME_PATH}. Define CHROME_PATH con la ruta correcta.`);
}

function startServer() {
	return new Promise((resolve, reject) => {
		const srv = spawn("python3", ["-m", "http.server", String(PORT), "--directory", DIST], {
			stdio: ["ignore", "ignore", "pipe"],
		});
		srv.on("error", reject);
		const poll = (attempt) => {
			fetch(`${URL_BASE}/`)
				.then(() => resolve(srv))
				.catch(() => {
					if (attempt > 50) reject(new Error("el servidor estático no arrancó en 5s"));
					else setTimeout(() => poll(attempt + 1), 100);
				});
		};
		poll(0);
	});
}

// Chromium escribe cada página como un diccionario «/Type /Page» sin comprimir;
// contarlos evita depender de pdfinfo. El negativo excluye «/Type /Pages».
function pdfPageCount(file) {
	const raw = readFileSync(file, "latin1");
	return (raw.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

// ——— Extracción de texto del PDF, en orden de emisión ———
//
// Este bug ya se coló dos veces (el tracking de Bebas y las fechas pegadas al
// título): un ATS lee el flujo de texto del PDF, no la maqueta. Chromium emite
// cada celda del flex como un run independiente y, con títulos largos, con
// posición absoluta y SIN carácter de separación — el hueco visual no existe
// para el extractor. A propósito NO se insertan aquí espacios heurísticos por
// posición: si un separador no es un carácter real del stream, no cuenta.
//
// Cubre lo que produce Chromium (fuentes Type0 con /ToUnicode y streams Flate);
// si el formato cambiara y no se pudiera extraer, se falla en vez de callar.

function parsePdfObjects(buf) {
	const raw = buf.toString("latin1");
	const objects = new Map();
	for (const m of raw.matchAll(/(\d+)\s+0\s+obj\b/g)) {
		const start = m.index + m[0].length;
		const end = raw.indexOf("endobj", start);
		if (end === -1) continue;
		let dict = raw.slice(start, end);
		let stream = null;
		const s = dict.indexOf("stream");
		if (s !== -1) {
			const head = dict.slice(s).match(/^stream\r?\n/);
			const dataStart = start + s + (head?.[0].length ?? 7);
			stream = buf.subarray(dataStart, raw.indexOf("endstream", dataStart));
			dict = dict.slice(0, s);
		}
		objects.set(Number(m[1]), { dict, stream });
	}
	return objects;
}

function inflate(objects, num) {
	const obj = objects.get(num);
	if (!obj?.stream) return null;
	try {
		return zlib.inflateSync(obj.stream).toString("latin1");
	} catch {
		return obj.stream.toString("latin1");
	}
}

function hexUtf16(hex) {
	let out = "";
	for (let i = 0; i + 4 <= hex.length; i += 4) {
		out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
	}
	return out;
}

function parseToUnicode(cmap) {
	const map = new Map();
	for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
		for (const p of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
			map.set(parseInt(p[1], 16), hexUtf16(p[2]));
		}
	}
	for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
		for (const p of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
			const lo = parseInt(p[1], 16);
			const hi = parseInt(p[2], 16);
			const dst = parseInt(p[3], 16);
			for (let c = lo; c <= hi; c++) map.set(c, String.fromCodePoint(dst + (c - lo)));
		}
	}
	return map;
}

function decodeHex(hex, map) {
	if (!map) return "";
	let out = "";
	for (let i = 0; i + 4 <= hex.length; i += 4) {
		out += map.get(parseInt(hex.slice(i, i + 4), 16)) ?? "";
	}
	return out;
}

function extractPdfText(file) {
	const buf = readFileSync(file);
	const objects = parsePdfObjects(buf);

	// nombre de fuente (/F4) → mapa glifo→Unicode, vía los /Font de los recursos
	const fontMaps = new Map();
	for (const { dict } of objects.values()) {
		for (const fonts of dict.matchAll(/\/Font\s*<<([^>]*)>>/g)) {
			for (const entry of fonts[1].matchAll(/\/(\w+)\s+(\d+)\s+0\s+R/g)) {
				const fontDict = objects.get(Number(entry[2]))?.dict ?? "";
				const uniRef = fontDict.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
				if (!uniRef) continue;
				const cmap = inflate(objects, Number(uniRef[1]));
				if (cmap) fontMaps.set(entry[1], parseToUnicode(cmap));
			}
		}
	}
	if (fontMaps.size === 0) return null;

	let text = "";
	let current = null;
	for (const [num, obj] of objects) {
		if (!obj.stream || /\/Subtype\s*\/(Image|CIDFontType)/.test(obj.dict)) continue;
		const content = inflate(objects, num);
		if (!content || !/\bBT\b/.test(content)) continue;
		const tokens = /\/(\w+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]+)>\s*Tj|\[((?:<[0-9a-fA-F]*>|[^\]])*)\]\s*TJ/g;
		for (const t of content.matchAll(tokens)) {
			if (t[1]) current = fontMaps.get(t[1]) ?? null;
			else if (t[2]) text += decodeHex(t[2], current);
			else if (t[3]) {
				for (const h of t[3].matchAll(/<([0-9a-fA-F]*)>/g)) text += decodeHex(h[1], current);
			}
		}
	}
	return text;
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(EVIDENCE_DIR, { recursive: true });

const failures = [];
const server = await startServer();
const browser = await chromium.launch({ executablePath: CHROME_PATH });

try {
	const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });

	for (const { locale, pagePath, pdf } of TARGETS) {
		const response = await page.goto(`${URL_BASE}${pagePath}`, { waitUntil: "networkidle" });
		if (!response || response.status() !== 200) {
			failures.push(`${pagePath} no respondió 200 (¿existe en dist/?)`);
			continue;
		}

		const pending = await page.evaluate(() =>
			[...document.querySelectorAll("mark")].map((m) => m.textContent.trim()),
		);
		if (pending.length > 0) {
			console.warn(`\n[cv:${locale}] ${pending.length} hueco(s) sin rellenar — NO publicar este PDF:`);
			pending.forEach((p) => console.warn(`   ${p}`));
		}

		// Cada fecha del DOM debe llegar al texto extraído del PDF precedida de un
		// separador real (el NBSP del título en cv.astro). Se cruza DOM contra PDF
		// en vez de fijar una lista de meses: cubre cualquier fecha futura sin
		// falsos positivos tipo «MasterD» (r seguida de mayúscula).
		const domDates = await page.evaluate(() =>
			[...document.querySelectorAll(".entry-dates")].map((e) => e.textContent.trim()),
		);

		const outFile = path.join(OUT_DIR, pdf);
		await page.pdf({
			path: outFile,
			format: "A4",
			printBackground: true,
			preferCSSPageSize: true,
		});

		const pages = pdfPageCount(outFile);
		if (pages !== 1) {
			failures.push(`${pdf} tiene ${pages} páginas y el CV debe caber en una`);
		}

		const pdfText = extractPdfText(outFile);
		if (pdfText === null) {
			failures.push(`${pdf}: no se pudo extraer el texto (¿cambió el formato de Chromium?)`);
		} else {
			for (const dates of domDates) {
				let idx = pdfText.indexOf(dates);
				if (idx === -1) {
					failures.push(`${pdf}: la fecha «${dates}» no aparece en el texto extraído`);
					continue;
				}
				for (; idx !== -1; idx = pdfText.indexOf(dates, idx + 1)) {
					const prev = idx === 0 ? " " : pdfText[idx - 1];
					if (!/\s/.test(prev)) {
						failures.push(
							`${pdf}: «…${pdfText.slice(Math.max(0, idx - 25), idx)}» pegado a «${dates}» sin separador real en el flujo de texto`,
						);
					}
				}
			}
		}

		// Evidencia visual de la hoja (la vista de pantalla es la misma maqueta).
		await page.screenshot({
			path: path.join(EVIDENCE_DIR, pdf.replace(/\.pdf$/, ".png")),
			fullPage: true,
		});

		console.log(`[cv:${locale}] ${path.relative(ROOT, outFile)} (${pages} página)`);
	}
} finally {
	await browser.close();
	server.kill();
}

if (failures.length > 0) {
	console.error(`\n${failures.length} problema(s):`);
	failures.forEach((f) => console.error(`  - ${f}`));
	process.exit(1);
}

console.log(`\nCapturas en ${path.relative(ROOT, EVIDENCE_DIR)}/. TODO CORRECTO (código 0)\n`);

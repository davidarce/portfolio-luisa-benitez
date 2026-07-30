// Gate de enlaces internos por idioma (T025): recorre dist/en/**/*.html (el
// BUILD de producción) y falla si algún href="/..." absoluto no apunta a
// /en/ — un enlace que olvida el prefijo manda a un visitante inglés de
// vuelta al sitio español sin ningún error visible.
//
// Uso: pnpm check:links (después de `pnpm build`).

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const EN_DIR = path.join(DIST_DIR, "en");

// Prefijos de SEGMENTO, no de string crudo: "/en" debe casar como segmento
// completo ("/en" exacto o algo que empiece por "/en/"), nunca como prefijo de
// caracteres — si no, "/encargos/".startsWith("/en") colaría en silencio. Por
// eso "/en" exacto vive en ALLOWED_ABSOLUTE_EXACT y no aquí.
const ALLOWED_ABSOLUTE_PREFIXES = ["/en/", "/_astro/", "/assets/"];

const ALLOWED_ABSOLUTE_EXACT = new Set([
	"/en", // sin barra final, también válido (p.ej. enlace a la home EN)
	"/favicon.svg",
	"/favicon.ico",
	"/apple-touch-icon.png",
	"/manifest.webmanifest",
]);

// Captura toda la etiqueta <a ...> para poder distinguir el conmutador de
// idioma (ver LANG_LINK_CLASS_RE) del resto. Solo hrefs que empiezan por "/".
const ANCHOR_RE = /<a\s[^>]*href="(\/[^"]*)"[^>]*>/g;

// El conmutador de idioma es la ÚNICA excepción legítima: enlaza deliberadamente
// a la variante española de la MISMA ruta. Se identifica por su markup exacto,
// no por "cualquier enlace en el nav" — esa red sería demasiado ancha.
const LANG_LINK_CLASS_RE = /class="[^"]*\blang-link\b[^"]*"/;

function isLangSwitchAnchor(anchorTag) {
	return LANG_LINK_CLASS_RE.test(anchorTag);
}

// Nav.astro emite el conmutador dos veces por página (<noscript> y con JS).
// Non-greedy: cada `</nav>` cierra el bloque más cercano.
const LANG_SWITCH_NAV_RE = /<nav class="lang-switch"[^>]*>[\s\S]*?<\/nav>/g;

async function findHtmlFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await findHtmlFiles(full)));
		} else if (entry.isFile() && entry.name.endsWith(".html")) {
			files.push(full);
		}
	}
	return files;
}

function isAllowed(href) {
	if (ALLOWED_ABSOLUTE_EXACT.has(href)) return true;
	return ALLOWED_ABSOLUTE_PREFIXES.some((prefix) => href.startsWith(prefix));
}

async function main() {
	let dirExists = true;
	try {
		await readdir(EN_DIR);
	} catch (err) {
		if (err.code === "ENOENT") {
			dirExists = false;
		} else {
			throw err;
		}
	}

	if (!dirExists) {
		console.log(
			"[check-locale-links] dist/en/ no existe todavía (build sin páginas " +
				"inglesas, o falta ejecutar `pnpm build`). Nada que comprobar — salgo con código 0.",
		);
		process.exit(0);
	}

	const htmlFiles = await findHtmlFiles(EN_DIR);

	if (htmlFiles.length === 0) {
		console.log(
			"[check-locale-links] dist/en/ existe pero no contiene ficheros .html. Nada que comprobar.",
		);
		process.exit(0);
	}

	const violations = [];

	for (const file of htmlFiles) {
		const html = await readFile(file, "utf-8");
		const relFile = path.relative(DIST_DIR, file);

		// Un lang-link solo se perdona si cae DENTRO de un rango <nav class="lang-switch">:
		// no basta con la clase sola, tiene que estar en el sitio correcto.
		const langSwitchRanges = [];
		for (const navMatch of html.matchAll(LANG_SWITCH_NAV_RE)) {
			langSwitchRanges.push([navMatch.index, navMatch.index + navMatch[0].length]);
		}
		const insideLangSwitch = (offset) =>
			langSwitchRanges.some(([start, end]) => offset >= start && offset < end);

		for (const match of html.matchAll(ANCHOR_RE)) {
			const href = match[1];
			if (isAllowed(href)) continue;
			if (isLangSwitchAnchor(match[0]) && insideLangSwitch(match.index)) continue;
			violations.push({ file: relFile, href });
		}
	}

	if (violations.length === 0) {
		console.log(
			`[check-locale-links] OK — ${htmlFiles.length} página(s) en dist/en/ revisadas, ningún enlace fuera de /en/.`,
		);
		process.exit(0);
	}

	console.error(
		`[check-locale-links] FALLO — ${violations.length} enlace(s) en páginas inglesas apuntan fuera de /en/:\n`,
	);
	for (const { file, href } of violations) {
		console.error(`  ${file} -> href="${href}"`);
	}
	console.error(
		"\nCada uno de estos hrefs manda a un visitante inglés de vuelta al sitio " +
			"español sin ningún error visible. Revisar que use el helper localizedPath " +
			"(o el prefijo /en/ correspondiente) en el origen.",
	);
	process.exit(1);
}

main().catch((err) => {
	console.error("[check-locale-links] Error inesperado:", err);
	process.exit(1);
});

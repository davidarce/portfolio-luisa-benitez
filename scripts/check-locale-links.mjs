// Gate de enlaces internos por idioma (T025).
//
// Recorre dist/en/**/*.html (el BUILD de producción, nunca el dev server) y
// busca cualquier href="/..." absoluto que NO apunte al espacio /en/. Ese es
// el fallo que este gate existe para atrapar: un enlace interno que olvida
// el prefijo de idioma manda a un visitante inglés de vuelta al sitio
// español sin ningún error visible — no rompe el build, no rompe los tipos,
// y a simple vista la página sigue funcionando.
//
// Uso:
//   node scripts/check-locale-links.mjs
//   pnpm check:links        (después de `pnpm build`, ver package.json)
//
// Exit code 0 si no hay hallazgos, 1 si hay al menos un href sospechoso.
// Si dist/en/ no existe todavía (build sin páginas inglesas, o build no
// ejecutado), el script lo avisa y termina en 0: no es un fallo del gate,
// es que todavía no hay nada que comprobar.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const EN_DIR = path.join(DIST_DIR, "en");

// Prefijos que SÍ pueden aparecer como href absoluto en una página EN sin
// ser una fuga al español: el propio espacio /en/, los assets generados por
// Astro/Vite, y los recursos de raíz del sitio (favicons, manifest...) que
// son compartidos entre idiomas a propósito (T012 ya los audita en origen).
// IMPORTANTE: estos son prefijos de SEGMENTO, no de string crudo. "/en" tiene
// que casar como el segmento de idioma completo (exactamente "/en" o algo que
// empiece por "/en/"), nunca como un prefijo de caracteres — si no,
// "/encargos/".startsWith("/en") también sería `true` y una ruta española
// futura que empezara por "en" colaría en silencio. Por eso "/en" exacto vive
// en ALLOWED_ABSOLUTE_EXACT y no aquí.
const ALLOWED_ABSOLUTE_PREFIXES = ["/en/", "/_astro/", "/assets/"];

const ALLOWED_ABSOLUTE_EXACT = new Set([
	"/en", // /en (sin barra final) también es válido, p.ej. algún enlace a la home EN
	"/favicon.svg",
	"/favicon.ico",
	"/apple-touch-icon.png",
	"/manifest.webmanifest",
]);

// Regex de extracción de href: capturamos toda la etiqueta <a ...> para
// poder distinguir el conmutador de idioma (T009, ver Nav.astro) del resto.
// Solo nos interesan los hrefs que empiezan por "/" (rutas absolutas de este
// sitio). Todo lo demás (http/https/mailto/tel, anclas #, rutas relativas) no
// puede confundir a nadie sobre el idioma: externo es externo, y un ancla
// #foo se queda en la misma página.
const ANCHOR_RE = /<a\s[^>]*href="(\/[^"]*)"[^>]*>/g;

// El conmutador de idioma (Nav.astro T009) es la ÚNICA excepción legítima:
// en una página inglesa, deliberadamente enlaza de vuelta a la variante
// española de la MISMA ruta para que el visitante pueda cambiar de idioma.
// Se identifica por su markup exacto — `class="lang-link"` dentro de
// `<nav class="lang-switch">` — no por "cualquier enlace en el nav" ni por
// "cualquier href con pinta de ruta española": esa red sería demasiado
// ancha y dejaría de proteger nada. Ver Nav.astro líneas ~130-145 y ~171-186.
const LANG_LINK_CLASS_RE = /class="[^"]*\blang-link\b[^"]*"/;

function isLangSwitchAnchor(anchorTag) {
	return LANG_LINK_CLASS_RE.test(anchorTag);
}

// Contenedor del conmutador — el `<nav class="lang-switch">…</nav>` completo
// que Nav.astro emite dos veces por página (versión <noscript> y versión
// con JS). Non-greedy: cada `</nav>` cierra el bloque más cercano.
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

		// Rangos de bytes ocupados por contenedores <nav class="lang-switch">…</nav>.
		// Un lang-link solo se perdona si cae DENTRO de uno de estos rangos —
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

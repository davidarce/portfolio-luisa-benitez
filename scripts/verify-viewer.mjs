#!/usr/bin/env node
// Verificador headless del visor de galería contra dist/ (nunca contra el dev
// server: ver .sdd/visor-galeria/plan.md Fase 6). Uso: pnpm verify:viewer [slug]
//
// Códigos de salida — el código ES la verificación, measurements.json es sólo
// evidencia para un humano:
//   0 = todo correcto.
//   1 = se verificó y alguna aserción falla.
//   2 = no se pudo verificar (falta playwright-core, falta dist/, dist/
//       desactualizado respecto a src/). Un 2 nunca cuenta como "pasa".

import { existsSync, statSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");
const EVIDENCE_DIR = path.join(ROOT, ".sdd", "visor-galeria");
const PORT = 4173;
const SLUG = process.argv[2] ?? "runway/angel-schlesser-2025";
const PAGE_PATH = `/${SLUG}/`;
const URL_BASE = `http://127.0.0.1:${PORT}`;

const WIDTHS = [
	{ width: 390, height: 844 },
	{ width: 768, height: 1024 },
	{ width: 1440, height: 900 },
];
// Vídeo estrecho documentado a mano (posters/video-1.webp, 608×1080): a 1440px
// de viewport debe quedar con banda lateral. Índice 1 porque el orden del
// carril es [foto 1.webp, video-1..4] — comprobado contra dist/ antes de fijarlo.
const NARROW_WITNESS = { index: 1, name: "posters/video-1.webp (608px)" };

const IPHONE_CHECKLIST = `# Checklist de iPhone — visor de galería

Ninguna comprobación automática cubre Safari de iOS ni VoiceOver; en este
proyecto el iPhone ya ha cazado dos bugs que las automáticas no vieron
(ver .sdd/visor-galeria/plan.md, sección Risks). Rellenar en un iPhone real.

1. [ ] El visor ocupa el alto real con la barra de Safari desplegada **y** replegada (valida \`100dvh\`).
2. [ ] Deslizar horizontalmente **en el centro** de la pantalla pasa de foto con inercia nativa.
3. [ ] Deslizar **desde el borde izquierdo** hace el gesto de volver atrás del sistema (aceptado, no se pelea con Safari).
4. [ ] Con el visor abierto, la página de detrás no se mueve al arrastrar en vertical.
5. [ ] Un vídeo se reproduce **dentro** del carril, no en el reproductor a pantalla completa de iOS (valida \`playsinline\`).
6. [ ] El botón «Volver» del navegador sale de la ficha de una sola pulsación: no hay una entrada de historial por diapositiva.
7. [ ] La barra inferior del visor no queda bajo el indicador de inicio (valida \`env(safe-area-inset-bottom)\`).
8. [ ] VoiceOver: con el visor abierto, deslizar hacia delante **no alcanza nunca** contenido del fondo.
9. [ ] VoiceOver: un gesto rápido que atraviesa 5-6 diapositivas produce **un** anuncio de posición, no una ristra.
10. [ ] El pinch-zoom funciona dentro del visor (si no amplía, hay \`touch-action\`/\`user-scalable=no\` que quitar).
11. [ ] Teclado Bluetooth: \`Tab\` alcanza el carril con anillo de foco visible y completo; el foco no se pierde en los extremos.
`;

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
			// fichero desapareció entre el listado y el stat: ignorar, no es señal de nada
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
		"falta playwright-core en este entorno. Ejecuta apuntando NODE_PATH al " +
			"directorio que lo tenga instalado, por ejemplo:\n" +
			"  NODE_PATH=/ruta/al/scratchpad/node_modules node scripts/verify-viewer.mjs",
	);
}

if (!existsSync(DIST)) fail(2, "no hay dist/: ejecuta pnpm build");
if (newestMtime(DIST) < newestMtime(SRC)) {
	fail(2, "dist/ es más antiguo que src/: ejecuta pnpm build antes de verificar");
}

const CHROME_PATH =
	process.env.CHROME_PATH ??
	path.join(process.env.HOME ?? "", ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome");
if (!existsSync(CHROME_PATH)) {
	fail(2, `no se encuentra Chromium en ${CHROME_PATH}. Define CHROME_PATH con la ruta correcta.`);
}

mkdirSync(EVIDENCE_DIR, { recursive: true });

const failures = [];
function check(cond, msg, ctx) {
	if (cond) {
		console.log(`  ok  ${msg}`);
	} else {
		const line = ctx ? `${msg} — ${JSON.stringify(ctx)}` : msg;
		failures.push(line);
		console.error(`  FALLA  ${line}`);
	}
}
// Las precondiciones no degradan a "pasa": si fallan, el resto de aserciones
// serían comparaciones sin sentido (0 <= 0, etc.), así que abortan el script.
function abortAssert(cond, msg, ctx) {
	if (!cond) throw new Error(`PRECONDICIÓN ABORTADA: ${msg}${ctx ? " " + JSON.stringify(ctx) : ""}`);
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

async function openViewer(page, index) {
	await page.click(`.gallery-open[data-viewer-index="${index}"]`);
	await page.waitForFunction(() => document.querySelector("[data-gallery-viewer]")?.matches(":modal") ?? false);
}

// Sin esperas fijas: sondea scrollLeft estable en dos frames consecutivos.
async function waitScrollStable(page) {
	await page.waitForFunction(
		() =>
			new Promise((resolve) => {
				const rail = document.querySelector(".viewer-rail");
				const before = rail.scrollLeft;
				requestAnimationFrame(() => requestAnimationFrame(() => resolve(before === rail.scrollLeft)));
			}),
	);
}

async function scrollToSlide(page, i) {
	await page.evaluate((i) => {
		const rail = document.querySelector(".viewer-rail");
		rail.scrollTo({ left: i * rail.clientWidth, behavior: "instant" });
	}, i);
	await waitScrollStable(page);
}

async function waitMediaReady(page, i, timeout = 8000) {
	await page.waitForFunction(
		(i) => {
			const slide = document.querySelectorAll(".viewer-slide")[i];
			const media = slide.querySelector("img,video");
			if (media.tagName === "VIDEO") return media.readyState >= 1; // HAVE_METADATA: basta para dimensiones
			return media.complete && media.naturalWidth > 0;
		},
		i,
		{ timeout },
	);
}

async function measureSlide(page, i) {
	return page.evaluate((i) => {
		const slide = document.querySelectorAll(".viewer-slide")[i];
		const media = slide.querySelector("img,video");
		const isVideo = media.tagName === "VIDEO";
		const cs = getComputedStyle(slide);
		const availW = slide.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
		const availH = slide.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
		const rect = media.getBoundingClientRect();
		return {
			isVideo,
			availW,
			availH,
			rectWidth: rect.width,
			rectHeight: rect.height,
			rectRight: rect.right,
			naturalWidth: isVideo ? media.videoWidth : media.naturalWidth,
			naturalHeight: isVideo ? media.videoHeight : media.naturalHeight,
			attrWidth: media.getAttribute("width"),
			attrHeight: media.getAttribute("height"),
		};
	}, i);
}

const server = await startServer();
const browser = await chromium.launch({ executablePath: CHROME_PATH });
const measurements = { slug: SLUG, generatedAt: new Date().toISOString(), dpr: 1, widths: [] };

try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

	console.log(`\n== Navegación: ${URL_BASE}${PAGE_PATH} ==`);
	const response = await page.goto(`${URL_BASE}${PAGE_PATH}`, { waitUntil: "load" });
	abortAssert(response && response.status() === 200, "la página no respondió 200", {
		status: response?.status(),
	});

	const slideCount = await page.evaluate(() => document.querySelectorAll(".viewer-slide").length);
	const openButtonCount = await page.evaluate(() => document.querySelectorAll(".gallery-open").length);
	abortAssert(
		slideCount === openButtonCount && slideCount > 0,
		"el visor no tiene tantas diapositivas como ítems el grid",
		{ slideCount, openButtonCount },
	);
	measurements.slideCount = slideCount;

	const historyLenBefore = await page.evaluate(() => history.length);

	console.log("\n== Apertura en índice concreto ==");
	const startIndex = Math.min(4, slideCount - 1);
	await openViewer(page, startIndex);
	abortAssert(
		await page.evaluate(() => document.querySelector("[data-gallery-viewer]")?.matches(":modal") ?? false),
		"el diálogo no quedó modal tras showModal()",
	);
	await scrollToSlide(page, startIndex);

	const openState = await page.evaluate((startIndex) => {
		const rail = document.querySelector(".viewer-rail");
		const cx = rail.getBoundingClientRect().left + rail.clientWidth / 2;
		const cy = rail.getBoundingClientRect().top + rail.clientHeight / 2;
		const atPoint = document.elementFromPoint(cx, cy)?.closest(".viewer-slide");
		const slides = [...document.querySelectorAll(".viewer-slide")];
		return {
			scrollLeft: rail.scrollLeft,
			clientWidth: rail.clientWidth,
			atPointIndex: atPoint ? slides.indexOf(atPoint) : -1,
			counterText: document.querySelector(".viewer-counter").textContent,
		};
	}, startIndex);
	check(
		Math.abs(openState.scrollLeft - startIndex * openState.clientWidth) <= 1,
		"scrollLeft coincide con el índice de apertura",
		openState,
	);
	check(openState.atPointIndex === startIndex, "elementFromPoint resuelve a la diapositiva de apertura", openState);
	check(openState.counterText === `${startIndex + 1} de ${slideCount}`, "contador exacto tras abrir", openState);

	console.log("\n== Trampa de foco (15× Tab) ==");
	let trapHeld = true;
	for (let n = 0; n < 15; n++) {
		await page.keyboard.press("Tab");
		const inside = await page.evaluate(
			() => document.activeElement?.closest("[data-gallery-viewer]") !== null,
		);
		if (!inside) trapHeld = false;
	}
	check(trapHeld, "Tab no escapa del diálogo en 15 pulsaciones");

	console.log("\n== Extremos (aria-disabled, nunca disabled) ==");
	await scrollToSlide(page, 0);
	const firstState = await page.evaluate(() => ({
		prevDisabledAttr: document.querySelector(".viewer-prev").hasAttribute("disabled"),
		prevAriaDisabled: document.querySelector(".viewer-prev").getAttribute("aria-disabled"),
	}));
	check(firstState.prevDisabledAttr === false, "viewer-prev nunca lleva el atributo disabled", firstState);
	check(firstState.prevAriaDisabled === "true", "viewer-prev con aria-disabled=true en el primer slide", firstState);

	await scrollToSlide(page, slideCount - 1);
	const lastState = await page.evaluate(() => ({
		nextDisabledAttr: document.querySelector(".viewer-next").hasAttribute("disabled"),
		nextAriaDisabled: document.querySelector(".viewer-next").getAttribute("aria-disabled"),
	}));
	check(lastState.nextDisabledAttr === false, "viewer-next nunca lleva el atributo disabled", lastState);
	check(lastState.nextAriaDisabled === "true", "viewer-next con aria-disabled=true en el último slide", lastState);

	console.log("\n== Anunciador: un salto de varios slides produce UNA mutación ==");
	await scrollToSlide(page, 0);
	await page.evaluate(() => {
		window.__mutCount = 0;
		window.__mutObserver = new MutationObserver(() => {
			window.__mutCount++;
		});
		window.__mutObserver.observe(document.querySelector(".viewer-announcer"), {
			childList: true,
			characterData: true,
			subtree: true,
		});
	});
	await scrollToSlide(page, slideCount - 1);
	// El propio anunciador se basa en un temporizador de 200ms (respaldo de
	// scrollend para iOS < 17.4); esta espera no sustituye a waitScrollStable,
	// mide el comportamiento deliberadamente temporizado que T014 documenta.
	await page.waitForTimeout(400);
	const mutCount = await page.evaluate(() => {
		window.__mutObserver.disconnect();
		return window.__mutCount;
	});
	check(mutCount === 1, "un salto de varias diapositivas anuncia una sola vez", { mutCount });

	const historyLenAfterNav = await page.evaluate(() => history.length);
	check(historyLenAfterNav === historyLenBefore, "history.length no cambia al navegar dentro del visor", {
		historyLenBefore,
		historyLenAfterNav,
	});

	console.log("\n== Ajuste contain ±1px, vídeos y desbordamiento, por ancho ==");
	for (const vw of WIDTHS) {
		await page.setViewportSize({ width: vw.width, height: vw.height });
		const widthEntry = { width: vw.width, height: vw.height, dpr: 1, slides: [] };

		for (let i = 0; i < slideCount; i++) {
			await scrollToSlide(page, i);
			await waitMediaReady(page, i);
			const d = await measureSlide(page, i);
			abortAssert(
				d.naturalWidth > 0 && d.rectWidth > 0,
				"naturalWidth o rect.width en cero: precondición rota, cualquier comparación posterior sería vacua",
				{ width: vw.width, slide: i },
			);

			const scale = Math.min(1, d.availW / d.naturalWidth, d.availH / d.naturalHeight);
			const predictedWidth = d.naturalWidth * scale;
			const predictedHeight = d.naturalHeight * scale;
			check(
				Math.abs(d.rectWidth - predictedWidth) <= 1,
				`ancho = predicción contain ±1px (slide ${i}, ${vw.width}px)`,
				{ rectWidth: d.rectWidth, predictedWidth },
			);
			check(
				Math.abs(d.rectHeight - predictedHeight) <= 1,
				`alto = predicción contain ±1px (slide ${i}, ${vw.width}px)`,
				{ rectHeight: d.rectHeight, predictedHeight },
			);

			if (d.isVideo) {
				check(
					Number.isInteger(+d.attrWidth) && +d.attrWidth > 0,
					`atributo width entero y positivo en <video> (slide ${i})`,
					{ attrWidth: d.attrWidth },
				);
				check(
					!(Math.round(d.rectWidth) === 300 && Math.round(d.rectHeight) === 150),
					`<video> NO se pinta a 300×150 (slide ${i}, ${vw.width}px)`,
					{ rectWidth: d.rectWidth, rectHeight: d.rectHeight },
				);
				const attrRatio = (+d.attrWidth) / (+d.attrHeight);
				const renderRatio = d.rectWidth / d.rectHeight;
				check(
					Math.abs(renderRatio - attrRatio) / attrRatio <= 0.01,
					`ratio del <video> renderizado ±1% del atributo (slide ${i})`,
					{ attrRatio, renderRatio },
				);
			}

			// Sólo la diapositiva activa: las demás están fuera del viewport del
			// carril por diseño y compararlas haría fallar un build correcto.
			check(
				d.rectRight <= vw.width + 0.5,
				`sin desbordamiento horizontal, diapositiva activa (slide ${i}, ${vw.width}px)`,
				{ rectRight: d.rectRight, viewport: vw.width },
			);

			widthEntry.slides.push({ index: i, ...d, predictedWidth, predictedHeight });
		}

		if (vw.width === 1440) {
			const witness = widthEntry.slides[NARROW_WITNESS.index];
			check(
				witness.availW - witness.rectWidth > 2,
				`letterbox visible a 1440px en el activo estrecho documentado (${NARROW_WITNESS.name})`,
				{ availW: witness.availW, rectWidth: witness.rectWidth },
			);
		}

		const barRect = await page.evaluate(() => document.querySelector(".viewer-bar").getBoundingClientRect());
		check(barRect.right <= vw.width + 0.5, `.viewer-bar sin desbordamiento horizontal (${vw.width}px)`, barRect);

		measurements.widths.push(widthEntry);
	}

	console.log("\n== Cierre: foco vuelve al botón de origen ==");
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.keyboard.press("Escape");
	await page.waitForFunction(
		() => !(document.querySelector("[data-gallery-viewer]")?.matches(":modal") ?? false),
	);
	const focusReturned = await page.evaluate(
		(startIndex) => document.activeElement === document.querySelector(`.gallery-open[data-viewer-index="${startIndex}"]`),
		startIndex,
	);
	check(focusReturned, "Escape devuelve el foco al .gallery-open que abrió el visor");

	console.log("\n== Regresión R1: viewer-open no sobrevive a astro:before-swap ==");
	await page.evaluate(() => window.scrollTo(0, 0));
	const preNavUrl = page.url();
	await page.click("a.back-link");
	await page.waitForFunction((prev) => window.location.href !== prev, preNavUrl, { timeout: 5000 });
	// astro:after-swap corre en el mismo tick que el swap del DOM; un margen
	// pequeño basta para que el listener de BaseLayout.astro termine.
	await page.waitForTimeout(150);
	const r1 = await page.evaluate(() => {
		const before = window.scrollY;
		window.scrollBy(0, 400);
		return {
			viewerOpenClassGone: !document.documentElement.classList.contains("viewer-open"),
			scrollMoved: window.scrollY !== before,
		};
	});
	check(r1.viewerOpenClassGone, "la clase viewer-open no sobrevive a la navegación con ClientRouter", r1);
	check(r1.scrollMoved, "la página siguiente puede hacer scroll de verdad (no sólo falta la clase)", r1);

	console.log("\n== Capturas del visor (8) — tema asertado antes de cada disparo ==");
	const bg = {};
	async function captureShot(ctx, { theme, slideIndex, filename }) {
		const shotPage = await ctx.newPage();
		await shotPage.goto(`${URL_BASE}${PAGE_PATH}`, { waitUntil: "load" });
		await shotPage.evaluate((theme) => localStorage.setItem("theme", theme), theme);
		await shotPage.reload({ waitUntil: "load" });
		const applied = await shotPage.evaluate(
			(theme) => document.documentElement.classList.contains("theme-dark") === (theme === "dark"),
			theme,
		);
		abortAssert(applied, "el tema no se aplicó antes de capturar", { theme, filename });
		await openViewer(shotPage, slideIndex);
		await scrollToSlide(shotPage, slideIndex);
		await waitMediaReady(shotPage, slideIndex);
		await shotPage.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
		bg[filename] = await shotPage.evaluate(
			() => getComputedStyle(document.querySelector("[data-gallery-viewer]")).backgroundColor,
		);
		await shotPage.close();
	}

	const ctx390 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
	const ctx1440 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
	const photoIndex = 0;
	const videoIndex = NARROW_WITNESS.index;
	const shotPlan = [
		{ ctx: ctx390, theme: "light", slideIndex: photoIndex, filename: "viewer-390-light-photo.png" },
		{ ctx: ctx390, theme: "dark", slideIndex: photoIndex, filename: "viewer-390-dark-photo.png" },
		{ ctx: ctx390, theme: "light", slideIndex: videoIndex, filename: "viewer-390-light-video.png" },
		{ ctx: ctx390, theme: "dark", slideIndex: videoIndex, filename: "viewer-390-dark-video.png" },
		{ ctx: ctx1440, theme: "light", slideIndex: photoIndex, filename: "viewer-1440-light-photo.png" },
		{ ctx: ctx1440, theme: "dark", slideIndex: photoIndex, filename: "viewer-1440-dark-photo.png" },
		{ ctx: ctx1440, theme: "light", slideIndex: videoIndex, filename: "viewer-1440-light-video.png" },
		{ ctx: ctx1440, theme: "dark", slideIndex: videoIndex, filename: "viewer-1440-dark-video.png" },
	];
	for (const shot of shotPlan) await captureShot(shot.ctx, shot);

	check(
		bg["viewer-390-light-photo.png"] !== bg["viewer-390-dark-photo.png"],
		"390px: el fondo del visor difiere entre tema claro y oscuro (no son duplicados)",
		bg,
	);
	check(
		bg["viewer-1440-light-photo.png"] !== bg["viewer-1440-dark-photo.png"],
		"1440px: el fondo del visor difiere entre tema claro y oscuro (no son duplicados)",
		bg,
	);
	measurements.screenshotBackgrounds = bg;

	console.log("\n== No-regresión del grid (2 capturas) ==");
	for (const { ctx, filename } of [
		{ ctx: ctx390, filename: "grid-390-light.png" },
		{ ctx: ctx1440, filename: "grid-1440-light.png" },
	]) {
		const gridPage = await ctx.newPage();
		await gridPage.goto(`${URL_BASE}${PAGE_PATH}`, { waitUntil: "load" });
		await gridPage.evaluate(() => localStorage.setItem("theme", "light"));
		await gridPage.reload({ waitUntil: "load" });
		await gridPage.screenshot({ path: path.join(EVIDENCE_DIR, filename), fullPage: false });
		await gridPage.close();
	}

	await ctx390.close();
	await ctx1440.close();

	writeFileSync(
		path.join(EVIDENCE_DIR, "iphone-checklist.md"),
		IPHONE_CHECKLIST,
	);
	console.log(`\nEscrito ${path.join(EVIDENCE_DIR, "iphone-checklist.md")}`);
} catch (err) {
	failures.push(`excepción no controlada: ${err.message}`);
	console.error(`\n✖ Excepción no controlada: ${err.stack ?? err.message}\n`);
} finally {
	writeFileSync(path.join(EVIDENCE_DIR, "measurements.json"), JSON.stringify(measurements, null, 2));
	console.log(`\nEvidencia escrita en ${path.join(EVIDENCE_DIR, "measurements.json")}`);
	await browser.close();
	server.kill();
}

if (failures.length > 0) {
	console.error(`\n${failures.length} aserción(es) fallida(s):`);
	for (const f of failures) console.error(`  - ${f}`);
	console.error("");
	process.exit(1);
}

console.log("\npnpm verify:viewer: TODO CORRECTO (código 0)\n");
process.exit(0);

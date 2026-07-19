// Author-time asset generator: favicons, PWA icons, and the default OG image.
//
// Rasterizes public/favicon.svg (the "LB" monogram) into the full favicon/PWA
// set and composites a 1200x630 default Open Graph card. Run manually via
// `pnpm run generate:assets` — this script is NOT wired into `astro build`,
// so the static build stays deterministic. Idempotent; writes only to public/.
//
// Inputs:
//   public/favicon.svg           - "LB" monogram (white LB on black circle)
//   src/assets/portrait.webp     - optional, composited into the OG card
// Outputs (public/):
//   favicon.ico                  - multi-res (16/32/48) via png-to-ico
//   apple-touch-icon.png         - 180x180
//   icon-192.png                 - 192x192 (PWA)
//   icon-512.png                 - 512x512 (PWA)
//   icon-512-maskable.png        - 512x512, monogram scaled to ~80% for the
//                                  Android adaptive-icon safe zone
//   assets/og-default.png        - 1200x630 dark card, name + role text,
//                                  optional right-aligned portrait

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const ASSETS_OUT_DIR = path.join(PUBLIC_DIR, "assets");

const FAVICON_SVG = path.join(PUBLIC_DIR, "favicon.svg");
const PORTRAIT = path.join(ROOT, "src", "assets", "portrait.webp");

const DARK_BG = "#090b11";
const OG_TITLE = "Luisa Benítez";
const OG_SUBTITLE = "Estilista y Asesora de Imagen";
// Full text alternative — MUST match SEO.astro's default `imageAlt`
// ("Luisa Benítez — Estilista y Asesora de Imagen"), WCAG 1.1.1.
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function rasterizeMonogram(size) {
	const svg = await readFile(FAVICON_SVG);
	return sharp(svg).resize(size, size).png().toBuffer();
}

async function writePng(buffer, outPath) {
	await mkdir(path.dirname(outPath), { recursive: true });
	await writeFile(outPath, buffer);
	console.log(`wrote ${path.relative(ROOT, outPath)}`);
}

async function generateFavicons() {
	// Standard square icons rasterized straight from the SVG monogram.
	const [png180, png192, png512] = await Promise.all([
		rasterizeMonogram(180),
		rasterizeMonogram(192),
		rasterizeMonogram(512),
	]);
	await writePng(png180, path.join(PUBLIC_DIR, "apple-touch-icon.png"));
	await writePng(png192, path.join(PUBLIC_DIR, "icon-192.png"));
	await writePng(png512, path.join(PUBLIC_DIR, "icon-512.png"));

	// Multi-resolution .ico for legacy browser tabs.
	const [png16, png32, png48] = await Promise.all([
		rasterizeMonogram(16),
		rasterizeMonogram(32),
		rasterizeMonogram(48),
	]);
	const icoBuffer = await pngToIco([png16, png32, png48]);
	await writePng(icoBuffer, path.join(PUBLIC_DIR, "favicon.ico"));

	// Maskable icon: monogram scaled to ~80% within a solid canvas so the
	// glyph stays inside Android's ~10% adaptive-icon safe zone on each side.
	const maskableGlyphSize = Math.round(512 * 0.8);
	const glyph = await rasterizeMonogram(maskableGlyphSize);
	const offset = Math.round((512 - maskableGlyphSize) / 2);
	const maskable = await sharp({
		create: {
			width: 512,
			height: 512,
			channels: 4,
			background: DARK_BG,
		},
	})
		.composite([{ input: glyph, left: offset, top: offset }])
		.png()
		.toBuffer();
	await writePng(maskable, path.join(PUBLIC_DIR, "icon-512-maskable.png"));
}

async function fileExists(p) {
	try {
		await readFile(p);
		return true;
	} catch {
		return false;
	}
}

function escapeXml(str) {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/**
 * Builds the SVG text overlay for the OG card. `textX` lets the caller
 * left-align the text block when a portrait occupies the right side.
 */
function buildTextOverlaySvg({ textX }) {
	return Buffer.from(`
		<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
			<text x="${textX}" y="290" font-family="'Public Sans', 'Helvetica Neue', sans-serif"
				font-size="72" font-weight="700" fill="#ffffff">${escapeXml(OG_TITLE)}</text>
			<text x="${textX}" y="350" font-family="'Public Sans', 'Helvetica Neue', sans-serif"
				font-size="36" font-weight="400" fill="#c9ccd6">${escapeXml(OG_SUBTITLE)}</text>
		</svg>
	`);
}

async function generateOgImage() {
	const canvas = sharp({
		create: {
			width: OG_WIDTH,
			height: OG_HEIGHT,
			channels: 4,
			background: DARK_BG,
		},
	});

	const hasPortrait = await fileExists(PORTRAIT);
	let composites;

	if (hasPortrait) {
		try {
			// Right-aligned portrait, cropped to a fixed-width column so it
			// never overlaps the text block on the left.
			const portraitWidth = 420;
			const portraitBuffer = await sharp(PORTRAIT)
				.resize(portraitWidth, OG_HEIGHT, { fit: "cover" })
				.toBuffer();
			composites = [
				{ input: portraitBuffer, left: OG_WIDTH - portraitWidth, top: 0 },
				{ input: buildTextOverlaySvg({ textX: 80 }), left: 0, top: 0 },
			];
		} catch (err) {
			console.warn(
				`portrait composite failed (${err.message}), falling back to text-only OG card`,
			);
			composites = [{ input: buildTextOverlaySvg({ textX: 80 }), left: 0, top: 0 }];
		}
	} else {
		composites = [{ input: buildTextOverlaySvg({ textX: 80 }), left: 0, top: 0 }];
	}

	const ogBuffer = await canvas.composite(composites).png().toBuffer();
	await writePng(ogBuffer, path.join(ASSETS_OUT_DIR, "og-default.png"));
}

await generateFavicons();
await generateOgImage();

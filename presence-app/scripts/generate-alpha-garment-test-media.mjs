#!/usr/bin/env node
/**
 * Generates the synthetic alpha-masked garment test artwork used by the
 * internal rack evidence fixture.
 *
 * Everything here is procedural and public-safe: flat shapes drawn from
 * analytic predicates, no photography, no brand marks, no product truth. Each
 * image bakes a visible "TEST" wordmark and an F/B face letter so a screenshot
 * cannot be mistaken for real creative, and so front and back artwork are
 * distinguishable in the render.
 *
 * The point of the set is the ALPHA CHANNEL: every pixel outside the garment
 * silhouette is fully transparent, so `alphaTest` has something to carve and a
 * garment stops reading as a rectangular card.
 *
 * PNGs are encoded here directly (zlib is in Node) rather than pulling in an
 * image dependency for six small test files.
 *
 * Run: node scripts/generate-alpha-garment-test-media.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "presence-spatial",
  "internal-evidence",
  "alpha-garments",
);

// --- tiny 5x7 bitmap font, only the glyphs the labels need ---
const GLYPHS = {
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
};

/** Draws a glyph string into the pixel buffer at a pixel scale. */
function stamp(pixels, width, height, text, originX, originY, scale, colour) {
  let cursorX = originX;
  for (const character of text) {
    const glyph = GLYPHS[character];
    if (!glyph) { cursorX += 6 * scale; continue; }
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] !== "1") continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const x = cursorX + column * scale + dx;
            const y = originY + row * scale + dy;
            if (x < 0 || y < 0 || x >= width || y >= height) continue;
            const offset = (y * width + x) * 4;
            // Only paint where the garment already is, so the label can never
            // add opaque pixels outside the silhouette.
            if (pixels[offset + 3] === 0) continue;
            pixels[offset] = colour[0];
            pixels[offset + 1] = colour[1];
            pixels[offset + 2] = colour[2];
            pixels[offset + 3] = 255;
          }
        }
      }
    }
    cursorX += 6 * scale;
  }
}

// --- silhouettes, in normalised coordinates (u,v), v = 0 at the top ---

function shirtSilhouette(u, v) {
  // Neck scoop, cut before anything else so it stays open.
  const neckX = (u - 0.5) / 0.13;
  const neckY = (v - 0.055) / 0.075;
  if (neckX * neckX + neckY * neckY <= 1) return false;

  // Body, very slightly A-line.
  if (v >= 0.30) {
    const t = (v - 0.30) / 0.70;
    if (u >= 0.245 - 0.035 * t && u <= 0.755 + 0.035 * t) return true;
  }
  // Shoulders and sleeves: the outer edge drops away from the body.
  if (v >= 0.09 && v <= 0.365) {
    const t = (v - 0.09) / 0.275;
    const outer = 0.045 + 0.10 * t * t;
    if (u >= outer && u <= 1 - outer) return true;
  }
  return false;
}

function pantSilhouette(u, v) {
  if (v < 0.03 || v > 0.985) return false;
  // Waistband, then hips.
  if (v <= 0.13) return u >= 0.13 && u <= 0.87;
  if (v <= 0.33) {
    const t = (v - 0.13) / 0.20;
    return u >= 0.115 - 0.02 * t && u <= 0.885 + 0.02 * t;
  }
  // Two legs with a crotch notch that opens downward.
  const t = (v - 0.33) / 0.655;
  const gap = 0.005 + 0.055 * t;
  const taper = 0.055 * t;
  const leftLeg = u >= 0.135 + taper && u <= 0.5 - gap;
  const rightLeg = u >= 0.5 + gap && u <= 0.865 - taper;
  return leftLeg || rightLeg;
}

function genericSilhouette(u, v) {
  const neckX = (u - 0.5) / 0.115;
  const neckY = (v - 0.05) / 0.065;
  if (neckX * neckX + neckY * neckY <= 1) return false;

  // A-line tunic: narrow at the shoulder, wide at the hem.
  if (v >= 0.08) {
    const t = (v - 0.08) / 0.92;
    const half = 0.165 + 0.245 * t * t;
    if (Math.abs(u - 0.5) <= half) return true;
  }
  // Cap sleeves.
  if (v >= 0.10 && v <= 0.27) {
    const t = (v - 0.10) / 0.17;
    const outer = 0.16 - 0.05 * (1 - t);
    if (u >= outer - 0.10 && u <= 1 - outer + 0.10) return true;
  }
  return false;
}

function shoeSilhouette(u, v) {
  // Sole slab with a lifted toe.
  if (v >= 0.70 && v <= 0.90 && u >= 0.05 && u <= 0.95) {
    const toeLift = u < 0.18 ? (0.18 - u) * 0.6 : 0;
    if (v <= 0.90 - toeLift) return true;
  }
  // Upper: an ellipse over the forefoot, plus a heel collar.
  const upperX = (u - 0.42) / 0.36;
  const upperY = (v - 0.60) / 0.28;
  if (upperX * upperX + upperY * upperY <= 1 && v <= 0.80) return true;
  if (u >= 0.62 && u <= 0.84 && v >= 0.30 && v <= 0.76) {
    const collar = (u - 0.73) / 0.11;
    if (v >= 0.30 + collar * collar * 0.10) return true;
  }
  return false;
}

const ARTICLES = {
  shirt: { width: 228, height: 240, silhouette: shirtSilhouette, base: [58, 92, 168], accent: [236, 241, 250] },
  pant: { width: 150, height: 326, silhouette: pantSilhouette, base: [46, 122, 106], accent: [232, 246, 240] },
  generic: { width: 216, height: 240, silhouette: genericSilhouette, base: [140, 66, 148], accent: [246, 234, 250] },
  shoe: { width: 288, height: 180, silhouette: shoeSilhouette, base: [186, 96, 44], accent: [252, 240, 228] },
};

/** Front and back carry different marks so the two faces are tellable apart. */
function faceMark(face, u, v) {
  if (face === "front") {
    // A ring emblem high on the chest.
    const dx = u - 0.5;
    const dy = (v - 0.42) * 0.85;
    const radius = Math.sqrt(dx * dx + dy * dy);
    if (radius <= 0.14 && radius >= 0.085) return true;
    return v >= 0.66 && v <= 0.705;
  }
  // A chevron plus a double hem stripe.
  const chevron = Math.abs(u - 0.5) * 0.9;
  if (v >= 0.36 + chevron && v <= 0.42 + chevron && v <= 0.62) return true;
  if (v >= 0.68 && v <= 0.705) return true;
  return v >= 0.735 && v <= 0.76;
}

function renderArticle(article, face) {
  const spec = ARTICLES[article];
  const { width, height } = spec;
  const pixels = Buffer.alloc(width * height * 4, 0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const v = (y + 0.5) / height;
      if (!spec.silhouette(u, v)) continue; // stays fully transparent
      const offset = (y * width + x) * 4;
      const marked = faceMark(face, u, v);
      const colour = marked ? spec.accent : spec.base;
      // A gentle vertical ramp so the shape reads as fabric, not a flat chip.
      const shade = marked ? 1 : 0.82 + 0.18 * (1 - v);
      pixels[offset] = Math.round(colour[0] * shade);
      pixels[offset + 1] = Math.round(colour[1] * shade);
      pixels[offset + 2] = Math.round(colour[2] * shade);
      pixels[offset + 3] = 255;
    }
  }

  const scale = article === "pant" ? 2 : 2;
  stamp(pixels, width, height, "TEST", Math.round(width * 0.5 - 11 * scale), Math.round(height * 0.845), scale, [12, 14, 20]);
  stamp(pixels, width, height, face === "front" ? "F" : "B", Math.round(width * 0.5 - 2.5 * scale), Math.round(height * 0.19), scale, [12, 14, 20]);
  return { width, height, pixels };
}

// --- minimal PNG encoder (RGBA8, no interlace) ---

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng({ width, height, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter: none, keeps the encoder trivially reproducible
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
const written = [];
for (const article of Object.keys(ARTICLES)) {
  const faces = article === "shoe" ? ["front"] : ["front", "back"];
  for (const face of faces) {
    const name = article === "shoe" ? "shoe-display-alpha.png" : `${article}-${face}-alpha.png`;
    const png = encodePng(renderArticle(article, face));
    writeFileSync(join(OUT_DIR, name), png);
    written.push({ name, bytes: png.length });
  }
}

for (const file of written) console.log(`${file.name}\t${file.bytes} bytes`);
console.log(`total\t${written.reduce((sum, file) => sum + file.bytes, 0)} bytes`);

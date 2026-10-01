// One-off generator for src/app/favicon.ico.
//
// No image-processing dependency (sharp/canvas/jimp) is installed in this
// repo, so this hand-rolls the pixels and the ICO container directly:
//  - each size is rasterized as a 32bpp BGRA bitmap by evaluating a simple
//    vector "M" glyph (two verticals + two diagonals) per pixel
//  - the bitmaps are packed into a classic multi-resolution .ico using the
//    uncompressed BITMAPINFOHEADER (DIB) entry format, which the ICO spec
//    supports natively (no PNG encoder needed)
//
// Colors are the real MBF tokens from src/app/globals.css:
//   --sidebar-bg (navy)      #0B1F3A
//   --accent-contrast (light) #FFFFFF
// matching what src/app/icon.tsx already renders, so favicon.ico and the
// modern /icon route look identical.

const fs = require("fs");
const path = require("path");

const BG = [0x0b, 0x1f, 0x3a]; // #0B1F3A navy, RGB
const FG = [0xff, 0xff, 0xff]; // #FFFFFF white

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq === 0 ? 0 : (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Returns true if normalized point (x,y in 0..1, y down) is inside the "M".
function isGlyph(x, y) {
  const leftBar = x >= 0.14 && x <= 0.27 && y >= 0.22 && y <= 0.78;
  const rightBar = x >= 0.73 && x <= 0.86 && y >= 0.22 && y <= 0.78;
  const diagThickness = 0.085;
  const d1 = distToSegment(x, y, 0.27, 0.22, 0.5, 0.56) < diagThickness;
  const d2 = distToSegment(x, y, 0.73, 0.22, 0.5, 0.56) < diagThickness;
  return leftBar || rightBar || (d1 && y <= 0.6) || (d2 && y <= 0.6);
}

// Renders one size as a flat RGBA buffer (row-major, top-down), with a
// rounded-square navy background (radius ~18% of size) and the white glyph,
// 2x supersampled for cheap anti-aliasing then box-downsampled.
function renderSize(size) {
  const ss = 4; // supersample factor
  const big = size * ss;
  const radius = big * 0.18;
  const buf = new Uint8ClampedArray(big * big * 4);

  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const idx = (y * big + x) * 4;
      // Rounded-rect mask for the background square.
      const inRounded = (() => {
        const rx = Math.min(x, big - 1 - x);
        const ry = Math.min(y, big - 1 - y);
        if (rx >= radius || ry >= radius) return true;
        const dx = radius - rx;
        const dy = radius - ry;
        return dx * dx + dy * dy <= radius * radius;
      })();

      if (!inRounded) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0; // transparent outside the rounded square
        continue;
      }

      const nx = (x + 0.5) / big;
      const ny = (y + 0.5) / big;
      const glyph = isGlyph(nx, ny);
      const color = glyph ? FG : BG;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = 255;
    }
  }

  // Box downsample big x big -> size x size.
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const sidx = ((y * ss + sy) * big + (x * ss + sx)) * 4;
          r += buf[sidx];
          g += buf[sidx + 1];
          b += buf[sidx + 2];
          a += buf[sidx + 3];
        }
      }
      const n = ss * ss;
      const oidx = (y * size + x) * 4;
      out[oidx] = r / n;
      out[oidx + 1] = g / n;
      out[oidx + 2] = b / n;
      out[oidx + 3] = a / n;
    }
  }
  return out; // RGBA, top-down
}

// Packs one size's RGBA (top-down) buffer into an ICO DIB entry
// (BITMAPINFOHEADER + 32bpp BGRA XOR data bottom-up + 1bpp AND mask).
function toDibEntry(rgba, size) {
  const headerSize = 40;
  const xorRowBytes = size * 4; // already 4-byte aligned at 32bpp
  const andRowBytes = Math.ceil(size / 32) * 4; // 1bpp, padded to 4 bytes
  const xorSize = xorRowBytes * size;
  const andSize = andRowBytes * size;
  const data = Buffer.alloc(headerSize + xorSize + andSize);

  data.writeUInt32LE(headerSize, 0);
  data.writeInt32LE(size, 4);
  data.writeInt32LE(size * 2, 8); // height field = 2x for ICO (XOR + AND)
  data.writeUInt16LE(1, 12); // planes
  data.writeUInt16LE(32, 14); // bitcount
  data.writeUInt32LE(0, 16); // compression = BI_RGB
  data.writeUInt32LE(xorSize, 20);
  data.writeInt32LE(0, 24);
  data.writeInt32LE(0, 28);
  data.writeUInt32LE(0, 32);
  data.writeUInt32LE(0, 36);

  // XOR (color) data, bottom-up, BGRA byte order.
  let offset = headerSize;
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[offset++] = rgba[i + 2]; // B
      data[offset++] = rgba[i + 1]; // G
      data[offset++] = rgba[i]; // R
      data[offset++] = rgba[i + 3]; // A
    }
  }

  // AND mask: all zero (fully opaque per-pixel via alpha channel above is
  // honored by modern consumers; a zeroed mask keeps legacy ones from
  // forcing transparency).
  offset = headerSize + xorSize;
  for (let i = 0; i < andSize; i++) data[offset + i] = 0;

  return data;
}

function buildIco(sizes) {
  const entries = sizes.map((s) => ({
    size: s,
    data: toDibEntry(renderSize(s), s),
  }));

  const dirSize = 6 + 16 * entries.length;
  let offset = dirSize;
  const dir = Buffer.alloc(dirSize);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type = icon
  dir.writeUInt16LE(entries.length, 4);

  entries.forEach((e, i) => {
    const base = 6 + i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, base + 0);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, base + 1);
    dir.writeUInt8(0, base + 2); // color count
    dir.writeUInt8(0, base + 3); // reserved
    dir.writeUInt16LE(1, base + 4); // planes
    dir.writeUInt16LE(32, base + 6); // bitcount
    dir.writeUInt32LE(e.data.length, base + 8);
    dir.writeUInt32LE(offset, base + 12);
    offset += e.data.length;
  });

  return Buffer.concat([dir, ...entries.map((e) => e.data)]);
}

if (require.main === module) {
  const ico = buildIco([16, 32, 48]);
  const outPath = path.join(__dirname, "..", "src", "app", "favicon.ico");
  fs.writeFileSync(outPath, ico);
  console.log(`Wrote ${outPath} (${ico.length} bytes)`);
}

module.exports = { renderSize };

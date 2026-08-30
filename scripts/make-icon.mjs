// Generates app.ico (multi-size Windows icon) with zero dependencies.
// 16/24/32/48/64 px are embedded as 32bpp BMP (DIB) entries; 128/256 as PNG.
// Design: full-bleed rounded square, teal->blue vertical gradient, white "Z".
// Usage: node scripts/make-icon.mjs   (writes app.ico at the repo root)
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'app.ico');

// ---------- minimal PNG encoder (8-bit RGBA) ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ---------- ICO DIB entry (32bpp BGRA + empty AND mask) ----------
function encodeDIB(w, h, rgba) {
  const andStride = Math.ceil(w / 32) * 4;
  const xorSize = w * h * 4;
  const buf = Buffer.alloc(40 + xorSize + andStride * h);
  buf.writeUInt32LE(40, 0);            // BITMAPINFOHEADER size
  buf.writeInt32LE(w, 4);
  buf.writeInt32LE(h * 2, 8);          // XOR + AND heights
  buf.writeUInt16LE(1, 12);            // planes
  buf.writeUInt16LE(32, 14);           // bpp
  buf.writeUInt32LE(xorSize + andStride * h, 20);
  for (let y = 0; y < h; y++) {
    const srcRow = h - 1 - y;          // bottom-up
    for (let x = 0; x < w; x++) {
      const si = (srcRow * w + x) * 4;
      const di = 40 + (y * w + x) * 4;
      buf[di] = rgba[si + 2];
      buf[di + 1] = rgba[si + 1];
      buf[di + 2] = rgba[si];
      buf[di + 3] = rgba[si + 3];
    }
  }
  return buf;
}

// ---------- vector design (SDF rendering) ----------
const TOP = [20, 184, 166];  // #14B8A6 teal
const BOT = [37, 99, 235];   // #2563EB blue
const COS45 = Math.SQRT1_2;

function sdRoundBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
// White "Z": top bar + bottom bar + 45° diagonal, in unit half-space [-1,1]
function glyphSDF(px, py) {
  let d = sdRoundBox(px, py + 0.52, 0.52, 0.135, 0.05);
  d = Math.min(d, sdRoundBox(px, py - 0.52, 0.52, 0.135, 0.05));
  const rx = -COS45 * px + COS45 * py;
  const ry = -COS45 * px - COS45 * py;
  d = Math.min(d, sdRoundBox(rx, ry, 0.735, 0.10, 0.035));
  return d;
}
const clamp01 = v => Math.min(1, Math.max(0, v));

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const half = size / 2;
  const radius = size * 0.22;
  const ss = size <= 48 ? 2 : 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss, py = y + (sy + 0.5) / ss;
          const ux = px - c, uy = py - c;
          const covBg = clamp01(0.5 - sdRoundBox(ux, uy, half, half, radius));
          if (covBg <= 0) continue;
          const covG = clamp01(0.5 - glyphSDF(ux / half, uy / half) * half);
          const t = clamp01(py / (size - 1));
          const br = TOP[0] + (BOT[0] - TOP[0]) * t;
          const bg = TOP[1] + (BOT[1] - TOP[1]) * t;
          const bb = TOP[2] + (BOT[2] - TOP[2]) * t;
          const r = 255 * covG + br * (1 - covG);
          const g = 255 * covG + bg * (1 - covG);
          const b = 255 * covG + bb * (1 - covG);
          rAcc += r * covBg; gAcc += g * covBg; bAcc += b * covBg;
          aAcc += covBg;
        }
      }
      const di = (y * size + x) * 4;
      if (aAcc > 0) {
        rgba[di] = Math.round(rAcc / aAcc);
        rgba[di + 1] = Math.round(gAcc / aAcc);
        rgba[di + 2] = Math.round(bAcc / aAcc);
        rgba[di + 3] = Math.round(255 * (aAcc / (ss * ss)));
      }
    }
  }
  return rgba;
}

// ---------- assemble .ico ----------
const SIZES = [16, 24, 32, 48, 64, 128, 256];
const entries = SIZES.map(s => {
  const rgba = render(s);
  return { s, data: s >= 128 ? encodePNG(s, s, rgba) : encodeDIB(s, s, rgba) };
});
let offset = 6 + entries.length * 16;
const dir = Buffer.alloc(6 + entries.length * 16);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2); // icon type
dir.writeUInt16LE(entries.length, 4);
entries.forEach((e, i) => {
  const o = 6 + i * 16;
  dir[o] = e.s >= 256 ? 0 : e.s;      // 0 encodes 256
  dir[o + 1] = e.s >= 256 ? 0 : e.s;
  dir.writeUInt16LE(1, o + 4);        // planes
  dir.writeUInt16LE(32, o + 6);       // bpp
  dir.writeUInt32LE(e.data.length, o + 8);
  dir.writeUInt32LE(offset, o + 12);
  offset += e.data.length;
});
fs.writeFileSync(OUT, Buffer.concat([dir, ...entries.map(e => e.data)]));
console.log(`✅ app.ico written: ${fs.statSync(OUT).size} bytes, sizes ${SIZES.join('/')}`);

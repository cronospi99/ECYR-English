#!/usr/bin/env node
/**
 * Genera el QR de unión de la búsqueda del tesoro: public/modules/diwali/qr-join.svg y .png
 * apuntando a <URL>/hunt/join (misma lib qrcode-generator que la app).
 *   node scripts/make-hunt-qr.mjs --url https://ecyr-english.vercel.app
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--url');
const base = (i > 0 ? process.argv[i + 1] : 'https://ecyr-english.vercel.app').replace(/\/+$/, '');
const target = `${base}/hunt/join`;
const out = path.join(ROOT, 'public/modules/diwali');
const jiti = createJiti(import.meta.url, { interopDefault: true });
const { qrMatrix, qrSvg } = await jiti.import(path.join(ROOT, 'src/lib/clueHunt/qr.ts'));

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'qr-join.svg'), qrSvg(target));

// PNG (1-bit-like grayscale, no dependencies): 4-module quiet zone, 16 px per module.
const m = qrMatrix(target), n = m.length, Q = 4, S = 16, W = (n + Q * 2) * S;
const raw = Buffer.alloc((W + 1) * W, 255);
for (let y = 0; y < W; y++) {
  raw[y * (W + 1)] = 0;
  const r = Math.floor(y / S) - Q;
  for (let x = 0; x < W; x++) {
    const c = Math.floor(x / S) - Q;
    if (r >= 0 && c >= 0 && r < n && c < n && m[r][c]) raw[y * (W + 1) + 1 + x] = 8;
  }
}
const crcT = Array.from({ length: 256 }, (_, k) => { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]); const o = Buffer.alloc(4); o.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([o, b, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 0;
fs.writeFileSync(path.join(out, 'qr-join.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`QR → ${target}\n  ${path.relative(ROOT, out)}/qr-join.svg y qr-join.png (${W}x${W})`);

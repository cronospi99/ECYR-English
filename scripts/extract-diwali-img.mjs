#!/usr/bin/env node
/**
 * Extrae las imágenes webp (base64) del Bingo de Diwali a public/modules/diwali/img/<nombre>.webp
 * y genera public/modules/diwali/diwali-bingo.html con rutas a archivos (sin cambiar su lógica) +
 * el bridge ecyr-fx para volver al hub.
 *   node scripts/extract-diwali-img.mjs /ruta/Bingo_Diwali.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || '/root/.claude/uploads/e5e46bdd-a90b-59ad-85fe-328b82af86af/01ed06d5-Bingo_Diwali.html';
const out = path.join(ROOT, 'public/modules/diwali');
const html = fs.readFileSync(src, 'utf8');
const m = html.match(/const IMG=(\{[^\n]*\});?\n/);
if (!m) throw new Error('No se encontró const IMG={...}');
const IMG = JSON.parse(m[1]);
fs.mkdirSync(path.join(out, 'img'), { recursive: true });
const map = {};
for (const [name, uri] of Object.entries(IMG)) {
  const b64 = String(uri).replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(path.join(out, 'img', `${name}.webp`), Buffer.from(b64, 'base64'));
  map[name] = `img/${name}.webp`;
}
let lite = html.replace(m[0], `const IMG=${JSON.stringify(map)};\n`);
lite = lite.replace('</body>', '<script src="../_bridge/ecyr-fx.js" data-nav="tl"></script>\n</body>');
fs.writeFileSync(path.join(out, 'diwali-bingo.html'), lite);
console.log(`${Object.keys(map).length} imágenes → ${path.relative(ROOT, out)}/img; bingo ${(lite.length / 1024).toFixed(0)} KB`);

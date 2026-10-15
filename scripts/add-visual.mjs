#!/usr/bin/env node
/**
 * Adds an infographic / visual aid to the platform.
 *
 *   node scripts/add-visual.mjs <image> <id>      e.g. "Tenses.png" english-tenses
 *
 * Writes public/visuals/<id>.webp (long side ≤ 2000 px, sharp text) and
 * public/visuals/<id>-thumb.webp (≈ 560 px) and prints the entry to paste into
 * src/content/visuals.ts, where its placements (units, sections, grammar
 * modules, reading guides…) are declared. Needs python3 + Pillow.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [img, id] = process.argv.slice(2);
if (!img || !id || !existsSync(img) || !/^[a-z0-9-]+$/.test(id)) {
  console.error('Usage: node scripts/add-visual.mjs <image> <id-in-kebab-case>');
  process.exit(1);
}
const out = resolve('public/visuals');
mkdirSync(out, { recursive: true });
const dims = execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image
src, out, vid = sys.argv[1:4]
im = Image.open(src).convert('RGB')
w, h = im.size
full = im.copy(); full.thumbnail((2000, 2000), Image.LANCZOS)
full.save(f"{out}/{vid}.webp", 'WEBP', quality=88, method=6)
th = im.copy(); th.thumbnail((560, 560), Image.LANCZOS)
th.save(f"{out}/{vid}-thumb.webp", 'WEBP', quality=80, method=6)
print(full.size[0], full.size[1])
`, img, out, id]).toString().trim().split(' ').map(Number);
console.log(`public/visuals/${id}.webp  ${dims[0]}×${dims[1]}`);
console.log(`\n  { id: '${id}', title: '', titleEs: '', w: ${dims[0]}, h: ${dims[1]}, levels: [], tags: [], places: [] },`);

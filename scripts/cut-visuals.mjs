#!/usr/bin/env node
/**
 * Cuts infographics into panels so a grammar lesson can show just the part it
 * explains (the whole infographic stays one tap away).
 *
 *   node scripts/cut-visuals.mjs
 *
 * Reads src/content/visual-cuts.json — each cut names its infographic (`of`),
 * one or more rectangles [x, y, w, h] in the coordinates of
 * public/visuals/<of>.webp (several rectangles are stacked, e.g. a table header
 * over one of its rows) and a `match` regex tested against grammar point names.
 * Writes public/visuals/cuts/<id>.webp + <id>-thumb.webp and stores each cut's
 * size back into the JSON. Needs python3 + Pillow.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const specPath = resolve('src/content/visual-cuts.json');
const cuts = JSON.parse(readFileSync(specPath, 'utf8'));
mkdirSync(resolve('public/visuals/cuts'), { recursive: true });

const sizes = JSON.parse(
  execFileSync(
    'python3',
    [
      '-I',
      '-c',
      `
import json, sys
from PIL import Image
cuts = json.loads(sys.stdin.read())
out = {}
cache = {}
for c in cuts:
    src = cache.get(c['of']) or Image.open(f"public/visuals/{c['of']}.webp").convert('RGB')
    cache[c['of']] = src
    parts = [src.crop((x, y, x + w, y + h)) for x, y, w, h in c['rects']]
    W = max(p.width for p in parts)
    H = sum(p.height for p in parts)
    im = Image.new('RGB', (W, H), (255, 255, 255))
    y = 0
    for p in parts:
        im.paste(p, ((W - p.width) // 2, y))
        y += p.height
    im.save(f"public/visuals/cuts/{c['id']}.webp", 'WEBP', quality=88, method=6)
    th = im.copy(); th.thumbnail((560, 560), Image.LANCZOS)
    th.save(f"public/visuals/cuts/{c['id']}-thumb.webp", 'WEBP', quality=80, method=6)
    out[c['id']] = [W, H]
print(json.dumps(out))
`,
    ],
    { input: JSON.stringify(cuts) },
  ).toString(),
);

for (const c of cuts) [c.w, c.h] = sizes[c.id];
writeFileSync(specPath, '[\n' + cuts.map((c) => '  ' + JSON.stringify(c)).join(',\n') + '\n]\n');
console.log(`✓ ${cuts.length} cuts → public/visuals/cuts/`);

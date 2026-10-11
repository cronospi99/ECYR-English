#!/usr/bin/env node
/**
 * Imports English Defenders (github.com/cronospi99/EnglishDefenders) into
 * public/modules/english-defenders, so the platform plays it like its other
 * games while the original repository stays untouched and independent.
 *
 *   git clone --depth 1 https://github.com/cronospi99/EnglishDefenders /tmp/ed
 *   node scripts/import-defenders.mjs /tmp/ed
 *
 * What it changes (each patch asserts its anchor and fails loudly if the
 * upstream code moved, so a silent half-integration can't ship):
 *   1. Loads public/modules/_bridge/ecyr-bridge.js, which reports battles to the
 *      platform (start → every answer → result) for per-game progress.
 *   2. Sprites are converted PNG → WebP (≈22 MB → ≈5 MB) when python3 + Pillow
 *      are available, and every reference is rewritten; otherwise PNGs stay.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const src = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(src, 'index.html')) || !existsSync(join(src, 'src/main.js'))) {
  console.error('Usage: node scripts/import-defenders.mjs <path to an EnglishDefenders checkout>');
  process.exit(1);
}
const out = resolve('public/modules/english-defenders');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of ['index.html', 'css', 'data', 'src', 'vendor', 'assets']) cpSync(join(src, entry), join(out, entry), { recursive: true });

const read = (f) => readFileSync(join(out, f), 'utf8');
const write = (f, s) => writeFileSync(join(out, f), s);
function patch(file, label, find, replace) {
  const s = read(file);
  const hit = typeof find === 'string' ? s.includes(find) : find.test(s);
  if (!hit) throw new Error(`[import-defenders] anchor not found for "${label}" in ${file}`);
  write(file, s.replace(find, replace));
  console.log(`  ✓ ${label}`);
}

// ---------------------------------------------------------------- bridge ----
patch('index.html', 'load the ECYR bridge', '<script type="module" src="src/main.js"></script>',
  '<script src="../_bridge/ecyr-bridge.js" data-slug="english-defenders"></script>\n<script type="module" src="src/main.js"></script>');

patch('src/main.js', 'report battle start',
  /(\n  game\.startStage\(\{[\s\S]*?\n  \}\);\n)/,
  `$1  // ECYR: a battle begins. Teacher-led sessions (Class Mode host, endless) are not graded.
  window.ECYRBridge && window.ECYRBridge.start({
    level: current.level,
    unit: isClassic && !mixEntries && !(multi && multi.length > 1) ? st.unit : undefined,
    mode: classHost || classTurnsActive || opts.endless || (isClassic && students.length) ? 'class' : 'solo',
    meta: { gameMode: mode, difficulty: opts.difficulty || difficulty(), waves: opts.waves || waveChoice() },
  });
`);

patch('src/main.js', 'report battle result',
  '    if (won && scores) store.setStars(current.level, current.stages[current.stageIdx].unit, stats.stars);\n',
  `    if (won && scores) store.setStars(current.level, current.stages[current.stageIdx].unit, stats.stars);
    // ECYR: the platform records the battle (stars only when a single unit was played).
    window.ECYRBridge && window.ECYRBridge.end({
      won, asked: stats.asked, correct: stats.correct,
      stars: won && scores ? stats.stars : undefined,
      level: current.level,
      unit: scores ? current.stages[current.stageIdx].unit : undefined,
      meta: { killed: stats.killed, bestStreak: stats.bestStreak, accuracy: stats.accuracy, gameMode: current.mode, difficulty: difficulty(), scored: !!scores },
    });
`);

patch('src/main.js', 'report class results',
  "  $('end-title').textContent = '🏁 Class results';\n",
  `  $('end-title').textContent = '🏁 Class results';
  if (isHost && window.ECYRBridge) window.ECYRBridge.end({ mode: 'class', meta: { players: rows.length } });
`);

patch('src/quiz.js', 'report every answer',
  '        this.stats.asked++;\n',
  `        this.stats.asked++;
        window.ECYRBridge && window.ECYRBridge.answer(correct, { topic: q.topic, unit: q.unit, level: q.level || this.level, kind: q.vocab ? 'vocabulary' : 'grammar' });
`);

// --------------------------------------------------------------- sprites ----
const spriteDir = join(out, 'assets/sprites');
let webp = false;
try {
  execFileSync('python3', ['-I', '-c', `
import os, sys
from PIL import Image
d = sys.argv[1]
for f in os.listdir(d):
    if not f.endswith('.png'): continue
    p = os.path.join(d, f)
    Image.open(p).save(p[:-4] + '.webp', 'WEBP', quality=88, method=6)
    os.remove(p)
`, spriteDir], { stdio: 'inherit' });
  webp = true;
} catch {
  console.warn('  ! python3/Pillow not available — sprites stay PNG');
}
if (webp) {
  const files = ['index.html', 'src/sprites.js', 'src/main.js', 'src/game.js', 'css/style.css'];
  let n = 0;
  for (const f of files) {
    const s = read(f);
    const t = s.replace(/assets\/sprites\/([A-Za-z0-9_\-]+|\$\{name\})\.png/g, (_, m) => (n++, `assets/sprites/${m}.webp`));
    if (t !== s) write(f, t);
  }
  if (!read('src/sprites.js').includes('${name}.webp')) throw new Error('[import-defenders] sprite loader was not rewritten to .webp');
  const left = readdirSync(spriteDir).filter((f) => f.endsWith('.png'));
  if (left.length) throw new Error(`[import-defenders] PNG sprites left: ${left.join(', ')}`);
  console.log(`  ✓ sprites → WebP (${n} references)`);
}

let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', src, 'rev-parse', '--short', 'HEAD']).toString().trim();
} catch {
  /* not a git checkout */
}
writeFileSync(join(out, 'ECYR-IMPORT.json'), JSON.stringify({ upstream: 'github.com/cronospi99/EnglishDefenders', commit, importedAt: new Date().toISOString() }, null, 2) + '\n');
console.log(`English Defenders ${commit} → public/modules/english-defenders`);

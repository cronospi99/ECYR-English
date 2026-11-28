#!/usr/bin/env node
/**
 * Pruebas de los "clue hunts": valida el esquema de cada paquete src/content/clue-hunts/<id>.json
 * y ejecuta los casos ok/no de <id>.cases.json con el motor real (src/lib/clueHunt/match.ts).
 *   npm run test:hunt
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/content/clue-hunts');
const jiti = createJiti(import.meta.url, { interopDefault: true });
const { match, matchAnswer, matchCode, normalize, compileRx } = await jiti.import(path.join(ROOT, 'src/lib/clueHunt/match.ts'));

let pass = 0, fail = 0;
const bad = (m) => { fail++; console.log('  FAIL', m); };
const ok = (c, m) => (c ? pass++ : bad(m));
const bi = (v) => v && typeof v.en === 'string' && typeof v.fr === 'string' && v.en && v.fr;

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.endsWith('.cases.json'));
ok(files.length > 0, 'no hay paquetes');
for (const f of files) {
  const slug = f.replace(/\.json$/, '');
  console.log(`# ${slug}`);
  const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  ok(p.id && p.version, `${slug}: id/version`);
  ok(bi(p.title) && bi(p.subtitle), `${slug}: title/subtitle EN+FR`);
  ok(p.scoring && p.scoring.correct > 0 && p.scoring.hintCost >= 0 && p.scoring.minPerCard >= 0, `${slug}: scoring`);
  ok(Array.isArray(p.supportLinks) && Array.isArray(p.pending), `${slug}: supportLinks/pending`);
  const cpIds = new Set(), codes = new Set(), cardIds = new Set();
  const cards = [];
  for (const cp of p.checkpoints ?? []) {
    ok(!cpIds.has(cp.id), `${slug}: checkpoint id repetido ${cp.id}`); cpIds.add(cp.id);
    ok(/^[A-Z0-9]{3,12}$/.test(cp.code), `${slug}/${cp.id}: code en MAYÚSCULAS`);
    ok(!codes.has(cp.code), `${slug}: code repetido ${cp.code}`); codes.add(cp.code);
    ok(bi(cp.title) && bi(cp.blurb), `${slug}/${cp.id}: title/blurb EN+FR`);
    ok(['diya', 'rangoli', 'fireworks', 'lotus', 'lantern', 'sweets', 'rama', 'lakshmi'].includes(cp.icon), `${slug}/${cp.id}: icon ${cp.icon}`);
    for (const c of cp.cards ?? []) {
      ok(!cardIds.has(c.id), `${slug}: card id repetido ${c.id}`); cardIds.add(c.id);
      cards.push(c);
      ok(bi(c.label) && bi(c.prompt) && bi(c.answer) && bi(c.hint) && bi(c.funFact), `${slug}/${c.id}: textos EN+FR`);
      ok(['clue', 'question', 'riddle'].includes(c.kind), `${slug}/${c.id}: kind`);
      ok(typeof c.enabled === 'boolean' && typeof c.needsConfirmation === 'boolean', `${slug}/${c.id}: flags`);
      for (const r of [...(c.accept ?? []), ...(c.reject ?? [])]) { try { compileRx(r); pass++; } catch (e) { bad(`${slug}/${c.id}: regex no compila ${r}`); } }
      if (c.enabled) ok(c.accept?.length >= 1, `${slug}/${c.id}: tarjeta activa sin accept`);
      for (const r of c.nudge ?? []) { try { compileRx(r); pass++; } catch (e) { bad(`${slug}/${c.id}: nudge no compila ${r}`); } }
      ok(!c.enabled || bi(c.shortLabel), `${slug}/${c.id}: falta shortLabel EN+FR`);
      for (const w of c.fuzzy ?? []) ok(normalize(w).length >= 4, `${slug}/${c.id}: fuzzy "${w}" < 4 letras`);
    }
  }
  const cf = path.join(DIR, `${slug}.cases.json`);
  if (!fs.existsSync(cf)) { bad(`${slug}: falta ${slug}.cases.json`); continue; }
  const cases = JSON.parse(fs.readFileSync(cf, 'utf8'));
  for (const c of cards) {
    const k = cases[c.id];
    if (!k) { if (c.enabled) bad(`${slug}/${c.id}: tarjeta activa sin casos`); continue; }
    for (const s of k.ok ?? []) ok(matchAnswer(c, s), `${slug}/${c.id}: debía ACEPTAR ${JSON.stringify(s)}`);
    for (const s of k.no ?? []) ok(!matchAnswer(c, s), `${slug}/${c.id}: debía RECHAZAR ${JSON.stringify(s)}`);
    for (const s of k.nudge ?? []) ok(match(c, s) === 'nudge', `${slug}/${c.id}: debía dar 'nudge' ${JSON.stringify(s)} (dio ${match(c, s)})`);
  }
  for (const cp of p.checkpoints) {
    ok(matchCode(cp.code, cp.code) && matchCode(cp.code, ` ${cp.code.toLowerCase()}! `), `${slug}/${cp.id}: code no se valida a sí mismo`);
  }
}
console.log(`\n${pass} correctas, ${fail} fallos`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
/**
 * Validador de contenido: lecturas, listening y writing (reglas en docs/guia-contenido.md).
 *
 *   node scripts/validate-content.mjs [--level a1] [--files patron] [--json] [--quiet]
 *
 * --level  filtra por nivel (a1..c2).      --files  subcadena o /regex/ sobre el nombre de archivo.
 * --json   salida JSON resumida.            --quiet  solo el resumen final.
 * Código de salida: 1 si hay algún ERROR, 0 si no.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const GEN = path.join(CONTENT, 'generated');
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

// ---------------------------------------------------------------- args --
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const LEVEL = opt('--level')?.toLowerCase();
const FILES = opt('--files');
const AS_JSON = flag('--json');
const QUIET = flag('--quiet');
if (LEVEL && !LEVELS.includes(LEVEL)) { console.error(`Nivel desconocido: ${LEVEL}`); process.exit(2); }
let fileRe = null;
if (FILES) {
  const m = FILES.match(/^\/(.+)\/([a-z]*)$/);
  fileRe = m ? new RegExp(m[1], m[2]) : new RegExp(FILES.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'), 'i');
}
const fileOk = (f) => !fileRe || fileRe.test(f);
const lvlOk = (l) => !LEVEL || String(l).toLowerCase() === LEVEL;

// -------------------------------------------------------------- issues --
/** @type {{sev:'ERROR'|'AVISO',code:string,level:string,where:string,msg:string}[]} */
const issues = [];
const add = (sev, code, level, where, msg) => issues.push({ sev, code, level: String(level || '?').toLowerCase(), where, msg });
const stats = Object.fromEntries(LEVELS.map((l) => [l, { readings: 0, listenings: 0, writings: 0, tf: 0, tfTrue: 0 }]));
const st = (l) => stats[String(l).toLowerCase()] ?? (stats[String(l).toLowerCase()] = { readings: 0, listenings: 0, writings: 0, tf: 0, tfTrue: 0 });

// ------------------------------------------------------------- helpers --
const plain = (p) => p.replace(/^## /, '').replace(/\[\[[a-z0-9]+\|([^|\]]*)(?:\|[^\]]*)?\]\]/g, '$1');
const norm = (s) => s.replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"');
const countWords = (s) => s.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
const clip = (s, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { add('ERROR', 'json', '?', path.basename(file), `JSON no válido: ${e.message}`); return null; }
}

// ------------------------------------------------------- glossary match --
const SKIP_TOKENS = new Set(['sb', 'sth', 'somebody', 'someone', 'something', 'to', 'a', 'an', 'the', 'one', "one's", 'your', 'my']);
function wordVariants(w) {
  const v = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'ly']);
  if (w.endsWith('e')) { v.add(w.slice(0, -1) + 'ing'); }
  if (w.endsWith('y')) { v.add(w.slice(0, -1) + 'ies'); v.add(w.slice(0, -1) + 'ied'); v.add(w.slice(0, -1) + 'ier'); }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) { const c = w.slice(-1); v.add(w + c + 'ed'); v.add(w + c + 'ing'); v.add(w + c + 'er'); }
  return v;
}
function termInText(term, tokens, textLower) {
  const full = norm(term).toLowerCase();
  const t = full.replace(/\([^)]*\)/g, ' ').trim();
  // formas irregulares entre paréntesis, p. ej. "get lost (got lost)", cuentan como alternativa
  const alts = t.split(/\s*\/\s*|\s*;\s*/).concat([...full.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]));
  for (const alt of alts) {
    const words = alt.split(/[^a-z0-9']+/).filter((w) => w && !SKIP_TOKENS.has(w));
    if (!words.length) continue;
    if (words.length === 1 && textLower.includes(words[0]) && words[0].length >= 6) return true; // prefijo largo (p. ej. derivados)
    if (words.every((w) => [...wordVariants(w)].some((x) => tokens.has(x)) || (w.length >= 5 && [...tokens].some((tk) => tk.startsWith(w.slice(0, Math.max(4, w.length - 2))))))) return true;
  }
  return false;
}
function checkGlossary(level, where, glossary, text) {
  if (!Array.isArray(glossary)) return;
  const lower = norm(text).toLowerCase();
  const tokens = new Set(lower.split(/[^a-z0-9'áéíóúñü]+/).filter(Boolean));
  for (const t of tokens) if (t.endsWith("'s")) tokens.add(t.slice(0, -2));
  glossary.forEach((g, i) => {
    const term = Array.isArray(g) ? g[0] : g?.term;
    if (typeof term !== 'string') return;
    if (!termInText(term, tokens, lower)) add('AVISO', 'glosario', level, `${where} › glossary[${i}]`, `"${term}" no aparece en el texto`);
  });
}

// ------------------------------------------------------------ questions --
function checkQuestions(level, where, qs, tfAcc) {
  if (!Array.isArray(qs)) return;
  qs.forEach((q, i) => {
    if (q.type === 'tf') {
      if (q.answer === 'T' || q.answer === 'F' || q.answer === 'NG') { tfAcc.n++; if (q.answer === 'T') tfAcc.t++; }
    } else if (q.type === 'mc' && Array.isArray(q.options) && typeof q.answer === 'number' && q.options.length > 2) {
      const len = (s) => String(s).length;
      const right = len(q.options[q.answer] ?? '');
      const others = q.options.filter((_, j) => j !== q.answer).map(len);
      const avg = others.reduce((a, b) => a + b, 0) / others.length;
      if (avg > 0 && right >= avg * 1.8 && right - avg > 25)
        add('AVISO', 'pista-longitud', level, `${where} › questions[${i}] › options`, `pista por longitud: la correcta tiene ${right} car. frente a ${avg.toFixed(0)} de media en los distractores`);
    }
  });
}

// ------------------------------------------------- currency / countries --
const CO_PLACES = 'Colombia|Colombian|Bogot[aá]|Medell[ií]n|Cali|Cartagena|Barranquilla|Bucaramanga|Santa Marta|Pereira|Manizales|Cúcuta|Cucuta|Armenia|Cusco|Cuzco|Lima|Machu Picchu|Arequipa|Mexico|México|Mexican|Cancún|Cancun|Guadalajara|Monterrey|Oaxaca|Argentina|Argentine|Buenos Aires|Córdoba|Mendoza|Chile|Chilean|Santiago|Valpara[ií]so|Peru|Perú|Peruvian|Spain|España|Spanish|Madrid|Barcelona|Sevilla|Seville|Valencia|Bolivia|La Paz|Venezuela|Caracas|Uruguay|Montevideo|Paraguay|Brazil|Brasil|Costa Rica|Guatemala|Honduras|Nicaragua|Cuba|Havana|Dominican|Canada|Toronto|Australia|Sydney|England|London|Britain|UK|Ireland|Dublin|France|Paris|Italy|Rome|Germany|Berlin|Japan|Tokyo';
const PLACE_RE = new RegExp(`\\b(${CO_PLACES})\\b`, 'i');
const PLACE_CS = new RegExp(`\\b(Cali|Lima|Armenia|Santiago|Valencia|Cordoba|Spanish|La Paz)\\b`); // ambiguos: solo con mayúscula
const DOLAR_OK = /\b(Ecuador|Quito|Guayaquil|Panam[aá]|El Salvador|San Salvador|Puerto Rico|San Juan|USA|U\.S\.|United States|America|American|New York|Miami|Los Angeles|Texas|California|Florida|Chicago|Boston|Washington)\b/;
const MONEY_RE = /\bdollars?\b|\$/i;
function checkCurrency(level, where, text) {
  const t = norm(text);
  const m = t.match(PLACE_RE);
  if (!m) return;
  if (!PLACE_CS.test(m[0]) && /^(Cali|Lima|Armenia|Santiago|Valencia|Cordoba|Spanish|La Paz)$/i.test(m[0])) return;
  if (!MONEY_RE.test(t) || DOLAR_OK.test(t)) return;
  const d = t.match(MONEY_RE);
  const i = Math.max(0, d.index - 30);
  add('AVISO', 'moneda', level, where, `menciona "${m[0]}" y usa "${d[0]}": «${clip(t.slice(i, i + 70).replace(/\s+/g, ' '), 70)}»`);
}

// ----------------------------------------------- greeting / comma splice --
const GREET_RE = /^(Hi|Dear|Hello)\b[^,\n.!?]{0,40},[ \t]*\S/;
const SPLICE_RE = /,\s+(he|she|it|they|we|I|you)\s+(is|are|am|was|were|has|have|can)\b/gi;
const SUBORD = /^(if|when|while|because|after|before|as|although|though|since|once|unless|until|whenever|so|but|and|or|that|which|who|where|whether|then|now|today|yesterday|tomorrow|first|finally|next|also|however|yes|no|well|oh|hi|hello|dear)\b/i;
function checkGreeting(level, where, text) {
  const first = norm(text).trimStart();
  if (GREET_RE.test(first.split('\n')[0]) && /^(Hi|Dear|Hello)\b[^,\n]{0,40},[ \t]*[^\s\n]/.test(first)) {
    add('AVISO', 'saludo', level, where, `el saludo debe ir aparte: «${clip(first.split('\n')[0], 70)}»`);
  }
}
function checkSplice(level, where, text) {
  const t = norm(text);
  for (const sent of t.split(/(?<=[.!?])\s+|\n+/)) {
    SPLICE_RE.lastIndex = 0;
    let m;
    while ((m = SPLICE_RE.exec(sent))) {
      const before = sent.slice(0, m.index).replace(/^["'(]+/, '');
      if (countWords(before) < 4) continue;
      if (SUBORD.test(before)) continue;
      if (/\b(if|when|while|because|although|since|once|unless|until|whenever)\b/i.test(before) && !/\b(is|are|am|was|were|has|have|can)\b[^,]*$/i.test(before)) continue;
      if (/\band\b[^,]*$/i.test(before) && /,/.test(before)) continue;
      add('AVISO', 'coma-empalmada', level, where, `posible coma empalmada: «${clip(sent.trim(), 110)}»`);
      break;
    }
  }
}

// --------------------------------------------------------- writing length --
function parseRange(length) {
  if (!length) return null;
  const s = norm(length).replace(/\([^)]*\)/g, ' ');
  const seg = s.split('·').map((x) => x.trim()).find((x) => /words?/i.test(x)) ?? s;
  let m = seg.match(/(\d+)\s*[–—-]\s*(\d+)\s*words?/i);
  if (m) return { lo: +m[1], hi: +m[2], desc: `${m[1]}–${m[2]}` };
  m = seg.match(/(?:about|around|approx\w*|c\.)\s*(\d+)/i) ?? seg.match(/(\d+)\s*words?/i);
  if (m) { const n = +m[1]; const tol = Math.max(10, Math.round(n * 0.15)); return { lo: n - tol, hi: n + tol, desc: `about ${n} (±${tol})` }; }
  return null;
}
function modelWords(model) {
  let lines = model.replace(/\r/g, '').split('\n');
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.length > 1 && /^[\p{L}][\p{L}'’.-]*[,.!]?$/u.test(lines[lines.length - 1].trim())) lines.pop(); // firma de una palabra
  lines = lines.map((l) => l.replace(/^\s*(?:[A-Z][\p{L}'’.]*(?: [A-Z][\p{L}'’.]*){0,2}|[A-Z]):\s*/u, ''));
  return countWords(lines.join(' '));
}
function checkWritingTask(level, where, t) {
  const s = st(level); s.writings++;
  if (typeof t !== 'object' || !t) return;
  if (typeof t.model === 'string') {
    const r = parseRange(t.length);
    if (r) {
      const n = modelWords(t.model);
      if (n < r.lo || n > r.hi) add('ERROR', 'longitud', level, `${where} › model`, `${n} palabras fuera de "${t.length}" (rango ${r.desc})`);
    }
    checkSplice(level, `${where} › model`, t.model);
    checkGreeting(level, `${where} › model`, t.model);
    checkCurrency(level, where, [t.brief, t.model].filter(Boolean).join('\n'));
  } else checkCurrency(level, where, t.brief ?? '');
  (t.criteria ?? []).forEach((c, i) => {
    if (/every sentence|in every\b/i.test(c)) add('ERROR', 'criterio-absoluto', level, `${where} › criteria[${i}]`, `criterio absoluto: «${clip(c, 80)}»`);
  });
}
const normTitle = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// ================================================================= MAIN ==
const files = fs.readdirSync(GEN).filter((f) => f.endsWith('.json'));

// ---- library: lecturas y listening
const readingIds = new Map(), trackIds = new Map();
const tfByFile = new Map(); // `${file}|${level}` -> {n,t}
const tfByLevel = new Map();
const tfAcc = (file, level) => {
  const k = `${file}|${level}`; if (!tfByFile.has(k)) tfByFile.set(k, { n: 0, t: 0 });
  return tfByFile.get(k);
};
const libFiles = files.filter((f) => /^library-(readings|listening)-/.test(f));
for (const f of libFiles) {
  const data = readJson(path.join(GEN, f));
  const isRead = f.startsWith('library-readings-');
  if (!Array.isArray(data)) { if (data) add('ERROR', 'json', '?', f, 'se esperaba un array'); continue; }
  // los duplicados se calculan sobre todo el banco (aunque haya filtro); el resto, solo sobre lo filtrado
  const idMap = isRead ? readingIds : trackIds;
  data.forEach((it, idx) => {
    const id = it?.id ?? `#${idx}`;
    if (idMap.has(id)) idMap.get(id).push({ f, level: it?.level });
    else idMap.set(id, [{ f, level: it?.level }]);
    const level = String(it?.level ?? '?').toLowerCase();
    if (!fileOk(f) || !lvlOk(level)) return;
    const where = `${f} › ${id}`;
    const s = st(level);
    const acc = tfAcc(f, level);
    if (isRead) {
      s.readings++;
      const paras = Array.isArray(it.paragraphs) ? it.paragraphs : [];
      const text = paras.map(plain).join('\n');
      const real = countWords(text);
      if (typeof it.words !== 'number') add('ERROR', 'palabras', level, `${where} › words`, 'falta el campo words');
      else if (Math.abs(it.words - real) > 5) add('ERROR', 'palabras', level, `${where} › words`, `words=${it.words} pero los párrafos tienen ${real} (dif. ${real - it.words})`);
      checkGlossary(level, where, it.glossary, text);
      paras.forEach((p, i) => {
        checkGreeting(level, `${where} › paragraphs[${i}]`, plain(p));
        checkSplice(level, `${where} › paragraphs[${i}]`, plain(p));
      });
      checkCurrency(level, where, [it.title, text].join('\n'));
    } else {
      s.listenings++;
      const lines = Array.isArray(it.lines) ? it.lines : [];
      const text = lines.map((l) => l.text ?? '').join('\n');
      checkGlossary(level, where, it.glossary, text);
      checkCurrency(level, where, text);
      lines.forEach((l, i) => {
        const tx = String(l.text ?? '');
        const bad = [];
        if (/\d/.test(tx)) bad.push('dígitos');
        if (tx.includes('$')) bad.push('"$"');
        if (tx.includes('%')) bad.push('"%"');
        if (tx.includes('&')) bad.push('"&"');
        if (/(?<![A-Za-z])[A-Z](-[A-Z]){2,}(?![A-Za-z])/.test(tx)) bad.push('deletreo con guiones');
        if (bad.length) add('AVISO', 'tts', level, `${where} › lines[${i}].text`, `${bad.join(', ')}: «${clip(tx, 80)}»`);
      });
    }
    checkQuestions(level, where, it.questions, acc);
  });
}
for (const [kind, map] of [['lectura', readingIds], ['listening', trackIds]]) {
  for (const [id, arr] of map) {
    if (arr.length < 2) continue;
    const rel = arr.filter((a) => fileOk(a.f) && lvlOk(a.level));
    if (!rel.length) continue;
    add('ERROR', 'id-duplicado', arr[0].level, `${arr.map((a) => a.f).join(' + ')} › ${id}`, `id de ${kind} duplicado (${arr.length} veces)`);
  }
}
// ---- reparto T/F
const TF_MIN = 6; // por debajo de este número de ítems el porcentaje es ruido y no se avisa
for (const [k, a] of tfByFile) {
  const [f, level] = k.split('|');
  if (!a.n) continue;
  const s = st(level); s.tf += a.n; s.tfTrue += a.t;
  const pct = (100 * a.t) / a.n;
  if (a.n >= TF_MIN && (pct < 40 || pct > 60)) add('AVISO', 'reparto-tf', level, `${f} › nivel ${level}`, `${pct.toFixed(0)} % de respuestas True (${a.t}/${a.n}); deseable 40–60 %`);
}
for (const l of LEVELS) {
  const s = stats[l];
  if (s.tf >= TF_MIN) {
    const pct = (100 * s.tfTrue) / s.tf;
    if (pct < 40 || pct > 60) add('AVISO', 'reparto-tf', l, `nivel ${l} (todos los archivos)`, `${pct.toFixed(0)} % de respuestas True (${s.tfTrue}/${s.tf}); deseable 40–60 %`);
  }
}

// ---- writing
/** unidad -> lista de tareas, por nivel (para títulos duplicados) */
const unitTasks = new Map();
const pushTask = (level, unit, pos, file, t) => {
  const k = `${level}|${unit}`; if (!unitTasks.has(k)) unitTasks.set(k, []);
  unitTasks.get(k).push({ pos, file, title: t?.title });
};
for (const f of files) {
  let m;
  if ((m = f.match(/^writing-extra-(a1|a2|b1|b2|c1|c2)\.json$/))) {
    const level = m[1];
    const data = readJson(path.join(GEN, f));
    if (!data) continue;
    for (const [unit, v] of Object.entries(data)) {
      const arr = Array.isArray(v) ? v : [v];
      arr.forEach((t, i) => {
        if (!fileOk(f) || !lvlOk(level)) return;
        const where = `${f} › unidad ${unit}.${i + 1}${t?.title ? ` (${clip(t.title, 40)})` : ''}`;
        checkWritingTask(level, where, t);
        pushTask(level, unit, `${f} › ${i + 1}`, f, t);
      });
    }
  } else if ((m = f.match(/^level-(a1|a2|b1|b2|c1|c2)\.json$/))) {
    const level = m[1];
    const data = readJson(path.join(GEN, f));
    if (!data) continue;
    for (const u of data.units ?? []) {
      if (!u.writing || !fileOk(f) || !lvlOk(level)) continue;
      const where = `${f} › unidad ${u.n}.libro${u.writing.title ? ` (${clip(u.writing.title, 40)})` : ''}`;
      checkWritingTask(level, where, u.writing);
      pushTask(level, u.n, `${f} › libro`, f, u.writing);
    }
  }
}
{
  const f = 'c1-writing.json';
  const p = path.join(CONTENT, f);
  if (fs.existsSync(p)) {
    const data = readJson(p);
    for (const [unit, v] of Object.entries(data ?? {})) {
      for (const [i, t] of (Array.isArray(v) ? v : [v]).entries()) {
        if (!fileOk(f) || !lvlOk('c1')) continue;
        checkWritingTask('c1', `${f} › unidad ${unit}.${i + 1}${t?.title ? ` (${clip(t.title, 40)})` : ''}`, t);
        pushTask('c1', unit, `${f} › ${i + 1}`, f, t);
      }
    }
  }
}
for (const [k, arr] of unitTasks) {
  const [level, unit] = k.split('|');
  const seen = new Map();
  for (const t of arr) {
    const n = normTitle(t.title);
    if (!n) continue;
    if (seen.has(n)) add('ERROR', 'titulo-duplicado', level, `${t.pos} (unidad ${unit}) › title`, `título duplicado «${t.title}» (ya en ${seen.get(n)})`);
    else seen.set(n, t.pos);
  }
}

// ------------------------------------------------------------- reporting --
const byLevel = {};
for (const l of LEVELS) {
  if (LEVEL && l !== LEVEL) continue;
  const s = stats[l];
  const li = issues.filter((i) => i.level === l);
  const types = {};
  for (const i of li) { const k = `${i.sev}:${i.code}`; types[k] = (types[k] ?? 0) + 1; }
  byLevel[l] = {
    lecturas: s.readings, listenings: s.listenings, writings: s.writings,
    pctTrue: s.tf ? +((100 * s.tfTrue) / s.tf).toFixed(1) : null, tfItems: s.tf,
    errores: li.filter((i) => i.sev === 'ERROR').length, avisos: li.filter((i) => i.sev === 'AVISO').length, porTipo: types,
  };
}
const unknown = issues.filter((i) => !LEVELS.includes(i.level));
const totalErr = issues.filter((i) => i.sev === 'ERROR').length;
const totalWarn = issues.length - totalErr;

if (AS_JSON) {
  console.log(JSON.stringify({ ok: totalErr === 0, errores: totalErr, avisos: totalWarn, niveles: byLevel, incidencias: issues }, null, 2));
} else {
  if (!QUIET) {
    const order = { ERROR: 0, AVISO: 1 };
    for (const i of [...issues].sort((a, b) => order[a.sev] - order[b.sev] || a.where.localeCompare(b.where)))
      console.log(`${i.sev.padEnd(5)} [${i.code}] ${i.where}: ${i.msg}`);
    console.log('');
  }
  console.log('Nivel | lecturas | listenings | writings | %True | errores | avisos | detalle');
  for (const [l, b] of Object.entries(byLevel)) {
    const det = Object.entries(b.porTipo).map(([k, n]) => `${k.replace('ERROR:', 'E:').replace('AVISO:', 'A:')}=${n}`).join(' ');
    console.log(`${l.toUpperCase().padEnd(5)} | ${String(b.lecturas).padStart(8)} | ${String(b.listenings).padStart(10)} | ${String(b.writings).padStart(8)} | ${(b.pctTrue == null ? '-' : b.pctTrue + '%').padStart(5)} | ${String(b.errores).padStart(7)} | ${String(b.avisos).padStart(6)} | ${det}`);
  }
  if (unknown.length) console.log(`(${unknown.length} incidencias sin nivel asignado, p. ej. JSON no válido)`);
  console.log(`\nTOTAL: ${totalErr} errores, ${totalWarn} avisos`);
}
process.exitCode = totalErr ? 1 : 0;

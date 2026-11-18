#!/usr/bin/env node
/**
 * Valida src/content/generated/diagrams-*.json (diagramas por datos, ver el JSDoc de
 * src/features/learn/unit/diagramKinds.tsx).
 *
 *   node scripts/validate-diagrams.mjs
 *
 * Errores (salida 1): clave inexistente en level-*.json, nombre del punto que no coincide, kind
 * desconocido, campos obligatorios ausentes, textos vacíos, tono/rol desconocido, tipos incorrectos.
 * Avisos (salida 0): textos demasiado largos para móvil, claves de primer nivel desconocidas.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src/content/generated');
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const TONES = ['blue', 'green', 'orange', 'purple', 'pink', 'teal', 'yellow', 'red', 'indigo', 'mint'];
const ROLES = ['subject', 'aux', 'verb', 'object', 'complement', 'extra', 'link', 'other'];

/** Límites pensados para pantallas de 320 px. */
const LIMIT = { title: 60, note_es: 220, chip: 24, label: 40, example: 70, hint: 120 };

const errors = [];
const warnings = [];
let checked = 0;

// ----------------------------------------------------------- level index --
const norm = (s) => String(s).replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
/** "A2-11-1" -> name of that grammar point. */
const points = new Map();
for (const lv of LEVELS) {
  const f = join(DIR, `level-${lv}.json`);
  if (!existsSync(f)) continue;
  const data = JSON.parse(readFileSync(f, 'utf8'));
  for (const u of data.units ?? []) (u.grammar ?? []).forEach((g, i) => points.set(`${lv.toUpperCase()}-${u.n}-${i}`, g.name));
}

// ---------------------------------------------------------------- helpers --
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function walkEmpty(v, path, where) {
  if (isStr(v)) {
    if (!v.trim()) err(where, `texto vacío en ${path}`);
  } else if (Array.isArray(v)) v.forEach((x, i) => walkEmpty(x, `${path}[${i}]`, where));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) walkEmpty(x, path ? `${path}.${k}` : k, where);
}
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

/** Obligatorio: cadena no vacía. */
function reqStr(o, k, where, path = '') {
  if (!isObj(o) || !isStr(o[k]) || !o[k].trim()) err(where, `falta el texto obligatorio "${path}${k}"`);
}
function optStr(o, k, where, path = '') {
  if (o[k] !== undefined && !isStr(o[k])) err(where, `"${path}${k}" debe ser texto`);
}
function reqArr(o, k, where, min, max) {
  if (!Array.isArray(o[k])) {
    err(where, `falta la lista obligatoria "${k}"`);
    return [];
  }
  if (o[k].length < min) err(where, `"${k}" necesita al menos ${min} elemento(s)`);
  if (max && o[k].length > max) warn(where, `"${k}" tiene ${o[k].length} elementos; lo recomendado es ≤ ${max}`);
  return o[k];
}
function tone(v, where, path) {
  if (v !== undefined && !TONES.includes(v)) err(where, `tono desconocido "${v}" en ${path} (usa: ${TONES.join(', ')})`);
}
function role(v, where, path) {
  if (v !== undefined && !ROLES.includes(v)) err(where, `rol desconocido "${v}" en ${path} (usa: ${ROLES.join(', ')})`);
}
function long(s, max, where, path) {
  if (isStr(s) && s.length > max) warn(where, `${path} tiene ${s.length} caracteres (máx. recomendado ${max} para móvil): "${s.slice(0, 40)}…"`);
}
function pos(v, where, path) {
  if (!isNum(v) || v < 0 || v > 100) err(where, `${path} debe ser un número entre 0 y 100`);
}

// ---------------------------------------------------------- kind checkers --
const KNOWN = {
  transform: ['from', 'to'],
  slots: ['rows'],
  scale: ['marks', 'from_es', 'to_es'],
  sequence: ['steps'],
  polarity: ['pairs'],
  compare: ['columns'],
  timeline: ['now', 'spans', 'marks', 'examples'],
};
const COMMON = ['kind', 'point', 'title', 'note_es', 'tone'];

const CHECK = {
  transform(s, w) {
    const ids = {};
    for (const side of ['from', 'to']) {
      const row = s[side];
      if (!isObj(row)) {
        err(w, `falta "${side}"`);
        continue;
      }
      optStr(row, 'label_es', w, `${side}.`);
      long(row.label_es, LIMIT.label, w, `${side}.label_es`);
      const toks = reqArr(row, 'tokens', w, 1, 7);
      const seen = new Set();
      ids[side] = seen;
      toks.forEach((t, i) => {
        const p = `${side}.tokens[${i}]`;
        if (!isObj(t)) return err(w, `${p} debe ser un objeto`);
        reqStr(t, 't', w, `${p}.`);
        long(t.t, LIMIT.chip, w, `${p}.t`);
        role(t.role, w, p);
        if (t.id !== undefined) {
          if (!isStr(t.id) || !t.id) err(w, `${p}.id debe ser un texto no vacío`);
          else if (seen.has(t.id)) err(w, `id repetido "${t.id}" en ${side}`);
          else seen.add(t.id);
        }
        if (t.add && side === 'from') warn(w, `${p}: "add" solo tiene sentido en "to"`);
        if (t.drop && side === 'to') warn(w, `${p}: "drop" solo tiene sentido en "from"`);
        if (t.drop && t.id) warn(w, `${p}: una ficha con "drop" no dibuja flecha aunque tenga id`);
      });
    }
    if (ids.from && ids.to) {
      const links = [...ids.from].filter((i) => ids.to.has(i));
      if (!links.length) warn(w, 'ninguna ficha comparte id entre "from" y "to": no habrá flechas');
      for (const i of [...ids.from, ...ids.to]) if (!(ids.from.has(i) && ids.to.has(i))) warn(w, `el id "${i}" solo aparece en un lado y no dibuja flecha`);
    }
  },
  slots(s, w) {
    reqArr(s, 'rows', w, 1, 4).forEach((r, i) => {
      const p = `rows[${i}]`;
      if (!isObj(r)) return err(w, `${p} debe ser un objeto`);
      optStr(r, 'label_es', w, `${p}.`);
      long(r.label_es, LIMIT.label, w, `${p}.label_es`);
      reqArr(r, 'slots', w, 1, 6).forEach((c, k) => {
        const q = `${p}.slots[${k}]`;
        if (!isObj(c)) return err(w, `${q} debe ser un objeto`);
        reqStr(c, 't', w, `${q}.`);
        long(c.t, LIMIT.chip + 6, w, `${q}.t`);
        optStr(c, 'label_es', w, `${q}.`);
        long(c.label_es, LIMIT.label, w, `${q}.label_es`);
        role(c.role, w, q);
      });
    });
  },
  scale(s, w) {
    optStr(s, 'from_es', w);
    optStr(s, 'to_es', w);
    long(s.from_es, 24, w, 'from_es');
    long(s.to_es, 24, w, 'to_es');
    const marks = reqArr(s, 'marks', w, 2, 6);
    marks.forEach((m, i) => {
      const p = `marks[${i}]`;
      if (!isObj(m)) return err(w, `${p} debe ser un objeto`);
      reqStr(m, 't', w, `${p}.`);
      long(m.t, LIMIT.chip, w, `${p}.t`);
      pos(m.at, w, `${p}.at`);
      tone(m.tone, w, p);
      optStr(m, 'label_es', w, `${p}.`);
      optStr(m, 'ex', w, `${p}.`);
      long(m.label_es, LIMIT.label, w, `${p}.label_es`);
      long(m.ex, LIMIT.example, w, `${p}.ex`);
    });
    const at = marks.filter((m) => isObj(m) && isNum(m.at)).map((m) => m.at).sort((a, b) => a - b);
    for (let i = 1; i < at.length; i++) if (at[i] - at[i - 1] < 15) warn(w, `marcas a menos de 15 puntos (${at[i - 1]} y ${at[i]}): los rótulos pueden pisarse en móvil`);
  },
  sequence(s, w) {
    reqArr(s, 'steps', w, 2, 6).forEach((p, i) => {
      const q = `steps[${i}]`;
      if (!isObj(p)) return err(w, `${q} debe ser un objeto`);
      reqStr(p, 't', w, `${q}.`);
      long(p.t, LIMIT.chip, w, `${q}.t`);
      optStr(p, 'ex', w, `${q}.`);
      optStr(p, 'label_es', w, `${q}.`);
      long(p.ex, LIMIT.example, w, `${q}.ex`);
      long(p.label_es, LIMIT.label, w, `${q}.label_es`);
    });
  },
  polarity(s, w) {
    reqArr(s, 'pairs', w, 1, 6).forEach((p, i) => {
      const q = `pairs[${i}]`;
      if (!isObj(p)) return err(w, `${q} debe ser un objeto`);
      reqStr(p, 'statement', w, `${q}.`);
      reqStr(p, 'tag', w, `${q}.`);
      if (typeof p.positive !== 'boolean') err(w, `${q}.positive debe ser true o false`);
      optStr(p, 'hint_es', w, `${q}.`);
      long(p.statement, LIMIT.example - 30, w, `${q}.statement`);
      long(p.tag, LIMIT.chip, w, `${q}.tag`);
      long(p.hint_es, LIMIT.hint, w, `${q}.hint_es`);
    });
  },
  compare(s, w) {
    const cols = reqArr(s, 'columns', w, 2);
    if (cols.length > 3) err(w, '"columns" admite 2 o 3 columnas');
    cols.forEach((c, i) => {
      const p = `columns[${i}]`;
      if (!isObj(c)) return err(w, `${p} debe ser un objeto`);
      reqStr(c, 'head', w, `${p}.`);
      long(c.head, 16, w, `${p}.head`);
      optStr(c, 'head_es', w, `${p}.`);
      optStr(c, 'use_es', w, `${p}.`);
      long(c.head_es, LIMIT.label, w, `${p}.head_es`);
      long(c.use_es, LIMIT.hint, w, `${p}.use_es`);
      tone(c.tone, w, p);
      reqArr(c, 'items', w, 1, 5).forEach((it, k) => {
        const q = `${p}.items[${k}]`;
        if (!isObj(it)) return err(w, `${q} debe ser un objeto`);
        reqStr(it, 't', w, `${q}.`);
        long(it.t, LIMIT.example - 25, w, `${q}.t`);
        if (it.ok !== undefined && typeof it.ok !== 'boolean') err(w, `${q}.ok debe ser true, false o no ponerse`);
      });
    });
  },
  timeline(s, w) {
    pos(s.now, w, 'now');
    const spans = s.spans ?? [];
    const marks = s.marks ?? [];
    if (!Array.isArray(spans)) err(w, '"spans" debe ser una lista');
    if (!Array.isArray(marks)) err(w, '"marks" debe ser una lista');
    if (Array.isArray(spans))
      spans.forEach((p, i) => {
        const q = `spans[${i}]`;
        if (!isObj(p)) return err(w, `${q} debe ser un objeto`);
        pos(p.from, w, `${q}.from`);
        pos(p.to, w, `${q}.to`);
        if (isNum(p.from) && isNum(p.to) && p.to <= p.from) err(w, `${q}: "to" debe ser mayor que "from"`);
        reqStr(p, 'label', w, `${q}.`);
        tone(p.tone, w, q);
        if (isStr(p.label) && isNum(p.from) && isNum(p.to)) {
          // La barra mide (to-from)% de ~326 unidades y cada letra ocupa ~5.6.
          if (p.label.length * 5.6 > ((p.to - p.from) / 100) * 326) warn(w, `${q}: el rótulo "${p.label}" no cabe en una barra tan corta`);
        }
      });
    if (Array.isArray(marks))
      marks.forEach((m, i) => {
        const q = `marks[${i}]`;
        if (!isObj(m)) return err(w, `${q} debe ser un objeto`);
        pos(m.x, w, `${q}.x`);
        reqStr(m, 'label', w, `${q}.`);
        long(m.label, 20, w, `${q}.label`);
        tone(m.tone, w, q);
      });
    reqArr(s, 'examples', w, 1, 4).forEach((e, i) => {
      const q = `examples[${i}]`;
      if (!isObj(e)) return err(w, `${q} debe ser un objeto`);
      reqStr(e, 't', w, `${q}.`);
      long(e.t, LIMIT.example, w, `${q}.t`);
      tone(e.tone, w, q);
    });
  },
};

function checkSpec(s, where, key) {
  if (!isObj(s)) return err(where, 'el diagrama debe ser un objeto');
  checked++;
  if (!isStr(s.kind) || !(s.kind in CHECK)) return err(where, `kind desconocido "${s.kind}" (usa: ${Object.keys(CHECK).join(', ')})`);
  walkEmpty(s, '', where);
  reqStr(s, 'title', where);
  long(s.title, LIMIT.title, where, 'title');
  optStr(s, 'note_es', where);
  long(s.note_es, LIMIT.note_es, where, 'note_es');
  if (s.note_es === undefined) warn(where, 'sin note_es: se recomienda una explicación breve en español');
  tone(s.tone, where, 'tone');
  for (const k of Object.keys(s)) if (!COMMON.includes(k) && !KNOWN[s.kind].includes(k)) warn(where, `campo desconocido "${k}" (¿errata?)`);
  if (s.point !== undefined) {
    const real = points.get(key);
    if (real && norm(real) !== norm(s.point)) err(where, `"point" no coincide con el punto real de la clave: "${s.point}" ≠ "${real}"`);
  }
  CHECK[s.kind](s, where);
}

// ------------------------------------------------------------------- main --
const files = readdirSync(DIR).filter((f) => /^diagrams-[a-z0-9]+\.json$/.test(f)).sort();
if (!files.length) console.log('No hay archivos diagrams-*.json.');

for (const f of files) {
  const lv = f.match(/^diagrams-([a-z0-9]+)\.json$/)[1];
  if (!LEVELS.includes(lv)) {
    err(f, `nivel desconocido en el nombre del archivo ("${lv}")`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  } catch (e) {
    err(f, `JSON inválido: ${e.message}`);
    continue;
  }
  if (!isObj(data)) {
    err(f, 'la raíz debe ser un objeto { "NIVEL-unidad-punto": diagrama }');
    continue;
  }
  for (const [key, val] of Object.entries(data)) {
    const m = key.match(/^([A-C][12])-(\d+)-(\d+)$/);
    const w = `${f} › ${key}`;
    if (!m) {
      err(w, 'clave con formato incorrecto (esperado "A2-11-0")');
      continue;
    }
    if (m[1].toLowerCase() !== lv) err(w, `la clave es de ${m[1]} pero el archivo es de ${lv.toUpperCase()}`);
    if (!points.has(key)) {
      err(w, 'la clave no existe en level-*.json (unidad o punto fuera de rango)');
      continue;
    }
    (Array.isArray(val) ? val : [val]).forEach((s, i) => checkSpec(s, Array.isArray(val) ? `${w}[${i}]` : w, key));
  }
}

for (const w of warnings) console.warn(`AVISO  ${w}`);
for (const e of errors) console.error(`ERROR  ${e}`);
console.log(`\n${files.length} archivo(s), ${checked} diagrama(s): ${errors.length} error(es), ${warnings.length} aviso(s).`);
process.exit(errors.length ? 1 : 0);

import { related, relatedEs, type Entry } from "./words";

export type Lang = "en" | "es";

function tri(s: string) {
  const p = "  " + s + "  ";
  const out: string[] = [];
  for (let i = 0; i < p.length - 2; i++) out.push(p.slice(i, i + 3));
  return out;
}
function triSim(a: string, b: string) {
  if (!a || !b) return 0;
  const A = tri(a), B = tri(b);
  let hit = 0;
  A.forEach((t) => { if (B.indexOf(t) !== -1) hit++; });
  return (2 * hit) / (A.length + B.length);
}
export function norm(s: unknown) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/* how close a spoken word lands to the real word */
export function wordProximity(w: string, entry: Entry, lang: Lang) {
  const word = norm(w);
  if (!word) return 0;
  const real = norm(entry[0]);
  const hint = norm(entry[2]);
  const topic = entry[3];
  if (real.split(/\s+/).indexOf(word) !== -1) return 1;
  if (word.length > 3 && (real.indexOf(word) !== -1 || word.indexOf(real) !== -1)) return 0.92;
  if (hint.split(/[^a-z']+/).indexOf(word) !== -1) return 0.74;
  const rel = norm((lang === "es" ? relatedEs : related)[topic] || "").split(" ");
  if (rel.indexOf(word) !== -1) return 0.58;
  const stem = word.replace(lang === "es" ? /(es|s)$/ : /(ing|ed|es|s)$/, "");
  if (stem.length > 3 && rel.indexOf(stem) !== -1) return 0.52;
  return 0.12 + Math.max(triSim(word, real), 0) * 0.55;
}

export function splitWords(str: string) {
  return String(str || "").split(/\s*[,;]\s*|\s+/).filter((w) => w.length);
}

/* one score per student: best clue dominates, extra clues add a little */
export function studentProximity(words: string, entry: Entry | null, lang: Lang) {
  if (!entry) return 0;
  const list = splitWords(words);
  if (!list.length) return 0;
  const sc = list.map((w) => wordProximity(w, entry, lang)).sort((a, b) => b - a);
  let total = sc[0];
  for (let k = 1; k < sc.length; k++) total += sc[k] * 0.35;
  return total;
}

export function countWords(str: string) {
  return String(str || "").split(/[,;\s]+/).filter((w) => w.length).length;
}

export type Band = "no words" | "close" | "warm" | "distant";
export function band(score: number, max: number): Band {
  if (score === 0) return "no words";
  const r = score / Math.max(0.0001, max);
  return r > 0.72 ? "close" : r > 0.42 ? "warm" : "distant";
}

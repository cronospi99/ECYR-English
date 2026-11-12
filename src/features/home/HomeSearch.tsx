import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Dumbbell, Gamepad2, GraduationCap, Languages, Search, Sigma, X, type LucideIcon } from 'lucide-react';
import { MODULES } from '@/content/catalog';
import { cn } from '@/lib/cn';

/**
 * "Find a topic": type a grammar point, a word, a unit theme or a section and jump straight to it.
 * Units, grammar points, unit vocabulary and Pre-A1 topics come from search-index.json (built by
 * scripts/build-search-index.mjs, loaded when the box is first used); sections and games are listed here.
 */
interface Entry { k: 'unit' | 'grammar' | 'vocab' | 'topic' | 'page' | 'game'; t: string; s: string; to: string; x?: string }
interface Indexed extends Entry { nt: string; ns: string; nx: string }

const KIND: Record<Entry['k'], { label: string; icon: LucideIcon; color: string }> = {
  grammar: { label: 'Grammar', icon: Sigma, color: 'var(--purple)' },
  unit: { label: 'Unit', icon: GraduationCap, color: 'var(--green)' },
  vocab: { label: 'Vocabulary', icon: Languages, color: 'var(--orange)' },
  topic: { label: 'Pre-A1', icon: BookOpen, color: 'var(--blue)' },
  page: { label: 'Section', icon: Dumbbell, color: 'var(--teal)' },
  game: { label: 'Game', icon: Gamepad2, color: 'var(--pink)' },
};

const PAGES: Entry[] = [
  { k: 'page', t: 'Verb Lab', s: 'Practice · 1,500+ verbs, three forms, -ed sounds, verb patterns', to: '/practice/verbs', x: 'verbos irregulares regulares conjugación conjugation past participle participio gerund infinitive patrones académicos academic' },
  { k: 'page', t: 'Phrasal Verbs', s: 'Practice · 1,250+ phrasal verbs with examples and quiz', to: '/practice/phrasal-verbs', x: 'verbos frasales get up look for take off' },
  { k: 'page', t: 'Vocabulary', s: 'Practice · connectors, adjectives, adverbs, picture cards', to: '/practice/vocabulary', x: 'vocabulario conectores linking words adjetivos adverbios visual' },
  { k: 'page', t: 'Reading', s: 'Practice · texts by level', to: '/practice/reading', x: 'lectura leer comprensión' },
  { k: 'page', t: 'Listening', s: 'Practice · audios by level', to: '/practice/listening', x: 'escucha audio oír comprensión auditiva' },
  { k: 'page', t: 'Speaking', s: 'Practice · record yourself and get feedback', to: '/practice/speaking', x: 'hablar pronunciación pronunciation oral' },
  { k: 'page', t: 'Writing', s: 'Practice · tasks with feedback', to: '/practice/writing', x: 'escritura escribir essay email ensayo carta' },
  { k: 'page', t: 'Workshops', s: 'Practice · classes with printable tasks', to: '/practice/workshops', x: 'talleres pdf' },
  { k: 'page', t: 'Tenses', s: 'Grammar tools · all the tenses side by side', to: '/learn/grammar/tenses', x: 'tiempos verbales present past future perfect continuous presente pasado futuro' },
  { k: 'page', t: 'Time Machine', s: 'Grammar tools · travel through the tenses', to: '/learn/grammar/time-machine', x: 'tiempos verbales línea de tiempo timeline' },
  { k: 'page', t: 'Modal verbs', s: 'Grammar tools · can, must, should, might…', to: '/learn/grammar/modals', x: 'modales modals could would may ought to have to obligación permiso consejo' },
  { k: 'page', t: 'Do or Make', s: 'Grammar tools · collocations', to: '/learn/grammar/do-make', x: 'hacer collocations colocaciones' },
  { k: 'page', t: 'Time family', s: 'Grammar tools · the clock, dates and time words', to: '/learn/grammar/time-family', x: 'la hora reloj fechas telling the time' },
  { k: 'page', t: 'Grammar hub', s: 'Learn · every grammar tool', to: '/learn/grammar', x: 'gramática' },
  { k: 'page', t: 'Infographics', s: 'Learn · grammar and vocabulary in pictures', to: '/learn/visuals', x: 'infografías imágenes visual' },
  { k: 'page', t: 'Pre-A1 Foundations', s: 'Learn · alphabet, numbers, greetings, to be', to: '/learn/foundations', x: 'cimientos principiante básico beginner abecedario números saludos' },
  { k: 'page', t: 'IELTS', s: 'Exam preparation and simulator', to: '/ielts', x: 'examen internacional simulador band' },
  { k: 'page', t: 'AI Coach', s: 'Ask questions and practise with the tutor', to: '/coach', x: 'tutor inteligencia artificial chat preguntar' },
  { k: 'page', t: 'Games', s: 'All the class games', to: '/games', x: 'juegos' },
  { k: 'page', t: 'My plan', s: 'Your weekly study plan', to: '/plan', x: 'plan de estudio semana' },
  { k: 'page', t: 'Tasks', s: 'Homework from your teacher', to: '/tasks', x: 'tareas deberes asignaciones' },
  { k: 'page', t: 'Progress', s: 'XP, streak and levels', to: '/progress', x: 'progreso avance racha' },
  { k: 'page', t: 'My notes', s: 'Everything you have written down', to: '/notes', x: 'notas apuntes' },
  { k: 'game', t: 'Impostor', s: 'Game · find who does not know the word', to: '/impostor', x: 'juego' },
  { k: 'game', t: 'You Draw', s: 'Game · draw and guess', to: '/youdraw', x: 'juego dibujar adivinar' },
  { k: 'game', t: 'Pass the Doodle', s: 'Game · draw, describe, repeat', to: '/doodle', x: 'juego dibujar teléfono roto' },
  { k: 'game', t: 'Class Wars', s: 'Game · team quiz battle', to: '/classwars', x: 'juego equipos quiz' },
];

/** Spanish words a learner is likely to type → the English word used in the lessons. */
const ALIAS: Record<string, string> = {
  pasado: 'past', presente: 'present', futuro: 'future', perfecto: 'perfect', continuo: 'continuous', progresivo: 'continuous', condicional: 'conditional', condicionales: 'conditional',
  pasiva: 'passive', preposiciones: 'prepositions', preposicion: 'preposition', verbos: 'verbs', verbo: 'verb', adjetivos: 'adjectives', adjetivo: 'adjective', comparativos: 'comparatives',
  superlativos: 'superlatives', preguntas: 'questions', modales: 'modals', cuantificadores: 'quantifiers', relativas: 'relative', relativos: 'relative', reportado: 'reported', indirecto: 'reported',
  gerundios: 'gerunds', gerundio: 'gerund', infinitivos: 'infinitives', infinitivo: 'infinitive', adverbios: 'adverbs', frecuencia: 'frequency', tiempo: 'time', lugar: 'place', ropa: 'clothes',
  familia: 'family', clima: 'weather', comida: 'food', viajes: 'travel', salud: 'health', trabajo: 'job', pronombres: 'pronouns', posesivos: 'possessive', demostrativos: 'demonstratives',
  articulos: 'articles', deseos: 'wishes', sugerencias: 'suggestions', peticiones: 'requests', consejos: 'recommendations', obligacion: 'obligation', permiso: 'permission', ciudad: 'city', casa: 'house',
};
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”"’']/g, '');

let cache: Promise<Indexed[]> | null = null;
function loadIndex(): Promise<Indexed[]> {
  cache ??= import('@/content/generated/search-index.json').then((m) => {
    const games: Entry[] = MODULES.map((g) => ({ k: g.kind === 'game' || g.kind === 'presentation' ? 'game' : 'page', t: g.title, s: `${g.kind === 'game' ? 'Game' : 'Module'} · ${g.subtitle}`, to: `/play/${g.slug}`, x: g.topics.join(' · ') }));
    return [...(m.default as Entry[]), ...PAGES, ...games].map((e) => ({ ...e, nt: norm(e.t), ns: norm(e.s), nx: norm(e.x ?? '') }));
  });
  return cache;
}

function search(index: Indexed[], q: string): (Indexed & { hit?: string })[] {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const full = tokens.join(' ');
  const scored: { e: Indexed & { hit?: string }; score: number }[] = [];
  for (const e of index) {
    let score = 0;
    let ok = true;
    for (const tk of tokens) {
      const alt = ALIAS[tk];
      // Short words (in, on, at, 5) must be whole words, or they would match inside almost anything.
      const word = tk.length <= 2 ? new RegExp(`(^|[^a-z0-9])${tk.replace(/[^a-z0-9]/g, '')}([^a-z0-9]|$)`) : null;
      const has = (h: string) => (word ? word.test(h) : h.includes(tk)) || (!!alt && h.includes(alt));
      const inT = has(e.nt);
      const inS = has(e.ns);
      const inX = has(e.nx);
      if (!inT && !inS && !inX) { ok = false; break; }
      score += inT ? 6 : inS ? 3 : 1;
      if (inT && new RegExp(`(^|[^a-z])${tk.replace(/[^a-z0-9]/g, '')}`).test(e.nt)) score += 2;
    }
    if (!ok) continue;
    if (e.nt.includes(full)) score += 6;
    if (e.nt.startsWith(full)) score += 4;
    if (e.k === 'grammar' || e.k === 'page') score += 1;
    if (e.k === 'unit' && tokens.includes('unit')) score += 4;
    // A word found only in a unit's vocabulary list: show which word matched.
    let hit: string | undefined;
    if (e.k === 'vocab' && e.x) hit = e.x.split(' · ').find((w) => tokens.some((tk) => norm(w).includes(tk)));
    scored.push({ e: { ...e, hit }, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 8).map((x) => x.e);
}

export function HomeSearch() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<Indexed[] | null>(null);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const results = useMemo(() => (index ? search(index, q) : []), [index, q]);
  const warm = () => { if (!index) void loadIndex().then(setIndex); };

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  const go = (e: Entry) => { setOpen(false); setQ(''); nav(e.to); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setSel((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); go(results[sel]); }
    else if (e.key === 'Escape') setOpen(false);
  };
  const show = open && q.trim().length > 0;

  return (
    <div ref={box} className="relative z-20">
      <div className="bg-bg-2 shadow-card border-separator flex h-12 items-center gap-2.5 rounded-[16px] border px-3.5 focus-within:border-[var(--blue)]">
        <Search size={19} className="text-label-2 shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); warm(); }}
          onFocus={() => { warm(); setOpen(true); }}
          onKeyDown={onKey}
          placeholder="Find a topic: present perfect, clothes, phrasal verbs, unit 5…"
          aria-label="Find a topic, unit or section"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          className="placeholder:text-label-3 h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Clear" className="text-label-2 hover:bg-fill-2 grid h-8 w-8 shrink-0 place-items-center rounded-full">
            <X size={17} />
          </button>
        )}
      </div>
      {show && (
        <ul id={listId} role="listbox" className="bg-bg-2 shadow-float border-separator absolute inset-x-0 top-[calc(100%+6px)] max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain rounded-[16px] border p-1.5">
          {!index && <li className="text-label-2 px-3 py-3 text-[14.5px]">Searching…</li>}
          {index && results.length === 0 && <li className="text-label-2 px-3 py-3 text-[14.5px]">Nothing found for “{q.trim()}”. Try another word, in English or Spanish.</li>}
          {results.map((r, i) => {
            const K = KIND[r.k];
            return (
              <li key={r.to + r.t} role="option" aria-selected={i === sel}>
                <button
                  type="button"
                  onClick={() => go(r)}
                  onMouseEnter={() => setSel(i)}
                  className={cn('flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left', i === sel && 'bg-fill-2')}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: `color-mix(in srgb, ${K.color} 70%, #000)` }} aria-hidden>
                    <K.icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-semibold">{r.hit ? `“${r.hit}” — ${r.t}` : r.t}</span>
                    <span className="text-label-2 block truncate text-[13px]">{r.s}</span>
                  </span>
                  <span className="text-label-2 hidden shrink-0 text-[12px] font-semibold sm:block">{K.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

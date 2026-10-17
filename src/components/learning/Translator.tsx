/**
 * Word / phrase translator (English ↔ Spanish) for output tasks.
 *
 *   <TranslatorButton />   small "Traductor" button; opens the floating panel
 *   <TranslatorHost />     the one panel, mounted once by the app shell (dock)
 *
 * Translation: MyMemory first (keyless, CORS-open, ≤ 480 chars), then the
 * class's `gemini` Edge Function for signed-in users when MyMemory fails.
 * The panel is non-modal so learners can keep writing while it is open.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { ArrowLeftRight, Copy, History, Languages, NotebookPen, Play, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Misc';

export type Lang = 'en' | 'es';
type Dir = 'auto' | 'en-es' | 'es-en';

export const MAX_TRANSLATE = 480;

// ---------------------------------------------------------------- store --

interface TranslatorState {
  open: boolean;
  /** Text to look up when the panel opens (e.g. the selected word). */
  seed: string;
  /** Bumps on every show() so the panel re-reads `seed`. */
  nonce: number;
  hosts: number;
  show: (seed?: string) => void;
  close: () => void;
  toggle: () => void;
}

let opener: HTMLElement | null = null;

export const useTranslator = create<TranslatorState>()((set, get) => ({
  open: false,
  seed: '',
  nonce: 0,
  hosts: 0,
  show: (seed = '') => {
    opener = (document.activeElement as HTMLElement | null) ?? null;
    set((s) => ({ open: true, seed, nonce: s.nonce + 1 }));
  },
  close: () => {
    set({ open: false });
    const el = opener;
    opener = null;
    if (el && document.contains(el)) requestAnimationFrame(() => el.focus?.());
  },
  toggle: () => (get().open ? get().close() : get().show(selectedText())),
}));

/** The user's current text selection, when it is short enough to translate. */
function selectedText() {
  try {
    const active = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
    if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type === 'text'))) {
      const { selectionStart: a, selectionEnd: b, value } = active;
      if (a != null && b != null && b > a) return value.slice(a, b).trim().slice(0, 200);
    }
    const s = window.getSelection()?.toString().trim() ?? '';
    return s.length <= 200 ? s : '';
  } catch {
    return '';
  }
}

// ------------------------------------------------------------ detection --

const ES_WORDS = new Set(
  'el la los las un una unos unas de del al que y en es son por para con sin no se lo le les mi mis tu tus su sus yo él ella ellos ellas nosotros ustedes usted como cómo pero muy qué estoy está estás están tengo tiene tienes hola gracias casa perro gato quiero quieres hacer ser estar bien también porque cuando donde dónde esto eso esta este hay soy eres era fue más menos sí año día noche agua comida trabajo escuela amigo amiga libro hablar comer beber vivir ir tener puedo puede necesito me te nos ya todo todos nada algo hoy mañana ayer ahora siempre nunca bueno buena malo mala grande pequeño'.split(' '),
);
const EN_WORDS = new Set(
  'the a an of to and is are am was were be been in on at for with without i you he she it we they my your his her its our their this that these those what how why who which do does did done have has had will would can could should not no yes hello hi thanks thank house dog cat want make good bad because when where there here go get like eat drink live very also but or so if then from about just some any all every today tomorrow yesterday now always never big small me him them us'.split(' '),
);

/** Best guess of the language of `s` (Spanish if it has Spanish letters or words). */
export function detectLang(s: string): Lang {
  const t = s.toLowerCase();
  if (/[ñáéíóúü¿¡]/.test(t)) return 'es';
  const words = t.match(/[a-z']+/g) ?? [];
  let es = 0;
  let en = 0;
  for (const w of words) {
    if (ES_WORDS.has(w)) es++;
    if (EN_WORDS.has(w)) en++;
  }
  if (es !== en) return es > en ? 'es' : 'en';
  const last = words[words.length - 1] ?? '';
  if (/(ing|ed|tion|ly|ness|ful|ous|th|sh|ght|w|k|y)$/.test(last)) return 'en';
  if (/(ción|sión|dad|mente|ando|iendo|ado|ido|ar|ir|os|as|o|a)$/.test(last)) return 'es';
  return 'en';
}

// ---------------------------------------------------------- translation --

export interface Translation {
  text: string;
  from: Lang;
  to: Lang;
  alternatives: string[];
  via: 'mymemory' | 'ai';
}

const cache = new Map<string, Translation>();

function decodeEntities(s: string) {
  if (!/&[#a-z0-9]+;/i.test(s)) return s;
  try {
    return new DOMParser().parseFromString(s, 'text/html').documentElement.textContent ?? s;
  } catch {
    return s;
  }
}

async function viaMyMemory(q: string, from: Lang, to: Lang): Promise<Translation | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${from}|${to}`;
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      responseStatus?: number | string;
      responseData?: { translatedText?: string };
      matches?: { translation?: string; quality?: number | string }[];
    };
    const text = decodeEntities(String(j.responseData?.translatedText ?? '')).trim();
    if (Number(j.responseStatus) !== 200 || !text || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID (LANGUAGE|SOURCE|TARGET)|PLEASE SELECT/i.test(text)) return null;
    const seen = new Set([text.toLowerCase(), q.toLowerCase()]);
    const alternatives: string[] = [];
    for (const m of j.matches ?? []) {
      const t = decodeEntities(String(m.translation ?? '')).trim();
      if (!t || seen.has(t.toLowerCase()) || t.length > 120) continue;
      seen.add(t.toLowerCase());
      alternatives.push(t);
      if (alternatives.length >= 3) break;
    }
    return { text, from, to, alternatives, via: 'mymemory' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function viaAi(q: string, from: Lang, to: Lang): Promise<Translation | null> {
  if (!supabase) return null;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const name = { en: 'English', es: 'Spanish (Latin American)' };
  const prompt = `Translate this ${name[from]} text into ${name[to]}. Reply with ONLY the translation — no quotes, notes or explanations.\n\n${q}`;
  const { data, error } = await supabase.functions.invoke('gemini', { body: { op: 'generate', contents: [{ parts: [{ text: prompt }] }] } });
  if (error) return null;
  const text = ((data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim()
    .replace(/^["“](.*)["”]$/s, '$1');
  return text ? { text, from, to, alternatives: [], via: 'ai' } : null;
}

/** Translates `q` (≤ 480 chars). Throws a Spanish message when nothing worked. */
export async function translate(q: string, from: Lang): Promise<Translation> {
  const text = q.trim().slice(0, MAX_TRANSLATE);
  const to: Lang = from === 'en' ? 'es' : 'en';
  const key = `${from}|${text.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = (await viaMyMemory(text, from, to)) ?? (await viaAi(text, from, to).catch(() => null));
  if (!out) {
    const signedIn = Boolean(supabase && (await supabase.auth.getSession()).data.session);
    throw new Error(signedIn ? 'No se pudo traducir ahora. Revisa tu conexión e inténtalo de nuevo.' : 'No se pudo traducir ahora. Revisa tu conexión (o inicia sesión para usar la IA de la clase).');
  }
  cache.set(key, out);
  return out;
}

// --------------------------------------------------------------- recent --

interface Recent {
  q: string;
  t: string;
  from: Lang;
}
const RECENT_KEY = 'ecyr:translator-recent';

function readRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as Recent[];
    return Array.isArray(v) ? v.filter((x) => x && typeof x.q === 'string' && typeof x.t === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: Recent[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------- panel --

const LANG_NAME: Record<Lang, string> = { en: 'inglés', es: 'español' };

/** Hook for "save to notes": the notes feature registers itself here (keeps this file free of feature imports). */
let saveToNotes: ((text: string) => void) | null = null;
export function registerTranslatorNoteSaver(fn: ((text: string) => void) | null) {
  saveToNotes = fn;
}

function TranslatorPanel() {
  const { open, seed, nonce, close } = useTranslator();
  const [q, setQ] = useState('');
  const [dir, setDir] = useState<Dir>('auto');
  const [res, setRes] = useState<Translation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>(readRecent);
  const [copied, setCopied] = useState(false);
  const [noted, setNoted] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const titleId = useId();
  const inputId = useId();

  const from: Lang = dir === 'en-es' ? 'en' : dir === 'es-en' ? 'es' : detectLang(q);

  // A new show(): take the seed and focus the box.
  useEffect(() => {
    if (!open) return;
    if (seed) setQ(seed.slice(0, MAX_TRANSLATE));
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.select();
    });
  }, [open, nonce, seed]);

  // Translate shortly after typing stops.
  useEffect(() => {
    const text = q.trim();
    if (!open) return;
    if (!text) {
      setRes(null);
      setError(null);
      return;
    }
    const id = ++run.current;
    const t = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const r = await translate(text, from);
        if (id !== run.current) return;
        setRes(r);
        setCopied(false);
        setNoted(false);
        setRecent((list) => {
          const next = [{ q: text, t: r.text, from: r.from }, ...list.filter((x) => x.q.toLowerCase() !== text.toLowerCase())].slice(0, 8);
          writeRecent(next);
          return next;
        });
      } catch (e) {
        if (id === run.current) {
          setRes(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (id === run.current) setBusy(false);
      }
    }, 550);
    return () => clearTimeout(t);
  }, [q, from, open]);

  if (!open) return null;

  const english = res ? (res.from === 'en' ? q.trim() : res.text) : '';
  const swap = () => {
    if (res) setQ(res.text);
    setDir(from === 'en' ? 'es-en' : 'en-es');
  };

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
      className={cn(
        'bg-card text-label shadow-float border-separator fixed z-[90] flex max-h-[min(calc(100dvh-190px),620px)] flex-col overflow-hidden rounded-[20px] border',
        'inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+116px)] lg:inset-x-auto lg:right-14 lg:bottom-6 lg:w-[380px]',
      )}
    >
      <div className="hairline-b flex items-center gap-2 px-4 py-2.5">
        <Languages size={18} className="text-ink-indigo shrink-0" aria-hidden />
        <h2 id={titleId} className="text-headline min-w-0 flex-1">
          Traductor
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar traductor"
          className="text-label-2 hover:bg-fill-2 inline-flex h-8 w-8 items-center justify-center rounded-full"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
        <div className="mb-2 flex items-center gap-1.5" role="radiogroup" aria-label="Dirección">
          {(
            [
              ['auto', 'Auto'],
              ['en-es', 'EN → ES'],
              ['es-en', 'ES → EN'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={dir === v}
              onClick={() => setDir(v)}
              className={cn(
                'h-7 rounded-full px-3 text-[13px] font-medium transition-colors',
                dir === v ? 'bg-label text-bg' : 'bg-fill-2 text-label hover:bg-fill',
              )}
            >
              {l}
            </button>
          ))}
          <button
            type="button"
            onClick={swap}
            aria-label="Invertir dirección"
            title="Invertir"
            className="text-ink-blue hover:bg-fill-2 ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full"
          >
            <ArrowLeftRight size={15} />
          </button>
        </div>

        <label htmlFor={inputId} className="sr-only">
          Palabra o frase para traducir
        </label>
        <textarea
          id={inputId}
          ref={input}
          value={q}
          rows={2}
          maxLength={MAX_TRANSLATE}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
          }}
          placeholder="Escribe una palabra o frase (inglés o español)…"
          className="bg-fill-2 placeholder:text-label-3 focus:ring-ios-blue/40 w-full resize-none rounded-[12px] px-3 py-2.5 text-[16px] leading-snug outline-none focus:ring-2"
        />
        <div className="text-label-2 mt-1 flex justify-between text-[12px]">
          <span>{q.trim() ? `${dir === 'auto' ? 'Detectado' : 'De'}: ${LANG_NAME[from]} → ${LANG_NAME[from === 'en' ? 'es' : 'en']}` : 'Inglés ↔ español'}</span>
          <span className="tabular-nums">
            {q.length}/{MAX_TRANSLATE}
          </span>
        </div>

        <div aria-live="polite" className="mt-3">
          {busy && !res && (
            <div className="text-label-2 flex items-center gap-2 text-[14px]">
              <Spinner className="h-4 w-4" /> Traduciendo…
            </div>
          )}
          {error && <p className="text-ink-red text-[14px]">{error}</p>}
          {res && (
            <div className={cn('rounded-[14px] bg-[color-mix(in_srgb,var(--indigo)_10%,transparent)] p-3 transition-opacity', busy && 'opacity-60')}>
              <p className="text-[17px] leading-snug font-semibold break-words">{res.text}</p>
              {res.alternatives.length > 0 && (
                <p className="text-label-2 mt-1 text-[13px] break-words">También: {res.alternatives.join(' · ')}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {english && (
                  <button
                    type="button"
                    onClick={() => speak(english)}
                    className="bg-card text-ink-blue shadow-card inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold"
                    aria-label={`Escuchar en inglés: ${english}`}
                  >
                    <Play size={13} fill="currentColor" /> Escuchar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(res.text);
                    setCopied(true);
                  }}
                  className="bg-card text-label shadow-card inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium"
                >
                  <Copy size={13} /> {copied ? 'Copiado' : 'Copiar'}
                </button>
                {saveToNotes && (
                  <button
                    type="button"
                    onClick={() => {
                      saveToNotes?.(`${q.trim()} — ${res.text}`);
                      setNoted(true);
                    }}
                    disabled={noted}
                    className="bg-card text-label shadow-card inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium disabled:opacity-60"
                  >
                    <NotebookPen size={13} /> {noted ? 'En tus notas ✓' : 'A mis notas'}
                  </button>
                )}
                <span className="text-label-3 ml-auto text-[11px]">{res.via === 'ai' ? 'IA de la clase' : 'MyMemory'}</span>
              </div>
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div className="mt-4">
            <div className="text-label-2 mb-1 flex items-center justify-between text-[12px] font-semibold uppercase">
              <span className="inline-flex items-center gap-1">
                <History size={13} aria-hidden /> Recientes
              </span>
              <button
                type="button"
                className="text-ink-blue text-[12px] font-semibold normal-case"
                onClick={() => {
                  setRecent([]);
                  writeRecent([]);
                }}
              >
                Borrar
              </button>
            </div>
            <ul className="space-y-0.5">
              {recent.map((r) => (
                <li key={r.from + r.q}>
                  <button
                    type="button"
                    onClick={() => {
                      setDir(r.from === 'en' ? 'en-es' : 'es-en');
                      setQ(r.q);
                    }}
                    className="hover:bg-fill-2 flex w-full items-baseline gap-2 rounded-[10px] px-2 py-1.5 text-left text-[14px]"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{r.q}</span>
                    <span className="text-label-2 max-w-[50%] truncate text-[13px]">{r.t}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Mount once (the app shell does): renders the shared translator panel. */
export function TranslatorHost() {
  useEffect(() => {
    useTranslator.setState((s) => ({ hosts: s.hosts + 1 }));
    return () => useTranslator.setState((s) => ({ hosts: Math.max(0, s.hosts - 1) }));
  }, []);
  return <TranslatorPanel />;
}

/** Small "Traductor" button for output tasks (writing, speaking, coach). */
export function TranslatorButton({ className, label = 'Traductor' }: { className?: string; label?: string }) {
  const open = useTranslator((s) => s.open);
  const hosts = useTranslator((s) => s.hosts);
  const toggle = useTranslator((s) => s.toggle);
  return (
    <>
      <button
        type="button"
        // Keep the selection in the text box: read it before focus moves.
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'text-ink-indigo inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--indigo)_13%,transparent)] px-3 text-[14px] font-semibold transition-opacity hover:opacity-80',
          className,
        )}
      >
        <Languages size={15} aria-hidden /> {label}
      </button>
      {hosts === 0 && <TranslatorPanel />}
    </>
  );
}

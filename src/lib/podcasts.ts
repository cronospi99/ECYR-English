/**
 * Real podcasts for the Listening section, from Apple's public catalog.
 *
 * The iTunes Search API (itunes.apple.com/search and /lookup) is free and needs
 * no key. `lookup?id=<collectionId>&entity=podcastEpisode` lists a show's latest
 * episodes with their MP3 (`episodeUrl`), so no RSS parsing is needed. The audio
 * is streamed in an <audio> element from the publisher's own host: nothing is
 * copied or re-hosted, and every screen credits the show and links to it.
 *
 * Apple's CORS headers are not dependable, so requests try fetch() first and
 * fall back to JSONP (`callback=`), which the API supports.
 *
 * Shows are curated per level by search term + expected name/publisher, and
 * resolved at runtime (cached), so no Apple ids are hard-coded: if a show is
 * renamed or missing in a region, it is skipped instead of breaking the page.
 *
 * AI quizzes (questions written by Gemini after listening to an episode) live
 * in the `podcast_quizzes` table and are made by the `podcast` Edge Function;
 * see supabase/functions/podcast and supabase/migrations/11_podcasts.sql.
 */
import type { LibQuestion } from '@/content/library';
import type { CefrLevel } from '@/content/types';
import { supabase } from './supabase';

// ------------------------------------------------------------ curated shows --

export interface PodcastShowDef {
  id: string;
  level: CefrLevel;
  /** What to type into the Search API. */
  term: string;
  /** Every one of these must appear in the show's name. */
  name: string[];
  /** One of these must appear in the publisher's name (when given). */
  artist?: string[];
  label: string;
  /** Typical episode length, as shown on the card. */
  length: string;
  about_es: string;
}

export const PODCAST_SHOWS: PodcastShowDef[] = [
  // A1 — very short or very slow, one idea at a time.
  {
    id: 'voa-english-in-a-minute',
    level: 'A1',
    term: 'English in a Minute VOA Learning English',
    name: ['english in a minute'],
    artist: ['voa', 'voice of america'],
    label: 'English in a Minute (VOA)',
    length: '1 min',
    about_es: 'Una expresión cotidiana explicada en un minuto, con ejemplos claros y lentos.',
  },
  {
    id: 'easy-stories-in-english',
    level: 'A1',
    term: 'Easy Stories in English',
    name: ['easy stories in english'],
    label: 'Easy Stories in English',
    length: '10–25 min',
    about_es: 'Cuentos narrados despacio, con episodios marcados desde principiante.',
  },
  {
    id: 'coffee-break-english',
    level: 'A1',
    term: 'Coffee Break English',
    name: ['coffee break english'],
    label: 'Coffee Break English',
    length: '15–20 min',
    about_es: 'Lecciones paso a paso de Radio Lingua, con explicaciones y repetición.',
  },
  // A2 — everyday language, slow and clear.
  {
    id: 'daily-easy-english',
    level: 'A2',
    term: 'Daily Easy English Expression',
    name: ['daily easy english'],
    label: 'Daily Easy English Expression',
    length: '5–10 min',
    about_es: 'Una expresión útil al día, explicada con calma y muchos ejemplos.',
  },
  {
    id: 'bbc-english-we-speak',
    level: 'A2',
    term: 'The English We Speak BBC',
    name: ['english we speak'],
    artist: ['bbc'],
    label: 'The English We Speak (BBC)',
    length: '3–4 min',
    about_es: 'Expresiones y jerga actuales del inglés británico en mini diálogos.',
  },
  {
    id: 'voa-learning-english-broadcast',
    level: 'A2',
    term: 'Learning English Broadcast VOA',
    name: ['learning english broadcast'],
    artist: ['voa', 'voice of america'],
    label: 'Learning English Broadcast (VOA)',
    length: '30 min',
    about_es: 'Noticias del día leídas en inglés lento y con vocabulario sencillo.',
  },
  // B1 — natural topics at a comfortable pace.
  {
    id: 'bbc-6-minute-english',
    level: 'B1',
    term: '6 Minute English BBC Learning English',
    name: ['6 minute english'],
    artist: ['bbc'],
    label: '6 Minute English (BBC)',
    length: '6 min',
    about_es: 'Dos presentadores conversan sobre un tema y explican 6 palabras clave.',
  },
  {
    id: 'voa-words-and-their-stories',
    level: 'B1',
    term: 'Words and Their Stories VOA',
    name: ['words and their stories'],
    artist: ['voa', 'voice of america'],
    label: 'Words and Their Stories (VOA)',
    length: '5–10 min',
    about_es: 'El origen y el uso de expresiones del inglés americano, en inglés pausado.',
  },
  {
    id: 'eslpod',
    level: 'B1',
    term: 'ESLPod English as a Second Language Podcast',
    name: ['english'],
    artist: ['eslpod', 'esl pod'],
    label: 'ESL Podcast (ESLPod)',
    length: '15–20 min',
    about_es: 'Un diálogo lento y luego la explicación detallada de su vocabulario.',
  },
  {
    id: 'speak-english-now',
    level: 'B1',
    term: 'Speak English Now Podcast',
    name: ['speak english now'],
    label: 'Speak English Now Podcast',
    length: '15–20 min',
    about_es: 'Inglés conversacional y pronunciación para ganar fluidez.',
  },
  // B2 — real conversation at near-natural speed.
  {
    id: 'all-ears-english',
    level: 'B2',
    term: 'All Ears English Podcast',
    name: ['all ears english'],
    label: 'All Ears English',
    length: '15–20 min',
    about_es: 'Conversaciones naturales sobre inglés real, cultura y comunicación.',
  },
  {
    id: 'culips',
    level: 'B2',
    term: 'Culips English Podcast',
    name: ['culips'],
    label: 'Culips English Podcast',
    length: '20–30 min',
    about_es: 'Hablantes nativos conversan y explican expresiones y matices del inglés.',
  },
  {
    id: 'curious-minds',
    level: 'B2',
    term: 'English Learning for Curious Minds',
    name: ['curious minds'],
    artist: ['leonardo english'],
    label: 'English Learning for Curious Minds',
    length: '20–30 min',
    about_es: 'Historia, ciencia y cultura contadas en inglés claro para estudiantes avanzados.',
  },
  // C1 — native-speed and long-form.
  {
    id: 'lukes-english-podcast',
    level: 'C1',
    term: "Luke's English Podcast",
    name: ['luke'],
    artist: ['luke thompson'],
    label: "Luke's English Podcast",
    length: '30–120 min',
    about_es: 'Episodios largos y espontáneos en inglés británico, con humor y cultura.',
  },
  {
    id: 'npr-news-now',
    level: 'C1',
    term: 'NPR News Now',
    name: ['npr news now'],
    artist: ['npr'],
    label: 'NPR News Now',
    length: '5 min',
    about_es: 'Boletín de noticias real a velocidad nativa, actualizado cada hora.',
  },
  {
    id: 'the-indicator',
    level: 'C1',
    term: 'The Indicator from Planet Money',
    name: ['indicator'],
    artist: ['npr'],
    label: 'The Indicator (NPR)',
    length: '10 min',
    about_es: 'Economía cotidiana explicada en 10 minutos por periodistas de NPR.',
  },
  {
    id: 'ted-talks-daily',
    level: 'C1',
    term: 'TED Talks Daily',
    name: ['ted talks daily'],
    artist: ['ted'],
    label: 'TED Talks Daily',
    length: '10–20 min',
    about_es: 'Una charla TED al día: ideas, ciencia y sociedad en inglés auténtico.',
  },
];

// ------------------------------------------------------------------- types --

export interface PodcastShow {
  collectionId: number;
  name: string;
  artist: string;
  artwork: string;
  /** Apple Podcasts page. */
  url: string;
  genre: string;
  explicit: boolean;
  episodes: number | null;
}

export interface PodcastEpisode {
  /** Stable id used for quizzes, notes and resume position. */
  key: string;
  trackId: number;
  collectionId: number;
  title: string;
  description: string;
  date: string;
  durationMs: number;
  audioUrl: string;
  artwork: string;
  /** Apple Podcasts page of the episode. */
  link: string;
  showName: string;
}

export class PodcastError extends Error {
  constructor(
    message: string,
    public code: 'offline' | 'timeout' | 'not_found' | 'server' | 'signed_out' | 'no_class' | 'limit' | 'no_key' | 'audio' | 'ai',
  ) {
    super(message);
  }
}

// ------------------------------------------------------------- iTunes API --

const API = 'https://itunes.apple.com';
const COUNTRY = 'US';
const TIMEOUT = 9000;
/** Once fetch() is refused (CORS), go straight to JSONP for the rest of the visit. */
let jsonpOnly = false;
let seq = 0;

type Raw = Record<string, unknown>;
interface ItunesResponse {
  resultCount: number;
  results: Raw[];
}

function jsonp(url: string, ms: number): Promise<ItunesResponse> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    const name = `__ecyrItunes${Date.now().toString(36)}${seq++}`;
    const s = document.createElement('script');
    const clean = () => {
      clearTimeout(timer);
      s.remove();
      // A late reply still calls the name: leave a no-op behind instead of a ReferenceError.
      w[name] = () => delete w[name];
    };
    const timer = setTimeout(() => {
      clean();
      reject(new PodcastError('Apple Podcasts tardó demasiado en responder. Inténtalo de nuevo.', 'timeout'));
    }, ms);
    w[name] = (data: ItunesResponse) => {
      clean();
      delete w[name];
      resolve(data);
    };
    s.onerror = () => {
      clean();
      reject(new PodcastError('No se pudo conectar con Apple Podcasts.', 'server'));
    };
    s.src = `${url}&callback=${name}`;
    s.async = true;
    document.head.appendChild(s);
  });
}

async function itunes(path: 'search' | 'lookup', params: Record<string, string | number>): Promise<ItunesResponse> {
  const qs = new URLSearchParams({ country: COUNTRY, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const url = `${API}/${path}?${qs}`;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new PodcastError('Sin conexión a internet: los podcasts se escuchan en línea.', 'offline');
  }
  if (!jsonpOnly) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (r.ok) return (await r.json()) as ItunesResponse;
      if (r.status === 403 || r.status === 429) {
        throw new PodcastError('Apple Podcasts limitó las consultas por un momento. Espera un minuto e inténtalo de nuevo.', 'server');
      }
    } catch (e) {
      if (e instanceof PodcastError) throw e;
      // TypeError = blocked by CORS (or the network): JSONP from here on.
      if (!ctrl.signal.aborted) jsonpOnly = true;
    } finally {
      clearTimeout(timer);
    }
  }
  return jsonp(url, TIMEOUT);
}

// --------------------------------------------------------------- mapping --

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
/** Mixed content is blocked on an https page; nearly every podcast host serves both. */
const https = (u: string) => u.replace(/^http:\/\//i, 'https://');
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function plain(html: string): string {
  if (!html) return '';
  let text = html;
  if (/[<&]/.test(html) && typeof DOMParser !== 'undefined') {
    // DOMParser never runs scripts or loads images: a safe way to get the text.
    const doc = new DOMParser().parseFromString(html.replace(/<(br|\/p|\/li)\s*\/?>/gi, '\n$&'), 'text/html');
    text = doc.body.textContent ?? '';
  }
  return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
}

function toShow(r: Raw): PodcastShow | null {
  const id = num(r.collectionId) || num(r.trackId);
  if (!id) return null;
  return {
    collectionId: id,
    name: str(r.collectionName) || str(r.trackName),
    artist: str(r.artistName),
    artwork: https(str(r.artworkUrl600) || str(r.artworkUrl100) || str(r.artworkUrl60)),
    url: https(str(r.collectionViewUrl) || str(r.trackViewUrl)) || `https://podcasts.apple.com/podcast/id${id}`,
    genre: str(r.primaryGenreName),
    explicit: str(r.collectionExplicitness) === 'explicit' || str(r.trackExplicitness) === 'explicit',
    episodes: num(r.trackCount) || null,
  };
}

function toEpisode(r: Raw, show: PodcastShow | null): PodcastEpisode | null {
  const audio = https(str(r.episodeUrl) || str(r.previewUrl));
  const trackId = num(r.trackId);
  const collectionId = num(r.collectionId) || show?.collectionId || 0;
  if (!audio || !trackId || !collectionId || !/^https:\/\//i.test(audio)) return null;
  // Video episodes play in <audio> too, but cost far more data: skip them.
  const kind = str(r.episodeContentType);
  if (kind && kind !== 'audio') return null;
  return {
    key: `itunes:${collectionId}:${trackId}`,
    trackId,
    collectionId,
    title: str(r.trackName).trim() || 'Episodio',
    description: plain(str(r.description) || str(r.shortDescription)).slice(0, 4000),
    date: str(r.releaseDate),
    durationMs: num(r.trackTimeMillis),
    audioUrl: audio,
    artwork: https(str(r.artworkUrl600) || str(r.artworkUrl160) || str(r.artworkUrl60)) || show?.artwork || '',
    link: https(str(r.trackViewUrl)) || show?.url || '',
    showName: str(r.collectionName) || show?.name || '',
  };
}

// ---------------------------------------------------------------- caching --

const SHOW_TTL = 14 * 864e5;
/** A show that was not found is looked for again sooner (it may have been a regional or temporary gap). */
const MISSING_TTL = 864e5;
const EPISODE_TTL = 3 * 3600e3;
const showKey = (id: string) => `ecyr:podcasts:show:${id}`;

function readLocal<T>(key: string, ttl: number): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as { at: number; v: T };
    return Date.now() - v.at < ttl ? v.v : undefined;
  } catch {
    return undefined;
  }
}
function writeLocal(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), v }));
  } catch {
    /* storage full or unavailable */
  }
}

const showMemo = new Map<string, Promise<PodcastShow | null>>();
const episodeMemo = new Map<string, { at: number; p: Promise<{ show: PodcastShow | null; episodes: PodcastEpisode[] }> }>();

function matches(def: PodcastShowDef, s: PodcastShow) {
  const n = fold(s.name);
  const a = fold(s.artist);
  return def.name.every((w) => n.includes(fold(w))) && (!def.artist || def.artist.some((w) => a.includes(fold(w))));
}

/**
 * Finds a curated show in Apple's catalog. Resolves to null (not an error)
 * when it is not there — renamed, removed, or not offered in this region.
 */
export function resolveShow(def: PodcastShowDef): Promise<PodcastShow | null> {
  const cached = readLocal<PodcastShow | null>(showKey(def.id), SHOW_TTL);
  if (cached || (cached === null && readLocal(showKey(def.id), MISSING_TTL) !== undefined)) return Promise.resolve(cached);
  let p = showMemo.get(def.id);
  if (!p) {
    p = itunes('search', { term: def.term, media: 'podcast', entity: 'podcast', limit: 15 })
      .then((res) => {
        const found = (res.results ?? []).map(toShow).find((s): s is PodcastShow => !!s && matches(def, s)) ?? null;
        writeLocal(showKey(def.id), found);
        return found;
      })
      .catch((e: unknown) => {
        showMemo.delete(def.id);
        throw e;
      });
    showMemo.set(def.id, p);
  }
  return p;
}

/** A show's latest episodes (newest first) and its own details from the same call. */
export function listEpisodes(collectionId: number, limit = 50): Promise<{ show: PodcastShow | null; episodes: PodcastEpisode[] }> {
  const memo = `${collectionId}:${limit}`;
  const hit = episodeMemo.get(memo);
  if (hit && Date.now() - hit.at < EPISODE_TTL) return hit.p;
  const p = itunes('lookup', { id: collectionId, media: 'podcast', entity: 'podcastEpisode', limit: Math.min(200, limit) })
    .then((res) => {
      const rows = res.results ?? [];
      if (!rows.length) throw new PodcastError('Este podcast no está disponible en Apple Podcasts ahora mismo.', 'not_found');
      const head = rows.find((r) => str(r.wrapperType) !== 'podcastEpisode' && str(r.kind) !== 'podcast-episode');
      const show = head ? toShow(head) : null;
      const episodes = rows
        .filter((r) => r !== head)
        .map((r) => toEpisode(r, show))
        .filter((e): e is PodcastEpisode => !!e)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return { show, episodes };
    })
    .catch((e: unknown) => {
      episodeMemo.delete(memo);
      throw e;
    });
  episodeMemo.set(memo, { at: Date.now(), p });
  return p;
}

/** Any podcast in the catalog by keyword (explicit shows are left out). */
export async function searchShows(term: string, limit = 20): Promise<PodcastShow[]> {
  const t = term.trim();
  if (t.length < 2) return [];
  const res = await itunes('search', { term: t.slice(0, 100), media: 'podcast', entity: 'podcast', limit, explicit: 'No' });
  return (res.results ?? []).map(toShow).filter((s): s is PodcastShow => !!s && !s.explicit);
}

/** The curated show definition a collection belongs to, if it has been resolved before. */
export function curatedFor(collectionId: number): PodcastShowDef | undefined {
  return PODCAST_SHOWS.find((d) => readLocal<PodcastShow | null>(showKey(d.id), SHOW_TTL)?.collectionId === collectionId);
}

// ------------------------------------------------------------- formatting --

export function fmtClock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDuration(ms: number) {
  if (!ms) return '';
  const min = Math.max(1, Math.round(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --------------------------------------------------------- resume position --

const POS_KEY = 'ecyr:podcasts:pos';
export interface ListenPos {
  t: number;
  d: number;
  done?: boolean;
  at: number;
}

function readPositions(): Record<string, ListenPos> {
  try {
    return (JSON.parse(localStorage.getItem(POS_KEY) ?? '{}') as Record<string, ListenPos>) ?? {};
  } catch {
    return {};
  }
}

export const getPosition = (key: string): ListenPos | undefined => readPositions()[key];
export const allPositions = readPositions;

export function savePosition(key: string, t: number, d: number, done = false) {
  const all = readPositions();
  const prev = all[key];
  all[key] = { t: Math.round(t), d: Math.round(d), done: done || prev?.done, at: Date.now() };
  // Keep the 150 most recent episodes.
  const keep = Object.entries(all)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 150);
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    /* storage full or unavailable */
  }
}

// ------------------------------------------------------------------ quizzes --

export interface PodcastQuiz {
  summary_es: string;
  vocab: [string, string][];
  questions: LibQuestion[];
  /** Minutes of audio the questions are about (the AI may only hear the start of a long episode). */
  covered_minutes: number | null;
  partial?: boolean;
}

export interface PodcastQuizRow {
  level: CefrLevel;
  quiz: PodcastQuiz;
  created_at: string;
}

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);

/** Re-checks a quiz's shape, so a malformed row can never break the page. */
export function cleanQuiz(raw: unknown): PodcastQuiz | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const text = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const questions: LibQuestion[] = [];
  for (const q of Array.isArray(r.questions) ? (r.questions as Raw[]) : []) {
    if (!q || typeof q !== 'object') continue;
    const stem = text(q.q, 400);
    const explain_es = text(q.explain_es, 400) || undefined;
    if (!stem) continue;
    if (q.type === 'mc') {
      const options = Array.isArray(q.options) ? q.options.map((o) => text(o, 200)).filter(Boolean) : [];
      const answer = Number(q.answer);
      if (options.length >= 2 && options.length <= 6 && Number.isInteger(answer) && answer >= 0 && answer < options.length)
        questions.push({ type: 'mc', q: stem, options, answer, explain_es });
    } else if (q.type === 'tf') {
      if (q.answer === 'T' || q.answer === 'F' || q.answer === 'NG') questions.push({ type: 'tf', q: stem, answer: q.answer, explain_es });
    } else if (q.type === 'gap') {
      const answer = text(q.answer, 80);
      const accept = Array.isArray(q.accept) ? q.accept.map((a) => text(a, 80)).filter(Boolean).slice(0, 6) : undefined;
      if (answer && /_{2,}/.test(stem)) questions.push({ type: 'gap', q: stem, answer, accept, explain_es });
    }
  }
  if (questions.length < 3) return null;
  const vocab = (Array.isArray(r.vocab) ? (r.vocab as unknown[]) : [])
    .filter((v): v is [unknown, unknown] => Array.isArray(v) && v.length >= 2)
    .map(([en, es]) => [text(en, 80), text(es, 120)] as [string, string])
    .filter(([en, es]) => en && es)
    .slice(0, 20);
  const covered = Number(r.covered_minutes);
  return {
    summary_es: text(r.summary_es, 1500),
    vocab,
    questions: questions.slice(0, 12),
    covered_minutes: Number.isFinite(covered) && covered > 0 ? Math.round(covered) : null,
    partial: r.partial === true,
  };
}

/** Quizzes already made for an episode (by anyone in the platform), all levels. */
export async function fetchQuizzes(key: string): Promise<PodcastQuizRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('podcast_quizzes').select('level,quiz,created_at').eq('episode_key', key);
  if (error || !Array.isArray(data)) return [];
  return data
    .map((d) => ({ level: d.level as CefrLevel, quiz: cleanQuiz(d.quiz), created_at: String(d.created_at ?? '') }))
    .filter((d): d is PodcastQuizRow => LEVELS.has(d.level) && !!d.quiz);
}

/** Asks the `podcast` Edge Function to listen to the episode and write questions (or return the stored ones). */
export async function generateQuiz(ep: PodcastEpisode, level: CefrLevel): Promise<PodcastQuiz> {
  if (!supabase) throw new PodcastError('Las preguntas con IA necesitan conexión con el servidor de la plataforma.', 'offline');
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new PodcastError('Inicia sesión para generar preguntas con IA.', 'signed_out');
  const { data, error } = await supabase.functions.invoke('podcast', {
    body: { op: 'generate', collectionId: ep.collectionId, trackId: ep.trackId, level },
  });
  if (error) {
    let message = 'No se pudo contactar al servicio de IA. Usa la guía de escucha mientras tanto.';
    let code: PodcastError['code'] = 'server';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error?.message) message = body.error.message;
      if (body?.error?.code) code = body.error.code;
    } catch {
      /* not JSON: the function is probably not deployed */
    }
    throw new PodcastError(message, code);
  }
  const quiz = cleanQuiz((data as { quiz?: unknown })?.quiz);
  if (!quiz) throw new PodcastError('La IA respondió en un formato inesperado. Inténtalo de nuevo.', 'ai');
  return quiz;
}

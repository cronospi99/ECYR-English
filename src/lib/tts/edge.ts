/**
 * Client for /api/tts (api/tts.ts): natural neural voices, chunk by chunk.
 *
 * A text is split into chunks (the first one short, so playback starts fast);
 * each chunk is signed once by the server for a signed-in user, then fetched
 * from a URL that Vercel's CDN shares with every other learner. Clips are also
 * kept in memory and in Cache Storage, so repeats are instant and offline.
 *
 * Nothing here throws at the learner: failures reject with TtsUnavailable, the
 * player falls back to the device voice, and the reason is logged once.
 */
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

const ENDPOINT = '/api/tts';
/** Server limit per chunk (MAX_TEXT in api/tts.ts). */
export const TTS_MAX_CHARS = 1000;
const TARGET = 420;
const FIRST_TARGET = 160;

export class TtsUnavailable extends Error {}

export const normalizeText = (t: string) => t.replace(/\s+/g, ' ').trim();

/** Prosody rate (%) for the app's speech rate (0.95 = normal). Steps of 5 % so clips are shared. */
export function rateFor(speechRate = 0.95): number {
  const pct = (speechRate / 0.95 - 1) * 100;
  return Math.max(-50, Math.min(50, Math.round(pct / 5) * 5));
}

// --------------------------------------------------------------- chunking --

/** Sentences grouped into chunks of ~TARGET characters; the first is short so audio starts quickly. */
export function splitForTts(raw: string): string[] {
  const text = normalizeText(raw);
  if (!text) return [];
  if (text.length <= FIRST_TARGET) return [text];
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const pieces: string[] = [];
  for (const s of sentences) {
    if (s.length <= TARGET) pieces.push(s);
    else pieces.push(...splitLong(s));
  }
  const chunks: string[] = [];
  let cur = '';
  for (const s of pieces) {
    const limit = chunks.length === 0 ? FIRST_TARGET : TARGET;
    if (cur && (cur + ' ' + s).length > limit) {
      chunks.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** A sentence too long for one chunk: cut at commas, then at spaces. */
function splitLong(s: string): string[] {
  const out: string[] = [];
  let rest = s;
  while (rest.length > TARGET) {
    const window = rest.slice(0, TARGET);
    const cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(': '));
    const at = cut > TARGET * 0.4 ? cut + 1 : window.lastIndexOf(' ') > 0 ? window.lastIndexOf(' ') : TARGET;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

// ----------------------------------------------------------- availability --

let blockedUntil = 0;
const logged = new Set<string>();
function logOnce(reason: string) {
  if (logged.has(reason)) return;
  logged.add(reason);
  console.info(`[tts] Voz del dispositivo en uso (${reason}).`);
}
function block(reason: string, ms: number) {
  blockedUntil = Math.max(blockedUntil, Date.now() + ms);
  logOnce(reason);
}

const PAUSE: Record<string, number> = {
  signed_out: 5 * 60_000,
  not_configured: 30 * 60_000,
  limit: 30 * 60_000,
  bad_signature: 60_000,
  not_found: 30 * 60_000,
};

/** Natural voices can be asked for right now: signed in, and not paused by an earlier failure. */
export function edgeAvailable(): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined' || !supabase) return false;
  if (!useAuth.getState().session) return false;
  return Date.now() >= blockedUntil;
}

/** Why natural voices are not available, for the settings screen (null when they are). */
export function edgeIssue(): string | null {
  if (!supabase) return 'Necesita conexión con el servidor.';
  if (!useAuth.getState().session) return 'Inicia sesión para usar las voces naturales.';
  return null;
}

// ---------------------------------------------------------------- caching --

const CACHE_NAME = 'ecyr-tts-v1';
const MEM_MAX = 240;
const mem = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const sigs = new Map<string, string>();
const keyOf = (text: string, voice: string, rate: number) => `${voice}|${rate}|${text}`;

function remember(key: string, url: string) {
  mem.delete(key);
  mem.set(key, url);
  while (mem.size > MEM_MAX) {
    const [oldKey, oldUrl] = mem.entries().next().value as [string, string];
    mem.delete(oldKey);
    setTimeout(() => URL.revokeObjectURL(oldUrl), 60_000);
  }
}

async function sha256Hex(s: string): Promise<string | null> {
  try {
    if (!crypto?.subtle) return null;
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}
const diskRequest = (hash: string) => new Request(`${location.origin}/__tts-cache/${hash}.mp3`);

async function fromDisk(hash: string): Promise<Blob | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const r = await (await caches.open(CACHE_NAME)).match(diskRequest(hash));
    return r ? await r.blob() : null;
  } catch {
    return null;
  }
}
async function toDisk(hash: string, blob: Blob) {
  try {
    if (typeof caches === 'undefined') return;
    await (await caches.open(CACHE_NAME)).put(diskRequest(hash), new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
  } catch {
    /* storage full or unavailable: memory still works */
  }
}

// ---------------------------------------------------------------- signing --

interface Pending {
  key: string;
  item: { t: string; v: string; r: number };
  resolve: (s: string) => void;
  reject: (e: Error) => void;
}
let queue: Pending[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function errorCode(r: Response): Promise<string> {
  if (r.status === 404) return 'not_found';
  try {
    const j = (await r.json()) as { error?: { code?: string } };
    return j?.error?.code || `http_${r.status}`;
  } catch {
    return `http_${r.status}`;
  }
}

/** Signs everything asked for in the same tick with one request. */
async function flush() {
  flushTimer = null;
  const batch = queue.splice(0, 80);
  if (queue.length) flushTimer = setTimeout(flush, 0);
  if (!batch.length) return;
  const fail = (code: string) => {
    block(code, PAUSE[code] ?? 60_000);
    batch.forEach((p) => p.reject(new TtsUnavailable(code)));
  };
  try {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    if (!token) return fail('signed_out');
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: batch.map((p) => p.item) }),
    });
    if (!r.ok) return fail(await errorCode(r));
    const { sigs: out } = (await r.json()) as { sigs?: (string | null)[] };
    batch.forEach((p, i) => {
      const s = out?.[i];
      if (s) {
        sigs.set(p.key, s);
        p.resolve(s);
      } else p.reject(new TtsUnavailable('rejected'));
    });
  } catch {
    fail('network');
  }
}

const signing = new Map<string, Promise<string>>();

function signature(key: string, item: Pending['item']): Promise<string> {
  const known = sigs.get(key);
  if (known) return Promise.resolve(known);
  const pending = signing.get(key);
  if (pending) return pending;
  const job = new Promise<string>((resolve, reject) => {
    queue.push({ key, item, resolve, reject });
    flushTimer ??= setTimeout(flush, 0);
  }).finally(() => signing.delete(key));
  signing.set(key, job);
  return job;
}

// ------------------------------------------------------------------ fetch --

/** A clip already in memory, synchronously (lets playback start inside the tap on iOS). */
export function peekTts(text: string, voice: string, rate = 0): string | null {
  return mem.get(keyOf(normalizeText(text), voice, rate)) ?? null;
}

async function download(text: string, voice: string, rate: number, key: string): Promise<Blob> {
  const s = await signature(key, { t: text, v: voice, r: rate });
  const url = `${ENDPOINT}?${new URLSearchParams({ v: voice, r: String(rate), p: '0', t: text, s })}`;
  const r = await fetch(url).catch(() => null);
  if (!r || !r.ok) {
    const code = r ? await errorCode(r) : 'network';
    block(code, PAUSE[code] ?? 60_000);
    throw new TtsUnavailable(code);
  }
  const blob = await r.blob();
  if (blob.size < 128) {
    block('empty', 60_000);
    throw new TtsUnavailable('empty');
  }
  return blob;
}

/** The audio of one chunk as a Blob: Cache Storage → /api/tts (CDN). For assembling longer recordings. */
export async function fetchTtsBlob(rawText: string, voice: string, rate = 0): Promise<Blob> {
  const text = normalizeText(rawText);
  if (!text || text.length > TTS_MAX_CHARS) throw new TtsUnavailable('too_long');
  const key = keyOf(text, voice, rate);
  const hash = await sha256Hex(key);
  const cached = hash ? await fromDisk(hash) : null;
  if (cached) return cached;
  if (!edgeAvailable()) {
    logOnce(edgeIssue() ?? 'en pausa');
    throw new TtsUnavailable('unavailable');
  }
  const blob = await download(text, voice, rate, key);
  if (hash) void toDisk(hash, blob);
  return blob;
}

/** The object URL of one chunk: memory → Cache Storage → /api/tts. */
export function fetchTts(rawText: string, voice: string, rate = 0): Promise<string> {
  const text = normalizeText(rawText);
  const key = keyOf(text, voice, rate);
  const hit = mem.get(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;
  const job = fetchTtsBlob(text, voice, rate)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      remember(key, url);
      return url;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Signs, in one request, every chunk of a text that is not in memory yet (playback then needs no more round trips to sign). */
export function presignTts(items: { text: string; voice: string; rate: number }[]): void {
  if (!edgeAvailable()) return;
  for (const it of items) {
    const text = normalizeText(it.text);
    const key = keyOf(text, it.voice, it.rate);
    if (!text || text.length > TTS_MAX_CHARS || mem.has(key) || sigs.has(key)) continue;
    signature(key, { t: text, v: it.voice, r: it.rate }).catch(() => undefined);
  }
}

/** Warms a chunk in the background (no error if it fails). */
export function prefetchTts(text: string, voice: string, rate = 0): void {
  if (!edgeAvailable() && !peekTts(text, voice, rate)) return;
  fetchTts(text, voice, rate).catch(() => undefined);
}

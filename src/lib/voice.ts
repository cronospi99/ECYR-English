/**
 * Natural voices ("Voz natural (IA)"): short texts read by Gemini TTS through
 * the class's `gemini` Edge Function (op "voice"). Each clip is recorded once
 * and shared by the whole platform from the public `voice-cache` bucket; here
 * it is also kept in memory and in Cache Storage, so a repeat is instant and
 * works offline.
 *
 * Nothing here ever throws at the learner: any failure (signed out, no class,
 * daily cap, network, old deployment) rejects, speech.ts falls back to the
 * device voice, and the reason is logged once.
 */
import { supabase } from './supabase';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';

export type PersonaId = 'emma' | 'liam' | 'olivia' | 'harry' | 'ruby' | 'jack';
export type VoiceAccent = 'us' | 'uk' | 'au';
export type VoiceGender = 'female' | 'male';

export interface Persona {
  id: PersonaId;
  name: string;
  gender: VoiceGender;
  accent: VoiceAccent;
  lang: 'en-US' | 'en-GB' | 'en-AU';
  flag: string;
  /** Short description for the picker, in Spanish. */
  blurb: string;
}

/** Mirrors PERSONAS in supabase/functions/gemini/index.ts (persona → Gemini voice + accent). */
export const PERSONAS: readonly Persona[] = [
  { id: 'emma', name: 'Emma', gender: 'female', accent: 'us', lang: 'en-US', flag: '🇺🇸', blurb: 'Estados Unidos · cálida y clara' },
  { id: 'liam', name: 'Liam', gender: 'male', accent: 'us', lang: 'en-US', flag: '🇺🇸', blurb: 'Estados Unidos · alegre' },
  { id: 'olivia', name: 'Olivia', gender: 'female', accent: 'uk', lang: 'en-GB', flag: '🇬🇧', blurb: 'Reino Unido · suave' },
  { id: 'harry', name: 'Harry', gender: 'male', accent: 'uk', lang: 'en-GB', flag: '🇬🇧', blurb: 'Reino Unido · pausado' },
  { id: 'ruby', name: 'Ruby', gender: 'female', accent: 'au', lang: 'en-AU', flag: '🇦🇺', blurb: 'Australia · juvenil' },
  { id: 'jack', name: 'Jack', gender: 'male', accent: 'au', lang: 'en-AU', flag: '🇦🇺', blurb: 'Australia · firme' },
];

const ACCENT_WORD: Record<VoiceAccent, string> = { us: 'American', uk: 'British', au: 'Australian' };
/** Must match VOICE_VERSION / VOICE_MAX_CHARS in the Edge Function. */
const VOICE_VERSION = 'v1';
export const VOICE_MAX_CHARS = 600;

export const getPersona = (id: string | null | undefined): Persona => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0]!;

export function personaFor(gender: VoiceGender, accent: VoiceAccent): Persona {
  return PERSONAS.find((p) => p.gender === gender && p.accent === accent) ?? PERSONAS.find((p) => p.accent === accent) ?? PERSONAS[0]!;
}

/** The learner's voice: the one they picked, else the one matching their accent setting. */
export function defaultPersona(): Persona {
  const s = useSettings.getState();
  if (s.voicePersona) return getPersona(s.voicePersona);
  return getPersona(s.accent === 'en-GB' ? 'olivia' : 'emma');
}

export const normalizeVoiceText = (t: string) => t.replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------- availability --

let blockedUntil = 0;
const logged = new Set<string>();
function logOnce(reason: string) {
  if (logged.has(reason)) return;
  logged.add(reason);
  console.info(`[voice] Voz del dispositivo en uso (${reason}).`);
}
function block(reason: string, ms: number) {
  blockedUntil = Math.max(blockedUntil, Date.now() + ms);
  logOnce(reason);
}

/**
 * Whether the natural voice can be asked for right now: signed in, a teacher
 * or a student in a class, and not paused by an earlier refusal.
 */
export function naturalVoiceAvailable(): boolean {
  if (!supabase || typeof Audio === 'undefined') return false;
  const { session, profile } = useAuth.getState();
  if (!session) return false;
  if (profile && profile.role !== 'teacher' && !profile.teacher_id) return false;
  return Date.now() >= blockedUntil;
}

/** Why the natural voice is not available, for the settings screen (null when it is). */
export function naturalVoiceIssue(): string | null {
  if (!supabase) return 'Necesita conexión con el servidor.';
  const { session, profile } = useAuth.getState();
  if (!session) return 'Inicia sesión para usar la voz natural.';
  if (profile && profile.role !== 'teacher' && !profile.teacher_id) return 'Únete a una clase para usar la voz natural.';
  return null;
}

// ------------------------------------------------------------------ caching --

const CACHE_NAME = 'ecyr-voice-v1';
const MEM_MAX = 160;
/** key (persona|text) → object URL of the WAV. Insertion order = age. */
const mem = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const memKey = (text: string, persona: PersonaId) => `${persona}|${text}`;

function remember(key: string, url: string) {
  mem.delete(key);
  mem.set(key, url);
  while (mem.size > MEM_MAX) {
    const [oldKey, oldUrl] = mem.entries().next().value as [string, string];
    mem.delete(oldKey);
    // Never revoke the clip that may be playing right now.
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

/** The same hash the Edge Function names the file with. */
const clipHash = (text: string, p: Persona) => sha256Hex(`${VOICE_VERSION}|${p.id}|${ACCENT_WORD[p.accent]}|${text}`);
const cacheRequest = (hash: string) => new Request(`${location.origin}/__voice-cache/${hash}.wav`);

async function fromDisk(hash: string): Promise<Blob | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const c = await caches.open(CACHE_NAME);
    const r = await c.match(cacheRequest(hash));
    return r ? await r.blob() : null;
  } catch {
    return null;
  }
}

async function toDisk(hash: string, blob: Blob) {
  try {
    if (typeof caches === 'undefined') return;
    const c = await caches.open(CACHE_NAME);
    await c.put(cacheRequest(hash), new Response(blob, { headers: { 'Content-Type': 'audio/wav' } }));
  } catch {
    /* storage full or unavailable: memory cache still works */
  }
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

// -------------------------------------------------------------------- fetch --

export class VoiceUnavailable extends Error {}

const PAUSE: Record<string, number> = {
  signed_out: 10 * 60_000,
  no_class: 10 * 60_000,
  no_profile: 10 * 60_000,
  voice_limit: 6 * 60 * 60_000,
  tts_quota: 10 * 60_000,
  no_key: 30 * 60_000,
  old_function: 30 * 60_000,
};

async function request(text: string, p: Persona, hash: string | null): Promise<Blob> {
  if (!supabase) throw new VoiceUnavailable('offline');
  const { data, error } = await supabase.functions.invoke('gemini', { body: { op: 'voice', text, persona: p.id } });
  if (error) {
    let code = 'network';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = (await ctx.json()) as { error?: { code?: string | null; message?: string } } | null;
        code = body?.error?.code || (/unknown request/i.test(body?.error?.message ?? '') ? 'old_function' : `http_${ctx.status}`);
        if (ctx.status === 404) code = 'old_function';
      }
    } catch {
      /* not JSON */
    }
    block(code, PAUSE[code] ?? (code === 'too_long' ? 0 : 60_000));
    throw new VoiceUnavailable(code);
  }
  const res = data as { url?: string | null; key?: string; audio?: string; mimeType?: string } | null;
  let blob: Blob | null = null;
  if (res?.audio) {
    blob = base64ToBlob(res.audio, res.mimeType || 'audio/wav');
  } else if (res?.url || res?.key) {
    // Built from the app's own project URL when possible (the function's
    // SUPABASE_URL is an internal address in local development).
    const url = res.key ? supabase.storage.from('voice-cache').getPublicUrl(`${res.key}.wav`).data.publicUrl : res.url!;
    const r = await fetch(url).catch(() => null);
    if (r?.ok) blob = await r.blob();
  }
  if (!blob || blob.size < 64) {
    block('audio', 60_000);
    throw new VoiceUnavailable('audio');
  }
  if (hash) void toDisk(hash, blob);
  return blob;
}

/** A clip that is already in memory, synchronously (lets playback start inside the tap on iOS). */
export function peekVoice(text: string, persona: PersonaId): string | null {
  return mem.get(memKey(normalizeVoiceText(text), persona)) ?? null;
}

/**
 * The object URL of `text` read by `persona`: memory → Cache Storage → the
 * Edge Function (which answers from the shared bucket or records it).
 */
export function fetchVoice(rawText: string, persona: PersonaId): Promise<string> {
  const text = normalizeVoiceText(rawText);
  const key = memKey(text, persona);
  const hit = mem.get(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;
  if (!text || text.length > VOICE_MAX_CHARS) return Promise.reject(new VoiceUnavailable('too_long'));

  const p = getPersona(persona);
  const job = (async () => {
    const hash = await clipHash(text, p);
    let blob = hash ? await fromDisk(hash) : null;
    if (!blob) {
      if (!naturalVoiceAvailable()) {
        logOnce(naturalVoiceIssue() ?? 'en pausa');
        throw new VoiceUnavailable('unavailable');
      }
      blob = await request(text, p, hash);
    }
    const url = URL.createObjectURL(blob);
    remember(key, url);
    return url;
  })();
  inflight.set(key, job);
  void job.catch(() => undefined).finally(() => inflight.delete(key));
  return job;
}

/** Warms the cache for a clip about to be needed (next sentence, a suggested answer). */
export function prefetchVoice(text: string, persona: PersonaId) {
  if (!text.trim() || !naturalVoiceAvailable()) return;
  void fetchVoice(text, persona).catch(() => undefined);
}

/**
 * Splits a long text into clips the function accepts, on sentence boundaries.
 * The first clip is kept short so playback starts sooner.
 */
export function splitForVoice(raw: string, max = VOICE_MAX_CHARS): string[] {
  const text = normalizeVoiceText(raw);
  if (text.length <= max) return text ? [text] : [];
  const pieces: string[] = [];
  for (const s of text.split(/(?<=[.!?…])\s+/)) {
    if (s.length <= max) {
      pieces.push(s);
      continue;
    }
    // A run-on sentence: cut at commas, then at spaces.
    let rest = s;
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf(', ', max), rest.lastIndexOf(' ', max));
      const at = cut > max / 3 ? cut + 1 : max;
      pieces.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) pieces.push(rest);
  }
  const out: string[] = [];
  for (const piece of pieces) {
    const last = out[out.length - 1];
    const limit = out.length === 1 ? 240 : max;
    if (last !== undefined && last.length + 1 + piece.length <= limit) out[out.length - 1] = `${last} ${piece}`;
    else out.push(piece);
  }
  return out;
}

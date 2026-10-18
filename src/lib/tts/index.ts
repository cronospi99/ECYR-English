/**
 * Text-to-speech for the whole app, in two tiers behind one API:
 *  - light   the device's voices (Web Speech): single words and short phrases;
 *  - premium natural neural voices from /api/tts (Edge-TTS): sentences,
 *            dialogues, feedback, readings and listening tracks of any length,
 *            split into chunks that play back to back while the next one loads.
 * "auto" picks per text; the learner can force either one in Perfil. Premium
 * falls back to the device voice by itself, mid-text if it has to. Only one
 * thing plays at a time; `stopSpeaking` stops everything.
 */
import { useSettings } from '@/store/settings';
import { edgeAvailable, fetchTts, peekTts, prefetchTts, presignTts, rateFor, splitForTts } from './edge';
import { castVoices, defaultPersonaFor, getPersona, personaFor, SPANISH_VOICE, type Persona, type PersonaId, type VoiceAccent, type VoiceGender } from './voices';
import { deviceSpeak, deviceStop, deviceUnlock, hasWebSpeech, pickVoice as pickDeviceVoice, pickVoiceFor } from './webSpeech';

export type Tier = 'auto' | 'light' | 'premium';
export { PERSONAS, getPersona, personaFor, castVoices, type Persona, type PersonaId, type VoiceAccent, type VoiceGender } from './voices';
export { diagnoseTts, edgeIssue, prefetchTts, fetchTtsBlob, splitForTts, rateFor, TtsUnavailable, type TtsDiagnosis } from './edge';

export const canSpeak = () => hasWebSpeech() || (typeof window !== 'undefined' && typeof Audio !== 'undefined');

/** Compatibility: the best device voice for an accent. */
export const pickVoice = (accent: 'en-US' | 'en-GB' | 'en-AU' = 'en-US') => pickDeviceVoice(accent);

/** The learner's own natural voice. */
export function defaultPersona(): Persona {
  const s = useSettings.getState();
  return defaultPersonaFor(s.voicePersona, s.accent);
}

/** Short bits (a word, a short vocabulary phrase) stay on the device in "auto": instant and free. */
const isShort = (t: string) => t.trim().split(/\s+/).length <= 3 && t.trim().length <= 30;

function premiumFor(text: string, tier: Tier = 'auto'): boolean {
  const engine = useSettings.getState().voiceEngine;
  if (engine === 'device' || tier === 'light' || !/\p{L}/u.test(text)) return false;
  if (!edgeAvailable()) return false;
  if (tier === 'premium' || engine === 'natural') return true;
  return !isShort(text);
}

// ------------------------------------------------------------------- state --

export type SpeechPhase = 'idle' | 'loading' | 'playing';
let state: { id: number; phase: SpeechPhase } = { id: 0, phase: 'idle' };
const listeners = new Set<() => void>();

function setPhase(id: number, phase: SpeechPhase) {
  if (id !== state.id || state.phase === phase) return;
  state = { id, phase };
  listeners.forEach((l) => l());
}
/** What is playing now: `id` is the value `speak`/`speakAs`/`speakSequence` returned. For useSyncExternalStore. */
export const getSpeechState = () => state;
export function subscribeSpeech(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

function begin(): number {
  halt();
  state = { id: state.id + 1, phase: 'idle' };
  listeners.forEach((l) => l());
  return state.id;
}
function finish(id: number, onEnd?: () => void) {
  if (id !== state.id) return;
  setPhase(id, 'idle');
  onEnd?.();
}

export function stopSpeaking(): void {
  halt();
  state = { id: state.id + 1, phase: 'idle' };
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------- playback --

type Outcome = 'ended' | 'stopped' | 'failed';
let el: HTMLAudioElement | null = null;
let unlocked = false;
let settle: ((r: Outcome) => void) | null = null;
const SILENCE = 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

function audio(): HTMLAudioElement | null {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio();
    el.preload = 'auto';
  }
  return el;
}

/** iOS only lets audio start inside a tap: play silence there so later clips (fetched after the tap) may play. */
function unlock() {
  const a = audio();
  if (!a || unlocked) return;
  unlocked = true;
  a.src = SILENCE;
  void a.play().catch((e: unknown) => {
    if ((e as { name?: string })?.name === 'NotAllowedError') unlocked = false;
  });
  deviceUnlock();
}

function halt() {
  settle?.('stopped');
  settle = null;
  if (el && !el.paused) el.pause();
  deviceStop();
}

function playUrl(id: number, url: string): Promise<Outcome> {
  const a = audio();
  if (!a || id !== state.id) return Promise.resolve('stopped');
  return new Promise((resolve) => {
    const done = (r: Outcome) => {
      if (settle !== done) return;
      settle = null;
      a.onended = a.onerror = null;
      resolve(r);
    };
    settle = done;
    a.onended = () => done('ended');
    a.onerror = () => done('failed');
    a.src = url;
    // The speed is already in the recording (prosody rate): play it as is.
    a.defaultPlaybackRate = 1;
    a.playbackRate = 1;
    a.play().then(
      () => setPhase(id, 'playing'),
      (e: unknown) => done((e as { name?: string })?.name === 'AbortError' ? 'stopped' : 'failed'),
    );
  });
}

function playDevice(id: number, text: string, seg: Segment, rate: number): Promise<Outcome> {
  if (id !== state.id) return Promise.resolve('stopped');
  return new Promise((resolve) => {
    let stop = () => undefined as void;
    const done = (r: Outcome) => {
      if (settle !== done) return;
      settle = null;
      if (r === 'stopped') stop();
      resolve(r);
    };
    settle = done;
    const d = seg.device();
    setPhase(id, 'playing');
    stop = deviceSpeak(text, { lang: d.lang, voice: d.voice, pitch: d.pitch, rate, onEnd: () => done('ended') });
  });
}

/** A piece of what to say: a chunk of text, the natural voice for it (or none), and how to say it on the device. */
interface Segment {
  text: string;
  edge: string | null;
  /** Index of the dialogue line it belongs to (for highlighting). */
  line: number;
  device: () => { lang: string; voice?: SpeechSynthesisVoice; pitch?: number };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Plays segments in order. Natural clips are fetched one ahead of playback;
 * if the natural voice fails, the rest continues on the device voice.
 */
async function playSegments(id: number, segs: Segment[], rate: number, o: { onLine?: (i: number) => void; onEnd?: () => void; gapMs?: number } = {}) {
  const r = rateFor(rate);
  let natural = segs.some((s) => s.edge);
  // Inside the tap (before any await): unlock audio on iOS if the first clip must be fetched.
  if (natural && segs[0]?.edge && !peekTts(segs[0].text, segs[0].edge, r)) unlock();
  if (natural) presignTts(segs.flatMap((s) => (s.edge ? [{ text: s.text, voice: s.edge, rate: r }] : [])));
  let line = -1;
  for (let i = 0; i < segs.length; i++) {
    if (id !== state.id) return;
    const seg = segs[i]!;
    if (seg.line !== line) {
      if (line >= 0 && o.gapMs) await wait(o.gapMs);
      if (id !== state.id) return;
      line = seg.line;
      o.onLine?.(line);
    }
    let outcome: Outcome = 'failed';
    if (natural && seg.edge) {
      let url = peekTts(seg.text, seg.edge, r);
      if (!url) {
        if (state.phase !== 'playing') setPhase(id, 'loading');
        url = await fetchTts(seg.text, seg.edge, r).catch(() => null);
      }
      const next = segs[i + 1];
      if (url && next?.edge) prefetchTts(next.text, next.edge, r);
      if (url) outcome = await playUrl(id, url);
      if (outcome === 'stopped') return;
      if (outcome === 'failed') natural = false;
    }
    if (outcome !== 'ended') {
      if ((await playDevice(id, seg.text, seg, rate)) === 'stopped') return;
    }
  }
  finish(id, o.onEnd);
}

// --------------------------------------------------------------------- API --

export interface SpeakOptions {
  rate?: number;
  accent?: 'en-US' | 'en-GB';
  /** Force one natural voice (otherwise the learner's own). */
  persona?: PersonaId;
  tier?: Tier;
  /** Fires once when playback finishes on its own (not when stopped or replaced). */
  onEnd?: () => void;
}

/** The natural voice for a plain `speak`: the learner's own, unless the caller asks for the other accent. */
function personaForSpeak(opts: SpeakOptions): Persona {
  if (opts.persona) return getPersona(opts.persona);
  const def = defaultPersona();
  const s = useSettings.getState();
  if (!opts.accent || opts.accent === def.lang || opts.accent === s.accent) return def;
  // Callers that alternate en-US / en-GB to tell two people apart: that accent, the other gender.
  return personaFor(def.gender === 'female' ? 'male' : 'female', opts.accent === 'en-GB' ? 'uk' : 'us');
}

function segmentsOf(text: string, edge: string | null, line: number, device: Segment['device']): Segment[] {
  if (!edge) return [{ text, edge: null, line, device }];
  return splitForTts(text).map((t) => ({ text: t, edge, line, device }));
}

/** Reads `text` aloud. Returns an id to compare with `getSpeechState().id`. */
export function speak(text: string, opts: SpeakOptions = {}): number {
  const id = begin();
  const rate = opts.rate ?? useSettings.getState().speechRate ?? 0.95;
  const p = personaForSpeak(opts);
  const lang = opts.accent ?? p.lang;
  const device = () => ({ lang, voice: pickDeviceVoice(lang) });
  void playSegments(id, segmentsOf(text, premiumFor(text, opts.tier) ? p.edge : null, 0, device), rate, { onEnd: opts.onEnd });
  return id;
}

export interface Speaker {
  voice: VoiceGender;
  accent: VoiceAccent | 'us' | 'uk' | 'au';
  /** A character's name: picks a distinct, stable voice for them. */
  name?: string;
  /** Force a natural voice. */
  persona?: PersonaId;
}

function speakerDevice(who: Speaker) {
  const lang = { us: 'en-US', uk: 'en-GB', au: 'en-AU', ie: 'en-IE' }[who.accent] ?? 'en-US';
  return () => ({ lang, ...pickVoiceFor(who.voice, lang) });
}

/** One character's line, in a voice that matches their gender and accent. */
export function speakAs(text: string, who: Speaker, opts: { rate?: number; tier?: Tier; onEnd?: () => void } = {}): number {
  const id = begin();
  const rate = opts.rate ?? useSettings.getState().speechRate ?? 0.95;
  const p = who.persona ? getPersona(who.persona) : personaFor(who.voice, who.accent as VoiceAccent, who.name);
  void playSegments(id, segmentsOf(text, premiumFor(text, opts.tier) ? p.edge : null, 0, speakerDevice(who)), rate, { onEnd: opts.onEnd });
  return id;
}

export interface SequenceLine {
  text: string;
  /** Who says it; lines without a speaker use the learner's voice. */
  speaker?: Speaker & { name: string };
}

/**
 * A whole dialogue or listening track: each character keeps a distinct voice,
 * the next line loads while the current one plays, and `onLine` tells which
 * line is being heard (for highlighting).
 */
export function speakSequence(lines: SequenceLine[], opts: { rate?: number; tier?: Tier; gapMs?: number; onLine?: (i: number) => void; onEnd?: () => void } = {}): number {
  const id = begin();
  const rate = opts.rate ?? useSettings.getState().speechRate ?? 0.95;
  const all = lines.map((l) => l.text).join(' ');
  const premium = premiumFor(all, opts.tier ?? 'premium');
  const cast = castVoices(lines.flatMap((l) => (l.speaker ? [{ name: l.speaker.name, voice: l.speaker.voice, accent: l.speaker.accent }] : [])));
  const def = defaultPersona();
  const segs = lines.flatMap((l, i) => {
    const p = l.speaker ? (l.speaker.persona ? getPersona(l.speaker.persona) : cast.get(l.speaker.name)!) : def;
    const device = l.speaker ? speakerDevice(l.speaker) : () => ({ lang: def.lang, voice: pickDeviceVoice(def.lang) });
    return segmentsOf(l.text, premium ? p.edge : null, i, device);
  });
  void playSegments(id, segs, rate, { onLine: opts.onLine, onEnd: opts.onEnd, gapMs: opts.gapMs ?? 220 });
  return id;
}

/** Spanish (tips, instructions) in a Colombian voice. */
export function speakSpanish(text: string, opts: { rate?: number; gender?: VoiceGender; tier?: Tier; onEnd?: () => void } = {}): number {
  const id = begin();
  const rate = opts.rate ?? 1;
  const device = () => ({ lang: 'es-CO', voice: pickDeviceVoice('es-CO') });
  void playSegments(id, segmentsOf(text, premiumFor(text, opts.tier) ? SPANISH_VOICE[opts.gender ?? 'female'] : null, 0, device), rate, { onEnd: opts.onEnd });
  return id;
}

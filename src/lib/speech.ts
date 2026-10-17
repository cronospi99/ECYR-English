/**
 * Text-to-speech for the whole app. Two engines behind one API:
 *  - "Voz natural (IA)": Gemini voices through lib/voice (cached clips played
 *    with an <audio> element), when the setting is on and the learner may use it;
 *  - the device's voices (Web Speech API), as the setting or as an instant,
 *    silent fallback whenever a natural clip cannot be had.
 * Only one thing plays at a time; `stopSpeaking` stops both.
 */
import { useSettings } from '@/store/settings';
import {
  defaultPersona,
  fetchVoice,
  naturalVoiceAvailable,
  peekVoice,
  personaFor,
  prefetchVoice,
  splitForVoice,
  getPersona,
  type Persona,
  type PersonaId,
} from './voice';

let cachedVoices: SpeechSynthesisVoice[] = [];

function voices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

const hasSynth = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const canSpeak = () => hasSynth() || (typeof window !== 'undefined' && typeof Audio !== 'undefined' && useSettings.getState().voiceEngine === 'natural');

const langOf = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-');
/** Voices that sound like a person rather than a robot, on every platform. */
const QUALITY = /natural|neural|online|enhanced|premium|siri|google/i;
const POOR = /compact|eloquence|espeak|robot|novelty|bad news|bells|bubbles|cellos|whisper|zarvox|trinoids|albert|jester|organ/i;
const PREFERRED = ['Samantha', 'Ava', 'Daniel', 'Karen', 'Google US English', 'Google UK English Female'];

function quality(v: SpeechSynthesisVoice) {
  return (QUALITY.test(v.name) ? 4 : 0) + (PREFERRED.some((p) => v.name.includes(p)) ? 2 : 0) - (POOR.test(v.name) ? 6 : 0);
}
const byQuality = (list: SpeechSynthesisVoice[]) => [...list].sort((a, b) => quality(b) - quality(a));

export function pickVoice(accent: 'en-US' | 'en-GB' | 'en-AU' = 'en-US') {
  const list = voices().filter((v) => langOf(v).startsWith('en'));
  const same = byQuality(list.filter((v) => langOf(v) === accent));
  return same[0] ?? byQuality(list)[0];
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
/** What is playing now: `id` is the value `speak`/`speakAs` returned. For useSyncExternalStore. */
export const getSpeechState = () => state;
export function subscribeSpeech(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** Starts a new utterance, silencing whatever was playing. */
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

// ---------------------------------------------------------------- playback --

let el: HTMLAudioElement | null = null;
let unlocked = false;
let settle: ((r: 'ended' | 'stopped' | 'failed') => void) | null = null;
const SILENCE = 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

function audio(): HTMLAudioElement | null {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio();
    el.preload = 'auto';
  }
  return el;
}

/**
 * iOS only lets an <audio> (and speech synthesis) start after a tap. A clip
 * that has to be fetched first starts outside the tap, so play silence — and
 * an empty utterance, for the fallback — inside it to unlock both for later.
 */
function unlock() {
  const a = audio();
  if (!a || unlocked) return;
  unlocked = true;
  a.src = SILENCE;
  void a.play().catch((e: unknown) => {
    if ((e as { name?: string })?.name === 'NotAllowedError') unlocked = false;
  });
  if (hasSynth()) {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

function halt() {
  settle?.('stopped');
  settle = null;
  if (el && !el.paused) el.pause();
  if (hasSynth()) window.speechSynthesis.cancel();
}

function playUrl(id: number, url: string, rate: number): Promise<'ended' | 'stopped' | 'failed'> {
  const a = audio();
  if (!a || id !== state.id) return Promise.resolve('stopped');
  return new Promise((resolve) => {
    const done = (r: 'ended' | 'stopped' | 'failed') => {
      if (settle !== done) return;
      settle = null;
      a.onended = a.onerror = null;
      resolve(r);
    };
    settle = done;
    a.onended = () => done('ended');
    a.onerror = () => done('failed');
    a.src = url;
    // Loading a source resets playbackRate to the default, so set both.
    const r = Math.min(2, Math.max(0.5, rate / 0.95));
    a.defaultPlaybackRate = r;
    a.playbackRate = r;
    a.preservesPitch = true;
    (a as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
    a.play().then(
      () => setPhase(id, 'playing'),
      (e: unknown) => done((e as { name?: string })?.name === 'AbortError' ? 'stopped' : 'failed'),
    );
  });
}

type Device = (text: string, id: number, onEnd?: () => void) => void;

/** Plays the clips of `text` one after another, fetching the next while one plays. */
async function playNatural(id: number, text: string, p: Persona, rate: number, device: Device, onEnd?: () => void) {
  const chunks = splitForVoice(text);
  for (let i = 0; i < chunks.length; i++) {
    if (id !== state.id) return;
    let url = peekVoice(chunks[i]!, p.id);
    if (!url) {
      if (i === 0) unlock();
      setPhase(id, 'loading');
      try {
        url = await fetchVoice(chunks[i]!, p.id);
      } catch {
        if (id === state.id) device(chunks.slice(i).join(' '), id, onEnd);
        return;
      }
    }
    if (chunks[i + 1]) prefetchVoice(chunks[i + 1]!, p.id);
    const r = await playUrl(id, url, rate);
    if (r === 'stopped') return;
    if (r === 'failed') {
      if (id === state.id) device(chunks.slice(i).join(' '), id, onEnd);
      return;
    }
  }
  finish(id, onEnd);
}

/** Long readings stay on the device voice: dozens of clips would spend the day's quota on one text. */
const NATURAL_MAX_TOTAL = 2400;

function useNatural(text: string) {
  return (
    useSettings.getState().voiceEngine === 'natural' &&
    /\p{L}/u.test(text) &&
    text.length <= NATURAL_MAX_TOTAL &&
    naturalVoiceAvailable()
  );
}

/** Runs one utterance on the device's voices, tied to the speak id. */
function utter(id: number, text: string, setup: (u: SpeechSynthesisUtterance) => void, rate: number, onEnd?: () => void) {
  if (!hasSynth()) return finish(id, onEnd);
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  setup(u);
  u.rate = rate;
  u.onend = () => finish(id, onEnd);
  u.onerror = () => finish(id, onEnd);
  setPhase(id, 'playing');
  synth.speak(u);
}

// --------------------------------------------------------------------- API --

export interface SpeakOptions {
  rate?: number;
  accent?: 'en-US' | 'en-GB';
  /** Force one natural voice (otherwise the learner's own). */
  persona?: PersonaId;
  /** Fires once when playback finishes on its own (not when stopped or replaced). */
  onEnd?: () => void;
}

/** The natural voice for a plain `speak`: the learner's own, unless the caller asks for the other accent. */
function personaForSpeak(opts: SpeakOptions): Persona {
  if (opts.persona) return getPersona(opts.persona);
  const def = defaultPersona();
  const s = useSettings.getState();
  if (!opts.accent || opts.accent === def.lang || opts.accent === s.accent) return def;
  // Dialogues alternate en-US / en-GB to tell two people apart: that accent, the other gender.
  return personaFor(def.gender === 'female' ? 'male' : 'female', opts.accent === 'en-GB' ? 'uk' : 'us');
}

/** Reads `text` aloud. Returns an id to compare with `getSpeechState().id`. */
export function speak(text: string, opts: SpeakOptions = {}): number {
  const id = begin();
  const rate = opts.rate ?? 0.95;
  const device: Device = (t, i, onEnd) =>
    utter(
      i,
      t,
      (u) => {
        const v = pickVoice(opts.accent);
        if (v) u.voice = v;
        u.lang = v?.lang ?? opts.accent ?? 'en-US';
      },
      rate,
      onEnd,
    );
  if (useNatural(text)) {
    void playNatural(id, text, personaForSpeak(opts), rate, device, opts.onEnd);
  } else device(text, id, opts.onEnd);
  return id;
}

export function stopSpeaking(): void {
  halt();
  state = { id: state.id + 1, phase: 'idle' };
  listeners.forEach((l) => l());
}

// --------------------------------------------------- speech recognition ----

type RecognitionAlternative = { transcript: string; confidence: number };
type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous?: boolean;
  start(): void;
  stop(): void;
  abort?(): void;
  onresult:
    | ((e: { resultIndex?: number; results: ArrayLike<ArrayLike<RecognitionAlternative> & { isFinal?: boolean }> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
};

export function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ----------------------------------------------------- cast of speakers ----

const FEMALE = /samantha|ava|allison|susan|victoria|karen|moira|tessa|fiona|serena|kate|female|zira|hazel|catherine|libby|sonia|natasha|aria|jenny|emma|olivia|google uk english female|google us english/i;
const MALE = /daniel|alex|fred|tom|oliver|arthur|gordon|lee|male|david|mark|george|ryan|guy|christopher|eric|william|james|google uk english male/i;
const LANG = { us: 'en-US', uk: 'en-GB', au: 'en-AU' } as const;

/** A voice for one character: their accent first, then their gender; pitch tells them apart when the device has a single voice. */
export function speakAs(
  text: string,
  who: { voice: 'male' | 'female'; accent: 'us' | 'uk' | 'au' },
  opts: { rate?: number; onEnd?: () => void } = {},
): number {
  const id = begin();
  const rate = opts.rate ?? 0.95;
  const device: Device = (t, i, onEnd) => {
    const all = voices().filter((v) => langOf(v).startsWith('en'));
    const lang = LANG[who.accent];
    const sameLang = all.filter((v) => langOf(v) === lang);
    const pool = byQuality(sameLang.length ? sameLang : all);
    const gender = who.voice === 'female' ? FEMALE : MALE;
    const other = who.voice === 'female' ? MALE : FEMALE;
    const v = pool.find((x) => gender.test(x.name) && !other.test(x.name.replace(gender, ''))) ?? pool.find((x) => !other.test(x.name)) ?? pool[0];
    utter(
      i,
      t,
      (u) => {
        if (v) u.voice = v;
        u.lang = v?.lang ?? lang;
        // Without a matching voice, nudge the pitch so two speakers still sound different.
        const matched = v ? gender.test(v.name) : false;
        u.pitch = matched ? 1 : who.voice === 'female' ? 1.15 : 0.8;
      },
      rate,
      onEnd,
    );
  };
  if (useNatural(text)) {
    void playNatural(id, text, personaFor(who.voice, who.accent), rate, device, opts.onEnd);
  } else device(text, id, opts.onEnd);
  return id;
}

/** Spanish on the device's voice (tips, instructions). Shares the one-at-a-time rule. */
export function speakSpanish(text: string, opts: { rate?: number; onEnd?: () => void } = {}): number {
  const id = begin();
  utter(
    id,
    text,
    (u) => {
      const es = voices().filter((v) => langOf(v).toLowerCase().startsWith('es'));
      const v = byQuality(es.filter((x) => /CO|MX|US|419/.test(x.lang)))[0] ?? byQuality(es)[0];
      if (v) u.voice = v;
      u.lang = v?.lang ?? 'es-CO';
    },
    opts.rate ?? 1,
    opts.onEnd,
  );
  return id;
}

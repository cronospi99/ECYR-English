/**
 * The light tier: the device's own voices (Web Speech API). Instant and free,
 * used for single words and short phrases, and as the fallback whenever a
 * natural voice cannot be had. Prefers voices that sound like a person
 * ("Natural", "Neural", "Online", Siri, Google…).
 */
import type { VoiceGender } from './voices';

let cachedVoices: SpeechSynthesisVoice[] = [];

export const hasWebSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function voices(): SpeechSynthesisVoice[] {
  if (!hasWebSpeech()) return [];
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (hasWebSpeech()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

const langOf = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-');
const QUALITY = /natural|neural|online|enhanced|premium|siri|google/i;
const POOR = /compact|eloquence|espeak|robot|novelty|bad news|bells|bubbles|cellos|whisper|zarvox|trinoids|albert|jester|organ/i;
const PREFERRED = ['Samantha', 'Ava', 'Daniel', 'Karen', 'Google US English', 'Google UK English Female'];
const FEMALE = /samantha|ava|allison|susan|victoria|karen|moira|tessa|fiona|serena|kate|female|zira|hazel|catherine|libby|sonia|natasha|aria|jenny|emma|olivia|michelle|emily|google uk english female|google us english/i;
const MALE = /daniel|alex|fred|tom|oliver|arthur|gordon|lee|male|david|mark|george|ryan|guy|christopher|eric|william|james|andrew|brian|connor|google uk english male/i;

function quality(v: SpeechSynthesisVoice) {
  return (QUALITY.test(v.name) ? 4 : 0) + (PREFERRED.some((p) => v.name.includes(p)) ? 2 : 0) - (POOR.test(v.name) ? 6 : 0);
}
const byQuality = (list: SpeechSynthesisVoice[]) => [...list].sort((a, b) => quality(b) - quality(a));

/** The best installed voice for a language ("en-US", "en-GB", "es-CO"…). */
export function pickVoice(lang = 'en-US'): SpeechSynthesisVoice | undefined {
  const base = lang.slice(0, 2).toLowerCase();
  const list = voices().filter((v) => langOf(v).toLowerCase().startsWith(base));
  const same = byQuality(list.filter((v) => langOf(v) === lang));
  return same[0] ?? byQuality(list)[0];
}

/** A device voice for a character: their language first, then their gender. `pitch` keeps two speakers apart on one-voice devices. */
export function pickVoiceFor(gender: VoiceGender, lang: string): { voice?: SpeechSynthesisVoice; pitch: number } {
  const base = lang.slice(0, 2).toLowerCase();
  const all = voices().filter((v) => langOf(v).toLowerCase().startsWith(base));
  const same = all.filter((v) => langOf(v) === lang);
  const pool = byQuality(same.length ? same : all);
  const g = gender === 'female' ? FEMALE : MALE;
  const other = gender === 'female' ? MALE : FEMALE;
  const voice = pool.find((x) => g.test(x.name) && !other.test(x.name.replace(g, ''))) ?? pool.find((x) => !other.test(x.name)) ?? pool[0];
  const matched = voice ? g.test(voice.name) : false;
  return { voice, pitch: matched ? 1 : gender === 'female' ? 1.15 : 0.8 };
}

export interface DeviceSpeech {
  lang: string;
  voice?: SpeechSynthesisVoice;
  pitch?: number;
  rate: number;
  onEnd: () => void;
}

/**
 * Reads `text` on the device. Long texts go sentence by sentence: some browsers
 * cut a single utterance off after ~15 seconds. Returns a stop function.
 */
export function deviceSpeak(text: string, o: DeviceSpeech): () => void {
  if (!hasWebSpeech()) {
    o.onEnd();
    return () => undefined;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const parts = text.length > 220 ? (text.match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [text]) : [text];
  let stopped = false;
  let i = 0;
  const next = () => {
    if (stopped) return;
    if (i >= parts.length) return o.onEnd();
    const u = new SpeechSynthesisUtterance(parts[i++]!);
    if (o.voice) u.voice = o.voice;
    u.lang = o.voice?.lang ?? o.lang;
    u.rate = o.rate;
    u.pitch = o.pitch ?? 1;
    u.onend = next;
    u.onerror = next;
    synth.speak(u);
  };
  next();
  return () => {
    stopped = true;
    synth.cancel();
  };
}

export function deviceStop() {
  if (hasWebSpeech()) window.speechSynthesis.cancel();
}

/** iOS needs a speech call inside a tap before it lets later ones play. */
export function deviceUnlock() {
  if (!hasWebSpeech()) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

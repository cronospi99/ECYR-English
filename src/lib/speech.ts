/** Text-to-speech with the device's voices (Web Speech API). */
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

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function pickVoice(accent: 'en-US' | 'en-GB' = 'en-US') {
  const list = voices().filter((v) => v.lang.replace('_', '-').startsWith('en'));
  const preferred = ['Samantha', 'Ava', 'Daniel', 'Karen', 'Google US English', 'Google UK English Female'];
  return (
    list.find((v) => v.lang.replace('_', '-') === accent && preferred.some((p) => v.name.includes(p))) ??
    list.find((v) => v.lang.replace('_', '-') === accent) ??
    list[0]
  );
}

export function speak(text: string, opts: { rate?: number; accent?: 'en-US' | 'en-GB'; onEnd?: () => void } = {}) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(opts.accent);
  if (v) u.voice = v;
  u.lang = v?.lang ?? opts.accent ?? 'en-US';
  u.rate = opts.rate ?? 0.95;
  if (opts.onEnd) u.onend = opts.onEnd;
  synth.speak(u);
}

export const stopSpeaking = () => canSpeak() && window.speechSynthesis.cancel();

// --------------------------------------------------- speech recognition ----

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous?: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
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
) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const all = voices().filter((v) => v.lang.replace('_', '-').startsWith('en'));
  const lang = LANG[who.accent];
  const sameLang = all.filter((v) => v.lang.replace('_', '-') === lang);
  const pool = sameLang.length ? sameLang : all;
  const gender = who.voice === 'female' ? FEMALE : MALE;
  const other = who.voice === 'female' ? MALE : FEMALE;
  const v = pool.find((x) => gender.test(x.name) && !other.test(x.name.replace(gender, ''))) ?? pool.find((x) => !other.test(x.name)) ?? pool[0];
  const u = new SpeechSynthesisUtterance(text);
  if (v) u.voice = v;
  u.lang = v?.lang ?? lang;
  u.rate = opts.rate ?? 0.95;
  // Without a matching voice, nudge the pitch so two speakers still sound different.
  const matched = v ? gender.test(v.name) : false;
  u.pitch = matched ? 1 : who.voice === 'female' ? 1.15 : 0.8;
  if (opts.onEnd) u.onend = opts.onEnd;
  synth.speak(u);
}

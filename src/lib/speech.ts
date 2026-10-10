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
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

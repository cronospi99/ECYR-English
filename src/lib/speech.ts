/**
 * Speech for the whole app. Text-to-speech lives in ./tts (device voices for
 * short bits, natural neural voices from /api/tts for everything else); this
 * module re-exports it and adds speech recognition, so existing imports keep working.
 */
export * from './tts';

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

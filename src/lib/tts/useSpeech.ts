import { useRef, useSyncExternalStore } from 'react';
import { getSpeechState, speak, speakAs, speakSequence, stopSpeaking, subscribeSpeech, type SpeechPhase } from './index';

/**
 * Speech tied to one component: `phase` is that component's own playback
 * ('idle' while something else plays), so buttons can show loading / playing.
 */
export function useSpeech() {
  const mine = useRef(-1);
  const now = useSyncExternalStore(subscribeSpeech, getSpeechState);
  const phase: SpeechPhase = now.id === mine.current ? now.phase : 'idle';
  return {
    phase,
    speak: (...a: Parameters<typeof speak>) => (mine.current = speak(...a)),
    speakAs: (...a: Parameters<typeof speakAs>) => (mine.current = speakAs(...a)),
    speakSequence: (...a: Parameters<typeof speakSequence>) => (mine.current = speakSequence(...a)),
    stop: stopSpeaking,
  };
}

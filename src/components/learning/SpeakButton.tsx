import { Volume2 } from 'lucide-react';
import { useRef, useSyncExternalStore } from 'react';
import { canSpeak, getSpeechState, speak, stopSpeaking, subscribeSpeech } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { Spinner } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';

export function SpeakButton({ text, className, size = 18 }: { text: string; className?: string; size?: number }) {
  const { accent, speechRate } = useSettings();
  const mine = useRef(-1);
  const now = useSyncExternalStore(subscribeSpeech, getSpeechState);
  const phase = now.id === mine.current ? now.phase : 'idle';
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      aria-label={phase === 'idle' ? `Escuchar: ${text}` : 'Detener'}
      aria-busy={phase === 'loading'}
      onClick={(e) => {
        e.stopPropagation();
        if (phase !== 'idle') {
          stopSpeaking();
          return;
        }
        mine.current = speak(text, { accent, rate: speechRate });
      }}
      className={cn(
        'text-ink-blue inline-flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--blue)_12%,transparent)]',
        phase !== 'idle' && 'bg-[color-mix(in_srgb,var(--blue)_15%,transparent)]',
        className,
      )}
    >
      {phase === 'loading' ? (
        <span className="inline-flex" style={{ width: size, height: size }}>
          <Spinner className="h-full w-full" />
        </span>
      ) : (
        <Volume2 size={size} className={cn(phase === 'playing' && 'animate-pulse')} />
      )}
    </button>
  );
}

import { Volume2 } from 'lucide-react';
import { useState } from 'react';
import { canSpeak, speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';

export function SpeakButton({ text, className, size = 18 }: { text: string; className?: string; size?: number }) {
  const { accent, speechRate } = useSettings();
  const [on, setOn] = useState(false);
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      aria-label={`Escuchar: ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        setOn(true);
        speak(text, { accent, rate: speechRate, onEnd: () => setOn(false) });
        setTimeout(() => setOn(false), Math.max(1500, text.length * 90));
      }}
      className={cn(
        'text-ios-blue inline-flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--blue)_12%,transparent)]',
        on && 'bg-[color-mix(in_srgb,var(--blue)_15%,transparent)]',
        className,
      )}
    >
      <Volume2 size={size} className={cn(on && 'animate-pulse')} />
    </button>
  );
}

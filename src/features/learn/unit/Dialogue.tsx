import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import type { KeySpec } from './formula';
import { Hl } from './ui';

/** Two-speaker chat with "listen to all" (alternating accents). */
export function Dialogue({ lines, spec, bare = false }: { lines: { sp: string; line: string }[]; spec?: KeySpec; bare?: boolean }) {
  const { speechRate } = useSettings();
  const [playing, setPlaying] = useState<number | null>(null);
  const playAll = (k = 0) => {
    if (k >= lines.length) return setPlaying(null);
    setPlaying(k);
    // alternate accents so the two speakers sound different
    speak(lines[k]!.line, { accent: k % 2 ? 'en-GB' : 'en-US', rate: speechRate, onEnd: () => playAll(k + 1) });
  };
  return (
    <div className={bare ? undefined : 'mt-5'}>
      <div className="mb-2 flex items-center justify-between">
        {!bare ? <div className="text-label-2 text-[12px] font-semibold tracking-wide uppercase">Diálogo</div> : <span />}
        <Button size="sm" variant="tinted" onClick={() => playAll()}>
          <Volume2 size={14} /> Escuchar
        </Button>
      </div>
      <div className="space-y-2">
        {lines.map((l, k) => (
          <div key={k} className={cn('flex items-end gap-2', k % 2 ? 'flex-row-reverse' : 'flex-row')}>
            <span
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                k % 2 ? 'bg-ios-blue text-white' : 'bg-fill text-label',
              )}
              aria-hidden
            >
              {l.sp.slice(0, 1)}
            </span>
            <div
              className={cn(
                'max-w-[80%] rounded-[18px] px-4 py-2.5 text-[15px] transition-shadow',
                k % 2 ? 'bg-ios-blue rounded-br-[6px] text-white' : 'bg-fill rounded-bl-[6px]',
                playing === k && 'ring-ios-orange ring-2',
              )}
            >
              <span className="sr-only">{l.sp}: </span>
              {k % 2 ? l.line : <Hl text={l.line} spec={spec} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

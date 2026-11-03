/* EN | ES switch shared by every game (one choice for all of them). */
import { cn } from '@/lib/cn';
import { setGameLang, useGameLang } from '@/lib/gameLang';

export function GameLangToggle({ className, dark = true }: { className?: string; dark?: boolean }) {
  const lang = useGameLang();
  return (
    <div role="group" aria-label={lang === 'en' ? 'Language' : 'Idioma'} className={cn('pointer-events-auto inline-flex h-11 shrink-0 items-center rounded-2xl p-1 text-[13px] font-black', dark ? 'bg-[#10204a]/60 text-white' : 'bg-black/8 text-[#10204a]', className)}>
      {(['en', 'es'] as const).map((l) => (
        <button key={l} type="button" onClick={() => setGameLang(l)} aria-pressed={lang === l}
          className={cn('h-9 rounded-xl px-2.5 transition-colors', lang === l ? (dark ? 'bg-white text-[#10204a]' : 'bg-[#10204a] text-white') : 'opacity-70 hover:opacity-100')}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

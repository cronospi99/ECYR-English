import { useState } from 'react';
import { ExternalLink, Gamepad2, Play } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Games by Games to Learn English (gamestolearnenglish.com), embedded with
 * the code the site offers teachers for free use. The iframe loads only when
 * the learner presses play, so lessons stay light.
 */
export type GtleSlug = 'jobs' | 'questions' | 'daily-routines' | 'prepositions-game' | 'comparatives' | 'clothes-game' | 'weather';

export const GTLE_GAMES: Record<GtleSlug, { title: string; es: string; emoji: string }> = {
  jobs: { title: 'Jobs', es: 'Profesiones y lugares de trabajo', emoji: '👩‍🚒' },
  questions: { title: 'Questions', es: 'Preguntas con wh- y orden de palabras', emoji: '❓' },
  'daily-routines': { title: 'Daily Routines', es: 'Rutinas diarias', emoji: '⏰' },
  'prepositions-game': { title: 'Prepositions', es: 'Preposiciones de lugar', emoji: '📦' },
  comparatives: { title: 'Comparatives', es: 'Comparativos', emoji: '⚖️' },
  'clothes-game': { title: 'Clothes', es: 'La ropa', emoji: '👕' },
  weather: { title: 'Weather', es: 'El clima', emoji: '⛅' },
};

export const GTLE_HOME = 'https://www.gamestolearnenglish.com';

export function GtleCredit({ className }: { className?: string }) {
  return (
    <p className={className ?? 'text-label-2 text-[12.5px]'}>
      Juego de{' '}
      <a href={GTLE_HOME} target="_blank" rel="noopener noreferrer" className="text-ink-blue font-semibold underline-offset-2 hover:underline">
        Games to Learn English
      </a>{' '}
      (gamestolearnenglish.com), incluido con el código de inserción que el sitio ofrece gratis a docentes. Todos los derechos y el crédito son de sus
      autores.
    </p>
  );
}

export function GtleGame({ slug, autoStart = false }: { slug: GtleSlug; autoStart?: boolean }) {
  const [on, setOn] = useState(autoStart);
  const g = GTLE_GAMES[slug];
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="bg-fill-2 flex h-11 w-11 items-center justify-center rounded-[13px] text-[22px]">{g.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-headline flex items-center gap-1.5">
            <Gamepad2 size={16} className="text-ink-green" /> Juego: {g.title}
          </div>
          <div className="text-label-2 text-[13px]">{g.es} · Games to Learn English</div>
        </div>
        {!on ? (
          <Button size="sm" onClick={() => setOn(true)}>
            <Play size={15} /> Jugar aquí
          </Button>
        ) : (
          <a href={`${GTLE_HOME}/${slug}/`} target="_blank" rel="noopener noreferrer" className="text-ink-blue inline-flex items-center gap-1 text-[14px] font-semibold">
            Pantalla completa <ExternalLink size={14} />
          </a>
        )}
      </div>
      {on && (
        <div className="mx-auto w-full max-w-[1040px] px-2">
          <iframe
            title={`${g.title} — Games to Learn English`}
            src={`${GTLE_HOME}/${slug}/embed.html`}
            className="block w-full border-0"
            style={{ height: 'min(715px, 85vh)', overflow: 'hidden' }}
            scrolling="no"
            loading="lazy"
            allow="autoplay"
          />
        </div>
      )}
      <GtleCredit className="text-label-2 px-4 pt-2 pb-4 text-[12px]" />
    </Card>
  );
}

/** All the Games to Learn English games, one open at a time (Juegos page). */
export function GtleGallery() {
  const [open, setOpen] = useState<GtleSlug | null>(null);
  const slugs = Object.keys(GTLE_GAMES) as GtleSlug[];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {slugs.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setOpen((o) => (o === s ? null : s))}
            className={`bg-card shadow-card rounded-[16px] p-3 text-left transition-transform active:scale-[0.98] ${open === s ? 'ring-ios-blue ring-2' : ''}`}
          >
            <div className="text-[28px]">{GTLE_GAMES[s].emoji}</div>
            <div className="text-[15px] font-bold">{GTLE_GAMES[s].title}</div>
            <div className="text-label-2 text-[12px]">{GTLE_GAMES[s].es}</div>
          </button>
        ))}
      </div>
      {open && (
        <div className="mt-4">
          <GtleGame key={open} slug={open} autoStart />
        </div>
      )}
      {!open && <GtleCredit className="text-label-2 mt-3 px-1 text-[12.5px]" />}
    </div>
  );
}

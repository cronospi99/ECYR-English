import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Play, Users, User } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Chip, LevelChip } from '@/components/ui/Misc';
import { GAMES, MODULES, type ModuleEntry } from '@/content/catalog';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { Segmented } from '@/components/ui/Segmented';
import { useGames, TRACKED_GAMES } from '@/store/games';
import { GameProgressView } from './GameProgress';
import { GtleGallery } from '@/features/learn/inserts/Gtle';
import { LiveGames } from './LiveGames';

export default function GamesPage() {
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const [mode, setMode] = useState<'all' | 'solo' | 'class'>('all');
  const games = useProgress((s) => s.games);
  const sessions = useGames((s) => s.sessions);
  const defenders = useGames((s) => s.defenders);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'progress' ? 'progress' : 'games';
  const playsOf = (slug: string) =>
    TRACKED_GAMES[slug] ? sessions.filter((x) => x.slug === slug && x.status !== 'invalid').length : (games[slug]?.plays ?? 0);
  const list = useMemo(
    () =>
      GAMES.filter(
        (g) => (level === 'all' || g.levels.includes(level)) && (mode === 'all' || g.mode === mode || g.mode === 'both'),
      ),
    [level, mode],
  );
  const books = MODULES.filter((m) => m.kind === 'book' || m.kind === 'course');

  return (
    <Page title="Juegos" subtitle="Aprende jugando: concursos, ruletas, dilemas y misiones para practicar solo o en clase." wide>
      <Segmented
        className="mb-5"
        value={tab}
        onChange={(t) => setParams(t === 'games' ? {} : { tab: t })}
        options={[
          { value: 'games', label: 'Juegos' },
          { value: 'progress', label: 'Mi progreso' },
        ]}
      />
      {tab === 'progress' ? (
        <GameProgressView sessions={sessions} defenders={defenders} />
      ) : (
      <>
      <LiveGames />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          <Chip active={level === 'all'} onClick={() => setLevel('all')}>
            Todos los niveles
          </Chip>
          {CEFR_LEVELS.map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {l}
            </Chip>
          ))}
        </div>
        <div className="bg-separator mx-1 hidden h-6 w-px sm:block" />
        <div className="flex gap-2">
          <Chip active={mode === 'all'} onClick={() => setMode('all')}>
            Todos
          </Chip>
          <Chip active={mode === 'solo'} onClick={() => setMode('solo')}>
            Individual
          </Chip>
          <Chip active={mode === 'class'} onClick={() => setMode('class')}>
            En clase
          </Chip>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((g) => (
          <GameCard key={g.slug} g={g} plays={playsOf(g.slug)} />
        ))}
      </div>

      <h2 className="text-title-2 mt-10 mb-1 px-1">Games to Learn English</h2>
      <p className="text-label-2 mb-3 px-1 text-[14px]">Juegos de vocabulario y gramática A1–A2 de gamestolearnenglish.com. También aparecen dentro de las lecciones donde se estudia cada tema.</p>
      <GtleGallery />

      <h2 className="text-title-2 mt-10 mb-3 px-1">Libros y cursos interactivos</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {books.map((g) => (
          <GameCard key={g.slug} g={g} plays={playsOf(g.slug)} />
        ))}
      </div>
      </>
      )}
    </Page>
  );
}

export function GameCard({ g, plays }: { g: ModuleEntry; plays: number }) {
  return (
    <Link to={`/play/${g.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-transform active:scale-[0.99]">
        <div
          className="relative aspect-[16/9] bg-cover bg-center"
          style={
            g.cover
              ? { backgroundImage: `url(${g.cover})` }
              : { background: `linear-gradient(135deg, ${g.accent}, color-mix(in srgb, ${g.accent} 45%, #1c1c1e))` }
          }
        >
          {!g.cover && <span className="absolute inset-0 flex items-center justify-center text-[64px]">{g.emoji}</span>}
          <span className="material absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full opacity-0 shadow-float transition-opacity group-hover:opacity-100">
            <Play size={18} fill="currentColor" />
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-headline truncate">{g.title}</h3>
              <p className="text-label-2 truncate text-[13px]">{g.subtitle}</p>
            </div>
            <span className="text-[22px]" aria-hidden>
              {g.emoji}
            </span>
          </div>
          <p className="text-label-2 mt-2 line-clamp-2 text-[14px]">{g.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {g.levels.map((l) => (
              <LevelChip key={l} level={l} className="h-5 px-2 text-[10px]" />
            ))}
            <span className="text-label-2 ml-auto inline-flex items-center gap-3 text-[12px]">
              {g.minutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {g.minutes} min
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                {g.mode === 'solo' ? <User size={12} /> : <Users size={12} />}
                {g.mode === 'solo' ? 'Individual' : g.mode === 'class' ? 'Clase' : 'Ambos'}
              </span>
              {plays > 0 && <span>· {plays}×</span>}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

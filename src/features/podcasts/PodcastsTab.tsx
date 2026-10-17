import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, Mic, Play, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, LevelChip, PageLoader, Spinner } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { currentLevel, useProgress } from '@/store/progress';
import {
  PODCAST_SHOWS,
  allPositions,
  curatedFor,
  fmtDate,
  fmtDuration,
  listEpisodes,
  resolveShow,
  searchShows,
  type PodcastShow,
  type PodcastShowDef,
} from '@/lib/podcasts';
import { cn } from '@/lib/cn';
import { EpisodeView } from './EpisodeView';

const isLevel = (v: string | null): v is CefrLevel => !!v && (CEFR_LEVELS as readonly string[]).includes(v);

/**
 * Práctica → Listening → Podcasts: real shows for learners, by level.
 * Navigation lives in the URL (?pod=<show>&ep=<episode>&lv=<level>) so the
 * back button and shared links work.
 */
export function PodcastsTab() {
  const [params, setParams] = useSearchParams();
  const units = useProgress((s) => s.units);
  const [level, setLevel] = useState<CefrLevel>(() => {
    const lv = params.get('lv');
    return isLevel(lv) ? lv : currentLevel(units);
  });
  const pod = Number(params.get('pod')) || 0;
  const ep = Number(params.get('ep')) || 0;
  const lv = params.get('lv');
  const showLevel: CefrLevel = isLevel(lv) ? lv : (curatedFor(pod)?.level ?? level);

  const go = (p: { pod?: number; ep?: number; lv?: CefrLevel }) => {
    const next: Record<string, string> = { tab: 'podcasts' };
    if (p.pod) next.pod = String(p.pod);
    if (p.ep) next.ep = String(p.ep);
    if (p.lv) next.lv = p.lv;
    setParams(next);
  };

  useEffect(() => {
    if (pod) window.scrollTo({ top: 0 });
  }, [pod, ep]);

  if (pod && ep) return <EpisodeView collectionId={pod} trackId={ep} level={showLevel} onBack={() => go({ pod, lv: showLevel })} />;
  if (pod) return <ShowView collectionId={pod} level={showLevel} onBack={() => go({ lv: showLevel })} onOpen={(id) => go({ pod, ep: id, lv: showLevel })} />;

  return (
    <div>
      <Card className="mb-5 flex items-start gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-white" style={{ background: 'var(--skill-listening)' }}>
          <Mic size={22} />
        </span>
        <div className="min-w-0 text-[14px] leading-snug">
          <div className="text-[16px] font-bold">Podcasts reales para cada nivel</div>
          <p className="text-label-2 mt-0.5">
            Programas para estudiantes de inglés publicados en Apple Podcasts. Se reproducen desde su fuente oficial, con una guía de escucha y preguntas hechas
            por IA. Con datos móviles, un episodio usa ≈ 0,5–1 MB por minuto.
          </p>
        </div>
      </Card>

      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
        {CEFR_LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l}
          </Chip>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PODCAST_SHOWS.filter((d) => d.level === level).map((d, i) => (
          <ShowCard key={d.id} def={d} i={i} onOpen={(s) => go({ pod: s.collectionId, lv: d.level })} />
        ))}
      </div>

      <ShowSearch level={level} onOpen={(s) => go({ pod: s.collectionId, lv: level })} />
    </div>
  );
}

// -------------------------------------------------------------- show card --

function ShowCard({ def, i, onOpen }: { def: PodcastShowDef; i: number; onOpen: (s: PodcastShow) => void }) {
  const { data: show, loading, error } = useAsync(() => resolveShow(def), [def.id]);
  const off = !loading && !show;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.3) }}
      disabled={!show}
      onClick={() => show && onOpen(show)}
      className={cn('bg-card shadow-card flex items-start gap-3 rounded-[18px] p-4 text-left transition-transform active:scale-[0.99]', off && 'opacity-60')}
    >
      <Artwork src={show?.artwork} size={56} loading={loading} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <LevelChip level={def.level} />
          <span className="text-label-2 text-[12px] font-semibold">{def.length}</span>
        </span>
        <span className="mt-1 block text-[16px] leading-snug font-bold">{show?.name ?? def.label}</span>
        {show?.artist && <span className="text-label-2 block truncate text-[12.5px]">{show.artist}</span>}
        <span className="text-label-2 mt-1 block text-[13px] leading-snug">
          {off ? (error ? 'No se pudo cargar ahora. Revisa tu conexión.' : 'No está disponible en Apple Podcasts en este momento.') : def.about_es}
        </span>
      </span>
    </motion.button>
  );
}

function Artwork({ src, size, loading, className }: { src?: string; size: number; loading?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={cn('bg-fill-2 text-label-3 relative flex shrink-0 items-center justify-center overflow-hidden rounded-[14px]', className)}
      style={{ width: size, height: size }}
    >
      {loading ? (
        <Spinner />
      ) : src && !broken ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <Mic size={size / 2.4} />
      )}
    </span>
  );
}

// ---------------------------------------------------------------- search --

function ShowSearch({ level, onOpen }: { level: CefrLevel; onOpen: (s: PodcastShow) => void }) {
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PodcastShow[] | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    if (term.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      setResults(await searchShows(term));
    } catch (e) {
      setResults(null);
      setError(e instanceof Error ? e.message : 'No se pudo buscar ahora.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-bold">Buscar otro podcast</h2>
      <p className="text-label-2 mt-1 text-[13.5px]">
        Cualquier programa de Apple Podcasts (sin contenido explícito). Se abrirá con la guía y el quiz de nivel {level}.
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <div className="bg-card shadow-card flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-3">
          <Search size={17} className="text-label-3 shrink-0" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="p. ej. science, history, football…"
            aria-label="Buscar podcast"
            enterKeyHint="search"
            className="placeholder:text-label-3 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          {term && (
            <button type="button" onClick={() => (setTerm(''), setResults(null))} aria-label="Borrar búsqueda" className="text-label-3">
              <X size={16} />
            </button>
          )}
        </div>
        <Button type="submit" disabled={busy || term.trim().length < 2}>
          {busy ? <Spinner className="h-4 w-4" /> : 'Buscar'}
        </Button>
      </form>
      {error && <p className="text-ink-red mt-2 text-[14px]">{error}</p>}
      {results && !results.length && <p className="text-label-2 mt-3 text-[14px]">No encontramos podcasts con esa búsqueda.</p>}
      {!!results?.length && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((s) => (
            <button
              key={s.collectionId}
              type="button"
              onClick={() => onOpen(s)}
              className="bg-card shadow-card flex items-center gap-3 rounded-[16px] p-3 text-left transition-transform active:scale-[0.99]"
            >
              <Artwork src={s.artwork} size={48} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[14.5px] leading-snug font-semibold">{s.name}</span>
                <span className="text-label-2 block truncate text-[12.5px]">
                  {s.artist}
                  {s.genre && ` · ${s.genre}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// --------------------------------------------------------------- show view --

function ShowView({ collectionId, level, onBack, onOpen }: { collectionId: number; level: CefrLevel; onBack: () => void; onOpen: (trackId: number) => void }) {
  const { data, loading, error } = useAsync(() => listEpisodes(collectionId), [collectionId]);
  const [count, setCount] = useState(15);
  const positions = allPositions();

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="plain" onClick={onBack} className="mb-4">
        <ArrowLeft size={16} /> Podcasts
      </Button>
      {loading ? (
        <PageLoader />
      ) : error || !data ? (
        <Card className="p-6">
          <h3 className="text-title-3">No se pudo abrir este podcast</h3>
          <p className="text-label-2 mt-1 text-[14.5px]">{error?.message ?? 'Inténtalo de nuevo en un momento.'}</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <Artwork src={data.show?.artwork} size={96} className="rounded-[18px]" />
            <div className="min-w-0 flex-1">
              <LevelChip level={level} />
              <h2 className="mt-1.5 text-[22px] leading-tight font-extrabold">{data.show?.name ?? data.episodes[0]?.showName}</h2>
              {data.show?.artist && <div className="text-label-2 text-[14px]">{data.show.artist}</div>}
              <div className="text-label-2 mt-1 text-[13px]">
                {[data.show?.genre, data.show?.episodes ? `${data.show.episodes} episodios` : ''].filter(Boolean).join(' · ')}
              </div>
              {data.show?.url && (
                <a href={data.show.url} target="_blank" rel="noopener noreferrer" className="text-ink-blue mt-2 inline-flex items-center gap-1 text-[14px] font-semibold">
                  Ver en Apple Podcasts <ExternalLink size={13} />
                </a>
              )}
            </div>
          </Card>

          <h3 className="mt-6 mb-3 text-[20px] font-bold">Episodios recientes</h3>
          {!data.episodes.length && <p className="text-label-2">Este podcast no tiene episodios de audio disponibles ahora.</p>}
          <div className="space-y-2.5">
            {data.episodes.slice(0, count).map((e) => {
              const pos = positions[e.key];
              const pct = pos?.d ? Math.min(100, Math.round((pos.t / pos.d) * 100)) : 0;
              return (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => onOpen(e.trackId)}
                  className="bg-card shadow-card flex w-full items-start gap-3 rounded-[16px] p-3.5 text-left transition-transform active:scale-[0.99]"
                >
                  <span className="bg-fill-2 text-ink-blue mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <Play size={15} fill="currentColor" className="ml-0.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] leading-snug font-semibold">{e.title}</span>
                    <span className="text-label-2 mt-0.5 block text-[12.5px]">
                      {[fmtDate(e.date), fmtDuration(e.durationMs)].filter(Boolean).join(' · ')}
                      {pos?.done ? <span className="text-ink-green font-semibold"> · ✓ escuchado</span> : pct > 2 ? ` · ${pct}% escuchado` : ''}
                    </span>
                    {e.description && <span className="text-label-2 mt-1 line-clamp-2 block text-[13px] leading-snug">{e.description}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {data.episodes.length > count && (
            <Button variant="gray" className="mt-3" onClick={() => setCount((c) => c + 15)}>
              Mostrar más
            </Button>
          )}
          <p className="text-label-2 mt-6 text-[12px]">
            Contenido de terceros, reproducido desde su fuente oficial; todos los derechos pertenecen a sus autores.
          </p>
        </>
      )}
    </div>
  );
}

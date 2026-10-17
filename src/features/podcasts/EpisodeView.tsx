import { useRef, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { PdfButton } from '@/components/learning/PdfButton';
import { useAsync } from '@/hooks/useAsync';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { deep } from '@/lib/color';
import { fmtDate, fmtDuration, listEpisodes, type PodcastEpisode, type PodcastShow } from '@/lib/podcasts';
import { EpisodePlayer, type PlayerHandle } from './EpisodePlayer';
import { ListeningGuide, guideSheet } from './ListeningGuide';
import { AiQuiz } from './AiQuiz';

// Deep enough behind white text (and its 85% captions) in both themes.
const HERO = `linear-gradient(135deg, ${deep('var(--skill-listening)', 80)}, color-mix(in srgb, var(--skill-listening) 40%, #3a1d9e))`;

export const RIGHTS = 'Contenido de terceros, reproducido desde su fuente oficial; todos los derechos pertenecen a sus autores.';

async function findEpisode(collectionId: number, trackId: number) {
  const first = await listEpisodes(collectionId);
  const ep = first.episodes.find((e) => e.trackId === trackId);
  if (ep) return { show: first.show, ep };
  // An older episode (a shared link, a teacher's task): look further back.
  const more = await listEpisodes(collectionId, 200);
  return { show: more.show ?? first.show, ep: more.episodes.find((e) => e.trackId === trackId) ?? null };
}

export function EpisodeView({ collectionId, trackId, level, onBack }: { collectionId: number; trackId: number; level: CefrLevel; onBack: () => void }) {
  const { data, loading, error } = useAsync(() => findEpisode(collectionId, trackId), [collectionId, trackId]);

  return (
    <div className="mx-auto max-w-3xl">
      {loading ? (
        <PageLoader />
      ) : !data?.ep ? (
        <>
          <Button variant="plain" onClick={onBack} className="mb-4">
            <ArrowLeft size={16} /> Episodios
          </Button>
          <Card className="p-6">
            <h3 className="text-title-3">No encontramos este episodio</h3>
            <p className="text-label-2 mt-1 text-[14.5px]">{error?.message ?? 'Puede que el podcast lo haya retirado. Elige otro de la lista.'}</p>
          </Card>
        </>
      ) : (
        <Episode key={data.ep.key} ep={data.ep} show={data.show} level={level} onBack={onBack} />
      )}
    </div>
  );
}

function Episode({ ep, show, level: initial, onBack }: { ep: PodcastEpisode; show: PodcastShow | null; level: CefrLevel; onBack: () => void }) {
  const player = useRef<PlayerHandle>(null);
  const [level, setLevel] = useState<CefrLevel>(initial);
  const [mode, setMode] = useState<'guide' | 'quiz'>('guide');
  const [more, setMore] = useState(false);
  const showName = show?.name || ep.showName;
  const publisher = show?.artist ?? '';
  const minutes = Math.round(ep.durationMs / 60000);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="plain" onClick={onBack}>
          <ArrowLeft size={16} /> Episodios
        </Button>
        <PdfButton build={() => guideSheet(ep, level, showName, publisher)} label="Guía en PDF" />
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 text-white sm:p-6" style={{ background: HERO }}>
          <div className="flex items-start gap-3.5">
            {ep.artwork && <img src={ep.artwork} alt="" referrerPolicy="no-referrer" className="h-16 w-16 shrink-0 rounded-[14px] object-cover shadow-lg sm:h-20 sm:w-20" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold opacity-90">
                <span className="rounded-full bg-white/20 px-2 py-0.5">{level}</span>
                <span className="min-w-0 truncate">{showName}</span>
              </div>
              <h2 className="mt-1.5 text-[22px] leading-tight font-extrabold break-words sm:text-[24px]">{ep.title}</h2>
              <div className="mt-1 text-[13px] opacity-85">{[fmtDate(ep.date), fmtDuration(ep.durationMs)].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="mt-5">
            <EpisodePlayer ep={ep} handle={player} defaultRate={level === 'A1' || level === 'A2' ? '0.9' : '1'} />
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          {ep.description && (
            <div>
              <p className={more ? 'text-label-2 text-[14.5px] leading-relaxed whitespace-pre-line' : 'text-label-2 line-clamp-3 text-[14.5px] leading-relaxed'}>
                {ep.description}
              </p>
              {ep.description.length > 180 && (
                <button type="button" onClick={() => setMore((m) => !m)} className="text-ink-blue mt-1 text-[14px] font-semibold">
                  {more ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          )}
          {minutes > 20 && (
            <p className="bg-fill-2 rounded-[12px] px-3 py-2 text-[13.5px] leading-snug">
              ⏱️ Este episodio dura {fmtDuration(ep.durationMs)}. Trabaja con un fragmento de 5–10 minutos: no hace falta escucharlo completo para aprender.
            </p>
          )}
          <div className="bg-fill-2 rounded-[14px] p-3.5 text-[13px] leading-snug">
            <div className="text-label-2 text-[11.5px] font-bold tracking-wide uppercase">Créditos</div>
            <div className="mt-1 text-[14px] font-semibold">{showName}</div>
            {publisher && <div className="text-label-2">{publisher}</div>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {ep.link && (
                <a href={ep.link} target="_blank" rel="noopener noreferrer" className="text-ink-blue inline-flex items-center gap-1 font-semibold">
                  Abrir en Apple Podcasts <ExternalLink size={12} />
                </a>
              )}
              {show?.url && show.url !== ep.link && (
                <a href={show.url} target="_blank" rel="noopener noreferrer" className="text-ink-blue inline-flex items-center gap-1 font-semibold">
                  Página del programa <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="text-label-2 mt-2">{RIGHTS}</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[20px] font-bold">Actividades</h3>
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'guide', label: 'Guía de escucha' },
            { value: 'quiz', label: 'Preguntas IA' },
          ]}
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-label-2 text-[13px] font-semibold">Nivel de las actividades</span>
        <Segmented size="sm" value={level} onChange={setLevel} options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))} />
      </div>
      {mode === 'guide' ? (
        <ListeningGuide key={level} ep={ep} level={level} now={() => player.current?.time() ?? 0} />
      ) : (
        <AiQuiz key={level} ep={ep} level={level} showName={showName} onLevel={setLevel} />
      )}
    </>
  );
}

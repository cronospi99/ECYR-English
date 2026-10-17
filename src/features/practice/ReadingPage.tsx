import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, Globe2, Volume2 } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Button } from '@/components/ui/Button';
import { Chip, LevelChip, PageLoader } from '@/components/ui/Misc';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { useAsync } from '@/hooks/useAsync';
import { LEVELS, levelMeta, loadFoundations, loadLevel, loadTravelGuides } from '@/content/levels';
import { loadUnitReadings } from '@/content/unitReadings';
import { VisualsFor } from '@/components/visuals/UnitVisuals';
import { Reader, ReadingCard, ReadingLibrary } from '@/features/library/ReadingLibrary';
import { unitTitle } from '../learn/LevelPage';
import { ExternalResources } from '@/features/library/ExternalResources';
import type { CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { speak, stopSpeaking } from '@/lib/speech';
import { ink, tint } from '@/lib/color';

interface Reading {
  id: string;
  /** Travel guides: the country name (matches visual placements). */
  guide?: string;
  title: string;
  level: CefrLevel;
  kind: 'story' | 'travel';
  subtitle: string;
  paras: { en: string; es?: string; tag?: string }[];
  glossary?: [string, string][];
  quiz: QuizItem[];
}

async function loadReadings(): Promise<Reading[]> {
  const [course, guides] = await Promise.all([loadFoundations(), loadTravelGuides()]);
  const stories: Reading[] = course.flatMap((u) =>
    u.topics.flatMap((t) =>
      t.blocks
        .filter((b) => b.t === 'reading')
        .map((b): Reading => {
          const paras = (b.paras as string[]) ?? [];
          const vocab = (b.vocab as [string, string][]) ?? [];
          return {
            id: `story-${t.id}`,
            title: String(b.title ?? '').replace(/^Reading:\s*/, ''),
            level: 'A1',
            kind: 'story',
            subtitle: `${t.title} · Unidad ${u.n}`,
            paras: paras.map((p) => ({ en: p })),
            glossary: vocab,
            quiz: vocab.map(([en, es], k) => {
              const others = vocab.filter((v) => v[0] !== en).map((v) => v[1]);
              const opts = [es, others[k % others.length], others[(k + 2) % others.length]].filter(
                (x, i, a): x is string => !!x && a.indexOf(x) === i,
              );
              const rot = k % opts.length;
              const options = [...opts.slice(rot), ...opts.slice(0, rot)];
              return { q: `En el texto, ¿qué significa “${en}”?`, options, answer: options.indexOf(es) };
            }),
          };
        }),
    ),
  );
  const travel: Reading[] = guides.map((g) => {
    const groups = [
      ['can', g.en.cans, g.es.cans],
      ['should', g.en.shoulds, g.es.shoulds],
      ['must', g.en.musts, g.es.musts],
    ] as const;
    const paras = groups.flatMap(([tag, en, es]) => en.map((t, i) => ({ en: t, es: es[i], tag })));
    const quiz: QuizItem[] = groups.flatMap(([tag, en]) =>
      en.slice(0, 2).map((sentence) => {
        const masked = sentence.replace(/\b(can|should|must)( not)?\b/i, (_m, _v, neg) => (neg ? '____ not' : '____'));
        const options = ['can', 'should', 'must'];
        return {
          q: masked,
          options,
          answer: options.indexOf(tag),
          explain:
            tag === 'can'
              ? '“Can” = posibilidad o permiso: algo que puedes hacer.'
              : tag === 'should'
                ? '“Should” = consejo o recomendación.'
                : '“Must” = obligación o norma (o prohibición con “must not”).',
        };
      }),
    );
    return {
      id: `travel-${g.iso}`,
      guide: g.name,
      title: `Travelling in ${g.name}`,
      level: 'A2',
      kind: 'travel',
      subtitle: `${g.capital} · ${g.visitors} visitantes al año`,
      paras,
      quiz,
    };
  });
  return [...stories, ...travel];
}

export default function ReadingPage() {
  const { data, loading } = useAsync(loadReadings, []);
  const [params, setParams] = useSearchParams();
  type Tab = 'library' | 'unit' | 'story' | 'travel';
  const tab = (['library', 'unit', 'story', 'travel'].includes(params.get('tab') ?? '') ? params.get('tab') : 'library') as Tab;
  const setTab = (t: Tab) => setParams({ tab: t });
  const readings = useProgress((s) => s.readings);
  const selected = useMemo(() => data?.find((r) => r.id === params.get('r')) ?? null, [data, params]);

  if (loading || !data) return <PageLoader />;
  if (selected) return <ReadingView r={selected} onBack={() => setParams({ tab: selected.kind })} />;

  const list = data.filter((r) => r.kind === tab);
  return (
    <Page back={{ to: '/practice', label: 'Práctica' }} title="Reading" subtitle="Lee, escucha y comprueba lo que entendiste." wide={tab === 'library' || tab === 'unit'}>
      {!params.get('lib') && !params.get('ur') && (
        <div className="no-scrollbar mb-5 overflow-x-auto">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'library', label: 'Biblioteca A1–C1' },
              { value: 'unit', label: 'Por unidad' },
              { value: 'story', label: 'Historias A1' },
              { value: 'travel', label: 'Guías de viaje' },
            ]}
          />
        </div>
      )}
      {tab === 'library' ? (
        <>
          <ReadingLibrary />
          {!params.get('lib') && <ExternalResources className="mt-8" />}
        </>
      ) : tab === 'unit' ? (
        <UnitBrowser />
      ) : (
      <ListGroup header={`${list.length} lecturas`}>
        {list.map((r) => (
          <ListRow
            key={r.id}
            onClick={() => setParams({ tab, r: r.id })}
            chevron
            leading={
              r.kind === 'travel' ? (
                <span className="bg-fill-2 flex h-10 w-10 items-center justify-center rounded-[11px] text-[22px]">
                  {flag(r.id.slice(7))}
                </span>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-ink-green">
                  <BookOpen size={20} />
                </span>
              )
            }
            title={r.title}
            subtitle={r.subtitle}
            trailing={
              readings[r.id] ? (
                <span className="text-ink-green inline-flex items-center gap-1 text-[14px] font-semibold">
                  <CheckCircle2 size={18} /> {readings[r.id]!.score}%
                </span>
              ) : (
                <LevelChip level={r.level} />
              )
            }
          />
        ))}
      </ListGroup>
      )}
    </Page>
  );
}

/** "Por unidad": every unit of a level book with the readings written for it. */
function UnitBrowser() {
  const [params, setParams] = useSearchParams();
  const lvl = levelMeta(params.get('lvl') ?? '')?.id ?? 'A1';
  const { data, loading } = useAsync(() => Promise.all([loadLevel(lvl), loadUnitReadings(lvl)]), [lvl]);
  const focus = params.get('u');
  useEffect(() => {
    if (focus && data && !params.get('ur')) document.getElementById(`unit-${focus}`)?.scrollIntoView({ block: 'start' });
  }, [focus, data, params]);

  const all = data ? Object.values(data[1]).flat() : [];
  const open = all.find((r) => r.id === params.get('ur'));
  if (open) {
    const n = Object.entries(data![1]).find(([, rs]) => rs.includes(open))?.[0];
    return <Reader key={open.id} r={open} backLabel="Por unidad" onBack={() => setParams({ tab: 'unit', lvl, ...(n ? { u: n } : {}) })} />;
  }
  const color = levelMeta(lvl)!.color;
  const units = data?.[0].units.filter((u) => data[1][String(u.n)]?.length) ?? [];

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
        {LEVELS.map((l) => (
          <Chip key={l.id} active={lvl === l.id} onClick={() => setParams({ tab: 'unit', lvl: l.id })}>
            {l.id} · {l.book}
          </Chip>
        ))}
      </div>
      {loading || !data ? (
        <PageLoader />
      ) : !units.length ? (
        <p className="text-label-2">Las lecturas por unidad de este nivel se están preparando.</p>
      ) : (
        <>
          <p className="text-label-2 mb-4 text-[13px]">
            {all.length} lecturas originales escritas con el tema, el vocabulario y la gramática de cada unidad de {data[0].book}.
          </p>
          <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2">
            {units.map((u) => (
              <section key={u.n} id={`unit-${u.n}`} className="min-w-0 scroll-mt-4">
                <div className="mb-2.5 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold"
                    style={{ background: tint(color), color: ink(color) }}
                  >
                    {u.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[17px] leading-tight font-bold">{unitTitle(u.title)}</h3>
                    <p className="text-label-2 truncate text-[13px]">{u.theme}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {data[1][String(u.n)]!.map((r, i) => (
                    <ReadingCard key={r.id} r={r} i={i} onOpen={() => setParams({ tab: 'unit', lvl, ur: r.id })} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReadingView({ r, onBack }: { r: Reading; onBack: () => void }) {
  const showEs = useSettings((s) => s.spanishHints);
  const [es, setEs] = useState(false);
  const complete = useProgress((s) => s.completeReading);
  const tagColor = { can: 'var(--green)', should: 'var(--blue)', must: 'var(--red)' } as Record<string, string>;
  const headings = { can: 'You can…', should: 'You should…', must: 'You must…' } as Record<string, string>;

  return (
    <Page
      eyebrow={
        <button type="button" onClick={onBack} className="text-ink-blue">
          ‹ Lecturas
        </button>
      }
      title={r.title}
      subtitle={r.subtitle}
      actions={
        <>
          <Button variant="tinted" size="sm" onClick={() => speak(r.paras.map((p) => p.en).join('. '), { rate: 0.92 })}>
            <Volume2 size={15} /> Escuchar
          </Button>
          <Button variant="gray" size="sm" onClick={stopSpeaking}>
            Parar
          </Button>
        </>
      }
    >
      {r.guide && (
        <div className="-mt-6 mb-5">
          <VisualsFor title="Esta guía en una infografía" where={(p) => 'guide' in p && p.guide === r.guide} />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="p-6">
          {r.kind === 'travel' && showEs && (
            <label className="text-label-2 mb-4 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={es} onChange={(e) => setEs(e.target.checked)} /> Mostrar traducción
            </label>
          )}
          <div className="space-y-4 text-[17px] leading-[1.7]">
            {r.paras.map((p, i) => (
              <div key={i}>
                {p.tag && (i === 0 || r.paras[i - 1]!.tag !== p.tag) && (
                  <h3 className="text-headline mt-4 mb-2 flex items-center gap-2" style={{ color: ink(tagColor[p.tag]) }}>
                    <Globe2 size={18} /> {headings[p.tag]}
                  </h3>
                )}
                <p className="text-pretty">{p.en}</p>
                {es && p.es && <p className="text-label-2 text-[15px]">{p.es}</p>}
              </div>
            ))}
          </div>
          {r.glossary && r.glossary.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {r.glossary.map(([en, esw]) => (
                <span key={en} className="bg-fill-2 rounded-full px-3 py-1 text-[13px]">
                  <b>{en}</b>
                  {showEs && <span className="text-label-2"> · {esw}</span>}
                </span>
              ))}
            </div>
          )}
        </Card>
        <div>
          <Card className="p-5 lg:sticky lg:top-6">
            <h3 className="text-title-3 mb-4">Comprensión</h3>
            <Quiz key={r.id} items={r.quiz} onFinish={(score) => complete(r.id, score, r.title, r.level)} />
          </Card>
        </div>
      </div>
    </Page>
  );
}

const flag = (iso: string) =>
  iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌍';

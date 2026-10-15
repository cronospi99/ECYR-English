import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, Globe2, Volume2 } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Button } from '@/components/ui/Button';
import { LevelChip, PageLoader } from '@/components/ui/Misc';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { useAsync } from '@/hooks/useAsync';
import { loadFoundations, loadTravelGuides } from '@/content/levels';
import { VisualsFor } from '@/components/visuals/UnitVisuals';
import type { CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { speak, stopSpeaking } from '@/lib/speech';

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
  const [tab, setTab] = useState<'story' | 'travel'>('story');
  const readings = useProgress((s) => s.readings);
  const selected = useMemo(() => data?.find((r) => r.id === params.get('r')) ?? null, [data, params]);

  if (loading || !data) return <PageLoader />;
  if (selected) return <ReadingView r={selected} onBack={() => setParams({})} />;

  const list = data.filter((r) => r.kind === tab);
  return (
    <Page back={{ to: '/practice', label: 'Práctica' }} title="Reading" subtitle="Lee, escucha y comprueba lo que entendiste.">
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={[
          { value: 'story', label: 'Historias A1' },
          { value: 'travel', label: 'Guías de viaje' },
        ]}
      />
      <ListGroup header={`${list.length} lecturas`}>
        {list.map((r) => (
          <ListRow
            key={r.id}
            onClick={() => setParams({ r: r.id })}
            chevron
            leading={
              r.kind === 'travel' ? (
                <span className="bg-fill-2 flex h-10 w-10 items-center justify-center rounded-[11px] text-[22px]">
                  {flag(r.id.slice(7))}
                </span>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-ios-green">
                  <BookOpen size={20} />
                </span>
              )
            }
            title={r.title}
            subtitle={r.subtitle}
            trailing={
              readings[r.id] ? (
                <span className="text-ios-green inline-flex items-center gap-1 text-[14px] font-semibold">
                  <CheckCircle2 size={18} /> {readings[r.id]!.score}%
                </span>
              ) : (
                <LevelChip level={r.level} />
              )
            }
          />
        ))}
      </ListGroup>
    </Page>
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
        <button type="button" onClick={onBack} className="text-ios-blue">
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
                  <h3 className="text-headline mt-4 mb-2 flex items-center gap-2" style={{ color: tagColor[p.tag] }}>
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

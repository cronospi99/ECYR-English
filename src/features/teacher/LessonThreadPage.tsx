import { useMemo, useState } from 'react';
import { Clipboard, Check, Dices, Sparkles, School, Wand2, BookOpenText, DoorOpen, DoorClosed } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { useClass } from './useClass';
import { loadLevel } from '@/content/levels';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { supabase } from '@/lib/supabase';
import { STYLES, buildLocal, buildWithAi, threadToText, type Activity, type Thread, type ThreadStyle } from '@/lib/lessonThread';
import { unitTitle } from '@/features/learn/LevelPage';

const MAX_UNITS = 4;

/**
 * Class thread generator (teachers only): one level, up to four of its units and
 * an optional topic become a central story with each unit as a branch, plus a
 * 5-minute opener and a 5-minute closer.
 */
export default function LessonThreadPage() {
  const { isTeacher } = useClass();
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [picked, setPicked] = useState<number[]>([1]);
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<ThreadStyle>('story');
  const [seed, setSeed] = useState(0);
  const [thread, setThread] = useState<Thread | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: book, loading } = useAsync(() => loadLevel(level), [level]);

  const units = useMemo(() => (book?.units ?? []).filter((u) => picked.includes(u.n)).sort((a, b) => a.n - b.n), [book, picked]);

  if (!isTeacher)
    return (
      <Page title="Hilo de clase">
        <Card className="mx-auto max-w-xl p-6 text-center">
          <School size={40} className="text-ink-orange mx-auto" />
          <h2 className="text-title-3 mt-3">Solo para docentes</h2>
          <p className="text-label-2 mt-1">Esta herramienta de planeación solo está disponible con una cuenta de docente.</p>
          <ButtonLink to="/profile" className="mt-4">
            Ir a mi perfil
          </ButtonLink>
        </Card>
      </Page>
    );

  const toggle = (n: number) =>
    setPicked((p) => (p.includes(n) ? (p.length > 1 ? p.filter((x) => x !== n) : p) : p.length >= MAX_UNITS ? [...p.slice(1), n] : [...p, n]));
  const input = (s = seed) => ({ level, units, topic: topic.trim(), style, seed: s });

  const local = (s = seed) => {
    if (!units.length) return;
    setError(null);
    setThread(buildLocal(input(s)));
  };
  const withAi = async () => {
    if (!units.length) return;
    setBusy(true);
    setError(null);
    try {
      setThread(await buildWithAi(input()));
    } catch (e) {
      setError((e as Error).message);
      setThread(buildLocal(input()));
    } finally {
      setBusy(false);
    }
  };
  const another = () => {
    const s = seed + 1;
    setSeed(s);
    local(s);
  };
  const copy = async () => {
    if (!thread) return;
    try {
      await navigator.clipboard.writeText(threadToText(thread));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('No se pudo copiar. Selecciona el texto manualmente.');
    }
  };

  return (
    <Page
      back={{ to: '/teacher?tab=material', label: 'Sala del docente' }}
      eyebrow="Planeación de clase · solo docentes"
      title="Hilo de clase"
      subtitle="Elige un nivel y sus unidades: se crea un hilo central (cuento, misterio, chisme…) con cada unidad como una rama, más un inicio y un cierre de máximo 5 minutos."
      wide
    >
      <Card className="mb-6 space-y-5 p-5">
        <div>
          <div className="text-label-2 mb-2 text-[13px] font-semibold uppercase">Nivel (no se mezclan niveles)</div>
          <div className="no-scrollbar overflow-x-auto">
            <Segmented<CefrLevel>
              value={level}
              onChange={(l) => {
                setLevel(l);
                setPicked([1]);
                setThread(null);
              }}
              options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))}
            />
          </div>
        </div>

        <div>
          <div className="text-label-2 mb-2 text-[13px] font-semibold uppercase">
            Unidades del hilo <span className="font-normal normal-case">· hasta {MAX_UNITS}, en orden: cada una es una rama</span>
          </div>
          {loading || !book ? (
            <PageLoader />
          ) : (
            <div className="flex flex-wrap gap-2">
              {book.units.map((u) => (
                <Chip key={u.n} active={picked.includes(u.n)} onClick={() => toggle(u.n)}>
                  {u.n} · {unitTitle(u.title)}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="thread-topic" className="text-label-2 mb-2 block text-[13px] font-semibold uppercase">
            Tema o idea (opcional)
          </label>
          <input
            id="thread-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={120}
            placeholder="Ej.: una fiesta sorpresa en el barrio, un viaje a Cartagena…"
            className="bg-fill-2 placeholder:text-label-3 w-full rounded-[12px] px-3.5 py-2.5 text-[15px] outline-none focus:ring-2"
          />
        </div>

        <div>
          <div className="text-label-2 mb-2 text-[13px] font-semibold uppercase">Tipo de hilo</div>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                {s.emoji} {s.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => local()} disabled={!units.length}>
            <Wand2 size={17} /> Generar plan
          </Button>
          <Button variant="tinted" onClick={() => void withAi()} disabled={!units.length || busy || !supabase}>
            <Sparkles size={17} /> {busy ? 'Escribiendo con IA…' : 'Generar con IA (historia completa)'}
          </Button>
          {thread && (
            <Button variant="gray" onClick={another}>
              <Dices size={17} /> Otra idea
            </Button>
          )}
        </div>
        <p className="text-label-2 text-[13px]">
          «Generar plan» no usa internet ni IA: arma el hilo con el vocabulario y la gramática de las unidades. Con IA, Gemini escribe además la historia completa al nivel.
        </p>
        {error && (
          <p role="alert" className="text-ink-red text-[14px]">
            {error}
          </p>
        )}
      </Card>

      {thread && <Plan thread={thread} onCopy={() => void copy()} copied={copied} />}
    </Page>
  );
}

function ActivityCard({ icon, heading, a }: { icon: React.ReactNode; heading: string; a: Activity }) {
  return (
    <Card className="p-5">
      <div className="text-label-2 flex items-center gap-2 text-[13px] font-semibold uppercase">
        {icon} {heading} · {a.minutes} min
      </div>
      <h3 className="text-headline mt-1">{a.title}</h3>
      <ol className="mt-3 space-y-2">
        {a.steps.map((s, i) => (
          <li key={i} className="bg-fill-2 flex gap-3 rounded-[12px] p-3 text-[15px]">
            <span className="bg-card text-label-2 h-fit shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold">{s.min} min</span>
            <span className="min-w-0 text-pretty">{s.text}</span>
          </li>
        ))}
      </ol>
      {a.questions.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[15px]">
          {a.questions.map((q) => (
            <li key={q} className="flex gap-2">
              <span aria-hidden>❓</span>
              <span className="min-w-0">{q}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Plan({ thread: t, onCopy, copied }: { thread: Thread; onCopy: () => void; copied: boolean }) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-label-2 text-[13px] font-semibold uppercase">
              {t.level} · {STYLES.find((s) => s.id === t.style)?.label} · {t.source === 'ia' ? 'Escrito con IA' : 'Plan sin IA'}
            </div>
            <h2 className="text-title-2 mt-1">{t.title}</h2>
          </div>
          <Button variant="gray" onClick={onCopy}>
            {copied ? <Check size={16} /> : <Clipboard size={16} />} {copied ? 'Copiado' : 'Copiar plan'}
          </Button>
        </div>
        <p className="mt-2 text-[15px] text-pretty">{t.premise}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {t.characters.map((c) => (
            <li key={c.name} className="bg-fill-2 rounded-full px-3 py-1 text-[13px]">
              <b>{c.name}</b> · {c.role}
            </li>
          ))}
        </ul>
      </Card>

      <ActivityCard icon={<DoorOpen size={15} />} heading="Inicio de clase" a={t.opener} />

      {t.story && (
        <Card className="p-5">
          <div className="text-label-2 flex items-center gap-2 text-[13px] font-semibold uppercase">
            <BookOpenText size={15} /> Historia completa (nivel {t.level})
          </div>
          <div className="mt-2 space-y-2 text-[15.5px] leading-relaxed text-pretty">
            {t.story.split(/\n+/).map((p, i) => (
              <p key={i} className={/^(chapter|capítulo)\b/i.test(p) ? 'text-label-2 pt-2 font-semibold' : undefined}>
                {p}
              </p>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h3 className="text-title-3 mb-3 px-1">Las ramas, una por unidad</h3>
        <ol className="space-y-4">
          {t.chapters.map((c, i) => (
            <li key={c.unit}>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-[13px] font-semibold uppercase">
                  <span className="bg-fill-2 inline-flex h-6 w-6 items-center justify-center rounded-full">{i + 1}</span>
                  <span className="text-label-2">
                    Unidad {c.unit} · {c.unitTitle}
                  </span>
                </div>
                <p className="text-label-2 mt-2 text-[14px] italic text-pretty">{c.link}</p>
                <p className="mt-2 text-[15.5px] text-pretty">{c.scene}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
                  <div className="bg-fill-2 rounded-[12px] p-3 text-[14px]">
                    <div className="text-label-2 mb-1 text-[12px] font-semibold uppercase">Vocabulario que alimenta el hilo</div>
                    {c.vocab.join(' · ')}
                  </div>
                  <div className="bg-fill-2 rounded-[12px] p-3 text-[14px]">
                    <div className="text-label-2 mb-1 text-[12px] font-semibold uppercase">Gramática</div>
                    {c.grammar.join(' · ')}
                  </div>
                </div>
                <p className="mt-3 text-[14.5px] text-pretty">
                  <b>Cómo guiarla:</b> {c.cue}
                </p>
                <ul className="mt-3 space-y-1.5 text-[15px]">
                  {c.questions.map((q) => (
                    <li key={q} className="flex gap-2">
                      <span aria-hidden>❓</span>
                      <span className="min-w-0">{q}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      </div>

      <ActivityCard icon={<DoorClosed size={15} />} heading="Cierre de clase" a={t.closer} />

      <Card className="p-5">
        <h3 className="text-headline">Consejos para llevar el hilo</h3>
        <ul className="text-label-2 mt-2 space-y-1.5 text-[14.5px]">
          {t.tips.map((x) => (
            <li key={x} className="flex gap-2">
              <span aria-hidden>•</span>
              <span className="min-w-0 text-pretty">{x}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

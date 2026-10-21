import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, RotateCcw, Shuffle, X } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { QuestionSet } from '@/components/learning/QuestionSet';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';
import { GROUPS, MISTAKES, POSSESSIVE, PRONOUN_QUIZ, QUIZ, REFLEXIVE, SORT_POOL, type Verb } from './data';

const COLOR: Record<Verb, string> = { do: 'var(--blue)', make: 'var(--orange)' };

type Tab = 'lesson' | 'sort' | 'quiz' | 'pronouns';

export default function DoMakePage() {
  const [params, setParams] = useSearchParams();
  const tab = (['lesson', 'sort', 'quiz', 'pronouns'] as const).find((t) => t === params.get('tab')) ?? 'lesson';
  return (
    <Page
      back={{ to: '/learn/grammar', label: 'Gramática' }}
      eyebrow="A1 – B1 · Dos verbos para un solo «hacer»"
      title="Do vs Make"
      subtitle="En español todo es «hacer». En inglés, DO es la actividad y MAKE es el resultado: aprende la regla, las colocaciones y las trampas típicas."
      wide
    >
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => setParams({ tab: t }, { replace: true })}
          options={[
            { value: 'lesson', label: 'Lección' },
            { value: 'sort', label: 'Clasifica' },
            { value: 'quiz', label: 'Practica' },
            { value: 'pronouns', label: 'Pronombres' },
          ]}
        />
      </div>
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'lesson' && <DoMakeLesson />}
        {tab === 'sort' && <DoMakeSorter />}
        {tab === 'quiz' && <DoMakeQuiz />}
        {tab === 'pronouns' && <PronounsLesson />}
      </motion.div>
    </Page>
  );
}

/** The rule, the collocations by family and the mistakes — also embedded in A1/A2 lessons. */
export function DoMakeLesson() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {(['do', 'make'] as const).map((v) => (
          <Card key={v} className="overflow-hidden">
            <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${COLOR[v]}, color-mix(in srgb, ${COLOR[v]} 60%, #000))` }}>
              <div className="text-[34px] leading-none font-extrabold tracking-tight">{v.toUpperCase()}</div>
              <div className="mt-1 text-[15px] font-semibold opacity-90">{v === 'do' ? 'la actividad, la tarea, el trabajo' : 'crear, producir, causar un resultado'}</div>
            </div>
            <div className="space-y-2 p-5 text-[15px]">
              {v === 'do' ? (
                <>
                  <p>Pensamos en la <b>acción</b>, no en algo que se crea: tareas, oficios de la casa, trabajo, estudio y deporte.</p>
                  <p>Va con palabras generales: <b>do something, do anything, do nothing, do everything</b> — <i>What are you doing?</i></p>
                  <p className="text-label-2">do · does · did · done · doing</p>
                </>
              ) : (
                <>
                  <p>Al final <b>existe algo nuevo</b>: comida, objetos, planes, ruido, dinero, un error…</p>
                  <p>Muchas expresiones con make hay que memorizarlas: <b>make a decision, make friends, make the bed</b>.</p>
                  <p className="text-label-2">make · makes · made · made · making</p>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="text-label-2 text-[12px] font-bold tracking-wide uppercase">La prueba rápida</div>
        <p className="mt-1 text-[15.5px]">
          Pregúntate: <b>¿al terminar hay un producto o un resultado nuevo?</b> → <span style={{ color: ink(COLOR.make) }}>MAKE</span>. ¿Solo realicé una
          actividad? → <span style={{ color: ink(COLOR.do) }}>DO</span>.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Pair a="I did my homework." b="I made a cake." note="La tarea se realiza · la torta se crea" />
          <Pair a="She does the dishes." b="She makes dinner." note="Lavar es una tarea · la cena es un producto" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <Card key={g.title} className="p-5" style={{ boxShadow: `inset 4px 0 0 ${COLOR[g.verb]}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[22px]">{g.emoji}</span>
              <div>
                <div className="text-headline">
                  <span style={{ color: ink(COLOR[g.verb]) }}>{g.verb.toUpperCase()}</span> · {g.title}
                </div>
                <div className="text-label-2 text-[13px]">{g.es}</div>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {g.items.map((it) => (
                <li key={it.en} className="flex items-start gap-2">
                  <SpeakButton text={it.ex} size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 text-[14.5px] leading-snug">
                    <b>{it.en}</b> <span className="text-label-2">· {it.es}</span>
                    <div className="text-label-2 italic">{it.ex}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="text-title-3">Errores típicos de hispanohablantes</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {MISTAKES.map((m) => (
            <div key={m.wrong} className="bg-fill-2 rounded-[14px] p-3 text-[14.5px]">
              <div className="text-ink-red flex items-start gap-1.5">
                <X size={15} className="mt-0.5 shrink-0" /> <span className="line-through">{m.wrong}</span>
              </div>
              <div className="text-ink-green mt-1 flex items-start gap-1.5 font-semibold">
                <Check size={15} className="mt-0.5 shrink-0" /> {m.right}
              </div>
              <div className="text-label-2 mt-1 text-[13px]">{m.why}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Pair({ a, b, note }: { a: string; b: string; note: string }) {
  return (
    <div className="bg-fill-2 rounded-[14px] p-3 text-[15px]">
      <div style={{ color: ink(COLOR.do) }} className="font-semibold">
        {a}
      </div>
      <div style={{ color: ink(COLOR.make) }} className="font-semibold">
        {b}
      </div>
      <div className="text-label-2 mt-1 text-[12.5px]">{note}</div>
    </div>
  );
}

const pick = (n: number, seed: number) => {
  const a = [...SORT_POOL];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
};

/** Tap DO or MAKE for each word; the round shows the full expression after each answer. */
export function DoMakeSorter() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e5));
  const round = useMemo(() => pick(12, seed), [seed]);
  const [answers, setAnswers] = useState<(Verb | null)[]>(() => round.map(() => null));
  const award = useProgress((s) => s.award);
  const done = answers.every(Boolean);
  const right = answers.filter((a, i) => a === round[i]!.verb).length;
  const choose = (i: number, v: Verb) => {
    if (answers[i]) return;
    const next = answers.map((a, k) => (k === i ? v : a));
    setAnswers(next);
    if (next.every(Boolean)) {
      const score = Math.round((next.filter((a, k) => a === round[k]!.verb).length / round.length) * 100);
      award({ kind: 'game', title: 'Do vs Make · Clasifica', skill: 'vocabulary', xp: 10, score, ref: 'grammar:do-make' });
    }
  };
  const again = () => {
    const s = Math.floor(Math.random() * 1e5);
    setSeed(s);
    setAnswers(pick(12, s).map(() => null));
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-title-3">¿DO o MAKE?</h3>
          <p className="text-label-2 text-[14px]">Elige el verbo para cada palabra. Verás la expresión completa al responder.</p>
        </div>
        <span className="text-[15px] font-bold tabular-nums">
          {right}/{answers.filter(Boolean).length}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {round.map((it, i) => {
          const a = answers[i];
          const ok = a === it.verb;
          return (
            <div key={`${seed}-${i}`} className={cn('flex items-center gap-2 rounded-[14px] p-2.5', a ? (ok ? 'bg-[color-mix(in_srgb,var(--green)_12%,transparent)]' : 'bg-[color-mix(in_srgb,var(--red)_12%,transparent)]') : 'bg-fill-2')}>
              <span className="min-w-0 flex-1 text-[15px] font-semibold">
                {a ? (
                  <>
                    <span style={{ color: ink(COLOR[it.verb]) }}>{it.verb}</span> {it.noun} {ok ? '✓' : ''}
                  </>
                ) : (
                  <>… {it.noun}</>
                )}
              </span>
              {(['do', 'make'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!!a}
                  onClick={() => choose(i, v)}
                  className={cn('h-8 rounded-full px-3 text-[13px] font-bold transition-opacity', a && a !== v && 'opacity-30')}
                  style={{ background: tint(COLOR[v], a === v ? 30 : 14), color: ink(COLOR[v]) }}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {done && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-[17px] font-bold">
            {right}/{round.length} {right === round.length ? '🏆' : right >= 9 ? '👏' : '💪'}
          </span>
          <Button variant="gray" onClick={again}>
            <Shuffle size={16} /> Otra ronda
          </Button>
        </div>
      )}
    </Card>
  );
}

export function DoMakeQuiz() {
  const [k, setK] = useState(0);
  const award = useProgress((s) => s.award);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex justify-end">
        <Button variant="plain" onClick={() => setK((x) => x + 1)}>
          <RotateCcw size={15} /> Reiniciar
        </Button>
      </div>
      <QuestionSet
        key={k}
        questions={QUIZ}
        color="var(--indigo)"
        onChecked={(r, t) => award({ kind: 'game', title: 'Do vs Make · Práctica', skill: 'grammar', xp: 10, score: Math.round((r / t) * 100), ref: 'grammar:do-make' })}
      />
    </div>
  );
}

function PronounsLesson() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-title-3">Reflexive pronouns</h3>
          <p className="text-label-2 mt-1 text-[14.5px]">
            Cuando el sujeto y el objeto son la misma persona (<i>She hurt herself</i>), para enfatizar que lo hizo uno mismo (<i>I painted it myself</i>) y
            con <b>by</b> para decir «solo, sin ayuda» (<i>He lives by himself</i>).
          </p>
          <Table rows={REFLEXIVE} head={['Sujeto', 'Reflexivo', 'Ejemplo']} />
        </Card>
        <Card className="p-5">
          <h3 className="text-title-3">Possessive pronouns</h3>
          <p className="text-label-2 mt-1 text-[14.5px]">
            Reemplazan «adjetivo posesivo + sustantivo»: <i>It’s my bag → It’s <b>mine</b></i>. Nunca llevan sustantivo después ni apóstrofo (
            <i>hers</i>, no <i>her’s</i>). <i>Its</i> casi nunca se usa como pronombre.
          </p>
          <Table rows={POSSESSIVE} head={['Adjetivo', 'Pronombre', 'Ejemplo']} />
        </Card>
      </div>
      <div className="mx-auto max-w-2xl">
        <QuestionSet questions={PRONOUN_QUIZ} color="var(--teal)" />
      </div>
    </div>
  );
}

function Table({ rows, head }: { rows: [string, string, string][]; head: [string, string, string] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-[14.5px]">
        <thead className="text-label-2 text-[12px] uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} className="pb-1.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b, c]) => (
            <tr key={b + a} className="border-separator border-t">
              <td className="py-1.5 pr-3">{a}</td>
              <td className="text-ink-teal py-1.5 pr-3 font-bold">{b}</td>
              <td className="text-label-2 py-1.5 italic">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

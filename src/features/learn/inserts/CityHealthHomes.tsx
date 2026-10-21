import { useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { QuestionSet } from '@/components/learning/QuestionSet';
import { SpeakButton } from '@/components/learning/SpeakButton';
import type { LibQuestion } from '@/content/library';
import { speak } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';
import { HEALTH_WORDS, HOMES, HOUSING_QUIZ, LEVEL_ES, MODAL_QUIZ, MODALS, PAIRS, PLACES, SYMPTOMS, cop, type Home } from './cityHealthHomes';

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};

// -------------------------------------------------------------------- city --

/** Places in a city, from shops to an airport, and "Where do you go to…?". */
export function CityPlaces() {
  const [lvl, setLvl] = useState<keyof typeof LEVEL_ES>('shop');
  const [k, setK] = useState(0);
  const quiz = useMemo<LibQuestion[]>(
    () =>
      shuffle(PLACES)
        .slice(0, 8)
        .map((p) => {
          const options = shuffle([p.place, ...shuffle(PLACES.filter((x) => x.place !== p.place)).slice(0, 2).map((x) => x.place)]).map((o) => `the ${o}`);
          return { type: 'mc', q: `Where do you go to ${p.what}?`, options, answer: options.indexOf(`the ${p.place}`), explain_es: `${p.emoji} You go to the ${p.place} to ${p.what}.` };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [k],
  );
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-title-3">🏙️ Places in a city</h3>
        <p className="text-label-2 mt-1 text-[14.5px]">
          Toca un lugar para escuchar para qué sirve. Con lugares usamos <b>the</b> y <b>to</b>: <i>I go to the bakery to buy bread.</i> Ojo:{' '}
          <i>go home</i>, <i>go to work</i>, <i>go to school</i> van sin <b>the</b>.
        </p>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto py-1">
          {(Object.keys(LEVEL_ES) as (keyof typeof LEVEL_ES)[]).map((l) => (
            <Chip key={l} active={lvl === l} onClick={() => setLvl(l)}>
              {LEVEL_ES[l]}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PLACES.filter((p) => p.level === lvl).map((p) => (
            <button key={p.place} type="button" onClick={() => speak(`The ${p.place}. You go to the ${p.place} to ${p.what}.`)} className="bg-fill-2 rounded-[14px] p-3 text-left">
              <div className="text-[26px] leading-none">{p.emoji}</div>
              <div className="mt-1 text-[15px] font-bold capitalize">{p.place}</div>
              <div className="text-label-2 text-[12.5px]">to {p.what}</div>
            </button>
          ))}
        </div>
      </Card>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-title-3">Where do you go?</h3>
          <Button size="sm" variant="plain" onClick={() => setK((x) => x + 1)}>
            <Shuffle size={15} /> Otras preguntas
          </Button>
        </div>
        <QuestionSet key={k} questions={quiz} color="var(--teal)" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ health --

/** Symptoms, health words and modal verbs for advice, with a "Doctor, doctor!" game. */
export function HealthAdvice() {
  const [round, setRound] = useState(0);
  const order = useMemo(() => shuffle(SYMPTOMS), [round]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const award = useProgress((s) => s.award);
  const s = order[i];
  const options = useMemo(() => (s ? shuffle([s.advice, ...s.bad]) : []), [s]);

  const choose = (o: string) => {
    if (pick || !s) return;
    setPick(o);
    if (o === s.advice) {
      setScore((x) => x + 1);
      speak(o);
    }
  };
  const next = () => {
    const n = i + 1;
    setPick(null);
    setI(n);
    if (n >= order.length) award({ kind: 'game', title: 'Doctor, doctor!', skill: 'speaking', xp: 10, score: Math.round((score / order.length) * 100), ref: 'health:advice' });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-title-3">🤒 Health symptoms</h3>
        <p className="text-label-2 mt-1 text-[14.5px]">
          Para síntomas usamos <b>I have a…</b> (<i>I have a headache</i>) o <b>I feel…</b> con adjetivos (<i>I feel dizzy</i>). Toca una tarjeta para escucharla.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SYMPTOMS.map((x) => (
            <button key={x.en} type="button" onClick={() => speak(x.say)} className="bg-fill-2 rounded-[14px] p-3 text-left">
              <div className="text-[26px] leading-none">{x.emoji}</div>
              <div className="mt-1 text-[15px] font-bold capitalize">{x.en}</div>
              <div className="text-[13px] italic">{x.say}</div>
              <div className="text-label-2 text-[12px]">{x.es}</div>
            </button>
          ))}
        </div>
        <h4 className="text-headline mt-5">Health vocabulary</h4>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {HEALTH_WORDS.map(([e, w, def]) => (
            <div key={w} className="flex items-center gap-2 text-[14px]">
              <span className="text-[20px]">{e}</span>
              <b>{w}</b> <span className="text-label-2">– {def}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h4 className="text-headline">Modal verbs for health advice</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MODALS.map((m) => (
            <div key={m.m} className="rounded-[14px] p-3" style={{ background: tint(m.color, 10) }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[17px] font-extrabold" style={{ color: ink(m.color) }}>
                  {m.m}
                </span>
                <SpeakButton text={m.ex} size={16} />
              </div>
              <div className="text-label-2 text-[12.5px]">{m.use}</div>
              <div className="mt-1 text-[14px] italic">{m.ex}</div>
            </div>
          ))}
        </div>
        <p className="text-label-2 mt-2 text-[13px]">Después de un modal va el verbo base sin “to”: <i>You should rest</i> (no <i>should to rest</i>). <b>Have to</b> es la excepción.</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-title-3">🩺 Doctor, doctor!</h3>
            <p className="text-label-2 text-[14px]">El paciente te dice su síntoma. Elige el mejor consejo.</p>
          </div>
          <span className="text-[15px] font-bold tabular-nums">
            {score}/{Math.min(i + (pick ? 1 : 0), order.length)}
          </span>
        </div>
        {s ? (
          <div className="mt-4">
            <button type="button" onClick={() => speak(s.say)} className="bg-fill-2 flex items-center gap-3 rounded-[16px] px-4 py-3 text-left">
              <span className="text-[34px]">{s.emoji}</span>
              <span className="text-[18px] font-bold">“{s.say}”</span>
            </button>
            <div className="mt-3 grid gap-2">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={!!pick}
                  onClick={() => choose(o)}
                  className={cn('rounded-[12px] px-3 py-2.5 text-left text-[15px] transition-colors', pick && o === s.advice ? 'bg-ios-green text-white' : pick === o ? 'bg-ios-red text-white' : 'bg-fill-2 hover:bg-fill')}
                >
                  {o}
                </button>
              ))}
            </div>
            {pick && (
              <div className="mt-3 text-right">
                <Button size="sm" onClick={next}>
                  {i + 1 < order.length ? 'Siguiente paciente' : 'Ver resultado'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[17px] font-bold">
              {score}/{order.length} {score === order.length ? '🏆' : '👏'}
            </span>
            <Button variant="gray" onClick={() => (setRound((r) => r + 1), setI(0), setScore(0), setPick(null))}>
              <Shuffle size={16} /> Jugar otra vez
            </Button>
          </div>
        )}
      </Card>

      <QuestionSet questions={MODAL_QUIZ} color="var(--purple)" />
    </div>
  );
}

// ------------------------------------------------------------------ housing --

const byId = (id: Home['id']) => HOMES.find((h) => h.id === id)!;

function HomeCard({ h }: { h: Home }) {
  const rows: [string, string][] = [
    ['Rent', cop(h.rent)],
    ['Utilities', cop(h.utilities)],
    ['Total a month', cop(h.rent + h.utilities)],
    ['Stratum', String(h.stratum)],
    ['Bedrooms', String(h.bedrooms)],
    ['Bathrooms', String(h.bathrooms)],
  ];
  return (
    <div className="bg-fill-2 rounded-[16px] p-4">
      <div className="text-[18px] font-extrabold capitalize">
        {h.emoji} {h.name.replace(/^the /, '')}
      </div>
      <table className="mt-2 w-full text-[14px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-separator border-t first:border-0">
              <td className="text-label-2 py-1">{k}</td>
              <td className="py-1 text-right font-semibold tabular-nums">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-label-2 mt-2 text-[12.5px]">
        <b>Appliances:</b> {h.appliances.join(', ')}
      </div>
      <div className="mt-1 text-[12.5px]">
        <b>It has:</b> {h.insights.join(', ')}
      </div>
    </div>
  );
}

/** Two pairs of real-looking homes for rent, compared with comparatives, superlatives and preferences. */
export function HousingCompare({ start = 0 }: { start?: 0 | 1 }) {
  const [pi, setPi] = useState<number>(start);
  const pair = PAIRS[pi]!;
  const key = `${pair.a}-${pair.b}` as 'house-apartment' | 'loft-tuscan';
  const a = byId(pair.a);
  const b = byId(pair.b);
  const [showInside, setShowInside] = useState(false);
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-title-3">🔑 Which home would you rent?</h3>
              <p className="text-label-2 text-[14px]">Compara las dos viviendas: precio, servicios, estrato, habitaciones y lo que ofrece cada una.</p>
            </div>
            <Segmented
              size="sm"
              value={String(pi)}
              onChange={(v) => (setPi(Number(v)), setShowInside(false))}
              options={PAIRS.map((p, i) => ({ value: String(i), label: p.title }))}
            />
          </div>
        </div>
        <img src={`/visuals/${showInside && pair.inside ? pair.inside : pair.image}.webp`} alt={pair.title} className="block w-full" loading="lazy" />
        <div className="space-y-3 p-4 sm:p-5">
          {pair.inside && (
            <Button size="sm" variant="gray" onClick={() => setShowInside((x) => !x)}>
              {showInside ? 'Ver la ficha con precios' : 'Ver por dentro'}
            </Button>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <HomeCard h={a} />
            <HomeCard h={b} />
          </div>
          <div className="rounded-[14px] p-3 text-[14px]" style={{ background: tint('var(--blue)', 10) }}>
            <b>Para comparar:</b> cheap → <b>cheaper</b> · big → <b>bigger</b> · expensive → <b>more expensive</b> · good → <b>better</b> · the <b>cheapest</b> / the{' '}
            <b>most expensive</b> · not as big <b>as</b> · I’d rather live in… because…
          </div>
        </div>
      </Card>
      <QuestionSet key={key} questions={HOUSING_QUIZ[key]} color="var(--blue)" />
      <div>
        <h3 className="text-title-3 mb-2">The four homes: superlatives</h3>
        <QuestionSet questions={HOUSING_QUIZ.all} color="var(--indigo)" />
      </div>
      <Card className="p-5">
        <h4 className="text-headline">🗣️ Speak or write</h4>
        <p className="mt-1 text-[15px]">
          Imagine you are moving to a new city. Which of the four homes would you rent? Compare it with at least two others and give three reasons.
        </p>
        <p className="text-label-2 mt-1 text-[13.5px]">
          Ideas: <i>I’d rather rent the apartment because it’s cheaper than the house and it has a pool. The loft is closer to restaurants, but it’s smaller…</i>
        </p>
      </Card>
    </div>
  );
}

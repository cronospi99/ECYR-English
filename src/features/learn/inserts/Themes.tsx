import { useMemo, useState } from 'react';
import { Check, Shuffle, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Misc';
import { QuestionSet } from '@/components/learning/QuestionSet';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { checkTyped, type LibQuestion } from '@/content/library';
import { speak } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { tint } from '@/lib/color';
import {
  CLOTHES_GROUPS,
  COUNTRIES,
  FORECAST,
  SEASONS,
  SPELL_WORDS,
  TEMPS,
  WEARING_QUIZ,
  WEARING_VERBS,
  WEATHER_NOUNS,
  WEATHER_VERBS,
  WEATHER_WORDS,
  describe,
  forecastText,
  type Ending,
} from './themesData';

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};

// ------------------------------------------------- countries & nationalities --

const ENDINGS: Ending[] = ['-an / -ian', '-ese', '-ish', 'other'];

export function CountriesNationalities() {
  const [ending, setEnding] = useState<Ending | 'all'>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [k, setK] = useState(0);
  const list = COUNTRIES.filter((c) => ending === 'all' || c.ending === ending);
  const quiz = useMemo<LibQuestion[]>(() => {
    const picks = shuffle(COUNTRIES).slice(0, 8);
    return picks.map((c, i) => {
      if (i % 2) {
        const opts = shuffle([c.nat, ...shuffle(COUNTRIES.filter((x) => x.nat !== c.nat)).slice(0, 2).map((x) => x.nat)]);
        return { type: 'mc', q: `${c.flag} She’s from ${c.name}. She’s ____.`, options: opts, answer: opts.indexOf(c.nat), explain_es: `${c.name} → ${c.nat}. Las nacionalidades van con mayúscula.` };
      }
      return { type: 'gap', q: `${c.flag} I’m ${c.nat}. I’m from ____.`, answer: c.name.replace(/^the /, ''), accept: [c.name], explain_es: `${c.nat} → ${c.name}.` };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-title-3">🌍 Countries and nationalities</h3>
        <p className="text-label-2 mt-1 text-[14.5px]">
          El <b>país</b> es el lugar (<i>Colombia</i>); la <b>nacionalidad</b> es lo que eres por haber nacido o vivir allí (<i>Colombian</i>). En inglés las dos
          van con <b>mayúscula</b>: <i>I’m Colombian</i>, nunca <i>colombian</i>. Y ojo: “America” para un hablante de inglés suele significar Estados Unidos;
          di <b>South America</b>, <b>North America</b> o <b>Latin America</b>.
        </p>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto py-1">
          <Chip active={ending === 'all'} onClick={() => setEnding('all')}>
            Todas
          </Chip>
          {ENDINGS.map((e) => (
            <Chip key={e} active={ending === e} onClick={() => setEnding(e)}>
              {e === 'other' ? 'Irregulares' : e}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setSel(c.name);
                speak(describe(c), { tier: 'premium' });
              }}
              className={cn('bg-fill-2 rounded-[14px] p-3 text-left transition', sel === c.name && 'ring-ios-blue ring-2')}
            >
              <div className="text-[28px] leading-none">{c.flag}</div>
              <div className="mt-1 text-[14.5px] font-bold capitalize">{c.name.replace(/^the /, '')}</div>
              <div className="text-ink-blue text-[13.5px] font-semibold">{c.nat}</div>
            </button>
          ))}
        </div>
        {sel && <p className="bg-fill-2 mt-3 rounded-[12px] px-3 py-2 text-[14.5px]">{describe(COUNTRIES.find((c) => c.name === sel)!)}</p>}
        <p className="text-label-2 mt-3 text-[13px]">
          Continentes: Africa · Antarctica · Asia · Europe · North America · South America · Oceania. En la Tierra vivimos más de 8.000 millones de personas
          (<i>over eight billion people</i>).
        </p>
      </Card>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-title-3">Where are they from?</h3>
          <Button size="sm" variant="plain" onClick={() => setK((x) => x + 1)}>
            <Shuffle size={15} /> Otras preguntas
          </Button>
        </div>
        <QuestionSet key={k} questions={quiz} color="var(--teal)" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- spelling --

const LETTER_NAMES: Record<string, string> = { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', y: 'Y', z: 'Z' };

/** "Listen and write": a natural voice spells a word letter by letter. */
export function SpellingDictation() {
  const [seed, setSeed] = useState(0);
  const words = useMemo(() => shuffle(SPELL_WORDS).slice(0, 6), [seed]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState<'right' | 'almost' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const award = useProgress((s) => s.award);
  const w = words[i];
  const spell = (word: string) => speak(word.split('').map((c) => LETTER_NAMES[c.toLowerCase()] ?? c.toUpperCase()).join(', ') + '.', { rate: 0.7 });
  const check = () => {
    if (!w) return;
    const r = checkTyped(val, w);
    setRes(r);
    if (r !== 'wrong') setScore((s) => s + 1);
    speak(w);
  };
  const next = () => {
    const n = i + 1;
    setI(n);
    setVal('');
    setRes(null);
    if (n >= words.length) award({ kind: 'game', title: 'Spelling: listen and write', skill: 'listening', xp: 10, score: Math.round((score / words.length) * 100), ref: 'spelling:dictation' });
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-title-3">🔡 Listen and write</h3>
          <p className="text-label-2 text-[14px]">Escucha cómo se deletrea la palabra y escríbela.</p>
        </div>
        <span className="text-[15px] font-bold tabular-nums">
          {score}/{Math.min(i + (res ? 1 : 0), words.length)}
        </span>
      </div>
      {w ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => spell(w)}>
            <Volume2 size={16} /> Deletrear ({i + 1}/{words.length})
          </Button>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (res ? next() : check())}
            disabled={!!res}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Escribe la palabra…"
            className="bg-fill-2 h-10 min-w-0 flex-1 rounded-[11px] px-3 text-[16px] outline-none focus:ring-2"
          />
          {!res ? (
            <Button variant="gray" onClick={check} disabled={!val.trim()}>
              <Check size={16} /> Comprobar
            </Button>
          ) : (
            <Button variant="tinted" onClick={next}>
              Siguiente
            </Button>
          )}
          {res && (
            <p className={cn('w-full text-[15px] font-semibold', res === 'wrong' ? 'text-ink-red' : 'text-ink-green')}>
              {res === 'right' ? '¡Correcto!' : res === 'almost' ? 'Casi:' : 'Era:'} <span className="tracking-wide">{w}</span> — {w.split('').join('-').toUpperCase()}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[17px] font-bold">
            {score}/{words.length} {score === words.length ? '🏆' : '👏'}
          </span>
          <Button variant="gray" onClick={() => (setSeed((s) => s + 1), setI(0), setScore(0), setRes(null), setVal(''))}>
            <Shuffle size={16} /> Otras palabras
          </Button>
        </div>
      )}
      <p className="text-label-2 mt-3 text-[13px]">Ojo con las letras que confunden a los hispanohablantes: E /iː/, I /aɪ/, G /dʒiː/, J /dʒeɪ/, H /eɪtʃ/, W /ˈdʌbəl.juː/, Y /waɪ/.</p>
    </Card>
  );
}

// ----------------------------------------------------------------- weather --

export function WeatherLesson() {
  const [city, setCity] = useState(0);
  const [k, setK] = useState(0);
  const quiz = useMemo<LibQuestion[]>(
    () =>
      shuffle(WEATHER_WORDS)
        .slice(0, 6)
        .map((w) => {
          const opts = shuffle([w.w, ...shuffle(WEATHER_WORDS.filter((x) => x.w !== w.w)).slice(0, 2).map((x) => x.w)]);
          return { type: 'mc', q: `${w.emoji}  It’s ____ today.`, options: opts, answer: opts.indexOf(w.w), explain_es: `${w.emoji} = ${w.w}. ${w.ex}` };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [k],
  );
  const f = FORECAST[city]!;
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-title-3">⛅ Weather and seasons</h3>
        <p className="text-label-2 mt-1 text-[14.5px]">
          Para el clima usamos <b>it</b>: <i>It’s sunny. It’s 25 degrees. It’s raining.</i> Nunca <i>“It’s doing 12 degrees”</i> ni <i>“Is sunny”</i>. Dicho
          popular: <i>It’s raining cats and dogs!</i> = está lloviendo a cántaros.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {SEASONS.map((s) => (
            <button key={s.name} type="button" onClick={() => speak(`${s.name}. ${s.body}`)} className="bg-fill-2 rounded-[14px] p-3 text-left">
              <div className="text-[26px]">{s.emoji}</div>
              <div className="text-[15px] font-bold capitalize">
                {s.name} <span className="text-label-2 text-[12.5px] font-normal">· {s.es}</span>
              </div>
              <div className="text-label-2 text-[12.5px]">{s.north} (hemisferio norte)</div>
              <div className="mt-1 text-[13.5px]">{s.body}</div>
            </button>
          ))}
        </div>
        <p className="text-label-2 mt-2 text-[13px]">
          Las cuatro estaciones existen en las zonas templadas. Cerca del ecuador, como en Colombia, hay temporadas de lluvia (<i>rainy season</i>) y temporadas
          secas (<i>dry season</i>), y la temperatura cambia sobre todo con la altura.
        </p>
      </Card>

      <Card className="p-5">
        <h4 className="text-headline">🌡️ ¿Qué tan caliente?</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-5">
          {TEMPS.map((t) => (
            <button key={t.w} type="button" onClick={() => speak(t.ex)} className="rounded-[14px] p-3 text-left text-white" style={{ background: t.color }}>
              <div className="text-[18px] font-extrabold">{t.w}</div>
              <div className="text-[12.5px] opacity-90">{t.range}</div>
              <div className="mt-1 text-[13px] italic">{t.ex}</div>
            </button>
          ))}
        </div>
        <h4 className="text-headline mt-5">Weather words</h4>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {WEATHER_WORDS.map((w) => (
            <button key={w.w} type="button" onClick={() => speak(w.ex)} className="bg-fill-2 flex items-start gap-2 rounded-[14px] p-3 text-left">
              <span className="text-[26px] leading-none">{w.emoji}</span>
              <span>
                <span className="block text-[15px] font-bold">{w.w}</span>
                <span className="text-label-2 block text-[12.5px]">{w.ex}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {WEATHER_NOUNS.map(([e, w, es]) => (
            <span key={w} className="bg-fill-2 rounded-full px-3 py-1 text-[13.5px]">
              {e} <b>{w}</b> <span className="text-label-2">· {es}</span>
            </span>
          ))}
        </div>
        <p className="text-label-2 mt-2 text-[13px]">Adjetivo = sustantivo + -y: sun → sunny, cloud → cloudy, rain → rainy, wind → windy, fog → foggy (doble g).</p>
      </Card>

      <Card className="p-5">
        <h4 className="text-headline">Weather verbs</h4>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead className="text-label-2 text-[12px] uppercase">
              <tr>
                <th className="pb-1.5">Verb</th>
                <th className="pb-1.5">Ahora</th>
                <th className="pb-1.5">Pasado</th>
                <th className="pb-1.5">Futuro</th>
              </tr>
            </thead>
            <tbody>
              {WEATHER_VERBS.map(([v, now, past, fut, es]) => (
                <tr key={v} className="border-separator border-t">
                  <td className="py-1.5 pr-3">
                    <b>{v}</b> <span className="text-label-2 block text-[12px]">{es}</span>
                  </td>
                  <td className="py-1.5 pr-3">{now}</td>
                  <td className="py-1.5 pr-3">{past}</td>
                  <td className="py-1.5">{fut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h4 className="text-headline">📺 Weather forecast</h4>
        <p className="text-label-2 text-[14px]">Elige una ciudad y escucha el pronóstico. Luego preséntalo tú en voz alta.</p>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto py-1">
          {FORECAST.map((c, i) => (
            <Chip key={c.city} active={city === i} onClick={() => setCity(i)}>
              {c.city}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 rounded-[16px] p-4" style={{ background: tint('var(--blue)', 10) }}>
          <div className="text-[44px] leading-none">{WEATHER_WORDS.find((w) => f.words.includes(w.w))?.emoji ?? '🌡️'}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[22px] font-extrabold">
              {f.city} · {f.temp}°C
            </div>
            <div className="text-[15px]">{forecastText(f)}</div>
          </div>
          <SpeakButton text={forecastText(f)} />
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-title-3">What’s the weather like?</h3>
          <Button size="sm" variant="plain" onClick={() => setK((x) => x + 1)}>
            <Shuffle size={15} /> Otras preguntas
          </Button>
        </div>
        <QuestionSet key={k} questions={quiz} color="var(--blue)" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- clothes --

const WEAR_QS: LibQuestion[] = WEARING_QUIZ.map((q) => ({ type: 'mc', q: q.q, options: q.options, answer: q.answer, explain_es: q.why }));

/** Wear vs put on vs take off (and friends), plus clothes by body part. */
export function WearingVerbs({ groups = true }: { groups?: boolean }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-title-3">👗 Wear, put on, take off</h3>
        <p className="text-label-2 mt-1 text-[14.5px]">En español decimos «ponerse», «usar», «llevar»… En inglés cada idea tiene su verbo: <b>wear</b> es un estado; <b>put on</b> y <b>take off</b> son acciones.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {WEARING_VERBS.map((v) => (
            <div key={v.v} className="bg-fill-2 rounded-[14px] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[16px] font-extrabold">{v.v}</span>
                <SpeakButton text={v.ex} size={16} />
              </div>
              <div className="text-ink-blue text-[13px] font-semibold">{v.es}</div>
              <div className="mt-1 text-[14px] italic">{v.ex}</div>
              <div className="text-label-2 mt-1 text-[12.5px]">{v.note}</div>
            </div>
          ))}
        </div>
      </Card>
      {groups && (
        <Card className="p-5">
          <h4 className="text-headline">Clothes from head to toe</h4>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {CLOTHES_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="text-[14px] font-bold">
                  {g.title} <span className="text-label-2 font-normal">· {g.es}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {g.items.map(([e, w, note]) => (
                    <button key={w} type="button" onClick={() => speak(w)} className="bg-fill-2 rounded-full px-3 py-1 text-[14px]">
                      {e} <b>{w}</b>
                      {note && <span className="text-label-2 text-[12px]"> · {note}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <QuestionSet questions={WEAR_QS} color="var(--pink)" />
    </div>
  );
}

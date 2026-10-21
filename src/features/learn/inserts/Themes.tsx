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
  CLOTHES_PIC,
  CONTINENTS,
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
  WEATHER_ICON,
  describe,
  flagImg,
  forecastText,
  mapImg,
  type Country,
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
const CREDIT = 'Imágenes e íconos: Freepik / Flaticon (presentaciones de clase).';

function Credit() {
  return <p className="text-label-3 mt-3 text-[11.5px]">{CREDIT}</p>;
}

/** A flag picture from the deck, or the emoji flag for countries without one. */
function Flag({ c, className }: { c: Country; className?: string }) {
  const src = flagImg(c);
  return src ? (
    <img src={src} alt="" loading="lazy" className={cn('h-9 w-auto object-contain', className)} />
  ) : (
    <span className={cn('text-[30px] leading-none', className)}>{c.flag}</span>
  );
}

export function CountriesNationalities({ continents = true }: { continents?: boolean }) {
  const [ending, setEnding] = useState<Ending | 'all'>('all');
  const [sel, setSel] = useState<string>('Colombia');
  const [k, setK] = useState(0);
  const list = COUNTRIES.filter((c) => ending === 'all' || c.ending === ending);
  const cur = COUNTRIES.find((c) => c.name === sel) ?? COUNTRIES[0]!;
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
  const open = (c: Country) => {
    setSel(c.name);
    speak(describe(c), { tier: 'premium' });
  };
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h3 className="text-title-3">🌍 Countries and nationalities</h3>
        <p className="text-label-2 mt-1 text-[14.5px]">
          El <b>país</b> es el lugar (<i>Colombia</i>); la <b>nacionalidad</b> es lo que eres por haber nacido o vivir allí (<i>Colombian</i>). En inglés las dos
          van con <b>mayúscula</b>: <i>I’m Colombian</i>, nunca <i>colombian</i>. Y ojo: “America” para un hablante de inglés suele significar Estados Unidos;
          di <b>South America</b>, <b>North America</b> o <b>Latin America</b>.
        </p>

        <div className="mt-4 grid gap-4 rounded-[18px] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:p-4" style={{ background: tint('var(--teal)', 10) }}>
          <div className="flex items-center justify-center overflow-hidden rounded-[14px] bg-white">
            {mapImg(cur) ? (
              <img key={cur.name} src={mapImg(cur)} alt={`Illustrated map of ${cur.name}`} className="h-56 w-full object-contain p-2 sm:h-64" />
            ) : (
              <span className="py-10 text-[96px] leading-none">{cur.flag}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Flag c={cur} className="h-12" />
              <div className="min-w-0">
                <div className="text-[22px] leading-tight font-extrabold capitalize">{cur.name.replace(/^the /, '')}</div>
                <div className="text-ink-teal text-[16px] font-bold">Nationality: {cur.nat}</div>
              </div>
              <SpeakButton text={describe(cur)} className="ml-auto" />
            </div>
            <p className="mt-3 text-[15px] leading-snug">{describe(cur)}</p>
            <p className="text-label-2 mt-2 text-[13px]">
              {cur.continent} · terminación <b>{cur.ending === 'other' ? 'irregular' : cur.ending}</b>
            </p>
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto py-1">
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
              onClick={() => open(c)}
              aria-pressed={sel === c.name}
              className={cn('bg-fill-2 flex items-center gap-2.5 rounded-[14px] p-2.5 text-left transition', sel === c.name && 'ring-ios-teal ring-2')}
            >
              <span className="flex h-10 w-12 shrink-0 items-center justify-center">
                <Flag c={c} className="max-h-10 max-w-12" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-bold capitalize">{c.name.replace(/^the /, '')}</span>
                <span className="text-ink-blue block truncate text-[13.5px] font-semibold">{c.nat}</span>
              </span>
            </button>
          ))}
        </div>
        {continents && (
          <>
            <h4 className="text-headline mt-5">The seven continents</h4>
            <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {CONTINENTS.map((c) => (
                <button key={c.name} type="button" onClick={() => speak(c.name)} className="bg-fill-2 w-[132px] shrink-0 rounded-[14px] p-1.5 text-left">
                  <img src={c.img} alt="" loading="lazy" className="h-24 w-full rounded-[10px] bg-white object-cover" />
                  <div className="px-1 pt-1 text-[13.5px] font-bold">{c.name}</div>
                  <div className="text-label-2 px-1 text-[12px]">{c.es}</div>
                </button>
              ))}
            </div>
            <p className="text-label-2 mt-2 text-[13px]">
              En la Tierra vivimos más de 8.000 millones de personas (<i>over eight billion people</i>).
            </p>
          </>
        )}
        <Credit />
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
  // The voice layer slows spelled letters down by itself (src/lib/tts: splitSpelled).
  const spell = (word: string) => speak(word.split('').map((c) => LETTER_NAMES[c.toLowerCase()] ?? c.toUpperCase()).join(', ') + '.', { tier: 'premium' });
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

/** A small picture tile on white (icons and photos from the class decks). */
function Pic({ src, emoji, className }: { src?: string; emoji?: string; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white', className)}>
      {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" /> : <span className="text-[28px] leading-none">{emoji}</span>}
    </span>
  );
}

/** Hot / warm / cool / cold / freezing with the deck's icons and Colombian examples. */
export function TemperatureScale() {
  return (
    <Card className="p-4 sm:p-5">
      <h4 className="text-headline">🌡️ ¿Qué tan caliente?</h4>
      <p className="text-label-2 mt-0.5 text-[13.5px]">Toca una temperatura para escuchar el ejemplo.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TEMPS.map((t) => (
          <button key={t.w} type="button" onClick={() => speak(t.ex)} className="overflow-hidden rounded-[14px] text-left text-white" style={{ background: t.color }}>
            <Pic src={t.img} className="m-1.5 mb-0 h-20 rounded-[10px]" />
            <div className="px-3 pt-1.5 pb-2.5">
              <div className="text-[18px] font-extrabold">{t.w}</div>
              <div className="text-[12.5px] opacity-90">{t.range}</div>
              <div className="mt-1 text-[13px] italic">{t.ex}</div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

/** Weather verbs in three tenses, with the deck's icons. */
export function WeatherVerbs() {
  return (
    <Card className="p-4 sm:p-5">
      <h4 className="text-headline">Weather verbs</h4>
      <p className="text-label-2 mt-0.5 text-[13.5px]">Con verbos también usamos <b>it</b>: <i>It’s raining. It snowed. It will hail.</i> Toca una frase para escucharla.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {WEATHER_VERBS.map(([v, now, past, fut, es]) => (
          <div key={v} className="bg-fill-2 flex gap-3 rounded-[14px] p-3">
            <Pic src={WEATHER_ICON[v]} className="h-16 w-16" />
            <div className="min-w-0 text-[13.5px] leading-snug">
              <div className="text-[16px] font-extrabold">
                {v} <span className="text-label-2 text-[12.5px] font-normal">· {es}</span>
              </div>
              {[now, past, fut].map((x) => (
                <button key={x} type="button" onClick={() => speak(x)} className="block text-left hover:underline">
                  {x}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** "Present the weather": pick a city and read its forecast aloud. */
export function WeatherForecast() {
  const [city, setCity] = useState(0);
  const f = FORECAST[city]!;
  const w = WEATHER_WORDS.find((x) => f.words.includes(x.w));
  return (
    <Card className="overflow-hidden">
      <div className="grid sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="p-4 sm:p-5">
          <h4 className="text-headline">📺 Weather forecast</h4>
          <p className="text-label-2 text-[14px]">Elige una ciudad y escucha el pronóstico. Luego preséntalo tú en voz alta, como en las noticias.</p>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto py-1">
            {FORECAST.map((c, i) => (
              <Chip key={c.city} active={city === i} onClick={() => setCity(i)}>
                {c.city}
              </Chip>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-[16px] p-3" style={{ background: tint('var(--blue)', 10) }}>
            <Pic src={w?.img} emoji={w?.emoji ?? '🌡️'} className="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <div className="text-[20px] font-extrabold">
                {f.city} · {f.temp}°C
              </div>
              <div className="text-[15px] leading-snug">{forecastText(f)}</div>
            </div>
            <SpeakButton text={forecastText(f)} />
          </div>
          <p className="text-label-2 mt-2 text-[13px]">
            Ojo: <i>Hace 12 grados</i> = <b>It’s 12 degrees</b>, no «It’s doing 12 degrees».
          </p>
        </div>
        <img src="/visuals/vocab/weather/presenter.webp" alt="" loading="lazy" className="hidden h-full w-full bg-white object-cover object-left sm:block" />
      </div>
    </Card>
  );
}

export function WeatherLesson() {
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
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h3 className="text-title-3">⛅ Weather and seasons</h3>
        <p className="text-label-2 mt-1 text-[14.5px]">
          Para el clima usamos <b>it</b>: <i>It’s sunny. It’s 25 degrees. It’s raining.</i> Nunca <i>“It’s doing 12 degrees”</i> ni <i>“Is sunny”</i>. Dicho
          popular: <i>It’s raining cats and dogs!</i> = está lloviendo a cántaros.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {SEASONS.map((s) => (
            <button key={s.name} type="button" onClick={() => speak(`${s.name}. ${s.body}`)} className="bg-fill-2 overflow-hidden rounded-[16px] p-1.5 text-left">
              <Pic src={s.img} emoji={s.emoji} className="h-24 w-full" />
              <div className="px-1.5 pt-2 pb-1">
                <div className="text-[15px] font-bold capitalize">
                  {s.name} <span className="text-label-2 text-[12.5px] font-normal">· {s.es}</span>
                </div>
                <div className="text-label-2 text-[12.5px]">{s.north} (hemisferio norte)</div>
                <div className="mt-1 text-[13.5px] leading-snug">{s.body}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-label-2 mt-2 text-[13px]">
          Las cuatro estaciones existen en las zonas templadas. Cerca del ecuador, como en Colombia, hay temporadas de lluvia (<i>rainy season</i>) y temporadas
          secas (<i>dry season</i>), y la temperatura cambia sobre todo con la altura.
        </p>
      </Card>

      <TemperatureScale />

      <Card className="p-4 sm:p-5">
        <h4 className="text-headline">Weather words</h4>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {WEATHER_WORDS.map((w) => (
            <button key={w.w} type="button" onClick={() => speak(w.ex)} className="bg-fill-2 flex items-center gap-2.5 rounded-[14px] p-2 text-left">
              <Pic src={w.img} emoji={w.emoji} className="h-14 w-14" />
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">{w.w}</span>
                <span className="text-label-2 block text-[12.5px] leading-snug">{w.ex}</span>
              </span>
            </button>
          ))}
        </div>
        <h4 className="text-headline mt-5">Natural phenomena</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEATHER_NOUNS.map(([e, w, es]) => (
            <button key={w} type="button" onClick={() => speak(w)} className="bg-fill-2 inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[13.5px]">
              <Pic src={WEATHER_ICON[w]} emoji={e} className="h-8 w-8 rounded-full" />
              <b>{w}</b> <span className="text-label-2">· {es}</span>
            </button>
          ))}
        </div>
        <p className="text-label-2 mt-3 text-[13px]">Adjetivo = sustantivo + -y: sun → sunny, cloud → cloudy, rain → rainy, wind → windy, fog → foggy (doble g).</p>
        <Credit />
      </Card>

      <WeatherVerbs />
      <WeatherForecast />

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

/** Wear vs put on vs take off (and friends), plus clothes from head to toe with the class photos. */
export function WearingVerbs({ groups = true }: { groups?: boolean }) {
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
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
        <Card className="p-4 sm:p-5">
          <h4 className="text-headline">Clothes from head to toe</h4>
          <p className="text-label-2 mt-0.5 text-[13.5px]">Toca una prenda para escucharla.</p>
          <div className="mt-2 space-y-4">
            {CLOTHES_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="text-[14px] font-bold">
                  {g.title} <span className="text-label-2 font-normal">· {g.es}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {g.items.map(([e, w, note]) => (
                    <button key={w} type="button" onClick={() => speak(w)} className="bg-fill-2 rounded-[14px] p-1.5 text-left">
                      <Pic src={CLOTHES_PIC[w]} emoji={e} className="aspect-square w-full" />
                      <div className="px-1 pt-1 text-[13.5px] leading-tight font-bold">{w}</div>
                      {note && <div className="text-label-2 px-1 text-[11.5px] leading-tight">{note}</div>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Credit />
        </Card>
      )}
      <QuestionSet questions={WEAR_QS} color="var(--pink)" />
    </div>
  );
}

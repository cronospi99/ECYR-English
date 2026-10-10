import { useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Headphones, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { useAsync } from '@/hooks/useAsync';
import { loadLevel } from '@/content/levels';
import { CEFR_LEVELS, type CefrLevel, type DialogueLine } from '@/content/types';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { speak, stopSpeaking } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { unitTitle } from '../learn/LevelPage';

export default function ListeningPage() {
  const [tab, setTab] = useState<'dialogues' | 'months'>('dialogues');
  return (
    <Page back={{ to: '/practice', label: 'Práctica' }} title="Listening" subtitle="Entrena el oído con diálogos, dictados y audios reales.">
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={[
          { value: 'dialogues', label: 'Diálogos y dictado' },
          { value: 'months', label: 'Audio real · Meses' },
        ]}
      />
      {tab === 'dialogues' ? <Dialogues /> : <Months />}
    </Page>
  );
}

// ---------------------------------------------------------------- dialogues --

interface Clip {
  id: string;
  title: string;
  unit: string;
  lines: DialogueLine[];
}

function Dialogues() {
  const [level, setLevel] = useState<CefrLevel>('A1');
  const { data, loading } = useAsync(() => loadLevel(level), [level]);
  const clips = useMemo<Clip[]>(
    () =>
      (data?.units ?? []).flatMap((u) =>
        u.grammar
          .filter((g) => g.dialogue && g.dialogue.length > 1)
          .map((g, k) => ({ id: `${level}-${u.n}-${k}`, title: g.name, unit: `U${u.n} · ${unitTitle(u.title)}`, lines: g.dialogue! })),
      ),
    [data, level],
  );
  const [sel, setSel] = useState<string | null>(null);
  const clip = clips.find((c) => c.id === sel) ?? clips[0];

  return (
    <>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
        {CEFR_LEVELS.map((l) => (
          <Chip
            key={l}
            active={level === l}
            onClick={() => {
              setLevel(l);
              setSel(null);
            }}
          >
            {l}
          </Chip>
        ))}
      </div>
      {loading || !clip ? (
        <PageLoader />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="max-h-[70vh] overflow-y-auto p-2">
            {clips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSel(c.id)}
                className={cn(
                  'w-full rounded-[12px] px-3 py-2.5 text-left transition-colors',
                  c.id === clip.id ? 'bg-ios-blue text-white' : 'hover:bg-fill-2',
                )}
              >
                <div className="truncate text-[15px] font-medium">{c.title}</div>
                <div className={cn('truncate text-[12px]', c.id === clip.id ? 'text-white/75' : 'text-label-2')}>{c.unit}</div>
              </button>
            ))}
          </Card>
          <DialoguePlayer key={clip.id} clip={clip} level={level} />
        </div>
      )}
    </>
  );
}

function keyWord(line: string) {
  const words = line.match(/[A-Za-z’']+/g) ?? [];
  return [...words].sort((a, b) => b.length - a.length)[0] ?? '';
}

function DialoguePlayer({ clip, level }: { clip: Clip; level: CefrLevel }) {
  const { speechRate } = useSettings();
  const [playing, setPlaying] = useState<number | null>(null);
  const [show, setShow] = useState(false);
  const [answers, setAnswers] = useState<string[]>(() => clip.lines.map(() => ''));
  const [checked, setChecked] = useState(false);
  const award = useProgress((s) => s.award);
  const speakers = [...new Set(clip.lines.map((l) => l.sp))];
  const gaps = clip.lines.map((l) => keyWord(l.line));

  const play = (k = 0, single = false) => {
    if (k >= clip.lines.length) return setPlaying(null);
    setPlaying(k);
    speak(clip.lines[k]!.line, {
      accent: speakers.indexOf(clip.lines[k]!.sp) % 2 ? 'en-GB' : 'en-US',
      rate: speechRate * 0.95,
      onEnd: () => (single ? setPlaying(null) : play(k + 1)),
    });
  };

  const check = () => {
    setChecked(true);
    const ok = gaps.filter((g, i) => norm(answers[i]!) === norm(g)).length;
    const score = Math.round((ok / gaps.length) * 100);
    award({ kind: 'listening', title: `Dictado: ${clip.title}`, skill: 'listening', xp: 10 + Math.round(score / 10), score, level, ref: 'practice:listening' });
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-label-2 text-[13px]">{clip.unit}</div>
          <h3 className="text-title-3">{clip.title}</h3>
        </div>
        <div className="flex gap-2">
          {playing === null ? (
            <Button onClick={() => play()}>
              <Play size={16} fill="currentColor" /> Reproducir
            </Button>
          ) : (
            <Button
              variant="gray"
              onClick={() => {
                stopSpeaking();
                setPlaying(null);
              }}
            >
              <Pause size={16} /> Parar
            </Button>
          )}
          <Button variant="gray" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar transcripción' : 'Ver transcripción'}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
      </div>

      <p className="text-label-2 mt-4 text-[14px]">
        <Headphones size={14} className="mr-1 inline" /> Escucha y escribe la palabra que falta en cada línea. Toca 🔊 para repetir una línea.
      </p>

      <ol className="mt-4 space-y-3">
        {clip.lines.map((l, i) => {
          const gap = gaps[i]!;
          const [before, ...rest] = l.line.split(gap);
          const after = rest.join(gap);
          const ok = norm(answers[i]!) === norm(gap);
          return (
            <li key={i} className={cn('rounded-[14px] p-3 transition-colors', playing === i ? 'bg-[color-mix(in_srgb,var(--blue)_10%,transparent)]' : 'bg-fill-2')}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-label-2 text-[12px] font-semibold">{l.sp}</span>
                <button type="button" onClick={() => play(i, true)} className="text-ios-blue" aria-label="Repetir línea">
                  <Volume2 size={15} />
                </button>
              </div>
              <div className="text-[16px] leading-loose">
                {show || checked ? before : before?.replace(/[^\s]/g, '·')}
                <input
                  value={answers[i]}
                  onChange={(e) => {
                    const n = [...answers];
                    n[i] = e.target.value;
                    setAnswers(n);
                    setChecked(false);
                  }}
                  aria-label={`Palabra que falta, línea ${i + 1}`}
                  autoCapitalize="off"
                  spellCheck={false}
                  className={cn(
                    'bg-card mx-1 h-8 w-32 rounded-[8px] px-2 text-center font-semibold outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]',
                    checked && (ok ? 'ring-ios-green text-ios-green ring-2' : 'ring-ios-red ring-2'),
                  )}
                />
                {show || checked ? after : after.replace(/[^\s]/g, '·')}
              </div>
              {checked && !ok && <div className="text-label-2 mt-1 text-[13px]">Era: <b className="text-label">{gap}</b></div>}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex gap-2">
        <Button onClick={check}>Comprobar</Button>
        <Button
          variant="gray"
          onClick={() => {
            setAnswers(clip.lines.map(() => ''));
            setChecked(false);
          }}
        >
          <RotateCcw size={15} /> Reiniciar
        </Button>
      </div>
    </Card>
  );
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").trim();

// ------------------------------------------------------------------- months --

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Months() {
  const award = useProgress((s) => s.award);
  const [round, setRound] = useState(0);
  const items = useMemo<(QuizItem & { m: string })[]>(() => {
    const order = [...MONTHS].sort(() => Math.random() - 0.5).slice(0, 6);
    return order.map((m) => {
      const idx = MONTHS.indexOf(m);
      const opts = new Set([MONTH_NAMES[idx]!]);
      while (opts.size < 4) opts.add(MONTH_NAMES[Math.floor(Math.random() * 12)]!);
      const options = [...opts].sort(() => Math.random() - 0.5);
      return { m, q: '¿De qué mes habla el audio?', options, answer: options.indexOf(MONTH_NAMES[idx]!) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="p-6">
        <h3 className="text-title-3">Los 12 meses en Colombia</h3>
        <p className="text-label-2 mt-1 text-[14px]">Grabaciones del juego Time Machine: escucha cada mes y su celebración.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MONTHS.map((m, i) => (
            <MonthTile key={m} m={m} name={MONTH_NAMES[i]!} />
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="text-title-3 mb-4">Quiz de audio</h3>
        <QuizWithAudio
          key={round}
          items={items}
          onFinish={(score) => award({ kind: 'listening', title: 'Quiz: meses del año', skill: 'listening', xp: 10 + Math.round(score / 10), score, level: 'A1', ref: 'practice:listening' })}
        />
        <Button variant="plain" className="mt-2" onClick={() => setRound((r) => r + 1)}>
          Nuevas preguntas
        </Button>
      </Card>
    </div>
  );
}

function MonthTile({ m, name }: { m: string; name: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const a = ref.current!;
        if (on) {
          a.pause();
          a.currentTime = 0;
          setOn(false);
        } else {
          void a.play();
          setOn(true);
        }
      }}
      className={cn('group relative aspect-[4/3] overflow-hidden rounded-[16px] text-left', on && 'ring-ios-blue ring-3')}
    >
      <img src={`/grammar/time-machine/months/${m}.webp`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute bottom-2 left-3 flex items-center gap-1.5 text-[15px] font-semibold text-white">
        {on ? <Pause size={15} /> : <Play size={15} fill="currentColor" />} {name}
      </span>
      <audio ref={ref} src={`/grammar/time-machine/audio/${m}.m4a`} preload="none" onEnded={() => setOn(false)} />
    </button>
  );
}

function QuizWithAudio({ items, onFinish }: { items: (QuizItem & { m: string })[]; onFinish: (s: number) => void }) {
  const [i, setI] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  return (
    <div>
      <div className="bg-fill-2 mb-4 flex items-center gap-3 rounded-[14px] p-3">
        <Button size="sm" onClick={() => void audio.current?.play()}>
          <Play size={14} fill="currentColor" /> Escuchar audio
        </Button>
        <span className="text-label-2 text-[13px]">Pregunta {Math.min(i + 1, items.length)}</span>
        <audio ref={audio} src={`/grammar/time-machine/audio/${items[Math.min(i, items.length - 1)]!.m}.m4a`} preload="auto" />
      </div>
      <QuizTracker items={items} onIndex={setI} onFinish={onFinish} />
    </div>
  );
}

/** Wraps Quiz to expose the current index (so the audio follows the question). */
function QuizTracker({ items, onIndex, onFinish }: { items: QuizItem[]; onIndex: (i: number) => void; onFinish: (s: number) => void }) {
  const wrapped = useMemo(
    () =>
      items.map((it, k) => ({
        ...it,
        explain: `Era ${it.options[it.answer]}.`,
        context: undefined,
        q: `${k + 1}. ${it.q}`,
      })),
    [items],
  );
  return <Quiz items={wrapped} onFinish={onFinish} onIndexChange={onIndex} />;
}

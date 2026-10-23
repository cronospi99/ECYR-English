import { Fragment, lazy, Suspense, useMemo, useState } from 'react';

import { Check, ChevronDown, Clipboard, Dices, DoorClosed, DoorOpen, Lightbulb, Minus, Plus, School, Sparkles, Trophy, Users, Wand2, Zap } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { useClass } from './useClass';
import { levelMeta, loadLevel } from '@/content/levels';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { supabase } from '@/lib/supabase';
import { STYLES, buildLocal, buildWithAi, threadToText, type Activity, type Chapter, type Thread, type ThreadStyle } from '@/lib/lessonThread';
import { unitTitle } from '@/features/learn/LevelPage';
import { cn } from '@/lib/cn';
import { AUDIENCES, EMPTY_MIX, balanceTeams, isIntergenerational, mixTotal, suggestedTeams, type Mix } from '@/lib/engagement';


const TeamChallenge = lazy(() => import('./TeamChallenge').then((m) => ({ default: m.TeamChallenge })));
import { ink, tint } from '@/lib/color';

const MAX_UNITS = 4;
const STAGE_EMOJI: Record<string, string> = { Inicio: '🌱', Nudo: '🌿', Giro: '🌀', Desenlace: '🌳', 'Todo en uno': '🌳' };

/**
 * Class thread (teachers only): one level, up to four of its units and an
 * optional topic become one story, each unit a branch, with a 5-minute opener
 * and closer. Shown as a thread: opener → branches → closer.
 */
export default function LessonThreadPage() {
  const { isTeacher } = useClass();
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [picked, setPicked] = useState<number[]>([1]);
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<ThreadStyle>('story');
  const [mix, setMix] = useState<Mix>({ ...EMPTY_MIX, teens: 12 });
  const total = mixTotal(mix);
  const [seed, setSeed] = useState(0);
  const [thread, setThread] = useState<Thread | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState(false);
  const { data: book, loading } = useAsync(() => loadLevel(level), [level]);
  const units = useMemo(() => (book?.units ?? []).filter((u) => picked.includes(u.n)).sort((a, b) => a.n - b.n), [book, picked]);
  const color = levelMeta(level)?.color ?? 'var(--purple)';

  if (!isTeacher)
    return (
      <Page title="Hilo de clase">
        <Card className="mx-auto max-w-md p-6 text-center">
          <School size={40} className="text-ink-orange mx-auto" />
          <h2 className="text-title-3 mt-3">Solo para docentes</h2>
          <ButtonLink to="/profile" className="mt-4">
            Ir a mi perfil
          </ButtonLink>
        </Card>
      </Page>
    );

  const toggle = (n: number) =>
    setPicked((p) => (p.includes(n) ? (p.length > 1 ? p.filter((x) => x !== n) : p) : p.length >= MAX_UNITS ? [...p.slice(1), n] : [...p, n]));
  const input = (s: number) => ({ level, units, topic: topic.trim(), style, mix, seed: s });
  const local = (s = seed) => {
    setError(null);
    setThread(buildLocal(input(s)));
  };
  const withAi = async () => {
    setBusy(true);
    setError(null);
    try {
      setThread(await buildWithAi(input(seed)));
    } catch (e) {
      setError((e as Error).message);
      setThread(buildLocal(input(seed)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page back={{ to: '/teacher?tab=material', label: 'Sala del docente' }} eyebrow="Solo docentes" title="Hilo de clase" subtitle="Una historia que engancha, varias unidades, un reto por equipos y cierre en 5 minutos." wide>
      <Card className="mb-6 space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
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
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de hilo">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={style === s.id}
                onClick={() => setStyle(s.id)}
                title={s.label}
                className={cn('flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors', style === s.id ? 'text-white' : 'bg-fill-2 hover:bg-fill')}
                style={style === s.id ? { background: ink(color) } : undefined}
              >
                <span aria-hidden>{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        <MixPicker mix={mix} onChange={setMix} color={color} />

        {loading || !book ? (
          <PageLoader />
        ) : (
          <div>
            <div className="text-label-2 mb-2 text-[12px] font-semibold tracking-wide uppercase">
              Unidades · {picked.length}/{MAX_UNITS}
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
              {book.units.map((u) => {
                const k = picked.indexOf(u.n);
                const on = k >= 0;
                return (
                  <button
                    key={u.n}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(u.n)}
                    title={u.theme}
                    className={cn('flex min-w-0 items-center gap-2 rounded-[12px] p-1.5 pr-2.5 text-left text-[13px] transition-colors', on ? 'font-semibold' : 'bg-fill-2/60 hover:bg-fill-2')}
                    style={on ? { background: tint(color, 16), boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
                  >
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                      style={on ? { background: ink(color), color: '#fff' } : { background: 'var(--fill-2)' }}
                    >
                      {on ? k + 1 : u.n}
                    </span>
                    <span className="truncate">{unitTitle(u.title)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={120}
            aria-label="Tema o idea (opcional)"
            placeholder="Tema o idea (opcional): una fiesta sorpresa, un viaje…"
            className="bg-fill-2 placeholder:text-label-3 h-10 min-w-0 flex-1 basis-60 rounded-[12px] px-3.5 text-[15px] outline-none focus:ring-2"
          />
          <Button onClick={() => local()} disabled={!units.length || !total}>
            <Wand2 size={17} /> Generar
          </Button>
          <Button variant="tinted" onClick={() => void withAi()} disabled={!units.length || !total || busy || !supabase} title="Gemini escribe la historia completa al nivel">
            <Sparkles size={17} /> {busy ? 'Escribiendo…' : 'Con IA'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-ink-red text-[14px]">
            {error}
          </p>
        )}
      </Card>

      {thread && (
        <Plan
          t={thread}
          color={color}
          onAnother={() => {
            setSeed(seed + 1);
            local(seed + 1);
          }}
          onChallenge={() => setGame(true)}
        />
      )}
      {thread && game && (
        <Suspense fallback={null}>
          <TeamChallenge
            audience={thread.audience}
            mix={thread.mix}
            level={thread.level}
            vocab={thread.chapters.flatMap((c) => c.vocab)}
            grammar={thread.chapters.flatMap((c) => c.grammar)}
            onClose={() => setGame(false)}
          />
        </Suspense>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ result --

function Plan({ t, color, onAnother, onChallenge }: { t: Thread; color: string; onAnother: () => void; onChallenge: () => void }) {
  const [copied, setCopied] = useState(false);
  const st = STYLES.find((s) => s.id === t.style)!;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(threadToText(t));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-[22px] p-5 text-white" style={{ background: `linear-gradient(135deg, ${ink(color)}, color-mix(in srgb, ${ink(color)} 55%, #000))` }}>
        <span aria-hidden className="pointer-events-none absolute -top-3 -right-2 text-[96px] leading-none opacity-20">
          {st.emoji}
        </span>
        <div className="text-[12px] font-semibold tracking-wide uppercase opacity-80">
          {t.level} · {st.label} {t.source === 'ia' && '· IA'}
        </div>
        <h2 className="mt-1 text-[26px] leading-tight font-bold">{t.title}</h2>
        <p className="mt-1.5 max-w-xl text-[15px] opacity-90">{t.premise}</p>
        <div className="mt-3 flex max-w-xl items-start gap-2 rounded-[14px] bg-white/15 px-3 py-2 text-[14.5px]">
          <span aria-hidden>🎣</span>
          <span>
            <b>Gancho (30 s):</b> {t.hook}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {t.characters.map((c) => (
            <span key={c.name} title={c.role} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1 pr-3 pl-1 text-[13px]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-bold" style={{ color: ink(color) }}>
                {c.name[0]}
              </span>
              {c.name}
            </span>
          ))}
          <span className="ml-auto flex gap-1.5">
            <button type="button" onClick={onAnother} title="Otra idea" aria-label="Otra idea" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              <Dices size={17} />
            </button>
            <button type="button" onClick={() => void copy()} title="Copiar plan" aria-label="Copiar plan" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              {copied ? <Check size={17} /> : <Clipboard size={17} />}
            </button>
          </span>
        </div>
      </div>

      {t.story && (
        <details className="bg-card shadow-card group mt-4 rounded-[18px] p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
            📖 Leer la historia <ChevronDown size={16} className="text-label-2 ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-2 text-[15.5px] leading-relaxed">
            {t.story.split(/\n+/).map((p, i) => (
              <p key={i} className={/^(chapter|capítulo)\b/i.test(p) ? 'pt-1 text-[13px] font-semibold uppercase' : undefined} style={/^(chapter|capítulo)\b/i.test(p) ? { color: ink(color) } : undefined}>
                {p}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* The thread: a line with the opener, one node per unit, the closer. */}
      <ol className="relative mt-6 space-y-4 pl-9">
        <span aria-hidden className="absolute top-3 bottom-3 left-[15px] w-[3px] rounded-full" style={{ background: tint(color, 35) }} />
        <Node icon={<DoorOpen size={16} />} color={color}>
          <Moment label="Abrir clase" a={t.opener} color={color} />
        </Node>
        {t.chapters.map((c, i) => (
          <Fragment key={c.unit}>
            <Node icon={<span className="text-[15px]">{STAGE_EMOJI[c.stage] ?? '🌿'}</span>} color={color} soft>
              <Branch c={c} color={color} />
            </Node>
            {i === Math.max(0, Math.ceil(t.chapters.length / 2) - 1) && (
              <Node icon={<Zap size={16} />} color="var(--orange)">
                <div className="flex items-start gap-3 rounded-[18px] p-4" style={{ background: tint('var(--orange)', 14) }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold tracking-wide uppercase" style={{ color: ink('var(--orange)') }}>
                      Energizante · {t.energizer.minutes} min
                    </div>
                    <div className="text-headline mt-0.5">{t.energizer.title}</div>
                    <p className="mt-1 text-[14.5px]">{t.energizer.how}</p>
                  </div>
                </div>
              </Node>
            )}
          </Fragment>
        ))}
        <Node icon={<Trophy size={16} />} color="var(--pink)">
          <button
            type="button"
            onClick={onChallenge}
            className="group flex w-full items-center gap-4 rounded-[18px] p-4 text-left text-white transition-transform active:scale-[0.99]"
            style={{ background: 'linear-gradient(120deg, #5e2bff, #ff2d8a)' }}
          >
            <span className="text-[40px] leading-none transition-transform group-hover:scale-110" aria-hidden>
              🏆
            </span>
            <span className="min-w-0">
              <span className="block text-[18px] font-bold">Reto por equipos</span>
              <span className="block text-[14px] opacity-85">Mímica, tabú, dibujo, duelos… con el vocabulario de hoy. Proyéctalo.</span>
            </span>
          </button>
          <TeamsPreview mix={t.mix} />
        </Node>
        <Node icon={<DoorClosed size={16} />} color={color}>
          <Moment label="Cerrar clase" a={t.closer} color={color} />
        </Node>
      </ol>

      <ul className="mt-5 flex flex-col gap-1.5 text-[14px]">
        {t.tips.map((x) => (
          <li key={x} className="text-label-2 flex items-start gap-2">
            <Lightbulb size={15} className="text-ink-yellow mt-0.5 shrink-0" /> {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Node({ icon, color, soft, children }: { icon: React.ReactNode; color: string; soft?: boolean; children: React.ReactNode }) {
  return (
    <li className="relative">
      <span
        className="absolute top-3 -left-9 inline-flex h-[33px] w-[33px] items-center justify-center rounded-full ring-4 ring-[var(--bg)]"
        style={soft ? { background: tint(color, 20), color: ink(color) } : { background: ink(color), color: '#fff' }}
      >
        {icon}
      </span>
      {children}
    </li>
  );
}

/** Opener or closer: a minute bar and short steps. */
function Moment({ label, a, color }: { label: string; a: Activity; color: string }) {
  const total = a.steps.reduce((n, s) => n + s.min, 0) || 1;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-headline">
          <span className="text-label-2 mr-1.5 text-[12px] font-semibold tracking-wide uppercase">{label}</span>
          {a.title}
        </h3>
        <span className="shrink-0 text-[13px] font-semibold" style={{ color: ink(color) }}>
          ⏱ {a.minutes} min
        </span>
      </div>
      <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full" aria-hidden>
        {a.steps.map((s, i) => (
          <span key={i} className="rounded-full" style={{ flex: s.min || 0.5, background: tint(color, 30 + i * 22) }} />
        ))}
      </div>
      <ol className="mt-2.5 space-y-1.5">
        {a.steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[14.5px]">
            <span className="text-label-2 w-9 shrink-0 text-[12px] leading-[22px] font-semibold tabular-nums">{s.min}′</span>
            <span className="min-w-0">{s.text}</span>
          </li>
        ))}
      </ol>
      {a.questions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {a.questions.map((q) => (
            <span key={q} className="bg-fill-2 rounded-[10px] px-2.5 py-1 text-[13.5px]">
              {q}
            </span>
          ))}
        </div>
      )}
      <span className="sr-only">{total} minutos</span>
    </Card>
  );
}

/** One unit = one branch of the story. */
function Branch({ c, color }: { c: Chapter; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase" style={{ background: tint(color, 16), color: ink(color) }}>
          {c.stage}
        </span>
        <span className="text-label-2 text-[13px]">
          U{c.unit} · {c.unitTitle}
        </span>
      </div>
      <p className="mt-2 text-[16px] leading-snug font-semibold text-pretty">{c.scene}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {c.vocab.slice(0, 6).map((v) => (
          <span key={v} className="bg-fill-2 rounded-full px-2.5 py-0.5 text-[13px]">
            {v}
          </span>
        ))}
        {c.grammar.map((g) => (
          <span key={g} className="rounded-full px-2.5 py-0.5 text-[13px] font-medium" style={{ background: tint(color, 14), color: ink(color) }}>
            {g}
          </span>
        ))}
      </div>
      <p className="text-label-2 mt-2.5 text-[13.5px]">👉 {c.cue}</p>
      <ul className="mt-2 space-y-1">
        {c.questions.map((q) => (
          <li key={q} className="text-[14.5px]">
            <span aria-hidden className="mr-1.5">
              ❓
            </span>
            {q}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// -------------------------------------------------------------- class mix --

/** How many students of each age group: a stepper per group. */
function MixPicker({ mix, onChange, color }: { mix: Mix; onChange: (m: Mix) => void; color: string }) {
  const total = mixTotal(mix);
  const set = (id: keyof Mix, n: number) => onChange({ ...mix, [id]: Math.max(0, Math.min(60, n)) });
  return (
    <div>
      <div className="text-label-2 mb-2 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase">
        <Users size={14} /> Estudiantes · {total}
        {isIntergenerational(mix) && <span className="bg-fill-2 text-label rounded-full px-2 py-0.5 text-[11px] normal-case">Grupo intergeneracional</span>}
      </div>
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
        {AUDIENCES.map((a) => {
          const n = mix[a.id] || 0;
          const on = n > 0;
          return (
            <div
              key={a.id}
              className={cn('flex flex-col gap-1.5 rounded-[14px] p-2 transition-colors', !on && 'bg-fill-2/60')}
              style={on ? { background: tint(color, 14), boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-[22px]" aria-hidden>
                  {a.emoji}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[13.5px] font-semibold">{a.label}</span>
                  <span className="text-label-2 block text-[11.5px]">{a.ages} años</span>
                </span>
              </span>
              <span className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => set(a.id, n - 1)}
                  disabled={!n}
                  aria-label={`Menos ${a.label.toLowerCase()}`}
                  className="bg-card inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <input
                  value={n}
                  onChange={(e) => set(a.id, Number(e.target.value.replace(/\D/g, '')) || 0)}
                  inputMode="numeric"
                  aria-label={`Número de ${a.label.toLowerCase()}`}
                  className="w-8 bg-transparent text-center text-[15px] font-bold tabular-nums outline-none"
                  style={on ? { color: ink(color) } : undefined}
                />
                <button type="button" onClick={() => set(a.id, n + 1)} aria-label={`Más ${a.label.toLowerCase()}`} className="bg-card inline-flex h-7 w-7 items-center justify-center rounded-full">
                  <Plus size={14} />
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {total > 0 && <MixBar mix={mix} />}
    </div>
  );
}

const MIX_COLORS: Record<keyof Mix, string> = { kids: '#ffb340', teens: '#bf5af2', young: '#0a84ff', adults: '#30b0a0' };

/** The class as a proportional bar. */
function MixBar({ mix }: { mix: Mix }) {
  const total = mixTotal(mix);
  return (
    <div className="mt-2 flex h-2 overflow-hidden rounded-full" aria-hidden>
      {AUDIENCES.filter((a) => mix[a.id]).map((a) => (
        <span key={a.id} style={{ flex: mix[a.id], background: MIX_COLORS[a.id] }} title={`${a.label}: ${Math.round((mix[a.id] / total) * 100)}%`} />
      ))}
    </div>
  );
}

/** Suggested balanced teams for the challenge. */
function TeamsPreview({ mix }: { mix: Mix }) {
  const total = mixTotal(mix);
  const n = suggestedTeams(total);
  const teams = balanceTeams(mix, n);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
      <span className="text-label-2 font-semibold">
        {n} equipos para {total}:
      </span>
      {teams.map((t, k) => (
        <span key={k} className="bg-card shadow-card inline-flex items-center gap-1 rounded-full px-2.5 py-1">
          <b className="mr-0.5">{['🦁', '🦊', '🐼', '🐸'][k]}</b>
          {AUDIENCES.filter((a) => t[a.id]).map((a) => (
            <span key={a.id}>
              {t[a.id]}
              {a.emoji}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, Lightbulb, RotateCcw, Shuffle, Undo2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { QuestionSet } from '@/components/learning/QuestionSet';
import type { LibQuestion } from '@/content/library';
import { speak } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { tint } from '@/lib/color';
import {
  ADV_QUESTIONS,
  ADVERB_CHOICES,
  BANDS,
  BUILDER_ITEMS,
  DAYS_TO_ADVERB,
  DETECTIVE_POOL,
  LABELS,
  NODE_H,
  NODE_W,
  SCALE,
  SOLO_PARENTS,
  STAGE_H,
  STAGE_W,
  TREE_NODES,
  UNIONS,
  type TileKind,
} from './frequencyFamilyData';

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};

const SCALE_COLORS = ['#1f8a3d', '#2e9d5b', '#1a7f92', '#0060d6', '#c2410c', '#be123c'];

/** The frequency scale (100% → 0%) and where the adverb goes. */
export function FrequencyScale() {
  return (
    <Card className="p-5">
      <h3 className="text-title-3">📊 ¿Con qué frecuencia?</h3>
      <p className="text-label-2 text-[14px]">De 100% a 0%. Toca una fila para escuchar el ejemplo.</p>
      <div className="mt-3 space-y-2">
        {SCALE.map((s, i) => (
          <button key={s.adv} type="button" onClick={() => speak(s.ex.join(' '))} className="flex w-full items-center gap-3 text-left">
            <span className="w-11 shrink-0 text-right text-[13px] font-bold tabular-nums">{s.pct}%</span>
            <span className="bg-fill-2 relative h-9 min-w-0 flex-1 overflow-hidden rounded-[10px]">
              <span className="absolute inset-y-0 left-0 rounded-[10px]" style={{ width: `${Math.max(s.pct, 6)}%`, background: tint(SCALE_COLORS[i]!, 30) }} />
              <span className="relative flex h-full items-center gap-2 px-3 text-[14.5px]">
                <b style={{ color: SCALE_COLORS[i] }}>{s.adv}</b>
                <span className="text-label-2 hidden truncate sm:inline">
                  {s.ex[0]} <b>{s.ex[1]}</b> {s.ex[2]}
                </span>
              </span>
            </span>
            <span className="text-label-2 hidden w-24 shrink-0 text-[12.5px] md:block">{s.es}</span>
          </button>
        ))}
      </div>
      <h4 className="text-headline mt-5">🔤 Orden de las palabras</h4>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {[
          { t: '✅ Afirmativa', f: ['Subject', 'adverb', 'verb'], ex: 'He often cooks pasta.' },
          { t: '🔵 Con BE', f: ['Subject', 'be', 'adverb'], ex: 'You are always late.' },
          { t: '❓ Pregunta', f: ['Auxiliary', 'subject', 'adverb'], ex: 'Does he often cook?' },
        ].map((r) => (
          <div key={r.t} className="bg-fill-2 rounded-[14px] p-3">
            <div className="text-[14px] font-bold">{r.t}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[13px]">
              {r.f.map((w, k) => (
                <span key={w} className="inline-flex items-center gap-1">
                  <span className={cn('rounded-full px-2 py-0.5 font-semibold', w === 'adverb' ? 'text-white' : 'bg-card')} style={w === 'adverb' ? { background: 'var(--purple)' } : undefined}>
                    {w}
                  </span>
                  {k < r.f.length - 1 && '→'}
                </span>
              ))}
            </div>
            <div className="mt-1.5 text-[14px] italic">{r.ex}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-[14px] p-3 text-[14px]" style={{ background: tint('var(--red)', 10) }}>
        ⚠️ <b>Never</b> y <b>hardly ever</b> ya son negativos: el verbo va en positivo. <span className="line-through opacity-70">He isn’t never late.</span> →{' '}
        <b>He is never late.</b> · <span className="line-through opacity-70">They don’t hardly ever go.</span> → <b>They hardly ever go.</b>
      </div>
    </Card>
  );
}

/** Six random gap sentences about habits and family. */
export function FrequencyQuiz() {
  const [k, setK] = useState(0);
  const qs = useMemo<LibQuestion[]>(
    () =>
      shuffle(ADV_QUESTIONS)
        .slice(0, 6)
        .map((q) => {
          const options = shuffle([q.answer, ...q.wrong]);
          return { type: 'mc', q: q.text, options, answer: options.indexOf(q.answer), explain_es: `La pista de frecuencia indica “${q.answer}”.` };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [k],
  );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-title-3">🎯 Elige el adverbio</h3>
        <Button size="sm" variant="plain" onClick={() => setK((x) => x + 1)}>
          <Shuffle size={15} /> Nuevas preguntas
        </Button>
      </div>
      <QuestionSet key={k} questions={qs} color="var(--purple)" />
    </div>
  );
}

/** Read a week of green days, then name the habit with the right adverb. */
export function FrequencyDetective() {
  const [seed, setSeed] = useState(0);
  const cases = useMemo(
    () =>
      shuffle(DETECTIVE_POOL)
        .slice(0, 4)
        .map((c) => ({ ...c, week: shuffle(Array.from({ length: 7 }, (_, d) => d < c.days)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );
  const [picks, setPicks] = useState<Record<number, string>>({});
  const right = cases.filter((c, i) => picks[i] === DAYS_TO_ADVERB[c.days]).length;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-title-3">🔍 Frequency Detective</h3>
          <p className="text-label-2 text-[14px]">Cuenta los días en verde y elige el adverbio que describe el hábito.</p>
        </div>
        <Button size="sm" variant="gray" onClick={() => (setSeed((s) => s + 1), setPicks({}))}>
          <Shuffle size={15} /> Nueva familia
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {cases.map((c, i) => {
          const ans = DAYS_TO_ADVERB[c.days]!;
          const p = picks[i];
          return (
            <div key={`${seed}-${i}`} className="bg-fill-2 rounded-[14px] p-3">
              <div className="text-[15px] font-semibold">
                {c.emoji} {c.who} ____ {c.act}.
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d, k) => (
                  <div key={d} className={cn('rounded-[8px] py-1.5 text-center text-[11px] font-bold', c.week[k] ? 'text-white' : 'bg-card text-label-3')} style={c.week[k] ? { background: 'var(--green)' } : undefined}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ADVERB_CHOICES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    disabled={!!p}
                    onClick={() => {
                      setPicks((x) => ({ ...x, [i]: a }));
                      if (a === ans) speak(`${c.who} ${ans} ${c.act}.`);
                    }}
                    className={cn('rounded-full px-3 py-1 text-[13px] font-semibold', p && a === ans ? 'bg-ios-green text-white' : p === a ? 'bg-ios-red text-white' : 'bg-card')}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {p && (
                <div className={cn('mt-2 text-[14px]', p === ans ? 'text-ink-green' : 'text-ink-red')}>
                  {p === ans ? '✓' : '✗'} {c.who} <b>{ans}</b> {c.act}. ({c.days}/7 días)
                </div>
              )}
            </div>
          );
        })}
      </div>
      {Object.keys(picks).length === cases.length && (
        <p className="mt-3 text-[16px] font-bold">
          {right}/{cases.length} {right === cases.length ? '🏆' : '👏'}
        </p>
      )}
    </Card>
  );
}

const TILE_COLOR: Record<TileKind, string> = { person: 'var(--blue)', adverb: 'var(--purple)', verb: 'var(--green)', aux: 'var(--orange)', rest: 'var(--teal)' };

/** Put the words in order; the adverb has one right place and two extra adverbs don't belong. */
export function RoutineBuilder() {
  const [i, setI] = useState(0);
  const item = BUILDER_ITEMS[i]!;
  const pool = useMemo(() => shuffle([...item.tiles.map(([t, k]) => ({ t, k })), ...item.decoys.map((t) => ({ t, k: 'adverb' as TileKind }))]), [item]);
  const [built, setBuilt] = useState<number[]>([]);
  const [state, setState] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [hint, setHint] = useState(false);
  const award = useProgress((s) => s.award);
  const target = item.tiles.map(([t]) => t).join(' ');
  const sentence = built.map((k) => pool[k]!.t).join(' ');
  useEffect(() => {
    setBuilt([]);
    setState('idle');
    setHint(false);
  }, [i]);
  const check = () => {
    const ok = sentence === target;
    setState(ok ? 'ok' : 'bad');
    if (ok) speak(target + item.end);
    if (ok && i === BUILDER_ITEMS.length - 1) award({ kind: 'game', title: 'Routine Builder', skill: 'grammar', xp: 10, ref: 'frequency:builder' });
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title-3">🧩 Routine Builder</h3>
        <span className="text-label-2 text-[13px] font-semibold tabular-nums">
          {i + 1} / {BUILDER_ITEMS.length}
        </span>
      </div>
      <p className="text-label-2 text-[14px]">
        Ordena la frase. Ojo: el adverbio tiene un solo lugar correcto y sobran dos adverbios. <b>{item.pct}</b> del tiempo · {item.kind}
      </p>
      <div className="bg-fill-2 mt-3 flex min-h-[52px] flex-wrap items-center gap-1.5 rounded-[14px] p-2">
        {built.length ? (
          built.map((k, j) => (
            <button key={j} type="button" onClick={() => (setBuilt((b) => b.filter((_, x) => x !== j)), setState('idle'))} className="rounded-[9px] px-2.5 py-1 text-[14.5px] font-semibold text-white" style={{ background: TILE_COLOR[pool[k]!.k] }}>
              {pool[k]!.t}
            </button>
          ))
        ) : (
          <span className="text-label-3 px-1 text-[13px]">Toca las fichas en orden…</span>
        )}
        {built.length > 0 && <span className="text-[16px] font-bold">{item.end}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pool.map((p, k) =>
          built.includes(k) ? null : (
            <button key={k} type="button" onClick={() => (setBuilt((b) => [...b, k]), setState('idle'))} className="bg-card shadow-card rounded-[9px] px-2.5 py-1 text-[14.5px] font-medium" style={{ boxShadow: `inset 0 -3px 0 ${TILE_COLOR[p.k]}` }}>
              {p.t}
            </button>
          ),
        )}
      </div>
      {hint && <p className="mt-2 text-[14px]">💡 {item.tip}</p>}
      {state !== 'idle' && (
        <p className={cn('mt-2 text-[14.5px] font-semibold', state === 'ok' ? 'text-ink-green' : 'text-ink-red')}>
          {state === 'ok' ? `✓ ${target}${item.end}` : 'Todavía no. Revisa dónde va el adverbio.'}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={check} disabled={!built.length}>
          <Check size={15} /> Comprobar
        </Button>
        <Button size="sm" variant="gray" onClick={() => (setBuilt([]), setState('idle'))}>
          <Undo2 size={15} /> Borrar
        </Button>
        <Button size="sm" variant="gray" onClick={() => setHint(true)}>
          <Lightbulb size={15} /> Pista
        </Button>
        {state === 'ok' && i < BUILDER_ITEMS.length - 1 && (
          <Button size="sm" variant="tinted" onClick={() => setI(i + 1)}>
            Siguiente →
          </Button>
        )}
        {state === 'ok' && i === BUILDER_ITEMS.length - 1 && (
          <Button size="sm" variant="tinted" onClick={() => setI(0)}>
            <RotateCcw size={15} /> Empezar de nuevo
          </Button>
        )}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- family tree --

type Focus = 'all' | 'paternal' | 'maternal' | 'inlaws' | 'mine';
const byId = new Map(TREE_NODES.map((n) => [n.id, n]));

/** Five generations around "you": tap a label, then a box. Dad's side, mum's side and in-laws. */
export function FamilyTreePuzzle() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [chip, setChip] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [focus, setFocus] = useState<Focus>('all');
  const [info, setInfo] = useState<string | null>(null);
  const award = useProgress((s) => s.award);
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / STAGE_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const need = (w: string) => TREE_NODES.filter((n) => n.answer === w).length;
  const used = (w: string) => Object.values(answers).filter((v) => v === w).length;
  const shown = (id: string) => focus === 'all' || byId.get(id)!.side.includes(focus);
  const total = TREE_NODES.filter((n) => n.answer).length;
  const right = TREE_NODES.filter((n) => n.answer && answers[n.id] === n.answer).length;

  const place = (id: string) => {
    const n = byId.get(id)!;
    if (!n.answer) return setInfo(n.rel);
    if (checked) return setInfo(n.rel);
    if (!chip) {
      if (answers[id]) setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== id)));
      return;
    }
    setAnswers((a) => ({ ...a, [id]: chip }));
    speak(`${n.name}. ${chip}.`);
    if (used(chip) + (answers[id] === chip ? 0 : 1) >= need(chip)) setChip(null);
  };
  const check = () => {
    setChecked(true);
    award({ kind: 'game', title: 'Family Tree Puzzle', skill: 'vocabulary', xp: 15, score: Math.round((right / total) * 100), ref: 'family:tree-puzzle' });
  };

  const lines = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; kind: 'couple' | 'down' }[] = [];
    for (const u of UNIONS) {
      const a = byId.get(u.a)!;
      const b = byId.get(u.b)!;
      out.push({ x1: a.x + NODE_W / 2, y1: a.y, x2: b.x - NODE_W / 2, y2: b.y, kind: 'couple' });
      if (!u.children.length) continue;
      const mx = (a.x + b.x) / 2;
      const kids = u.children.map((c) => byId.get(c)!);
      const barY = kids[0]!.y - NODE_H / 2 - 22;
      out.push({ x1: mx, y1: a.y, x2: mx, y2: barY, kind: 'down' });
      const xs = [mx, ...kids.map((k) => k.x)];
      out.push({ x1: Math.min(...xs), y1: barY, x2: Math.max(...xs), y2: barY, kind: 'down' });
      for (const k of kids) out.push({ x1: k.x, y1: barY, x2: k.x, y2: k.y - NODE_H / 2, kind: 'down' });
    }
    for (const s of SOLO_PARENTS) {
      const p = byId.get(s.p)!;
      for (const c of s.children) {
        const k = byId.get(c)!;
        out.push({ x1: p.x, y1: p.y + NODE_H / 2, x2: k.x, y2: k.y - NODE_H / 2, kind: 'down' });
      }
    }
    return out;
  }, []);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-title-3">🌳 Family Tree Puzzle</h3>
          <p className="text-label-2 text-[14px]">Tú eres la estrella dorada ⭐. Toca una etiqueta y luego la casilla de la persona.</p>
        </div>
        <span className="text-[15px] font-bold tabular-nums">{checked ? `${right}/${total}` : `${Object.keys(answers).length}/${total}`}</span>
      </div>
      <div className="no-scrollbar mt-3 overflow-x-auto">
        <Segmented<Focus>
          size="sm"
          value={focus}
          onChange={setFocus}
          options={[
            { value: 'all', label: '🌍 Todos' },
            { value: 'paternal', label: '👨 Lado del papá' },
            { value: 'maternal', label: '👩 Lado de la mamá' },
            { value: 'inlaws', label: '💍 Familia política' },
            { value: 'mine', label: '👶 Mi casa' },
          ]}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {LABELS.map((w) => {
          const left = need(w) - used(w);
          return (
            <button
              key={w}
              type="button"
              disabled={checked || left <= 0}
              onClick={() => setChip((c) => (c === w ? null : w))}
              className={cn('rounded-full px-2.5 py-1 text-[13px] font-semibold transition', chip === w ? 'bg-ios-blue text-white' : 'bg-fill-2', left <= 0 && 'opacity-35')}
            >
              {w} {need(w) > 1 && <span className="opacity-70">×{left}</span>}
            </button>
          );
        })}
      </div>
      <div ref={wrap} className="mt-3 w-full overflow-hidden rounded-[14px] bg-[color-mix(in_srgb,var(--green)_5%,transparent)]" style={{ height: STAGE_H * scale }}>
        <div className="relative origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
          {BANDS.map((b) => (
            <div key={b.label} className="text-label-3 absolute left-3 text-[15px] font-bold" style={{ top: b.y - 10 }}>
              {b.label}
            </div>
          ))}
          <svg width={STAGE_W} height={STAGE_H} className="absolute inset-0">
            {lines.map((l, k) => (
              <line key={k} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.kind === 'couple' ? '#ff6fb5' : '#1a9fb0'} strokeWidth={l.kind === 'couple' ? 5 : 3} strokeLinecap="round" />
            ))}
          </svg>
          {TREE_NODES.map((n) => {
            const a = answers[n.id];
            const ok = checked && a === n.answer;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => place(n.id)}
                className={cn(
                  'bg-card absolute flex flex-col items-center justify-center rounded-[16px] border-[3px] text-center shadow-md transition-opacity',
                  n.id === 'me' ? 'border-[#f5b301]' : checked ? (ok ? 'border-ios-green' : 'border-ios-red') : a ? 'border-ios-blue' : 'border-transparent',
                  !shown(n.id) && 'opacity-20',
                )}
                style={{ left: n.x - NODE_W / 2, top: n.y - NODE_H / 2, width: NODE_W, height: NODE_H }}
              >
                <span className="text-[28px] leading-none">{n.emoji}</span>
                <span className="text-[15px] font-bold">{n.name}</span>
                <span className={cn('text-[13px] leading-tight font-semibold', checked && !ok ? 'text-ink-red' : 'text-ink-blue')}>{n.id === 'me' ? '' : a || '?'}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-label-2 mt-2 text-[12.5px]">Rosa une a una pareja casada; azul baja de los padres a sus hijos.</p>
      {info && <p className="bg-fill-2 mt-2 rounded-[12px] px-3 py-2 text-[14px]">{info}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!checked ? (
          <Button size="sm" onClick={check} disabled={!Object.keys(answers).length}>
            <Check size={15} /> Revisar árbol
          </Button>
        ) : (
          <span className="text-[15px] font-semibold">
            {right}/{total} correctas {right === total ? '🏆' : ''}
          </span>
        )}
        <Button
          size="sm"
          variant="gray"
          onClick={() => {
            setAnswers({});
            setChecked(false);
            setInfo(null);
          }}
        >
          <RotateCcw size={15} /> Reiniciar
        </Button>
        <Button
          size="sm"
          variant="gray"
          onClick={() => {
            setAnswers(Object.fromEntries(TREE_NODES.filter((n) => n.answer).map((n) => [n.id, n.answer])));
            setChecked(true);
          }}
        >
          <Eye size={15} /> Ver respuestas
        </Button>
      </div>
      {checked && <p className="text-label-2 mt-2 text-[13px]">Toca cualquier persona para ver por qué tiene ese parentesco.</p>}
    </Card>
  );
}

export function FrequencyTools() {
  return (
    <div className="space-y-4">
      <FrequencyScale />
      <FrequencyDetective />
      <RoutineBuilder />
      <FrequencyQuiz />
    </div>
  );
}


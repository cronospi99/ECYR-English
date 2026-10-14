import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Check,
  ChevronRight,
  CircleQuestionMark,
  Eye,
  Lightbulb,
  ListOrdered,
  MessagesSquare,
  Plus,
  Quote,
  Scale,
  Sparkles,
  Table2,
  Target,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { SpeakButton } from '@/components/learning/SpeakButton';
import type { GrammarPoint } from '@/content/types';
import { cn } from '@/lib/cn';
import { firstSentence, highlight, keySpec, noteParts, parsePair, type KeySpec } from './formula';
import { FormulaBlock } from './FormulaBlock';
import { ColorTable } from './ColorTable';
import { Dialogue } from './Dialogue';
import { Clamp, Disclosure, Hl, Kicker, QuoteText, ink, tint } from './ui';

// ------------------------------------------------------------------ tab ----

/** Grammar tab body: a topic chooser (like the books' side menu) + one lesson at a time. */
export function GrammarLessons({ points, color }: { points: GrammarPoint[]; color: string }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const i = Math.min(active, points.length - 1);
  const g = points[i];
  if (!g) return null;
  return (
    <div>
      {points.length > 1 && (
        <div role="tablist" aria-label="Puntos de gramática" className="mb-4 grid gap-2.5 sm:grid-cols-2">
          {points.map((p, k) => {
            const on = k === i;
            return (
              <button
                key={p.name}
                role="tab"
                id={`${base}-t${k}`}
                aria-selected={on}
                aria-controls={`${base}-p`}
                onClick={() => setActive(k)}
                className={cn(
                  'flex items-start gap-3 rounded-[16px] p-3.5 text-left transition-[background-color,box-shadow] duration-200',
                  on ? 'shadow-card' : 'bg-card/60 hover:bg-card',
                )}
                style={on ? { background: tint(color, 14), boxShadow: `inset 0 0 0 2px ${color}` } : { boxShadow: 'inset 0 0 0 1px var(--separator)' }}
              >
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                  style={on ? { background: color, color: '#fff' } : { background: tint(color, 16), color: ink(color) }}
                >
                  {k + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] leading-snug font-semibold">{p.name}</span>
                  {p.short && <span className="text-label-2 mt-0.5 line-clamp-1 block text-[13px]">{p.short}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div id={`${base}-p`} role={points.length > 1 ? 'tabpanel' : undefined} aria-labelledby={points.length > 1 ? `${base}-t${i}` : undefined}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={g.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <GrammarLesson
              g={g}
              index={i}
              total={points.length}
              color={color}
              next={points[i + 1]}
              onNext={() => {
                setActive(i + 1);
                document.getElementById(`${base}-t${i + 1}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- lesson ----

export function GrammarLesson({
  g,
  index,
  total,
  color,
  next,
  onNext,
}: {
  g: GrammarPoint;
  index: number;
  total: number;
  color: string;
  next?: GrammarPoint;
  onNext?: () => void;
}) {
  const spec = useMemo(() => keySpec(g), [g]);
  const summary = g.short || (g.rule ? firstSentence(g.rule, 110) : '');

  return (
    <Card className="overflow-hidden">
      {/* hero */}
      <header className="relative px-5 pt-5 pb-4 sm:px-6" style={{ background: `linear-gradient(160deg, ${tint(color, 18)}, transparent 75%)` }}>
        <div className="text-[12px] font-bold tracking-[0.08em] uppercase" style={{ color: ink(color) }}>
          Gramática · {index + 1} de {total}
        </div>
        <h3 className="text-title-2 mt-1 text-balance">{g.name}</h3>
        {summary && (
          <div className="bg-card/80 mt-3 flex items-start gap-2 rounded-[14px] py-2 pr-1.5 pl-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
            <Sparkles size={16} className="mt-[3px] shrink-0" style={{ color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <span className="text-label-2 block text-[11px] font-bold tracking-[0.06em] uppercase">En una frase</span>
              <span className="text-[16px] font-medium text-pretty">
                <Hl text={summary} spec={spec} />
              </span>
            </div>
            <SpeakButton text={summary} size={16} />
          </div>
        )}
        {g.rule && (
          <Clamp
            text={g.rule}
            lines={2}
            className="text-label-2 mt-3 text-[15px] leading-relaxed"
            render={(t) => <QuoteText text={t} color={color} />}
          />
        )}
      </header>

      <div className="space-y-7 px-5 pt-3 pb-6 sm:px-6">
        {g.form && g.form.length > 0 && <FormulaBlock form={g.form} spec={spec} color={color} />}
        <Examples g={g} spec={spec} color={color} />
        {g.chart && (
          <section>
            <Kicker icon={Table2} color={color}>
              Tabla
            </Kicker>
            <ColorTable chart={g.chart} color={color} spec={spec} />
          </section>
        )}
        {g.notes && g.notes.length > 0 && <Notes notes={g.notes} color={color} />}
        {(g.watch || (g.fix && g.fix.length > 0)) && <Mistakes g={g} spec={spec} />}
        <UseIt g={g} spec={spec} color={color} />
        {g.deep && (
          <Disclosure
            summary="Explicación a fondo"
            icon={BookOpen}
            color={color}
            meta={`Para profundizar · ${Math.max(1, Math.round(g.deep.split(/\s+/).length / 200))} min de lectura`}
          >
            <p className="text-label text-[15px] leading-relaxed text-pretty">
              <QuoteText text={g.deep} color={color} subtle />
            </p>
          </Disclosure>
        )}
        {next && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="flex w-full items-center gap-3 rounded-[16px] p-4 text-left transition-opacity hover:opacity-90"
            style={{ background: tint(color, 12) }}
          >
            <span className="min-w-0 flex-1">
              <span className="text-label-2 block text-[12px] font-bold tracking-wide uppercase">Siguiente punto</span>
              <span className="block truncate text-[16px] font-semibold">{next.name}</span>
            </span>
            <ChevronRight size={20} style={{ color }} aria-hidden />
          </button>
        )}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- examples ----

function Examples({ g, spec, color }: { g: GrammarPoint; spec: KeySpec; color: string }) {
  const all = useMemo(() => [...new Set([...(g.examples ?? []), ...(g.more ?? [])])], [g]);
  const [n, setN] = useState(3);
  if (!all.length) return null;
  const shown = all.slice(0, n);
  return (
    <section>
      <Kicker icon={Quote} color={color} action={<span className="text-label-2 text-[13px] tabular-nums">{all.length}</span>}>
        Ejemplos
      </Kicker>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((e, k) => (
          <motion.li
            key={e}
            initial={k >= 3 ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            className="bg-fill-2 flex items-start gap-2 rounded-[14px] py-2.5 pr-1.5 pl-3.5"
            style={{ boxShadow: `inset 3px 0 0 ${tint(color, 60)}` }}
          >
            <span className="min-w-0 flex-1 text-[16px] leading-snug text-pretty">
              <Hl text={e} spec={spec} />
            </span>
            <SpeakButton text={e} size={16} className="-mt-0.5" />
          </motion.li>
        ))}
      </ul>
      {all.length > n && (
        <button type="button" onClick={() => setN(all.length)} className="text-ios-blue mt-2.5 inline-flex items-center gap-1 text-[15px] font-semibold">
          <Plus size={16} aria-hidden /> Ver {all.length - n} más
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- notes ----

function noteIcon(n: string): { icon: LucideIcon; color: string } {
  const t = n.toLowerCase();
  if (/\b(never|don['’]t|do not|not |avoid|wrong|mistake)\b/.test(t)) return { icon: Ban, color: 'var(--red)' };
  if (/\b(sound|pronounc|stress|say it)\b/.test(t)) return { icon: Volume2, color: 'var(--purple)' };
  if (/\b(compare|contrast|difference|vs\.?|while|whereas)\b/.test(t)) return { icon: Scale, color: 'var(--teal)' };
  if (/\?/.test(t)) return { icon: CircleQuestionMark, color: 'var(--blue)' };
  if (/\b(always|must|every)\b/.test(t)) return { icon: Target, color: 'var(--green)' };
  return { icon: Lightbulb, color: 'var(--orange)' };
}

function Notes({ notes, color }: { notes: string[]; color: string }) {
  return (
    <section>
      <Kicker icon={Lightbulb} color={color}>
        Claves
      </Kicker>
      <ul className="space-y-2">
        {notes.map((n) => (
          <Note key={n} note={n} />
        ))}
      </ul>
    </section>
  );
}

function Note({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  const { head, body } = noteParts(note);
  const pair = body ? parsePair(body) : null;
  const { icon: Icon, color } = noteIcon(note);
  const id = useId();
  const head2 = <QuoteText text={head} color={color} />;
  return (
    <li className="bg-fill-2 rounded-[14px]">
      {body ? (
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-3.5 py-3 text-left">
          <NoteIcon icon={Icon} color={color} />
          <span className="min-w-0 flex-1 text-[15px] leading-snug font-medium text-pretty">{head2}</span>
          <span className="text-ios-blue mt-0.5 shrink-0 text-[13px] font-semibold">{open ? 'Menos' : 'Detalles'}</span>
        </button>
      ) : (
        <div className="flex items-start gap-3 px-3.5 py-3">
          <NoteIcon icon={Icon} color={color} />
          <span className="min-w-0 flex-1 text-[15px] leading-snug text-pretty">{head2}</span>
        </div>
      )}
      {body && open && (
        <div id={id} className="pr-3.5 pb-3 pl-[52px] text-[15px] leading-relaxed">
          {pair && (pair.wrong || pair.right) ? (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {pair.right && <PairChip ok text={pair.right} />}
              {pair.wrong && <PairChip text={pair.wrong} />}
            </div>
          ) : null}
          <span className="text-label-2 text-pretty">
            <QuoteText text={body} color={color} subtle />
          </span>
        </div>
      )}
    </li>
  );
}

const NoteIcon = ({ icon: Icon, color }: { icon: LucideIcon; color: string }) => (
  <span className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: tint(color, 16), color }} aria-hidden>
    <Icon size={14} strokeWidth={2.4} />
  </span>
);

function PairChip({ text, ok = false }: { text: string; ok?: boolean }) {
  const c = ok ? 'var(--green)' : 'var(--red)';
  return (
    <span className="inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-1.5 text-[14px] font-semibold" style={{ background: tint(c, 13), color: ink(c) }}>
      {ok ? <Check size={14} aria-label="Correcto" /> : <X size={14} aria-label="Incorrecto" />}
      <span className={ok ? undefined : 'line-through decoration-[1.5px]'}>{text}</span>
    </span>
  );
}

// ------------------------------------------------------------- mistakes ----

function Mistakes({ g, spec }: { g: GrammarPoint; spec: KeySpec }) {
  const pair = g.watch ? parsePair(g.watch) : null;
  const orange = 'var(--orange)';
  return (
    <section>
      <Kicker icon={AlertTriangle} color={orange}>
        Cuidado
      </Kicker>
      {g.watch &&
        (pair && pair.wrong ? (
          <div className="overflow-hidden rounded-[16px]" style={{ boxShadow: `inset 0 0 0 1px ${tint(orange, 30)}` }}>
            <div className={cn('grid', pair.right && 'sm:grid-cols-2')}>
              <WrongRight wrong text={pair.wrong} />
              {pair.right && <WrongRight text={pair.right} />}
            </div>
            <p className="text-label-2 px-4 py-3 text-[14px] leading-relaxed text-pretty" style={{ background: tint(orange, 6) }}>
              <QuoteText text={g.watch} color={orange} />
            </p>
          </div>
        ) : (
          <div className="flex gap-3 rounded-[16px] p-4 text-[15px] leading-relaxed" style={{ background: tint(orange, 10) }}>
            <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: orange }} aria-hidden />
            <p className="text-pretty">
              <QuoteText text={g.watch} color={orange} />
            </p>
          </div>
        ))}
      {g.fix && g.fix.length > 0 ? <FixCheck fixes={g.fix} /> : <BlankCheck g={g} spec={spec} />}
    </section>
  );
}

function WrongRight({ text, wrong = false }: { text: string; wrong?: boolean }) {
  const c = wrong ? 'var(--red)' : 'var(--green)';
  return (
    <div className="flex items-start gap-2.5 px-4 py-3" style={{ background: tint(c, 9) }}>
      <span className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: c }}>
        {wrong ? <X size={14} strokeWidth={3} aria-label="Incorrecto" /> : <Check size={14} strokeWidth={3} aria-label="Correcto" />}
      </span>
      <span className={cn('text-[16px] font-semibold text-pretty', wrong && 'line-through decoration-2')} style={{ color: ink(c), textDecorationColor: tint(c, 60) }}>
        {text}
      </span>
    </div>
  );
}

/** "¿Dónde está el error?": tap a wrong sentence to reveal the fix and why. */
function FixCheck({ fixes }: { fixes: NonNullable<GrammarPoint['fix']> }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (k: number) => setOpen((s) => new Set(s.has(k) ? [...s].filter((x) => x !== k) : [...s, k]));
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[15px] font-semibold">
          <Eye size={16} className="text-ios-purple" aria-hidden /> Ponte a prueba: ¿qué está mal?
        </div>
        <span className="text-label-2 text-[13px] tabular-nums">
          {open.size}/{fixes.length}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fixes.map((f, k) => {
          const on = open.has(k);
          return (
            <li key={f.wrong}>
              <button
                type="button"
                aria-expanded={on}
                onClick={() => toggle(k)}
                className="bg-fill-2 flex h-full w-full flex-col rounded-[14px] p-3.5 text-left transition-colors"
                style={on ? { background: tint('var(--green)', 9) } : undefined}
              >
                <span className={cn('flex items-start gap-2 text-[15px]', on && 'text-label-2 line-through decoration-[var(--red)]')}>
                  <X size={16} className="text-ios-red mt-0.5 shrink-0" aria-label="Incorrecto" />
                  {f.wrong}
                </span>
                {on ? (
                  <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 block">
                    <span className="flex items-start gap-2 text-[15px] font-semibold" style={{ color: ink('var(--green)') }}>
                      <Check size={16} className="mt-0.5 shrink-0" aria-label="Correcto" />
                      {f.right}
                    </span>
                    <span className="text-label-2 mt-1 block pl-6 text-[13px] leading-snug">{f.why}</span>
                  </motion.span>
                ) : (
                  <span className="text-ios-blue mt-2 pl-6 text-[13px] font-semibold">Toca para corregir</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Fallback self-check: hide the highlighted grammar in a few examples; tap to reveal. */
function BlankCheck({ g, spec }: { g: GrammarPoint; spec: KeySpec }) {
  const items = useMemo(() => {
    const pool = [...new Set([...(g.more ?? []), ...(g.examples ?? [])])];
    return pool
      .map((s) => highlight(s, spec))
      .filter((segs) => segs.some((x) => x.role))
      .slice(0, 3);
  }, [g, spec]);
  const [open, setOpen] = useState<Set<number>>(new Set());
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold">
        <Eye size={16} className="text-ios-purple" aria-hidden /> Ponte a prueba: ¿qué palabra falta?
      </div>
      <ul className="space-y-2">
        {items.map((segs, k) => {
          const on = open.has(k);
          let hidden = 0;
          return (
            <li key={k}>
              <button
                type="button"
                aria-expanded={on}
                aria-label={on ? undefined : 'Frase con huecos. Toca para ver la respuesta'}
                onClick={() => setOpen((s) => new Set([...s, k]))}
                className="bg-fill-2 w-full rounded-[14px] px-3.5 py-3 text-left text-[16px] leading-relaxed"
              >
                {segs.map((s, j) => {
                  if (!s.role) return <span key={j}>{s.text}</span>;
                  hidden++;
                  if (hidden > 2) return <span key={j}>{s.text}</span>;
                  return on ? (
                    <motion.span key={j} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-ios-green rounded-[5px] bg-[color-mix(in_srgb,var(--green)_14%,transparent)] px-1 font-semibold">
                      {s.text}
                    </motion.span>
                  ) : (
                    <span key={j} className="mx-0.5 inline-block min-w-12 rounded-[6px] border-b-2 border-dashed border-[var(--purple)] bg-[color-mix(in_srgb,var(--purple)_10%,transparent)] px-2 text-transparent select-none" aria-hidden>
                      {s.text}
                    </span>
                  );
                })}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --------------------------------------------------------------- use it ----

type UseTab = 'dialogue' | 'drill' | 'contrast' | 'sound';

function UseIt({ g, spec, color }: { g: GrammarPoint; spec: KeySpec; color: string }) {
  const opts = [
    g.dialogue && g.dialogue.length > 0 && { value: 'dialogue' as const, label: 'Diálogo' },
    g.drill?.items && g.drill.items.length > 0 && { value: 'drill' as const, label: 'Drill' },
    g.contrast && { value: 'contrast' as const, label: 'Contraste' },
    g.sound && { value: 'sound' as const, label: 'Sonido' },
  ].filter(Boolean) as { value: UseTab; label: string }[];
  const [tab, setTab] = useState<UseTab | null>(null);
  if (!opts.length) return null;
  const cur = opts.find((o) => o.value === tab)?.value ?? opts[0]!.value;
  return (
    <section>
      <Kicker icon={MessagesSquare} color={color}>
        Úsalo
      </Kicker>
      {opts.length > 1 && (
        <div className="no-scrollbar mb-3 overflow-x-auto">
          <Segmented size="sm" value={cur} onChange={setTab} options={opts} />
        </div>
      )}
      {cur === 'dialogue' && g.dialogue && <Dialogue lines={g.dialogue} spec={spec} bare />}
      {cur === 'drill' && g.drill?.items && (
        <div>
          {(g.drill.name || g.drill.prompt) && (
            <p className="mb-2.5 flex items-start gap-2 text-[15px] text-pretty">
              <ListOrdered size={17} className="mt-0.5 shrink-0" style={{ color }} aria-hidden />
              <span>
                {g.drill.name && <strong className="font-semibold">{g.drill.name}. </strong>}
                {g.drill.prompt}
              </span>
            </p>
          )}
          <ol className="space-y-1.5">
            {g.drill.items.map((d, k) => (
              <li key={d} className="bg-fill-2 flex items-start gap-2.5 rounded-[12px] py-2 pr-1.5 pl-2.5 text-[15px]">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: color }}>
                  {k + 1}
                </span>
                <span className="min-w-0 flex-1 pt-0.5 text-pretty">
                  <Hl text={d} spec={spec} />
                </span>
                <SpeakButton text={d} size={15} />
              </li>
            ))}
          </ol>
        </div>
      )}
      {cur === 'contrast' && g.contrast && <ColorTable chart={g.contrast} color="var(--teal)" spec={spec} />}
      {cur === 'sound' && g.sound && (
        <div className="flex items-start gap-3 rounded-[16px] p-4 text-[15px] leading-relaxed" style={{ background: tint('var(--purple)', 10) }}>
          <Volume2 size={18} className="text-ios-purple mt-0.5 shrink-0" aria-hidden />
          <p className="text-pretty">
            <QuoteText text={g.sound} color="var(--purple)" />
          </p>
        </div>
      )}
    </section>
  );
}

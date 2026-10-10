/**
 * Modal Verbs — explanation sections rebuilt from the legacy arcade module.
 * Every section is self-contained so lessons can embed exactly the piece they
 * need (see tools.tsx); ModalsPage puts them together behind a Segmented.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Ban,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Dices,
  Dumbbell,
  Feather,
  Gamepad2,
  HandHelping,
  History,
  KeyRound,
  Layers,
  Lightbulb,
  MessageCircleHeart,
  RotateCcw,
  ScanSearch,
  Sparkles,
  TriangleAlert,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, LevelChip } from '@/components/ui/Misc';
import { IconTile } from '@/components/ui/IconTile';
import { ProgressBar } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { Callout } from '@/components/learning/Callout';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { cn } from '@/lib/cn';
import {
  ALL_MODALS,
  BUILDER_MODALS,
  BUILDER_NOTES,
  BUILDER_SUBJECTS,
  BUILDER_TYPES,
  BUILDER_VERBS,
  CERTAINTY,
  CORE,
  DEDUCTION_CLUES,
  FACT_VS_ATTITUDE,
  FUNCTION_BY_ID,
  FUNCTIONS,
  MARGINAL,
  NEGATIVES,
  OBLIGATION_LEVELS,
  OBLIGATION_SIGNS,
  RING_KEYS,
  RULES,
  SEMIS,
  type BuilderModal,
  type BuilderType,
  type CertaintyStop,
  type FunctionId,
  type ModalGroup,
  type ModalVerb,
  type ObligationLevel,
  type SectionId,
} from './data';
import { awardModals, shuffle, useCollect, useModalsArcade, useSfx } from './arcade';

// ------------------------------------------------------------------ shared --

export const FN_ICON: Record<FunctionId, LucideIcon> = {
  ability: Dumbbell,
  permission: KeyRound,
  requests: HandHelping,
  suggestion: Lightbulb,
  advice: MessageCircleHeart,
  obligation: ClipboardCheck,
  'no-obligation': Feather,
  prohibition: Ban,
  possibility: Dices,
  deduction: ScanSearch,
  habit: History,
  criticism: Undo2,
  future: Sparkles,
};

const tint = (c: string, pct = 14) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** Small coloured tag naming a function (ability, advice…). */
export function FnTag({ fn, className }: { fn: FunctionId; className?: string }) {
  const f = FUNCTION_BY_ID[fn];
  return (
    <span
      className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold', className)}
      style={{ background: tint(f.color), color: 'var(--label)' }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: f.color }} aria-hidden />
      {f.es}
    </span>
  );
}

/** The spinning gold ring of the original, as an accessible decoration. */
export function Ring({ size = 18, spin = true }: { size?: number; spin?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size * 0.8, height: size, border: `${Math.max(3, size / 5)}px solid var(--yellow)`, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.08)' }}
      animate={spin ? { scaleX: [1, 0.15, 1, 0.15, 1] } : undefined}
      transition={spin ? { duration: 1.6, repeat: Infinity, ease: 'linear' } : undefined}
    />
  );
}

/** An English example with a listen button. */
export function Example({ e, className, big }: { e: string; className?: string; big?: boolean }) {
  return (
    <span className={cn('flex items-start gap-1', className)}>
      <span className={cn('min-w-0 flex-1 italic', big ? 'text-[18px] leading-snug' : 'text-[15px] leading-snug')}>{e}</span>
      <SpeakButton text={e.replace(/ · /g, '. ')} size={16} className="-my-1" />
    </span>
  );
}

function SectionHead({ icon, color, title, subtitle, action }: { icon: LucideIcon; color: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={icon} color={color} size={36} />
        <div className="min-w-0">
          <h2 className="text-title-2 text-balance">{title}</h2>
          {subtitle && <p className="text-subhead text-label-2 mt-0.5 max-w-3xl text-pretty">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Feedback line announced to screen readers. */
function Feedback({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex items-start gap-2.5 rounded-[14px] p-3.5 text-[15px]"
      style={{ background: tint(ok ? 'var(--green)' : 'var(--orange)', 12) }}
    >
      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', ok ? 'bg-ios-green' : 'bg-ios-red')}>
        {ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </motion.div>
  );
}

// --------------------------------------------------------------------- HUD --

/** Rings collected, best bonus score and the SFX switch. */
export function ArcadeHud({ className }: { className?: string }) {
  const rings = useModalsArcade((s) => s.rings.length);
  const best = useModalsArcade((s) => s.best.bonus ?? 0);
  const sfx = useModalsArcade((s) => s.sfx);
  const toggle = useModalsArcade((s) => s.toggleSfx);
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="bg-card shadow-card inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold tabular-nums" title="Anillos: uno por cada sección y cada modal que visitas">
        <Ring size={16} />
        <span className="sr-only">Anillos de exploración:</span>
        {rings}/{RING_KEYS.length}
      </span>
      <span className="bg-card shadow-card inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold tabular-nums">
        <Trophy size={15} className="text-ios-orange" />
        <span className="text-label-2 text-[12px] font-medium">Récord</span> {best}/14
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={sfx}
        className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors', sfx ? 'bg-ios-green text-white' : 'bg-fill text-label-2')}
      >
        {sfx ? <Volume2 size={15} /> : <VolumeX size={15} />} SFX {sfx ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------- intro --

const STAGES: { id: SectionId; title: string; body: string; color: string; icon: LucideIcon }[] = [
  { id: 'core', title: 'Los 9 core', body: 'can, could, may, might, must, shall, should, will, would', color: 'var(--green)', icon: Layers },
  { id: 'marginal', title: 'Marginales', body: 'ought to, need, dare, used to', color: 'var(--cyan)', icon: Feather },
  { id: 'semi', title: 'Semi-modales', body: 'have to, had better, be able to y compañía', color: 'var(--purple)', icon: Sparkles },
  { id: 'functions', title: 'Funciones', body: 'qué expresa cada modal, escalas de certeza y obligación', color: 'var(--pink)', icon: ScanSearch },
  { id: 'rules', title: 'Reglas', body: 'las diez leyes, sus excepciones y el constructor de frases', color: 'var(--orange)', icon: BookOpen },
  { id: 'traps', title: 'Trampas', body: '¿correcta o incorrecta? Tres vidas', color: 'var(--red)', icon: TriangleAlert },
  { id: 'bonus', title: 'Bonus stage', body: '14 preguntas, un anillo por acierto', color: 'var(--yellow)', icon: Gamepad2 },
];

/** "What is a modal verb?" — fact vs attitude, plus the stage select. */
export function ModalIntro({ onNavigate }: { onNavigate?: (s: SectionId) => void }) {
  const [pick, setPick] = useState(0);
  const sfx = useSfx();
  const rings = useModalsArcade((s) => s.rings);
  const att = FACT_VS_ATTITUDE[pick]!;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-5 sm:p-6">
        <div className="text-ios-blue text-[13px] font-semibold tracking-wide uppercase">Empieza aquí</div>
        <h2 className="text-title-1 mt-1">¿Qué es un verbo modal?</h2>
        <p className="text-body text-label-2 mt-2 text-pretty">
          Un modal es un verbo auxiliar que no describe una acción: describe la <b className="text-label">actitud del hablante</b> ante esa acción. Lo posible
          que es, lo necesaria que es, lo educado que estás siendo.
        </p>
        <div className="mt-5 space-y-2.5">
          <div className="bg-fill-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[14px] border-l-4 border-[var(--orange)] px-4 py-3">
            <span className="text-ios-orange text-[12px] font-bold tracking-wide uppercase">Hecho</span>
            <Example big e="She works on Sundays." className="min-w-0 flex-1" />
          </div>
          <div className="bg-fill-2 rounded-[14px] border-l-4 border-[var(--blue)] px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-ios-blue text-[12px] font-bold tracking-wide uppercase">Actitud</span>
              <AnimatePresence mode="wait">
                <motion.span key={att.m} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="min-w-0 flex-1">
                  <Example big e={`She ${att.m} on Sundays.`} />
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="text-label-2 mt-1 flex flex-wrap items-center gap-2 text-[14px]">
              <FnTag fn={att.fn} /> {att.es}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cambia el modal">
          {FACT_VS_ATTITUDE.map((a, i) => (
            <Chip
              key={a.m}
              active={i === pick}
              onClick={() => {
                setPick(i);
                sfx('select');
              }}
            >
              {a.m}
            </Chip>
          ))}
        </div>
        <p className="text-label-2 mt-4 text-[15px]">La misma acción, mundos distintos. Ese es todo el trabajo de un modal.</p>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-headline flex items-center gap-2">
            <Gamepad2 size={20} className="text-ios-orange" /> Selecciona un nivel
          </h3>
          <span className="text-label-2 text-[13px]">Cada visita = 1 anillo</span>
        </div>
        <ul className="space-y-2">
          {STAGES.map((s) => {
            const done = rings.includes(s.id) || (s.id === 'core' && CORE.every((m) => rings.includes(m.id))) || (s.id === 'marginal' && MARGINAL.every((m) => rings.includes(m.id)));
            const Inner = (
              <>
                <IconTile icon={s.icon} color={s.color} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{s.title}</span>
                  <span className="text-label-2 block text-[13px] leading-snug">{s.body}</span>
                </span>
                {done ? <Ring size={14} spin={false} /> : onNavigate && <ChevronRight size={18} className="text-label-3" />}
              </>
            );
            return (
              <li key={s.id}>
                {onNavigate ? (
                  <button type="button" onClick={() => onNavigate(s.id)} className="hover:bg-fill-2 flex w-full items-center gap-3 rounded-[14px] p-2 text-left transition-colors">
                    {Inner}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-2">{Inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- explorer --

/** Words to highlight inside each modal's examples. */
const HILITE: Record<string, RegExp> = {
  can: /\b(can't|cannot|can)\b/gi,
  could: /\b(couldn't|could)\b/gi,
  may: /\b(may)\b/gi,
  might: /\b(mightn't|might)\b/gi,
  must: /\b(mustn't|must)\b/gi,
  shall: /\b(shan't|shall)\b/gi,
  should: /\b(shouldn't|should)\b/gi,
  will: /('ll|\bwon't\b|\bwill\b)/gi,
  would: /('d|\bwouldn't\b|\bwould\b)/gi,
  ought: /\b(ought(?:n't)? to|ought)\b/gi,
  need: /\b(needn't|need(?:s)?(?: to)?)\b/gi,
  dare: /\b(daren't|dare(?:d)?(?: to)?|daresay)\b/gi,
  usedto: /\b(used to|use to)\b/gi,
};

function Highlighted({ text, id }: { text: string; id: string }) {
  const re = HILITE[id];
  if (!re) return <>{text}</>;
  const parts = text.split(new RegExp(re.source, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} className="text-ios-blue font-semibold not-italic">
            {p}
          </b>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function SpeedLines() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      {[
        ['18%', 'var(--blue)', 0],
        ['42%', 'var(--yellow)', 0.04],
        ['63%', 'var(--blue)', 0.02],
        ['80%', 'var(--cyan)', 0.06],
      ].map(([top, c, d]) => (
        <motion.span
          key={top as string}
          className="absolute left-0 h-[3px] w-2/3 rounded-full"
          style={{ top: top as string, background: `linear-gradient(90deg, transparent, ${c as string})` }}
          initial={{ x: '110%', opacity: 0 }}
          animate={{ x: '-120%', opacity: [0, 1, 0] }}
          transition={{ duration: 0.45, delay: d as number, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/**
 * Step-through explorer for a group of modals: chips to jump, a detail card
 * per modal (uses, negative, past, danger box) and prev/next buttons.
 */
export function ModalExplorer({ group = 'core', ids, initial }: { group?: ModalGroup; ids?: string[]; initial?: string }) {
  const list = useMemo(() => {
    const base = ids ? ALL_MODALS.filter((m) => ids.includes(m.id)) : group === 'core' ? CORE : MARGINAL;
    return base.length ? base : CORE;
  }, [group, ids]);
  const [id, setId] = useState(() => (initial && list.some((m) => m.id === initial) ? initial : list[0]!.id));
  const [dash, setDash] = useState(0);
  const reduce = useReducedMotion();
  const collect = useCollect();
  const sfx = useSfx();
  const idx = Math.max(0, list.findIndex((m) => m.id === id));
  const m = list[idx]!;

  useEffect(() => {
    useModalsArcade.getState().collect(m.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (next: ModalVerb) => {
    if (next.id === id) return;
    sfx('dash');
    collect(next.id, true);
    setId(next.id);
    setDash((d) => d + 1);
  };

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap" role="group" aria-label="Elige un modal">
        {list.map((x) => (
          <ModalChip key={x.id} m={x} active={x.id === id} onClick={() => go(x)} />
        ))}
      </div>

      <Card className="relative overflow-hidden">
        {!reduce && dash > 0 && <SpeedLines key={dash} />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={m.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 60, skewX: -6 }}
            animate={{ opacity: 1, x: 0, skewX: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.32, ease: [0.2, 0.9, 0.3, 1.15] }}
            className="p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="brand-text text-[44px] leading-none font-extrabold tracking-tight sm:text-[52px]">{m.w}</h3>
              <SpeakButton text={m.w} size={20} />
              <span className="bg-fill text-label-2 rounded-full px-2.5 py-1 text-[12px] font-semibold tracking-wide uppercase">{m.tag}</span>
              <LevelChip level={m.level} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="bg-fill-2 rounded-[12px] px-3.5 py-2.5 text-[15px]">
                <span className="text-label-2 block text-[12px] font-semibold uppercase">Negativa</span>
                {m.neg}
              </div>
              <div className="bg-fill-2 rounded-[12px] px-3.5 py-2.5 text-[15px]">
                <span className="text-label-2 block text-[12px] font-semibold uppercase">Pasado</span>
                {m.past}
              </div>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {m.uses.map((u, i) => (
                <motion.div
                  key={u.e}
                  initial={reduce ? false : { opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  className="rounded-[14px] p-3.5 shadow-[inset_0_0_0_1px_var(--separator)]"
                  style={u.fn ? { background: tint(FUNCTION_BY_ID[u.fn].color, 7) } : undefined}
                >
                  <div className="mb-1.5 flex items-start gap-2">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: u.fn ? FUNCTION_BY_ID[u.fn].color : 'var(--label-3)' }} aria-hidden />
                    <span className="text-[14px] leading-snug font-semibold">{u.u}</span>
                  </div>
                  <span className="flex items-start gap-1">
                    <span className="min-w-0 flex-1 text-[16px] leading-snug italic">
                      <Highlighted text={u.e} id={m.id} />
                    </span>
                    <SpeakButton text={u.e.replace(/ · /g, '. ')} size={16} className="-my-1" />
                  </span>
                </motion.div>
              ))}
            </div>
            <Callout tone="red" icon={<TriangleAlert size={17} />} title="Zona de peligro" className="mt-4">
              {m.warn}
            </Callout>
          </motion.div>
        </AnimatePresence>
        <div className="hairline-t flex items-center justify-between gap-2 px-4 py-3">
          <Button variant="plain" size="sm" disabled={idx === 0} onClick={() => go(list[idx - 1]!)} aria-label="Modal anterior">
            <ChevronLeft size={16} /> {idx > 0 ? list[idx - 1]!.w : ''}
          </Button>
          <span className="text-label-2 text-[13px] tabular-nums">
            {idx + 1} / {list.length}
          </span>
          <Button variant="plain" size="sm" disabled={idx === list.length - 1} onClick={() => go(list[idx + 1]!)} aria-label="Modal siguiente">
            {idx < list.length - 1 ? list[idx + 1]!.w : ''} <ChevronRight size={16} />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ModalChip({ m, active, onClick }: { m: ModalVerb; active: boolean; onClick: () => void }) {
  const seen = useModalsArcade((s) => s.rings.includes(m.id));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors',
        active ? 'bg-ios-blue text-white shadow-[0_6px_16px_-6px_var(--blue)]' : 'bg-card text-label shadow-card hover:bg-fill-2',
      )}
    >
      {seen && !active && <Ring size={11} spin={false} />}
      {m.w}
    </button>
  );
}

// ------------------------------------------------------------- semi-modals --

/** Semi-modals and modal phrases. */
export function SemiModals({ ids }: { ids?: string[] }) {
  const list = ids ? SEMIS.filter((s) => ids.includes(s.id)) : SEMIS;
  const reduce = useReducedMotion();
  return (
    <div>
      <SectionHead
        icon={Sparkles}
        color="var(--purple)"
        title="Semi-modales y expresiones modales"
        subtitle={
          <>
            No son modales puros, pero hacen el mismo trabajo y aportan las formas que los modales no pueden formar. Casi todos llevan <b className="text-label">to</b> y casi
            todos se conjugan.
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s, i) => (
          <motion.div key={s.id} initial={reduce ? false : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="h-full p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-ios-purple text-[17px] font-bold">{s.n}</h3>
                {s.fn && <FnTag fn={s.fn} />}
              </div>
              <p className="text-label-2 mt-1.5 text-[14px] leading-snug">{s.u}</p>
              <Example e={s.e} className="mt-2.5" />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- functions --

const MATRIX_ROWS = ['can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'ought to', 'need', 'used to', 'have to', 'had better', 'be able to'];

/**
 * Comparison of meanings: one card per function (ability, permission…) with
 * the modals that express it, filterable by modal, plus a modal × function matrix.
 */
export function FunctionMap({ only }: { only?: FunctionId[] }) {
  const [view, setView] = useState<'cards' | 'matrix'>('cards');
  const [modal, setModal] = useState<string | null>(null);
  const fns = only ? FUNCTIONS.filter((f) => only.includes(f.id)) : FUNCTIONS;
  const shown = modal ? fns.filter((f) => f.forms.some((x) => x.k === modal)) : fns;
  const rows = MATRIX_ROWS.filter((r) => fns.some((f) => f.forms.some((x) => x.k === r)));
  return (
    <div>
      <SectionHead
        icon={Layers}
        color="var(--pink)"
        title="¿Qué expresa cada modal?"
        subtitle="Habilidad, permiso, posibilidad, obligación, prohibición, consejo, deducción, peticiones… Filtra por modal para ver todo lo que puede expresar."
        action={
          !only && (
            <Segmented<'cards' | 'matrix'>
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'cards', label: 'Tarjetas' },
                { value: 'matrix', label: 'Tabla' },
              ]}
            />
          )
        }
      />
      {view === 'cards' || only ? (
        <>
          <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1" role="group" aria-label="Filtrar por modal">
            <Chip active={!modal} onClick={() => setModal(null)}>
              Todos
            </Chip>
            {rows.map((r) => (
              <Chip key={r} active={modal === r} onClick={() => setModal(modal === r ? null : r)}>
                {r}
              </Chip>
            ))}
          </div>
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((f) => (
              <FunctionCard key={f.id} fn={f.id} highlight={modal} />
            ))}
          </div>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <caption className="sr-only">Funciones que puede expresar cada modal</caption>
              <thead>
                <tr className="bg-fill-2">
                  <th scope="col" className="bg-card sticky left-0 z-10 px-3 py-2 text-left text-[12px] font-semibold uppercase">
                    Modal
                  </th>
                  {fns.map((f) => {
                    const Icon = FN_ICON[f.id];
                    return (
                      <th key={f.id} scope="col" className="px-1.5 py-2 text-center align-bottom font-semibold">
                        <span className="flex flex-col items-center gap-1">
                          <Icon size={16} style={{ color: f.color }} aria-hidden />
                          <span className="text-[11px] leading-tight">{f.es}</span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r} className="hairline-t">
                    <th scope="row" className="bg-card sticky left-0 z-10 px-3 py-2 text-left text-[14px] font-semibold whitespace-nowrap">
                      {r}
                    </th>
                    {fns.map((f) => {
                      const form = f.forms.find((x) => x.k === r);
                      return (
                        <td key={f.id} className="px-1.5 py-2 text-center" title={form ? `${form.m}: ${form.note}` : undefined}>
                          {form ? (
                            <>
                              <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: f.color }} aria-hidden />
                              <span className="sr-only">Sí ({form.m})</span>
                            </>
                          ) : (
                            <span className="text-label-3" aria-label="No">
                              ·
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-label-2 hairline-t px-4 py-2.5 text-[13px]">Incluye formas negativas: «mustn't» cuenta en must, «don't have to» en have to, «needn't» en need.</p>
        </Card>
      )}
    </div>
  );
}

/** One function with every modal that expresses it. */
export function FunctionCard({ fn, highlight }: { fn: FunctionId; highlight?: string | null }) {
  const f = FUNCTION_BY_ID[fn];
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <IconTile icon={FN_ICON[fn]} color={f.color} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <h3 className="text-headline">{f.es}</h3>
            <span className="text-label-2 text-[13px]">{f.en}</span>
            <LevelChip level={f.level} className="ml-auto" />
          </div>
          <p className="text-label-2 text-[14px]">{f.summary}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {f.forms.map((x) => (
          <li
            key={x.m}
            className={cn('rounded-[12px] px-3 py-2 transition-colors', highlight && x.k === highlight ? 'ring-2' : 'bg-fill-2')}
            style={highlight && x.k === highlight ? { background: tint(f.color, 12), ['--tw-ring-color' as string]: f.color } : undefined}
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              <b className="text-[15px]">{x.m}</b>
              <span className="text-label-2 text-[13px]">{x.note}</span>
            </div>
            <Example e={x.e} className="mt-0.5" />
          </li>
        ))}
      </ul>
      {f.tip && (
        <p className="text-label-2 mt-2.5 flex gap-1.5 text-[13px]">
          <Lightbulb size={14} className="text-ios-orange mt-0.5 shrink-0" /> {f.tip}
        </p>
      )}
    </Card>
  );
}

// --------------------------------------------------------- certainty scale --

/** Deduction: the certainty scale (present / past) and a detective check. */
export function CertaintyScale({ withCheck = true }: { withCheck?: boolean }) {
  const [tense, setTense] = useState<'present' | 'past'>('present');
  return (
    <div>
      <SectionHead
        icon={ScanSearch}
        color="var(--pink)"
        title="Escala de certeza: deducción"
        subtitle="¿Cómo de seguro estás? Para el presente: modal + infinitivo. Para el pasado: modal + have + participio."
        action={
          <Segmented<'present' | 'past'>
            size="sm"
            value={tense}
            onChange={setTense}
            options={[
              { value: 'present', label: 'Presente' },
              { value: 'past', label: 'Pasado' },
            ]}
          />
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-4">
          <ol className="relative space-y-2 pl-5">
            <span className="absolute top-2 bottom-2 left-1.5 w-1.5 rounded-full bg-gradient-to-b from-[var(--green)] via-[var(--indigo)] to-[var(--red)]" aria-hidden />
            {CERTAINTY.map((c) => (
              <li key={c.id} className="bg-fill-2 rounded-[12px] px-3.5 py-2.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: c.color }}>
                    {c.pct}
                  </span>
                  <span className="text-label-2 text-[13px]">{c.es}</span>
                  <b className="ml-auto text-[16px]">{c[tense].m}</b>
                </div>
                <Example e={c[tense].e} className="mt-0.5" />
              </li>
            ))}
          </ol>
          <p className="text-label-2 mt-3 text-[13px]">
            Ojo: el contrario de <b>must</b> en deducción es <b>can't</b>, no mustn't. Y <b>can</b> en afirmativa no sirve para deducir.
          </p>
        </Card>
        {withCheck && <DeductionCheck tense={tense} />}
      </div>
    </div>
  );
}

function DeductionCheck({ tense }: { tense: 'present' | 'past' }) {
  const sfx = useSfx();
  const items = useMemo(() => DEDUCTION_CLUES.filter((c) => c.tense === tense), [tense]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  useEffect(() => {
    setI(0);
    setPicked(null);
    setScore(0);
  }, [tense]);
  const item = items[i];
  const stop = (id: string) => CERTAINTY.find((c) => c.id === id)!;
  const choose = (c: CertaintyStop) => {
    if (picked || !item) return;
    setPicked(c.id);
    const ok = c.id === item.answer;
    sfx(ok ? 'right' : 'wrong');
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= items.length) {
      const final = score;
      awardModals('deduction', 'escala de certeza', 4 + final * 2, Math.round((final / items.length) * 100));
      sfx('clear');
    }
    setI(i + 1);
    setPicked(null);
  };
  if (!item)
    return (
      <Card className="flex flex-col items-center p-6 text-center">
        <Trophy className="text-ios-yellow" size={34} />
        <p className="text-title-3 mt-2">
          {score}/{items.length} deducciones correctas
        </p>
        <Button className="mt-4" variant="gray" onClick={() => (setI(0), setScore(0))}>
          <RotateCcw size={15} /> Otra vez
        </Button>
      </Card>
    );
  const answer = stop(item.answer);
  const word = answer[tense].m.split(' / ')[0]!.replace(/ have$/, '');
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-headline">Detective de modales</h3>
        <span className="text-label-2 text-[13px] tabular-nums">
          {i + 1}/{items.length} · ✓ {score}
        </span>
      </div>
      <ProgressBar value={i / items.length} className="mb-4" color="var(--pink)" />
      <p className="text-label-2 text-[14px]">🔎 Pista: {item.clue}</p>
      <p className="mt-2 text-[20px] font-semibold">
        {item.s.split('___').map((part, k) => (
          <span key={k}>
            {k > 0 && (
              <span className={cn('mx-1 inline-block min-w-16 border-b-2 px-1 text-center', picked ? 'text-ios-blue border-[var(--blue)]' : 'border-[var(--label-3)]')}>
                {picked ? (tense === 'past' ? `${word} have` : word) : ' '}
              </span>
            )}
            {part}
          </span>
        ))}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CERTAINTY.map((c) => {
          const right = c.id === item.answer;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!!picked}
              onClick={() => choose(c)}
              className={cn(
                'flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-left text-[14px] transition-colors',
                !picked && 'bg-fill-2 hover:bg-fill',
                picked && right && 'bg-ios-green text-white',
                picked === c.id && !right && 'bg-ios-red text-white',
                picked && !right && picked !== c.id && 'bg-fill-2 opacity-50',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: picked && (right || picked === c.id) ? '#fff' : c.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <b>{c[tense].m}</b> <span className="opacity-75">· {c.es}</span>
              </span>
            </button>
          );
        })}
      </div>
      {picked && (
        <>
          <Feedback ok={picked === item.answer}>
            Respuesta: <b>{answer[tense].m}</b> — {answer.es.toLowerCase()}.
          </Feedback>
          <Button className="mt-3 w-full" onClick={next}>
            {i + 1 >= items.length ? 'Ver resultado' : 'Siguiente'}
          </Button>
        </>
      )}
    </Card>
  );
}

// -------------------------------------------------------- obligation scale --

/** Obligation, advice, no obligation and prohibition, with a signs check. */
export function ObligationScale({ withCheck = true }: { withCheck?: boolean }) {
  return (
    <div>
      <SectionHead
        icon={ClipboardCheck}
        color="var(--orange)"
        title="Obligación, consejo y prohibición"
        subtitle="La trampa más famosa: mustn't (prohibido) no es lo mismo que don't have to (no hace falta)."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OBLIGATION_LEVELS.map((l) => (
          <Card key={l.id} className="p-4" style={{ boxShadow: `inset 0 3px 0 ${l.color}, var(--shadow-card)` }}>
            <div className="text-[13px] font-bold tracking-wide uppercase" style={{ color: l.color }}>
              {l.es}
            </div>
            <div className="mt-1 text-[16px] font-semibold">{l.modals}</div>
            <Example e={l.e} className="mt-2" />
          </Card>
        ))}
      </div>
      {withCheck && (
        <div className="mx-auto mt-4 max-w-xl">
          <SignsCheck />
        </div>
      )}
    </div>
  );
}

function SignsCheck() {
  const sfx = useSfx();
  const [seed, setSeed] = useState(0);
  const items = useMemo(() => shuffle(OBLIGATION_SIGNS), [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<ObligationLevel | null>(null);
  const [score, setScore] = useState(0);
  const item = items[i];
  const choose = (l: ObligationLevel) => {
    if (picked || !item) return;
    setPicked(l);
    const ok = l === item.answer;
    sfx(ok ? 'right' : 'wrong');
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= items.length) {
      awardModals('obligation', 'señales de obligación', 4 + score, Math.round((score / items.length) * 100));
      sfx('clear');
    }
    setI(i + 1);
    setPicked(null);
  };
  if (!item)
    return (
      <Card className="flex flex-col items-center p-6 text-center">
        <Trophy className="text-ios-yellow" size={34} />
        <p className="text-title-3 mt-2">
          {score}/{items.length} señales correctas
        </p>
        <Button className="mt-4" variant="gray" onClick={() => (setSeed((s) => s + 1), setI(0), setScore(0))}>
          <RotateCcw size={15} /> Otra ronda
        </Button>
      </Card>
    );
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-headline">¿Qué significa la señal?</h3>
        <span className="text-label-2 text-[13px] tabular-nums">
          {i + 1}/{items.length} · ✓ {score}
        </span>
      </div>
      <div className="bg-fill-2 rounded-[14px] border-2 border-dashed border-[var(--separator)] px-4 py-5 text-center text-[20px] font-extrabold tracking-wide">{item.sign}</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {OBLIGATION_LEVELS.map((l) => {
          const right = l.id === item.answer;
          return (
            <button
              key={l.id}
              type="button"
              disabled={!!picked}
              onClick={() => choose(l.id)}
              className={cn(
                'rounded-[12px] px-3 py-3 text-[15px] font-semibold transition-colors',
                !picked && 'bg-fill-2 hover:bg-fill',
                picked && right && 'bg-ios-green text-white',
                picked === l.id && !right && 'bg-ios-red text-white',
                picked && !right && picked !== l.id && 'bg-fill-2 opacity-50',
              )}
            >
              {l.es}
            </button>
          );
        })}
      </div>
      {picked && (
        <>
          <Feedback ok={picked === item.answer}>
            <Example e={item.s} />
          </Feedback>
          <Button className="mt-3 w-full" onClick={next}>
            {i + 1 >= items.length ? 'Ver resultado' : 'Siguiente'}
          </Button>
        </>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------- rules --

/** The ten laws of modal verbs, with OK / NO examples and exceptions. */
export function ModalRules({ ids }: { ids?: number[] }) {
  const reduce = useReducedMotion();
  const list = RULES.map((r, i) => ({ ...r, n: i + 1 })).filter((r) => !ids || ids.includes(r.n));
  return (
    <div>
      <SectionHead icon={BookOpen} color="var(--orange)" title="Las diez leyes y sus excepciones" subtitle="La forma de los modales es muy regular: aprende estas reglas y evitarás el 90 % de los errores." />
      <ol className="grid gap-2.5 lg:grid-cols-2">
        {list.map((r, i) => (
          <motion.li key={r.n} initial={reduce ? false : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}>
            <Card className="flex h-full gap-3 p-4">
              <span className="bg-ios-orange flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[14px] font-bold text-white tabular-nums">{String(r.n).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] leading-snug font-semibold">{r.t}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-start gap-2 text-[15px]">
                    <span className="bg-ios-green mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white">
                      <Check size={12} strokeWidth={3} />
                      <span className="sr-only">Correcto:</span>
                    </span>
                    <Example e={r.ok} className="min-w-0 flex-1" />
                  </div>
                  <div className="flex items-start gap-2 text-[15px]">
                    <span className="bg-ios-red mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white">
                      <X size={12} strokeWidth={3} />
                      <span className="sr-only">Incorrecto:</span>
                    </span>
                    <s className="text-label-2 decoration-[var(--red)]">{r.no}</s>
                  </div>
                </div>
                {r.note && <p className="text-label-2 mt-2 text-[13px] leading-snug">{r.note}</p>}
              </div>
            </Card>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

// ------------------------------------------------------------ form builder --

type Role = 'subj' | 'modal' | 'not' | 'have' | 'verb';
const ROLE: Record<Role, { es: string; color: string }> = {
  subj: { es: 'sujeto', color: 'var(--blue)' },
  modal: { es: 'modal', color: 'var(--orange)' },
  not: { es: 'modal + not', color: 'var(--red)' },
  have: { es: 'have', color: 'var(--purple)' },
  verb: { es: 'verbo', color: 'var(--green)' },
};

function build(subj: string, m: BuilderModal, verb: (typeof BUILDER_VERBS)[number], type: BuilderType) {
  const s = subj === 'I' ? 'I' : subj.toLowerCase();
  const neg = NEGATIVES[m];
  const T = (t: string, r: Role) => ({ t, r });
  switch (type) {
    case 'aff':
      return { tokens: [T(subj, 'subj'), T(m, 'modal'), T(verb.base, 'verb')], end: '.', full: null };
    case 'neg':
      return { tokens: [T(subj, 'subj'), T(neg.short, 'not'), T(verb.base, 'verb')], end: '.', full: neg.full !== neg.short ? `${subj} ${neg.full} ${verb.base}.` : null };
    case 'q':
      return { tokens: [T(m[0]!.toUpperCase() + m.slice(1), 'modal'), T(s, 'subj'), T(verb.base, 'verb')], end: '?', full: null };
    case 'perf':
      return { tokens: [T(subj, 'subj'), T(m, 'modal'), T('have', 'have'), T(verb.pp, 'verb')], end: '.', full: null };
    case 'perfNeg':
      return { tokens: [T(subj, 'subj'), T(neg.short, 'not'), T('have', 'have'), T(verb.pp, 'verb')], end: '.', full: neg.full !== neg.short ? `${subj} ${neg.full} have ${verb.pp}.` : null };
  }
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center" role="group" aria-label={label}>
      <span className="text-label-2 w-20 shrink-0 text-[13px] font-semibold uppercase">{label}</span>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 sm:flex-wrap">{children}</div>
    </div>
  );
}

/** Build any modal sentence (affirmative, negative, question, past) and see what it means. */
export function FormBuilder({ modals = BUILDER_MODALS as readonly BuilderModal[] }: { modals?: readonly BuilderModal[] }) {
  const [subj, setSubj] = useState<string>('She');
  const [m, setM] = useState<BuilderModal>(modals[0] ?? 'can');
  const [v, setV] = useState(0);
  const [type, setType] = useState<BuilderType>('aff');
  const verb = BUILDER_VERBS[v]!;
  const out = build(subj, m, verb, type);
  const sentence = out.tokens.map((t) => t.t).join(' ') + out.end;
  const note = BUILDER_NOTES[m][type];
  const mayQ = m === 'may' && type === 'q' && subj !== 'I' && subj !== 'We';
  const bad = note.bad ?? (mayQ ? 'Con este sujeto suena raro: para preguntar por posibilidad, di «Do you think she may…?» o «Is she likely to…?».' : undefined);

  return (
    <Card className="p-5 sm:p-6">
      <SectionHead icon={Layers} color="var(--green)" title="Constructor de frases" subtitle="Sujeto + modal + infinitivo sin to. Sin -s, sin do. Cambia las piezas y mira qué significa cada forma." />
      <div className="space-y-2.5">
        <Row label="Sujeto">
          {BUILDER_SUBJECTS.map((s) => (
            <Chip key={s} active={subj === s} onClick={() => setSubj(s)}>
              {s}
            </Chip>
          ))}
        </Row>
        <Row label="Modal">
          {modals.map((x) => (
            <Chip key={x} active={m === x} onClick={() => setM(x)}>
              {x}
            </Chip>
          ))}
        </Row>
        <Row label="Verbo">
          {BUILDER_VERBS.map((x, i) => (
            <Chip key={x.base} active={v === i} onClick={() => setV(i)}>
              {x.base}
            </Chip>
          ))}
        </Row>
        <Row label="Forma">
          {BUILDER_TYPES.map((x) => (
            <Chip key={x.id} active={type === x.id} onClick={() => setType(x.id)}>
              {x.es}
            </Chip>
          ))}
        </Row>
      </div>

      <div className="bg-fill-2 mt-5 rounded-[16px] p-4">
        <div className="flex flex-wrap items-end gap-1.5" aria-hidden>
          {out.tokens.map((t, i) => (
            <span key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold tracking-wide uppercase" style={{ color: ROLE[t.r].color }}>
                {ROLE[t.r].es}
              </span>
              <span className="rounded-[10px] px-2.5 py-1 text-[15px] font-semibold" style={{ background: tint(ROLE[t.r].color, 16) }}>
                {t.t}
              </span>
            </span>
          ))}
          <span className="pb-1 text-[18px] font-bold">{out.end}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <p className={cn('min-w-0 flex-1 text-[22px] leading-snug font-semibold', note.bad && 'text-label-2 line-through decoration-[var(--red)]')} aria-live="polite">
            {sentence}
          </p>
          {!note.bad && <SpeakButton text={sentence} size={20} />}
        </div>
        {out.full && <p className="text-label-2 mt-1 text-[14px]">Forma completa: {out.full}</p>}
        <p className="text-label-2 mt-1 text-[13px]">🇪🇸 {verb.es}</p>
      </div>
      <Callout tone="blue" className="mt-3" icon={<Lightbulb size={16} />} title="Significado">
        {note.note}
      </Callout>
      {bad && (
        <Callout tone="orange" className="mt-2" icon={<TriangleAlert size={16} />} title="Cuidado">
          {bad}
        </Callout>
      )}
    </Card>
  );
}

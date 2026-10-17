import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Shuffle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Segmented } from '@/components/ui/Segmented';
import { useAvatar, type AvatarConfig, type AvatarFrame } from '@/store/avatar';
import { AvatarView, initialsOf } from './AvatarView';
import { BuilderSvg } from './BuilderSvg';
import { DEFAULT_BUILDER, PRESETS } from './presets';
import {
  BACKGROUNDS,
  BUILDER_OPTIONS,
  PORTRAITS,
  RINGS,
  SHAPES,
  bgCss,
  portraitSrc,
  type BgId,
  type BuilderParams,
  type ColorOpt,
  type Opt,
  type PortraitId,
} from './options';

type Tab = 'portrait' | 'builder' | 'initials';

interface Draft {
  tab: Tab;
  portrait: PortraitId;
  builder: BuilderParams;
  frame: AvatarFrame;
}

function draftFrom(c: AvatarConfig): Draft {
  const frame: AvatarFrame = { bg: c.bg ?? (c.kind === 'initials' ? 'brand' : 'sky'), ring: c.ring ?? 'none', shape: c.shape ?? 'circle' };
  return {
    tab: c.kind,
    portrait: c.kind === 'portrait' ? c.id : 'p01',
    builder: c.kind === 'builder' ? pickBuilder(c) : DEFAULT_BUILDER,
    frame,
  };
}

function pickBuilder(c: BuilderParams): BuilderParams {
  const out = {} as Record<keyof BuilderParams, string>;
  for (const k of Object.keys(BUILDER_OPTIONS) as (keyof BuilderParams)[]) out[k] = c[k];
  return out as unknown as BuilderParams;
}

function configOf(d: Draft): AvatarConfig {
  if (d.tab === 'portrait') return { kind: 'portrait', id: d.portrait, ...d.frame };
  if (d.tab === 'builder') return { kind: 'builder', ...d.builder, ...d.frame };
  return { kind: 'initials', ...d.frame };
}

// ---------------------------------------------------------------- random --

const rnd = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;
const chance = (p: number) => Math.random() < p;

function randomBuilder(): BuilderParams {
  const o = BUILDER_OPTIONS;
  const hairColor = chance(0.85) ? rnd(o.hairColor.slice(0, 8)).id : rnd(o.hairColor).id;
  return {
    skin: rnd(o.skin).id,
    face: rnd(o.face).id,
    hair: rnd(o.hair).id,
    hairColor,
    brows: rnd(o.brows).id,
    eyes: chance(0.7) ? rnd(['round', 'lashes'] as const) : rnd(o.eyes).id,
    eyeColor: rnd(o.eyeColor).id,
    mouth: chance(0.75) ? rnd(['smile', 'grin'] as const) : rnd(o.mouth).id,
    facialHair: chance(0.7) ? 'none' : rnd(o.facialHair).id,
    glasses: chance(0.65) ? 'none' : rnd(o.glasses).id,
    headwear: chance(0.8) ? 'none' : rnd(o.headwear).id,
    earrings: chance(0.65) ? 'none' : rnd(o.earrings).id,
    clothing: rnd(o.clothing).id,
    clothingColor: rnd(o.clothingColor).id,
  };
}
const PASTELS = BACKGROUNDS.slice(0, 11).map((b) => b.id);

// ---------------------------------------------------------- radio picker --

interface PickItem<T extends string> {
  id: T;
  label: string;
  node: ReactNode;
}

/** Horizontal (or grid) radio group with roving tabindex + arrow keys. */
function Picker<T extends string>({
  label,
  value,
  items,
  onChange,
  grid,
  size = 56,
}: {
  label: string;
  value: T;
  items: PickItem<T>[];
  onChange: (v: T) => void;
  grid?: boolean;
  size?: number;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const idx = items.findIndex((i) => i.id === value);
  const move = (e: KeyboardEvent, i: number) => {
    const n = items.length;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next]!.id);
    const el = refs.current[next];
    el?.focus();
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  return (
    <div className="space-y-1">
      <div id={id} className="text-label-2 px-5 text-[13px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className={cn(
          grid ? 'grid grid-cols-5 gap-3 px-5 py-1 sm:grid-cols-6' : 'no-scrollbar flex gap-2.5 overflow-x-auto px-5 py-2 scroll-px-5 snap-x',
        )}
      >
        {items.map((it, i) => {
          const on = i === idx;
          const tabbable = idx >= 0 ? on : i === 0;
          return (
            <button
              key={it.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={it.label}
              title={it.label}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(it.id)}
              onKeyDown={(e) => move(e, i)}
              className={cn(
                'relative shrink-0 snap-start rounded-full transition-transform duration-200 ease-ios active:scale-95',
                'outline-offset-2 focus-visible:outline-[3px]',
                grid && 'aspect-square w-full',
              )}
              style={grid ? undefined : { width: size, height: size }}
            >
              {it.node}
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute -inset-[3px] rounded-full transition-[box-shadow,opacity] duration-200',
                  on ? 'opacity-100 shadow-[0_0_0_2.5px_var(--blue)]' : 'opacity-0',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const Swatch = ({ css }: { css: string }) => (
  <span className="block h-full w-full rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.15)]" style={{ background: css }} />
);

const Thumb = ({ bg, children }: { bg: BgId; children: ReactNode }) => (
  <span className="relative block h-full w-full overflow-hidden rounded-full" style={{ background: bgCss(bg) }}>
    {children}
  </span>
);

// ------------------------------------------------------------------ rows --

const BUILDER_ROWS: { key: keyof BuilderParams; label: string; kind: 'swatch' | 'full' | 'face' }[] = [
  { key: 'skin', label: 'Tono de piel', kind: 'swatch' },
  { key: 'face', label: 'Forma de cara', kind: 'full' },
  { key: 'hair', label: 'Peinado', kind: 'full' },
  { key: 'hairColor', label: 'Color de pelo', kind: 'swatch' },
  { key: 'brows', label: 'Cejas', kind: 'face' },
  { key: 'eyes', label: 'Ojos', kind: 'face' },
  { key: 'eyeColor', label: 'Color de ojos', kind: 'swatch' },
  { key: 'mouth', label: 'Expresión', kind: 'face' },
  { key: 'facialHair', label: 'Vello facial', kind: 'face' },
  { key: 'glasses', label: 'Gafas', kind: 'face' },
  { key: 'headwear', label: 'Gorro', kind: 'full' },
  { key: 'earrings', label: 'Pendientes', kind: 'face' },
  { key: 'clothing', label: 'Ropa', kind: 'full' },
  { key: 'clothingColor', label: 'Color de ropa', kind: 'swatch' },
];

function BuilderRows({ d, set }: { d: Draft; set: (b: BuilderParams) => void }) {
  const presetIdx = PRESETS.findIndex((p) => (Object.keys(p.params) as (keyof BuilderParams)[]).every((k) => p.params[k] === d.builder[k]));
  return (
    <div className="space-y-5">
      <Picker
        label="Personajes"
        value={presetIdx >= 0 ? String(presetIdx) : ''}
        onChange={(v) => set(PRESETS[Number(v)]!.params)}
        items={PRESETS.map((p, i) => ({
          id: String(i),
          label: p.name,
          node: (
            <Thumb bg={d.frame.bg}>
              <BuilderSvg p={p.params} className="h-full w-full" />
            </Thumb>
          ),
        }))}
        size={60}
      />
      {BUILDER_ROWS.map(({ key, label, kind }) => {
        const opts = BUILDER_OPTIONS[key] as readonly (Opt | ColorOpt)[];
        return (
          <Picker
            key={key}
            label={label}
            value={d.builder[key]}
            onChange={(v) => set({ ...d.builder, [key]: v })}
            size={kind === 'swatch' ? 40 : 56}
            items={opts.map((o) => ({
              id: o.id,
              label: o.label,
              node:
                kind === 'swatch' && 'color' in o ? (
                  <Swatch css={o.color} />
                ) : (
                  <Thumb bg={d.frame.bg}>
                    <BuilderSvg p={{ ...d.builder, [key]: o.id }} crop={kind === 'face' ? 'face' : 'full'} className="h-full w-full" />
                  </Thumb>
                ),
            }))}
          />
        );
      })}
    </div>
  );
}

function FrameRows({ d, setFrame, name }: { d: Draft; setFrame: (f: AvatarFrame) => void; name: string }) {
  const cfg = configOf(d);
  return (
    <div className="space-y-5">
      <Picker
        label="Fondo"
        value={d.frame.bg}
        onChange={(bg) => setFrame({ ...d.frame, bg })}
        size={40}
        items={BACKGROUNDS.map((b) => ({ id: b.id, label: b.label, node: <Swatch css={b.swatch} /> }))}
      />
      <Picker
        label="Aro"
        value={d.frame.ring}
        onChange={(ring) => setFrame({ ...d.frame, ring })}
        size={52}
        items={RINGS.map((r) => ({
          id: r.id,
          label: r.label,
          node: <AvatarView config={{ ...cfg, ring: r.id }} name={name} size={52} />,
        }))}
      />
      <Picker
        label="Forma"
        value={d.frame.shape}
        onChange={(shape) => setFrame({ ...d.frame, shape })}
        size={52}
        items={SHAPES.map((s) => ({
          id: s.id,
          label: s.label,
          node: <AvatarView config={{ ...cfg, shape: s.id }} name={name} size={52} />,
        }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------- editor --

function useIsDesktop() {
  const q = '(min-width: 640px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

export function AvatarEditor({ open, onClose, name }: { open: boolean; onClose: () => void; name: string }) {
  if (typeof document === 'undefined') return null;
  return createPortal(<AnimatePresence>{open && <EditorSheet onClose={onClose} name={name} />}</AnimatePresence>, document.body);
}

function EditorSheet({ onClose, name }: { onClose: () => void; name: string }) {
  const saved = useAvatar((s) => s.config);
  const save = useAvatar((s) => s.set);
  const [d, setD] = useState<Draft>(() => draftFrom(saved));
  const desktop = useIsDesktop();
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const config = useMemo(() => configOf(d), [d]);

  // focus management: focus the sheet, trap Tab, restore focus on close
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheet.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !sheet.current) return;
    const f = sheet.current.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), [href], input, [tabindex="0"]');
    if (!f.length) return;
    const first = f[0]!;
    const last = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const shuffle = () =>
    setD((x) => {
      const frame = { ...x.frame, bg: rnd(PASTELS) };
      if (x.tab === 'portrait') return { ...x, portrait: rnd(PORTRAITS).id, frame };
      if (x.tab === 'builder') return { ...x, builder: randomBuilder(), frame };
      return { ...x, frame: { ...frame, bg: rnd(BACKGROUNDS).id } };
    });

  const setFrame = (frame: AvatarFrame) => setD((x) => ({ ...x, frame }));

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={desktop ? { opacity: 0, scale: 0.94, y: 12 } : { y: '100%' }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}
        className={cn(
          'bg-bg dark:bg-card text-label relative flex w-full flex-col overflow-hidden text-left outline-none',
          'shadow-float max-h-[94dvh] rounded-t-[var(--radius-sheet)] sm:max-h-[88vh] sm:max-w-[600px] sm:rounded-[var(--radius-sheet)]',
        )}
      >
        {/* grabber + nav bar */}
        <div className="material hairline-b sticky top-0 z-10">
          <div className="bg-label-3 mx-auto mt-2 h-[5px] w-9 rounded-full sm:hidden" aria-hidden />
          <div className="flex h-12 items-center justify-between px-3">
            <button type="button" onClick={onClose} className="text-ink-blue h-9 rounded-[10px] px-2 text-[17px] hover:opacity-70">
              Cancelar
            </button>
            <h2 id={titleId} className="text-headline">
              Editar avatar
            </h2>
            <button
              type="button"
              onClick={() => {
                save(config);
                onClose();
              }}
              className="text-ink-blue h-9 rounded-[10px] px-2 text-[17px] font-semibold hover:opacity-70"
            >
              Guardar
            </button>
          </div>
        </div>

        <div className="overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),20px)]">
          {/* preview */}
          <div className="flex flex-col items-center gap-3 px-5 pt-5 pb-4">
            <motion.div key={JSON.stringify(config)} initial={{ scale: 0.96 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
              <AvatarView config={config} name={name} size={desktop ? 160 : 136} className="drop-shadow-[0_10px_24px_rgb(0_0_0/0.18)]" />
            </motion.div>
            <button
              type="button"
              onClick={shuffle}
              className="bg-fill text-label inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-transform active:scale-95"
            >
              <Shuffle size={15} aria-hidden /> Aleatorio
            </button>
            <Segmented<Tab>
              className="mt-1 w-full max-w-[420px]"
              value={d.tab}
              onChange={(tab) => setD((x) => ({ ...x, tab }))}
              options={[
                { value: 'portrait', label: 'Retratos' },
                { value: 'builder', label: 'Crear' },
                { value: 'initials', label: 'Iniciales' },
              ]}
            />
          </div>

          <div className="space-y-6 pb-2">
            {d.tab === 'portrait' && (
              <Picker
                label="Elige un retrato"
                grid
                value={d.portrait}
                onChange={(portrait) => setD((x) => ({ ...x, portrait }))}
                items={PORTRAITS.map((p) => ({
                  id: p.id,
                  label: p.label,
                  node: (
                    <Thumb bg={d.frame.bg}>
                      <img src={portraitSrc(p.id)} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
                    </Thumb>
                  ),
                }))}
              />
            )}
            {d.tab === 'builder' && <BuilderRows d={d} set={(builder) => setD((x) => ({ ...x, builder }))} />}
            {d.tab === 'initials' && (
              <p className="text-label-2 px-5 text-center text-[14px]">
                Tus iniciales <span className="text-label font-semibold">{initialsOf(name)}</span> sobre el fondo que elijas.
              </p>
            )}
            <div className="hairline-t mx-5" />
            <FrameRows d={d} setFrame={setFrame} name={name} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

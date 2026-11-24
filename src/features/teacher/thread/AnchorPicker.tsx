import { useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react';
import type { CefrLevel, Unit } from '@/content/types';
import { cn } from '@/lib/cn';
import { tint } from '@/lib/color';
import { anchorLabel } from '@/lib/thread/bridges';
import { freeAnchor, grammarAnchor, vocabAnchor } from '@/lib/thread/plan';
import { clean } from '@/lib/thread/profiles';
import type { Anchor } from '@/lib/thread/types';
import { Pill, anchorColor } from './ui';

interface Opt {
  key: string;
  label: string;
  sub: string;
  type: 'grammar' | 'vocab' | 'free';
  unit?: Unit;
  point?: number;
}

/** Un solo campo: escribe una frase libre, o busca un punto/palabra de todas las unidades del nivel. */
export function AnchorPicker({ level, units, anchors, onChange, max }: { level: CefrLevel; units: Unit[]; anchors: Anchor[]; onChange: (a: Anchor[]) => void; max: number }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [byUnit, setByUnit] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const id = useId();
  const full = anchors.length >= max;

  const index = useMemo<Opt[]>(
    () => [
      ...units.flatMap((u) => u.grammar.map((g, i) => ({ key: `g${u.n}-${i}`, label: g.name, sub: `Unidad ${u.n}`, type: 'grammar' as const, unit: u, point: i }))),
      ...units.flatMap((u) => u.vocab.map((v, i) => ({ key: `v${u.n}-${i}`, label: clean(v.term), sub: `Vocabulario · unidad ${u.n}`, type: 'vocab' as const, unit: u, point: i }))),
    ],
    [units],
  );
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [] as Opt[];
    return index.filter((o) => o.label.toLowerCase().includes(s)).slice(0, 8);
  }, [q, index]);
  const options: Opt[] = q.trim().length >= 2 ? [...results, { key: 'free', label: q.trim(), sub: 'Usar como tema libre', type: 'free' }] : [];

  const add = (o: Opt) => {
    if (full) return;
    let a: Anchor;
    if (o.type === 'grammar') {
      if (anchors.some((x) => x.type === 'grammar' && x.unit === o.unit!.n && x.point === o.point)) return;
      a = grammarAnchor(o.unit!, o.point!, level);
    } else if (o.type === 'vocab') a = vocabAnchor(o.unit!, [o.unit!.vocab[o.point!]!.term]);
    else a = freeAnchor(o.label);
    onChange([...anchors, a]);
    setQ('');
    setOpen(false);
    setActive(0);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= anchors.length) return;
    const c = [...anchors];
    [c[i], c[j]] = [c[j]!, c[i]!];
    onChange(c);
  };
  const toggleGrammar = (u: Unit, p: number) => {
    const at = anchors.findIndex((x) => x.type === 'grammar' && x.unit === u.n && x.point === p);
    if (at >= 0) onChange(anchors.filter((_, i) => i !== at));
    else if (!full) onChange([...anchors, grammarAnchor(u, p, level)]);
  };

  return (
    <div>
      <div className="relative">
        <Search size={16} aria-hidden className="text-label-3 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
        <input
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && options[active] ? `${id}-o${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Ancla: una frase, un tema, un punto gramatical o una palabra"
          value={q}
          disabled={full}
          placeholder={full ? `Máximo ${max} anclas` : 'Escribe una frase o tema (“Mis alumnos van de viaje”) o busca un punto: past simple, passive…'}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(options.length - 1, a + 1)));
            else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
            else if (e.key === 'Enter' && options[active]) (e.preventDefault(), add(options[active]!));
            else if (e.key === 'Escape') setOpen(false);
          }}
          className="bg-fill-2 placeholder:text-label-3 h-11 w-full rounded-[12px] pr-3 pl-9 text-[15px] outline-none focus:ring-2 disabled:opacity-60"
        />
        {open && options.length > 0 && (
          <ul id={`${id}-list`} role="listbox" aria-label="Sugerencias" className="bg-card shadow-card absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-[14px] p-1">
            {options.map((o, i) => (
              <li
                key={o.key}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn('flex cursor-pointer items-baseline justify-between gap-3 rounded-[10px] px-3 py-2 text-[14.5px]', i === active && 'bg-fill-2')}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                <span className="text-label-2 shrink-0 text-[12px]">{o.sub}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Anclas elegidas">
        {anchors.map((a, i) => (
          <li
            key={a.id}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag === null || drag === i) return;
              const c = [...anchors];
              const [m] = c.splice(drag, 1);
              c.splice(i, 0, m!);
              onChange(c);
              setDrag(null);
            }}
            className="flex max-w-full cursor-grab items-center gap-1 rounded-full py-1 pr-1 pl-3 text-[13.5px] font-medium"
            style={{ background: tint(anchorColor(i), 16), boxShadow: `inset 0 0 0 1.5px ${anchorColor(i)}` }}
          >
            <span className="truncate">{anchorLabel(a)}</span>
            {a.type !== 'free' && <span className="text-label-2 text-[11px]">U{a.unit}</span>}
            {a.type === 'free' && <span className="text-label-2 text-[11px]">tema</span>}
            {a.profile.confidence === 'low' && <Pill tone="amber" title="No reconozco bien la función de este punto: revisa el contexto.">perfil genérico</Pill>}
            <button type="button" aria-label={`Mover ${anchorLabel(a)} antes`} disabled={i === 0} onClick={() => move(i, -1)} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/40 disabled:opacity-30"><ArrowLeft size={12} /></button>
            <button type="button" aria-label={`Mover ${anchorLabel(a)} después`} disabled={i === anchors.length - 1} onClick={() => move(i, 1)} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/40 disabled:opacity-30"><ArrowRight size={12} /></button>
            <button type="button" aria-label={`Quitar ${anchorLabel(a)}`} onClick={() => onChange(anchors.filter((x) => x.id !== a.id))} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/40"><X size={13} /></button>
          </li>
        ))}
        {!anchors.length && <li className="text-label-2 text-[13px]">Añade entre 1 y {max} anclas. Pueden ser de unidades distintas.</li>}
      </ul>

      <button type="button" onClick={() => setByUnit(!byUnit)} aria-expanded={byUnit} className="text-ink-blue mt-2 text-[13.5px] font-semibold">
        {byUnit ? 'Ocultar' : 'Elegir por unidad'}
      </button>
      {byUnit && (
        <div className="mt-2 max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
          {units.map((u) => (
            <div key={u.n} className="flex items-start gap-2">
              <span title={u.theme} className="bg-fill-2 mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">{u.n}</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {u.grammar.map((g, p) => {
                  const on = anchors.some((x) => x.type === 'grammar' && x.unit === u.n && x.point === p);
                  return (
                    <button key={g.name} type="button" aria-pressed={on} disabled={!on && full} onClick={() => toggleGrammar(u, p)} className={cn('min-h-8 rounded-full px-3 py-1 text-left text-[13px] transition-colors disabled:opacity-40', on ? 'bg-[color-mix(in_srgb,var(--blue)_18%,transparent)] font-semibold' : 'bg-fill-2/60 hover:bg-fill-2')}>
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { HEX, type WidgetProps } from '../util';
import { Act, inputCls, Label, Panel } from './ui';

interface Opt {
  label: string;
  count: number;
}
interface D {
  q: string;
  options: Opt[];
}

const PRESETS: { label: string; opts: string[] }[] = [
  { label: 'Sí / No', opts: ['Sí 👍', 'No 👎'] },
  { label: 'Sí / No / Quizás', opts: ['Sí 👍', 'No 👎', 'Quizás 🤔'] },
  { label: 'A B C D', opts: ['A', 'B', 'C', 'D'] },
  { label: '😀 😐 😟', opts: ['😀', '😐', '😟'] },
];

export const DEFAULT_POLL: D = { q: '¿Entendieron?', options: PRESETS[1]!.opts.map((label) => ({ label, count: 0 })) };

export default function Poll({ data, set, editing, setEditing }: WidgetProps<D>) {
  const q = data.q ?? DEFAULT_POLL.q;
  const options = data.options?.length ? data.options : DEFAULT_POLL.options;
  const total = options.reduce((s, o) => s + o.count, 0);
  const max = Math.max(1, ...options.map((o) => o.count));
  const upd = (i: number, p: Partial<Opt>) => set({ options: options.map((o, j) => (j === i ? { ...o, ...p } : o)) });

  if (editing)
    return (
      <Panel>
        <Label>Pregunta</Label>
        <input className={inputCls} value={q} onChange={(e) => set({ q: e.target.value })} placeholder="Escribe la pregunta" />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="bg-fill-2 hover:bg-fill h-8 rounded-full px-3 text-[13px] font-semibold" onClick={() => set({ options: p.opts.map((label) => ({ label, count: 0 })) })}>
              {p.label}
            </button>
          ))}
        </div>
        <Label>Opciones</Label>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: HEX[i % HEX.length] }} />
            <input className={inputCls} value={o.label} onChange={(e) => upd(i, { label: e.target.value })} aria-label={`Opción ${i + 1}`} />
            <button type="button" aria-label="Quitar" disabled={options.length <= 2} onClick={() => set({ options: options.filter((_, j) => j !== i) })} className="text-ink-red grid h-10 w-10 shrink-0 place-items-center disabled:opacity-30">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          {options.length < 6 && (
            <Act color="var(--blue)" onClick={() => set({ options: [...options, { label: String.fromCharCode(65 + options.length), count: 0 }] })}>
              <Plus size={18} /> Opción
            </Act>
          )}
          <Act solid color="var(--blue)" className="ml-auto" onClick={() => setEditing(false)}>
            Listo
          </Act>
        </div>
      </Panel>
    );

  return (
    <div className="flex h-full flex-col gap-2 p-3 [container-type:inline-size]">
      <div className="font-rounded text-center text-[clamp(18px,7cqw,44px)] leading-tight font-bold">{q}</div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
        {options.map((o, i) => {
          const c = HEX[i % HEX.length]!;
          const pct = total ? Math.round((o.count / total) * 100) : 0;
          return (
            <div key={i} className="flex min-h-11 flex-1 items-stretch gap-2" style={{ maxHeight: 84 }}>
              <button
                type="button"
                onClick={() => upd(i, { count: o.count + 1 })}
                className="relative flex flex-1 items-center overflow-hidden rounded-[14px] text-left transition-transform active:scale-[0.98]"
                style={{ background: `color-mix(in srgb, ${c} 12%, var(--card))`, boxShadow: `inset 4px 0 0 ${c}` }}
                aria-label={`Sumar a ${o.label}`}
              >
                <span className="absolute inset-y-0 left-0 rounded-[14px] transition-[width] duration-500 ease-ios" style={{ width: `${(o.count / max) * 100}%`, background: `color-mix(in srgb, ${c} 60%, var(--card))` }} />
                <span className="relative flex w-full items-center justify-between gap-2 px-4 text-[clamp(16px,5cqw,30px)] font-bold">
                  <span className="truncate">{o.label}</span>
                  <span className="tabular-nums">
                    {o.count}
                    {total > 0 && <span className="ml-1.5 text-[0.65em] opacity-80">{pct}%</span>}
                  </span>
                </span>
              </button>
              <button type="button" aria-label={`Restar a ${o.label}`} disabled={!o.count} onClick={() => upd(i, { count: o.count - 1 })} className="bg-fill-2 text-label-2 grid w-10 shrink-0 place-items-center rounded-[12px] disabled:opacity-30">
                <Minus size={18} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-label-2 text-[14px] font-semibold">Total: {total}</span>
        <Act color="var(--label)" className="h-9" onClick={() => set({ options: options.map((o) => ({ ...o, count: 0 })) })} disabled={!total}>
          <RotateCcw size={16} /> Reiniciar
        </Act>
      </div>
    </div>
  );
}

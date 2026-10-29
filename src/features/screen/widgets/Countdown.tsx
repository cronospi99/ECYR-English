import { PartyPopper } from 'lucide-react';
import { useNow, type WidgetProps } from '../util';
import { Act, inputCls, Label, Panel } from './ui';

interface D {
  title: string;
  at: string; // datetime-local value
}

const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Next Friday 8:00 as a default event. */
function defaultAt() {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  d.setHours(8, 0, 0, 0);
  return local(d);
}

export default function Countdown({ data, set, editing, setEditing }: WidgetProps<D>) {
  const now = useNow(true, 1000);
  const title = data.title ?? 'Examen';
  const at = data.at ?? defaultAt();
  const target = new Date(at).getTime();
  const left = Number.isFinite(target) ? Math.max(0, target - now) : 0;
  const s = Math.floor(left / 1000);
  const parts: [number, string][] = [
    [Math.floor(s / 86400), 'días'],
    [Math.floor((s % 86400) / 3600), 'horas'],
    [Math.floor((s % 3600) / 60), 'min'],
    [s % 60, 'seg'],
  ];

  if (editing)
    return (
      <Panel>
        <Label>Evento</Label>
        <input className={inputCls} value={title} onChange={(e) => set({ title: e.target.value })} aria-label="Evento" />
        <Label>Fecha y hora</Label>
        <input type="datetime-local" className={inputCls} value={at} onChange={(e) => set({ at: e.target.value })} aria-label="Fecha y hora" />
        <Act solid color="var(--blue)" onClick={() => setEditing(false)}>
          Listo
        </Act>
      </Panel>
    );

  return (
    <div className="flex h-full flex-col items-center justify-evenly p-3 [container-type:size]">
      <div className="font-rounded text-center leading-tight font-bold" style={{ fontSize: 'min(13cqh, 9cqw)' }}>
        {title}
      </div>
      {left > 0 ? (
        <div className="flex gap-[2.5cqw]">
          {parts.map(([v, l], i) => (
            <div key={l} className="flex flex-col items-center rounded-[14px] px-[2.5cqw] py-[2cqh]" style={{ background: `color-mix(in srgb, ${['var(--indigo)', 'var(--blue)', 'var(--teal)', 'var(--mint)'][i]} 16%, transparent)` }}>
              <span className="font-rounded leading-none font-black tabular-nums" style={{ fontSize: 'min(30cqh, 12cqw)' }}>
                {v}
              </span>
              <span className="text-label-2 font-semibold" style={{ fontSize: 'min(8cqh, 4cqw)' }}>
                {l}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-ink-orange flex items-center gap-3 font-black" style={{ fontSize: 'min(20cqh, 10cqw)' }}>
          <PartyPopper style={{ width: '1em', height: '1em' }} /> ¡Hoy!
        </div>
      )}
      <div className="text-label-2 font-semibold first-letter:uppercase" style={{ fontSize: 'min(7cqh, 4.5cqw)' }}>
        {Number.isFinite(target) ? new Date(target).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''}
      </div>
    </div>
  );
}

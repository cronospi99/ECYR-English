import { Minus, Plus, Sparkles, Users, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { PageLoader } from '@/components/ui/Misc';
import { CEFR_LEVELS, type CefrLevel, type Unit } from '@/content/types';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';
import { AUDIENCES, isIntergenerational, mixTotal, type Mix } from '@/lib/engagement';
import { STYLES } from '@/lib/lessonThread';
import { anchorLabel } from '@/lib/thread/bridges';
import { maxAnchors } from '@/lib/thread/plan';
import type { Anchor, Bridge } from '@/lib/thread/types';
import { AnchorPicker } from './AnchorPicker';
import { Pill } from './ui';

export interface PlannerState {
  level: CefrLevel;
  anchors: Anchor[];
  duration: number;
  mix: Mix;
  style: string;
  userContext: string;
  useAi: boolean;
}

const DURATIONS = [30, 45, 60, 90];

export interface Proposal {
  bridge: Bridge;
  note?: string;
}

/** Zona de entrada: nivel, anclas, duración, perfil del grupo, IA y contextos propuestos. */
export function Planner({
  s, set, units, loading, color, aiOk, busy, onPropose, onBest, proposals, onChoose, hasPlan, onAddToPlan,
}: {
  s: PlannerState;
  set: (p: Partial<PlannerState>) => void;
  units: Unit[];
  loading: boolean;
  color: string;
  aiOk: boolean;
  busy: boolean;
  onPropose: () => void;
  onBest: () => void;
  proposals: Proposal[] | null;
  onChoose: (b: Bridge) => void;
  hasPlan: boolean;
  onAddToPlan: () => void;
}) {
  const total = mixTotal(s.mix);
  const max = maxAnchors(s.level, s.duration);
  const setMix = (id: keyof Mix, n: number) => set({ mix: { ...s.mix, [id]: Math.max(0, Math.min(60, n)) } });
  const ready = s.anchors.length > 0 && total > 0 && !loading;
  return (
    <Card className="no-print mb-5 space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="no-scrollbar overflow-x-auto">
          <Segmented<CefrLevel> value={s.level} onChange={(l) => set({ level: l, anchors: [] })} options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))} />
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[14px] font-medium">
          <input type="checkbox" role="switch" checked={s.useAi && aiOk} disabled={!aiOk} onChange={(e) => set({ useAi: e.target.checked })} className="h-5 w-5" aria-label="Usar IA" />
          <Sparkles size={15} /> Usar IA
          {!aiOk && <span className="text-label-2 text-[12px]">(sin conexión)</span>}
        </label>
      </div>

      <div>
        <div className="text-label-2 mb-1.5 text-[12px] font-semibold tracking-wide uppercase">Anclas · {s.anchors.length}/{max}</div>
        {loading ? <PageLoader /> : <AnchorPicker level={s.level} units={units} anchors={s.anchors} onChange={(anchors) => set({ anchors })} max={max} />}
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div>
          <div className="text-label-2 mb-1.5 text-[12px] font-semibold tracking-wide uppercase">Duración</div>
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Duración de la clase">
            {DURATIONS.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={s.duration === d} onClick={() => set({ duration: d })} className={cn('h-9 rounded-full px-3.5 text-[14px] font-semibold', s.duration === d ? 'text-white' : 'bg-fill-2 hover:bg-fill')} style={s.duration === d ? { background: ink(color, 80) } : undefined}>
                {d} min
              </button>
            ))}
            <input
              type="number"
              min={15}
              max={180}
              value={DURATIONS.includes(s.duration) ? '' : s.duration}
              placeholder="otra"
              aria-label="Duración personalizada en minutos"
              onChange={(e) => set({ duration: Math.max(15, Math.min(180, Number(e.target.value) || 60)) })}
              className="bg-fill-2 h-9 w-20 rounded-full px-3 text-center text-[14px] outline-none"
            />
          </div>
        </div>
        <div>
          <div className="text-label-2 mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase">
            <Users size={14} /> Perfil del grupo · {total}
            {isIntergenerational(s.mix) && <Pill>Edades mezcladas</Pill>}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {AUDIENCES.map((a) => {
              const n = s.mix[a.id] || 0;
              return (
                <div key={a.id} className="flex flex-col gap-1 rounded-[12px] px-2 py-1.5" style={n ? { background: tint(color, 14), boxShadow: `inset 0 0 0 1.5px ${color}` } : { background: 'var(--fill-2)' }}>
                  <span className="min-w-0 text-[12.5px] leading-tight font-semibold"><span aria-hidden>{a.emoji}</span> {a.label} <span className="text-label-2 text-[11px] font-normal">{a.ages}</span></span>
                  <span className="flex items-center justify-center">
                    <button type="button" aria-label={`Menos ${a.label}`} disabled={!n} onClick={() => setMix(a.id, n - 1)} className="bg-card inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-40"><Minus size={13} /></button>
                    <input value={n} inputMode="numeric" aria-label={`Número de ${a.label}`} onChange={(e) => setMix(a.id, Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-9 bg-transparent text-center text-[14px] font-bold tabular-nums outline-none" />
                    <button type="button" aria-label={`Más ${a.label}`} onClick={() => setMix(a.id, n + 1)} className="bg-card inline-flex h-7 w-7 items-center justify-center rounded-full"><Plus size={13} /></button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <details>
        <summary className="text-label-2 cursor-pointer text-[13px] font-semibold">Ajuste fino</summary>
        <div className="mt-2 space-y-3">
          <div>
            <div className="text-label-2 mb-1 text-[12px] font-semibold">Recurso central preferido</div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Estilo del recurso central">
              {[{ id: '', label: 'Automático', emoji: '✨' }, ...STYLES].map((st) => (
                <button key={st.id} type="button" role="radio" aria-checked={s.style === st.id} onClick={() => set({ style: st.id })} className={cn('h-8 rounded-full px-3 text-[13px] font-medium', s.style === st.id ? 'text-white' : 'bg-fill-2 hover:bg-fill')} style={s.style === st.id ? { background: ink(color, 80) } : undefined}>
                  <span aria-hidden>{st.emoji}</span> {st.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-[12px] font-semibold">
            Contexto sugerido por ti (opcional)
            <input value={s.userContext} onChange={(e) => set({ userContext: e.target.value })} maxLength={160} placeholder="Ej.: una agencia de viajes escolar" className="bg-fill-2 mt-1 block h-10 w-full rounded-[12px] px-3 text-[15px] font-normal outline-none focus:ring-2" />
          </label>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onPropose} disabled={!ready || busy}><Wand2 size={17} /> {busy ? 'Pensando…' : 'Proponer plan'}</Button>
        <Button variant="tinted" onClick={onBest} disabled={!ready || busy}>Plan con el mejor</Button>
        {hasPlan && <Button variant="gray" onClick={onAddToPlan} disabled={!ready || busy}>Añadir al plan actual</Button>}
        <span className="text-label-2 text-[12.5px]">{ready ? 'Mínimo: nivel + 1 ancla + «Plan con el mejor».' : 'Añade al menos una ancla.'}</span>
      </div>

      {proposals && (
        <div aria-live="polite">
          <div className="text-label-2 mb-1.5 text-[12px] font-semibold tracking-wide uppercase">Elige un contexto puente</div>
          <div className="grid gap-3 md:grid-cols-3">
            {proposals.map((p) => (
              <div key={p.bridge.id} className="bg-fill-2/60 flex flex-col rounded-[16px] p-3.5">
                <div className="text-headline">{p.bridge.title} {p.bridge.source === 'ia' && <Pill tone="green">IA</Pill>}</div>
                <p className="mt-0.5 text-[14px]" lang="en">{p.bridge.setting}</p>
                <p className="text-label-2 mt-0.5 text-[13px] italic" lang="en">{p.bridge.conflict}</p>
                <ul className="mt-2 flex-1 space-y-1 text-[13px]">
                  {s.anchors.map((a) => (
                    <li key={a.id}>• {p.bridge.rationale[a.id] || `${anchorLabel(a)} encaja aquí.`}</li>
                  ))}
                </ul>
                <Button size="sm" className="mt-3 self-start" onClick={() => onChoose(p.bridge)}>Usar este contexto</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

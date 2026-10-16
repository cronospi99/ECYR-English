import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Misc';
import { bandToCefr, type IeltsSnapshot } from '@/lib/ielts';
import { relativeTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { ink } from '@/lib/color';

const MODS = ['listening', 'reading', 'writing', 'speaking'] as const;
const COLOR: Record<string, string> = {
  listening: 'var(--skill-listening)',
  reading: 'var(--skill-reading)',
  writing: 'var(--skill-writing)',
  speaking: 'var(--skill-speaking)',
};

/** Bands and attempt history of the IELTS simulator (own or a student's). */
export function IeltsSummary({ data, own = false }: { data: IeltsSnapshot; own?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Award size={20} className="text-ink-indigo" />
          <h3 className="text-title-3">Bandas IELTS</h3>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className={cn('text-[52px] leading-none font-extrabold tabular-nums', data.overall == null && 'text-label-3')}>
            {data.overall != null ? data.overall.toFixed(1) : '–'}
          </span>
          <span className="text-label-2 pb-1.5 text-[13px]">
            {data.overall != null ? `Overall · ≈ ${bandToCefr(data.overall)}` : 'Sin módulos calificados'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODS.map((m) => (
            <div key={m} className="bg-fill-2 rounded-[14px] p-3 text-center">
              <div className={cn('text-[20px] font-bold tabular-nums', data.scores[m] == null && 'text-label-3')} style={{ color: data.scores[m] != null ? ink(COLOR[m]) : undefined }}>
                {data.scores[m]?.toFixed(1) ?? '–'}
              </div>
              <div className="text-label-2 text-[11px] capitalize">{m}</div>
            </div>
          ))}
        </div>
        {own && (
          <Link to="/ielts/progress" className="text-ink-indigo mt-4 inline-block text-[14px] font-semibold">
            Ver progreso en el simulador
          </Link>
        )}
      </Card>
      <Card className="pb-2">
        <CardHeader title="Historial de intentos" subtitle={`${data.history.length} intentos registrados`} />
        {data.history.length === 0 ? (
          <EmptyState icon={<Award size={40} />} title="Sin intentos aún" body={own ? 'Haz un módulo del simulador o migra tu progreso anterior.' : undefined} />
        ) : (
          <ul className="mt-2 max-h-[340px] overflow-y-auto">
            {data.history.map((h, i) => (
              <li key={`${h.date}-${i}`} className="flex items-center gap-3 px-5 py-2 text-[14px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR[h.module] ?? 'var(--label-3)' }} />
                <span className="w-20 shrink-0 capitalize">{h.module}</span>
                <span className="text-label-2 min-w-0 flex-1 truncate text-[12px]">{h.detail}</span>
                <span className="text-label-2 shrink-0 text-[12px]">{relativeTime(h.date)}</span>
                <span className="w-10 shrink-0 text-right font-bold tabular-nums">{Number(h.band).toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* Class Wars — choose the question level and ONE unit (or the whole level). Used by students in the
   lobby (when the teacher allows it) and in the demo. */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { LEVELS, loadBank, type Pick } from '../game/questions';
import { t } from '../i18n';

export function UnitPicker({ value, onChange, compact }: { value: Pick | null; onChange: (p: Pick) => void; compact?: boolean }) {
  const lv = value?.lv ?? 'A2';
  const [units, setUnits] = useState<[number, string][]>([]);
  useEffect(() => { let on = true; void loadBank(lv).then((b) => on && setUnits(b.units)); return () => { on = false; }; }, [lv]);
  return (
    <div className="w-full">
      <div className="cw-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {LEVELS.map((l) => (
          <button key={l} type="button" onClick={() => onChange({ lv: l, un: 0 })} className={cn('h-9 shrink-0 rounded-xl px-3 text-[14px] font-black', value?.lv === l ? 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_3px_0_#c79a00]' : 'bg-white/10 hover:bg-white/15')}>{l}</button>
        ))}
      </div>
      {value && (
        <div className={cn('cw-scroll mt-2 flex flex-wrap gap-1.5 overflow-y-auto', compact ? 'max-h-[96px]' : 'max-h-[180px]')}>
          <button type="button" onClick={() => onChange({ lv, un: 0 })} className={cn('rounded-xl px-2.5 py-1 text-[12.5px] font-bold', value.un === 0 ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/8 text-white/80 hover:bg-white/15')}>{t('Whole level', 'Todo el nivel')}</button>
          {units.map(([n, title]) => (
            <button key={n} type="button" onClick={() => onChange({ lv, un: n })} className={cn('rounded-xl px-2.5 py-1 text-left text-[12.5px] font-bold', value.un === n ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/8 text-white/80 hover:bg-white/15')}>{n}. {title}</button>
          ))}
        </div>
      )}
    </div>
  );
}

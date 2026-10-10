import { ProgressRing } from '@/components/ui/Progress';
import type { Skill } from '@/content/types';

export const SKILL_META: Record<'listening' | 'reading' | 'writing' | 'speaking', { label: string; color: string }> = {
  listening: { label: 'Listening', color: 'var(--skill-listening)' },
  reading: { label: 'Reading', color: 'var(--skill-reading)' },
  writing: { label: 'Writing', color: 'var(--skill-writing)' },
  speaking: { label: 'Speaking', color: 'var(--skill-speaking)' },
};

/** Four skill rings, each directly labelled (name + value) so identity never relies on colour alone. */
export function SkillRings({ skillXp, goal = 300 }: { skillXp: Record<Skill, number>; goal?: number }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(Object.keys(SKILL_META) as (keyof typeof SKILL_META)[]).map((k) => {
        const xp = skillXp[k] ?? 0;
        const ratio = Math.min(1, xp / goal);
        return (
          <div key={k} className="flex flex-col items-center gap-2">
            <ProgressRing value={ratio} size={74} stroke={7} color={SKILL_META[k].color} label={`${SKILL_META[k].label}: ${xp} XP`}>
              <span className="text-[17px] font-bold tabular-nums">{Math.round(ratio * 100)}%</span>
            </ProgressRing>
            <div className="text-center">
              <div className="text-[13px] font-semibold">{SKILL_META[k].label}</div>
              <div className="text-label-2 text-[11px] tabular-nums">{xp} XP</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

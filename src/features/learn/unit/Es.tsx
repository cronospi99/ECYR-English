/* Spanish support in the lessons shrinks with the level. Pre-A1 to the middle of B1 keep full Spanish
   explanations; from the second half of B1 it narrows step by step until, at the end of C2, only a tap-to-reveal
   gloss of the grammar point is left. A learner can ask for full help everywhere in Profile ("Always show Spanish help"). */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { useSettings } from '@/store/settings';

export type EsTier = 'full' | 'high' | 'grammar' | 'gloss' | 'minimal';
/** purpose = the one-line "what it is for"; idea = the short explanation; extra = notes, mistakes, tips;
 *  example = translations of examples; label = Spanish names on the formula chips; explain = answer explanations. */
export type EsPart = 'purpose' | 'idea' | 'extra' | 'example' | 'label' | 'explain';
type Vis = 'show' | 'tap' | 'hide';

const S: Vis = 'show', T: Vis = 'tap', H: Vis = 'hide';
const MATRIX: Record<EsTier, Record<EsPart, Vis>> = {
  full: { purpose: S, idea: S, extra: S, example: S, label: S, explain: S },
  high: { purpose: S, idea: S, extra: S, example: T, label: S, explain: S },
  grammar: { purpose: S, idea: S, extra: T, example: T, label: T, explain: S },
  gloss: { purpose: S, idea: T, extra: T, example: H, label: H, explain: T },
  minimal: { purpose: T, idea: H, extra: H, example: H, label: H, explain: T },
};

/** Tier for a unit: B1 units 1–8 full; B1 9–16 and B2 1–4 high; B2 5–12 and C1 1–4 grammar; C1 5–10 and C2 1–4 gloss; C2 5–10 minimal. */
export function esTier(level: string | undefined, unit: number): EsTier {
  if (level === 'B1') return unit <= 8 ? 'full' : 'high';
  if (level === 'B2') return unit <= 4 ? 'high' : 'grammar';
  if (level === 'C1') return unit <= 4 ? 'grammar' : 'gloss';
  if (level === 'C2') return unit <= 4 ? 'gloss' : 'minimal';
  return 'full';
}

const Ctx = createContext<EsTier>('full');
export function EsProvider({ unitKey, children }: { unitKey?: string; children: ReactNode }) {
  const [level, n] = (unitKey ?? '').split('-');
  return <Ctx.Provider value={esTier(level, Number(n) || 1)}>{children}</Ctx.Provider>;
}

export function useEsVisibility(part: EsPart): Vis {
  const tier = useContext(Ctx);
  const always = useSettings((s) => s.esHelp === 'always');
  return always ? 'show' : MATRIX[tier][part];
}

/** Spanish text for one part of a lesson: shown, behind a small "ES" tap, or left out (then `fallback`). */
export function Es({ part, children, fallback = null }: { part: EsPart; children: ReactNode; fallback?: ReactNode }) {
  const vis = useEsVisibility(part);
  const [open, setOpen] = useState(false);
  if (vis === 'show') return <>{children}</>;
  if (vis === 'hide') return <>{fallback}</>;
  return open ? (
    <>{children}</>
  ) : (
    <>
      {fallback}
      <button type="button" onClick={() => setOpen(true)} className="text-ink-blue bg-fill-2 ml-1 inline-flex h-6 items-center gap-1 rounded-full px-2 align-middle text-[11.5px] font-semibold" aria-label="Show the Spanish help">
        <Languages size={12} aria-hidden /> ES
      </button>
    </>
  );
}

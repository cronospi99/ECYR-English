import type { CefrLevel, Unit } from '@/content/types';
import { unitVisualPlan, visualsWhere, type UnitSection, type VisualPlace } from '@/content/visuals';
import { VisualFigure, VisualSet } from './Visuals';

const TITLES: Record<UnitSection, string> = {
  overview: 'Para empezar',
  vocab: 'Mira y aprende',
  grammar: 'La gramática en una imagen',
};

/**
 * The infographics of one unit tab as a single inline figure (src/content/visuals.ts).
 * Grammar ones normally live inside their lessons (see `unitVisualPlan`); this shows
 * them all at once for the tab.
 */
export function UnitVisuals({ unit, level, section, color }: { unit: Unit; level: CefrLevel; section: UnitSection; color?: string }) {
  const plan = unitVisualPlan(`${level}-${unit.n}`, unit.grammar.map((g) => g.name));
  const items = section === 'grammar' ? plan.points.flat() : plan[section];
  return <VisualFigure items={items} title={TITLES[section]} color={color} />;
}

/** Infographics for a grammar module, a reading guide or a practice page. */
export function VisualsFor({ where, title }: { where: (p: VisualPlace) => boolean; title?: string }) {
  return <VisualSet title={title} items={visualsWhere(where)} />;
}

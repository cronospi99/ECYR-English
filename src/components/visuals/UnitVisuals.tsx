import type { CefrLevel, Unit } from '@/content/types';
import { visualsForUnit, visualsWhere, type UnitSection, type VisualPlace } from '@/content/visuals';
import { VisualSet } from './Visuals';

const TITLES: Record<UnitSection, string> = {
  overview: 'Para empezar',
  vocab: 'Vocabulario en imágenes',
  grammar: 'La gramática en una imagen',
};

/** Infographics declared for this unit's tab in src/content/visuals.ts. */
export function UnitVisuals({ unit, level, section }: { unit: Unit; level: CefrLevel; section: UnitSection }) {
  const items = visualsForUnit(`${level}-${unit.n}`, section);
  return <VisualSet title={TITLES[section]} items={items} featured={section !== 'overview'} subtitle={items.length > 1 ? `${items.length} infografías` : undefined} />;
}

/** Infographics for a grammar module, a reading guide or a practice page. */
export function VisualsFor({ where, title }: { where: (p: VisualPlace) => boolean; title?: string }) {
  return <VisualSet title={title} items={visualsWhere(where)} />;
}

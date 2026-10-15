import type { CefrLevel, Unit } from '@/content/types';
import { cutsWhere, visualsForUnit, visualsWhere, type UnitSection, type VisualPlace } from '@/content/visuals';
import { VisualSet } from './Visuals';

const TITLES: Record<UnitSection, string> = {
  overview: 'Para empezar',
  vocab: 'Vocabulario en imágenes',
  grammar: 'La gramática en una imagen',
};

/** Infographics declared for this unit's tab in src/content/visuals.ts. */
export function UnitVisuals({ unit, level, section }: { unit: Unit; level: CefrLevel; section: UnitSection }) {
  const key = `${level}-${unit.n}`;
  // Vocabulary tabs also get the panels cut for them (e.g. one part of a big chart).
  const items = [...visualsForUnit(key, section), ...(section === 'vocab' ? cutsWhere((c) => !!c.vocab?.includes(key)) : [])];
  return <VisualSet title={TITLES[section]} items={items} featured={section !== 'overview'} subtitle={items.length > 1 ? `${items.length} infografías` : undefined} />;
}

/** Infographics for a grammar module, a reading guide or a practice page. */
export function VisualsFor({ where, title }: { where: (p: VisualPlace) => boolean; title?: string }) {
  return <VisualSet title={title} items={visualsWhere(where)} />;
}

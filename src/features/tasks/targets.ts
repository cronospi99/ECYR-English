/**
 * Builds an assignment `target` (link + completion refs) from real content,
 * using the same refs the app logs with award() — see src/store/progress.ts.
 */
import type { CefrLevel } from '@/content/types';
import { GAMES } from '@/content/catalog';
import { GRAMMAR_MODULES } from '@/features/grammar/GrammarHubPage';
import type { AssignmentKind, AssignmentTarget } from '@/lib/assignments';

export type PickerSource = 'unit' | 'grammar' | 'practice' | 'game' | 'ielts' | 'custom';

export const SOURCE_LABEL: Record<PickerSource, string> = {
  unit: 'Unidad',
  grammar: 'Gramática',
  practice: 'Práctica',
  game: 'Juego',
  ielts: 'IELTS',
  custom: 'Otra',
};

export type UnitTab = 'overview' | 'vocab' | 'grammar' | 'practice';

export const UNIT_TABS: { value: UnitTab; label: string }[] = [
  { value: 'overview', label: 'Completa' },
  { value: 'vocab', label: 'Vocabulario' },
  { value: 'grammar', label: 'Gramática' },
  { value: 'practice', label: 'Práctica' },
];

export interface PracticeOption {
  id: string;
  label: string;
  to: string;
  kind: AssignmentKind;
  refs?: string[];
  refPrefix?: string[];
}

export const PRACTICE_OPTIONS: PracticeOption[] = [
  { id: 'listening', label: 'Listening · dictados', to: '/practice/listening', kind: 'listening', refs: ['practice:listening'] },
  { id: 'reading', label: 'Reading · una lectura', to: '/practice/reading', kind: 'reading', refPrefix: ['reading:'] },
  { id: 'writing', label: 'Writing · texto con feedback', to: '/practice/writing', kind: 'writing', refs: ['practice:writing', 'coach:correct', 'coach:writing-feedback'] },
  { id: 'speaking', label: 'Speaking · grabar respuesta', to: '/practice/speaking', kind: 'speaking', refs: ['practice:speaking'] },
  { id: 'phrasal', label: 'Phrasal verbs · quiz', to: '/practice/phrasal-verbs', kind: 'practice', refs: ['practice:phrasal'] },
  { id: 'verbs', label: 'Verb Lab · quiz de formas', to: '/practice/verbs?tab=quiz', kind: 'practice', refs: ['verblab:quiz'] },
  { id: 'coach', label: 'AI Coach · conversación', to: '/coach', kind: 'speaking', refPrefix: ['coach:'] },
];

export const IELTS_OPTIONS: { id: string; label: string; refs?: string[]; refPrefix?: string[] }[] = [
  { id: 'listening', label: 'Listening', refs: ['ielts:listening'] },
  { id: 'reading', label: 'Reading', refs: ['ielts:reading'] },
  { id: 'writing', label: 'Writing', refs: ['ielts:writing'] },
  { id: 'speaking', label: 'Speaking', refs: ['ielts:speaking'] },
  { id: 'mock', label: 'Mock test (cualquier módulo)', refPrefix: ['ielts:'] },
];

export const GRAMMAR_OPTIONS = GRAMMAR_MODULES.map((m) => ({ id: m.slug, label: m.title, to: m.to, refPrefix: [m.ref], levels: m.levels }));
export const GAME_OPTIONS = GAMES.map((g) => ({ id: g.slug, label: `${g.emoji} ${g.title}`, title: g.title }));

/** Picker state → target + kind (+ level when the content has one). */
export interface PickerState {
  source: PickerSource;
  level: CefrLevel;
  unit: number | null;
  unitTitle?: string;
  unitTab: UnitTab;
  grammar: string;
  practice: string;
  game: string;
  ielts: string;
  customTo: string;
  minScore: string;
}

export function buildTarget(p: PickerState): { kind: AssignmentKind; target: AssignmentTarget; level: CefrLevel | null } {
  const min = p.minScore.trim() === '' ? null : Math.max(0, Math.min(100, Number(p.minScore)));
  const minScore = min != null && Number.isFinite(min) ? min : null;
  switch (p.source) {
    case 'unit': {
      if (!p.unit) return { kind: 'unit', target: {}, level: p.level };
      const key = `${p.level}-${p.unit}`;
      const tab = UNIT_TABS.find((t) => t.value === p.unitTab)!;
      return {
        kind: 'unit',
        level: p.level,
        target: {
          to: `/learn/${p.level.toLowerCase()}/${p.unit}${p.unitTab === 'overview' ? '' : `?tab=${p.unitTab}`}`,
          refs: p.unitTab === 'vocab' ? [`unit:${key}`, 'vocab:flashcards'] : [`unit:${key}`],
          minScore,
          label: `${p.level} · Unidad ${p.unit}${p.unitTitle ? ` · ${p.unitTitle}` : ''}${p.unitTab === 'overview' ? '' : ` · ${tab.label}`}`,
          level: p.level,
        },
      };
    }
    case 'grammar': {
      const g = GRAMMAR_OPTIONS.find((x) => x.id === p.grammar) ?? GRAMMAR_OPTIONS[0]!;
      return { kind: 'grammar', level: null, target: { to: g.to, refPrefix: g.refPrefix, minScore, label: `Gramática · ${g.label}` } };
    }
    case 'practice': {
      const o = PRACTICE_OPTIONS.find((x) => x.id === p.practice) ?? PRACTICE_OPTIONS[0]!;
      return { kind: o.kind, level: null, target: { to: o.to, refs: o.refs, refPrefix: o.refPrefix, minScore, label: o.label } };
    }
    case 'game': {
      const g = GAME_OPTIONS.find((x) => x.id === p.game) ?? GAME_OPTIONS[0]!;
      return { kind: 'game', level: null, target: { to: `/play/${g.id}`, refs: [`game:${g.id}`], minScore, label: `Juego · ${g.title}` } };
    }
    case 'ielts': {
      const o = IELTS_OPTIONS.find((x) => x.id === p.ielts) ?? IELTS_OPTIONS[0]!;
      return { kind: 'ielts', level: null, target: { to: `/ielts/${o.id}`, refs: o.refs, refPrefix: o.refPrefix, minScore, label: `IELTS · ${o.label}` } };
    }
    default: {
      const to = p.customTo.trim();
      return { kind: 'custom', level: null, target: to ? { to, label: to } : {} };
    }
  }
}

/** Best-effort reverse: an existing target → picker state (for editing). */
export function pickerFromTarget(t: AssignmentTarget, level: CefrLevel | null): Partial<PickerState> {
  const to = t.to ?? '';
  const minScore = t.minScore != null ? String(t.minScore) : '';
  const unit = /^\/learn\/(a1|a2|b1|b2|c1)\/(\d+)(?:\?tab=(\w+))?$/i.exec(to);
  if (unit)
    return {
      source: 'unit',
      level: unit[1]!.toUpperCase() as CefrLevel,
      unit: Number(unit[2]),
      unitTab: (UNIT_TABS.find((x) => x.value === unit[3])?.value ?? 'overview') as UnitTab,
      minScore,
    };
  const g = GRAMMAR_OPTIONS.find((x) => x.to === to);
  if (g) return { source: 'grammar', grammar: g.id, minScore };
  const pr = PRACTICE_OPTIONS.find((x) => x.to === to);
  if (pr) return { source: 'practice', practice: pr.id, minScore };
  const game = /^\/play\/([\w-]+)$/.exec(to);
  if (game && GAME_OPTIONS.some((x) => x.id === game[1])) return { source: 'game', game: game[1]!, minScore };
  const ielts = /^\/ielts\/(\w+)$/.exec(to);
  if (ielts && IELTS_OPTIONS.some((x) => x.id === ielts[1])) return { source: 'ielts', ielts: ielts[1]!, minScore };
  return { source: 'custom', customTo: to, level: level ?? 'A1' };
}

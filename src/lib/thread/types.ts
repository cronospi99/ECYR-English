/**
 * Hilo de la clase v2: modelo de datos (ver docs/hilo-clase-v2.md §6).
 * Módulo puro: sin React ni red, para poder ejecutarlo desde scripts/validate-thread.mjs.
 */
import type { CefrLevel, GrammarPoint, Unit } from '../../content/types';
import type { Audience, Energizer, Mix } from '../engagement';

export type Fn =
  | 'narrate' | 'describe' | 'compare' | 'advise' | 'oblige' | 'permit' | 'plan' | 'predict' | 'hypothesize'
  | 'report' | 'request' | 'opinion' | 'argue' | 'instruct' | 'experience' | 'routine' | 'evaluate' | 'persuade';
export type Dom =
  | 'travel' | 'school' | 'work' | 'food' | 'health' | 'home' | 'tech' | 'shopping' | 'sport' | 'media'
  | 'environment' | 'city' | 'family' | 'culture' | 'money' | 'law';
export type Time = 'past' | 'present' | 'future' | 'any';
export type Source = 'local' | 'ia' | 'user';

export const ALL_FNS: Fn[] = ['narrate', 'describe', 'compare', 'advise', 'oblige', 'permit', 'plan', 'predict', 'hypothesize', 'report', 'request', 'opinion', 'argue', 'instruct', 'experience', 'routine', 'evaluate', 'persuade'];
export const ALL_DOMS: Dom[] = ['travel', 'school', 'work', 'food', 'health', 'home', 'tech', 'shopping', 'sport', 'media', 'environment', 'city', 'family', 'culture', 'money', 'law'];

export interface AnchorProfile {
  fns: Fn[];
  doms: Dom[];
  time: Time;
  weight: number;
  confidence: 'high' | 'low';
}

export type Anchor =
  | { id: string; type: 'free'; text: string; profile: AnchorProfile }
  | { id: string; type: 'grammar'; unit: number; point: number; name: string; profile: AnchorProfile }
  | { id: string; type: 'vocab'; unit: number; terms: string[]; profile: AnchorProfile };

export interface Bridge {
  id: string;
  title: string;
  setting: string;
  roles: string[];
  conflict: string;
  doms: Dom[];
  fns: Fn[];
  /** anchorId -> explicación en español de por qué la ancla encaja. */
  rationale: Record<string, string>;
  source: Source;
  characters: { name: string; role: string }[];
}

export type ResourceKind =
  | 'examples' | 'story' | 'news' | 'dialogue' | 'message' | 'interview' | 'announcement'
  | 'comprehension' | 'ccq' | 'exercise' | 'game' | 'roleplay' | 'debate' | 'board';

export const RESOURCE_KINDS: ResourceKind[] = ['examples', 'story', 'news', 'dialogue', 'message', 'interview', 'announcement', 'comprehension', 'ccq', 'exercise', 'game', 'roleplay', 'debate', 'board'];

export interface Resource {
  id: string;
  kind: ResourceKind;
  title: string;
  content: Record<string, unknown>;
  targets: { anchorId: string; hits: number }[];
  source: Source;
  locked: boolean;
  edited: boolean;
  /** Se usó la plantilla local porque la IA falló (la UI avisa en la tarjeta). */
  fallback?: boolean;
  validation?: Validation;
}

export interface Validation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export type StageKind = 'warmup' | 'presentation' | 'practice' | 'production' | 'energizer' | 'closing' | 'homework';
export type Grouping = 'whole' | 'pairs' | 'groups' | 'solo';

export interface Stage {
  id: string;
  kind: StageKind;
  anchorId?: string;
  title: string;
  minutes: number;
  grouping: Grouping;
  teacherRole: string;
  transition?: { teacher_es: string; student_en: string; /** Ancla de la que viene (para regenerar solo las transiciones afectadas). */ from?: string };
  successCriteria?: string[];
  resources: Resource[];
  locked: boolean;
  notes?: string;
  grammarRef?: { unit: number; point: number; diagramKey?: string };
  /** Solo en `practice`: la práctica se hace en el libro físico; el docente rellena estos campos (no se genera nada). */
  book?: { book: string; page: string; exercises: string };
}

export interface Thread {
  version: 2;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  level: CefrLevel;
  duration: number;
  mix: Mix;
  audience: Audience;
  anchors: Anchor[];
  bridge: Bridge;
  alternatives: Bridge[];
  stages: Stage[];
  hook: string;
  energizer: Energizer;
  teamChallenge: { enabled: boolean; vocab: string[]; grammar: string[] };
  homework: { title: string; task: string };
  source: Source;
  seed: number;
  /** Estilo preferido del recurso central (reutiliza STYLES de v1). */
  style?: string;
  /** Texto libre del docente ("contexto sugerido por mí"). */
  userContext?: string;
}

/** Lo que el motor local necesita saber de cada ancla: lenguaje meta ya resuelto contra los datos reales. */
export interface Target {
  anchorId: string;
  label: string;
  kind: Anchor['type'];
  /** Detecta el lenguaje meta en un texto (null = solo por términos). */
  matcher: RegExp | null;
  /** Detector poco fiable: no llegar a los hits mínimos solo avisa. */
  weak?: boolean;
  /** Vocabulario o palabras clave asociadas. */
  terms: string[];
  /** Frases modelo ya limpias (sin ** ni traducción). */
  examples: string[];
  form: string[];
  rule: string;
  watch: string;
  fix: { wrong: string; right: string; why: string }[];
  drill: string[];
  drillPrompt: string;
  dialogue: { sp: string; line: string }[];
  unit?: Unit;
  point?: GrammarPoint;
  profile: AnchorProfile;
}

export interface PlanContext {
  level: CefrLevel;
  bridge: Bridge;
  targets: Target[];
  names: [string, string, string];
  mix: Mix;
  audience: Audience;
  seed: number;
  userContext?: string;
}

export interface PlanInput {
  level: CefrLevel;
  units: Unit[];
  anchors: Anchor[];
  duration: number;
  mix: Mix;
  bridge: Bridge;
  alternatives?: Bridge[];
  seed: number;
  style?: string;
  userContext?: string;
  name?: string;
}

export const uid = (p = 'x') => `${p}${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

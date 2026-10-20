/**
 * Level exams: a "parcial" every four units and a final exam per level (and
 * for Pre-A1). Every exam tests the four skills plus grammar and vocabulary;
 * the content comes from the units it covers. One file per level
 * (generated/exams-<level>.json), fetched only when an exam is opened.
 */
import type { LibQuestion, LibTrack } from './library';
import type { CefrLevel } from './types';

export type ExamLevel = 'PreA1' | CefrLevel;

export interface ExamReading {
  title: string;
  genre: string;
  paragraphs: string[];
  glossary: [string, string][];
  questions: LibQuestion[];
}

export interface ExamListening {
  title: string;
  kind: string;
  speakers: LibTrack['speakers'];
  lines: { s: number; text: string }[];
  questions: LibQuestion[];
}

export interface ExamWriting {
  prompt: string;
  prompt_es: string;
  genre_es: string;
  minWords: number;
  maxWords: number;
  criteria: string[];
  model: string;
}

export interface ExamSpeakingPrompt {
  text: string;
  text_es: string;
  seconds: number;
  tips?: string[];
}

export interface Exam {
  id: string;
  level: ExamLevel;
  kind: 'midterm' | 'final';
  /** Midterm number (1…4); 0 for the final. */
  n: number;
  units: number[];
  title: string;
  intro_es: string;
  minutes: number;
  grammar: LibQuestion[];
  vocabulary: LibQuestion[];
  reading: ExamReading;
  listening: ExamListening;
  writing: ExamWriting;
  speaking: { prompts: ExamSpeakingPrompt[] };
}

export type ExamSection = 'listening' | 'reading' | 'grammar' | 'vocabulary' | 'writing' | 'speaking';

/** In the order the exam is taken: receptive skills first, production last. */
export const EXAM_SECTIONS: { id: ExamSection; label: string; emoji: string; color: string }[] = [
  { id: 'listening', label: 'Listening', emoji: '🎧', color: 'var(--purple)' },
  { id: 'reading', label: 'Reading', emoji: '📖', color: 'var(--blue)' },
  { id: 'grammar', label: 'Grammar', emoji: '🧩', color: 'var(--teal)' },
  { id: 'vocabulary', label: 'Vocabulary', emoji: '🔤', color: 'var(--green)' },
  { id: 'writing', label: 'Writing', emoji: '✍️', color: 'var(--orange)' },
  { id: 'speaking', label: 'Speaking', emoji: '🎙️', color: 'var(--pink)' },
];

export const levelKey = (l: ExamLevel) => l.toLowerCase();

/** Where a level's lessons live, for links back from an exam. */
export const levelPath = (l: ExamLevel) => (l === 'PreA1' ? '/learn/foundations' : `/learn/${l.toLowerCase()}`);
export const levelName = (l: ExamLevel) => (l === 'PreA1' ? 'Pre-A1' : l);

const files = import.meta.glob<{ default: Exam[] }>('./generated/exams-*.json');
const cache = new Map<string, Promise<Exam[]>>();

export function loadExams(level: ExamLevel): Promise<Exam[]> {
  const key = levelKey(level);
  if (!cache.has(key)) {
    const load = files[`./generated/exams-${key}.json`];
    const p = load ? load().then((m) => m.default) : Promise.resolve([] as Exam[]);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}

/** "a1-m2" → its level (the file to open). */
export function levelOfExam(id: string): ExamLevel | null {
  const k = id.split('-')[0] ?? '';
  if (k === 'prea1') return 'PreA1';
  const up = k.toUpperCase();
  return (['A1', 'A2', 'B1', 'B2', 'C1'] as const).find((l) => l === up) ?? null;
}

export const loadExam = (id: string) => {
  const level = levelOfExam(id);
  return level ? loadExams(level).then((all) => all.find((e) => e.id === id) ?? null) : Promise.resolve(null);
};

/** Colombian scale: 0.0–5.0, passing at 3.0 (60%). */
export const toGrade = (pct: number) => Math.round(pct * 5) / 100;
export const PASS_PCT = 60;
export const wordCount = (s: string) => (s.trim().match(/[A-Za-zÀ-ÿ0-9'’-]+/g) ?? []).length;

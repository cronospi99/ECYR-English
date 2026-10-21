/**
 * Weekly study-plan engine.
 *
 * Pure functions only: `generatePlan` turns the learner's choices (what they want
 * to create or review, focus skills, days and minutes) plus their progress into
 * a 7-day schedule of concrete tasks that link to real content; `evaluatePlan`
 * ticks tasks off from the activity log (every `award()` carries a `ref`) or
 * from manual checks; `skillProfile` and `recommend` turn results into
 * strengths, weak spots and next steps; `adaptPrefs` tunes next week's plan.
 */
import type { CefrLevel, LevelBook, CourseUnit, Skill } from '@/content/types';
import { CEFR_LEVELS } from '@/content/types';
import type { Activity, ActivityKind, Completion } from '@/store/progress';
import { dayKey } from '@/lib/date';

// ------------------------------------------------------------------ types ----

export type PlanGoal = 'advance' | 'review' | 'exam' | 'balanced';

export interface PlanPrefs {
  goal: PlanGoal;
  level: CefrLevel;
  /** Skills to reinforce; empty means "pick my weakest". */
  focus: Skill[];
  /** Unit keys ("A1-3") the learner wants to review. */
  reviewUnits: string[];
  /** Study weekdays, JS numbering (0 = Sunday). */
  days: number[];
  /** Minutes per study day. */
  minutes: number;
  includeGames: boolean;
  includeIelts: boolean;
  /** Free-text purpose ("entrevista de trabajo", "viaje"…), shown on the plan. */
  note?: string;
}

export interface TaskMatch {
  refs?: string[];
  refPrefix?: string[];
  kinds?: ActivityKind[];
}

export interface PlanTask {
  id: string;
  day: string; // dayKey
  title: string;
  detail?: string;
  skill: Skill;
  minutes: number;
  to: string;
  match: TaskMatch;
  /** Core = part of the goal (units, review, mock); the rest are skill drills. */
  core?: boolean;
}

export interface WeekPlan {
  id: string;
  createdAt: string;
  start: string;
  end: string;
  title: string;
  focus: Skill[];
  prefs: PlanPrefs;
  tasks: PlanTask[];
}

export interface TaskState {
  done: boolean;
  via?: 'auto' | 'manual';
  at?: string;
  score?: number;
}

export interface SkillStat {
  planned: number;
  done: number;
  minutesPlanned: number;
  minutesDone: number;
  scores: number[];
}

export interface PlanEvaluation {
  states: Record<string, TaskState>;
  total: number;
  done: number;
  ratio: number;
  minutesPlanned: number;
  minutesDone: number;
  /** Tasks scheduled up to today, and how many of those are done. */
  dueByToday: number;
  doneByToday: number;
  status: 'upcoming' | 'on-track' | 'behind' | 'complete' | 'finished';
  bySkill: Record<Skill, SkillStat>;
  byDay: { day: string; total: number; done: number }[];
  activeDays: number;
  avgScore: number | null;
}

export interface PlanSummary {
  id: string;
  start: string;
  end: string;
  title: string;
  goal: PlanGoal;
  level: CefrLevel;
  total: number;
  done: number;
  minutesPlanned: number;
  minutesDone: number;
  avgScore: number | null;
  bySkill: Partial<Record<Skill, { planned: number; done: number }>>;
}

export interface SkillInsight {
  skill: Skill;
  sessions: number;
  avgScore: number | null;
  xp: number;
  /** 0–100 blend of accuracy and practice volume; null = not enough data. */
  strength: number | null;
}

export interface Recommendation {
  tone: 'strength' | 'improve' | 'tip';
  title: string;
  text: string;
  to?: string;
  cta?: string;
}

// --------------------------------------------------------------- metadata ----

export const ALL_SKILLS: Skill[] = ['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary'];

export const SKILL_INFO: Record<Skill, { label: string; color: string }> = {
  listening: { label: 'Listening', color: 'var(--skill-listening)' },
  reading: { label: 'Reading', color: 'var(--skill-reading)' },
  writing: { label: 'Writing', color: 'var(--skill-writing)' },
  speaking: { label: 'Speaking', color: 'var(--skill-speaking)' },
  grammar: { label: 'Gramática', color: 'var(--indigo)' },
  vocabulary: { label: 'Vocabulario', color: 'var(--teal)' },
};

export const GOAL_INFO: Record<PlanGoal, { label: string; short: string; description: string }> = {
  advance: {
    label: 'Avanzar en mi nivel',
    short: 'Avance',
    description: 'Unidades nuevas de tu nivel con práctica de las destrezas que elijas.',
  },
  review: {
    label: 'Repasar lo visto',
    short: 'Repaso',
    description: 'Vuelve a las unidades que elijas (o a las de nota más baja) hasta dominarlas.',
  },
  exam: {
    label: 'Preparar el IELTS',
    short: 'IELTS',
    description: 'Módulos del simulador por destreza y un mock test al cerrar la semana.',
  },
  balanced: {
    label: 'Plan equilibrado',
    short: 'Equilibrado',
    description: 'Un poco de todo: una unidad nueva, repaso y las cuatro destrezas.',
  },
};

export const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export const defaultPrefs = (level: CefrLevel): PlanPrefs => ({
  goal: 'advance',
  level,
  focus: [],
  reviewUnits: [],
  days: [1, 2, 3, 4, 5],
  minutes: 30,
  includeGames: true,
  includeIelts: false,
});

// ---------------------------------------------------------------- helpers ----

const atLeast = (level: CefrLevel, min: CefrLevel) => CEFR_LEVELS.indexOf(level) >= CEFR_LEVELS.indexOf(min);
const atMost = (level: CefrLevel, max: CefrLevel) => CEFR_LEVELS.indexOf(level) <= CEFR_LEVELS.indexOf(max);
const lower = (l: CefrLevel) => l.toLowerCase();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const dateOf = (key: string) => new Date(key + 'T00:00:00');
const addDays = (key: string, n: number) => {
  const d = dateOf(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

/** Deterministic PRNG so the same inputs give the same plan (and tests are stable). */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------- skill profile ----

/** How each skill is going, from the last `days` of activity plus lifetime XP. */
export function skillProfile(activity: Activity[], skillXp: Record<Skill, number>, days = 30, now = new Date()): SkillInsight[] {
  const since = now.getTime() - days * 86_400_000;
  const recent = activity.filter((a) => new Date(a.at).getTime() >= since);
  const maxXp = Math.max(1, ...ALL_SKILLS.map((s) => skillXp[s] ?? 0));
  return ALL_SKILLS.map((skill) => {
    const mine = recent.filter((a) => a.skill === skill);
    const scored = mine.filter((a) => typeof a.score === 'number').map((a) => a.score!);
    const avgScore = scored.length ? Math.round(scored.reduce((x, y) => x + y, 0) / scored.length) : null;
    const xp = skillXp[skill] ?? 0;
    const volume = Math.min(1, mine.length / 6) * 0.5 + (xp / maxXp) * 0.5; // 0–1
    const strength =
      mine.length < 2 && xp < 40 ? null : Math.round((avgScore ?? 60) * 0.65 + volume * 100 * 0.35);
    return { skill, sessions: mine.length, avgScore, xp, strength };
  });
}

/** The two skills that most need work (least data counts as weakest). */
export function weakestSkills(profile: SkillInsight[], n = 2, pool: Skill[] = ['listening', 'reading', 'writing', 'speaking']): Skill[] {
  return profile
    .filter((p) => pool.includes(p.skill))
    .sort((a, b) => (a.strength ?? -1) - (b.strength ?? -1) || a.sessions - b.sessions)
    .slice(0, n)
    .map((p) => p.skill);
}

// ------------------------------------------------------------- generator ----

export interface PlanContext {
  units: Record<string, Completion>;
  topics: Record<string, Completion>;
  activity: Activity[];
  skillXp: Record<Skill, number>;
  /** Loaded level books, at least the plan's level and any review levels. */
  books: Partial<Record<CefrLevel, LevelBook>>;
  foundations?: CourseUnit[];
  now?: Date;
}

interface Template {
  key: string;
  skill: Skill;
  minutes: number;
  title: string;
  detail?: string;
  to: string;
  match: TaskMatch;
  core?: boolean;
}

/** The study days (dayKeys) in the 7-day window that starts on `start`. */
export function studyDays(start: string, weekdays: number[]): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(start, i);
    if (weekdays.includes(dateOf(k).getDay())) days.push(k);
  }
  return days.length ? days : [start];
}

/** Skill drills that fit a level — the generator rotates through these. */
function drills(level: CefrLevel, ctx: PlanContext, prefs: PlanPrefs, rand: () => number): Record<Skill, Template[]> {
  const L = level;
  const topics = (ctx.foundations ?? []).flatMap((u) => u.topics.map((t) => ({ ...t, unit: u.title })));
  const freshTopics = topics.filter((t) => !ctx.topics[t.id]);
  const topicPick = () => {
    const pool = freshTopics.length ? freshTopics : topics;
    return pool.length ? pool[Math.floor(rand() * pool.length)] : undefined;
  };

  const grammar: Template[] = [];
  if (atMost(L, 'A2'))
    grammar.push({
      key: 'g-time-machine',
      skill: 'grammar',
      minutes: 15,
      title: 'Time Machine: fechas y pasado simple',
      detail: 'Meses, ordinales, años y verbos en pasado.',
      to: '/learn/grammar/time-machine',
      match: { refPrefix: ['grammar:time-machine'] },
    });
  if (L === 'A1')
    grammar.push({
      key: 'g-time-family',
      skill: 'grammar',
      minutes: 15,
      title: 'Time & Family: la hora y el genitivo ’s',
      to: '/learn/grammar/time-family',
      match: { refPrefix: ['grammar:time-family'] },
    });
  if (atLeast(L, 'A2') && atMost(L, 'B2'))
    grammar.push({
      key: 'g-modals',
      skill: 'grammar',
      minutes: 15,
      title: 'Modal Verbs: usa el modal correcto',
      detail: 'Habilidad, permiso, obligación, consejo y deducción.',
      to: '/learn/grammar/modals',
      match: { refPrefix: ['grammar:modals'] },
    });
  if (atLeast(L, 'A2') && atMost(L, 'B1'))
    grammar.push({
      key: 'g-forms',
      skill: 'grammar',
      minutes: 10,
      title: 'Verb Lab: quiz de formas verbales',
      to: '/practice/verbs?tab=quiz',
      match: { refs: ['verblab:quiz'] },
    });
  if (atLeast(L, 'B1'))
    grammar.push({
      key: 'g-patterns',
      skill: 'grammar',
      minutes: 15,
      title: 'Verb Lab: patrones verbales',
      detail: 'Gerundio o infinitivo, reported speech y más.',
      to: '/practice/verbs?tab=patterns',
      match: { refs: ['verblab:patterns'] },
    });
  if (L === 'A1') {
    const t = topicPick();
    if (t)
      grammar.push({
        key: `g-topic-${t.id}`,
        skill: 'grammar',
        minutes: 15,
        title: `Foundations: ${t.title}`,
        detail: t.unit,
        to: `/learn/foundations/${t.id}`,
        match: { refs: [`topic:${t.id}`] },
      });
  }

  const vocabulary: Template[] = [
    {
      key: 'v-flashcards',
      skill: 'vocabulary',
      minutes: 10,
      title: 'Flashcards del vocabulario de tu unidad',
      detail: 'Repasa todas las tarjetas con audio.',
      to: '/learn',
      match: { refs: ['vocab:flashcards'] },
    },
  ];
  if (atLeast(L, 'A2'))
    vocabulary.push({
      key: 'v-phrasal',
      skill: 'vocabulary',
      minutes: 10,
      title: 'Quiz de phrasal verbs',
      to: '/practice/phrasal-verbs',
      match: { refs: ['practice:phrasal'] },
    });
  if (L === 'A2')
    vocabulary.push({
      key: 'v-ed',
      skill: 'vocabulary',
      minutes: 10,
      title: 'Verb Lab: pronunciación de -ed',
      to: '/practice/verbs?tab=ed',
      match: { refs: ['verblab:ed'] },
    });
  if (L === 'A1') {
    const t = topicPick();
    if (t)
      vocabulary.push({
        key: `v-topic-${t.id}`,
        skill: 'vocabulary',
        minutes: 15,
        title: `Foundations: ${t.title}`,
        to: `/learn/foundations/${t.id}`,
        match: { refs: [`topic:${t.id}`] },
      });
  }

  const ielts = prefs.includeIelts || prefs.goal === 'exam';
  const skillDrill = (skill: 'listening' | 'reading' | 'writing' | 'speaking'): Template[] => {
    const base: Record<typeof skill, Template[]> = {
      listening: [
        {
          key: 'l-dictation',
          skill: 'listening',
          minutes: 15,
          title: `Dictado: un diálogo ${L}`,
          detail: 'Escucha, escribe y compara.',
          to: '/practice/listening',
          match: { refs: ['practice:listening'] },
        },
      ],
      reading: [
        {
          key: 'r-reading',
          skill: 'reading',
          minutes: 15,
          title: L === 'A1' ? 'Lectura: una historia corta' : 'Lectura: una guía de viaje',
          detail: 'Lee y responde las preguntas.',
          to: '/practice/reading',
          match: { refPrefix: ['reading:'] },
        },
      ],
      writing: [
        {
          key: 'w-task',
          skill: 'writing',
          minutes: 20,
          title: 'Writing: un texto corto con feedback',
          detail: 'Usa la gramática de tu unidad.',
          to: '/practice/writing',
          match: { refs: ['practice:writing', 'coach:correct', 'coach:writing-feedback'] },
        },
      ],
      speaking: [
        {
          key: 's-questions',
          skill: 'speaking',
          minutes: 10,
          title: 'Speaking: responde 3 preguntas en voz alta',
          to: '/practice/speaking',
          match: { refs: ['practice:speaking'] },
        },
        {
          key: 's-coach',
          skill: 'speaking',
          minutes: 10,
          title: 'Conversa 10 minutos con el AI Coach',
          to: '/coach',
          match: { refs: ['coach:chat'] },
        },
      ],
    };
    const out = [...base[skill]];
    if (ielts && atLeast(L, 'B1'))
      out.push({
        key: `i-${skill}`,
        skill,
        minutes: skill === 'writing' || skill === 'reading' ? 30 : 20,
        title: `IELTS ${cap(skill)}: práctica cronometrada`,
        to: `/ielts/${skill}`,
        match: { refs: [`ielts:${skill}`] },
      });
    return out;
  };

  return {
    listening: skillDrill('listening'),
    reading: skillDrill('reading'),
    writing: skillDrill('writing'),
    speaking: skillDrill('speaking'),
    grammar,
    vocabulary,
  };
}

/** Goal-driven "core" tasks, in the order they should happen. */
function coreTasks(prefs: PlanPrefs, ctx: PlanContext, budget: number): Template[] {
  const L = prefs.level;
  const book = ctx.books[L];
  const out: Template[] = [];
  const unitPair = (level: CefrLevel, n: number, title: string, review: boolean): Template[] => {
    const key = `${level}-${n}`;
    const name = `${level} · Unidad ${n}${title ? `: ${cap(title)}` : ''}`;
    return review
      ? [
          {
            key: `rv-g-${key}`,
            skill: 'grammar',
            minutes: 15,
            title: `Repaso ${name}`,
            detail: 'Relee la gramática y los errores comunes.',
            to: `/learn/${lower(level)}/${n}?tab=grammar`,
            match: { refs: [`unit:${key}`] },
            core: true,
          },
          {
            key: `rv-p-${key}`,
            skill: 'grammar',
            minutes: 15,
            title: `Quiz de repaso: ${level} · Unidad ${n}`,
            detail: `Supera tu nota${ctx.units[key] ? ` (${ctx.units[key]!.score}%)` : ''}.`,
            to: `/learn/${lower(level)}/${n}?tab=practice`,
            match: { refs: [`unit:${key}`] },
            core: true,
          },
        ]
      : [
          {
            key: `u-v-${key}`,
            skill: 'vocabulary',
            minutes: 20,
            title: `${name} — vocabulario y gramática`,
            detail: 'Estudia las palabras con flashcards y la gramática.',
            to: `/learn/${lower(level)}/${n}?tab=vocab`,
            match: { refs: ['vocab:flashcards', `unit:${key}`] },
            core: true,
          },
          {
            key: `u-p-${key}`,
            skill: 'grammar',
            minutes: 20,
            title: `${name} — práctica`,
            detail: 'Completa el quiz para marcar la unidad.',
            to: `/learn/${lower(level)}/${n}?tab=practice`,
            match: { refs: [`unit:${key}`] },
            core: true,
          },
        ];
  };

  // Units to learn: next uncompleted units of the level, as many as the week fits.
  const newUnits = (max: number) =>
    (book?.units ?? []).filter((u) => !ctx.units[`${L}-${u.n}`]).slice(0, Math.max(0, max));

  // Units to review: the learner's choice, else completed units with the lowest score.
  const reviewKeys = (max: number) => {
    if (prefs.reviewUnits.length) return prefs.reviewUnits.slice(0, Math.max(1, max));
    return Object.entries(ctx.units)
      .filter(([k]) => k.startsWith(L + '-') || prefs.goal === 'review')
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, max)
      .map(([k]) => k);
  };
  const titleOf = (key: string) => {
    const [lv, n] = key.split('-') as [CefrLevel, string];
    return ctx.books[lv]?.units.find((u) => String(u.n) === n)?.title ?? '';
  };

  if (prefs.goal === 'advance') {
    const fit = Math.max(1, Math.min(3, Math.floor(budget / 120)));
    newUnits(fit).forEach((u) => out.push(...unitPair(L, u.n, u.title, false)));
  } else if (prefs.goal === 'review') {
    const fit = Math.max(1, Math.min(4, Math.floor(budget / 70)));
    const keys = reviewKeys(fit);
    if (keys.length)
      keys.forEach((k) => {
        const [lv, n] = k.split('-') as [CefrLevel, string];
        out.push(...unitPair(lv, Number(n), titleOf(k), true));
      });
    else newUnits(1).forEach((u) => out.push(...unitPair(L, u.n, u.title, false)));
  } else if (prefs.goal === 'balanced') {
    newUnits(1).forEach((u) => out.push(...unitPair(L, u.n, u.title, false)));
    reviewKeys(1).forEach((k) => {
      const [lv, n] = k.split('-') as [CefrLevel, string];
      out.push(unitPair(lv, Number(n), titleOf(k), true)[1]!);
    });
  } else {
    // exam: one skill block per IELTS paper, mock test closes the week (added later)
    (['reading', 'listening', 'writing', 'speaking'] as const).forEach((s) =>
      out.push({
        key: `x-${s}`,
        skill: s,
        minutes: s === 'writing' || s === 'reading' ? 35 : 25,
        title: `IELTS ${cap(s)}: módulo completo`,
        detail: 'Hazlo con tiempo real y revisa la banda.',
        to: `/ielts/${s}`,
        match: { refs: [`ielts:${s}`] },
        core: true,
      }),
    );
  }
  return out;
}

export function generatePlan(prefs: PlanPrefs, ctx: PlanContext): WeekPlan {
  const now = ctx.now ?? new Date();
  const start = dayKey(now);
  const days = studyDays(start, prefs.days);
  const minutes = Math.max(10, Math.min(120, prefs.minutes));
  const budget = days.length * minutes;
  const rand = rng(`${start}|${prefs.goal}|${prefs.level}|${prefs.focus.join()}|${prefs.reviewUnits.join()}|${days.length}|${minutes}`);
  const profile = skillProfile(ctx.activity, ctx.skillXp, 30, now);
  const focus = prefs.focus.length ? prefs.focus : weakestSkills(profile, 2);

  const core = coreTasks(prefs, ctx, budget);
  const pool = drills(prefs.level, ctx, prefs, rand);

  // Exam weeks end with a mock test on the last study day.
  const finale: Template[] = [];
  if (prefs.goal === 'exam')
    finale.push({
      key: 'x-mock',
      skill: 'reading',
      minutes: Math.min(60, minutes),
      title: 'Mock test IELTS',
      detail: 'Simulacro para medir tu banda de la semana.',
      to: '/ielts/mock',
      match: { refPrefix: ['ielts:'] },
      core: true,
    });
  if (prefs.includeGames && budget >= 90)
    finale.push({
      key: 'game',
      skill: 'speaking',
      minutes: 15,
      title: 'Juego de la semana',
      detail: 'Elige un juego y practica sin presión.',
      to: '/games',
      match: { refPrefix: ['game:'] },
    });

  // Weighted rotation of drill skills: focus skills count double.
  const rotation: Skill[] = [];
  for (const s of ALL_SKILLS) {
    if (!pool[s].length) continue;
    rotation.push(s);
    if (focus.includes(s)) rotation.push(s);
  }
  // Shuffle once, then keep focus skills apart so they are spread over the week.
  for (let i = rotation.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rotation[i], rotation[j]] = [rotation[j]!, rotation[i]!];
  }
  const used: Record<string, number> = {};
  const drillFor = (skill: Skill): Template | undefined => {
    const list = pool[skill];
    if (!list.length) return undefined;
    const t = [...list].sort((a, b) => (used[a.key] ?? 0) - (used[b.key] ?? 0))[0]!;
    used[t.key] = (used[t.key] ?? 0) + 1;
    return t;
  };

  const tasks: PlanTask[] = [];
  let r = 0;
  let coreIdx = 0;
  days.forEach((day, di) => {
    let left = minutes;
    const skillsToday = new Set<Skill>();
    const push = (t: Template) => {
      tasks.push({
        id: `${day}-${tasks.length}-${t.key}`,
        day,
        title: t.title,
        detail: t.detail,
        skill: t.skill,
        minutes: t.minutes,
        to: t.to,
        match: t.match,
        core: t.core,
      });
      left -= t.minutes;
      skillsToday.add(t.skill);
    };
    const isLast = di === days.length - 1;
    if (isLast) finale.filter((f) => f.minutes <= Math.max(left, minutes)).forEach((f) => left >= Math.min(f.minutes, 15) && push(f));
    // Spread core tasks evenly over the days that remain.
    const remainingDays = days.length - di;
    const coreToday = Math.ceil((core.length - coreIdx) / remainingDays);
    for (let k = 0; k < coreToday && coreIdx < core.length; k++) {
      const c = core[coreIdx]!;
      if (k > 0 && c.minutes > left) break;
      push(c);
      coreIdx++;
    }
    // Fill the rest of the day with drills, avoiding repeating a skill.
    let guard = 0;
    while (left >= 10 && guard++ < rotation.length * 2) {
      const skill = rotation[r % rotation.length]!;
      r++;
      if (skillsToday.has(skill)) continue;
      const t = drillFor(skill);
      if (!t) continue;
      if (t.minutes > left + 5) continue;
      push(t);
    }
  });

  const level = prefs.level;
  const title =
    prefs.goal === 'exam'
      ? 'Semana IELTS'
      : `${GOAL_INFO[prefs.goal].short} ${level}${focus.length ? ` · ${focus.map((f) => SKILL_INFO[f].label).join(' y ')}` : ''}`;

  return {
    id: `plan-${start}-${Math.floor(rand() * 1e9).toString(36)}`,
    createdAt: now.toISOString(),
    start,
    end: addDays(start, 6),
    title,
    focus,
    prefs: { ...prefs, minutes },
    tasks,
  };
}

// ------------------------------------------------------------ evaluation ----

const matches = (m: TaskMatch, a: Activity) =>
  (m.refs?.includes(a.ref ?? '') ?? false) ||
  (m.refPrefix?.some((p) => (a.ref ?? '').startsWith(p)) ?? false) ||
  (m.kinds?.includes(a.kind) ?? false);

const emptyStats = (): Record<Skill, SkillStat> =>
  Object.fromEntries(ALL_SKILLS.map((s) => [s, { planned: 0, done: 0, minutesPlanned: 0, minutesDone: 0, scores: [] }])) as unknown as Record<
    Skill,
    SkillStat
  >;

/**
 * Ticks tasks off. Each logged activity inside the plan window completes at most
 * one task: specific matches (exact refs) are resolved before generic ones, and
 * earlier tasks before later ones, so doing Thursday's task on Tuesday counts.
 */
export function evaluatePlan(plan: WeekPlan, activity: Activity[], manual: Record<string, string>, now = new Date()): PlanEvaluation {
  const startMs = dateOf(plan.start).getTime();
  const endMs = dateOf(addDays(plan.end, 1)).getTime();
  const created = new Date(plan.createdAt).getTime();
  const window = activity
    .filter((a) => {
      const t = new Date(a.at).getTime();
      return t >= Math.max(startMs, created - 60_000) && t < endMs;
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  const usedIds = new Set<string>();
  const states: Record<string, TaskState> = {};

  const ordered = [...plan.tasks].sort((a, b) => {
    const spec = (t: PlanTask) => (t.match.refs?.some((r) => r.startsWith('unit:') || r.startsWith('topic:')) ? 0 : t.match.refs ? 1 : 2);
    return spec(a) - spec(b) || a.day.localeCompare(b.day);
  });
  for (const t of ordered) {
    if (manual[t.id]) {
      states[t.id] = { done: true, via: 'manual', at: manual[t.id] };
      continue;
    }
    const hit = window.find((a) => !usedIds.has(a.id) && matches(t.match, a));
    if (hit) {
      usedIds.add(hit.id);
      states[t.id] = { done: true, via: 'auto', at: hit.at, score: hit.score };
    } else states[t.id] = { done: false };
  }

  const today = dayKey(now);
  const bySkill = emptyStats();
  const dayMap = new Map<string, { total: number; done: number }>();
  let done = 0;
  let minutesPlanned = 0;
  let minutesDone = 0;
  let dueByToday = 0;
  let doneByToday = 0;
  const scores: number[] = [];
  const activeDays = new Set<string>();
  for (const t of plan.tasks) {
    const s = states[t.id]!;
    const st = bySkill[t.skill];
    st.planned++;
    st.minutesPlanned += t.minutes;
    minutesPlanned += t.minutes;
    const d = dayMap.get(t.day) ?? { total: 0, done: 0 };
    d.total++;
    if (t.day <= today) dueByToday++;
    if (s.done) {
      done++;
      d.done++;
      st.done++;
      st.minutesDone += t.minutes;
      minutesDone += t.minutes;
      if (t.day <= today) doneByToday++;
      if (typeof s.score === 'number') {
        st.scores.push(s.score);
        scores.push(s.score);
      }
      if (s.at) activeDays.add(dayKey(new Date(s.at)));
    }
    dayMap.set(t.day, d);
  }
  const total = plan.tasks.length;
  const finished = today > plan.end;
  const status: PlanEvaluation['status'] =
    total > 0 && done === total
      ? 'complete'
      : finished
        ? 'finished'
        : today < plan.start
          ? 'upcoming'
          : doneByToday >= Math.ceil(dueByToday * 0.75)
            ? 'on-track'
            : 'behind';

  return {
    states,
    total,
    done,
    ratio: total ? done / total : 0,
    minutesPlanned,
    minutesDone,
    dueByToday,
    doneByToday,
    status,
    bySkill,
    byDay: [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
    activeDays: activeDays.size,
    avgScore: scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null,
  };
}

export function summarize(plan: WeekPlan, ev: PlanEvaluation): PlanSummary {
  const bySkill: PlanSummary['bySkill'] = {};
  for (const s of ALL_SKILLS) if (ev.bySkill[s].planned) bySkill[s] = { planned: ev.bySkill[s].planned, done: ev.bySkill[s].done };
  return {
    id: plan.id,
    start: plan.start,
    end: plan.end,
    title: plan.title,
    goal: plan.prefs.goal,
    level: plan.prefs.level,
    total: ev.total,
    done: ev.done,
    minutesPlanned: ev.minutesPlanned,
    minutesDone: ev.minutesDone,
    avgScore: ev.avgScore,
    bySkill,
  };
}

// -------------------------------------------------------- recommendations ----

export function recommend(input: {
  plan: WeekPlan | null;
  ev: PlanEvaluation | null;
  profile: SkillInsight[];
  units: Record<string, Completion>;
  level: CefrLevel;
  levelRatio: number;
  history: PlanSummary[];
}): Recommendation[] {
  const { plan, ev, profile, units, level, levelRatio, history } = input;
  const out: Recommendation[] = [];
  const known = profile.filter((p) => p.strength != null).sort((a, b) => b.strength! - a.strength!);

  // Strengths: best-scoring skills.
  const top = known.filter((p) => (p.avgScore ?? 0) >= 75 || p.strength! >= 70).slice(0, 2);
  for (const p of top)
    out.push({
      tone: 'strength',
      title: `${SKILL_INFO[p.skill].label} es tu punto fuerte`,
      text:
        p.avgScore != null
          ? `${p.avgScore}% de acierto en ${p.sessions} sesiones recientes. Sube el reto con contenido de ${nextLevel(level)}.`
          : `Llevas ${p.xp} XP en esta destreza. Mantén el ritmo y sube el reto.`,
    });

  // This week's skills that are being skipped.
  if (ev && plan) {
    for (const s of ALL_SKILLS) {
      const st = ev.bySkill[s];
      if (st.planned >= 2 && st.done / st.planned < 0.5 && ev.dueByToday > 0)
        out.push({
          tone: 'improve',
          title: `${SKILL_INFO[s].label}: ${st.done} de ${st.planned} tareas`,
          text: 'Es la destreza que más estás saltando esta semana. Prueba hacerla primero, cuando tienes más energía.',
        });
      const avg = st.scores.length ? st.scores.reduce((x, y) => x + y, 0) / st.scores.length : null;
      if (avg != null && avg < 60)
        out.push({
          tone: 'improve',
          title: `${SKILL_INFO[s].label}: ${Math.round(avg)}% de acierto`,
          text: 'Repite las actividades con calma y revisa las explicaciones antes de volver al quiz.',
        });
    }
  }

  // Weakest skill overall.
  const weak = profile.filter((p) => ['listening', 'reading', 'writing', 'speaking'].includes(p.skill)).sort(
    (a, b) => (a.strength ?? -1) - (b.strength ?? -1),
  )[0];
  if (weak && !out.some((o) => o.title.startsWith(SKILL_INFO[weak.skill].label)))
    out.push({
      tone: 'improve',
      title: `Refuerza ${SKILL_INFO[weak.skill].label}`,
      text:
        weak.sessions === 0
          ? 'No la has practicado en los últimos 30 días. Inclúyela en tu próximo plan.'
          : `Es tu destreza más baja${weak.avgScore != null ? ` (${weak.avgScore}%)` : ''}. Dale más minutos la próxima semana.`,
      to: `/practice/${weak.skill}`,
      cta: 'Practicar ahora',
    });

  // Units worth reviewing.
  const low = Object.entries(units)
    .filter(([, c]) => c.score < 70)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 2);
  for (const [k, c] of low) {
    const [lv, n] = k.split('-');
    out.push({
      tone: 'tip',
      title: `Repasa ${lv} · Unidad ${n}`,
      text: `Tu mejor nota es ${c.score}%. Un repaso corto la sube por encima del 80%.`,
      to: `/learn/${lv!.toLowerCase()}/${n}?tab=practice`,
      cta: 'Repasar',
    });
  }

  // Pace and consistency.
  if (ev && plan) {
    if (ev.status === 'complete')
      out.push({
        tone: 'strength',
        title: '¡Semana completada!',
        text: 'Cumpliste todo el plan. La próxima semana puedes subir 10 minutos por día o sumar un día.',
      });
    else if (ev.status === 'behind')
      out.push({
        tone: 'tip',
        title: 'Vas un poco atrás',
        text: `Llevas ${ev.doneByToday} de ${ev.dueByToday} tareas previstas hasta hoy. Mejor 15 minutos diarios que una maratón el domingo.`,
      });
  }
  const last = history.slice(0, 3);
  if (last.length >= 2) {
    const rates = last.map((h) => (h.total ? h.done / h.total : 0));
    const avg = rates.reduce((x, y) => x + y, 0) / rates.length;
    if (avg < 0.5)
      out.push({
        tone: 'tip',
        title: 'Ajusta el plan a tu semana real',
        text: `Tus últimas semanas cerraron al ${Math.round(avg * 100)}%. Un plan más corto que sí terminas avanza más que uno largo a medias.`,
      });
    else if (avg >= 0.9)
      out.push({
        tone: 'strength',
        title: 'Constancia de cumbre',
        text: `Promedias ${Math.round(avg * 100)}% en tus últimas semanas. ¡Esa constancia es lo que te lleva a la cima!`,
      });
  }
  if (levelRatio >= 0.8 && level !== 'C2')
    out.push({
      tone: 'tip',
      title: `Casi terminas ${level}`,
      text: `Ya completaste el ${Math.round(levelRatio * 100)}% de ${level}. Tu próximo plan puede empezar ${nextLevel(level)}.`,
      to: `/learn/${nextLevel(level).toLowerCase()}`,
      cta: `Ver ${nextLevel(level)}`,
    });

  // De-duplicate by title, strengths first.
  const seen = new Set<string>();
  const order = { strength: 0, improve: 1, tip: 2 } as const;
  return out
    .filter((r) => (seen.has(r.title) ? false : (seen.add(r.title), true)))
    .sort((a, b) => order[a.tone] - order[b.tone])
    .slice(0, 6);
}

const nextLevel = (l: CefrLevel): CefrLevel => CEFR_LEVELS[Math.min(CEFR_LEVELS.length - 1, CEFR_LEVELS.indexOf(l) + 1)]!;

/** Next week's settings, tuned from how this week went. */
export function adaptPrefs(plan: WeekPlan, ev: PlanEvaluation, profile: SkillInsight[], level: CefrLevel): PlanPrefs {
  const p = { ...plan.prefs, level, reviewUnits: [] as string[] };
  // Pace: finish everything → +10 min; under half → −10 min.
  if (ev.ratio >= 0.95) p.minutes = Math.min(90, p.minutes + 10);
  else if (ev.ratio < 0.5) p.minutes = Math.max(15, p.minutes - 10);
  // Focus: the skills with the lowest completion or score this week, else the weakest overall.
  const scored = ALL_SKILLS.filter((s) => ev.bySkill[s].planned > 0 && ['listening', 'reading', 'writing', 'speaking'].includes(s))
    .map((s) => {
      const st = ev.bySkill[s];
      const avg = st.scores.length ? st.scores.reduce((x, y) => x + y, 0) / st.scores.length : 70;
      return { s, v: (st.done / st.planned) * 50 + avg * 0.5 };
    })
    .sort((a, b) => a.v - b.v)
    .slice(0, 2)
    .map((x) => x.s);
  p.focus = scored.length ? scored : weakestSkills(profile, 2);
  return p;
}

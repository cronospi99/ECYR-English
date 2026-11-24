/**
 * Stable ids for every feature whose use we measure (owner panel /admin/stats,
 * supabase/migrations/23_usage_analytics.sql). The ids are stored in the database:
 * do not rename one without a migration. Add new ones freely.
 *
 * Pure data + pure functions: no React, no network.
 */
import { MODULES } from '@/content/catalog';

export type UsageCategory = 'general' | 'aprender' | 'practicar' | 'ielts' | 'juegos' | 'ia' | 'espacio' | 'docente';

export const CATEGORIES: { id: UsageCategory; label: string; color: string }[] = [
  { id: 'general', label: 'General', color: 'var(--label-2)' },
  { id: 'aprender', label: 'Aprender', color: 'var(--green)' },
  { id: 'practicar', label: 'Practicar', color: 'var(--orange)' },
  { id: 'ielts', label: 'IELTS', color: 'var(--indigo)' },
  { id: 'juegos', label: 'Juegos', color: 'var(--pink)' },
  { id: 'ia', label: 'IA', color: 'var(--purple)' },
  { id: 'espacio', label: 'Mi espacio', color: 'var(--teal)' },
  { id: 'docente', label: 'Docente', color: 'var(--yellow)' },
];

export interface FeatureDef {
  id: string;
  label: string;
  category: UsageCategory;
}

const f = (id: string, label: string, category: UsageCategory): FeatureDef => ({ id, label, category });

/** Screens and tools of the app (the catalog's games and books are added below). */
const APP_FEATURES: FeatureDef[] = [
  f('home', 'Inicio', 'general'),
  f('legal', 'Información legal', 'general'),
  // Aprender
  f('units', 'Unidades y niveles (A1–C2)', 'aprender'),
  f('foundations', 'Fundamentos A1 (temas)', 'aprender'),
  f('grammar', 'Gramática (menú)', 'aprender'),
  f('grammar-time-machine', 'Gramática: Time Machine', 'aprender'),
  f('grammar-modals', 'Gramática: Modales', 'aprender'),
  f('grammar-do-make', 'Gramática: Do / Make', 'aprender'),
  f('grammar-tenses', 'Gramática: Tiempos verbales', 'aprender'),
  f('grammar-time-family', 'Gramática: Time Family', 'aprender'),
  f('visuals', 'Visuales (láminas)', 'aprender'),
  f('exams', 'Exámenes', 'aprender'),
  // Practicar
  f('practice', 'Practicar (menú)', 'practicar'),
  f('verbs', 'Verb Lab', 'practicar'),
  f('phrasal-verbs', 'Phrasal verbs', 'practicar'),
  f('reading-library', 'Lecturas: biblioteca A1–C2', 'practicar'),
  f('reading', 'Lecturas: unidades e historias', 'practicar'),
  f('listening', 'Listening (biblioteca y diálogos)', 'practicar'),
  f('podcasts', 'Podcasts', 'practicar'),
  f('speaking', 'Speaking', 'practicar'),
  f('writing', 'Writing', 'practicar'),
  f('vocabulary', 'Vocabulario', 'practicar'),
  f('workshops', 'Talleres', 'practicar'),
  f('draw', 'Dibujo (práctica)', 'practicar'),
  // IELTS
  f('ielts', 'Simulador IELTS', 'ielts'),
  // IA
  f('coach', 'Coach IA', 'ia'),
  f('ai-grading', 'Corrección IA (exámenes y speaking)', 'ia'),
  // Mi espacio
  f('plan', 'Mi plan de estudio', 'espacio'),
  f('tasks', 'Tareas', 'espacio'),
  f('portfolio', 'Mis trabajos (portafolio)', 'espacio'),
  f('notes', 'Mis notas', 'espacio'),
  f('progress', 'Progreso', 'espacio'),
  f('profile', 'Perfil', 'espacio'),
  f('boards', 'Muro en vivo (lista)', 'espacio'),
  f('board', 'Muro en vivo (sala)', 'espacio'),
  f('import', 'Importar datos', 'espacio'),
  // Juegos (pantallas propias de la app)
  f('games', 'Juegos (menú)', 'juegos'),
  f('games-cards', 'Cartas de profes', 'juegos'),
  f('classwars', 'Class Wars', 'juegos'),
  f('impostor', 'Impostor', 'juegos'),
  f('doodle', 'Doodle', 'juegos'),
  f('youdraw', 'You Draw', 'juegos'),
  f('run', 'Run', 'juegos'),
  f('racers', 'Racers', 'juegos'),
  f('toons3d', 'Galería Toons 3D', 'juegos'),
  // Docente
  f('teacher', 'Sala del docente', 'docente'),
  f('teacher-thread', 'Hilo de la clase', 'docente'),
  f('teacher-student', 'Ficha de estudiante', 'docente'),
  f('teacher-screen', 'Pantalla del aula', 'docente'),
];

export const moduleFeatureId = (slug: string) => `module:${slug}`;

const MODULE_FEATURES: FeatureDef[] = MODULES.map((m) =>
  f(moduleFeatureId(m.slug), m.title, m.kind === 'game' || m.kind === 'presentation' ? 'juegos' : 'aprender'),
);

/** The full inventory (every feature we could measure), including those nobody uses yet. */
export const FEATURES: FeatureDef[] = [...APP_FEATURES, ...MODULE_FEATURES];

const BY_ID = new Map(FEATURES.map((x) => [x.id, x]));
export const featureDef = (id: string): FeatureDef =>
  BY_ID.get(id) ?? f(id, id, 'general');
export const categoryOf = (id: UsageCategory) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]!;

/**
 * Route → feature id. `null` = not measured (admin pages, redirects, 404, and the
 * iframe players, which ModuleFrame reports itself so time is not counted twice).
 */
export function featureForLocation(pathname: string, search = ''): string | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(search);
  const seg = p.split('/').filter(Boolean);
  const [a, b] = seg;

  if (p === '/') return 'home';
  switch (a) {
    case 'admin':
      return null;
    case 'learn':
      if (!b) return 'units';
      if (b === 'foundations') return 'foundations';
      if (b === 'visuals') return 'visuals';
      if (b === 'grammar') return seg[2] ? `grammar-${seg[2]}` : 'grammar';
      return 'units';
    case 'exams':
      return 'exams';
    case 'practice':
      if (!b) return 'practice';
      if (b === 'reading') return (q.get('tab') ?? 'library') === 'library' ? 'reading-library' : 'reading';
      if (b === 'listening') return q.get('tab') === 'podcasts' || q.get('pod') ? 'podcasts' : 'listening';
      return BY_ID.has(b) ? b : null;
    case 'teacher':
      return b === 'thread' ? 'teacher-thread' : b === 'student' ? 'teacher-student' : b === 'screen' ? 'teacher-screen' : 'teacher';
    case 'board':
      return 'board';
    case 'games':
      return b === 'cards' ? 'games-cards' : 'games';
    case 'defenders':
      return moduleFeatureId('language-defenders');
    case 'roulette':
      return moduleFeatureId('phrasal-roulette');
    case 'play':
      // Iframe modules are reported by ModuleFrame; in-app games arrive via their own route after a redirect.
      return null;
    case 'notes':
    case 'portfolio':
    case 'import':
    case 'boards':
    case 'tasks':
    case 'plan':
    case 'ielts':
    case 'coach':
    case 'legal':
    case 'progress':
    case 'profile':
    case 'classwars':
    case 'impostor':
    case 'doodle':
    case 'youdraw':
    case 'run':
    case 'racers':
    case 'toons3d':
      return a;
    default:
      return null;
  }
}

/** Module iframe src ("/modules/x/y.html?v=…") → feature id of its catalog entry. */
export function featureForModuleSrc(src: string): string | null {
  const clean = src.split(/[?#]/)[0] ?? '';
  const m = MODULES.find((x) => x.src === clean);
  return m ? moduleFeatureId(m.slug) : null;
}

/** progress.award() activity kinds → feature ids (for "completed" events). */
export function featureForActivity(kind: string, ref?: string): string | null {
  switch (kind) {
    case 'unit':
      return 'units';
    case 'topic':
      return 'foundations';
    case 'game': {
      const slug = ref?.startsWith('game:') ? ref.slice(5) : '';
      return slug ? moduleFeatureId(slug) : null;
    }
    case 'flashcards':
      return 'vocabulary';
    case 'reading':
    case 'listening':
    case 'speaking':
    case 'writing':
    case 'ielts':
    case 'coach':
    case 'exams':
      return kind;
    case 'exam':
      return 'exams';
    default:
      return null;
  }
}

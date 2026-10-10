/**
 * Registry of the Time & Family tools so lessons/units can embed any single
 * tool: `const T = TIME_FAMILY_TOOLS.clock; <T.Component />`.
 */
import type { ComponentType } from 'react';
import type { CefrLevel, Skill } from '@/content/types';
import { ClockTool, TimeQuiz, TimeRules } from './clock';
import { FamilyHomework, FamilyRiddles, FamilyTree, FamilyVocabQuiz, FamilyWords, TreeQuiz } from './family';
import { GenitiveBuilder, GenitiveQuiz, GenitiveRules } from './genitiveTools';
import { SayingCard } from './shared';

export interface TimeFamilyTool {
  id: string;
  title: string;
  description: string;
  skill: Skill;
  levels: CefrLevel[];
  /** Grammar/vocabulary topics this tool fits, for mapping into units. */
  topics: string[];
  /** Progress ref used in award() calls (study plans tick tasks off with it). */
  ref: string;
  Component: ComponentType;
}

const tool = (t: Omit<TimeFamilyTool, 'ref'>): TimeFamilyTool => ({ ...t, ref: `grammar:time-family:${t.id}` });

export const TIME_FAMILY_TOOLS = {
  clock: tool({ id: 'clock', title: 'Spin the clock', description: 'Reloj interactivo: arrastra las agujas y lee la hora (past/to, digital, a.m./p.m., EE. UU., 24 h) en inglés y español.', skill: 'grammar', levels: ['A1', 'A2'], topics: ['telling the time', 'numbers', 'What time is it?', 'a.m. / p.m.', 'daily routines'], Component: ClockTool }),
  'time-rules': tool({ id: 'time-rules', title: 'How to tell the time', description: 'Reglas past/to, “minutes”, a.m./p.m., contraste con el español y errores típicos.', skill: 'grammar', levels: ['A1'], topics: ['telling the time', 'prepositions of time (at)'], Component: TimeRules }),
  'time-quiz': tool({ id: 'time-quiz', title: 'Time quiz', description: 'Lee el reloj (elige la frase) o pon la hora (arrastra las agujas); rondas de 10 con XP.', skill: 'grammar', levels: ['A1', 'A2'], topics: ['telling the time'], Component: TimeQuiz }),
  vocab: tool({ id: 'vocab', title: 'Family words', description: '50 palabras de familia por grupos, con pronunciación figurada y audio EN/ES.', skill: 'vocabulary', levels: ['A1', 'A2'], topics: ['family', 'possessive adjectives', 'have got'], Component: FamilyWords }),
  'vocab-quiz': tool({ id: 'vocab-quiz', title: 'Family words quiz', description: 'Quiz de 10 preguntas inglés ⇄ español sobre la familia.', skill: 'vocabulary', levels: ['A1', 'A2'], topics: ['family'], Component: FamilyVocabQuiz }),
  riddles: tool({ id: 'riddles', title: 'Guess who', description: 'Adivinanzas de parentesco (“Your mother’s brother is your…”) que combinan familia y ’s.', skill: 'vocabulary', levels: ['A1', 'A2'], topics: ['family', 'possessive ’s'], Component: FamilyRiddles }),
  tree: tool({ id: 'tree', title: 'Family tree', description: 'Crea tu árbol genealógico por generaciones (se guarda en el dispositivo) y responde preguntas sobre él.', skill: 'vocabulary', levels: ['A1'], topics: ['family', 'This is my…', 'possessive adjectives', 'Who is…?'], Component: FamilyTree }),
  'tree-quiz': tool({ id: 'tree-quiz', title: 'Quiz me on my tree', description: 'Preguntas sobre el árbol del alumno: Who is your aunt? / What is Ana to you?', skill: 'vocabulary', levels: ['A1'], topics: ['family', 'wh- questions'], Component: TreeQuiz }),
  'genitive-rules': tool({ id: 'genitive-rules', title: 'Saxon genitive rules', description: 'Las 7 reglas del ’s: singular, plural en -s, plural irregular, nombres en -s, posesión compartida, doble posesivo y tiempo.', skill: 'grammar', levels: ['A1', 'A2', 'B1'], topics: ['possessive ’s', 'whose', 'possessive pronouns'], Component: GenitiveRules }),
  'genitive-quiz': tool({ id: 'genitive-quiz', title: 'Saxon genitive quiz', description: '“The mother of Laura” → “Laura’s mother”: 20 frases para reescribir, con explicación.', skill: 'grammar', levels: ['A1', 'A2'], topics: ['possessive ’s'], Component: GenitiveQuiz }),
  'genitive-builder': tool({ id: 'genitive-builder', title: 'Build the genitive', description: 'Poseedor + cosa → el alumno escribe la frase (acepta James’s y James’).', skill: 'grammar', levels: ['A1', 'A2'], topics: ['possessive ’s', 'plural nouns (regular & irregular)'], Component: GenitiveBuilder }),
  homework: tool({ id: 'homework', title: 'Family tree homework', description: 'Tarea: árbol con al menos 9 familiares; contador, imprimir y copiar como texto.', skill: 'writing', levels: ['A1'], topics: ['family', 'writing about your family'], Component: FamilyHomework }),
  saying: tool({ id: 'saying', title: 'Saying of the class', description: '“Hoy por ti, mañana por mí” y su equivalente en inglés.', skill: 'vocabulary', levels: ['A2', 'B1'], topics: ['sayings & idioms'], Component: SayingCard }),
} satisfies Record<string, TimeFamilyTool>;

export type TimeFamilyToolId = keyof typeof TIME_FAMILY_TOOLS;

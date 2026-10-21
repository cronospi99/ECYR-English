import { Link } from 'react-router-dom';
import { BookOpen, Headphones, Mic, PenLine, Shuffle, ChevronRight, Wrench, Languages, ClipboardList } from 'lucide-react';
import { ExternalResources } from '@/features/library/ExternalResources';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { useProgress } from '@/store/progress';

const AREAS = [
  {
    to: '/practice/reading',
    icon: BookOpen,
    color: 'var(--skill-reading)',
    title: 'Reading',
    body: 'Biblioteca de lecturas originales A1–C2 (noticias, entrevistas, ciencia, opinión…) con glosario y preguntas, más 32 guías de viaje.',
    skill: 'reading' as const,
  },
  {
    to: '/practice/listening',
    icon: Headphones,
    color: 'var(--skill-listening)',
    title: 'Listening',
    body: 'Biblioteca de audios A1–C2 con varias voces y acentos (diálogos, podcasts, clases, anuncios), preguntas tipo IELTS y dictados.',
    skill: 'listening' as const,
  },
  {
    to: '/practice/speaking',
    icon: Mic,
    color: 'var(--skill-speaking)',
    title: 'Speaking',
    body: '3.600+ preguntas por nivel y tema. Responde con tu micrófono y compara con la respuesta modelo.',
    skill: 'speaking' as const,
  },
  {
    to: '/practice/writing',
    icon: PenLine,
    color: 'var(--skill-writing)',
    title: 'Writing',
    body: 'Tareas de escritura de cada unidad con criterios de evaluación y feedback del AI Coach.',
    skill: 'writing' as const,
  },
  {
    to: '/practice/vocabulary',
    icon: Languages,
    color: 'var(--pink)',
    title: 'Vocabulario',
    body: 'Linking words por función, cientos de adjetivos por categoría y adverbios por tipo, con ejemplos, audio, quiz y tarea en PDF.',
    skill: 'vocabulary' as const,
  },
  {
    to: '/practice/workshops',
    icon: ClipboardList,
    color: 'var(--teal)',
    title: 'Talleres de gramática',
    body: 'Un taller por tema de A1 a C1: la regla, errores típicos, cuatro tipos de ejercicio y la tarea lista en PDF.',
    skill: 'grammar' as const,
  },
  {
    to: '/practice/verbs',
    icon: Wrench,
    color: 'var(--indigo)',
    title: 'Verb Lab',
    body: 'Más de 1.000 verbos con sus 3 formas, 384 verbos académicos C1, pronunciación de -ed, quiz cronometrado, phrasal verbs por familias y los 10 patrones verbales.',
    skill: 'grammar' as const,
  },
  {
    to: '/practice/phrasal-verbs',
    icon: Shuffle,
    color: 'var(--orange)',
    title: 'Phrasal Verbs',
    body: 'Más de 1.100 phrasal verbs de A1 a C1 en mapas mentales, con traducción, 4 ejemplos cada uno y modo quiz.',
    skill: 'vocabulary' as const,
  },
];

export default function PracticePage() {
  const skillXp = useProgress((s) => s.skillXp);
  return (
    <Page title="Práctica" subtitle="Entrena cada destreza por separado. Todo suma XP y te acerca a la cima.">
      <div className="grid gap-4 md:grid-cols-2">
        {AREAS.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="flex h-full items-start gap-4 p-5 transition-transform active:scale-[0.99]">
              <IconTile icon={a.icon} color={a.color} size={52} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-title-3">{a.title}</h3>
                  <span className="text-label-2 text-[13px] tabular-nums">{skillXp[a.skill] ?? 0} XP</span>
                </div>
                <p className="text-label-2 text-subhead mt-1 text-pretty">{a.body}</p>
              </div>
              <ChevronRight className="text-label-3 mt-1 shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
      <ExternalResources className="mt-8" />
    </Page>
  );
}

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { LevelChip } from '@/components/ui/Misc';
import { useProgress } from '@/store/progress';
import type { CefrLevel } from '@/content/types';

export interface GrammarModule {
  slug: string;
  to: string;
  title: string;
  subtitle: string;
  description: string;
  cover: string;
  levels: CefrLevel[];
  /** Activity ref prefix used to count practice sessions. */
  ref: string;
}

export const GRAMMAR_MODULES: GrammarModule[] = [
  {
    slug: 'time-machine',
    to: '/learn/grammar/time-machine',
    title: 'Time Machine',
    subtitle: 'Fechas, meses y pasado simple',
    description: 'Los 12 meses con audio y celebraciones colombianas, ordinales, años, formatos de fecha y el pasado simple con su ortografía -ed.',
    cover: '/covers/time-machine.webp',
    levels: ['A1', 'A2'],
    ref: 'grammar:time-machine',
  },
  {
    slug: 'time-family',
    to: '/learn/grammar/time-family',
    title: 'Time & Family',
    subtitle: 'La hora, la familia y el genitivo ’s',
    description: 'Reloj interactivo para decir la hora, árbol genealógico, vocabulario de la familia y el genitivo sajón.',
    cover: '/covers/time-family.webp',
    levels: ['A1'],
    ref: 'grammar:time-family',
  },
  {
    slug: 'modals',
    to: '/learn/grammar/modals',
    title: 'Modal Verbs',
    subtitle: 'Can, must, should, might…',
    description: 'Qué es un modal, modales core, marginales y semi-modales, sus reglas de forma, las trampas típicas y una fase bonus.',
    cover: '/covers/modal-verbs-zone.webp',
    levels: ['A2', 'B1', 'B2'],
    ref: 'grammar:modals',
  },
  {
    slug: 'do-make',
    to: '/learn/grammar/do-make',
    title: 'Do vs Make',
    subtitle: 'Dos verbos para un solo «hacer»',
    description: 'La regla (actividad vs resultado), más de 50 colocaciones por familias con audio, los errores típicos, un juego para clasificar y práctica. Incluye pronombres reflexivos y posesivos.',
    cover: '',
    levels: ['A1', 'A2', 'B1'],
    ref: 'grammar:do-make',
  },
  {
    slug: 'verbs',
    to: '/practice/verbs',
    title: 'Verb Lab',
    subtitle: 'Formas verbales, -ed y patrones',
    description: 'Más de 1.400 verbos con sus tres formas, 384 verbos académicos C1, pronunciación de -ed, phrasal verbs por familias y los 10 patrones verbales.',
    cover: '',
    levels: ['A2', 'B1', 'B2', 'C1'],
    ref: 'verblab:',
  },
];

export default function GrammarHubPage() {
  const activity = useProgress((s) => s.activity);
  return (
    <Page
      back={{ to: '/learn', label: 'Aprender' }}
      title="Gramática interactiva"
      subtitle="Explicaciones con ejercicios y mecánicas propias. Las lecciones de cada nivel también las insertan donde corresponde."
      wide
    >
      <div className="grid gap-4 md:grid-cols-2">
        {GRAMMAR_MODULES.map((m) => {
          const sessions = activity.filter((a) => (a.ref ?? '').startsWith(m.ref)).length;
          return (
            <Link key={m.slug} to={m.to} className="block">
              <Card className="flex h-full gap-4 p-4 transition-transform active:scale-[0.99]">
                {m.cover ? (
                  <div className="h-24 w-28 shrink-0 rounded-[14px] bg-cover bg-center" style={{ backgroundImage: `url(${m.cover})` }} aria-hidden />
                ) : (
                  <div className="brand-gradient flex h-24 w-28 shrink-0 items-center justify-center rounded-[14px] text-[30px] font-extrabold text-white" aria-hidden>
                    V
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.levels.map((l) => (
                      <LevelChip key={l} level={l} />
                    ))}
                  </div>
                  <div className="text-title-3 mt-1">{m.title}</div>
                  <div className="text-label-2 text-[13px] font-medium">{m.subtitle}</div>
                  <p className="text-label-2 mt-1 line-clamp-2 text-[13px]">{m.description}</p>
                  {sessions > 0 && <div className="text-ink-green mt-1 text-[12px] font-semibold">{sessions} prácticas completadas</div>}
                </div>
                <ChevronRight className="text-label-3 shrink-0 self-center" />
              </Card>
            </Link>
          );
        })}
      </div>
      <Link to="/learn/visuals" className="text-ink-blue mt-6 inline-flex items-center gap-1 px-1 text-[15px] font-semibold">
        Ver la biblioteca visual de infografías <ChevronRight size={16} />
      </Link>
    </Page>
  );
}

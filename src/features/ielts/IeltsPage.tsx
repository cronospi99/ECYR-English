import { useEffect, useMemo } from 'react';
import { Award, BookOpen, Clock, Headphones, Languages, Mic, PenLine, Play, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card, CardHeader } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { LevelChip } from '@/components/ui/Misc';
import { ProgressRing } from '@/components/ui/Progress';
import { readIelts, bandToCefr, type IeltsModule } from '@/lib/ielts';
import { useProgress } from '@/store/progress';
import type { Skill } from '@/content/types';

const MODULES: { id: IeltsModule; label: string; icon: typeof Headphones; color: string; time: string; body: string }[] = [
  { id: 'listening', label: 'Listening', icon: Headphones, color: 'var(--skill-listening)', time: '≈30 min', body: '4 secciones, 40 preguntas, audios con voces IA o de tu clase.' },
  { id: 'reading', label: 'Reading', icon: BookOpen, color: 'var(--skill-reading)', time: '60 min', body: '3 pasajes académicos con corrección automática y textos generados.' },
  { id: 'writing', label: 'Writing', icon: PenLine, color: 'var(--skill-writing)', time: '60 min', body: 'Task 1 con gráficos 3D, procesos y mapas; Task 2 con banda por criterio.' },
  { id: 'speaking', label: 'Speaking', icon: Mic, color: 'var(--skill-speaking)', time: '11–14 min', body: 'Cue cards y entrevista, evaluada desde tu audio real.' },
];

const FEATURES = [
  { icon: Clock, color: 'var(--orange)', title: 'Relojes oficiales', body: 'Cada paper con su tiempo real; al llegar a 00:00 se bloquea.' },
  { icon: Sparkles, color: 'var(--purple)', title: 'Corrección con IA', body: 'Bandas por criterio y tu texto anotado en verde, amarillo y rojo.' },
  { icon: Languages, color: 'var(--teal)', title: 'Language desk', body: 'Traductor, conjugaciones, sinónimos y colocaciones en cada skill.' },
  { icon: Users, color: 'var(--blue)', title: 'Modo clase', body: 'Docentes con dashboard, tareas, feedback e historial por estudiante.' },
  { icon: ShieldCheck, color: 'var(--green)', title: 'Clave segura', body: 'La clave de Gemini vive como secreto en Supabase, nunca en el navegador.' },
  { icon: Award, color: 'var(--indigo)', title: 'Práctica libre', body: 'Las cuatro destrezas sin presión de banda, con % de precisión.' },
];

const SKILL_OF: Record<string, Skill> = { listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking' };

/** Turns new simulator attempts (stored by the simulator itself) into platform XP, once each. */
function useIeltsXp() {
  const award = useProgress((s) => s.award);
  useEffect(() => {
    const { history } = readIelts();
    let seen = 0;
    try {
      seen = Number(localStorage.getItem('ecyr:ielts-seen') ?? '0');
    } catch {
      /* ignore */
    }
    const fresh = history.length - seen;
    if (fresh > 0) {
      history.slice(0, fresh).forEach((h) =>
        award({ kind: 'ielts', title: `IELTS ${h.module} · banda ${h.band}`, skill: SKILL_OF[h.module] ?? 'reading', xp: 30, score: Math.round((h.band / 9) * 100) }),
      );
    }
    try {
      localStorage.setItem('ecyr:ielts-seen', String(history.length));
    } catch {
      /* ignore */
    }
  }, [award]);
}

export default function IeltsPage() {
  useIeltsXp();
  const ielts = useMemo(readIelts, []);
  const cefr = bandToCefr(ielts.overall);

  return (
    <Page
      eyebrow="IELTS Academic"
      title="IELTS Simulator"
      subtitle="Mock tests completos de las cuatro destrezas, con relojes oficiales y corrección con IA. Integrado con tu cuenta ECYR."
      actions={
        <ButtonLink to="/ielts/simulator" variant="brand" size="lg">
          <Play size={18} fill="currentColor" /> Abrir simulador
        </ButtonLink>
      }
      wide
    >
      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="flex flex-col items-center p-6 text-center">
          <ProgressRing value={(ielts.overall ?? 0) / 9} size={170} stroke={14} color="var(--indigo)" label="Banda IELTS global">
            <div>
              <div className="text-[48px] leading-none font-extrabold tabular-nums">{ielts.overall?.toFixed(1) ?? '—'}</div>
              <div className="text-label-2 mt-1 text-[13px]">Overall band</div>
            </div>
          </ProgressRing>
          {cefr ? (
            <p className="text-label-2 mt-4 text-[15px]">
              Equivale aproximadamente a <LevelChip level={cefr} className="mx-1" /> del MCER.
            </p>
          ) : (
            <p className="text-label-2 mt-4 text-[15px]">Completa al menos un paper para ver tu banda estimada.</p>
          )}
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            {MODULES.map((m) => (
              <div key={m.id} className="bg-fill-2 rounded-[14px] p-3 text-left">
                <div className="text-label-2 text-[12px] font-medium">{m.label}</div>
                <div className="text-[22px] font-bold tabular-nums">{ielts.scores[m.id]?.toFixed(1) ?? '—'}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {MODULES.map((m) => (
              <Card key={m.id} className="flex gap-4 p-5">
                <IconTile icon={m.icon} color={m.color} size={46} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-headline">{m.label}</h3>
                    <span className="text-label-2 text-[12px]">{m.time}</span>
                  </div>
                  <p className="text-label-2 mt-1 text-[14px] text-pretty">{m.body}</p>
                </div>
              </Card>
            ))}
          </div>

          {ielts.history.length > 0 && (
            <Card className="pb-3">
              <CardHeader title="Intentos recientes" subtitle="Registrados por el simulador en este dispositivo" />
              <ul className="mt-2">
                {ielts.history.slice(0, 6).map((h, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-2.5 [&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]">
                    <span className="text-label-2 w-24 shrink-0 text-[13px]">{new Date(h.date).toLocaleDateString('es')}</span>
                    <span className="flex-1 text-[15px] capitalize">{h.module}</span>
                    <span className="text-[17px] font-bold tabular-nums">{Number(h.band).toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <h2 className="text-title-2 mt-10 mb-3 px-1">Todo lo que incluye</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="p-5">
            <IconTile icon={f.icon} color={f.color} size={34} />
            <h3 className="text-headline mt-3">{f.title}</h3>
            <p className="text-label-2 mt-1 text-[14px] text-pretty">{f.body}</p>
          </Card>
        ))}
      </div>
      <p className="text-label-2 mt-6 px-1 text-[13px]">
        Inicia sesión en ECYR y el simulador usará la misma cuenta (mismo proyecto Supabase): tus bandas, tareas y feedback docente te
        siguen a cualquier dispositivo.
      </p>
    </Page>
  );
}

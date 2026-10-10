import { Link } from 'react-router-dom';
import { BookOpenText, ChevronRight, Sparkles } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { MountainClimb } from '@/components/mountain/MountainClimb';
import { LEVELS } from '@/content/levels';
import { useProgress, levelCompletion, climbProgress, currentLevel } from '@/store/progress';
import { cn } from '@/lib/cn';

export default function LearnPage() {
  const units = useProgress((s) => s.units);
  const topics = useProgress((s) => s.topics);
  const climb = climbProgress(units);
  const current = currentLevel(units);

  return (
    <Page title="Aprender" subtitle="Tu ruta de A1 a C1. Cada nivel es un tramo de la montaña: completa unidades para subir." wide>
      <Card className="relative mb-6 overflow-hidden">
        <MountainClimb wide progress={climb} />
        <div className="material absolute top-4 left-4 rounded-[16px] px-4 py-3">
          <div className="text-label-2 text-[12px] font-medium">Escalada total</div>
          <div className="text-[28px] leading-tight font-extrabold tabular-nums">{Math.round(climb * 100)}%</div>
        </div>
      </Card>

      {/* A1 Foundations */}
      <Link to="/learn/foundations" className="mb-6 block">
        <Card className="flex items-center gap-4 p-5 transition-transform active:scale-[0.99]">
          <div
            className="h-20 w-28 shrink-0 rounded-[14px] bg-cover bg-center"
            style={{ backgroundImage: 'url(/covers/a1-foundations.webp)' }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-ios-red text-[12px] font-bold tracking-wide uppercase">Empieza aquí · A1</div>
            <div className="text-title-3">English Foundations</div>
            <p className="text-label-2 text-subhead line-clamp-2">
              Curso de cómic: alfabeto, números, saludos, to be, presente simple… con lecturas y ejercicios en español.
            </p>
            <div className="text-label-2 mt-1 text-[12px]">{Object.keys(topics).length} temas completados</div>
          </div>
          <ChevronRight className="text-label-3 shrink-0" />
        </Card>
      </Link>

      {/* Interactive grammar modules */}
      <Link to="/learn/grammar" className="mb-6 block">
        <Card className="flex items-center gap-4 p-5 transition-transform active:scale-[0.99]">
          <div className="grid h-20 w-28 shrink-0 grid-cols-2 gap-1 overflow-hidden rounded-[14px]" aria-hidden>
            {['/covers/time-machine.webp', '/covers/modal-verbs-zone.webp', '/covers/time-family.webp', ''].map((c, i) => (
              <div key={i} className={cn('bg-cover bg-center', !c && 'brand-gradient')} style={c ? { backgroundImage: `url(${c})` } : undefined} />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-ios-indigo text-[12px] font-bold tracking-wide uppercase">A1 – C1</div>
            <div className="text-title-3">Gramática interactiva</div>
            <p className="text-label-2 text-subhead line-clamp-2">
              Time Machine, Time &amp; Family, Modal Verbs y Verb Lab: explicaciones con práctica y corrección al instante.
            </p>
          </div>
          <ChevronRight className="text-label-3 shrink-0" />
        </Card>
      </Link>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LEVELS.map((l) => {
          const c = levelCompletion(units, l.id);
          const isCurrent = l.id === current;
          return (
            <Link key={l.id} to={`/learn/${l.id.toLowerCase()}`} className="group block">
              <Card className={cn('h-full overflow-hidden transition-transform active:scale-[0.99]', isCurrent && 'ring-2 ring-ios-blue')}>
                <div className={cn('relative bg-gradient-to-br p-5 text-white', l.tint)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[44px] leading-none font-extrabold tracking-tight">{l.id}</div>
                      <div className="mt-1 text-[15px] font-semibold">
                        {l.nameEs} · {l.name}
                      </div>
                    </div>
                    <ProgressRing value={c.ratio} size={58} stroke={6} color="#fff" className="[&_circle:first-child]:stroke-white/25">
                      <span className="text-[13px] font-bold">{Math.round(c.ratio * 100)}%</span>
                    </ProgressRing>
                  </div>
                  {isCurrent && (
                    <span className="absolute right-5 bottom-3 inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-semibold">
                      <Sparkles size={12} /> Tu nivel
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-subhead text-label-2">{l.description}</p>
                  <ul className="mt-3 space-y-1.5">
                    {l.canDo.map((x) => (
                      <li key={x} className="flex items-center gap-2 text-[14px]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                        {x}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between text-[13px]">
                    <span className="text-label-2 inline-flex items-center gap-1.5">
                      <BookOpenText size={14} /> {l.book}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {c.done}/{c.total} unidades
                    </span>
                  </div>
                  <ProgressBar value={c.ratio} color={l.color} className="mt-2" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}

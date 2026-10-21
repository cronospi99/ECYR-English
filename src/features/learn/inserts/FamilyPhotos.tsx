import { useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { FAMILY_PHOTOS, type Person } from './familyPhotos';

/**
 * Real-looking family photos to explore: tap a person to hear who they are,
 * or play "Who's who?" — find the person the question describes.
 */
export function FamilyPhotos({ only }: { only?: string[] }) {
  const photos = useMemo(() => FAMILY_PHOTOS.filter((p) => !only || only.includes(p.id)), [only]);
  const [pi, setPi] = useState(0);
  const [mode, setMode] = useState<'explore' | 'quiz'>('explore');
  const [sel, setSel] = useState<Person | null>(null);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ name: string; ok: boolean } | null>(null);
  const award = useProgress((s) => s.award);
  const photo = photos[Math.min(pi, photos.length - 1)]!;
  const q = photo.questions[qi];

  const reset = (i = pi, m = mode) => {
    setPi(i);
    setMode(m);
    setSel(null);
    setQi(0);
    setScore(0);
    setFeedback(null);
  };

  const tap = (p: Person) => {
    if (mode === 'explore') {
      setSel(p);
      speak(p.say, { tier: 'premium' });
      return;
    }
    if (!q || feedback) return;
    const ok = p.name === q.a;
    setFeedback({ name: p.name, ok });
    if (ok) setScore((s) => s + 1);
    speak(ok ? `Yes! That’s ${p.name}.` : `No, that’s ${p.name}.`);
  };
  const next = () => {
    const n = qi + 1;
    setFeedback(null);
    setQi(n);
    if (n >= photo.questions.length) award({ kind: 'game', title: `Who’s who? · ${photo.title}`, skill: 'vocabulary', xp: 10, score: Math.round((score / photo.questions.length) * 100), ref: `family-photo:${photo.id}` });
  };

  return (
    <Card className="overflow-hidden">
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-title-3">📸 {photo.title}</h3>
            <p className="text-label-2 text-[14px]">{photo.intro}</p>
          </div>
          <Segmented
            size="sm"
            value={mode}
            onChange={(m) => reset(pi, m)}
            options={[
              { value: 'explore', label: 'Explora' },
              { value: 'quiz', label: '¿Quién es?' },
            ]}
          />
        </div>
        {photos.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => reset(i)}
                className={cn('h-14 w-20 shrink-0 rounded-[10px] bg-cover bg-center ring-offset-2 transition', i === pi ? 'ring-ios-blue ring-2' : 'opacity-70')}
                style={{ backgroundImage: `url(/visuals/${p.id}-thumb.webp)` }}
                aria-label={p.title}
              />
            ))}
          </div>
        )}
        {mode === 'quiz' && (
          <div className="bg-fill-2 flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-4 py-3">
            {q ? (
              <>
                <span className="text-[17px] font-bold">
                  {qi + 1}. {q.q}
                </span>
                <span className="text-label-2 text-[13px] tabular-nums">
                  {score}/{qi + (feedback ? 1 : 0)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[17px] font-bold">
                  {score}/{photo.questions.length} {score === photo.questions.length ? '🏆' : '👏'}
                </span>
                <Button size="sm" variant="gray" onClick={() => reset()}>
                  Jugar otra vez
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <img src={`/visuals/${photo.id}.webp`} alt={photo.title} className="block w-full" loading="lazy" />
        {photo.people.map((p) => {
          const hit = feedback?.name === p.name;
          const answer = feedback && !feedback.ok && q?.a === p.name;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => tap(p)}
              aria-label={mode === 'explore' ? p.name : `Persona en la foto`}
              className={cn(
                'absolute h-[13%] w-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] transition-all',
                sel?.name === p.name && mode === 'explore'
                  ? 'border-white bg-white/20 shadow-[0_0_0_3px_rgba(0,122,255,.8)]'
                  : hit
                    ? feedback!.ok
                      ? 'border-white bg-[rgba(52,199,89,.35)] shadow-[0_0_0_3px_rgba(52,199,89,.9)]'
                      : 'border-white bg-[rgba(255,59,48,.3)] shadow-[0_0_0_3px_rgba(255,59,48,.9)]'
                    : answer
                      ? 'border-white bg-[rgba(52,199,89,.3)] shadow-[0_0_0_3px_rgba(52,199,89,.9)]'
                      : 'border-white/0 hover:border-white/80 focus-visible:border-white',
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          );
        })}
      </div>
      <div className="p-4 sm:p-5">
        {mode === 'explore' ? (
          sel ? (
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => speak(sel.say, { tier: 'premium' })} className="text-ink-blue bg-fill-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-label="Escuchar">
                <Volume2 size={18} />
              </button>
              <div className="min-w-0">
                <div className="text-headline">
                  {sel.name} · <span className="text-ink-blue">{sel.role}</span> <span className="text-label-2 text-[14px] font-normal">({sel.es})</span>
                </div>
                <p className="text-[15px]">{sel.say}</p>
              </div>
            </div>
          ) : (
            <p className="text-label-2 text-[14px]">Toca a una persona de la foto para escuchar quién es y cómo se relaciona con los demás.</p>
          )
        ) : feedback ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={cn('text-[15px] font-semibold', feedback.ok ? 'text-ink-green' : 'text-ink-red')}>
              {feedback.ok ? `¡Correcto! Es ${q?.a}.` : `Esa persona es ${feedback.name}. La respuesta era ${q?.a}.`}
            </span>
            <Button size="sm" onClick={next}>
              Siguiente
            </Button>
          </div>
        ) : (
          <p className="text-label-2 text-[14px]">Lee la pregunta y toca a la persona correcta en la foto.</p>
        )}
      </div>
    </Card>
  );
}

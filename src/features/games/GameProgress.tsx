import { Link } from 'react-router-dom';
import { CheckCircle2, CircleSlash, DoorOpen, ShieldCheck, Star, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LevelChip } from '@/components/ui/Misc';
import { moduleBySlug } from '@/content/catalog';
import { TRACKED_GAMES, statsFor, type GameSession, type SessionStatus } from '@/store/games';
import { relativeTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { ink } from '@/lib/color';

const STATUS: Record<SessionStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  valid: { label: 'Válida', color: 'var(--green)', icon: CheckCircle2 },
  class: { label: 'En clase', color: 'var(--indigo)', icon: Users },
  abandoned: { label: 'Abandonada', color: 'var(--orange)', icon: DoorOpen },
  invalid: { label: 'No válida', color: 'var(--red)', icon: CircleSlash },
};

type Defenders = { stars: Record<string, Record<string, number>>; asked: number; correct: number } | null;

/**
 * Progress for every game that reports results. Pure view: the learner passes
 * their own store, a teacher passes a student's synced data.
 */
export function GameProgressView({ sessions, defenders, compact = false }: { sessions: GameSession[]; defenders: Defenders; compact?: boolean }) {
  const slugs = Object.keys(TRACKED_GAMES);
  const all = slugs.map((s) => statsFor(s, sessions));
  const valid = sessions.filter((s) => s.status === 'valid');
  const xp = valid.reduce((n, s) => n + s.xp, 0);
  const checked = sessions.filter((s) => s.status === 'valid' || s.status === 'invalid');
  const validity = checked.length ? Math.round((valid.length / checked.length) * 100) : null;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <dl className="bg-separator grid grid-cols-2 gap-px sm:grid-cols-4">
          <Summary label="Partidas válidas" value={String(valid.length)} />
          <Summary label="XP de juegos" value={String(xp)} />
          <Summary label="Juegos jugados" value={`${all.filter((g) => g.sessions.length).length}/${slugs.length}`} />
          <Summary label="Resultados válidos" value={validity != null ? `${validity}%` : '–'} hint="De las partidas individuales" />
        </dl>
      </Card>
      <div className={cn('grid gap-4', !compact && 'lg:grid-cols-2')}>
        {all.map((g) => (
          <GameCard key={g.slug} g={g} defenders={g.slug === 'english-defenders' ? defenders : null} />
        ))}
      </div>
      <p className="text-label-2 flex items-start gap-2 px-1 text-[13px]">
        <ShieldCheck size={16} className="text-ink-green mt-0.5 shrink-0" />
        Cada resultado se valida: debe coincidir con las respuestas registradas en vivo, con números posibles y un ritmo realista. Las
        partidas en clase se guardan sin nota. Star Medic Jeopardy y Phrasal Verb Roulette son dinámicas grupales y no se registran
        por alumno.
      </p>
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card p-4">
      <dt className="text-label-2 text-[13px] font-medium">{label}</dt>
      <dd className="mt-1 text-[22px] font-bold tabular-nums">{value}</dd>
      {hint && <dd className="text-label-3 text-[11px]">{hint}</dd>}
    </div>
  );
}

function GameCard({ g, defenders }: { g: ReturnType<typeof statsFor>; defenders: Defenders }) {
  const m = moduleBySlug(g.slug);
  const rules = TRACKED_GAMES[g.slug]!;
  const weak = weakTopics(g.valid);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div
          className="h-14 w-20 shrink-0 rounded-[12px] bg-cover bg-center"
          style={m?.cover ? { backgroundImage: `url(${m.cover})` } : { background: m?.accent }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold">{m?.title ?? g.slug}</div>
          <div className="text-label-2 text-[12px]">
            {rules.graded ? 'Con puntuación' : 'Participación'} · {g.lastAt ? `última ${relativeTime(g.lastAt)}` : 'sin partidas'}
          </div>
        </div>
        <Link to={`/play/${g.slug}`} className="text-ink-blue shrink-0 text-[14px] font-semibold">
          Jugar
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 pb-3 text-center">
        <Mini label="Válidas" value={String(g.plays)} />
        {rules.graded ? (
          <>
            <Mini label="Mejor" value={g.best != null ? `${g.best}%` : '–'} />
            <Mini label="Media" value={g.avg != null ? `${g.avg}%` : '–'} />
            <Mini label="Precisión" value={g.accuracy != null ? `${g.accuracy}%` : '–'} />
          </>
        ) : (
          <>
            <Mini label="Completadas" value={String(g.wins)} />
            <Mini label={g.slug === 'earth-modals' ? 'Países' : 'Dilemas'} value={String(g.answered)} />
            <Mini label="En clase" value={String(g.classSessions)} />
          </>
        )}
      </div>

      {g.trend.length > 1 && (
        <div className="px-4 pb-3">
          <div className="flex h-12 items-end gap-1" role="img" aria-label={`Últimos puntajes: ${g.trend.join(', ')}`}>
            {g.trend.map((v, i) => (
              <div key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${Math.max(6, v)}%`, background: m?.accent ?? 'var(--blue)', opacity: 0.35 + (i / g.trend.length) * 0.65 }} />
            ))}
          </div>
        </div>
      )}

      {defenders && Object.keys(defenders.stars).length > 0 && <DefendersStars stars={defenders.stars} />}

      {weak.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-label-2 mb-1 text-[12px] font-semibold">Temas a reforzar</div>
          <ul className="space-y-1">
            {weak.map((t) => (
              <li key={t.topic} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate">{t.topic}</span>
                <span className="text-ink-orange shrink-0 font-semibold tabular-nums">
                  {t.pct}% · {t.a}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {g.sessions.length > 0 && (
        <ul className="border-separator border-t">
          {g.sessions.slice(0, 5).map((s) => {
            const st = STATUS[s.status];
            const Icon = st.icon;
            return (
              <li key={s.id} className="flex items-center gap-2.5 px-4 py-2 text-[13px]" title={s.reasons?.join(' · ')}>
                <Icon size={15} style={{ color: ink(st.color) }} className="shrink-0" aria-label={st.label} />
                <span className="text-label-2 w-20 shrink-0">{relativeTime(s.endedAt)}</span>
                {s.level && <LevelChip level={s.level} className="h-5 px-2 text-[10px]" />}
                <span className="min-w-0 flex-1 truncate">
                  {s.unit ? `Unidad ${s.unit} · ` : ''}
                  {s.meta?.kind === 'participation' ? `${s.asked} completados` : `${s.correct}/${s.asked}`}
                  {s.stars != null && ` · ${'★'.repeat(s.stars)}`}
                  {s.reasons?.length ? ` · ${s.reasons[0]}` : ''}
                </span>
                <span className="shrink-0 font-semibold tabular-nums" style={{ color: ink(st.color) }}>
                  {s.score != null ? `${s.score}%` : st.label}
                </span>
                {s.xp > 0 && <span className="text-ink-green shrink-0 text-[12px] font-semibold">+{s.xp}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-fill-2 rounded-[12px] py-2">
      <div className="text-[16px] font-bold tabular-nums">{value}</div>
      <div className="text-label-2 text-[10px]">{label}</div>
    </div>
  );
}

function DefendersStars({ stars }: { stars: Record<string, Record<string, number>> }) {
  return (
    <div className="px-4 pb-3">
      <div className="text-label-2 mb-1.5 text-[12px] font-semibold">Estrellas por unidad</div>
      <div className="space-y-1.5">
        {Object.entries(stars)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([lv, units]) => (
            <div key={lv} className="flex items-center gap-2">
              <LevelChip level={lv} className="h-5 w-9 justify-center px-0 text-[10px]" />
              <div className="flex flex-wrap gap-1">
                {Object.entries(units)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([u, n]) => (
                    <span key={u} className="bg-fill-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums" title={`Unidad ${u}: ${n} estrellas`}>
                      {u}
                      <Star size={10} className={n ? 'text-ios-yellow fill-current' : 'text-label-3'} />
                      {n}
                    </span>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function weakTopics(valid: GameSession[]) {
  const agg: Record<string, { a: number; c: number }> = {};
  for (const s of valid)
    for (const [t, v] of Object.entries(s.topics ?? {})) {
      const x = agg[t] ?? { a: 0, c: 0 };
      agg[t] = { a: x.a + v.a, c: x.c + v.c };
    }
  return Object.entries(agg)
    .filter(([, v]) => v.a >= 3)
    .map(([topic, v]) => ({ topic, a: v.a, pct: Math.round((v.c / v.a) * 100) }))
    .filter((t) => t.pct < 70)
    .sort((x, y) => x.pct - y.pct)
    .slice(0, 3);
}

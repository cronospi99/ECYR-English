import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Info, Swords, Users, X } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Chip, EmptyState, Spinner } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { useAuth } from '@/store/auth';
import { useClass } from '@/features/teacher/useClass';
import { TEACHERS, type TeacherCard } from './teachers';
import { RANK_AT, RANKS, loadStudentsCardPoints, rankOf, rankProgress, useMyCardPoints, type CardPoints, type CardRank, type StudentCardRow } from './api';
import { RANK_LOOK } from './ranks';
import { RankBar, RankEmblem, TeacherCardView } from './CardView';
import { useGameFonts } from './fonts';

type Sort = 'num' | 'points' | 'name';

/** /games/cards — the album: all 25 characters with their rank and points. */
export default function CardsPage() {
  useGameFonts();
  const isTeacher = useAuth((s) => s.profile?.role === 'teacher');
  const [tab, setTab] = useState<'mine' | 'class'>('mine');
  return (
    <Page title="Cartas" subtitle="Los 25 personajes de Impostor y Class Wars. Todas son tuyas: cada carta sube de rango con los puntos que ganas jugando con ella." wide>
      {isTeacher && (
        <Segmented
          className="mb-5"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: 'Mis cartas' },
            { value: 'class', label: 'Mi clase' },
          ]}
        />
      )}
      {tab === 'class' && isTeacher ? <ClassCards /> : <Album />}
    </Page>
  );
}

/* ------------------------------------------------------------------ my album */
function Album() {
  const mine = useMyCardPoints();
  const [filter, setFilter] = useState<CardRank | 'all'>('all');
  const [sort, setSort] = useState<Sort>('num');
  const [zoom, setZoom] = useState<TeacherCard | null>(null);
  const pts = mine.points;
  const total = Object.values(pts).reduce((a, b) => a + b, 0);
  const counts = useMemo(() => {
    const c: Record<CardRank, number> = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
    TEACHERS.forEach((t) => c[rankOf(pts[t.id] ?? 0)]++);
    return c;
  }, [pts]);
  const list = useMemo(() => {
    const l = TEACHERS.map((c, i) => ({ c, i, p: pts[c.id] ?? 0 })).filter((x) => filter === 'all' || rankOf(x.p) === filter);
    if (sort === 'points') l.sort((a, b) => b.p - a.p || a.i - b.i);
    if (sort === 'name') l.sort((a, b) => a.c.name.localeCompare(b.c.name, 'es'));
    return l;
  }, [pts, filter, sort]);
  const best = useMemo(() => TEACHERS.map((c) => ({ c, p: pts[c.id] ?? 0 })).sort((a, b) => b.p - a.p)[0], [pts]);
  const grid = useRef<HTMLDivElement>(null);
  const cw = useCardWidth(grid);

  return (
    <>
      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--yellow)_35%,transparent),transparent_70%)]" />
          <div className="text-subhead text-label-2 font-medium">Puntos de carta</div>
          <div className="flex items-end gap-3">
            <div className="text-[44px] leading-none font-extrabold tabular-nums">{total}</div>
            {mine.loading && <Spinner className="mb-2 h-5 w-5" />}
          </div>
          {best && best.p > 0 ? (
            <button type="button" onClick={() => setZoom(best.c)} className="text-subhead text-label-2 mt-2 flex items-center gap-2 text-left">
              <RankEmblem rank={rankOf(best.p)} size={20} />
              <span>
                Tu mejor carta: <b className="text-label">{best.c.name}</b> · {best.p} pts
              </span>
            </button>
          ) : (
            <p className="text-subhead text-label-2 mt-2">Juega Impostor o Class Wars y elige la carta que quieres entrenar.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/impostor" className="bg-[color-mix(in_srgb,var(--orange)_14%,transparent)] text-ink-orange inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold">
              <Swords size={16} /> Impostor
            </Link>
            <Link to="/classwars" className="bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-ink-blue inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold">
              <Users size={16} /> Class Wars
            </Link>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RANKS.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setFilter(filter === r ? 'all' : r)}
              aria-pressed={filter === r}
              className={`bg-card shadow-card rounded-card flex items-center gap-3 p-3 text-left transition-transform active:scale-[0.98] sm:flex-col sm:items-start sm:gap-2 sm:p-4 ${filter === r ? 'ring-2 ring-[var(--blue)]' : ''}`}
            >
              <RankEmblem rank={r} size={34} />
              <div className="min-w-0">
                <div className="text-[26px] leading-none font-extrabold tabular-nums">{counts[r]}</div>
                <div className="text-subhead text-label-2 font-medium">{RANK_LOOK[r].label}</div>
                <div className="text-label-3 text-[12px] font-medium sm:mt-2">{r === 'bronze' ? 'desde 0' : `desde ${RANK_AT[r]} pts`}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {mine.notice && (
        <div className="mb-5 flex items-start gap-3 rounded-[14px] bg-[color-mix(in_srgb,var(--orange)_12%,transparent)] p-3.5">
          <Info size={20} className="text-ink-orange mt-0.5 shrink-0" />
          <p className="text-subhead text-label">{mine.notice}</p>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todas · 25
          </Chip>
          {RANKS.map((r) => (
            <Chip key={r} active={filter === r} onClick={() => setFilter(r)}>
              {RANK_LOOK[r].label} · {counts[r]}
            </Chip>
          ))}
        </div>
        <Segmented
          size="sm"
          className="ml-auto"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'num', label: 'Nº' },
            { value: 'points', label: 'Puntos' },
            { value: 'name', label: 'Nombre' },
          ]}
        />
      </div>

      <div ref={grid} className="grid justify-center gap-3 sm:gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, ${cw}px)` }}>
        {list.map(({ c, i, p }) => (
          <button key={c.id} type="button" onClick={() => setZoom(c)} className="rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`${c.name}: ${RANK_LOOK[rankOf(p)].label}, ${p} puntos`}>
            <TeacherCardView card={c} points={p} width={cw} index={i} animate={false} tilt />
          </button>
        ))}
      </div>
      {!list.length && <EmptyState icon={<RankEmblem rank={filter === 'all' ? 'bronze' : filter} size={44} />} title="Ninguna carta en este rango" body="Sigue jugando: los puntos suben el rango de la carta que entrenas." />}

      {zoom && <CardZoom card={zoom} points={pts} onClose={() => setZoom(null)} />}
    </>
  );
}

/** Card width that fills the grid's row nicely (2 columns on phones, ~180px on desktop). */
function useCardWidth(ref: RefObject<HTMLDivElement | null>) {
  const [w, setW] = useState(170);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const W = el.clientWidth;
      const gap = W < 640 ? 12 : 16;
      const target = W < 420 ? 150 : W < 900 ? 170 : 190;
      const cols = Math.max(2, Math.floor((W + gap) / (target + gap)));
      setW(Math.floor(Math.min(230, (W - (cols - 1) * gap) / cols)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function CardZoom({ card, points, onClose }: { card: TeacherCard; points: CardPoints; onClose: () => void }) {
  const p = points[card.id] ?? 0;
  const prog = rankProgress(p);
  const L = RANK_LOOK[prog.rank];
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('resize', on);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);
  const wide = vp.w >= 760;
  const cw = Math.round(Math.min(320, wide ? (vp.h - 120) * 0.68 : Math.min(vp.w * 0.62, (vp.h - 330) * 0.68)));
  return createPortal(
    <div role="dialog" aria-label={card.name} onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div onClick={(e) => e.stopPropagation()} className={`ecyr-card-pop relative flex items-center gap-6 ${wide ? 'flex-row' : 'flex-col gap-4'}`}>
        <TeacherCardView card={card} points={p} width={Math.max(160, cw)} tilt />
        <div className="bg-card shadow-card rounded-card w-[min(340px,calc(100vw-32px))] p-5">
          <button type="button" onClick={onClose} aria-label="Cerrar" className="bg-fill-2 text-label-2 absolute top-0 right-0 grid h-9 w-9 translate-x-1/3 -translate-y-1/3 place-items-center rounded-full shadow-card sm:static sm:float-right sm:translate-x-0 sm:translate-y-0">
            <X size={18} />
          </button>
          <div className="text-subhead text-label-2 font-medium">{card.role}</div>
          <h2 className="text-title-2">{card.name}</h2>
          <p className="text-subhead text-label-2 mt-1">{card.about}</p>
          <div className="mt-4 flex items-center gap-3">
            <RankEmblem rank={prog.rank} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-[17px]">{L.label}</b>
                <span className="text-label-2 text-[15px] font-semibold tabular-nums">★ {p}</span>
              </div>
              <RankBar points={p} height={12} style={{ marginTop: 6 }} />
            </div>
          </div>
          <p className="text-footnote text-label-2 mt-2 text-[13px]">
            {prog.next ? `Faltan ${prog.left} puntos para ${RANK_LOOK[prog.next].label}.` : '¡Rango máximo! Esta carta brilla como un diamante.'}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {RANKS.map((r) => (
              <div key={r} className={`flex flex-col items-center gap-1 rounded-[10px] p-2 ${RANKS.indexOf(r) <= RANKS.indexOf(prog.rank) ? 'bg-fill-2' : 'opacity-40'}`}>
                <RankEmblem rank={r} size={22} />
                <span className="text-label-2 text-[11px] font-semibold tabular-nums">{RANK_AT[r]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ teacher: my class */
function ClassCards() {
  const { students, loading } = useClass();
  const [rows, setRows] = useState<StudentCardRow[] | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    void loadStudentsCardPoints().then((r) => {
      if (!live) return;
      setRows(r.rows);
      setNotice(r.notice);
    });
    return () => {
      live = false;
    };
  }, []);
  const byStudent = useMemo(() => {
    const m = new Map<string, StudentCardRow[]>();
    (rows ?? []).forEach((r) => m.set(r.user_id, [...(m.get(r.user_id) ?? []), r]));
    return m;
  }, [rows]);
  const list = useMemo(
    () =>
      (students ?? [])
        .map((s) => {
          const own = (byStudent.get(s.profile.id) ?? []).slice().sort((a, b) => b.points - a.points);
          return { id: s.profile.id, name: s.profile.full_name || s.profile.email || 'Estudiante', total: own.reduce((a, b) => a + b.points, 0), games: own.reduce((a, b) => a + b.games, 0), top: own.slice(0, 3) };
        })
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es')),
    [students, byStudent],
  );

  if (loading || rows === null)
    return (
      <div className="text-label-2 grid min-h-[30vh] place-items-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  return (
    <>
      {notice && (
        <div className="mb-5 flex items-start gap-3 rounded-[14px] bg-[color-mix(in_srgb,var(--orange)_12%,transparent)] p-3.5">
          <Info size={20} className="text-ink-orange mt-0.5 shrink-0" />
          <p className="text-subhead text-label">{notice}</p>
        </div>
      )}
      {!list.length ? (
        <Card>
          <EmptyState icon={<Users size={40} />} title="Aún no hay estudiantes" body="Cuando tus estudiantes jueguen Impostor o Class Wars con su cuenta, aquí verás el rango de sus cartas." />
        </Card>
      ) : (
        <Card className="divide-separator divide-y overflow-hidden">
          {list.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-label-3 w-6 text-right text-[15px] font-bold tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold">{s.name}</div>
                <div className="text-label-2 text-[13px]">
                  ★ {s.total} pts · {s.games} {s.games === 1 ? 'partida' : 'partidas'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {s.top.length ? (
                  s.top.map((r) => {
                    const c = TEACHERS.find((t) => t.id === r.card_id)!;
                    return (
                      <div key={r.card_id} title={`${c.name} · ${r.points} pts`} className="hidden sm:block">
                        <TeacherCardView card={c} points={r.points} width={52} animate={false} showRank={false} />
                      </div>
                    );
                  })
                ) : (
                  <span className="text-label-3 text-[13px]">Sin partidas</span>
                )}
                {s.top[0] && <RankEmblem rank={rankOf(s.top[0].points)} size={26} />}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

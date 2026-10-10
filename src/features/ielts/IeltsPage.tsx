import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Headphones,
  History,
  Home,
  Mic,
  PenLine,
  Scale,
  Target,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Spinner } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { mountIelts, parkIelts, ieltsApi, type IeltsModule } from './engine/host';
import { readIelts } from '@/lib/ielts';
import { useProgress } from '@/store/progress';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import type { Skill } from '@/content/types';
import './styles/ielts-base.css';
import './styles/ielts-skin.css';

const SECTIONS: { mod: IeltsModule; label: string; icon: LucideIcon; color: string; only?: 'teacher' | 'student' }[] = [
  { mod: 'dashboard', label: 'Inicio', icon: Home, color: 'var(--indigo)' },
  { mod: 'listening', label: 'Listening', icon: Headphones, color: 'var(--skill-listening)' },
  { mod: 'reading', label: 'Reading', icon: BookOpen, color: 'var(--skill-reading)' },
  { mod: 'writing', label: 'Writing', icon: PenLine, color: 'var(--skill-writing)' },
  { mod: 'speaking', label: 'Speaking', icon: Mic, color: 'var(--skill-speaking)' },
  { mod: 'practice', label: 'Práctica libre', icon: Target, color: 'var(--pink)' },
  { mod: 'mock', label: 'Mock test', icon: ClipboardList, color: 'var(--red)' },
  { mod: 'progress', label: 'Progreso', icon: TrendingUp, color: 'var(--teal)' },
  { mod: 'history', label: 'Mi historial', icon: History, color: 'var(--orange)', only: 'student' },
  { mod: 'class', label: 'Mi clase', icon: GraduationCap, color: 'var(--green)', only: 'teacher' },
  { mod: 'descriptors', label: 'Descriptores', icon: Scale, color: 'var(--label-2)' },
];
const VALID = new Set(SECTIONS.map((s) => s.mod));
const SKILL_OF: Record<string, Skill> = { listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking' };

/** Turns new simulator attempts into platform XP, once each. */
function syncIeltsXp(award: ReturnType<typeof useProgress.getState>['award']) {
  const { history } = readIelts();
  let seen = 0;
  try {
    seen = Number(localStorage.getItem('ecyr:ielts-seen') ?? '0');
  } catch {
    /* storage unavailable */
  }
  history.slice(0, Math.max(0, history.length - seen)).forEach((h) =>
    award({
      kind: 'ielts',
      title: `IELTS ${h.module} · banda ${h.band}`,
      skill: SKILL_OF[h.module] ?? 'reading',
      xp: 30,
      score: Math.round((Number(h.band) / 9) * 100),
    }),
  );
  try {
    localStorage.setItem('ecyr:ielts-seen', String(history.length));
  } catch {
    /* storage unavailable */
  }
}

export default function IeltsPage() {
  const { mod: param } = useParams();
  const mod: IeltsModule = param && VALID.has(param as IeltsModule) ? (param as IeltsModule) : 'dashboard';
  const navigate = useNavigate();
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(Boolean(ieltsApi()));
  const [error, setError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Set<string>>(new Set());
  const award = useProgress((s) => s.award);
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);

  // Mount (or re-attach) the engine.
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    let alive = true;
    mountIelts(el)
      .then((api) => {
        if (!alive) return;
        setReady(true);
        if (api.state.mod !== mod) api.setModule(mod);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
      syncIeltsXp(useProgress.getState().award);
      parkIelts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route → engine.
  useEffect(() => {
    const api = ieltsApi();
    if (ready && api && api.state.mod !== mod) api.setModule(mod);
  }, [mod, ready]);

  // Engine → route (buttons inside the simulator call its own setModule).
  useEffect(() => {
    const onMod = (e: Event) => {
      const m = (e as CustomEvent<IeltsModule>).detail;
      syncIeltsXp(award);
      if (m !== mod) navigate(m === 'dashboard' ? '/ielts' : `/ielts/${m}`);
    };
    window.addEventListener('ielts:module', onMod);
    return () => window.removeEventListener('ielts:module', onMod);
  }, [mod, navigate, award]);

  // Mirror the engine's role-dependent tabs (My class / My history).
  useEffect(() => {
    if (!ready) return;
    const nav = document.getElementById('tabs');
    if (!nav) return;
    const read = () => setTabs(new Set([...nav.querySelectorAll('button[data-mod]')].map((b) => (b as HTMLElement).dataset.mod!)));
    read();
    const mo = new MutationObserver(read);
    mo.observe(nav, { childList: true });
    return () => mo.disconnect();
  }, [ready]);

  // A class joined (or role changed) from the platform profile reaches the engine.
  useEffect(() => {
    const api = ieltsApi();
    if (!ready || !api || !session || !profile) return;
    const p = api.AUTH.profile;
    if (p && (p.teacher_id !== profile.teacher_id || p.role !== profile.role)) void api.adoptSession(session).then(() => api.render());
  }, [ready, session, profile]);

  // Theme switch: redraw charts with the new colours.
  useEffect(() => {
    const mo = new MutationObserver(() => {
      const api = ieltsApi();
      if (api && ['dashboard', 'progress', 'history', 'class'].includes(api.state.mod)) api.render();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  const visible = SECTIONS.filter((s) => !s.only || tabs.has(s.mod));

  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <Award size={15} className="text-ios-indigo" /> IELTS Academic
        </span>
      }
      title="IELTS Simulator"
      wide
    >
      <nav
        aria-label="Secciones del IELTS"
        className="no-scrollbar material sticky top-12 z-20 -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-[16px] lg:px-2"
      >
        {visible.map((s) => {
          const Icon = s.icon;
          const active = s.mod === mod;
          return (
            <NavLink
              key={s.mod}
              to={s.mod === 'dashboard' ? '/ielts' : `/ielts/${s.mod}`}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors',
                active ? 'bg-label text-bg' : 'text-label hover:bg-fill-2',
              )}
            >
              <Icon size={16} style={{ color: active ? undefined : s.color }} />
              {s.label}
            </NavLink>
          );
        })}
      </nav>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <TriangleAlert size={40} className="text-ios-orange" />
          <p className="text-label-2 max-w-md">{error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      ) : (
        !ready && (
          <div className="text-label-2 flex items-center justify-center gap-3 py-24">
            <Spinner className="h-6 w-6" /> Preparando el simulador…
          </div>
        )
      )}
      <div ref={host} />
    </Page>
  );
}

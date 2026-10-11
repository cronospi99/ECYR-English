import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { Crown, Flame, School, Sparkles, FlaskConical } from 'lucide-react';
import { NAV, isActive } from './nav';
import { Logo } from '@/components/brand/Logo';
import { IconTile } from '@/components/ui/IconTile';
import { Avatar } from './Avatar';
import { useProgress } from '@/store/progress';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { useEffect } from 'react';

function useDisplayName() {
  const profile = useAuth((s) => s.profile);
  const local = useSettings((s) => s.name);
  return profile?.full_name || local || 'Learner';
}

function Sidebar() {
  const { pathname } = useLocation();
  const name = useDisplayName();
  const profile = useAuth((s) => s.profile);
  const streak = useProgress((s) => s.streak.current);
  return (
    <aside className="material fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-separator lg:flex">
      <div className="px-6 pt-7 pb-6">
        <Link to="/" aria-label="ECYR English — inicio">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Principal">
        {NAV.filter((n) => !n.teacherOnly || profile?.role === 'teacher').map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex h-11 items-center gap-3 rounded-[11px] px-3 text-[15px] font-medium transition-colors',
                active ? 'bg-card text-label shadow-card' : 'text-label hover:bg-fill-2',
              )}
            >
              <IconTile icon={item.icon} color={item.color} size={28} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3">
        <Link to="/profile" className="bg-card flex items-center gap-3 rounded-[14px] p-3 shadow-card hover:opacity-90">
          <Avatar name={name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{name}</div>
            <div className="text-label-2 flex items-center gap-1 text-[12px]">
              {profile?.role === 'teacher' ? (
                <>
                  <Crown size={12} className="text-ios-orange" /> Docente
                </>
              ) : (
                <>
                  <Flame size={12} className="text-ios-orange" /> Racha de {streak} {streak === 1 ? 'día' : 'días'}
                </>
              )}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const name = useDisplayName();
  const isTeacher = useAuth((s) => s.profile?.role === 'teacher');
  return (
    <div className="material pt-safe hairline-b sticky top-0 z-30 lg:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        <Link to="/" aria-label="Inicio">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-2">
          {isTeacher && (
            <Link
              to="/teacher"
              aria-label="Sala del docente"
              className="text-ios-orange inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--orange)_14%,transparent)]"
            >
              <School size={16} />
            </Link>
          )}
          <Link
            to="/coach"
            className="text-ios-purple bg-[color-mix(in_srgb,var(--purple)_14%,transparent)] inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold"
          >
            <Sparkles size={15} /> Coach
          </Link>
          <Link to="/profile" aria-label="Perfil">
            <Avatar name={name} size={32} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Pestañas"
      className="material-strong hairline-t pb-safe fixed inset-x-0 bottom-0 z-30 lg:hidden"
    >
      <div className="mx-auto flex h-[52px] max-w-lg items-stretch">
        {NAV.filter((n) => n.tab).map((item) => {
          const active = isActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-ios-blue' : 'text-label-2',
              )}
            >
              <Icon size={23} strokeWidth={active ? 2.4 : 1.9} />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/** Teacher free-practice mode: a constant reminder that nothing is being saved. */
function SandboxBanner() {
  const on = useSettings((s) => s.practiceSandbox);
  const set = useSettings((s) => s.set);
  if (!on) return null;
  return (
    <div role="status" className="sticky top-12 z-20 flex items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--orange)_16%,var(--bg))] px-4 py-2 text-[13px] font-medium lg:top-0">
      <FlaskConical size={15} className="text-ios-orange shrink-0" />
      <span>Modo práctica libre: no se guarda tu progreso.</span>
      <button type="button" className="text-ios-blue font-semibold" onClick={() => set({ practiceSandbox: false })}>
        Desactivar
      </button>
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  // Lets the intro curtain (index.html) know the app has rendered.
  useEffect(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
  }, []);
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-[264px]">
        <MobileTopBar />
        <SandboxBanner />
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}

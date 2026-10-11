import { Home, CalendarRange, School, FolderOpen, GraduationCap, Dumbbell, Gamepad2, Award, Sparkles, TrendingUp, UserRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  color: string;
  tab?: boolean;
  /** Only shown to teachers. */
  teacherOnly?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home, color: 'var(--blue)', tab: true },
  { to: '/teacher', label: 'Sala del docente', icon: School, color: 'var(--orange)', teacherOnly: true },
  { to: '/plan', label: 'Mi plan', icon: CalendarRange, color: 'var(--indigo)' },
  { to: '/learn', label: 'Aprender', icon: GraduationCap, color: 'var(--green)', tab: true },
  { to: '/practice', label: 'Práctica', icon: Dumbbell, color: 'var(--orange)', tab: true },
  { to: '/games', label: 'Juegos', icon: Gamepad2, color: 'var(--pink)', tab: true },
  { to: '/ielts', label: 'IELTS', icon: Award, color: 'var(--indigo)', tab: true },
  { to: '/coach', label: 'AI Coach', icon: Sparkles, color: 'var(--purple)' },
  { to: '/progress', label: 'Progreso', icon: TrendingUp, color: 'var(--teal)' },
  { to: '/portfolio', label: 'Mis trabajos', icon: FolderOpen, color: 'var(--mint)' },
  { to: '/profile', label: 'Perfil', icon: UserRound, color: 'var(--label-2)' },
];

export const isActive = (pathname: string, to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

import { Home, CalendarRange, School, FolderOpen, ClipboardCheck, GraduationCap, Dumbbell, Gamepad2, Award, Sparkles, TrendingUp, UserRound, NotebookPen, StickyNote, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  color: string;
  tab?: boolean;
  /** Only shown to teachers. */
  teacherOnly?: boolean;
  /** Hidden for teachers (they manage it from the teacher hub). */
  studentOnly?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, color: 'var(--blue)', tab: true },
  { to: '/teacher', label: 'Teacher room', icon: School, color: 'var(--orange)', teacherOnly: true },
  { to: '/tasks', label: 'Tasks', icon: ClipboardCheck, color: 'var(--red)', studentOnly: true },
  { to: '/boards', label: 'Live board', icon: StickyNote, color: 'var(--yellow)' },
  { to: '/plan', label: 'My plan', icon: CalendarRange, color: 'var(--indigo)' },
  { to: '/learn', label: 'Learn', icon: GraduationCap, color: 'var(--green)', tab: true },
  { to: '/practice', label: 'Practice', icon: Dumbbell, color: 'var(--orange)', tab: true },
  { to: '/games', label: 'Games', icon: Gamepad2, color: 'var(--pink)', tab: true },
  { to: '/ielts', label: 'IELTS', icon: Award, color: 'var(--indigo)', tab: true },
  { to: '/coach', label: 'AI Coach', icon: Sparkles, color: 'var(--purple)' },
  { to: '/progress', label: 'Progress', icon: TrendingUp, color: 'var(--teal)' },
  { to: '/portfolio', label: 'My work', icon: FolderOpen, color: 'var(--mint)' },
  { to: '/notes', label: 'My notes', icon: NotebookPen, color: 'var(--yellow)' },
  { to: '/profile', label: 'Profile', icon: UserRound, color: 'var(--label-2)' },
];

export const isActive = (pathname: string, to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

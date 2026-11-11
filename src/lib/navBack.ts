/**
 * Where "back" goes from any in-app page: the parent screen in the app's
 * hierarchy (unit → level → Aprender, Listening → Práctica…). Top-level
 * screens (the tabs and the sidebar entries) have no parent.
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface BackTarget {
  to: string;
  label: string;
}

const LABELS: Record<string, string> = {
  '/': 'Home',
  '/learn': 'Learn',
  '/learn/grammar': 'Grammar',
  '/learn/foundations': 'Foundations',
  '/practice': 'Practice',
  '/practice/workshops': 'Workshops',
  '/teacher': 'Teacher room',
  '/ielts': 'IELTS',
  '/games': 'Games',
  '/profile': 'Profile',
};

/** Screens whose parent is not simply "one segment up". */
const SPECIAL: Record<string, BackTarget> = {
  '/admin/teachers': { to: '/profile', label: 'Profile' },
  '/import': { to: '/profile', label: 'Profile' },
  '/boards': { to: '/', label: 'Home' },
};

const LEVEL = /^\/learn\/(a1|a2|b1|b2|c1|c2)$/i;

export function parentOf(pathname: string): BackTarget | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (SPECIAL[path]) return SPECIAL[path]!;
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  // Exams belong to a level: /exams/a1-final → /learn/a1.
  if (parts[0] === 'exams') {
    const lvl = /^(a1|a2|b1|b2|c1|c2)/i.exec(parts[1] ?? '')?.[1];
    return lvl ? { to: `/learn/${lvl.toLowerCase()}`, label: lvl.toUpperCase() } : { to: '/learn', label: 'Learn' };
  }
  const up = '/' + parts.slice(0, -1).join('/');
  if (LEVEL.test(up)) return { to: up, label: up.split('/').pop()!.toUpperCase() };
  if (LABELS[up]) return { to: up, label: LABELS[up]! };
  return parentOf(up) ?? { to: '/', label: 'Home' };
}

/**
 * "Back" that feels native: returns to the previous in-app screen when there
 * is one (keeps its scroll and tab), otherwise opens the parent screen.
 */
export function useGoBack(fallback?: BackTarget | null) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const target = fallback ?? parentOf(pathname);
  const go = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(target?.to ?? '/');
  }, [navigate, target]);
  return { target, go };
}

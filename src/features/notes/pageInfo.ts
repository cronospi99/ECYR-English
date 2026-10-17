import { NAV, isActive } from '@/components/layout/nav';

/**
 * Where the learner is right now, to tag a new note: the in-app path and a
 * human title (the page's large title, else the section's nav label).
 */
export function currentPageInfo(pathname = window.location.pathname, search = window.location.search): { title: string; path: string } {
  const path = `${pathname}${search}`.slice(0, 400);
  if (pathname === '/notes') return { title: '', path: '' };
  let title = '';
  try {
    title = document.querySelector('main h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  } catch {
    /* no DOM */
  }
  const section = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => isActive(pathname, n.to));
  if (!title || title.length > 120) title = section?.label ?? 'ECYR English';
  else if (section && section.to !== '/' && !title.toLowerCase().includes(section.label.toLowerCase()) && title.length < 60) title = `${section.label} · ${title}`;
  return { title: title.slice(0, 200), path };
}

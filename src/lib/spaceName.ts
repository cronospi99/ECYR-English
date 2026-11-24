/** "Esteban's Space": the teacher's own name for their room (replaces the generic "Teacher room"). */

export function firstName(fullName: string | null | undefined): string {
  const t = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  // An e-mail typed as a name is not a name.
  return t.includes('@') ? '' : t;
}

/** "Esteban's Space", "James' Space" (name ends in s) or "Teacher's Space" with no name. */
export function spaceTitle(fullName: string | null | undefined): string {
  const n = firstName(fullName);
  if (!n) return "Teacher's Space";
  return /s$/i.test(n) ? `${n}' Space` : `${n}'s Space`;
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 19 ? 'Good afternoon' : 'Good evening';
}

export function initialsOf(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter((p) => p && !p.includes('@'));
  if (!parts.length) return 'T';
  return ((parts[0]![0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : '')).toUpperCase();
}

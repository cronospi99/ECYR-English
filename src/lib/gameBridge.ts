import { moduleBySlug } from '@/content/catalog';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { TRACKED_GAMES, sanitizeDefenders, sessionXp, useGames, validateSession } from '@/store/games';
import type { CefrLevel } from '@/content/types';

/**
 * Receives what games report from their iframe (see public/modules/_bridge/ecyr-bridge.js).
 * Lives at app level, not in the player, so a result sent while the player is
 * closing (an abandoned round) still arrives.
 *
 * Trust: only same-origin messages from an iframe that is actually showing that
 * game's module may open a session; answers and results are then accepted only
 * for sessions that were opened that way.
 */
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

function frameShowing(source: MessageEventSource | null, slug: string): boolean {
  const m = moduleBySlug(slug);
  if (!m || !source) return false;
  for (const f of document.querySelectorAll('iframe')) {
    if (f.contentWindow !== source) continue;
    try {
      return f.contentWindow.location.pathname === m.src.split('?')[0];
    } catch {
      return false;
    }
  }
  return false;
}

/** English Defenders keeps its own per-unit stars in this origin's localStorage. */
export function readDefendersStore() {
  try {
    const stars = JSON.parse(localStorage.getItem('ed:progress') || '{}') as unknown;
    const g = JSON.parse(localStorage.getItem('ed:global') || '{}') as { asked?: number; correct?: number };
    return sanitizeDefenders({ stars, asked: g.asked ?? 0, correct: g.correct ?? 0 });
  } catch {
    return null;
  }
}

/** Writes merged stars back so the game shows units won on another device. */
export function writeDefendersStore(d: ReturnType<typeof readDefendersStore>) {
  if (!d) return;
  try {
    const local = readDefendersStore();
    const merged: Record<string, Record<string, number>> = { ...(local?.stars ?? {}) };
    for (const [lv, units] of Object.entries(d.stars)) {
      merged[lv] = { ...(merged[lv] ?? {}) };
      for (const [u, n] of Object.entries(units)) merged[lv]![u] = Math.max(merged[lv]![u] ?? 0, n);
    }
    localStorage.setItem('ed:progress', JSON.stringify(merged));
    const asked = Math.max(local?.asked ?? 0, d.asked);
    const correct = Math.max(local?.correct ?? 0, d.correct);
    localStorage.setItem('ed:global', JSON.stringify({ asked, correct }));
    useGames.getState().setDefenders({ stars: merged, asked, correct });
  } catch {
    /* storage unavailable */
  }
}

let started = false;

export function startGameBridge() {
  if (started) return;
  started = true;
  const d = readDefendersStore();
  if (d && Object.keys(d.stars).length) useGames.getState().setDefenders(d);

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== location.origin) return;
    const data = e.data as Record<string, unknown> | null;
    if (!data || data.source !== 'ecyr-game' || data.v !== 1) return;
    const slug = typeof data.slug === 'string' ? data.slug : '';
    const id = typeof data.sessionId === 'string' ? data.sessionId.slice(0, 40) : '';
    if (!TRACKED_GAMES[slug] || !id) return;
    const games = useGames.getState();

    if (data.type === 'start') {
      if (!frameShowing(e.source, slug)) return;
      games.start(id, {
        slug,
        startedAt: typeof data.startedAt === 'string' ? data.startedAt : new Date().toISOString(),
        mode: data.mode === 'class' ? 'class' : 'solo',
        level: LEVELS.includes(String(data.level)) ? (data.level as CefrLevel) : undefined,
        unit: data.unit != null ? String(data.unit).slice(0, 12) : undefined,
        asked: 0,
        correct: 0,
        topics: {},
      });
      return;
    }

    const live = games.live[id];
    if (!live || live.slug !== slug) return;

    if (data.type === 'answer') {
      games.answer(id, data.correct === true, typeof data.topic === 'string' ? data.topic.slice(0, 80) : undefined);
      return;
    }

    if (data.type === 'result') {
      // Teachers practising freely leave no trace in their stats.
      if (useSettings.getState().practiceSandbox) return games.drop(id);
      const s = validateSession(data, live);
      const xp = sessionXp(s);
      games.finish({ ...s, xp });
      if (xp > 0) {
        const m = moduleBySlug(slug);
        useProgress.getState().award({
          kind: 'game',
          title: `${m?.title ?? slug}${s.score != null ? ` · ${s.score}%` : ''}`,
          skill: TRACKED_GAMES[slug]!.skill,
          xp,
          score: s.score,
          level: s.level,
          ref: `game:${slug}`,
        });
      }
      if (slug === 'english-defenders') {
        const ed = readDefendersStore();
        if (ed) useGames.getState().setDefenders(ed);
      }
    }
  });
}

/**
 * Lightweight usage analytics for the platform owner (panel at /admin/stats,
 * table in supabase/migrations/23_usage_analytics.sql).
 *
 *   track('coach', 'ai_call', { mode: 'chat' })      one event
 *   setActiveFeature('units')                          start counting active seconds for a feature
 *
 * Design: in-memory queue, one batched POST to Supabase's REST API every ~20 s and when the tab
 * is hidden (fetch keepalive). Never throws, never blocks the UI. Nothing is recorded for
 * signed-out visitors. If the table does not exist yet (404/403) it stops trying for an hour.
 * PRIVACY: only feature ids, action names and tiny numeric/ID meta: never e-mails or typed text.
 */
import { supabase, supabaseConfig } from './supabase';
import { featureForLocation } from './usageFeatures';

export type UsageMeta = Record<string, string | number | boolean>;

interface Row {
  feature: string;
  action: string;
  seconds: number;
  meta: UsageMeta;
}

const FLUSH_MS = 20_000;
const TICK_MS = 5_000;
const BATCH = 100;
const MAX_QUEUE = 300;
const OFF_KEY = 'ecyr:usage-off';
const OFF_FOR_MS = 60 * 60 * 1000;

let queue: Row[] = [];
let token: string | null = null;
let started = false;
let active: string | null = null;
let lastMark = 0;
const pending = new Map<string, number>(); // feature → active seconds not yet queued

function isOff(): boolean {
  if (!supabaseConfig) return true;
  try {
    const t = Number(localStorage.getItem(OFF_KEY));
    return Boolean(t) && Date.now() - t < OFF_FOR_MS;
  } catch {
    return false;
  }
}
function switchOff() {
  queue = [];
  pending.clear();
  try {
    localStorage.setItem(OFF_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

/** Keeps only small primitive values (ids, counts); long strings are cut. */
function cleanMeta(meta?: UsageMeta): UsageMeta {
  const out: UsageMeta = {};
  if (!meta) return out;
  let n = 0;
  for (const [k, v] of Object.entries(meta)) {
    if (n >= 6) break;
    if (typeof v === 'string') out[k.slice(0, 24)] = v.slice(0, 40);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k.slice(0, 24)] = Math.round(v * 100) / 100;
    else if (typeof v === 'boolean') out[k.slice(0, 24)] = v;
    else continue;
    n++;
  }
  return out;
}

/**
 * Class / teacher context of what the user is doing now (a live board, a live-game room…).
 * It is added to every event (including active-time ones) until it is cleared or the user moves to
 * another feature. Keys the server understands (migration 24): teacher, board, room, role, assignment.
 */
let context: UsageMeta = {};
export function setUsageContext(ctx: UsageMeta | null): void {
  context = ctx ? cleanMeta(ctx) : {};
}
/** Clears the context only if it still contains this key=value (a newer screen may have replaced it). */
export function clearUsageContext(key: string, value?: string | number | boolean): void {
  if (key in context && (value === undefined || context[key] === value)) context = {};
}

/** Records one event. Safe to call anywhere, any time. */
export function track(feature: string, action: string, meta?: UsageMeta): void {
  try {
    if (!token || !feature || !action || isOff()) return;
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({ feature: feature.slice(0, 64), action: action.slice(0, 32), seconds: 0, meta: cleanMeta({ ...context, ...meta }) });
  } catch {
    /* analytics must never break the app */
  }
}

// ------------------------------------------------------------ active time ----
function account() {
  const now = Date.now();
  if (active && token && document.visibilityState === 'visible' && lastMark) {
    // A throttled background timer must not credit minutes of absence.
    const dt = Math.min(now - lastMark, TICK_MS * 3) / 1000;
    pending.set(active, (pending.get(active) ?? 0) + dt);
  }
  lastMark = now;
}

/** The feature the user is on right now: its visible time is summed and sent as `time`. */
export function setActiveFeature(feature: string | null): void {
  account();
  active = feature;
}
/** Clears the active feature only if it is still this one (a newer screen may have taken over). */
export function clearActiveFeature(feature: string): void {
  account();
  if (active === feature) active = null;
}

function collectTime() {
  account();
  for (const [feature, s] of pending) {
    const whole = Math.floor(s);
    if (whole < 1) continue;
    pending.set(feature, s - whole);
    let left = whole;
    while (left > 0) {
      const chunk = Math.min(left, 3600);
      if (queue.length >= MAX_QUEUE) queue.shift();
      queue.push({ feature, action: 'time', seconds: chunk, meta: { ...context } });
      left -= chunk;
    }
  }
}

// ----------------------------------------------------------------- sending ----
let sending = false;

function flush(): void {
  try {
    collectTime();
    if (sending || !queue.length || !token || !supabaseConfig || isOff()) return;
    const batch = queue.splice(0, BATCH);
    sending = true;
    void fetch(`${supabaseConfig.url}/rest/v1/usage_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
    })
      .then((r) => {
        if (r.ok) return;
        // Table missing (404) or not granted (403): stop for a while. Expired token (401) or bad rows: drop.
        if (r.status === 404 || r.status === 403) switchOff();
        else if (r.status >= 500) queue = batch.concat(queue).slice(-MAX_QUEUE);
      })
      .catch(() => {
        queue = batch.concat(queue).slice(-MAX_QUEUE); // offline: try again next round
      })
      .finally(() => {
        sending = false;
        if (queue.length >= BATCH) flush();
      });
  } catch {
    sending = false;
  }
}

// -------------------------------------------------------------------- init ----
interface RouterLike {
  state: { location: { pathname: string; search: string } };
  subscribe(fn: (s: { location: { pathname: string; search: string } }) => void): () => void;
}

/** Starts the session tracking, the timers and the per-route `view` events. Idempotent. */
export function initUsage(router: RouterLike): void {
  if (started || !supabase || !supabaseConfig) return;
  started = true;

  let lastFeature: string | null = null;
  const setToken = (t: string | null) => {
    const first = !token && !!t;
    token = t;
    if (!t) {
      queue = [];
      pending.clear();
    } else if (first && lastFeature) {
      track(lastFeature, 'view'); // the screen the user was already on when the session became known
    }
  };
  void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  supabase.auth.onAuthStateChange((_e, session) => setToken(session?.access_token ?? null));

  const onRoute = (loc: { pathname: string; search: string }) => {
    const feature = featureForLocation(loc.pathname, loc.search);
    if (feature === lastFeature) return;
    lastFeature = feature;
    context = {}; // a context belongs to the screen that set it
    // Iframe players (feature === null here) set their own active feature in ModuleFrame.
    if (feature) {
      track(feature, 'view');
      setActiveFeature(feature);
    } else if (!/^\/play\//.test(loc.pathname)) {
      setActiveFeature(null);
    }
  };
  onRoute(router.state.location);
  router.subscribe((s) => onRoute(s.location));

  lastMark = Date.now();
  setInterval(account, TICK_MS);
  setInterval(flush, FLUSH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    } else {
      lastMark = Date.now();
    }
  });
  window.addEventListener('pagehide', flush);
}

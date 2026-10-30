import { PlaySquare } from 'lucide-react';
import type { WidgetProps } from '../util';
import { LinkForm, pushRecent, type Recent } from './LinkForm';

interface D {
  id: string | null;
  /** Playlist id (list=…), alone or with a starting video. */
  list?: string | null;
  start: number;
  recent?: Recent[];
}

/** YouTube video and/or playlist (+ start seconds) from any common link shape. */
export function parseYouTube(url: string): { id: string | null; list: string | null; start: number } | null {
  const s = url.trim();
  if (/^[\w-]{11}$/.test(s)) return { id: s, list: null, start: 0 };
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1, 12);
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null;
    } else return null;
    if (id && !/^[\w-]{11}$/.test(id)) id = null;
    const rawList = u.searchParams.get('list');
    const list = rawList && /^[\w-]{10,64}$/.test(rawList) ? rawList : null;
    if (!id && !list) return null;
    const t = u.searchParams.get('t') ?? u.searchParams.get('start') ?? '0';
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
    const start = m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
    return { id, list, start };
  } catch {
    return null;
  }
}

const PRESETS: Recent[] = [{ label: '🎧 Lofi radio (en vivo)', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }];

export default function Video({ data, set, editing, setEditing }: WidgetProps<D>) {
  if ((!data.id && !data.list) || editing)
    return (
      <LinkForm
        icon={<PlaySquare size={44} className="text-ink-red" />}
        color="var(--red)"
        prompt="Pega un enlace de YouTube (video o playlist)"
        placeholder="https://youtu.be/…"
        error="Ese enlace no parece de YouTube."
        presets={PRESETS}
        recent={data.recent}
        onSubmit={(url) => {
          const r = parseYouTube(url);
          if (!r) return false;
          const preset = PRESETS.find((p) => p.url === url);
          const label = preset?.label ?? (r.list && !r.id ? `Playlist · ${r.list.slice(0, 6)}…` : `Video · ${r.id}`);
          set({ ...r, recent: pushRecent(data.recent, { label, url: url.trim() }) });
          setEditing(false);
          return true;
        }}
        onForget={(url) => set({ recent: (data.recent ?? []).filter((r) => r.url !== url) })}
      />
    );

  const q = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (data.list) q.set('list', data.list);
  if (data.start) q.set('start', String(data.start));
  const path = data.id ?? 'videoseries';
  return (
    <iframe
      className="h-full w-full bg-black"
      src={`https://www.youtube-nocookie.com/embed/${path}?${q}`}
      title="YouTube"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

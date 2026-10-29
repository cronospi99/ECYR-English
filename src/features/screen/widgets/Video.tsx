import { useState } from 'react';
import { Link2, PlaySquare } from 'lucide-react';
import type { WidgetProps } from '../util';
import { Act, Empty, inputCls } from './ui';

interface D {
  id: string | null;
  start: number;
}

/** YouTube id (+ start seconds) from any common link shape. */
export function parseYouTube(url: string): { id: string; start: number } | null {
  const s = url.trim();
  if (/^[\w-]{11}$/.test(s)) return { id: s, start: 0 };
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1, 12);
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null;
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const t = u.searchParams.get('t') ?? u.searchParams.get('start') ?? '0';
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
    const start = m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
    return { id, start };
  } catch {
    return null;
  }
}

export default function Video({ data, set, editing, setEditing }: WidgetProps<D>) {
  const [url, setUrl] = useState('');
  const [bad, setBad] = useState(false);
  const submit = () => {
    const r = parseYouTube(url);
    if (!r) return setBad(true);
    setBad(false);
    setUrl('');
    set(r);
    setEditing(false);
  };

  if (!data.id || editing)
    return (
      <Empty icon={<PlaySquare size={44} className="text-ink-red" />} text={bad ? 'Ese enlace no parece de YouTube.' : 'Pega un enlace de YouTube'}>
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" aria-label="Enlace de YouTube" inputMode="url" />
          <Act solid color="var(--red)" type="submit" aria-label="Mostrar video">
            <Link2 size={18} />
          </Act>
        </form>
      </Empty>
    );

  return (
    <iframe
      className="h-full w-full bg-black"
      src={`https://www.youtube-nocookie.com/embed/${data.id}?rel=0&modestbranding=1${data.start ? `&start=${data.start}` : ''}`}
      title="Video de YouTube"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

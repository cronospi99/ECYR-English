import { Music } from 'lucide-react';
import type { WidgetProps } from '../util';
import { LinkForm, pushRecent, type Recent } from './LinkForm';

const KINDS = ['track', 'album', 'playlist', 'artist', 'episode', 'show'] as const;
type Kind = (typeof KINDS)[number];

interface D {
  kind: Kind | null;
  id: string | null;
  recent?: Recent[];
}

const NAMES: Record<Kind, string> = { track: 'Canción', album: 'Álbum', playlist: 'Playlist', artist: 'Artista', episode: 'Episodio', show: 'Podcast' };

/** Spotify item from an open.spotify.com link (any locale prefix) or a spotify: URI. */
export function parseSpotify(input: string): { kind: Kind; id: string } | null {
  const s = input.trim();
  const uri = /^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]{22})$/.exec(s);
  if (uri) return { kind: uri[1] as Kind, id: uri[2]! };
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (!/(^|\.)spotify\.com$/.test(u.hostname)) return null;
    const m = /\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})/.exec(u.pathname);
    return m ? { kind: m[1] as Kind, id: m[2]! } : null;
  } catch {
    return null;
  }
}

// Spotify's own editorial playlists, handy as background music while students work.
const PRESETS: Recent[] = [
  { label: '🎧 Lofi beats', url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn' },
  { label: '🎹 Peaceful Piano', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { label: '🧠 Deep Focus', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ' },
];

export default function Spotify({ data, set, editing, setEditing }: WidgetProps<D>) {
  if (!data.id || !data.kind || editing)
    return (
      <LinkForm
        icon={<Music size={44} style={{ color: '#1DB954' }} />}
        color="#1DB954"
        prompt="Pega un enlace de Spotify (playlist, canción, álbum o podcast)"
        placeholder="https://open.spotify.com/playlist/…"
        error="Ese enlace no parece de Spotify."
        presets={PRESETS}
        recent={data.recent}
        onSubmit={(url) => {
          const r = parseSpotify(url);
          if (!r) return false;
          const preset = PRESETS.find((p) => parseSpotify(p.url)?.id === r.id);
          set({ ...r, recent: pushRecent(data.recent, { label: preset?.label ?? `${NAMES[r.kind]} · ${r.id.slice(0, 5)}…`, url: `https://open.spotify.com/${r.kind}/${r.id}` }) });
          setEditing(false);
          return true;
        }}
        onForget={(url) => set({ recent: (data.recent ?? []).filter((r) => r.url !== url) })}
        footer={
          <p className="text-label-3 max-w-md text-[12px] leading-snug">
            Con tu sesión de Spotify abierta en este navegador (Premium) suenan las canciones completas; sin sesión, vistas previas de 30 s.
          </p>
        }
      />
    );

  return (
    <div className="flex h-full flex-col bg-[#121212]">
      <iframe
        className="min-h-0 w-full flex-1"
        src={`https://open.spotify.com/embed/${data.kind}/${data.id}?utm_source=generator`}
        title="Reproductor de Spotify"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
      <p className="px-3 py-1 text-center text-[11px] text-white/45">¿No carga? Tu red o el antivirus del equipo pueden bloquear Spotify.</p>
    </div>
  );
}

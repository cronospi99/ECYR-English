import { useRef, useState, useSyncExternalStore } from 'react';
import {
  Cloud,
  CloudOff,
  Download,
  GraduationCap,
  LogOut,
  Moon,
  School,
  Upload,
  Volume2,
  Languages,
  RotateCcw,
  Pencil,
  FileUp,
  FolderOpen,
  Sparkles,
  Smartphone,
  Check,
  Play,
  Square,
} from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Toggle, Spinner } from '@/components/ui/Misc';
import { Avatar } from '@/components/layout/Avatar';
import { AvatarEditor } from '@/features/avatar/AvatarEditor';
import { useAuth } from '@/store/auth';
import { useSettings, type ThemePref } from '@/store/settings';
import { useProgress, snapshot, mergeProgress, type ProgressData } from '@/store/progress';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PERSONAS, defaultPersona, edgeIssue, personaFor, type Persona, type VoiceAccent } from '@/lib/tts';
import { getSpeechState, speakAs, stopSpeaking, subscribeSpeech } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

export default function ProfilePage() {
  const session = useAuth((s) => s.session);
  return (
    <Page title="Perfil" subtitle="Tu cuenta, tu clase y tus preferencias.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {session ? (
            <Account />
          ) : (
            <>
              <LocalHero />
              <AuthCard />
            </>
          )}
        </div>
        <div className="space-y-6">
          <Preferences />
          <VoiceSettings />
          <DataSection />
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ avatar --

function AvatarHero({ name, children }: { name: string; children?: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <Card className="flex flex-col items-center px-5 pt-7 pb-5 text-center">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Editar avatar"
        className="group relative rounded-full transition-transform duration-200 ease-ios active:scale-[0.97]"
      >
        <Avatar name={name} size={160} />
        <span
          aria-hidden
          className="bg-ios-blue border-card absolute right-1.5 bottom-1.5 flex h-10 w-10 items-center justify-center rounded-full border-[3px] text-white shadow-[0_4px_12px_rgb(0_0_0/0.18)] transition-transform group-hover:scale-105"
        >
          <Pencil size={17} />
        </span>
      </button>
      <div className="text-title-2 mt-4 max-w-full truncate">{name}</div>
      {children}
      <Button variant="tinted" size="sm" className="mt-4" onClick={() => setEditing(true)}>
        Editar avatar
      </Button>
      <AvatarEditor open={editing} onClose={() => setEditing(false)} name={name} />
    </Card>
  );
}

function LocalHero() {
  const local = useSettings((s) => s.name);
  return (
    <AvatarHero name={local || 'Learner'}>
      <div className="text-label-2 text-[14px]">Progreso guardado en este dispositivo</div>
    </AvatarHero>
  );
}

// ----------------------------------------------------------------- account --

function Account() {
  const { session, profile, signOut, joinClass } = useAuth();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const name = profile?.full_name || session?.user.email || 'Learner';

  return (
    <>
      <AvatarHero name={name}>
        <div className="text-label-2 truncate text-[14px]">{session?.user.email}</div>
        <div className="text-ink-green mt-1 inline-flex items-center gap-1 text-[13px] font-medium">
          <Cloud size={14} /> Progreso sincronizado
        </div>
      </AvatarHero>

      <ListGroup header="Clase">
        <ListRow
          leading={<IconTile icon={profile?.role === 'teacher' ? School : GraduationCap} color="var(--indigo)" />}
          title="Rol"
          trailing={profile?.role === 'teacher' ? 'Docente' : 'Estudiante'}
        />
        {profile?.role === 'teacher' && profile.class_code && (
          <ListRow leading={<IconTile icon={School} color="var(--orange)" />} title="Código de clase" trailing={<span className="font-mono font-bold tracking-widest">{profile.class_code}</span>} />
        )}
        {profile?.role === 'student' && (
          <ListRow
            leading={<IconTile icon={School} color="var(--orange)" />}
            title="Clase"
            trailing={profile.teacher_id ? 'Unido ✓' : 'Sin clase'}
          />
        )}
      </ListGroup>

      {profile?.role === 'student' && !profile.teacher_id && (
        <Card className="p-5">
          <h3 className="text-headline">Unirse a una clase</h3>
          <p className="text-label-2 mt-1 text-[14px]">Tu docente te da un código de 6 caracteres. Desbloquea el AI Coach y el IELTS con la clave de la clase.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const err = await joinClass(code);
              setMsg(err ?? '¡Te has unido a la clase!');
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="ABC123"
              className="bg-fill-2 h-11 flex-1 rounded-[12px] px-4 font-mono text-[16px] tracking-widest uppercase outline-none"
            />
            <Button type="submit" disabled={code.length < 4}>
              Unirme
            </Button>
          </form>
          {msg && <p className="text-label-2 mt-2 text-[14px]">{msg}</p>}
        </Card>
      )}

      <Button variant="destructive" size="lg" className="w-full" onClick={() => void signOut()}>
        <LogOut size={18} /> Cerrar sesión
      </Button>
    </>
  );
}

function AuthCard() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <Card className="p-6">
        <CloudOff className="text-label-3" size={36} />
        <h3 className="text-title-3 mt-3">Modo sin conexión</h3>
        <p className="text-label-2 mt-1 text-[15px]">
          Tu progreso se guarda en este navegador. Configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en Vercel para
          activar cuentas, sincronización y el AI Coach.
        </p>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const err = mode === 'in' ? await signIn(email, password) : await signUp({ email, password, fullName, role });
    setBusy(false);
    if (err === 'confirm') setMsg({ ok: true, text: 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.' });
    else if (err) setMsg({ ok: false, text: err });
  };

  const field = 'bg-fill-2 placeholder:text-label-3 h-12 w-full rounded-[12px] px-4 text-[16px] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]';

  return (
    <Card className="p-6">
      <div className="mb-5 text-center">
        <div className="text-[44px]">🏔️</div>
        <h3 className="text-title-2">{mode === 'in' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h3>
        <p className="text-label-2 mt-1 text-[15px]">Sincroniza tu progreso y usa el AI Coach. La misma cuenta sirve para el IELTS Simulator.</p>
      </div>
      <Segmented
        className="mb-5 w-full"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setMsg(null);
        }}
        options={[
          { value: 'in', label: 'Iniciar sesión' },
          { value: 'up', label: 'Registrarse' },
        ]}
      />
      <form onSubmit={submit} className="space-y-3">
        {mode === 'up' && (
          <input className={field} placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        )}
        <input className={field} type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input
          className={field}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        />
        {mode === 'up' && (
          <Segmented
            className="w-full"
            value={role}
            onChange={setRole}
            options={[
              { value: 'student', label: '🎓 Estudiante' },
              { value: 'teacher', label: '🧑‍🏫 Docente' },
            ]}
          />
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner className="h-5 w-5" /> : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </Button>
        {msg && <p className={msg.ok ? 'text-ink-green text-center text-[14px]' : 'text-ink-red text-center text-[14px]'}>{msg.text}</p>}
      </form>
    </Card>
  );
}

// ------------------------------------------------------------- preferences --

function Preferences() {
  const s = useSettings();
  const session = useAuth((st) => st.session);
  return (
    <>
      {!session && (
        <ListGroup header="Tu nombre">
          <div className="px-4 py-2">
            <input
              value={s.name}
              onChange={(e) => s.set({ name: e.target.value })}
              placeholder="¿Cómo te llamas?"
              className="placeholder:text-label-3 h-10 w-full bg-transparent text-[17px] outline-none"
            />
          </div>
        </ListGroup>
      )}
      <ListGroup header="Apariencia y aprendizaje" footer="Las pistas en español muestran traducciones en lecturas, diálogos y phrasal verbs.">
        <div className="flex items-center gap-3 px-4 py-2.5 shadow-[inset_0_-0.5px_0_var(--separator)]">
          <IconTile icon={Moon} color="var(--indigo)" />
          <span className="text-body flex-1">Tema</span>
          <Segmented<ThemePref>
            size="sm"
            value={s.theme}
            onChange={s.setTheme}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
          />
        </div>
        <ListRow
          leading={<IconTile icon={Languages} color="var(--green)" />}
          title="Pistas en español"
          trailing={<Toggle checked={s.spanishHints} onChange={(v) => s.set({ spanishHints: v })} label="Pistas en español" />}
        />
        <div className="flex items-center gap-3 px-4 py-2.5 shadow-[inset_0_-0.5px_0_var(--separator)]">
          <IconTile icon={Volume2} color="var(--blue)" />
          <span className="text-body flex-1">Acento</span>
          <Segmented
            size="sm"
            value={s.accent}
            onChange={(accent) => {
              // Keep the natural voice on the same accent (Ava ↔ Sonia, Andrew ↔ Ryan).
              const p = s.voicePersona ? defaultPersona() : null;
              const want = accent === 'en-GB' ? 'uk' : 'us';
              s.set(p && p.accent !== want ? { accent, voicePersona: personaFor(p.gender, want).id } : { accent });
            }}
            options={[
              { value: 'en-US', label: '🇺🇸 US' },
              { value: 'en-GB', label: '🇬🇧 UK' },
            ]}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <IconTile icon={Volume2} color="var(--teal)" />
          <span className="text-body flex-1">Velocidad de voz</span>
          <Segmented
            size="sm"
            value={String(s.speechRate)}
            onChange={(v) => s.set({ speechRate: Number(v) })}
            options={[
              { value: '0.75', label: 'Lenta' },
              { value: '0.95', label: 'Normal' },
              { value: '1.1', label: 'Rápida' },
            ]}
          />
        </div>
      </ListGroup>
    </>
  );
}

// ------------------------------------------------------------------- voice --

const ACCENT_TITLE: Record<VoiceAccent, string> = { us: '🇺🇸 Estados Unidos', uk: '🇬🇧 Reino Unido', au: '🇦🇺 Australia', ie: '🇮🇪 Irlanda' };

function VoiceSettings() {
  const s = useSettings();
  // Re-render when the session changes: it decides whether natural voices are available.
  useAuth((st) => st.session);
  const issue = edgeIssue();
  const current = defaultPersona();
  const natural = s.voiceEngine !== 'device';

  const engines = [
    { value: 'auto' as const, icon: Sparkles, color: 'var(--purple)', title: 'Voces naturales (recomendado)', subtitle: 'Frases, diálogos y lecturas con voces neuronales; palabras sueltas al instante' },
    { value: 'natural' as const, icon: Sparkles, color: 'var(--indigo)', title: 'Voces naturales para todo', subtitle: 'También las palabras sueltas (tardan un poco la primera vez)' },
    { value: 'device' as const, icon: Smartphone, color: '#8e8e93', title: 'Voz del dispositivo', subtitle: 'Sin conexión, la del navegador' },
  ];

  return (
    <ListGroup
      header="Voz"
      footer={
        natural && issue
          ? `${issue} Mientras tanto se usa la voz del dispositivo.`
          : 'Si la voz natural no está disponible (sin conexión o servicio caído), se usa la del dispositivo automáticamente. En diálogos y audios cada personaje tiene su propia voz.'
      }
    >
      {engines.map((e) => (
        <ListRow
          key={e.value}
          leading={<IconTile icon={e.icon} color={e.color} />}
          title={e.title}
          subtitle={e.subtitle}
          onClick={() => s.set({ voiceEngine: e.value })}
          trailing={s.voiceEngine === e.value ? <Check size={20} strokeWidth={2.6} className="text-ink-blue" aria-label="Seleccionada" /> : undefined}
        />
      ))}
      {natural && (
        <div className="space-y-3 p-3 shadow-[inset_0_0.5px_0_var(--separator)]">
          <p className="text-label-2 px-1 text-[13px]">Tu voz para leer en voz alta:</p>
          {(['us', 'uk', 'au', 'ie'] as const).map((a) => (
            <div key={a}>
              <div className="text-label-2 mb-1.5 px-1 text-[12px] font-semibold">{ACCENT_TITLE[a]}</div>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {PERSONAS.filter((p) => p.accent === a).map((p) => (
                  <PersonaCard
                    key={p.id}
                    p={p}
                    selected={p.id === current.id}
                    onSelect={() => s.set(p.accent === 'us' || p.accent === 'uk' ? { voicePersona: p.id, accent: p.accent === 'uk' ? 'en-GB' : 'en-US' } : { voicePersona: p.id })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ListGroup>
  );
}

function PersonaCard({ p, selected, onSelect }: { p: Persona; selected: boolean; onSelect: () => void }) {
  const rate = useSettings((st) => st.speechRate);
  const mine = useRef(-1);
  const now = useSyncExternalStore(subscribeSpeech, getSpeechState);
  const phase = now.id === mine.current ? now.phase : 'idle';
  const preview = () => {
    if (phase !== 'idle') return stopSpeaking();
    mine.current = speakAs(`Hi, I'm ${p.name}. Let's practise English together!`, { voice: p.gender, accent: p.accent, persona: p.id }, { rate, tier: 'premium' });
  };
  return (
    <div
      className={cn('relative flex items-center gap-2 rounded-[12px] p-2.5 transition-colors', !selected && 'bg-fill-2')}
      style={selected ? { background: tint('var(--blue)', 14), boxShadow: 'inset 0 0 0 2px var(--blue)' } : undefined}
    >
      <button type="button" onClick={onSelect} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="text-[22px] leading-none" aria-hidden>
          {p.flag}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold" style={selected ? { color: ink('var(--blue)') } : undefined}>
            {p.name}
          </span>
          <span className="text-label-2 block truncate text-[12px]">{p.blurb}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={preview}
        aria-label={phase === 'idle' ? `Escuchar a ${p.name}` : 'Detener'}
        className="bg-card text-ink-blue shadow-card flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      >
        {phase === 'loading' ? <Spinner className="h-4 w-4" /> : phase === 'playing' ? <Square size={12} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>
    </div>
  );
}

function DataSection() {
  const file = useRef<HTMLInputElement>(null);
  const replace = useProgress((s) => s.replace);
  const reset = useProgress((s) => s.reset);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ecyr-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <ListGroup header="Datos" footer="Exporta tu progreso como copia de seguridad o para llevarlo a otro dispositivo sin cuenta.">
      <ListRow leading={<IconTile icon={Download} color="var(--blue)" />} title="Exportar progreso" onClick={exportData} />
      <ListRow leading={<IconTile icon={Upload} color="var(--green)" />} title="Importar progreso" onClick={() => file.current?.click()} />
      <ListRow leading={<IconTile icon={FileUp} color="var(--indigo)" />} title="Importar y migrar" subtitle="Desde el IELTS Simulator original o un archivo" to="/import" chevron />
      <ListRow leading={<IconTile icon={FolderOpen} color="var(--teal)" />} title="Mis trabajos" subtitle="Sube escritos y trabajos ya realizados" to="/portfolio" chevron />
      <ListRow
        leading={<IconTile icon={RotateCcw} color="var(--red)" />}
        title={<span className="text-ink-red">Reiniciar progreso</span>}
        onClick={() => {
          if (confirm('¿Seguro? Se borrará todo tu progreso en este dispositivo.')) reset();
        }}
      />
      <input
        ref={file}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const data = JSON.parse(await f.text()) as ProgressData;
            if (typeof data.xp !== 'number' || typeof data.units !== 'object') throw new Error('invalid');
            replace(mergeProgress(snapshot(), data));
            alert('Progreso importado y combinado.');
          } catch {
            alert('El archivo no es un progreso válido de ECYR.');
          }
          e.target.value = '';
        }}
      />
    </ListGroup>
  );
}

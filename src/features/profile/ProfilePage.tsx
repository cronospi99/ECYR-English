import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  KeyRound,
  ChevronRight,
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
import { PERSONAS, defaultPersona, diagnoseTts, edgeIssue, personaFor, type Persona, type TtsDiagnosis, type VoiceAccent } from '@/lib/tts';
import { getSpeechState, speakAs, stopSpeaking, subscribeSpeech } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

export default function ProfilePage() {
  const session = useAuth((s) => s.session);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // ?next=/board/… — where a QR sent the student before asking them to sign in.
  const next = params.get('next') ?? '';
  const safeNext = /^\/(?!\/)/.test(next) ? next : '';
  useEffect(() => {
    if (session && safeNext) navigate(safeNext, { replace: true });
  }, [session, safeNext, navigate]);
  return (
    <Page title="Profile" subtitle="Your account, your class and your preferences.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {session ? (
            <Account />
          ) : (
            <>
              {safeNext ? (
                <Card className="p-5">
                  <h3 className="text-headline">📌 Sign in to continue</h3>
                  <p className="text-label-2 mt-1 text-[14px]">Inicia sesión o crea tu cuenta y te llevamos de vuelta al muro.</p>
                </Card>
              ) : (
                <LocalHero />
              )}
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
        aria-label="Edit avatar"
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
        Edit avatar
      </Button>
      <AvatarEditor open={editing} onClose={() => setEditing(false)} name={name} />
    </Card>
  );
}

function LocalHero() {
  const local = useSettings((s) => s.name);
  return (
    <AvatarHero name={local || 'Learner'}>
      <div className="text-label-2 text-[14px]">Progress saved on this device</div>
    </AvatarHero>
  );
}

// ----------------------------------------------------------------- account --

function Account() {
  const { session, profile, signOut, joinClass, becomeTeacher } = useAuth();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [invite, setInvite] = useState('');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const name = profile?.full_name || session?.user.email || 'Learner';

  return (
    <>
      <AvatarHero name={name}>
        <div className="text-label-2 truncate text-[14px]">{session?.user.email}</div>
        <div className="text-ink-green mt-1 inline-flex items-center gap-1 text-[13px] font-medium">
          <Cloud size={14} /> Progress synced
        </div>
      </AvatarHero>

      <ListGroup header="Class">
        <ListRow
          leading={<IconTile icon={profile?.role === 'teacher' ? School : GraduationCap} color="var(--indigo)" />}
          title="Role"
          trailing={profile?.role === 'teacher' ? 'Teacher' : 'Student'}
        />
        {profile?.role === 'teacher' && profile.class_code && (
          <ListRow leading={<IconTile icon={School} color="var(--orange)" />} title="Class code" trailing={<span className="font-mono font-bold tracking-widest">{profile.class_code}</span>} />
        )}
        {profile?.role === 'student' && (
          <ListRow
            leading={<IconTile icon={School} color="var(--orange)" />}
            title="Class"
            trailing={profile.teacher_id ? 'Joined ✓' : 'No class'}
          />
        )}
      </ListGroup>

      {profile?.is_admin && (
        <ListGroup header="Admin" footer="Only you can see it. Without one of your codes nobody can create a teacher account.">
          <ListRow to="/admin/teachers" leading={<IconTile icon={KeyRound} color="var(--purple)" />} title="Teacher codes" subtitle="Invite teachers and see who teaches" />
        </ListGroup>
      )}

      {profile?.role === 'student' && !profile.teacher_id && (
        <Card className="p-5">
          <h3 className="text-headline">Unirse a una clase</h3>
          <p className="text-label-2 mt-1 text-[14px]">Your teacher gives you a 6-character code. It unlocks the AI Coach and IELTS with the class key.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const err = await joinClass(code);
              setMsg(err ?? 'You’ve joined the class!');
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
              Join
            </Button>
          </form>
          {msg && <p className="text-label-2 mt-2 text-[14px]">{msg}</p>}
        </Card>
      )}

      {profile?.role === 'student' && !profile.teacher_id && (
        <details className="rounded-card bg-card shadow-card group p-5">
          <summary className="text-headline flex cursor-pointer list-none items-center gap-2">
            <School size={18} className="text-ink-indigo" /> Are you a teacher?
            <ChevronRight size={16} className="text-label-3 ml-auto transition-transform group-open:rotate-90" />
          </summary>
          <p className="text-label-2 mt-2 text-[14px]">
            {profile.is_admin ? 'As an admin, you can convert this account without a code.' : 'Enter the invitation code the admin gave you (DOC-XXXX-XXXX).'}
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const err = await becomeTeacher(invite);
              setInviteMsg(err ?? 'Done! Your account is now a teacher account.');
            }}
          >
            {!profile.is_admin && (
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value.toUpperCase())}
                maxLength={16}
                placeholder="DOC-XXXX-XXXX"
                aria-label="Teacher invitation code"
                className="bg-fill-2 h-11 min-w-0 flex-1 rounded-[12px] px-4 font-mono text-[16px] tracking-wider uppercase outline-none"
              />
            )}
            <Button type="submit" variant="tinted" disabled={!profile.is_admin && invite.replace(/[^A-Z0-9]/g, '').length < 8}>
              Convert to teacher
            </Button>
          </form>
          {inviteMsg && <p className="text-label-2 mt-2 text-[14px]">{inviteMsg}</p>}
        </details>
      )}

      <Button variant="destructive" size="lg" className="w-full" onClick={() => void signOut()}>
        <LogOut size={18} /> Sign out
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
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <Card className="p-6">
        <CloudOff className="text-label-3" size={36} />
        <h3 className="text-title-3 mt-3">Offline mode</h3>
        <p className="text-label-2 mt-1 text-[15px]">
          Your progress is saved in this browser. Configure <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> in Vercel to enable accounts, syncing and the AI Coach.
        </p>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const err = mode === 'in' ? await signIn(email, password) : await signUp({ email, password, fullName, role, inviteCode });
    setBusy(false);
    if (err === 'confirm') setMsg({ ok: true, text: 'Account created. Check your email to confirm it and then sign in.' });
    else if (err) setMsg({ ok: false, text: err });
  };

  const field = 'bg-fill-2 placeholder:text-label-3 h-12 w-full rounded-[12px] px-4 text-[16px] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]';

  return (
    <Card className="p-6">
      <div className="mb-5 text-center">
        <div className="text-[44px]">🏔️</div>
        <h3 className="text-title-2">{mode === 'in' ? 'Welcome back' : 'Create your account'}</h3>
        <p className="text-label-2 mt-1 text-[15px]">Sync your progress and use the AI Coach. The same account works for the IELTS Simulator.</p>
      </div>
      <Segmented
        className="mb-5 w-full"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setMsg(null);
        }}
        options={[
          { value: 'in', label: 'Sign in' },
          { value: 'up', label: 'Sign up' },
        ]}
      />
      <form onSubmit={submit} className="space-y-3">
        {mode === 'up' && (
          <input className={field} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        )}
        <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input
          className={field}
          type="password"
          placeholder="Password"
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
              { value: 'student', label: '🎓 Student' },
              { value: 'teacher', label: '🧑‍🏫 Teacher' },
            ]}
          />
        )}
        {mode === 'up' && role === 'teacher' && (
          <div>
            <input
              className={cn(field, 'font-mono tracking-wider uppercase')}
              placeholder="Invitation code (DOC-XXXX-XXXX)"
              aria-label="Teacher invitation code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              maxLength={16}
              autoComplete="off"
            />
            <p className="text-label-2 mt-1.5 px-1 text-[13px]">Teacher accounts are by invitation: ask the platform admin for your code.</p>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner className="h-5 w-5" /> : mode === 'in' ? 'Enter' : 'Create account'}
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
        <ListGroup header="Your name">
          <div className="px-4 py-2">
            <input
              value={s.name}
              onChange={(e) => s.set({ name: e.target.value })}
              placeholder="What’s your name?"
              className="placeholder:text-label-3 h-10 w-full bg-transparent text-[17px] outline-none"
            />
          </div>
        </ListGroup>
      )}
      <ListGroup header="Appearance and learning" footer="Spanish hints show translations in readings, dialogues and phrasal verbs.">
        <div className="flex items-center gap-3 px-4 py-2.5 shadow-[inset_0_-0.5px_0_var(--separator)]">
          <IconTile icon={Moon} color="var(--indigo)" />
          <span className="text-body flex-1">Theme</span>
          <Segmented<ThemePref>
            size="sm"
            value={s.theme}
            onChange={s.setTheme}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
        <ListRow
          leading={<IconTile icon={Languages} color="var(--green)" />}
          title="Spanish hints"
          trailing={<Toggle checked={s.spanishHints} onChange={(v) => s.set({ spanishHints: v })} label="Spanish hints" />}
        />
        <ListRow
          leading={<IconTile icon={Languages} color="var(--teal)" />}
          title="Always show Spanish help"
          subtitle="From the middle of B1 the Spanish explanations get shorter. Turn this on to keep them in full."
          trailing={<Toggle checked={s.esHelp === 'always'} onChange={(v) => s.set({ esHelp: v ? 'always' : 'auto' })} label="Always show Spanish help" />}
        />
        <div className="flex items-center gap-3 px-4 py-2.5 shadow-[inset_0_-0.5px_0_var(--separator)]">
          <IconTile icon={Volume2} color="var(--blue)" />
          <span className="text-body flex-1">Accent</span>
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
          <span className="text-body flex-1">Voice speed</span>
          <Segmented
            size="sm"
            value={String(s.speechRate)}
            onChange={(v) => s.set({ speechRate: Number(v) })}
            options={[
              { value: '0.75', label: 'Slow' },
              { value: '0.95', label: 'Normal' },
              { value: '1.1', label: 'Fast' },
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
    { value: 'auto' as const, icon: Sparkles, color: 'var(--purple)', title: 'Natural voices (recommended)', subtitle: 'Phrases, dialogues and readings with neural voices; single words instantly' },
    { value: 'natural' as const, icon: Sparkles, color: 'var(--indigo)', title: 'Natural voices for everything', subtitle: 'Single words too (they take a moment the first time)' },
    { value: 'device' as const, icon: Smartphone, color: '#8e8e93', title: 'Device voice', subtitle: 'Offline, the browser’s own' },
  ];

  return (
    <ListGroup
      header="Voice"
      footer={
        natural && issue
          ? `${issue} In the meantime the device voice is used.`
          : 'If the natural voice isn’t available (offline or service down), the device voice is used automatically. In dialogues and audios each character has their own voice.'
      }
    >
      {engines.map((e) => (
        <ListRow
          key={e.value}
          leading={<IconTile icon={e.icon} color={e.color} />}
          title={e.title}
          subtitle={e.subtitle}
          onClick={() => s.set({ voiceEngine: e.value })}
          trailing={s.voiceEngine === e.value ? <Check size={20} strokeWidth={2.6} className="text-ink-blue" aria-label="Selected" /> : undefined}
        />
      ))}
      {natural && <VoiceCheck />}
      {natural && (
        <div className="space-y-3 p-3 shadow-[inset_0_0.5px_0_var(--separator)]">
          <p className="text-label-2 px-1 text-[13px]">Your voice for reading aloud:</p>
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

/** "Probar voces naturales": runs the whole path once and says, in Spanish, where it fails. */
function VoiceCheck() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<TtsDiagnosis | null>(null);
  const run = async () => {
    setBusy(true);
    setRes(null);
    const r = await diagnoseTts().catch((e: unknown) => ({ ok: false, step: 'app', message: String(e) }) as TtsDiagnosis);
    setRes(r);
    setBusy(false);
    if (r.url) void new Audio(r.url).play().catch(() => undefined);
  };
  return (
    <div className="px-4 py-3 shadow-[inset_0_0.5px_0_var(--separator)]">
      <Button size="sm" variant="tinted" onClick={() => void run()} disabled={busy}>
        {busy ? <Spinner className="h-4 w-4" /> : <Sparkles size={15} />} Try natural voices
      </Button>
      {res && (
        <p className={cn('mt-2 text-[14px] text-pretty', res.ok ? 'text-ink-green' : 'text-ink-red')} role="status">
          {res.ok ? '✅ ' : '⚠️ '}
          {res.message}
          {!res.ok && (
            <span className="text-label-2 mt-1 block font-mono text-[12px]">
              paso: {res.step}
              {res.code ? ` · code: ${res.code}` : ''}
              {res.status ? ` · HTTP ${res.status}` : ''}
            </span>
          )}
        </p>
      )}
    </div>
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
        aria-label={phase === 'idle' ? `Escuchar a ${p.name}` : 'Stop'}
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
    <ListGroup header="Data" footer="Export your progress as a backup or to take it to another device without an account.">
      <ListRow leading={<IconTile icon={Download} color="var(--blue)" />} title="Export progress" onClick={exportData} />
      <ListRow leading={<IconTile icon={Upload} color="var(--green)" />} title="Import progress" onClick={() => file.current?.click()} />
      <ListRow leading={<IconTile icon={FileUp} color="var(--indigo)" />} title="Import and migrate" subtitle="From the original IELTS Simulator or a file" to="/import" chevron />
      <ListRow leading={<IconTile icon={FolderOpen} color="var(--teal)" />} title="My work" subtitle="Upload writing and work you’ve already done" to="/portfolio" chevron />
      <ListRow
        leading={<IconTile icon={RotateCcw} color="var(--red)" />}
        title={<span className="text-ink-red">Reset progress</span>}
        onClick={() => {
          if (confirm('Sure? All your progress on this device will be erased.')) reset();
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
            alert('Progress imported and merged.');
          } catch {
            alert('The file is not a valid ECYR progress file.');
          }
          e.target.value = '';
        }}
      />
    </ListGroup>
  );
}

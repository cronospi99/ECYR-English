import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRightLeft,
  Award,
  BookOpen,
  Briefcase,
  CircleCheck,
  CircleDashed,
  CircleX,
  ClipboardList,
  CloudOff,
  Eye,
  EyeOff,
  FileBraces,
  FileUp,
  Headphones,
  History,
  Info,
  KeyRound,
  LogIn,
  MessageSquare,
  Mic,
  PenLine,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { ListGroup, ListRow } from '@/components/ui/List';
import { Spinner } from '@/components/ui/Misc';
import { useAuth } from '@/store/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import {
  connectOldIelts,
  importEcyrProgress,
  importIeltsSession,
  listMigrations,
  migrateOldIelts,
  oldIeltsIsSameProject,
  parseEcyrProgressFile,
  parseIeltsSessionFile,
  readJsonFile,
  type EcyrImportResult,
  type EcyrProgressFile,
  type IeltsScores,
  type IeltsSessionData,
  type IeltsSessionSummary,
  type MigrateResult,
  type MigrateStepId,
  type MigrationLogRow,
  type OldIeltsCounts,
  type OldIeltsDump,
  type SessionImportResult,
  type StepStatus,
} from '@/lib/migrate';
import { ink } from '@/lib/color';

const field =
  'bg-fill-2 placeholder:text-label-3 h-12 w-full rounded-[12px] px-4 text-[16px] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]';

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ImportPage() {
  const [refresh, setRefresh] = useState(0);
  const bump = useCallback(() => setRefresh((n) => n + 1), []);
  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <ArrowRightLeft size={15} className="text-ink-indigo" /> Tu historial, en un solo sitio
        </span>
      }
      title="Importar y migrar"
      subtitle="Trae lo que ya hiciste antes —en el IELTS Simulator o en otro dispositivo— y se mostrará como tu propio progreso."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <AccountCard onDone={bump} />
          <PortfolioCard />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <SessionFileCard onDone={bump} />
          <EcyrFileCard onDone={bump} />
          <HistoryList refresh={refresh} />
        </div>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------- pieces ---

function CardTitle({ icon, color, title, subtitle }: { icon: LucideIcon; color: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <IconTile icon={icon} color={color} size={40} />
      <div className="min-w-0">
        <h2 className="text-headline">{title}</h2>
        {subtitle && <p className="text-subhead text-label-2 mt-0.5 text-pretty">{subtitle}</p>}
      </div>
    </div>
  );
}

function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode }) {
  const color = { info: 'var(--blue)', warn: 'var(--orange)', error: 'var(--red)', ok: 'var(--green)' }[tone];
  const Icon = { info: Info, warn: TriangleAlert, error: CircleX, ok: CircleCheck }[tone];
  return (
    <div
      className="text-subhead flex gap-2.5 rounded-[12px] px-3.5 py-3"
      style={{ background: `color-mix(in srgb, ${color} 11%, transparent)` }}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <Icon size={18} className="mt-px shrink-0" style={{ color: ink(color) }} />
      <div className="min-w-0 text-pretty">{children}</div>
    </div>
  );
}

function Stat({ icon, color, label, value }: { icon: LucideIcon; color: string; label: string; value: ReactNode }) {
  return (
    <div className="bg-fill-2 flex min-w-0 items-center gap-2.5 rounded-[12px] px-3 py-2.5">
      <IconTile icon={icon} color={color} size={28} soft />
      <div className="min-w-0">
        <div className="text-headline tabular-nums">{value}</div>
        <div className="text-caption text-label-2 text-pretty">{label}</div>
      </div>
    </div>
  );
}

const MOD_LABEL: Record<keyof IeltsScores, string> = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };
const MOD_COLOR: Record<keyof IeltsScores, string> = {
  listening: 'var(--skill-listening)',
  reading: 'var(--skill-reading)',
  writing: 'var(--skill-writing)',
  speaking: 'var(--skill-speaking)',
};

function Bands({ scores }: { scores: IeltsScores }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {(Object.keys(MOD_LABEL) as (keyof IeltsScores)[]).map((m) => (
        <div key={m} className="bg-fill-2 rounded-[12px] px-2 py-2 text-center">
          <div className="text-title-3 tabular-nums" style={{ color: scores[m] == null ? 'var(--label-3)' : MOD_COLOR[m] }}>
            {scores[m] ?? '—'}
          </div>
          <div className="text-caption text-label-2 truncate">{MOD_LABEL[m]}</div>
        </div>
      ))}
    </div>
  );
}

/** File picker + drag & drop zone. */
function DropZone({ label, hint, onFile, busy }: { label: string; hint: string; onFile: (f: File) => void; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed px-4 py-6 text-center transition-colors',
        over ? 'border-ios-blue bg-[color-mix(in_srgb,var(--blue)_8%,transparent)]' : 'border-separator hover:bg-fill-2/60',
      )}
    >
      {busy ? <Spinner className="text-label-2 h-6 w-6" /> : <FileUp size={26} className="text-ink-blue" />}
      <span className="text-callout font-semibold">{label}</span>
      <span className="text-footnote text-label-2">{hint}</span>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function SignInPrompt({ text }: { text: string }) {
  return (
    <div className="bg-fill-2 flex flex-col items-start gap-3 rounded-[14px] p-4 sm:flex-row sm:items-center">
      <p className="text-subhead text-label-2 flex-1">{text}</p>
      <ButtonLink to="/profile" size="sm">
        <LogIn size={16} /> Iniciar sesión
      </ButtonLink>
    </div>
  );
}

// ------------------------------------------------------- 1. old account ----

const STEPS: { id: MigrateStepId; label: string }[] = [
  { id: 'prepare', label: 'Revisando tu cuenta nueva' },
  { id: 'progress', label: 'Bandas e historial' },
  { id: 'submissions', label: 'Writings y speakings corregidos' },
  { id: 'profile', label: 'Nombre del perfil' },
  { id: 'log', label: 'Comentarios, tareas y registro' },
  { id: 'local', label: 'Simulador y XP en este dispositivo' },
];

function StepIcon({ s }: { s?: StepStatus }) {
  if (s === 'running') return <Spinner className="text-ink-blue h-5 w-5" />;
  if (s === 'done') return <CircleCheck size={20} className="text-ink-green" />;
  if (s === 'error') return <CircleX size={20} className="text-ink-red" />;
  if (s === 'skipped') return <CircleDashed size={20} className="text-label-3" />;
  return <CircleDashed size={20} className="text-label-3 opacity-50" />;
}

function AccountCard({ onDone }: { onDone: () => void }) {
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<'form' | 'connecting' | 'preview' | 'migrating' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  const [dump, setDump] = useState<{ dump: OldIeltsDump; counts: OldIeltsCounts } | null>(null);
  const [steps, setSteps] = useState<Partial<Record<MigrateStepId, { s: StepStatus; note?: string }>>>({});
  const [result, setResult] = useState<MigrateResult | null>(null);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhase('connecting');
    const r = await connectOldIelts(email, password);
    setPassword('');
    if (!r.ok) {
      setError(r.error);
      setPhase('form');
      return;
    }
    setDump({ dump: r.dump, counts: r.counts });
    setPhase('preview');
  };

  const migrate = async () => {
    if (!dump) return;
    setPhase('migrating');
    setSteps({});
    const r = await migrateOldIelts(dump.dump, (id, s, note) => setSteps((prev) => ({ ...prev, [id]: { s, note } })));
    setResult(r);
    if (!r.ok) {
      setError(r.error ?? 'No se pudo completar la migración.');
      setPhase('preview');
      return;
    }
    setPhase('done');
    onDone();
  };

  const reset = () => {
    setDump(null);
    setResult(null);
    setSteps({});
    setError(null);
    setPhase('form');
  };

  return (
    <Card className="flex min-w-0 flex-col gap-4 p-5">
      <CardTitle
        icon={Award}
        color="var(--indigo)"
        title="Migrar desde IELTS Simulator (cuenta)"
        subtitle="Si usabas el IELTS Simulator con tu propia cuenta, trae todo a ECYR English en dos pasos."
      />

      {phase === 'form' || phase === 'connecting' ? (
        <>
          <ul className="text-subhead text-label-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {[
              [Trophy, 'Tus bandas por módulo'],
              [History, 'El historial de intentos'],
              [PenLine, 'Writings y speakings corregidos'],
              [MessageSquare, 'Comentarios del docente'],
              [ClipboardList, 'Tareas asignadas'],
              [Sparkles, 'XP por cada intento'],
            ].map(([Icon, t]) => {
              const I = Icon as LucideIcon;
              return (
                <li key={t as string} className="flex items-center gap-2">
                  <I size={16} className="text-ink-indigo shrink-0" /> {t as string}
                </li>
              );
            })}
          </ul>

          {!isSupabaseConfigured ? (
            <Notice tone="warn">Las cuentas no están configuradas en este despliegue, así que no se puede migrar una cuenta.</Notice>
          ) : !session ? (
            <SignInPrompt text="Primero inicia sesión (o crea tu cuenta) en ECYR English: ahí es donde guardaremos lo que traigas." />
          ) : (
            <form className="flex flex-col gap-2.5" onSubmit={connect} autoComplete="off">
              <div className="text-footnote text-label-2 px-1 font-semibold uppercase tracking-wide">Paso 1 · Tu cuenta del IELTS Simulator</div>
              <input
                className={field}
                type="email"
                placeholder="Correo de esa cuenta"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                name="old-ielts-email"
              />
              <div className="relative">
                <input
                  className={cn(field, 'pr-12')}
                  type={show ? 'text' : 'password'}
                  placeholder="Contraseña de esa cuenta"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  name="old-ielts-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="text-label-2 absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 hover:opacity-70"
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <Notice tone="error">{error}</Notice>}
              <Button type="submit" size="lg" disabled={phase === 'connecting' || !email || !password}>
                {phase === 'connecting' ? <Spinner className="h-5 w-5" /> : <KeyRound size={18} />}
                {phase === 'connecting' ? 'Conectando…' : 'Conectar y ver qué hay'}
              </Button>
              <p className="text-footnote text-label-2 flex gap-1.5 px-1">
                <ShieldCheck size={15} className="text-ink-green mt-px shrink-0" />
                Sólo leemos tus propios datos y cerramos esa sesión al terminar. Tu contraseña no se guarda y tu sesión de ECYR no cambia.
              </p>
              <p className="text-footnote text-label-2 px-1">
                ¿Entrabas con Google? Esas cuentas no tienen contraseña: usa el <b>archivo de sesión</b> (a la derecha) o crea una contraseña en la app original con
                «¿Olvidaste tu contraseña?» y vuelve aquí.
              </p>
            </form>
          )}
        </>
      ) : null}

      {(phase === 'preview' || phase === 'migrating' || phase === 'done') && dump && (
        <OldPreview dump={dump.dump} counts={dump.counts} newRole={profile?.role ?? null} />
      )}

      {phase === 'preview' && dump && (
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="text-footnote text-label-2 px-1 font-semibold uppercase tracking-wide">Paso 2 · Pasarlo a tu cuenta</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" onClick={() => void migrate()}>
              <ArrowRightLeft size={18} /> Migrar todo
            </Button>
            <Button size="lg" variant="gray" onClick={reset}>
              Cancelar
            </Button>
          </div>
          <p className="text-footnote text-label-2 px-1">Puedes repetirlo cuando quieras: lo que ya esté aquí no se duplica.</p>
        </>
      )}

      {(phase === 'migrating' || phase === 'done') && (
        <ol className="bg-fill-2 flex flex-col gap-2.5 rounded-[14px] p-3.5" aria-live="polite">
          {STEPS.map((st) => (
            <li key={st.id} className="flex items-center gap-2.5">
              <StepIcon s={steps[st.id]?.s} />
              <span className="text-subhead flex-1">{st.label}</span>
              {steps[st.id]?.note && <span className="text-footnote text-label-2 text-right">{steps[st.id]!.note}</span>}
            </li>
          ))}
        </ol>
      )}

      {phase === 'done' && result && (
        <>
          <Notice tone="ok">
            {result.alreadyDone ? (
              'Ya estaba todo migrado: no había nada nuevo que copiar.'
            ) : (
              <>
                ¡Listo! {result.historyAdded} intentos nuevos en tu historial, {result.submissionsInserted} trabajos corregidos copiados
                {result.submissionsSkipped ? ` (${result.submissionsSkipped} ya estaban)` : ''}, {result.feedback} comentarios y {result.homework} tareas guardados
                {result.xpAwarded ? ` y +${result.xpAwarded} XP` : ''}.{result.nameSet ? ' También pusimos tu nombre en el perfil.' : ''}
              </>
            )}
          </Notice>
          <Bands scores={result.scores} />
          {result.warnings.map((w) => (
            <Notice key={w} tone="warn">
              {w}
            </Notice>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink to="/ielts/progress" className="sm:flex-1">
              <Award size={18} /> Ver progreso IELTS
            </ButtonLink>
            <ButtonLink to="/progress" variant="tinted" className="sm:flex-1">
              <Trophy size={18} /> Mi progreso
            </ButtonLink>
          </div>
          <Button variant="plain" size="sm" className="self-center" onClick={reset}>
            Migrar otra cuenta
          </Button>
        </>
      )}
    </Card>
  );
}

function OldPreview({ dump, counts, newRole }: { dump: OldIeltsDump; counts: OldIeltsCounts; newRole: 'student' | 'teacher' | null }) {
  const name = dump.profile?.full_name?.trim() || dump.source.email || 'Sin nombre';
  const role = dump.profile?.role === 'teacher' ? 'Docente' : 'Estudiante';
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-fill-2 flex items-center gap-3 rounded-[14px] p-3">
        <span className="bg-ios-indigo flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] font-bold text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-headline truncate">{name}</div>
          <div className="text-footnote text-label-2 truncate">
            {role} · {dump.source.email ?? '—'}
            {dump.profile?.created_at ? ` · desde ${fmtDate(dump.profile.created_at)}` : ''}
          </div>
        </div>
      </div>
      <Bands scores={dump.progress.scores} />
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={History} color="var(--orange)" label="Intentos en el historial" value={counts.history} />
        <Stat icon={PenLine} color="var(--skill-writing)" label="Writings corregidos" value={counts.writing} />
        <Stat icon={Mic} color="var(--skill-speaking)" label="Speakings corregidos" value={counts.speaking} />
        <Stat
          icon={BookOpen}
          color="var(--skill-reading)"
          label="Hojas de Reading / Listening"
          value={
            <span className="inline-flex items-center gap-1">
              {counts.reading + counts.listening}
              <Headphones size={13} className="text-label-3" />
            </span>
          }
        />
        <Stat icon={MessageSquare} color="var(--teal)" label="Comentarios del docente" value={counts.feedback} />
        <Stat icon={ClipboardList} color="var(--pink)" label="Tareas" value={counts.homework} />
      </div>
      {oldIeltsIsSameProject() && (
        <Notice>ECYR English usa la misma base de datos que el IELTS Simulator: si es la misma cuenta, tu progreso ya está aquí.</Notice>
      )}
      {newRole === 'teacher' && dump.profile?.role !== 'teacher' && (
        <Notice tone="warn">Tu cuenta de ECYR es de docente: el simulador sólo muestra bandas e historial en cuentas de estudiante.</Notice>
      )}
      {dump.warnings.map((w) => (
        <Notice key={w} tone="warn">
          {w}
        </Notice>
      ))}
    </div>
  );
}

// ------------------------------------------------------- 2. session file ---

function SessionFileCard({ onDone }: { onDone: () => void }) {
  const session = useAuth((s) => s.session);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; data: IeltsSessionData; summary: IeltsSessionSummary } | null>(null);
  const [result, setResult] = useState<SessionImportResult | null>(null);

  const pick = async (f: File) => {
    setError(null);
    setResult(null);
    setBusy(true);
    const raw = await readJsonFile(f);
    const parsed = raw.ok ? parseIeltsSessionFile(raw.value) : raw;
    setBusy(false);
    if (!parsed.ok) {
      setFile(null);
      setError(parsed.error);
      return;
    }
    setFile({ name: f.name, data: parsed.data, summary: parsed.summary });
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    const r = await importIeltsSession(file.data, file.summary);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? 'No se pudo importar la sesión.');
    setResult(r);
    setFile(null);
    onDone();
  };

  const s = file?.summary;
  return (
    <Card className="flex min-w-0 flex-col gap-4 p-5">
      <CardTitle
        icon={FileBraces}
        color="var(--orange)"
        title="Archivo de sesión del IELTS Simulator"
        subtitle="El .json que guardaste con «Sesión → Guardar archivo»: borradores, transcripciones, informes y exámenes generados."
      />
      {!file && !result && <DropZone label="Elegir archivo .json" hint="o arrástralo aquí · máx. 15 MB" onFile={(f) => void pick(f)} busy={busy} />}
      {error && <Notice tone="error">{error}</Notice>}

      {file && s && (
        <div className="flex flex-col gap-3">
          <div className="text-footnote text-label-2 truncate px-1">
            {file.name} · guardado el {fmtDate(s.exportedAt)}
            {s.candNo ? ` · candidato ${s.candNo}` : ''}
          </div>
          <Bands scores={s.scores} />
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={History} color="var(--orange)" label="Intentos en el historial" value={s.history} />
            <Stat icon={PenLine} color="var(--skill-writing)" label={`Borradores (${s.writingWords} pal.)`} value={s.writingDrafts} />
            <Stat icon={Award} color="var(--indigo)" label="Informes de Writing" value={s.writingReports} />
            <Stat icon={Mic} color="var(--skill-speaking)" label="Transcripciones" value={s.speakingTranscripts} />
            <Stat
              icon={Sparkles}
              color="var(--pink)"
              label="Exámenes generados"
              value={s.generated.listeningParts + s.generated.readingPassages + (s.generated.writing ? 1 : 0) + (s.generated.speaking ? 1 : 0)}
            />
            <Stat icon={BookOpen} color="var(--teal)" label="Palabras guardadas" value={s.savedWords} />
          </div>
          {!session && <Notice>Sin sesión iniciada se importa sólo en este navegador. Inicia sesión para guardarlo también en tu cuenta.</Notice>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" disabled={busy} onClick={() => void run()}>
              {busy ? <Spinner className="h-5 w-5" /> : <FileUp size={18} />} Importar sesión
            </Button>
            <Button size="lg" variant="gray" disabled={busy} onClick={() => setFile(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {result && (
        <>
          <Notice tone="ok">
            Sesión importada: {result.historyAdded} intentos nuevos{result.xpAwarded ? ` y +${result.xpAwarded} XP` : ''}.{' '}
            {result.session === 'applied'
              ? 'El simulador ya la tiene cargada.'
              : result.session === 'queued'
                ? 'Tus borradores e informes aparecerán la próxima vez que abras el simulador.'
                : ''}
            {result.synced ? ' Guardado también en tu cuenta.' : ''}
          </Notice>
          {result.dropped.length > 0 && <Notice tone="warn">No cabía todo en este navegador; se omitieron: {result.dropped.join(', ')}.</Notice>}
          {result.warnings.map((w) => (
            <Notice key={w} tone="warn">
              {w}
            </Notice>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink to="/ielts" className="sm:flex-1">
              <Award size={18} /> Abrir el simulador
            </ButtonLink>
            <Button variant="gray" onClick={() => setResult(null)}>
              Importar otro
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

// ------------------------------------------------------ 3. ECYR progress ---

function EcyrFileCard({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; data: EcyrProgressFile } | null>(null);
  const [result, setResult] = useState<EcyrImportResult | null>(null);

  const pick = async (f: File) => {
    setError(null);
    setResult(null);
    setBusy(true);
    const raw = await readJsonFile(f);
    const parsed = raw.ok ? parseEcyrProgressFile(raw.value) : raw;
    setBusy(false);
    if (!parsed.ok) {
      setFile(null);
      setError(parsed.error);
      return;
    }
    setFile({ name: f.name, data: parsed.file });
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    const r = await importEcyrProgress(file.data);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? 'No se pudo combinar el progreso.');
    setResult(r);
    setFile(null);
    onDone();
  };

  const s = file?.data.summary;
  return (
    <Card className="flex min-w-0 flex-col gap-4 p-5">
      <CardTitle
        icon={Trophy}
        color="var(--green)"
        title="Progreso de ECYR English (.json)"
        subtitle="La copia que exportaste desde Perfil → Datos. Se combina con lo que ya tienes; nunca lo reemplaza."
      />
      {!file && !result && <DropZone label="Elegir progreso .json" hint="ecyr-progreso-AAAA-MM-DD.json" onFile={(f) => void pick(f)} busy={busy} />}
      {error && <Notice tone="error">{error}</Notice>}
      {file && s && (
        <div className="flex flex-col gap-3">
          <div className="text-footnote text-label-2 truncate px-1">
            {file.name} · actualizado el {fmtDate(s.updatedAt)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Sparkles} color="var(--yellow)" label="XP" value={s.xp.toLocaleString('es')} />
            <Stat icon={BookOpen} color="var(--blue)" label="Unidades completadas" value={s.units} />
            <Stat icon={History} color="var(--orange)" label="Actividades" value={s.activity} />
            <Stat icon={Trophy} color="var(--red)" label="Mejor racha (días)" value={s.streakBest} />
          </div>
          {(s.hasPlan || s.hasAvatar) && (
            <p className="text-footnote text-label-2 px-1">
              Incluye {[s.hasPlan && 'plan de estudio', s.hasAvatar && 'avatar'].filter(Boolean).join(' y ')} (se aplica sólo si es más reciente que el tuyo).
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" disabled={busy} onClick={() => void run()}>
              {busy ? <Spinner className="h-5 w-5" /> : <ArrowRightLeft size={18} />} Combinar con mi progreso
            </Button>
            <Button size="lg" variant="gray" disabled={busy} onClick={() => setFile(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {result && (
        <>
          <Notice tone="ok">
            Progreso combinado: tenías {result.xpBefore.toLocaleString('es')} XP y ahora {result.xpAfter.toLocaleString('es')} XP.
            {result.planApplied ? ' Plan de estudio actualizado.' : ''}
            {result.avatarApplied ? ' Avatar actualizado.' : ''}
          </Notice>
          {result.warnings.map((w) => (
            <Notice key={w} tone="warn">
              {w}
            </Notice>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink to="/progress" className="sm:flex-1">
              <Trophy size={18} /> Ver mi progreso
            </ButtonLink>
            <Button variant="gray" onClick={() => setResult(null)}>
              Importar otro
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

// ------------------------------------------------------------ 4. portfolio ---

function PortfolioCard() {
  return (
    <ListGroup header="Trabajos ya realizados" footer="Sube redacciones, audios o proyectos que hiciste fuera de la plataforma para tenerlos junto a tu progreso.">
      <ListRow leading={<IconTile icon={Briefcase} color="var(--purple)" />} title="Mis trabajos" subtitle="Tu portafolio de trabajos" to="/portfolio" />
    </ListGroup>
  );
}

// -------------------------------------------------------------- 5. history ---

const SOURCE_META: Record<MigrationLogRow['source'], { label: string; icon: LucideIcon; color: string }> = {
  'ielts-account': { label: 'Cuenta del IELTS Simulator', icon: Award, color: 'var(--indigo)' },
  'ielts-session-file': { label: 'Archivo de sesión del IELTS', icon: FileBraces, color: 'var(--orange)' },
  'ecyr-progress-file': { label: 'Progreso de ECYR English', icon: Trophy, color: 'var(--green)' },
};

function describeCounts(row: MigrationLogRow) {
  const c = row.counts ?? {};
  const parts: string[] = [];
  if (row.source === 'ecyr-progress-file') {
    if (c.xp != null) parts.push(`${c.xp} XP`);
    if (c.units != null) parts.push(`${c.units} unidades`);
    if (c.activity != null) parts.push(`${c.activity} actividades`);
  } else {
    if (c.historyAdded != null) parts.push(`${c.historyAdded} intentos`);
    if (c.submissions) parts.push(`${c.submissions} trabajos`);
    if (c.feedback) parts.push(`${c.feedback} comentarios`);
    if (c.homework) parts.push(`${c.homework} tareas`);
    if (c.xp) parts.push(`+${c.xp} XP`);
  }
  return parts.join(' · ') || 'Sin cambios';
}

function HistoryList({ refresh }: { refresh: number }) {
  const session = useAuth((s) => s.session);
  const [state, setState] = useState<{ loading: boolean; rows: MigrationLogRow[]; error: string | null; missing: boolean }>({
    loading: false,
    rows: [],
    error: null,
    missing: false,
  });

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    void listMigrations().then((r) => alive && setState({ loading: false, ...r }));
    return () => {
      alive = false;
    };
  }, [session, refresh]);

  if (!isSupabaseConfigured)
    return (
      <ListGroup header="Migraciones anteriores">
        <ListRow leading={<IconTile icon={CloudOff} color="var(--label-3)" />} title="Sin conexión" subtitle="El historial se guarda en tu cuenta." />
      </ListGroup>
    );
  if (!session)
    return (
      <ListGroup header="Migraciones anteriores">
        <ListRow leading={<IconTile icon={History} color="var(--label-3)" />} title="Inicia sesión para ver tu historial" to="/profile" />
      </ListGroup>
    );

  return (
    <ListGroup header="Migraciones anteriores" footer={state.missing ? 'El servidor aún no tiene la tabla migrations_log (08_migrations_log.sql).' : undefined}>
      {state.loading && !state.rows.length ? (
        <ListRow leading={<Spinner className="text-label-2" />} title="Cargando…" />
      ) : state.rows.length ? (
        state.rows.map((r) => {
          const m = SOURCE_META[r.source] ?? SOURCE_META['ielts-account'];
          return (
            <ListRow
              key={r.id}
              leading={<IconTile icon={m.icon} color={m.color} />}
              title={r.label || m.label}
              subtitle={`${fmtDateTime(r.created_at)} · ${describeCounts(r)}`}
            />
          );
        })
      ) : (
        <ListRow
          leading={<IconTile icon={History} color="var(--label-3)" />}
          title={state.error && !state.missing ? 'No se pudo cargar' : 'Aún no has importado nada'}
          subtitle={state.error && !state.missing ? state.error : undefined}
        />
      )}
    </ListGroup>
  );
}

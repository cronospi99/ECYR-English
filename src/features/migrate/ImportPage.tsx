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
  iso ? new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ImportPage() {
  const [refresh, setRefresh] = useState(0);
  const bump = useCallback(() => setRefresh((n) => n + 1), []);
  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <ArrowRightLeft size={15} className="text-ink-indigo" /> Your history, in one place
        </span>
      }
      title="Import and migrate"
      subtitle="Bring what you did before — in the IELTS Simulator or on another device — and it will show as your own progress."
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
        <LogIn size={16} /> Sign in
      </ButtonLink>
    </div>
  );
}

// ------------------------------------------------------- 1. old account ----

const STEPS: { id: MigrateStepId; label: string }[] = [
  { id: 'prepare', label: 'Checking your new account' },
  { id: 'progress', label: 'Bands and history' },
  { id: 'submissions', label: 'Corrected writings and speakings' },
  { id: 'profile', label: 'Profile name' },
  { id: 'log', label: 'Comments, tasks and log' },
  { id: 'local', label: 'Simulator and XP on this device' },
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
      setError(r.error ?? 'The migration could not be completed.');
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
        title="Migrate from IELTS Simulator (account)"
        subtitle="If you used the IELTS Simulator with your own account, bring everything to ECYR English in two steps."
      />

      {phase === 'form' || phase === 'connecting' ? (
        <>
          <ul className="text-subhead text-label-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {[
              [Trophy, 'Your bands per module'],
              [History, 'Attempt history'],
              [PenLine, 'Corrected writings and speakings'],
              [MessageSquare, 'Teacher comments'],
              [ClipboardList, 'Assigned tasks'],
              [Sparkles, 'XP for each attempt'],
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
            <Notice tone="warn">Accounts are not configured in this deployment, so an account cannot be migrated.</Notice>
          ) : !session ? (
            <SignInPrompt text="First sign in (or create your account) in ECYR English: that is where we will save what you bring." />
          ) : (
            <form className="flex flex-col gap-2.5" onSubmit={connect} autoComplete="off">
              <div className="text-footnote text-label-2 px-1 font-semibold uppercase tracking-wide">Step 1 · Your IELTS Simulator account</div>
              <input
                className={field}
                type="email"
                placeholder="Email of that account"
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
                  placeholder="That account’s password"
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
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <Notice tone="error">{error}</Notice>}
              <Button type="submit" size="lg" disabled={phase === 'connecting' || !email || !password}>
                {phase === 'connecting' ? <Spinner className="h-5 w-5" /> : <KeyRound size={18} />}
                {phase === 'connecting' ? 'Connecting…' : 'Connect and see what’s there'}
              </Button>
              <p className="text-footnote text-label-2 flex gap-1.5 px-1">
                <ShieldCheck size={15} className="text-ink-green mt-px shrink-0" />
                We only read your own data and close that session when done. Your password is not stored and your ECYR session does not change.
              </p>
              <p className="text-footnote text-label-2 px-1">
                Did you sign in with Google? Those accounts have no password: use the <b>session file</b> (on the right) or create a password in the original app with “Forgot your password?” and come back here.
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
          <div className="text-footnote text-label-2 px-1 font-semibold uppercase tracking-wide">Step 2 · Move it to your account</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" onClick={() => void migrate()}>
              <ArrowRightLeft size={18} /> Migrate everything
            </Button>
            <Button size="lg" variant="gray" onClick={reset}>
              Cancel
            </Button>
          </div>
          <p className="text-footnote text-label-2 px-1">You can repeat it whenever you like: what is already here is not duplicated.</p>
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
              'Everything was already migrated: there was nothing new to copy.'
            ) : (
              <>
                Done! {result.historyAdded} new attempts in your history, {result.submissionsInserted} corrected works copied {result.submissionsSkipped ? ` (${result.submissionsSkipped} were already there)` : ''}, {result.feedback} comments and {result.homework} tasks saved {result.xpAwarded ? ` and +${result.xpAwarded} XP` : ''}.{result.nameSet ? ' We also set your name in your profile.' : ''} </>
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
              <Award size={18} /> See IELTS progress
            </ButtonLink>
            <ButtonLink to="/progress" variant="tinted" className="sm:flex-1">
              <Trophy size={18} /> My progress
            </ButtonLink>
          </div>
          <Button variant="plain" size="sm" className="self-center" onClick={reset}>
            Migrate another account
          </Button>
        </>
      )}
    </Card>
  );
}

function OldPreview({ dump, counts, newRole }: { dump: OldIeltsDump; counts: OldIeltsCounts; newRole: 'student' | 'teacher' | null }) {
  const name = dump.profile?.full_name?.trim() || dump.source.email || 'No name';
  const role = dump.profile?.role === 'teacher' ? 'Teacher' : 'Student';
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
        <Stat icon={History} color="var(--orange)" label="Attempts in the history" value={counts.history} />
        <Stat icon={PenLine} color="var(--skill-writing)" label="Corrected writings" value={counts.writing} />
        <Stat icon={Mic} color="var(--skill-speaking)" label="Corrected speakings" value={counts.speaking} />
        <Stat
          icon={BookOpen}
          color="var(--skill-reading)"
          label="Reading / Listening sheets"
          value={
            <span className="inline-flex items-center gap-1">
              {counts.reading + counts.listening}
              <Headphones size={13} className="text-label-3" />
            </span>
          }
        />
        <Stat icon={MessageSquare} color="var(--teal)" label="Teacher comments" value={counts.feedback} />
        <Stat icon={ClipboardList} color="var(--pink)" label="Tasks" value={counts.homework} />
      </div>
      {oldIeltsIsSameProject() && (
        <Notice>ECYR English uses the same database as the IELTS Simulator: if it is the same account, your progress is already here.</Notice>
      )}
      {newRole === 'teacher' && dump.profile?.role !== 'teacher' && (
        <Notice tone="warn">Your ECYR account is a teacher account: the simulator only shows bands and history on student accounts.</Notice>
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
    if (!r.ok) return setError(r.error ?? 'The session could not be imported.');
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
        title="IELTS Simulator session file"
        subtitle="The .json you saved with “Session → Save file”: drafts, transcripts, reports and generated exams."
      />
      {!file && !result && <DropZone label="Choose .json file" hint="or drag it here · max 15 MB" onFile={(f) => void pick(f)} busy={busy} />}
      {error && <Notice tone="error">{error}</Notice>}

      {file && s && (
        <div className="flex flex-col gap-3">
          <div className="text-footnote text-label-2 truncate px-1">
            {file.name} · saved on {fmtDate(s.exportedAt)}
            {s.candNo ? ` · candidato ${s.candNo}` : ''}
          </div>
          <Bands scores={s.scores} />
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={History} color="var(--orange)" label="Attempts in the history" value={s.history} />
            <Stat icon={PenLine} color="var(--skill-writing)" label={`Borradores (${s.writingWords} pal.)`} value={s.writingDrafts} />
            <Stat icon={Award} color="var(--indigo)" label="Writing reports" value={s.writingReports} />
            <Stat icon={Mic} color="var(--skill-speaking)" label="Transcripts" value={s.speakingTranscripts} />
            <Stat
              icon={Sparkles}
              color="var(--pink)"
              label="Generated exams"
              value={s.generated.listeningParts + s.generated.readingPassages + (s.generated.writing ? 1 : 0) + (s.generated.speaking ? 1 : 0)}
            />
            <Stat icon={BookOpen} color="var(--teal)" label="Saved words" value={s.savedWords} />
          </div>
          {!session && <Notice>Without being signed in it is imported only into this browser. Sign in to save it to your account too.</Notice>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" disabled={busy} onClick={() => void run()}>
              {busy ? <Spinner className="h-5 w-5" /> : <FileUp size={18} />} Import session
            </Button>
            <Button size="lg" variant="gray" disabled={busy} onClick={() => setFile(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {result && (
        <>
          <Notice tone="ok">
            Session imported: {result.historyAdded} new attempts{result.xpAwarded ? ` and +${result.xpAwarded} XP` : ''}.{' '} {result.session === 'applied' ? 'The simulator already has it loaded.' : result.session === 'queued' ? 'Your drafts and reports will appear the next time you open the simulator.' : ''} {result.synced ? ' Also saved to your account.' : ''} </Notice>
          {result.dropped.length > 0 && <Notice tone="warn">Not everything fit in this browser; these were skipped: {result.dropped.join(', ')}.</Notice>}
          {result.warnings.map((w) => (
            <Notice key={w} tone="warn">
              {w}
            </Notice>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink to="/ielts" className="sm:flex-1">
              <Award size={18} /> Open the simulator
            </ButtonLink>
            <Button variant="gray" onClick={() => setResult(null)}>
              Import another
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
    if (!r.ok) return setError(r.error ?? 'The progress could not be merged.');
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
        title="ECYR English progress (.json)"
        subtitle="The copy you exported from Profile → Data. It is merged with what you already have; it never replaces it."
      />
      {!file && !result && <DropZone label="Choose progress .json" hint="ecyr-progreso-AAAA-MM-DD.json" onFile={(f) => void pick(f)} busy={busy} />}
      {error && <Notice tone="error">{error}</Notice>}
      {file && s && (
        <div className="flex flex-col gap-3">
          <div className="text-footnote text-label-2 truncate px-1">
            {file.name} · updated on {fmtDate(s.updatedAt)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Sparkles} color="var(--yellow)" label="XP" value={s.xp.toLocaleString('en')} />
            <Stat icon={BookOpen} color="var(--blue)" label="Units completed" value={s.units} />
            <Stat icon={History} color="var(--orange)" label="Activities" value={s.activity} />
            <Stat icon={Trophy} color="var(--red)" label="Best streak (days)" value={s.streakBest} />
          </div>
          {(s.hasPlan || s.hasAvatar) && (
            <p className="text-footnote text-label-2 px-1">
              Includes {[s.hasPlan && 'study plan', s.hasAvatar && 'avatar'].filter(Boolean).join(' and ')} (applied only if newer than yours).
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" disabled={busy} onClick={() => void run()}>
              {busy ? <Spinner className="h-5 w-5" /> : <ArrowRightLeft size={18} />} Merge with my progress
            </Button>
            <Button size="lg" variant="gray" disabled={busy} onClick={() => setFile(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {result && (
        <>
          <Notice tone="ok">
            Progress merged: you had {result.xpBefore.toLocaleString('en')} XP and now {result.xpAfter.toLocaleString('en')} XP. {result.planApplied ? ' Study plan updated.' : ''} {result.avatarApplied ? ' Avatar updated.' : ''} </Notice>
          {result.warnings.map((w) => (
            <Notice key={w} tone="warn">
              {w}
            </Notice>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink to="/progress" className="sm:flex-1">
              <Trophy size={18} /> See my progress
            </ButtonLink>
            <Button variant="gray" onClick={() => setResult(null)}>
              Import another
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
    <ListGroup header="Work already done" footer="Upload essays, audios or projects you made outside the platform to keep them next to your progress.">
      <ListRow leading={<IconTile icon={Briefcase} color="var(--purple)" />} title="My work" subtitle="Your portfolio of work" to="/portfolio" />
    </ListGroup>
  );
}

// -------------------------------------------------------------- 5. history ---

const SOURCE_META: Record<MigrationLogRow['source'], { label: string; icon: LucideIcon; color: string }> = {
  'ielts-account': { label: 'IELTS Simulator account', icon: Award, color: 'var(--indigo)' },
  'ielts-session-file': { label: 'IELTS session file', icon: FileBraces, color: 'var(--orange)' },
  'ecyr-progress-file': { label: 'ECYR English progress', icon: Trophy, color: 'var(--green)' },
};

function describeCounts(row: MigrationLogRow) {
  const c = row.counts ?? {};
  const parts: string[] = [];
  if (row.source === 'ecyr-progress-file') {
    if (c.xp != null) parts.push(`${c.xp} XP`);
    if (c.units != null) parts.push(`${c.units} units`);
    if (c.activity != null) parts.push(`${c.activity} actividades`);
  } else {
    if (c.historyAdded != null) parts.push(`${c.historyAdded} attempts`);
    if (c.submissions) parts.push(`${c.submissions} works`);
    if (c.feedback) parts.push(`${c.feedback} comentarios`);
    if (c.homework) parts.push(`${c.homework} tasks`);
    if (c.xp) parts.push(`+${c.xp} XP`);
  }
  return parts.join(' · ') || 'No changes';
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
      <ListGroup header="Previous migrations">
        <ListRow leading={<IconTile icon={CloudOff} color="var(--label-3)" />} title="Offline" subtitle="The history is saved to your account." />
      </ListGroup>
    );
  if (!session)
    return (
      <ListGroup header="Previous migrations">
        <ListRow leading={<IconTile icon={History} color="var(--label-3)" />} title="Sign in to see your history" to="/profile" />
      </ListGroup>
    );

  return (
    <ListGroup header="Previous migrations" footer={state.missing ? 'The server doesn’t have the migrations_log table yet (08_migrations_log.sql).' : undefined}>
      {state.loading && !state.rows.length ? (
        <ListRow leading={<Spinner className="text-label-2" />} title="Loading…" />
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
          title={state.error && !state.missing ? 'Could not load' : 'You haven’t imported anything yet'}
          subtitle={state.error && !state.missing ? state.error : undefined}
        />
      )}
    </ListGroup>
  );
}

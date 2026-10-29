import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  School,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Spinner } from "@/components/ui/Misc";
import { useAuth } from "@/store/auth";
import { relativeTime } from "@/lib/date";
import { cn } from "@/lib/cn";
import {
  createInvite,
  inviteMessage,
  inviteStatus,
  listInvites,
  listTeachers,
  revokeInvite,
  type InviteStatus,
  type PlatformTeacher,
  type TeacherInvite,
} from "@/lib/admin";

const EXPIRY = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "0", label: "Sin vencer" },
] as const;
type Expiry = (typeof EXPIRY)[number]["value"];

const STATUS: Record<InviteStatus, { label: string; cls: string }> = {
  open: {
    label: "Disponible",
    cls: "text-ink-green bg-[color-mix(in_srgb,var(--green)_14%,transparent)]",
  },
  used: {
    label: "Usado",
    cls: "text-ink-blue bg-[color-mix(in_srgb,var(--blue)_14%,transparent)]",
  },
  expired: { label: "Vencido", cls: "text-label-2 bg-fill-2" },
  revoked: {
    label: "Anulado",
    cls: "text-ink-red bg-[color-mix(in_srgb,var(--red)_12%,transparent)]",
  },
};

export default function TeacherInvitesPage() {
  const { ready, session, profile } = useAuth();
  const loading = !ready || (session && !profile);

  if (!profile?.is_admin)
    return (
      <Page title="Docentes">
        <Card className="mx-auto max-w-xl p-6 text-center">
          {loading ? (
            <Spinner className="mx-auto h-8 w-8" />
          ) : (
            <ShieldCheck size={40} className="text-ink-purple mx-auto" />
          )}
          <h2 className="text-title-3 mt-3">Solo administración</h2>
          <p className="text-label-2 mt-1">
            Aquí la administración de la plataforma crea los códigos con los que
            se registran los docentes nuevos.
          </p>
          <ButtonLink to="/profile" className="mt-4">
            Ir a mi perfil
          </ButtonLink>
        </Card>
      </Page>
    );

  return <Admin />;
}

function Admin() {
  const [invites, setInvites] = useState<TeacherInvite[] | null>(null);
  const [teachers, setTeachers] = useState<PlatformTeacher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<TeacherInvite | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [i, t] = await Promise.all([listInvites(), listTeachers()]);
      setInvites(i);
      setTeachers(t);
    } catch (e) {
      setError((e as Error).message);
      setInvites((v) => v ?? []);
      setTeachers((v) => v ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = invites?.filter((i) => inviteStatus(i) === "open").length ?? 0;

  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-ink-purple" /> Administración
        </span>
      }
      title="Docentes"
      subtitle="Solo con un código tuyo se crea una cuenta docente. Los estudiantes se registran como siempre."
      actions={
        <Button
          variant="gray"
          size="sm"
          onClick={() => void load()}
          aria-label="Actualizar"
        >
          <RefreshCw size={15} /> Actualizar
        </Button>
      }
    >
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat
          icon={School}
          color="var(--orange)"
          value={teachers?.length}
          label="docentes"
        />
        <Stat
          icon={Users}
          color="var(--blue)"
          value={teachers?.reduce((a, t) => a + t.students, 0)}
          label="estudiantes"
        />
        <Stat
          icon={KeyRound}
          color="var(--purple)"
          value={invites ? open : undefined}
          label="códigos libres"
        />
      </div>

      {error && (
        <p className="text-ink-red bg-[color-mix(in_srgb,var(--red)_10%,transparent)] mb-5 rounded-[12px] px-4 py-3 text-[14px]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-6">
          <NewInvite
            onCreated={(i) => {
              setFresh(i);
              setInvites((v) => [i, ...(v ?? [])]);
            }}
          />
          {fresh && <FreshCode invite={fresh} onClose={() => setFresh(null)} />}
        </div>
        <div className="space-y-6">
          <InviteList invites={invites} onChange={load} />
          <TeacherList teachers={teachers} />
        </div>
      </div>
    </Page>
  );
}

function Stat({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: typeof School;
  color: string;
  value?: number;
  label: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 px-2 py-4 text-center sm:flex-row sm:gap-3 sm:px-4 sm:text-left">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color,
        }}
      >
        <Icon size={18} />
      </span>
      <span>
        <span className="text-title-2 block tabular-nums">{value ?? "–"}</span>
        <span className="text-label-2 block text-[13px]">{label}</span>
      </span>
    </Card>
  );
}

function NewInvite({ onCreated }: { onCreated: (i: TeacherInvite) => void }) {
  const [note, setNote] = useState("");
  const [days, setDays] = useState<Expiry>("30");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card className="p-5">
      <h3 className="text-headline flex items-center gap-2">
        <Plus size={18} className="text-ink-purple" /> Nuevo código
      </h3>
      <form
        className="mt-3 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            onCreated(await createInvite(note, Number(days)));
            setNote("");
          } catch (x) {
            setErr((x as Error).message);
          }
          setBusy(false);
        }}
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Para quién (ej. Laura — sede norte)"
          aria-label="Para quién es el código"
          className="bg-fill-2 placeholder:text-label-3 h-11 w-full rounded-[12px] px-4 text-[16px] outline-none"
        />
        <div>
          <div className="text-label-2 mb-1.5 text-[13px] font-medium">
            Vence en
          </div>
          <Segmented<Expiry>
            className="w-full"
            size="sm"
            value={days}
            onChange={setDays}
            options={EXPIRY.map((o) => ({ ...o }))}
          />
        </div>
        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={busy}
        >
          {busy ? <Spinner className="h-5 w-5" /> : <KeyRound size={17} />}{" "}
          Crear código
        </Button>
        {err && <p className="text-ink-red text-[14px]">{err}</p>}
      </form>
    </Card>
  );
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    });
  };
  return { copied, copy };
}

function FreshCode({
  invite,
  onClose,
}: {
  invite: TeacherInvite;
  onClose: () => void;
}) {
  const { copied, copy } = useCopy();
  const msg = useMemo(() => inviteMessage(invite), [invite]);
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        aria-hidden
        className="brand-gradient absolute inset-x-0 top-0 h-1"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="text-label-3 hover:text-label absolute top-3 right-3 p-1"
      >
        <X size={18} />
      </button>
      <div className="text-label-2 text-[13px] font-medium">
        Código listo{invite.note ? ` · ${invite.note}` : ""}
      </div>
      <div className="mt-2 font-mono text-[28px] font-bold tracking-[0.12em] break-all select-all sm:text-[32px]">
        {invite.code}
      </div>
      <pre className="bg-fill-2 text-label-2 mt-3 rounded-[12px] p-3 font-sans text-[13px] whitespace-pre-wrap">
        {msg}
      </pre>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="tinted"
          size="md"
          onClick={() => copy("code", invite.code)}
        >
          {copied === "code" ? <Check size={16} /> : <Copy size={16} />} Código
        </Button>
        <Button variant="filled" size="md" onClick={() => copy("msg", msg)}>
          {copied === "msg" ? <Check size={16} /> : <Copy size={16} />} Mensaje
        </Button>
      </div>
    </Card>
  );
}

function InviteList({
  invites,
  onChange,
}: {
  invites: TeacherInvite[] | null;
  onChange: () => void;
}) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const { copied, copy } = useCopy();
  const [busy, setBusy] = useState<string | null>(null);
  const rows = (invites ?? []).filter(
    (i) => filter === "all" || inviteStatus(i) === "open",
  );

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <h3 className="text-headline flex-1">Códigos</h3>
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Libres" },
            { value: "all", label: "Todos" },
          ]}
        />
      </div>
      {invites === null ? (
        <Spinner className="mx-auto mt-6 h-6 w-6" />
      ) : rows.length === 0 ? (
        <p className="text-label-2 mt-4 text-[14px]">
          {filter === "open"
            ? "No hay códigos libres. Crea uno para invitar a un docente."
            : "Todavía no has creado códigos."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--separator)]">
          {rows.map((i) => {
            const st = inviteStatus(i);
            return (
              <li key={i.code} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-[15px] font-semibold tracking-wider",
                        st !== "open" &&
                          "text-label-3 line-through decoration-1",
                      )}
                    >
                      {i.code}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        STATUS[st].cls,
                      )}
                    >
                      {STATUS[st].label}
                    </span>
                  </div>
                  <div className="text-label-2 truncate text-[13px]">
                    {st === "used"
                      ? `${i.used_email ?? "Cuenta"} · ${relativeTime(i.used_at ?? i.created_at)}`
                      : [
                          i.note,
                          i.expires_at && st === "open"
                            ? `vence ${new Date(i.expires_at).toLocaleDateString("es")}`
                            : null,
                          relativeTime(i.created_at),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </div>
                </div>
                {st === "open" && (
                  <>
                    <Button
                      variant="gray"
                      size="sm"
                      onClick={() => copy(i.code, inviteMessage(i))}
                      aria-label={`Copiar invitación ${i.code}`}
                    >
                      {copied === i.code ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy === i.code}
                      aria-label={`Anular ${i.code}`}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `¿Anular ${i.code}? Ya no servirá para registrarse.`,
                          )
                        )
                          return;
                        setBusy(i.code);
                        try {
                          await revokeInvite(i.code);
                        } catch (e) {
                          window.alert((e as Error).message);
                        }
                        setBusy(null);
                        onChange();
                      }}
                    >
                      <X size={15} />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function TeacherList({ teachers }: { teachers: PlatformTeacher[] | null }) {
  return (
    <Card className="p-5">
      <h3 className="text-headline">Docentes en la plataforma</h3>
      {teachers === null ? (
        <Spinner className="mx-auto mt-6 h-6 w-6" />
      ) : teachers.length === 0 ? (
        <p className="text-label-2 mt-4 text-[14px]">Aún no hay docentes.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--separator)]">
          {teachers.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="bg-[color-mix(in_srgb,var(--orange)_15%,transparent)] text-ink-orange flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold">
                {(t.full_name || t.email || "?").trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">
                  {t.full_name || t.email}
                </div>
                <div className="text-label-2 truncate text-[13px]">
                  {t.full_name ? `${t.email} · ` : ""}
                  {t.class_code ? (
                    <span className="font-mono">{t.class_code}</span>
                  ) : (
                    "sin código"
                  )}
                </div>
              </div>
              <span className="text-label-2 shrink-0 text-[13px] tabular-nums">
                <Users size={13} className="mr-1 inline" />
                {t.students}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

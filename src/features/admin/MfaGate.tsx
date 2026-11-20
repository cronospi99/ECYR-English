import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Misc";
import { supabase } from "@/lib/supabase";

/**
 * Verificación en dos pasos (TOTP) de la cuenta dueña. Los datos sensibles del
 * panel (nombres y correos de todo el alumnado) solo se sirven con una sesión
 * aal2 (migración 22). Este componente:
 *   - sin factor verificado: ofrece inscribir la app autenticadora (QR);
 *   - con factor pero sesión aal1: pide el código de 6 dígitos;
 *   - con sesión aal2: muestra el contenido.
 * Se puede inscribir ANTES de aplicar la migración 22.
 */
type Phase =
  | { k: "loading" }
  | { k: "enroll" }
  | { k: "challenge"; factorId: string }
  | { k: "ok" }
  | { k: "error"; msg: string };

const mfaError = (m: string) =>
  /invalid|expired|incorrect/i.test(m) ? "Código incorrecto o vencido. Inténtalo con el siguiente código de tu app." : m;

export default function MfaGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ k: "loading" });

  const check = useCallback(async () => {
    if (!supabase) return setPhase({ k: "error", msg: "La cuenta no está configurada en este despliegue." });
    const [lvl, fac] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    if (lvl.error || fac.error) return setPhase({ k: "error", msg: (lvl.error ?? fac.error)!.message });
    if (lvl.data.currentLevel === "aal2") return setPhase({ k: "ok" });
    const verified = fac.data.totp[0]; // listFactors().totp solo incluye factores verificados
    setPhase(verified ? { k: "challenge", factorId: verified.id } : { k: "enroll" });
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (phase.k === "ok") return <>{children}</>;

  return (
    <Page title="Verificación en dos pasos">
      <Card className="mx-auto max-w-xl p-6">
        <div className="text-center">
          {phase.k === "loading" ? (
            <Spinner className="mx-auto h-8 w-8" />
          ) : (
            <ShieldCheck size={40} className="text-ink-purple mx-auto" />
          )}
        </div>
        {phase.k === "error" && (
          <>
            <p className="text-ink-red mt-3 text-center text-[14px]">{phase.msg}</p>
            <div className="mt-3 text-center">
              <Button onClick={() => void check()}>Reintentar</Button>
            </div>
          </>
        )}
        {phase.k === "enroll" && <Enroll onDone={check} />}
        {phase.k === "challenge" && <Challenge factorId={phase.factorId} onDone={check} />}
      </Card>
    </Page>
  );
}

function Challenge({ factorId, onDone }: { factorId: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) return setErr(mfaError(error.message));
    onDone();
  };

  return (
    <form
      className="mt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-title-3 text-center">Escribe tu código</h2>
      <p className="text-label-2 mt-1 text-center text-[14px]">
        Abre tu app autenticadora y escribe el código de 6 dígitos de ECYR English para entrar al panel.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        aria-label="Código de 6 dígitos"
        className="bg-card mt-4 w-full rounded-[12px] px-4 py-3 text-center text-[22px] tracking-[0.4em]"
      />
      {err && <p className="text-ink-red mt-2 text-center text-[13px]">{err}</p>}
      <div className="mt-4 text-center">
        <Button type="submit" disabled={busy || code.length !== 6}>
          {busy ? "Verificando…" : "Verificar"}
        </Button>
      </div>
    </form>
  );
}

function Enroll({ onDone }: { onDone: () => void }) {
  const [data, setData] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (!supabase) return;
    setErr(null);
    // Un intento anterior sin verificar bloquea un nuevo alta con el mismo nombre: se limpia.
    const f = await supabase.auth.mfa.listFactors();
    for (const x of f.data?.all ?? []) {
      if (x.factor_type === "totp" && x.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: x.id });
    }
    const { data: d, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `ECYR ${new Date().toISOString().slice(0, 10)}`,
      issuer: "ECYR English",
    });
    if (error || !d) return setErr(error?.message ?? "No se pudo iniciar la inscripción.");
    setData({ id: d.id, qr: d.totp.qr_code, secret: d.totp.secret });
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  const verify = async () => {
    if (!supabase || !data) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: data.id, code: code.trim() });
    setBusy(false);
    if (error) return setErr(mfaError(error.message));
    onDone();
  };

  return (
    <div className="mt-3">
      <h2 className="text-title-3 text-center">Protege la cuenta dueña</h2>
      <p className="text-label-2 mt-1 text-center text-[14px]">
        Escanea el código QR con una app autenticadora (Google Authenticator, Authy, 1Password…) y escribe el código de 6
        dígitos que te muestre.
      </p>
      {!data ? (
        err ? (
          <div className="mt-3 text-center">
            <p className="text-ink-red text-[13px]">{err}</p>
            <Button className="mt-2" onClick={() => void start()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <Spinner className="mx-auto mt-4 h-6 w-6" />
        )
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <img src={data.qr} alt="Código QR para la app autenticadora" className="mx-auto mt-4 h-44 w-44 rounded-[12px] bg-white p-2" />
          <p className="text-label-2 mt-2 text-center text-[12px]">
            ¿No puedes escanear? Clave manual: <code className="select-all break-all">{data.secret}</code>
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="Código de 6 dígitos"
            className="bg-card mt-4 w-full rounded-[12px] px-4 py-3 text-center text-[22px] tracking-[0.4em]"
          />
          {err && <p className="text-ink-red mt-2 text-center text-[13px]">{err}</p>}
          <div className="mt-4 text-center">
            <Button type="submit" disabled={busy || code.length !== 6}>
              {busy ? "Verificando…" : "Activar verificación"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

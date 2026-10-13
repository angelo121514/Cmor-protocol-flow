import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";

export function MfaGate({ children, optional = false }: { children?: React.ReactNode; optional?: boolean }) {
  const [ready, setReady] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking,setChecking]=useState(true);
  useEffect(() => {
    let cancelled=false;
    void (async () => {
     try {
      const { data, error: statusError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (statusError) { setError("No se pudo verificar MFA."); return; }
      if (data?.currentLevel === "aal2" && !optional) {
       const permission=await supabase.rpc('is_admin');
       if(!cancelled){if(!permission.error&&permission.data===true)setReady(true);else setError('Tu cuenta requiere revisión o recuperación administrativa.');}
       return;
      }
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) { setError("No se pudieron consultar los factores."); return; }
      if(!cancelled)setFactorId(factors?.totp.find(f => f.status === "verified")?.id ?? null);
     } catch {if(!cancelled)setError("No se pudo verificar MFA.");}
     finally {if(!cancelled)setChecking(false);}
    })();
    return ()=>{cancelled=true;};
  }, [optional]);
  async function enroll() {
    setBusy(true); setError("");
    try {
    const { data, error: enrollmentError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "CMOR FLOW" });
    setBusy(false);
    if (enrollmentError || !data) { setError("No se pudo iniciar el enrolamiento."); return; }
    setFactorId(data.id); setSecret(data.totp.secret);
    setQr(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`);
    } catch {setError("No se pudo iniciar el enrolamiento.");} finally {setBusy(false);}
  }
  async function verify() {
    setBusy(true); setError("");
    try {
    const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId!, code });
    setBusy(false); setCode("");
    if (verificationError) { setError("Código inválido o expirado."); return; }
    setSecret(""); setQr("");
    if(!optional){const permission=await supabase.rpc('is_admin');if(permission.error||permission.data!==true){setError('Tu cuenta requiere revisión o recuperación administrativa.');return;}}
    setReady(true);
    } catch {setError("No se pudo verificar el código.");} finally {setBusy(false);}
  }
  if(checking)return <p>Verificando nivel de autenticación…</p>;
  if (ready && !optional) return <>{children}</>;
  return <main className="max-w-md mx-auto p-8 space-y-4">
    <h1 className="text-xl font-bold">Verificación en dos pasos</h1>
    {ready ? <p>MFA verificada. Puedes volver a tu panel.</p> : <>
      <p>Usa una aplicación de autenticación para proteger tu cuenta.</p>
      {qr && <img src={qr} alt="QR para configurar tu autenticador" />}
      {secret && <p>Clave de configuración: <code>{secret}</code></p>}
      {!factorId ? <button disabled={busy} onClick={enroll}>Configurar autenticador</button> : <>
        <label>Código de seis dígitos<input value={code} autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /></label>
        <button disabled={busy || code.length !== 6} onClick={verify}>Verificar</button>
      </>}
    </>}
    {error && <p role="alert">{error}</p>}
  </main>;
}

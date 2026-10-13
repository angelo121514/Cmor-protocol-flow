import { useState, useLayoutEffect } from "react";
import { supabase } from "../../config/supabase";
import {takeVerificationToken,readDownloadRecovery,saveDownloadRecovery,type DownloadRecovery} from '../../utils/dsar-link';
function download(value: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function VerifyDsar() {
  // Initializers must be pure: StrictMode evaluates them twice before committing.
  const [token] = useState(() => takeVerificationToken(window.location));
  useLayoutEffect(()=>{window.history.replaceState(null,'','/verify-dsar');},[]);
  const [recovery,setRecovery]=useState<DownloadRecovery|null>(()=>token?null:readDownloadRecovery());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{status:string;request_type:string;data?:Record<string,unknown>} | null>(null);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true); setError("");
    try {
      const { data, error: failure } = await supabase.functions.invoke("verify-dsar", { body: { ...(recovery??{token}), confirm: true } });
      let response=data;
      if(failure && 'context' in failure && failure.context instanceof Response){
        response=await failure.context.json().catch(()=>null);
      }
      if(response?.download_token&&response.requestId){const pending={requestId:response.requestId,download_token:response.download_token,createdAt:Date.now()};setRecovery(pending);saveDownloadRecovery(pending);}
      if (failure || !data?.success) setError("No se pudo ejecutar la solicitud. El enlace puede estar vencido o utilizado.");
      else {setResult(data);saveDownloadRecovery(null);}
    } catch { setError("No se pudo conectar. Intenta nuevamente."); }
    finally { setBusy(false); }
  }
  return <main className="max-w-lg mx-auto p-8 space-y-4">
    <h1 className="text-xl font-bold">Solicitud de privacidad</h1>
    {!result ? <><p>Confirma la solicitud que iniciaste. Si solicitaste supresión u oposición, se aplicará al confirmar.</p>
      <button disabled={(!token&&!recovery) || busy} onClick={confirm}>{recovery?"Reintentar descarga":"Confirmar y ejecutar solicitud"}</button></> : <>
      <p>{result.status === "pending" ? "Identidad verificada. La rectificación queda pendiente de revisión administrativa." : "Solicitud completada."}</p>
      {result.data && ["access", "export"].includes(result.request_type) && <>
        <button onClick={() => download(JSON.stringify(result.data.json ?? result.data, null, 2), "mis-datos.json", "application/json")}>Descargar JSON</button>
        {typeof result.data.csv === "string" && <button onClick={() => download(String(result.data.csv), "mis-datos.csv", "text/csv;charset=utf-8")}>Descargar CSV</button>}
      </>}
    </>}
    {error && <p role="alert">{error}</p>}
    {!token && !result && <p>El enlace no contiene un token válido. Solicita uno nuevo.</p>}
  </main>;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { privacyHandler, verificationHandler } from "./dsar.ts";
export function privacyRuntime(type: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  if (type === "verify") return verificationHandler(db);
  const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  return privacyHandler({ db, auth, anonKey: Deno.env.get("SUPABASE_ANON_KEY") }, type, async (email, verificationUrl) => {
    const key = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("DSAR_FROM_EMAIL");
    if (!key || !from) throw new Error("mail_not_configured");
    const response = await fetch(Deno.env.get("RESEND_API_URL") || "https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from,
        to: [email], subject: "Verifica tu solicitud de privacidad", text: `Confirma tu solicitud: ${verificationUrl}` }),
    });
    if (!response.ok) throw new Error("delivery_failed");
  }, Deno.env.get("PUBLIC_APP_URL") || "http://localhost:5173");
}

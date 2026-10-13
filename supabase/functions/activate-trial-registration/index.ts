import "../_shared/local-network.ts";
// Activa una prueba gratuita y envía una invitación de un solo uso al dueño.
// Esta es la única ruta pública de activación: los planes pagados solo se
// activan desde el webhook de Flow con service role.

import {deliverInvitations} from "../_shared/invitation-delivery.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { ALLOWED_ORIGINS, handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("PUBLIC_APP_URL") || "http://localhost:5173";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}


Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  if (!ALLOWED_ORIGINS.includes(req.headers.get("origin") || "")) {
    return jsonResponse(req, { success: false, error: "Origen no permitido" }, 403);
  }

  try {
    const { registration_request_id } = await req.json().catch(() => ({}));
    if (!isUuid(registration_request_id)) {
      return jsonResponse(req, { success: false, error: "Solicitud de registro inválida" }, 400);
    }

    const { data: request, error: requestError } = await supabase
      .from("registration_requests")
      .select("owner_name")
      .eq("id", registration_request_id)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError || !request) {
      return jsonResponse(req, { success: false, error: "Solicitud no disponible" }, 409);
    }

    const { data, error: activationError } = await supabase.rpc("auto_approve_registration_v2", {
      p_request_id: registration_request_id,
      p_plan: "free_trial",
      p_payment_provider: "trial",
      p_transaction_id: null,
      p_amount: 0,
    });
    const activation = Array.isArray(data) ? data[0] : data;

    if (activationError || !activation?.success || !activation.restaurant_id) {
      console.error("[activate-trial-registration] activation_failed");
      return jsonResponse(req, { success: false, error: "No se pudo activar la prueba" }, 409);
    }

    // Activation is already committed. A failed delivery remains in the outbox.
    let invitationSent = false;
    try { invitationSent = (await deliverInvitations(supabase,APP_URL,activation.restaurant_id)).processed>0; }
    catch { console.error('[activate-trial-registration] invitation_reconciliation_required'); }
    return jsonResponse(req, { success: true, invitation_sent: invitationSent }, 200);
  } catch {
    console.error("[activate-trial-registration] operation_failed");
    return jsonResponse(req, { success: false, error: "No se pudo completar el registro" }, 500);
  }
});

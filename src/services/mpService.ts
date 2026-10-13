// =====================================================================
// mpService.ts — cliente frontend de Mercado Pago (Fase 2 multi-país)
// Invoca las Edge Functions mp-checkout (registros) y order-pay (mesas).
// =====================================================================

import { supabase } from "../config/supabase";

export interface MpCheckoutResult {
  success: boolean;
  payment_id?: string;
  status?: string;
  pix_qr_code?: string | null;
  pix_qr_base64?: string | null;
  url?: string | null;
  error?: string;
}

/**
 * Inicia el pago de un plan de suscripción vía Mercado Pago (BR/PE).
 * El backend valida país y configuración; puede responder 503 si el
 * secret MERCADO_PAGO_ACCESS_TOKEN aún no está configurado.
 */
export const startMpSubscription = async (
  registrationRequestId: string,
  plan: string
): Promise<MpCheckoutResult> => {
  const { data, error } = await supabase.functions.invoke("mp-checkout", {
    body: {
      registration_request_id: registrationRequestId,
      plan,
      origin: window.location.origin,
    },
  });

  if (error) {
    // FunctionsHttpError (p.ej. 503 not_configured): el JSON del servidor
    // está en error.context — extraer el mensaje real para que el caller
    // pueda distinguir "MP no configurado" de un fallo transitorio.
    const serverError = await extractFunctionError(error);
    return { success: false, error: serverError ?? error.message };
  }
  return data as MpCheckoutResult;
};

/**
 * Extrae el campo `error` del body JSON de una respuesta no-2xx de una
 * Edge Function (FunctionsHttpError). Devuelve undefined si no se puede.
 */
const extractFunctionError = async (err: unknown): Promise<string | undefined> => {
  const ctx = (err as { context?: { json?: () => Promise<unknown> } }).context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string };
      return body?.error;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

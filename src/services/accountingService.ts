// =====================================================================
// Frontend Service: accountingService.ts
// Puente con la Edge Function "accounting" (motor tributario
// cmorflow-tax-api: boletas 39, facturas 33, notas de crédito 61 — Chile).
// Patrón flowService: supabase.functions.invoke con resultado plano.
// =====================================================================

import { supabase } from "../config/supabase";

export interface AccountingConfigResult {
  success: boolean;
  country?: string;
  auto_emit?: boolean;
  configured?: boolean;
  key_id_masked?: string | null;
  tax_key_version?: number | null;
  last_sync_at?: string | null;
  error?: string;
  detail?: string;
}

export interface AccountingDocument {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  dte_type: number;
  status: string;
  attempt: number;
  request_id: string | null;
  dte_id: string | null;
  folio: number | null;
  sii_status: string | null;
  track_id: string | null;
  amount: number | null;
  external_reference: string;
  receiver_rut: string | null;
  receiver_name: string | null;
  related_document_id: string | null;
  last_error: string | null;
  trace_id: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacturaReceiverInput {
  rut: string;
  name: string;
  giro?: string;
  address?: string;
  commune?: string;
}

export interface AccountingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  detail?: string;
}

/** Extrae el mensaje de un FunctionsHttpError (context = body de la función). */
function describeInvokeError(error: unknown): { error: string; message?: string } {
  const ctx = (error as { context?: { error?: string; message?: string } })?.context;
  if (ctx?.error) return { error: ctx.error, message: ctx.message };
  const msg = (error as { message?: string })?.message;
  return { error: msg ? "function_error" : "unknown_error", message: msg };
}

async function invokeAccounting<T>(
  route: string,
  options: { body?: Record<string, unknown>; query?: Record<string, string> } = {}
): Promise<AccountingResult<T>> {
  try {
    const qs = options.query
      ? "?" + new URLSearchParams(options.query).toString()
      : "";
    const { data, error } = await supabase.functions.invoke(`accounting/${route}${qs}`, {
      method: options.body ? "POST" : "GET",
      ...(options.body ? { body: options.body } : {}),
    });
    if (error) {
      const described = describeInvokeError(error);
      return { success: false, ...described };
    }
    return data as AccountingResult<T>;
  } catch (e) {
    return {
      success: false,
      error: "network_error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Estado de conexión al motor (sin secretos; nunca devuelve credenciales). */
export async function getAccountingConfig(restaurantId: string): Promise<AccountingConfigResult> {
  return invokeAccounting<AccountingConfigResult>("config", {
    query: { restaurant_id: restaurantId },
  }) as unknown as Promise<AccountingConfigResult>;
}

/** Toggle de emisión automática y/o alta/rotación de credencial del motor. */
export async function updateAccountingConfig(
  restaurantId: string,
  opts: { auto_emit?: boolean; credential?: { key_id: string; secret: string } } = {}
): Promise<AccountingResult> {
  return invokeAccounting("config", {
    body: {
      restaurant_id: restaurantId,
      ...(typeof opts.auto_emit === "boolean" ? { auto_emit: opts.auto_emit } : {}),
      ...(opts.credential ? { credential: opts.credential } : {}),
    },
  });
}

/** Sincroniza: emite pendientes (auto), reconcilia huérfanos y poll de estados. */
export async function syncAccounting(restaurantId: string): Promise<AccountingResult> {
  return invokeAccounting("sync", { body: { restaurant_id: restaurantId } });
}

/** Igual que syncAccounting pero silencioso: para llamar tras un cobro POS. */
export async function triggerPostPaymentSync(restaurantId: string): Promise<void> {
  try {
    await supabase.functions.invoke("accounting/sync", {
      method: "POST",
      body: { restaurant_id: restaurantId, source: "pos_payment" },
    });
  } catch {
    // Fire-and-forget: el cron cada 5 min es el respaldo.
  }
}

export async function listAccountingDocuments(
  restaurantId: string,
  opts: { limit?: number; status?: string } = {}
): Promise<AccountingResult<AccountingDocument[]>> {
  return invokeAccounting<AccountingDocument[]>("documents", {
    query: {
      restaurant_id: restaurantId,
      ...(opts.limit ? { limit: String(opts.limit) } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
  });
}

/** Emite una boleta electrónica (39) desde una orden pagada. */
export async function emitBoleta(
  restaurantId: string,
  orderId: string
): Promise<AccountingResult<AccountingDocument>> {
  return invokeAccounting<AccountingDocument>("emit", {
    body: { restaurant_id: restaurantId, order_id: orderId, dte_type: 39 },
  });
}

/** Emite una factura electrónica (33) con los datos del receptor. */
export async function emitFactura(
  restaurantId: string,
  orderId: string,
  receiver: FacturaReceiverInput
): Promise<AccountingResult<AccountingDocument>> {
  return invokeAccounting<AccountingDocument>("emit", {
    body: { restaurant_id: restaurantId, order_id: orderId, dte_type: 33, receiver },
  });
}

/** Nota de crédito (61) que anula un documento aceptado. */
export async function emitCreditNote(
  restaurantId: string,
  documentId: string,
  reason: string
): Promise<AccountingResult<AccountingDocument>> {
  return invokeAccounting("credit-note", {
    body: { restaurant_id: restaurantId, document_id: documentId, reason },
  });
}

/** URLs firmadas (5 min) para descargar XML y PDF del motor. */
export async function getArtifactLinks(
  restaurantId: string,
  documentId: string
): Promise<AccountingResult<{ xmlUrl: string; pdfUrl: string; expiresAt: string }>> {
  return invokeAccounting(`documents/${documentId}/artifact`, {
    body: { restaurant_id: restaurantId },
  });
}

export interface EmittableOrder {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
  order_type: string | null;
}

/**
 * Órdenes pagadas recientes (candidatas a boleta/factura manual).
 * El filtrado fino (sin documento válido) lo hace la página con la lista
 * de documentos ya cargada.
 */
export async function listRecentPaidOrders(restaurantId: string): Promise<AccountingResult<EmittableOrder[]>> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_number,total,created_at,order_type")
      .eq("restaurant_id", restaurantId)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as EmittableOrder[] };
  } catch (e) {
    return {
      success: false,
      error: "query_error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

import "../_shared/local-network.ts";
// =====================================================================
// Edge Function: accounting
// Módulo Contabilidad — puente con el motor tributario cmorflow-tax-api
// (DTE Chile: boleta 39, factura 33, nota de crédito 61).
//
// verify_jwt = false (config.toml). La autorización vive AQUÍ, igual que
// en order-pay: las rutas del dueño validan el Bearer JWT con
// requireRestaurantOwner; el cron se autentica con X-Cron-Secret contra
// la tabla accounting_cron_secret (RLS sin políticas, solo service role).
//
// Rutas (pathname routing, patrón flow-customer):
//   GET  /config                  → { auto_emit, configured, key_id_masked }
//   POST /config                  → toggle auto_emit y/o alta de credencial
//                                    (se cifra AES-256-GCM con ACCOUNTING_MASTER_KEY)
//   POST /emit                    → boleta 39 / factura 33 desde una orden pagada
//   POST /sync                    → dueño: 1 restaurante · cron: todos los CL
//   GET  /documents               → listado de documentos tributarios
//   POST /credit-note             → NC 61 sobre un documento aceptado
//   POST /documents/:id/artifact  → URLs firmadas XML/PDF del motor
//
// Sync (bucle de conciliación, idempotente):
//   1. Lease renovable de 120s por restaurante (UPDATE atómico de last_sync_at).
//   2. Reconcilia docs 'queued' sin request_id (findByExternalReference
//      rescata emisiones con timeout; si el motor no la conoce, re-emite
//      con la MISMA Idempotency-Key).
//   3. Catch-up auto_emit: órdenes pagadas sin documento válido → INSERT
//      write-ahead 'queued' ON CONFLICT (restaurant_id, external_reference)
//      DO NOTHING → recién entonces POST /dtes. Máx 20 por corrida.
//   4. Poll: 1 GET por doc en queued/processing/submitted con request_id.
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireRestaurantOwner } from "../_shared/authorization.ts";
import {applyAccountingState,reconcileAccountingDocument,updateAccountingDocument} from "../_shared/accounting-recovery.ts";
import { TaxApiClient, TaxApiError } from "../_shared/tax-client.ts";
import {
  buildCreditNotePayload,
  buildCreditNoteReference,
  buildDtePayloadFromOrder,
  buildOrderExternalReference,
  isValidRutChile,
} from "../_shared/accounting-payload.ts";
import type {
  TaxApiReceiver,
  TaxApiRequestState,
} from "../_shared/tax-types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TAX_API_BASE_URL =
  Deno.env.get("TAX_API_BASE_URL") || "";
const ACCOUNTING_MASTER_KEY = Deno.env.get("ACCOUNTING_MASTER_KEY") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Límites del bucle de conciliación (respetan 60 req/min del motor).
const CATCH_UP_LIMIT = 20;
const POLL_LIMIT = 20;
const RECONCILE_LIMIT = 20;
const MAX_AUTO_ATTEMPTS = 3;
const CRON_RESTAURANT_LIMIT = 10;


const DOC_LIST_COLUMNS =
  "id,restaurant_id,order_id,dte_type,status,attempt,request_id,dte_id,folio,sii_status," +
  "track_id,amount,external_reference,receiver_rut,receiver_name,related_document_id," +
  "last_error,trace_id,accepted_at,created_at,updated_at";

// ─────────────────────────────────────────────────────────────────────
// Cifrado de la credencial del motor en reposo (AES-256-GCM)
// ─────────────────────────────────────────────────────────────────────

const textEncoder = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveAesKey(): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", textEncoder.encode(ACCOUNTING_MASTER_KEY));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Formato almacenado: v{version}:{ivB64}:{ciphertextB64}, AAD = restaurant_id. */
async function encryptTaxSecret(plain: string, restaurantId: string): Promise<string> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: textEncoder.encode(restaurantId) },
    key,
    textEncoder.encode(plain)
  );
  return `v1:${toB64(iv)}:${toB64(new Uint8Array(ciphertext))}`;
}

async function decryptTaxSecret(stored: string, restaurantId: string): Promise<string> {
  const [version, ivB64, ctB64] = stored.split(":");
  if (version !== "v1" || !ivB64 || !ctB64) {
    throw new Error("formato de credencial no soportado (¿rotación de ACCOUNTING_MASTER_KEY pendiente?)");
  }
  const key = await deriveAesKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64), additionalData: textEncoder.encode(restaurantId) },
    key,
    fromB64(ctB64)
  );
  return new TextDecoder().decode(plain);
}

// ─────────────────────────────────────────────────────────────────────
// Credencial por restaurante → cliente del motor
// ─────────────────────────────────────────────────────────────────────

interface RestaurantTaxConfig {
  restaurant_id: string;
  auto_emit: boolean;
  tax_key_id: string | null;
  tax_secret_encrypted: string | null;
  tax_key_version: number;
  last_sync_at: string | null;
}

async function loadTaxConfig(restaurantId: string): Promise<RestaurantTaxConfig | null> {
  const { data, error } = await supabase
    .from("accounting_config")
    .select("restaurant_id,auto_emit,tax_key_id,tax_secret_encrypted,tax_key_version,last_sync_at")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function buildClient(config: RestaurantTaxConfig): Promise<TaxApiClient> {
  if (!config.tax_key_id || !config.tax_secret_encrypted) {
    throw new TaxApiError("not_configured", "El restaurante no tiene credencial del motor tributario", 503);
  }
  const secret = await decryptTaxSecret(config.tax_secret_encrypted, config.restaurant_id);
  return new TaxApiClient({ baseUrl: TAX_API_BASE_URL, apiKey: config.tax_key_id, secret });
}

function maskKeyId(keyId: string | null): string | null {
  if (!keyId) return null;
  return keyId.length <= 10 ? keyId : `${keyId.slice(0, 10)}…${keyId.slice(-4)}`;
}

async function assertChile(restaurantId: string): Promise<{ country: string } | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("country")
    .eq("id", restaurantId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { country: string };
}

// ─────────────────────────────────────────────────────────────────────
// Cron: X-Cron-Secret (comparación en tiempo constante) + lease
// ─────────────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyCronSecret(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-cron-secret") || "";
  if (!provided) return false;
  const { data, error } = await supabase
    .from("accounting_cron_secret")
    .select("secret")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data?.secret) return false;
  return timingSafeEqual(provided, data.secret);
}

async function acquireSyncLease(restaurantId: string): Promise<string|null> {
  const {data,error}=await supabase.rpc("accounting_lease",{p_restaurant:restaurantId});
  if(error)throw new Error("lease_unavailable");return data;
}
// ─────────────────────────────────────────────────────────────────────
// Emisión y conciliación
// ─────────────────────────────────────────────────────────────────────

interface DocRow {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  dte_type: number;
  status: string;
  attempt: number;
  request_id: string | null;
  dte_id: string | null;
  folio: number | null;
  amount: number | null;
  external_reference: string;
  last_error: string | null;
  payload: unknown;
  receiver_rut?: string;
  receiver_name?: string;
}

function docPublic(doc: DocRow) {
  const { payload, ...rest } = doc;
  void payload;
  return rest;
}

/** Aplica el estado consolidado del motor a la fila local. */
async function applyState(docId: string,state:TaxApiRequestState):Promise<void>{
  await applyAccountingState(supabase,docId,state);
}

/**
 * Emite un DTE para un documento YA INSERTADO (write-ahead).
 * El Idempotency-Key es el id de la fila: reintentos con la misma key son
 * replay seguro para el motor. El fallo transitorio deja la fila 'queued'.
 */
async function emitDoc(client: TaxApiClient, doc: DocRow): Promise<DocRow> {
  try {
    const res = await client.emitDte(doc.payload as never, {
      idempotencyKey: doc.id,
      externalReference: doc.external_reference,
    });
    const { data, error } = await supabase
      .from("accounting_documents")
      .update({ request_id: res.requestId, status: "queued", updated_at: new Date().toISOString() })
      .eq("id", doc.id)
      .select(DOC_LIST_COLUMNS)
      .single();
    if (error) throw error;
    return data as unknown as DocRow;
  } catch (e) {
    const msg = e instanceof TaxApiError ? e.code : "accounting_operation_failed";
    await updateAccountingDocument(supabase,doc.id,{last_error:msg});
    // Permanente (validación/credencial) vs transitorio: el motor dedupea
    // por Idempotency-Key, así que re-emisiones con la misma key son seguras.
    if (e instanceof TaxApiError && !e.retryable && e.statusCode >= 400 && e.statusCode < 500) {
      await updateAccountingDocument(supabase,doc.id,{status:"failed"});
      throw e;
    }
    throw e;
  }
}

/** Reconcilia un doc 'queued' sin request_id: rescata o re-emite. */
async function reconcileQueuedDoc(client:TaxApiClient,doc:DocRow):Promise<"adopted"|"emitted"|"error">{
  return reconcileAccountingDocument(supabase,client,doc,()=>emitDoc(client,doc));
}

async function pollDoc(client: TaxApiClient, doc: DocRow): Promise<boolean> {
  try {
    if (!doc.request_id) return false;
    const state = await client.getStatus(doc.request_id);
    await applyState(doc.id, state);
    return true;
  } catch (e) {
    const msg = e instanceof TaxApiError ? e.code : "accounting_operation_failed";
    await updateAccountingDocument(supabase,doc.id,{last_error:msg});
    return false;
  }
}

/** Cache-up: emite boletas 39 de órdenes pagadas sin documento válido. */
async function catchUpEmissions(
  client: TaxApiClient,
  config: RestaurantTaxConfig,
  heartbeat:()=>Promise<void>
): Promise<{ emitted: number; errors: number }> {
  const restaurantId = config.restaurant_id;

  const { data: orders, error: ordersErr } = await supabase.rpc('accounting_emission_candidates', {
    p_restaurant: restaurantId, p_limit: CATCH_UP_LIMIT,
  });
  if (ordersErr) throw new Error('accounting_candidates_failed');

  let emitted = 0;
  let errors = 0;
  for (const order of orders ?? []) {
    if (emitted >= CATCH_UP_LIMIT) break;
    await heartbeat();

    const result = await emitForOrder(restaurantId, order, 39, undefined, { manual: false, client });
    if (result.ok) emitted++;
    else if (result.error === "items_mismatch") {
      errors++;
      console.error(`[accounting] Orden ${order.id} con items que no cuadran con el total`);
    } else if (result.error !== "already_issued" && result.error !== "already_pending" && result.error !== "attempts_exhausted") {
      errors++;
    }
  }
  return { emitted, errors };
}

/**
 * Crea el documento (write-ahead, idempotente) y lo emite.
 * Idempotencia: external_reference incluye el attempt; el INSERT con
 * ON CONFLICT DO NOTHING garantiza que dos corridas concurrentes no
 * dupliquen la emisión de un mismo attempt.
 */
async function emitForOrder(
  restaurantId: string,
  order: { id: string; total: number; items?: unknown; order_number?: string },
  dteType: 39 | 33,
  receiver: TaxApiReceiver | undefined,
  opts: { manual: boolean; client: TaxApiClient }
): Promise<{ ok: boolean; doc?: DocRow; error?: string }> {
  // Documentos previos del mismo order+dte_type.
  const { data: prevDocs, error: prevErr } = await supabase
    .from("accounting_documents")
    .select("id,status,attempt")
    .eq("restaurant_id", restaurantId)
    .eq("order_id", order.id)
    .eq("dte_type", dteType)
    .order("attempt", { ascending: false });
  if (prevErr) throw prevErr;

  const prev = prevDocs ?? [];
  if (prev.some((d) => d.status === "accepted" || d.status === "observed")) {
    return { ok: false, error: "already_issued" };
  }
  const inFlight = prev.find((d) => ["queued", "processing", "submitted"].includes(d.status));
  if (inFlight) return { ok: false, error: "already_pending" };

  const nextAttempt = (prev[0]?.attempt ?? 0) + 1;
  if (!opts.manual && nextAttempt > MAX_AUTO_ATTEMPTS) {
    return { ok: false, error: "attempts_exhausted" };
  }

  // Validación server-side: los items deben cuadrar con el total cobrado.
  const { payload, itemsTotal } = buildDtePayloadFromOrder(order as never, { dteType, receiver });
  if (Math.abs(itemsTotal - Math.round(Number(order.total) || 0)) > 1) {
    return { ok: false, error: "items_mismatch" };
  }

  const externalReference = buildOrderExternalReference(order.id, dteType, nextAttempt);
  const { data: inserted, error: insertErr } = await supabase
    .from("accounting_documents")
    .insert({
      restaurant_id: restaurantId,
      order_id: order.id,
      dte_type: dteType,
      status: "queued",
      attempt: nextAttempt,
      external_reference: externalReference,
      amount: Math.round(Number(order.total) || 0),
      receiver_rut: receiver?.rut ?? null,
      receiver_name: receiver?.name ?? null,
      payload,
    })
    .select(DOC_LIST_COLUMNS + ",payload")
    .single();

  if (insertErr || !inserted) {
    // Conflicto de unique (restaurant_id, external_reference): otra corrida
    // ya encoló este attempt — no es error, devolvemos ese doc.
    const { data: existing } = await supabase
      .from("accounting_documents")
      .select(DOC_LIST_COLUMNS)
      .eq("restaurant_id", restaurantId)
      .eq("external_reference", externalReference)
      .maybeSingle();
    if (existing) return { ok: true, doc: existing as unknown as DocRow };
    throw insertErr ?? new Error("insert_failed");
  }

  try {
    const doc = await emitDoc(opts.client, inserted as unknown as DocRow);
    return { ok: true, doc };
  } catch (e) {
    if (e instanceof TaxApiError) return { ok: false, error: e.code, doc: inserted as unknown as DocRow };
    return { ok: false, error: "unknown_error", doc: inserted as unknown as DocRow };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Sync de un restaurante
// ─────────────────────────────────────────────────────────────────────

async function syncRestaurant(restaurantId: string): Promise<Record<string, unknown>> {
  const config = await loadTaxConfig(restaurantId);
  if (!config || !config.tax_key_id || !config.tax_secret_encrypted) {
    return { restaurant_id: restaurantId, skipped: "not_configured" };
  }
  const restaurant = await assertChile(restaurantId);
  if (!restaurant) return { restaurant_id: restaurantId, skipped: "restaurant_not_found" };
  if (restaurant.country !== "CL") return { restaurant_id: restaurantId, skipped: "country_not_supported" };

  const leased = await acquireSyncLease(restaurantId);
  if (!leased) return { restaurant_id: restaurantId, skipped: "lease_held" };

  const heartbeat=async()=>{const r=await supabase.rpc("accounting_lease",{p_restaurant:restaurantId,p_token:leased});if(r.error)throw new Error("lease_lost");};
  let result:Record<string,unknown>|undefined;
  let failed=false;let failure:unknown;
  try {
  const client = await buildClient(config);
  const summary: Record<string, unknown> = { restaurant_id: restaurantId };

  // 1. Huérfanos: 'queued' sin request_id (emisión interrumpida).
  const { data: orphans, error: orphansErr } = await supabase
    .from("accounting_documents")
    .select(DOC_LIST_COLUMNS + ",payload")
    .eq("restaurant_id", restaurantId)
    .eq("status", "queued")
    .is("request_id", null)
    .order("created_at", { ascending: true })
    .limit(RECONCILE_LIMIT);
  if (orphansErr) throw orphansErr;
  let adopted = 0;
  let reEmitted = 0;
  for (const doc of orphans ?? []) {
    await heartbeat();
    const result = await reconcileQueuedDoc(client, doc as unknown as DocRow);
    if (result === "adopted") adopted++;
    else if (result === "emitted") reEmitted++;
  }
  summary.reconciled_adopted = adopted;
  summary.reconcile_reemitted = reEmitted;

  // 2. Catch-up de órdenes pagadas sin boleta (solo con auto_emit).
  if (config.auto_emit) {
    summary.catch_up = await catchUpEmissions(client, config,heartbeat);
  }

  // 3. Poll de estados en curso.
  const { data: pending, error: pendingErr } = await supabase
    .from("accounting_documents")
    .select(DOC_LIST_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .in("status", ["queued", "processing", "submitted"])
    .not("request_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(POLL_LIMIT);
  if (pendingErr) throw pendingErr;
  let polled = 0;
  for (const doc of pending ?? []) {
    await heartbeat();
    const updated = await pollDoc(client, doc as unknown as DocRow);
    if (updated) polled++;
  }
  summary.polled = polled;
  result=summary;
  } catch(error) {failed=true;failure=error;}
  const released=await supabase.rpc("accounting_lease",{p_restaurant:restaurantId,p_token:leased,p_release:true});
  if(failed){if(released.error)console.error('lease_release_failed');throw failure;}
  if(released.error)throw new Error('lease_release_failed');
  return result!;
}

// ─────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const url = new URL(req.url);
  const method = req.method;

  try {
    // ── POST /sync — dueño (1 restaurante) o cron (todos los CL) ──
    if (url.pathname.endsWith("/sync") && method === "POST") {
      const cron = await verifyCronSecret(req);
      if (cron) {
        const { data: targets, error } = await supabase
          .from("accounting_config")
          .select("restaurant_id, last_sync_at, restaurants!inner(country)")
          .eq("restaurants.country", "CL")
          .not("tax_key_id", "is", null)
          .not("tax_secret_encrypted", "is", null)
          .order("last_sync_at", { ascending: true, nullsFirst: true })
          .limit(CRON_RESTAURANT_LIMIT);
        if (error) throw error;
        const results = [];
        for (const t of targets ?? []) {
          try {
            results.push(await syncRestaurant((t as { restaurant_id: string }).restaurant_id));
          } catch (e) {
            results.push({
              restaurant_id: (t as { restaurant_id: string }).restaurant_id,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
        return jsonResponse(req, { success: true, mode: "cron", results });
      }

      const body = await req.json().catch(() => ({}));
      const restaurantId = (body as { restaurant_id?: string }).restaurant_id;
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const summary = await syncRestaurant(restaurantId);
      return jsonResponse(req, { success: true, mode: "owner", summary });
    }

    // ── GET /config — estado de conexión (sin secretos) ──
    if (url.pathname.endsWith("/config") && method === "GET") {
      const restaurantId = url.searchParams.get("restaurant_id");
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const restaurant = await assertChile(restaurantId);
      if (!restaurant) return jsonResponse(req, { success: false, error: "restaurant_not_found" }, 404);
      const config = await loadTaxConfig(restaurantId);
      return jsonResponse(req, {
        success: true,
        country: restaurant.country,
        auto_emit: config?.auto_emit ?? false,
        configured: Boolean(config?.tax_key_id && config?.tax_secret_encrypted),
        key_id_masked: maskKeyId(config?.tax_key_id ?? null),
        tax_key_version: config?.tax_key_version ?? null,
        last_sync_at: config?.last_sync_at ?? null,
      });
    }

    // ── POST /config — toggle auto_emit y/o alta/rotación de credencial ──
    if (url.pathname.endsWith("/config") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id: restaurantId, auto_emit: autoEmit, credential } = body as {
        restaurant_id?: string;
        auto_emit?: boolean;
        credential?: { key_id?: string; secret?: string };
      };
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof autoEmit === "boolean") updates.auto_emit = autoEmit;

      if (credential?.key_id && credential?.secret) {
        if (!ACCOUNTING_MASTER_KEY) {
          return jsonResponse(req, { success: false, error: "master_key_not_configured" }, 500);
        }
        if (!credential.key_id.startsWith("cmor_live_")) {
          return jsonResponse(req, { success: false, error: "credencial debe ser cmor_live_* (API)" }, 400);
        }
        // Validación activa: la firma HMAC debe funcionar ANTES de guardar.
        const probe = new TaxApiClient({
          baseUrl: TAX_API_BASE_URL,
          apiKey: credential.key_id,
          secret: credential.secret,
        });
        try {
          await probe.findByExternalReference(`cmorflow-validation-${crypto.randomUUID()}`);
          return jsonResponse(req, { success: false, error: "credencial con permisos inesperados" }, 400);
        } catch (e) {
          if (!(e instanceof TaxApiError) || e.code !== "NOT_FOUND") {
            return jsonResponse(req, {
              success: false,
              error: "credencial_invalida",
              detail: e instanceof TaxApiError ? `${e.code}: ${e.message}` : String(e),
            }, 400);
          }
        }
        updates.tax_key_id = credential.key_id;
        updates.tax_secret_encrypted = await encryptTaxSecret(credential.secret, restaurantId);
      }

      if (Object.keys(updates).length <= 1) {
        return jsonResponse(req, { success: false, error: "nada_que_actualizar" }, 400);
      }

      const { error } = await supabase
        .from("accounting_config")
        .upsert({ restaurant_id: restaurantId, ...updates }, { onConflict: "restaurant_id" });
      if (error) throw error;
      return jsonResponse(req, { success: true });
    }

    // ── POST /documents/:id/artifact — URLs firmadas XML/PDF ──
    const artifactMatch = url.pathname.match(/\/documents\/([\w-]+)\/artifact$/);
    if (artifactMatch && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const restaurantId = (body as { restaurant_id?: string }).restaurant_id;
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      const { data: doc, error } = await supabase
        .from("accounting_documents")
        .select(DOC_LIST_COLUMNS)
        .eq("id", artifactMatch[1])
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (error || !doc) return jsonResponse(req, { success: false, error: "document_not_found" }, 404);
      if (!(doc as unknown as DocRow).dte_id) {
        return jsonResponse(req, { success: false, error: "document_not_finalized" }, 409);
      }

      const config = await loadTaxConfig(restaurantId);
      if (!config) return jsonResponse(req, { success: false, error: "not_configured" }, 503);
      const client = await buildClient(config);
      const links = await client.getArtifactLinks((doc as unknown as DocRow).dte_id!);
      return jsonResponse(req, { success: true, ...links });
    }

    // ── POST /emit — boleta 39 o factura 33 desde una orden pagada ──
    if (url.pathname.endsWith("/emit") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id: restaurantId, order_id: orderId, dte_type: dteType, receiver } = body as {
        restaurant_id?: string;
        order_id?: string;
        dte_type?: number;
        receiver?: TaxApiReceiver;
      };
      if (!restaurantId || !orderId) {
        return jsonResponse(req, { success: false, error: "restaurant_id y order_id son requeridos" }, 400);
      }
      if (dteType !== 39 && dteType !== 33) {
        return jsonResponse(req, { success: false, error: "dte_type debe ser 39 (boleta) o 33 (factura)" }, 400);
      }
      if (dteType === 33) {
        if (!receiver?.rut || !receiver?.name) {
          return jsonResponse(req, { success: false, error: "factura requiere receiver.rut y receiver.name" }, 400);
        }
        if (!isValidRutChile(receiver.rut)) {
          return jsonResponse(req, { success: false, error: "receiver.rut inválido (dígito verificador)" }, 400);
        }
      }
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const restaurant = await assertChile(restaurantId);
      if (!restaurant || restaurant.country !== "CL") {
        return jsonResponse(req, { success: false, error: "country_not_supported" }, 403);
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id,restaurant_id,total,items,order_number,payment_status")
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (orderErr || !order) return jsonResponse(req, { success: false, error: "order_not_found" }, 404);
      if (order.payment_status !== "paid") {
        return jsonResponse(req, { success: false, error: "order_not_paid" }, 409);
      }

      const config = await loadTaxConfig(restaurantId);
      if (!config) return jsonResponse(req, { success: false, error: "not_configured" }, 503);
      const client = await buildClient(config);
      const result = await emitForOrder(restaurantId, order, dteType, receiver, { manual: true, client });

      if (!result.ok) {
        const statusMap: Record<string, number> = {
          already_issued: 409,
          already_pending: 409,
          attempts_exhausted: 409,
          items_mismatch: 422,
          not_configured: 503,
        };
        return jsonResponse(req, {
          success: false,
          error: result.error,
          doc: result.doc ? docPublic(result.doc) : undefined,
        }, statusMap[result.error ?? ""] ?? 500);
      }
      return jsonResponse(req, { success: true, doc: result.doc ? docPublic(result.doc) : undefined });
    }

    // ── POST /credit-note — NC 61 sobre un documento aceptado ──
    if (url.pathname.endsWith("/credit-note") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id: restaurantId, document_id: documentId, reason } = body as {
        restaurant_id?: string;
        document_id?: string;
        reason?: string;
      };
      if (!restaurantId || !documentId) {
        return jsonResponse(req, { success: false, error: "restaurant_id y document_id son requeridos" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      const { data: original, error: origErr } = await supabase
        .from("accounting_documents")
        .select(DOC_LIST_COLUMNS)
        .eq("id", documentId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (origErr || !original) return jsonResponse(req, { success: false, error: "document_not_found" }, 404);
      const origDoc = original as unknown as DocRow;
      if (origDoc.status !== "accepted" || !origDoc.dte_id) {
        return jsonResponse(req, { success: false, error: "solo se anula un documento accepted" }, 409);
      }

      // Attempt de NC = máximo entre las NC previas de este original + 1.
      const { data: prevNotes } = await supabase
        .from("accounting_documents")
        .select("attempt")
        .eq("restaurant_id", restaurantId)
        .eq("dte_type", 61)
        .eq("related_document_id", documentId)
        .order("attempt", { ascending: false })
        .limit(1);
      const nextAttempt = ((prevNotes?.[0]?.attempt as number | undefined) ?? 0) + 1;

      const config = await loadTaxConfig(restaurantId);
      if (!config) return jsonResponse(req, { success: false, error: "not_configured" }, 503);
      const client = await buildClient(config);

      const externalReference = buildCreditNoteReference(documentId, nextAttempt);
      const { data: ncDoc, error: ncErr } = await supabase
        .from("accounting_documents")
        .insert({
          restaurant_id: restaurantId,
          order_id: origDoc.order_id,
          dte_type: 61,
          status: "queued",
          attempt: nextAttempt,
          external_reference: externalReference,
          amount: origDoc.amount,
          receiver_rut: origDoc.receiver_rut,
          receiver_name: origDoc.receiver_name,
          related_document_id: documentId,
          payload: buildCreditNotePayload({ folio: origDoc.folio, dteType: origDoc.dte_type, reason: reason ?? "" }),
        })
        .select(DOC_LIST_COLUMNS + ",payload")
        .single();
      if (ncErr || !ncDoc) {
        const { data: existing } = await supabase
          .from("accounting_documents")
          .select(DOC_LIST_COLUMNS)
          .eq("restaurant_id", restaurantId)
          .eq("external_reference", externalReference)
          .maybeSingle();
        if (existing) return jsonResponse(req, { success: true, doc: existing });
        throw ncErr ?? new Error("insert_failed");
      }

      try {
        const doc = await emitDoc(client, ncDoc as unknown as DocRow);
        return jsonResponse(req, { success: true, doc: docPublic(doc) });
      } catch (e) {
        const code = e instanceof TaxApiError ? e.code : "unknown_error";
        return jsonResponse(req, { success: false, error: code, doc: docPublic(ncDoc as unknown as DocRow) }, 502);
      }
    }

    // ── GET /documents — listado para la página Contabilidad ──
    if (url.pathname.endsWith("/documents") && method === "GET") {
      const restaurantId = url.searchParams.get("restaurant_id");
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 300);
      const status = url.searchParams.get("status");
      let query = supabase
        .from("accounting_documents")
        .select(DOC_LIST_COLUMNS)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse(req, { success: true, documents: data ?? [] });
    }

    return jsonResponse(req, { success: false, error: "ruta no encontrada" }, 404);
  } catch (e) {
    if (e instanceof TaxApiError) {
      const status = e.statusCode === 503 && e.code === "not_configured" ? 503 : 502;
      return jsonResponse(req, { success: false, error: e.code, message: e.message }, status);
    }
    console.error("[accounting] operation_failed");
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});

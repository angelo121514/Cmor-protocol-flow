// =====================================================================
// Cliente HTTP del motor tributario (cmorflow-tax-api).
//
// Patrón _shared/mp-client.ts: falla cerrada, parseo defensivo y errores
// con contexto. Autenticación HMAC (ver _shared/tax-signing.ts).
//
// Reglas del motor relevantes:
//  - X-Nonce es de un solo uso: un reintento DEBE re-firmar (nonce nuevo),
//    pero conservando la MISMA Idempotency-Key (esa es la idempotencia:
//    misma key + mismo body → replay de la respuesta original).
//  - El body entra en la firma: se serializa el JSON UNA sola vez y se
//    reutilizan exactamente los mismos bytes en firma, retry y envío.
// =====================================================================

import { signRequest } from "./tax-signing.ts";
import {
  RETRYABLE_ERROR_CODES,
  type TaxApiArtifactLinks,
  type TaxApiDtePayload,
  type TaxApiEmitResponse,
  type TaxApiNotePayload,
  type TaxApiRequestState,
} from "./tax-types.ts";

export class TaxApiError extends Error {
  code: string;
  statusCode: number;
  retryable: boolean;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "TaxApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = RETRYABLE_ERROR_CODES.has(code) || statusCode >= 500;
  }
}

export interface TaxApiClientConfig {
  baseUrl: string;
  apiKey: string;
  secret: string;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2; // 1 intento + 1 retry con re-firma

export class TaxApiClient {
  private baseUrl: string;
  private apiKey: string;
  private secret: string;

  constructor(config: TaxApiClientConfig) {
    if (!config.baseUrl) throw new TaxApiError("not_configured", "TAX_API_BASE_URL no configurada", 503);
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.secret = config.secret;
  }

  /**
   * POST con idempotencia obligatoria (emisión de DTEs / notas / RCOF).
   * Reintenta 1 vez en 5xx/network re-firmando con la misma Idempotency-Key.
   */
  private async request<T>(
    method: "POST" | "GET",
    path: string,
    bodyObj: unknown | null,
    opts: { idempotencyKey?: string; query?: Record<string, string> } = {}
  ): Promise<T> {
    const search = new URLSearchParams(opts.query ?? {}).toString();
    const pathWithQuery = path + (search ? `?${search}` : "");
    const url = `${this.baseUrl}${pathWithQuery}`;
    // Serialización ÚNICA del body: los bytes firmados son los enviados.
    const bodyText = bodyObj === null ? "" : JSON.stringify(bodyObj);
    const bodyBytes = new TextEncoder().encode(bodyText);

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(await signRequest({
          method,
          pathWithQuery,
          body: bodyBytes,
          secret: this.secret,
          apiKey: this.apiKey,
        })),
      };
      if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: method === "POST" ? bodyText : undefined,
          signal: controller.signal,
        });

        if (res.ok) {
          return (await res.json()) as T;
        }

        // Errores con shape uniforme { statusCode, error: { code, message } }
        const parsed = await res.json().catch(() => null);
        const code = parsed?.error?.code ?? `HTTP_${res.status}`;
        const message = parsed?.error?.message ?? `Error HTTP ${res.status} del motor tributario`;
        const err = new TaxApiError(code, message, res.status);

        const retryableStatus = res.status === 429 || res.status >= 500;
        if (attempt < MAX_ATTEMPTS && retryableStatus) {
          lastError = err;
          continue; // re-firma con nuevo nonce, misma Idempotency-Key
        }
        throw err;
      } catch (e) {
        if (e instanceof TaxApiError) {
          if (attempt < MAX_ATTEMPTS && e.retryable && e.statusCode !== 401 && e.statusCode !== 403) {
            lastError = e;
            continue;
          }
          throw e;
        }
        // Network / abort
        const err = new TaxApiError(
          "TAX_API_UNREACHABLE",
          `No se pudo contactar el motor tributario: ${e instanceof Error ? e.message : String(e)}`,
          503
        );
        if (attempt < MAX_ATTEMPTS) {
          lastError = err;
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new TaxApiError("TAX_API_UNREACHABLE", "Error desconocido del motor tributario", 503);
  }

  /** Emite un DTE. 202 → queued; el estado real se consulta con getStatus. */
  emitDte(
    payload: TaxApiDtePayload,
    opts: { idempotencyKey: string; externalReference: string }
  ): Promise<TaxApiEmitResponse> {
    const body: TaxApiDtePayload = { ...payload, externalReference: opts.externalReference };
    return this.request<TaxApiEmitResponse>("POST", "/dtes", body, {
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Estado consolidado por requestId o dteId — la fuente de verdad. */
  getStatus(id: string): Promise<TaxApiRequestState> {
    return this.request<TaxApiRequestState>("GET", `/dtes/${encodeURIComponent(id)}`, null);
  }

  /** Reconcilia por referencia externa de negocio. 404 NOT_FOUND si no existe. */
  findByExternalReference(externalReference: string): Promise<TaxApiRequestState> {
    return this.request<TaxApiRequestState>("GET", "/dtes", null, {
      query: { externalReference },
    });
  }

  /** Nota de crédito (61) referenciando un documento del tenant. */
  emitCreditNote(
    dteId: string,
    note: TaxApiNotePayload,
    opts: { idempotencyKey: string; externalReference: string }
  ): Promise<TaxApiEmitResponse> {
    const body: TaxApiNotePayload = { ...note, externalReference: opts.externalReference };
    return this.request<TaxApiEmitResponse>(
      "POST",
      `/dtes/${encodeURIComponent(dteId)}/credit-notes`,
      body,
      { idempotencyKey: opts.idempotencyKey }
    );
  }

  /** URLs firmadas (5 min) para descargar XML y PDF sin headers HMAC. */
  getArtifactLinks(dteId: string): Promise<TaxApiArtifactLinks> {
    return this.request<TaxApiArtifactLinks>(
      "POST",
      `/dtes/${encodeURIComponent(dteId)}/artifact-links`,
      {}
    );
  }
}

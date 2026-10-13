// =====================================================================
// Tipos del motor tributario (cmorflow-tax-api).
// Fuente de verdad: docs/integrations/GUIDE.md y
// src/controllers/dtos/create-integration-dte.dto.ts del motor
// (ValidationPipe con whitelist estricta: NO enviar campos fuera de estos).
// =====================================================================

/** Tipos de DTE expuestos por la API B2B (CMOR FLOW usa 33, 39 y 61). */
export const INTEGRATION_DTE_TYPES = [33, 34, 39, 41, 46, 52, 56, 61] as const;
export type TaxApiDteType = (typeof INTEGRATION_DTE_TYPES)[number];

/** Receptor. rut+name obligatorios en 33; giro/address/commune opcionales. */
export interface TaxApiReceiver {
  rut: string;
  name: string;
  giro?: string;
  address?: string;
  commune?: string;
}

export interface TaxApiItem {
  name: string;
  quantity: number;
  /** Precio unitario CLP; neto o bruto según pricingMode. */
  unitPrice: number;
  exempt?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
}

/** Payload de emisión (POST /dtes). totals NO se declara: el motor recalcula. */
export interface TaxApiDtePayload {
  documentType: number;
  receiver?: TaxApiReceiver;
  items: TaxApiItem[];
  /** CMOR FLOW POS usa GROSS: los precios de carta incluyen IVA. */
  pricingMode?: "GROSS" | "NET";
  externalReference?: string;
  metadata?: Record<string, unknown>;
}

/** Nota de crédito/débito (POST /dtes/:dteId/credit-notes | debit-notes). */
export interface TaxApiNotePayload {
  /** 1=Anula, 2=Corrige texto, 3=Corrige montos. */
  reasonCode: number;
  reason: string;
  /** En anulación: línea simbólica $0 (según GUIDE). */
  items: TaxApiItem[];
  externalReference?: string;
  metadata?: Record<string, unknown>;
}

export type TaxApiRequestStatus =
  | "queued"
  | "processing"
  | "submitted"
  | "accepted"
  | "observed"
  | "rejected"
  | "failed"
  | "cancelled";

/** Estado consolidado (GET /dtes/:id) — fuente de verdad. */
export interface TaxApiRequestState {
  requestId: string;
  kind?: string;
  status: TaxApiRequestStatus;
  externalReference?: string | null;
  dte: {
    dteId: string;
    documentType?: number;
    folio?: number;
    internalStatus?: string;
    siiStatus?: string;
    trackId?: string;
    amount?: number;
  } | null;
  rcof?: unknown;
  error: { code?: string; message?: string; retryable?: boolean } | null;
  attempts?: number;
  createdAt?: string;
  submittedAt?: string;
  finalizedAt?: string;
}

/** Respuesta del POST de emisión (202 Accepted). */
export interface TaxApiEmitResponse {
  requestId: string;
  kind?: string;
  status: TaxApiRequestStatus;
  externalReference?: string | null;
  message?: string;
  _links?: { self?: string };
}

/** URL firmadas de artefactos (token válido 5 min). */
export interface TaxApiArtifactLinks {
  xmlUrl: string;
  pdfUrl: string;
  expiresAt: string;
}

/** Códigos de error estables del motor (GUIDE §7). */
export type TaxApiErrorCode =
  | "API_DISABLED"
  | "MISSING_HEADERS"
  | "UNKNOWN_KEY"
  | "CREDENTIAL_REVOKED"
  | "CREDENTIAL_EXPIRED"
  | "TIMESTAMP_OUT_OF_WINDOW"
  | "INVALID_SIGNATURE"
  | "NONCE_REPLAYED"
  | "RATE_LIMITED"
  | "PERMISSION_DENIED"
  | "TENANT_MISMATCH"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "EXTERNAL_REFERENCE_CONFLICT"
  | "DUPLICATE"
  | "VALIDATION_ERROR"
  | "TOTALS_MISMATCH"
  | "NOT_FOUND"
  | "FOLIO_EXHAUSTED"
  | "SII_REJECTED"
  | "SII_UNAVAILABLE"
  | "DB_ERROR"
  | "INTERNAL_ERROR";

/** Errores transitorios: conviene reintentar con la MISMA idempotency key. */
export const RETRYABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  "RATE_LIMITED",
  "SII_UNAVAILABLE",
  "DB_ERROR",
  "INTERNAL_ERROR",
]);

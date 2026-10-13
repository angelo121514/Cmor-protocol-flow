// =====================================================================
// Firma HMAC para la API tributaria (cmorflow-tax-api).
//
// Especificación (docs/integrations/GUIDE.md del motor):
//   Canónico: METHOD\n<ruta con query>\n<sha256hex(body)>\n<timestamp>\n<nonce>
//   Clave HMAC: sha256hex(secreto) — el secreto cmc_… como texto UTF-8.
//
// Módulo PURO: solo usa globalThis.crypto (WebCrypto), sin APIs de Deno,
// para poder testearlo con Vitest (golden vectors contra node:crypto).
// =====================================================================

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 hex de bytes crudos. */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return toHex(digest);
}

/** SHA-256 hex de un texto UTF-8. */
export async function sha256HexOfText(text: string): Promise<string> {
  return sha256Hex(encoder.encode(text));
}

/**
 * HMAC-SHA256 hex del mensaje usando la clave de firma del motor
 * (sha256hex del secreto cmc_…). La clave se usa como bytes UTF-8 del
 * string hex — igual que createHmac('sha256', signingKey) de node:crypto
 * y que `openssl dgst -hmac` del ejemplo curl del GUIDE.
 */
export async function hmacSha256Hex(signingKeyHex: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKeyHex) as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message) as unknown as BufferSource);
  return toHex(signature);
}

/** Clave de firma: sha256hex(secreto cmc_…). */
export async function deriveSigningKey(secret: string): Promise<string> {
  return sha256HexOfText(secret);
}

export function buildCanonicalString(
  method: string,
  pathWithQuery: string,
  bodyHashHex: string,
  timestamp: string,
  nonce: string
): string {
  return [method.toUpperCase(), pathWithQuery, bodyHashHex, timestamp, nonce].join("\n");
}

export interface SignedHeaders {
  "X-Api-Key": string;
  "X-Timestamp": string;
  "X-Nonce": string;
  "X-Signature": string;
}

export interface SignRequestInput {
  method: string;
  /** Ruta con query (ej. "/api/v1/dtes?externalReference=X"). */
  pathWithQuery: string;
  /** Body crudo en bytes; para GET/DELETE pasa un Uint8Array vacío. */
  body: Uint8Array;
  secret: string;
  apiKey: string;
  timestamp?: string;
  nonce?: string;
}

/** Genera los 4 headers HMAC del motor. */
export async function signRequest(input: SignRequestInput): Promise<SignedHeaders> {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000).toString();
  const nonce = input.nonce ?? crypto.randomUUID();
  const bodyHash = await sha256Hex(input.body);
  const signingKey = await deriveSigningKey(input.secret);
  const canonical = buildCanonicalString(input.method, input.pathWithQuery, bodyHash, timestamp, nonce);
  const signature = await hmacSha256Hex(signingKey, canonical);
  return {
    "X-Api-Key": input.apiKey,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "X-Signature": signature,
  };
}

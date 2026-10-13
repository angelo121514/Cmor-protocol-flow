// =====================================================
// Deno Edge Functions shared code — flow-client.ts
// Cliente de API Flow.cl con firmado HMAC-SHA256 nativo
// =====================================================

export class FlowApiError extends Error {
  readonly status: number;
  constructor(status:number){ super(`flow_http_${status}`); this.status=status; }
}
import {isRecord} from './ports.ts';

export class FlowApiClient {
  private apiKey: string;
  private secretKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = Deno.env.get("FLOW_API_KEY") || "";
    this.secretKey = Deno.env.get("FLOW_SECRET_KEY") || "";
    this.apiUrl = Deno.env.get("FLOW_API_URL") || "https://sandbox.flow.cl/api";

    console.log(`[FlowApiClient] Inicializado. API Key vacía? ${!this.apiKey}, Secret Key vacía? ${!this.secretKey}, URL: ${this.apiUrl}`);
  }

  public get isConfigured(): boolean { return !!this.apiKey && !!this.secretKey; }

  /**
   * Genera la firma HMAC-SHA256 para un set de parámetros.
   * Ordena las claves alfabéticamente, concatena key+value y firma.
   */
  public async signParams(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const signedParams: Record<string, unknown> = { ...params, apiKey: this.apiKey };
    
    // 1. Obtener claves y ordenarlas alfabéticamente
    const sortedKeys = Object.keys(signedParams).sort();

    // 2. Concatenar key + value
    let toSign = "";
    for (const key of sortedKeys) {
      // Ignorar valores nulos, indefinidos o el parámetro 's'
      if (signedParams[key] !== undefined && signedParams[key] !== null && key !== "s") {
        toSign += key + signedParams[key];
      }
    }

    // 3. Firmar con HMAC-SHA256 nativo de Web Crypto
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secretKey);
    const messageData = encoder.encode(toSign);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureHex = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 4. Agregar firma al objeto de parámetros
    signedParams["s"] = signatureHex;
    return signedParams;
  }

  /**
   * Envía una petición HTTP firmada a la API de Flow.cl
   */
  public async send<T>(
    service: string,
    params: Record<string, unknown> = {},
    method: "GET" | "POST" = "POST"
  ): Promise<T> {
    // 1. Firmar parámetros
    const signedParams = await this.signParams(params);
    const url = `${this.apiUrl}/${service}`;

    console.log(`[FlowApiClient] Enviando ${method} a ${url}`);

    try {
      let response: Response;

      if (method === "GET") {
        const queryString = new URLSearchParams(Object.entries(signedParams)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key, value]) => [key, String(value)])).toString();
        response = await fetch(`${url}?${queryString}`, {
          method: "GET",
          signal: AbortSignal.timeout(15000),
          headers: {
            "Accept": "application/json",
          },
        });
      } else {
        const bodyParams = new URLSearchParams();
        for (const [key, value] of Object.entries(signedParams)) {
          if (value !== undefined && value !== null) {
            bodyParams.append(key, String(value));
          }
        }

        response = await fetch(url, {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
          body: bodyParams.toString(),
        });
      }

      const responseText = await response.text();
      
      // Intentar parsear como JSON
      let data: unknown;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Flow API no retornó JSON válido. HTTP Status: ${response.status}. Respuesta invalida`);
      }

      if (!response.ok) {
        console.error("[FlowApiClient] Petición fallida de Flow API:", response.status);
        throw new FlowApiError(response.status);
      }

      // Flow a veces retorna códigos 400 o 401 estructurados en el JSON
      if (isRecord(data) && data.code && data.message && response.status !== 200) {
        throw new Error('flow_response_error');
      }

      return data as T;
    } catch (err: unknown) {
      console.error(`[FlowApiClient] Error en comunicación con Flow (${service}):`, "provider_request_failed");
      throw err;
    }
  }
}

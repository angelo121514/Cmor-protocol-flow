// =====================================================
// Deno Edge Functions shared code — mp-client.ts
// Cliente de API Mercado Pago (Fase 2 multi-país)
//
// Credenciales (secrets de Edge Functions, no existen aún):
//   MERCADO_PAGO_ACCESS_TOKEN — access token del vendedor (BR o PE)
//   MERCADO_PAGO_WEBHOOK_SECRET — para validar x-signature del webhook
//
// Sin MERCADO_PAGO_ACCESS_TOKEN la función responde "not_configured"
// (falla cerrada, igual que create-payment-intent con Webpay).
//
// API: https://www.mercadopago.com/developers/en/reference
//   POST /v1/payments              → crear pago (PIX/card para BR; Yape/
//                                    tarjeta PE)
//   GET  /v1/payments/{id}         → consultar estado
// Notificación: la cuenta debe tener configurada la URL del webhook;
// validamos por polling del ID además de la firma (doble chequeo).
// =====================================================

export interface MpPaymentResponse {
  id: number;
  currency_id?: string;
  status: string; // pending | approved | rejected | cancelled ...
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;          // payload PIX copia-y-paga
      qr_code_base64?: string;   // imagen QR PIX
      ticket_url?: string;       // boleto/otros métodos
    };
  };
}

export interface MpCreatePaymentInput {
  /** Monto en la moneda local (BRL o PEN), ya con decimales correctos */
  amount: number;
  /** BRL para Brasil, PEN para Perú (Mercado Pago no opera en BO) */
  currency: "BRL" | "PEN";
  description: string;
  paymentMethodId: "pix" | "master" | "visa" | "amex" | "elo";
  /** Email del pagador (requerido por la API de payments) */
  payerEmail: string;
  /** Referencia nuestra para conciliar en el webhook */
  externalReference: string;
  /** URL de notificación (webhook de la Edge Function mp-webhook) */
  notificationUrl: string;
}

export class MercadoPagoApiClient {
  private accessToken: string;
  private apiUrl: string;

  constructor() {
    this.accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
    this.apiUrl =
      Deno.env.get("MERCADO_PAGO_API_URL") || "https://api.mercadopago.com";
  }

  public get isConfigured(): boolean {
    return this.accessToken !== "";
  }

  /**
   * POST /v1/payments — crea un pago (PIX para BR, método por defecto para PE).
   * Retorna null si no hay credenciales configuradas.
   */
  public async createPayment(
    input: MpCreatePaymentInput
  ): Promise<MpPaymentResponse | null> {
    if (!this.isConfigured) return null;

    const idempotencyKey = input.externalReference;

    const body = {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: input.paymentMethodId,
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      payer: { email: input.payerEmail },
    };

    const response = await fetch(`${this.apiUrl}/v1/payments`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `MP API no retornó JSON válido. HTTP ${response.status}`
      );
    }

    if (!response.ok) {
      console.error("[mp-client] createPayment falló:", response.status);
      throw new Error(`mp_http_${response.status}`);
    }

    return data as MpPaymentResponse;
  }

  /**
   * GET /v1/payments/{id} — consulta el estado real del pago.
   * Se usa en el webhook para confirmar (no confiar ciegamente en el body).
   */
  public async getPayment(paymentId: string): Promise<MpPaymentResponse | null> {
    if (!this.isConfigured) return null;
    const response = await fetch(`${this.apiUrl}/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${this.accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error("[mp-client] getPayment falló:", response.status);
      return null;
    }
    return (await response.json()) as MpPaymentResponse;
  }
}

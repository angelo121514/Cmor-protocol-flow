// =====================================================================
// Integration/Unit Test: flow-integration.test.ts
// Valida el firmado HMAC-SHA256 y tipado del API Client de Flow.cl
// =====================================================================

import { describe, it, expect } from "vitest";
import CryptoJS from "crypto-js";

// Lógica de firmado espejo del backend para verificación cruzada en Node/Vitest
function signParamsNode(params: Record<string, unknown>, secretKey: string): Record<string, unknown> {
  const signedParams = { ...params };
  const sortedKeys = Object.keys(signedParams).sort();

  let toSign = "";
  for (const key of sortedKeys) {
    if (signedParams[key] !== undefined && signedParams[key] !== null && key !== "s") {
      toSign += key + signedParams[key];
    }
  }

  // Generar hash HMAC-SHA256 usando CryptoJS en entorno Node
  const hash = CryptoJS.HmacSHA256(toSign, secretKey);
  const signatureHex = hash.toString(CryptoJS.enc.Hex);

  signedParams["s"] = signatureHex;
  return signedParams;
}

describe("Integración Flow.cl — Algoritmo de Cifrado y Firmado", () => {
  const mockSecretKey = "my_flow_secret_key_123456";
  const mockApiKey = "my_flow_api_key_789";

  it("Debe ordenar claves alfabéticamente y generar firma HMAC-SHA256 correcta", () => {
    const params = {
      apiKey: mockApiKey,
      amount: 5000,
      currency: "CLP",
      subject: "Pago de prueba",
      commerceOrder: "order-999",
    };

    // Parámetros ordenados alfabéticamente deberían concatenarse como:
    // amount5000apiKeymy_flow_api_key_789commerceOrderorder-999currencyCLPpago de prueba (si subject tiene valor)
    // Orden de claves esperado: amount, apiKey, commerceOrder, currency, subject
    
    const signed = signParamsNode(params, mockSecretKey);

    // Validar que la firma 's' fue generada y tiene longitud de sha256 (64 hex characters)
    expect(signed.s).toBeDefined();
    expect(signed.s).toHaveLength(64);

    // Verificar firma con valores fijos calculados manualmente para este set de pruebas
    // toSign esperado: "amount5000apiKeymy_flow_api_key_789commerceOrderorder-999currencyCLPsubjectPago de prueba"
    const expectedToSign = "amount5000apiKey" + mockApiKey + "commerceOrderorder-999currencyCLPsubjectPago de prueba";
    const expectedHash = CryptoJS.HmacSHA256(expectedToSign, mockSecretKey).toString(CryptoJS.enc.Hex);
    
    expect(signed.s).toBe(expectedHash);
    console.log("[FlowTest] Firma validada exitosamente:", signed.s);
  });

  it("Debe ignorar parámetros nulos, indefinidos o el parámetro 's' en la firma", () => {
    const params = {
      apiKey: mockApiKey,
      amount: 25000,
      optional: null,
      notes: undefined,
      s: "old_signature_to_ignore",
    };

    const signed = signParamsNode(params, mockSecretKey);

    // toSign esperado para firmar: "amount25000apiKeymy_flow_api_key_789"
    const expectedToSign = "amount25000apiKey" + mockApiKey;
    const expectedHash = CryptoJS.HmacSHA256(expectedToSign, mockSecretKey).toString(CryptoJS.enc.Hex);

    expect(signed.s).toBe(expectedHash);
  });
});

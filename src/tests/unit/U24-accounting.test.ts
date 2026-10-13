/**
 * U-24: Módulo Contabilidad (integración con cmorflow-tax-api).
 *  - Firma HMAC del motor: golden vectors literales (calculados con
 *    node:crypto; el bug #1 de integraciones HMAC es el string canónico).
 *  - Builders de payload DTE (pricingMode GROSS, sin totals, receptor).
 *  - Helpers de RUT (módulo 11) y estados.
 *  - Desglose IVA con montos "feos" ($9.999 / $10.001).
 *
 * Los módulos de firma viven en supabase/functions/_shared y son puros
 * (WebCrypto) para poder testearse aquí sin Deno.
 */
/**
 * U-24: Módulo Contabilidad (integración con cmorflow-tax-api).
 *  - Firma HMAC del motor: golden vectors literales (calculados con
 *    node:crypto; el bug #1 de integraciones HMAC es el string canónico).
 *  - Builders de payload DTE (pricingMode GROSS, sin totals, receptor).
 *  - Helpers de RUT (módulo 11) y estados.
 *  - Desglose IVA con montos "feos" ($9.999 / $10.001).
 *
 * Los módulos de firma viven en supabase/functions/_shared y son puros
 * (WebCrypto) para poder testearse aquí sin Deno.
 */
import { describe, it, expect } from "vitest";

// jsdom no expone crypto.subtle: shim con el webcrypto de Node. El
// especificador se construye dinámicamente para que TS (con types:
// ["vite/client"]) no intente resolver "node:crypto" estáticamente.
const nodeCrypto = (await import(/* @vite-ignore */ "node:" + "crypto")) as {
  webcrypto: Crypto;
};
if (!(globalThis.crypto as unknown as { subtle?: unknown })?.subtle) {
  (globalThis as unknown as { crypto: Crypto }).crypto = nodeCrypto.webcrypto;
}

const { buildCanonicalString, signRequest, deriveSigningKey } = await import(
  "../../../supabase/functions/_shared/tax-signing.ts"
);
const {
  buildDtePayloadFromOrder,
  buildCreditNotePayload,
  buildOrderExternalReference,
  buildCreditNoteReference,
  isValidRutChile,
  computeNetIva,
} = await import("../../../supabase/functions/_shared/accounting-payload.ts");
const {
  computeNetIva: computeNetIvaFront,
  isValidRutChile: isValidRutChileFront,
  statusMeta,
  dteTypeLabel,
  docHasArtifacts,
  santiagoDateString,
  santiagoDayStartInstant,
} = await import("../../utils/accounting");

// ── Vectores dorados: ejemplo curl de docs/integrations/GUIDE.md del motor,
//    firmado con node:crypto (createHash/createHmac). NO recalcular aquí:
//    si estos literales cambian, la integración HMAC se rompió. ──
const GUIDE_BODY =
  '{"documentType":39,"items":[{"name":"Consumo agua","quantity":1,"unitPrice":45000}],"externalReference":"APR-1"}';
const GUIDE_SECRET = "cmc_xxx";
const GUIDE_SIGNING_KEY = "aa9b502d6f56433efd9a9b6aed72b8f182fe362f4506a8f6a4631db1ffbcdd18"; // sha256hex("cmc_xxx")
const GUIDE_BODY_HASH = "2e2d244e1f8d0fca6882b0c08233c8a2061e22deab1b8b6eb276a9d6ef959061";

describe("U-24 · firma HMAC del motor tributario", () => {
  it("construye el string canónico exacto (METHOD\\nruta\\nhash\\nts\\nnonce)", () => {
    const canonical = buildCanonicalString(
      "POST",
      "/api/v1/dtes",
      "deadbeef",
      "1757000000",
      "11111111-1111-4111-8111-111111111111"
    );
    expect(canonical).toBe(
      "POST\n/api/v1/dtes\ndeadbeef\n1757000000\n11111111-1111-4111-8111-111111111111"
    );
  });

  it("la clave de firma es sha256hex(secreto) — vector dorado", async () => {
    const signingKey = await deriveSigningKey(GUIDE_SECRET);
    expect(signingKey).toBe(GUIDE_SIGNING_KEY);
  });

  it("signRequest produce la firma HMAC de referencia de GUIDE.md (vector dorado)", async () => {
    const body = new TextEncoder().encode(GUIDE_BODY);
    const timestamp = "1757000000";
    const nonce = "123e4567-e89b-42d3-a456-426614174000";

    const headers = await signRequest({
      method: "POST",
      pathWithQuery: "/api/v1/dtes",
      body,
      secret: GUIDE_SECRET,
      apiKey: "cmor_live_test",
      timestamp,
      nonce,
    });

    // Canónico esperado con el hash literal del body de GUIDE.md.
    const expectedCanonical = [
      "POST",
      "/api/v1/dtes",
      GUIDE_BODY_HASH,
      timestamp,
      nonce,
    ].join("\n");
    expect(buildCanonicalString("POST", "/api/v1/dtes", GUIDE_BODY_HASH, timestamp, nonce)).toBe(
      expectedCanonical
    );
    // Firma calculada con node:crypto fuera del test (ver cabecera).
    expect(headers["X-Signature"]).toBe("c7d200cc252fc742fd465edbc817be09501308b1618e325e35e42c324f420628");
    expect(headers["X-Api-Key"]).toBe("cmor_live_test");
    expect(headers["X-Timestamp"]).toBe(timestamp);
    expect(headers["X-Nonce"]).toBe(nonce);
  });

  it("el hash del body vacío es el sha256 de la cadena vacía (GET)", async () => {
    const headers = await signRequest({
      method: "GET",
      pathWithQuery: "/api/v1/dtes",
      body: new Uint8Array(0),
      secret: GUIDE_SECRET,
      apiKey: "k",
      timestamp: "1",
      nonce: "n",
    });
    // Firma de referencia: HMAC(clave, "GET\n/api/v1/dtes\n" + EMPTY_BODY_HASH + "\n1\nn")
    expect(headers["X-Signature"]).toBe("92fa2bf6a8c51f6dddc3b5b8cd151eb469459feec3af91c7ba95aa7b41adc9b6");
  });

  it("el mismo body firmado dos veces con distinto nonce da firmas distintas (nonce de un solo uso)", async () => {
    const body = new TextEncoder().encode(GUIDE_BODY);
    const a = await signRequest({
      method: "POST", pathWithQuery: "/api/v1/dtes", body, secret: "s1", apiKey: "k",
      timestamp: "1", nonce: "nonce-a",
    });
    const b = await signRequest({
      method: "POST", pathWithQuery: "/api/v1/dtes", body, secret: "s1", apiKey: "k",
      timestamp: "1", nonce: "nonce-b",
    });
    expect(a["X-Signature"]).not.toBe(b["X-Signature"]);
  });
});

describe("U-24 · builder de payload DTE", () => {
  const order = {
    order_number: "ORD-00001000",
    total: 10000,
    items: [
      { name: "Completo Italiano", quantity: 2, unit_price: 5000, item_total: 10000, selected_size: null },
    ],
  };

  it("boleta 39: GROSS, sin receiver, sin totals (el motor recalcula)", () => {
    const { payload, itemsTotal } = buildDtePayloadFromOrder(order, { dteType: 39 });
    expect(payload.documentType).toBe(39);
    expect(payload.pricingMode).toBe("GROSS");
    expect(payload.receiver).toBeUndefined();
    expect((payload as unknown as Record<string, unknown>).totals).toBeUndefined();
    expect(payload.items?.[0]).toEqual({ name: "Completo Italiano", quantity: 2, unitPrice: 5000 });
    expect(itemsTotal).toBe(10000);
  });

  it("factura 33: incluye el receptor con giro/dirección/comuna", () => {
    const { payload } = buildDtePayloadFromOrder(order, {
      dteType: 33,
      receiver: { rut: "76543210-3", name: "Empresa Cliente SpA", giro: "Servicios", address: "Av. X 1", commune: "Vitacura" },
    });
    expect(payload.documentType).toBe(33);
    expect(payload.receiver?.rut).toBe("76543210-3");
    expect(payload.receiver?.name).toBe("Empresa Cliente SpA");
    expect(payload.receiver?.commune).toBe("Vitacura");
  });

  it("el nombre del item incluye el tamaño seleccionado", () => {
    const { payload } = buildDtePayloadFromOrder(
      {
        total: 5000,
        items: [{ name: "Bebida", quantity: 1, unit_price: 5000, item_total: 5000, selected_size: { name: "Grande" } }],
      },
      { dteType: 39 }
    );
    expect(payload.items?.[0]?.name).toBe("Bebida (Grande)");
  });

  it("NC de anulación: reasonCode 1 con línea simbólica $0 (según GUIDE)", () => {
    const note = buildCreditNotePayload({ folio: 154, dteType: 39, reason: "" });
    expect(note.reasonCode).toBe(1);
    expect(note.items?.[0]?.unitPrice).toBe(0);
    expect(note.reason).toContain("154");
  });

  it("referencias externas: attempt distinto → referencia distinta (re-emisión tras rechazo)", () => {
    expect(buildOrderExternalReference("o1", 39, 1)).toBe("order:o1:39:a1");
    expect(buildOrderExternalReference("o1", 39, 2)).toBe("order:o1:39:a2");
    expect(buildOrderExternalReference("o1", 39, 1)).not.toBe(buildOrderExternalReference("o1", 39, 2));
    expect(buildCreditNoteReference("d1", 1)).toBe("nc:d1:a1");
  });
});

describe("U-24 · RUT chileno (módulo 11)", () => {
  it("acepta RUTs válidos con o sin formato", () => {
    for (const rut of ["76.543.210-3", "76543210-3", "11111111-1", "9.700.000-K", "9700000K", "12345678-5"]) {
      expect(isValidRutChile(rut), rut).toBe(true);
      expect(isValidRutChileFront(rut), rut).toBe(true);
    }
  });

  it("rechaza DV incorrecto y formatos inválidos", () => {
    for (const rut of ["12345678-9", "76543210-K", "abc", "123", "12345678", "", "1.2.3"]) {
      expect(isValidRutChile(rut), rut).toBe(false);
    }
  });
});

describe("U-24 · desglose IVA (montos feos)", () => {
  it("montos exactos y feos cuadran: neto + IVA = total, sin perder pesos", () => {
    for (const total of [0, 1, 999, 1000, 9999, 10000, 10001, 453000, 11900]) {
      const { net, iva } = computeNetIva(total);
      const front = computeNetIvaFront(total);
      expect(front).toEqual({ net, iva });
      expect(net + iva).toBe(total);
    }
  });

  it("casos de referencia: 11900 → 10000 + 1900", () => {
    expect(computeNetIva(11900)).toEqual({ net: 10000, iva: 1900 });
    expect(computeNetIva(9999).net).toBe(Math.round(9999 / 1.19));
    expect(computeNetIva(10001).net).toBe(Math.round(10001 / 1.19));
  });
});

describe("U-24 · presentación de estados", () => {
  it("cada estado del motor tiene etiqueta y clase de badge", () => {
    for (const status of ["queued", "processing", "submitted", "accepted", "observed", "rejected", "failed", "cancelled"]) {
      const meta = statusMeta(status);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.badge).toContain("border-");
    }
  });

  it("etiquetas de tipo DTE y artefactos", () => {
    expect(dteTypeLabel(39)).toBe("Boleta");
    expect(dteTypeLabel(33)).toBe("Factura");
    expect(dteTypeLabel(61)).toBe("Nota de crédito");
    expect(docHasArtifacts({ status: "accepted", dte_id: "d1" })).toBe(true);
    expect(docHasArtifacts({ status: "queued", dte_id: null })).toBe(false);
    expect(docHasArtifacts({ status: "accepted", dte_id: null })).toBe(false);
  });
});

describe("U-24 · períodos en America/Santiago", () => {
  it("la fecha de Santiago de la medianoche de un día es ese mismo día", () => {
    for (const dateStr of ["2026-09-05", "2026-01-15", "2026-06-21", "2027-01-01"]) {
      const instant = santiagoDayStartInstant(dateStr);
      expect(santiagoDateString(instant)).toBe(dateStr);
    }
  });

  it("periodRange devuelve un rango válido creciente", async () => {
    const { periodRange } = await import("../../utils/accounting");
    for (const period of ["today", "7d", "30d"] as const) {
      const { from, to } = periodRange(period);
      expect(Number.isFinite(Date.parse(from))).toBe(true);
      expect(Number.isFinite(Date.parse(to))).toBe(true);
      expect(Date.parse(from)).toBeLessThan(Date.parse(to));
    }
    const week = periodRange("7d");
    const today = periodRange("today");
    expect(Date.parse(week.from)).toBeLessThanOrEqual(Date.parse(today.from));
  });
});

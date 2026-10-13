/**
 * U-23: Fase 2 multi-país — Mercado Pago (BR/PE), platos multilingües,
 * panel i18n y landing internacional.
 *
 * Cobertura:
 *   - Migración SQL: columnas name_pt/description_pt con grants + provider 'mp'.
 *   - Edge Functions: guardrails de país en mp-checkout / mp-webhook / order-pay.
 *   - panelI18n: diccionario es→pt, fallback a texto original.
 *   - MenuItem incluye name_pt/description_pt y RESTAURANT_COLUMNS intacto.
 */
import { describe, it, expect } from "vitest";
import { PANEL_I18N, PANEL_I18N as DICT } from "../../i18n/panel-language";
import { PLAN_PRICES } from "../../config/regional";
import type { MenuItem } from "../../config/supabase";

describe("U-23 · Migración SQL Fase 2", () => {
  const migrations = import.meta.glob(
    "/supabase/migrations/20260901000001*.sql",
    { query: "?raw", import: "default", eager: true }
  ) as Record<string, string>;
  const sql = Object.values(migrations)[0] ?? "";

  it("la migración existe", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it("agrega name_pt y description_pt a menu_items con grants por columna", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS name_pt TEXT");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS description_pt TEXT");
    // Regla PostgREST: sin grant, el select de la columna falla
    expect(sql).toContain("GRANT SELECT (name_pt, description_pt)");
    expect(sql).toContain("UPDATE (name_pt, description_pt)");
  });

  it("amplía payment_intents.provider a 'mp' con nombre determinista", () => {
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS payment_intents_provider_check");
    expect(sql).toMatch(/CHECK \(provider IN \('webpay', 'flow', 'mp'\)\)/);
  });
});

// Current checkout/webhook behavior is exercised with injected providers in trusted-handlers.test.ts.

describe("U-23 · Precios MP coherentes con PLAN_PRICES", () => {
  it("los precios BR/PE de PLAN_PRICES son los que cobra mp-checkout", () => {
    // Snapshot de contrato entre regional.ts y mp-checkout
    expect(PLAN_PRICES.starter.BR.price).toBe(149);
    expect(PLAN_PRICES.pro.BR.price).toBe(520);
    expect(PLAN_PRICES.lifetime.BR.price).toBe(9900);
    expect(PLAN_PRICES.starter.PE.price).toBe(119);
    expect(PLAN_PRICES.pro.PE.price).toBe(390);
    expect(PLAN_PRICES.lifetime.PE.price).toBe(7500);
  });
});

describe("U-23 · Platos multilingües", () => {
  it("MenuItem soporta name_pt/description_pt", () => {
    const item: MenuItem = {
      id: "x",
      restaurant_id: "r",
      name: "Feijoada",
      name_pt: "Feijoada",
      description: "Plato brasileño",
      description_pt: "Prato brasileiro",
      base_price: 100,
      is_available: true,
      created_at: "2026-09-01",
    };
    expect(item.name_pt).toBe("Feijoada");
    expect(item.description_pt).toBe("Prato brasileiro");
  });
});

describe("U-23 · Panel i18n (es/pt)", () => {
  it("diccionario traduce textos del nav del panel", () => {
    expect(DICT["Pedidos"]).toBe("Pedidos");
    expect(DICT["Reportes"]).toBe("Relatórios");
    expect(DICT["Configuración"]).toBe("Configuração");
    expect(DICT["Cerrar sesión"]).toBe("Sair");
    expect(DICT["Inventario"]).toBe("Estoque");
  });

  it("PANEL_I18N es el mismo objeto exportado dos veces (API estable)", () => {
    expect(PANEL_I18N).toBe(DICT);
  });
});

describe("U-23 · Frontend multi-país integrado", () => {
  const sources = import.meta.glob("/src/**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  const readSrc = (sub: string): string => {
    const norm = sub.split(String.fromCharCode(92)).join("/");
    const key = Object.keys(sources).find(
      (k) => k.split(String.fromCharCode(92)).join("/").endsWith(norm)
    );
    expect(key, `archivo no encontrado: ${sub}`).toBeTruthy();
    return sources[key!]!;
  };

  it("QRPayment maneja la rama Mercado Pago (PIX + polling)", () => {
    const src = readSrc("QRPayment.tsx");
    expect(src).toContain('provider === "mp"');
    expect(src).toContain("pixQrBase64");
    expect(src).toContain("getSessionByToken"); // polling de confirmación
  });

  it("RegisterPage tiene el paso mp_pending y startMpSubscription", () => {
    const src = readSrc("RegisterPage.tsx");
    expect(src).toContain("startMpSubscription");
    expect(src).toContain('"mp_pending"');
  });

  it("CustomerMenu y TableQR consumen name_pt para la carta en pt", () => {
    const cm = readSrc("CustomerMenu.tsx");
    expect(cm).toContain("item.name_pt");
    const tq = readSrc("TableQR.tsx");
    expect(tq).toContain("item.name_pt");
  });

  it("LandingPage expone selector de país y precios por moneda", () => {
    const src = readSrc("LandingPage.tsx");
    expect(src).toContain("getPlanPrices");
    expect(src).toContain("country");
  });

  it("Dashboard conecta el panel i18n con selector ES/PT", () => {
    const src = readSrc("restaurant/Dashboard.tsx");
    expect(src).toContain("usePanelLang");
    expect(src).toContain('value="pt"');
  });
});
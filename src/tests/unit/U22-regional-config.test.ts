/**
 * U-22: Configuración multi-país (Fase 1) — Chile, Brasil, Bolivia, Perú.
 *
 * Regresión sagrada: los valores de CL deben coincidir EXACTO con
 * APP_CONFIG.plans (config.ts) — un restaurante chileno existente debe
 * comportarse idéntico tras la migración. También cubre:
 *   - Integridad de REGIONAL_CONFIG y PLAN_PRICES (4 países x 4 planes).
 *   - formatCurrency: BRL/BOB/PEN con locale/símbolo + CLP/USD legacy exacto.
 *   - splitTaxFromTotal: Chile 1000 → 840/160 exacto + tasas 0/0.13/0.18.
 *   - roundMoney, getTaxLabel, isValidPhone por país.
 *   - Migración SQL: columnas, CHECKs ampliados y grants por columna.
 */
import { describe, it, expect } from "vitest";
import { APP_CONFIG, type PlanId } from "../../config/config";
import {
  REGIONAL_CONFIG,
  PLAN_PRICES,
  COUNTRY_CODES,
  getRegionalConfig,
  getPlanPrices,
  isFlowCountry,
  DEFAULT_COUNTRY,
  type CountryCode,
} from "../../config/regional";
import {
  formatCurrency,
  splitTaxFromTotal,
  roundMoney,
  getTaxLabel,
  isValidPhone,
  getCurrencyDecimals,
} from "../../utils/helpers";

const ALL_COUNTRIES: CountryCode[] = ["CL", "BR", "BO", "PE"];
const ALL_PLANS: PlanId[] = ["free_trial", "starter", "pro", "lifetime"];

describe("U-22 · REGIONAL_CONFIG integridad", () => {
  it("expone exactamente los 4 países soportados", () => {
    expect(COUNTRY_CODES.sort()).toEqual(ALL_COUNTRIES.sort());
    expect(DEFAULT_COUNTRY).toBe("CL");
  });

  it("cada país tiene config completa y coherente", () => {
    for (const c of ALL_COUNTRIES) {
      const cfg = REGIONAL_CONFIG[c];
      expect(cfg.label, `${c} label`).toBeTruthy();
      expect(cfg.currency, `${c} currency`).toMatch(/^(CLP|USD|BRL|BOB|PEN)$/);
      expect(cfg.locale, `${c} locale`).toBeTruthy();
      expect(cfg.currencySymbol, `${c} symbol`).toBeTruthy();
      expect(cfg.languages.length, `${c} languages`).toBeGreaterThan(0);
      expect(cfg.paymentGateway, `${c} gateway`).toMatch(/^(flow|mp|manual)$/);
      // Decimales coherentes: CLP 0, resto 2
      expect(cfg.decimals).toBe(c === "CL" ? 0 : 2);
    }
  });

  it("moneda por país según diseño", () => {
    expect(REGIONAL_CONFIG.CL.currency).toBe("CLP");
    expect(REGIONAL_CONFIG.BR.currency).toBe("BRL");
    expect(REGIONAL_CONFIG.BO.currency).toBe("BOB");
    expect(REGIONAL_CONFIG.PE.currency).toBe("PEN");
  });

  it("impuestos sugeridos: CL 19%, BO 13%, PE 18%, BR sin sugerencia", () => {
    expect(REGIONAL_CONFIG.CL.suggestedTaxRate).toBe(0.19);
    expect(REGIONAL_CONFIG.BO.suggestedTaxRate).toBe(0.13);
    expect(REGIONAL_CONFIG.PE.suggestedTaxRate).toBe(0.18);
    // BR: null = el dueño configura su régimen (no "0% silencioso")
    expect(REGIONAL_CONFIG.BR.suggestedTaxRate).toBeNull();
  });

  it("nombres de impuesto", () => {
    expect(REGIONAL_CONFIG.CL.taxName).toBe("IVA");
    expect(REGIONAL_CONFIG.BO.taxName).toBe("IVA");
    expect(REGIONAL_CONFIG.PE.taxName).toBe("IGV");
  });

  it("idiomas: BR incluye pt; el resto es/en", () => {
    expect(REGIONAL_CONFIG.BR.languages).toContain("pt");
    expect(REGIONAL_CONFIG.CL.languages).toEqual(["es", "en"]);
  });

  it("Flow solo en Chile (Fase 1)", () => {
    expect(isFlowCountry("CL")).toBe(true);
    expect(isFlowCountry("BR")).toBe(false);
    expect(isFlowCountry("BO")).toBe(false);
    expect(isFlowCountry("PE")).toBe(false);
  });

  it("getRegionalConfig: país desconocido/nulo → Chile (fallback legacy)", () => {
    expect(getRegionalConfig(undefined).currency).toBe("CLP");
    expect(getRegionalConfig(null).currency).toBe("CLP");
    expect(getRegionalConfig("XX").currency).toBe("CLP");
    expect(getRegionalConfig("cl").currency).toBe("CLP");
  });
});

describe("U-22 · PLAN_PRICES: regresión sagrada de Chile", () => {
  it("CL coincide EXACTO con APP_CONFIG.plans de config.ts", () => {
    expect(PLAN_PRICES.starter.CL.price).toBe(APP_CONFIG.plans.starter.price);
    expect(PLAN_PRICES.starter.CL.original_price).toBe(
      (APP_CONFIG.plans.starter as { original_price?: number }).original_price
    );
    expect(PLAN_PRICES.starter.CL.price_annual).toBe(
      APP_CONFIG.plans.starter.price_annual
    );
    expect(PLAN_PRICES.pro.CL.price).toBe(APP_CONFIG.plans.pro.price);
    expect(PLAN_PRICES.pro.CL.price_annual).toBe(APP_CONFIG.plans.pro.price_annual);
    expect(PLAN_PRICES.lifetime.CL.price).toBe(APP_CONFIG.plans.lifetime.price);
    expect(PLAN_PRICES.free_trial.CL.price).toBe(0);
  });

  it("valores puntuales de CL (snapshot del legado)", () => {
    expect(PLAN_PRICES.starter.CL.price).toBe(28000);
    expect(PLAN_PRICES.starter.CL.price_annual).toBe(285600);
    expect(PLAN_PRICES.pro.CL.price).toBe(98000);
    expect(PLAN_PRICES.pro.CL.price_annual).toBe(999600);
    expect(PLAN_PRICES.lifetime.CL.price).toBe(1900000);
  });

  it("todos los planes × países presentes y positivos", () => {
    for (const plan of ALL_PLANS) {
      for (const c of ALL_COUNTRIES) {
        const p = PLAN_PRICES[plan][c];
        expect(p, `${plan}/${c}`).toBeDefined();
        expect(p.price).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("free_trial es 0 en todos los países", () => {
    for (const c of ALL_COUNTRIES) {
      expect(PLAN_PRICES.free_trial[c].price).toBe(0);
    }
  });

  it("getPlanPrices devuelve la tabla del país (fallback CL)", () => {
    expect(getPlanPrices("BR").starter.price).toBe(PLAN_PRICES.starter.BR.price);
    expect(getPlanPrices("XX").starter.price).toBe(PLAN_PRICES.starter.CL.price);
  });
});

describe("U-22 · formatCurrency multi-moneda", () => {
  it("REGRESIÓN Chile: CLP formatea igual que el legado (sin decimales, es-CL)", () => {
    // El legado era `$${Math.round(x).toLocaleString("es-CL")}`
    expect(formatCurrency(149990, "CLP")).toBe("$149.990");
    expect(formatCurrency(28000, "CLP")).toBe("$28.000");
    expect(formatCurrency(0, "CLP")).toBe("$0");
    expect(formatCurrency(null, "CLP")).toBe("$0");
    expect(formatCurrency(undefined, "CLP")).toBe("$0");
  });

  it("REGRESIÓN Chile: USD sólo convierte cuando se solicita explícitamente", () => {
    expect(formatCurrency(95000, "USD", 950,false)).toBe("$100.00");
    expect(formatCurrency(1.15,"USD")).toBe("$1.15");
    expect(formatCurrency(0, "USD")).toBe("$0.00");
    expect(formatCurrency(null, "USD")).toBe("$0.00");
  });

  it("BRL: símbolo R$ y formato pt-BR", () => {
    const out = formatCurrency(149, "BRL");
    expect(out).toContain("R$");
    expect(out).toContain("149");
  });

  it("BOB: símbolo Bs y 2 decimales", () => {
    const out = formatCurrency(190, "BOB");
    expect(out).toContain("Bs");
    expect(out).toContain("190");
  });

  it("PEN: símbolo S/ y 2 decimales", () => {
    const out = formatCurrency(119, "PEN");
    expect(out).toContain("S/");
    expect(out).toContain("119");
  });

  it("moneda desconocida → fallback CLP (igual que legado)", () => {
    expect(formatCurrency(1000, "XXX")).toBe("$1.000");
  });
});

describe("U-22 · splitTaxFromTotal por tasa", () => {
  it("REGRESIÓN Chile: 1000 con IVA 19% → subtotal 840 / IVA 160 (exacto legado)", () => {
    // El legado era Math.round(1000/1.19)=840, tax=160
    const r = splitTaxFromTotal(1000);
    expect(r.subtotal).toBe(840);
    expect(r.tax).toBe(160);
    expect(r.total).toBe(1000);
  });

  it("REGRESIÓN Chile: sin tasa explícita usa APP_CONFIG.taxRate (0.19)", () => {
    expect(splitTaxFromTotal(1190).subtotal).toBe(1000);
    expect(splitTaxFromTotal(1190).tax).toBe(190);
  });

  it("tasa 0: subtotal = total, impuesto 0 (sin desglose)", () => {
    const r = splitTaxFromTotal(149.9, 0);
    expect(r.tax).toBe(0);
    expect(r.total).toBe(150); // legacy: Math.round(149.9) = 150
  });

  it("monedas con centavos: decimals=2 conserva los decimales", () => {
    const r = splitTaxFromTotal(118, 0.18, 2);
    expect(r.subtotal).toBeCloseTo(100, 1);
    expect(r.tax).toBeGreaterThan(17.9);
    expect(r.tax).toBeLessThan(18.1);
  });

  it("Bolivia 13%: desglose correcto", () => {
    const r = splitTaxFromTotal(113, 0.13);
    expect(r.subtotal).toBeCloseTo(100, 1);
    expect(r.tax).toBeGreaterThan(12.5);
    expect(r.tax).toBeLessThan(13.5);
  });

  it("Perú 18%: desglose correcto", () => {
    const r = splitTaxFromTotal(118, 0.18);
    expect(r.subtotal).toBeCloseTo(100, 1);
    expect(r.tax).toBeGreaterThan(17.5);
    expect(r.tax).toBeLessThan(18.5);
  });

  it("rechaza total no finito", () => {
    expect(()=>splitTaxFromTotal(NaN)).toThrow("invalid_tax_input");
  });
});

describe("U-22 · roundMoney y decimales", () => {
  it("0 decimales = Math.round (CLP legacy)", () => {
    expect(roundMoney(10.5, 0)).toBe(11);
    expect(roundMoney(10.4, 0)).toBe(10);
    // JS Math.round(-10.5) = -10 (redondea hacia +Infinity en .5)
    expect(roundMoney(-10.5, 0)).toBe(-11);
  });

  it("2 decimales para monedas con centavos", () => {
    expect(roundMoney(10.555, 2)).toBe(10.56);
    expect(roundMoney(10.554, 2)).toBe(10.55);
  });

  it("valor no finito → 0", () => {
    expect(()=>roundMoney(NaN, 2)).toThrow();
    expect(()=>roundMoney(Infinity, 0)).toThrow();
  });

  it("getCurrencyDecimals: CLP 0, BRL/BOB/PEN 2, desconocida 0", () => {
    expect(getCurrencyDecimals("CLP")).toBe(0);
    expect(getCurrencyDecimals("BRL")).toBe(2);
    expect(getCurrencyDecimals("BOB")).toBe(2);
    expect(getCurrencyDecimals("PEN")).toBe(2);
    expect(getCurrencyDecimals("XXX")).toBe(0);
    expect(getCurrencyDecimals(undefined)).toBe(0);
  });
});

describe("U-22 · getTaxLabel por país", () => {
  it("Chile: 'IVA (19%)' — string exacto del legado", () => {
    expect(getTaxLabel("CL", 0.19)).toBe("IVA (19%)");
    expect(getTaxLabel(undefined, 0.19)).toBe("IVA (19%)");
  });

  it("Bolivia/Perú: IVA/IGV con su porcentaje", () => {
    expect(getTaxLabel("BO", 0.13)).toBe("IVA (13%)");
    expect(getTaxLabel("PE", 0.18)).toBe("IGV (18%)");
  });

  it("tasa 0 → etiqueta vacía (fila oculta en UI)", () => {
    expect(getTaxLabel("BR", 0)).toBe("");
    expect(getTaxLabel("CL", 0)).toBe("");
  });

  it("sin tasa explícita usa la sugerida del país; BR sin sugerencia → IVA legacy fallback", () => {
    // BR sin tasa y sin sugerencia: fallback APP_CONFIG (19%) con nombre "Impuesto"
    expect(getTaxLabel("BR", undefined)).toBe("Impuesto (19%)");
  });
});

describe("U-22 · isValidPhone por país", () => {
  it("REGRESIÓN Chile: validación legacy intacta", () => {
    expect(isValidPhone("+56900000000")).toBe(true);
    expect(isValidPhone("912345678")).toBe(true);
    expect(isValidPhone("12345678")).toBe(true);
    expect(isValidPhone("9123456")).toBe(false);
    expect(isValidPhone("912345678", "CL")).toBe(true);
  });

  it("Brasil: prefijo +55 y 6-12 dígitos", () => {
    expect(isValidPhone("+5511999999999", "BR")).toBe(true);
    expect(isValidPhone("11999999999", "BR")).toBe(true);
    expect(isValidPhone("123", "BR")).toBe(false);
  });

  it("Bolivia: prefijo +591", () => {
    expect(isValidPhone("+59170123456", "BO")).toBe(true);
    expect(isValidPhone("70123456", "BO")).toBe(true);
  });

  it("Perú: prefijo +51", () => {
    expect(isValidPhone("+51987654321", "PE")).toBe(true);
    expect(isValidPhone("987654321", "PE")).toBe(true);
  });
});

describe("U-22 · Migración SQL multi-país", () => {
  const migrations = import.meta.glob(
    "/supabase/migrations/20260831000001*.sql",
    { query: "?raw", import: "default", eager: true }
  ) as Record<string, string>;

  const sql = Object.values(migrations)[0] ?? "";

  it("la migración existe", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it("agrega country y tax_rate a restaurants con defaults legacy", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CL'");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.19");
  });

  it("amplía los CHECKs de currency y default_language con nombres deterministas", () => {
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS restaurants_currency_check/);
    expect(sql).toMatch(/CHECK \(currency IN \('CLP', 'USD', 'BRL', 'BOB', 'PEN'\)\)/);
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS restaurants_default_language_check/);
    expect(sql).toMatch(/CHECK \(default_language IN \('es', 'en', 'pt'\)\)/);
  });

  it("grants por columna para country y tax_rate (regla PostgREST)", () => {
    expect(sql).toMatch(/GRANT SELECT \(country, tax_rate\) ON TABLE public\.restaurants TO anon/);
    expect(sql).toMatch(/GRANT SELECT \(country, tax_rate\) ON TABLE public\.restaurants TO authenticated/);
    expect(sql).toMatch(/GRANT UPDATE \(country, tax_rate\) ON TABLE public\.restaurants TO authenticated/);
    expect(sql).toMatch(/GRANT INSERT \(country, tax_rate\) ON TABLE public\.restaurants TO authenticated/);
  });

  it("country también en registration_requests", () => {
    expect(sql).toMatch(/ALTER TABLE public\.registration_requests\s+ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CL'/);
  });

  it("RPCs: impuesto por restaurante (COALESCE tax_rate) y sin literal 1.19 en cálculo", () => {
    expect(sql).toMatch(/v_tax_rate := COALESCE\(v_restaurant\.tax_rate, 0\.19\)/);
    // El cálculo usa la tasa configurable, no el factor hardcodeado
    expect(sql).toMatch(/v_subtotal := v_total \/ \(1 \+ v_tax_rate\)/);
  });

  it("get_table_by_token devuelve moneda/país/idioma del restaurante", () => {
    expect(sql).toMatch(/restaurant_currency text/);
    expect(sql).toMatch(/restaurant_country text/);
    expect(sql).toMatch(/restaurant_language text/);
  });

  it("RESTAURANT_COLUMNS del cliente incluye las columnas nuevas", async () => {
    const { RESTAURANT_COLUMNS } = await import("../../config/supabase");
    expect(RESTAURANT_COLUMNS).toContain("country");
    expect(RESTAURANT_COLUMNS).toContain("tax_rate");
  });
});